import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1XQOs4U2ZGHzK9YOiZW_Gv5p1Xx-E7UObANLTVG9HZY0/export?format=csv&gid=0";

// Map spreadsheet product names (lowercase, without mg) → ChromePeps slug
const PRODUCT_MAP: Record<string, string> = {
  semaglutide: "semaglutide",
  tirzepatide: "tirzepatide",
  retatrutide: "retatrutide",
  "bpc-157": "bpc-157",
  "bpc157": "bpc-157",
  "tb-500": "tb-500",
  "tb500": "tb-500",
  "ghk-cu": "ghk-cu",
  selank: "selank",
  "pt-141": "pt-141",
  "pt141": "pt-141",
  "nad+": "nad-plus",
  tesamorelin: "tesamorelin",
};

/** Extract product slug from spreadsheet name like "Semaglutide 5mg" */
function matchProductSlug(name: string): string | null {
  const lower = name.toLowerCase().trim();
  const withoutMg = lower.replace(/\s*\d+\s*mg$/i, "").trim();
  if (PRODUCT_MAP[withoutMg]) return PRODUCT_MAP[withoutMg];
  const dashed = withoutMg.replace(/\s+/g, "-");
  if (PRODUCT_MAP[dashed]) return PRODUCT_MAP[dashed];
  const compact = withoutMg.replace(/[-\s]+/g, "");
  if (PRODUCT_MAP[compact]) return PRODUCT_MAP[compact];
  return null;
}

/** Try to parse date from batch number like "CS-se5-0116" → Jan 16 */
function parseBatchDate(batch: string): Date {
  const match = batch.match(/(\d{2})(\d{2})$/);
  if (match) {
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const year = new Date().getFullYear();
      const d = new Date(year, month - 1, day);
      if (d > new Date()) d.setFullYear(year - 1);
      return d;
    }
  }
  return new Date();
}

/** Parse CSV — handles quoted fields with commas inside */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

interface CreatedEntry {
  productName: string;
  batchNumber: string;
  reportUrl: string | null;
}
interface UpdatedEntry {
  productName: string;
  batchNumber: string;
  changedFields: string[];
}
interface SkippedEntry {
  productName: string;
  batchNumber: string;
  reason: string;
}

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "Spreadsheet konnte nicht geladen werden." },
        { status: 502 }
      );
    }
    const csv = await res.text();
    const lines = csv.split("\n").filter((l) => l.trim());

    let dataStartIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      if (
        lines[i].toLowerCase().includes("name") &&
        lines[i].toLowerCase().includes("batch")
      ) {
        dataStartIndex = i + 1;
        break;
      }
    }
    if (dataStartIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Header-Zeile nicht gefunden." },
        { status: 400 }
      );
    }

    const products = await db.product.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
    });
    const slugToProduct = new Map(products.map((p) => [p.slug, p]));

    // Pre-load all existing COAs für differenziertes Diff (create/update).
    // Map key: `${productId}:${batchNumber}` → bestehender Eintrag mit den
    // Feldern, die wir potenziell aktualisieren würden.
    const existingCoas = await db.certificateOfAnalysis.findMany({
      select: {
        id: true,
        productId: true,
        batchNumber: true,
        reportUrl: true,
        testMethod: true,
        laboratory: true,
      },
    });
    const existingMap = new Map(
      existingCoas.map((c) => [`${c.productId}:${c.batchNumber}`, c])
    );

    const created: CreatedEntry[] = [];
    const updated: UpdatedEntry[] = [];
    const skipped: SkippedEntry[] = [];
    const errors: string[] = [];

    for (let i = dataStartIndex; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const name = fields[0];
      const batch = fields[1];

      if (!name || !batch) continue;

      const slug = matchProductSlug(name);
      if (!slug) {
        skipped.push({
          productName: name,
          batchNumber: batch,
          reason: "Kein Produkt-Mapping im Shop",
        });
        continue;
      }

      const product = slugToProduct.get(slug);
      if (!product) {
        skipped.push({
          productName: name,
          batchNumber: batch,
          reason: `Slug '${slug}' existiert nicht oder ist inaktiv`,
        });
        continue;
      }

      const urls: string[] = [];
      for (let col = 2; col < fields.length; col++) {
        const url = fields[col]?.trim();
        if (url && url.startsWith("http")) urls.push(url);
      }

      if (urls.length === 0) {
        skipped.push({
          productName: product.name,
          batchNumber: batch,
          reason: "Keine Report-URL in der Zeile",
        });
        continue;
      }

      const latestUrl = urls[0];
      const dedupKey = `${product.id}:${batch}`;
      const existing = existingMap.get(dedupKey);

      if (!existing) {
        try {
          await db.certificateOfAnalysis.create({
            data: {
              productId: product.id,
              batchNumber: batch,
              testDate: parseBatchDate(batch),
              testMethod: "HPLC",
              laboratory: "Janoshik",
              reportUrl: latestUrl,
              isPublished: true,
            },
          });
          created.push({
            productName: product.name,
            batchNumber: batch,
            reportUrl: latestUrl,
          });
        } catch (err) {
          errors.push(`Zeile ${i + 1}: ${(err as Error).message}`);
        }
        continue;
      }

      // Bestehender Eintrag — nur dann updaten, wenn sich etwas Sichtbares
      // geändert hat (aktuell primär die Report-URL, da Janoshik Links
      // gelegentlich neu ausgibt).
      const changedFields: string[] = [];
      const updateData: {
        reportUrl?: string;
      } = {};
      if (existing.reportUrl !== latestUrl) {
        changedFields.push("reportUrl");
        updateData.reportUrl = latestUrl;
      }

      if (changedFields.length === 0) {
        skipped.push({
          productName: product.name,
          batchNumber: batch,
          reason: "Unverändert",
        });
        continue;
      }

      try {
        await db.certificateOfAnalysis.update({
          where: { id: existing.id },
          data: updateData,
        });
        updated.push({
          productName: product.name,
          batchNumber: batch,
          changedFields,
        });
      } catch (err) {
        errors.push(`Zeile ${i + 1} (Update): ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created,
        updated,
        skipped,
        errors: errors.slice(0, 10),
        // Kompakt-Counts — bleibt rückwärtskompatibel falls irgendwo im Code
        // noch auf imported/skipped gelesen wird (z.B. alter Client während
        // Deploy-Übergang).
        imported: created.length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
