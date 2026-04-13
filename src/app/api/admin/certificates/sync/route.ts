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
  // Try exact match first (without mg)
  const withoutMg = lower.replace(/\s*\d+\s*mg$/i, "").trim();
  // Try direct map
  if (PRODUCT_MAP[withoutMg]) return PRODUCT_MAP[withoutMg];
  // Try with dashes instead of spaces
  const dashed = withoutMg.replace(/\s+/g, "-");
  if (PRODUCT_MAP[dashed]) return PRODUCT_MAP[dashed];
  // Try without dashes/spaces
  const compact = withoutMg.replace(/[-\s]+/g, "");
  if (PRODUCT_MAP[compact]) return PRODUCT_MAP[compact];
  return null;
}

/** Try to parse date from batch number like "CS-se5-0116" → Jan 16 */
function parseBatchDate(batch: string): Date {
  // Pattern: last 4 digits = MMDD (e.g. "0116" = Jan 16, "0202" = Feb 2)
  const match = batch.match(/(\d{2})(\d{2})$/);
  if (match) {
    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const year = new Date().getFullYear();
      const d = new Date(year, month - 1, day);
      // If future date, use previous year
      if (d > new Date()) d.setFullYear(year - 1);
      return d;
    }
  }
  return new Date(); // fallback
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

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  try {
    // 1. Fetch CSV from Google Sheets
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: "Spreadsheet konnte nicht geladen werden." },
        { status: 502 }
      );
    }
    const csv = await res.text();
    const lines = csv.split("\n").filter((l) => l.trim());

    // 2. Find header row (contains "Name" and "Batch")
    let dataStartIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      if (lines[i].toLowerCase().includes("name") && lines[i].toLowerCase().includes("batch")) {
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

    // 3. Pre-load all products for lookup
    const products = await db.product.findMany({
      where: { isActive: true },
      select: { id: true, slug: true },
    });
    const slugToId = new Map(products.map((p) => [p.slug, p.id]));

    // 4. Pre-load existing COAs for dedup
    const existingCoas = await db.certificateOfAnalysis.findMany({
      select: { productId: true, batchNumber: true },
    });
    const existingSet = new Set(
      existingCoas.map((c) => `${c.productId}:${c.batchNumber}`)
    );

    // 5. Process data rows
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = dataStartIndex; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const name = fields[0];
      const batch = fields[1];
      const latestUrl = fields[2];

      if (!name || !batch) continue;

      // Match product
      const slug = matchProductSlug(name);
      if (!slug) {
        skipped++;
        continue; // Product not in our shop
      }

      const productId = slugToId.get(slug);
      if (!productId) {
        skipped++;
        continue;
      }

      // Check all URL columns (latest + previous COAs)
      const urls: string[] = [];
      for (let col = 2; col < fields.length; col++) {
        const url = fields[col]?.trim();
        if (url && url.startsWith("http")) urls.push(url);
      }

      if (urls.length === 0) {
        skipped++;
        continue;
      }

      // Import the latest COA (column C) — use batch number as-is
      const dedupKey = `${productId}:${batch}`;
      if (existingSet.has(dedupKey)) {
        skipped++;
        continue;
      }

      try {
        await db.certificateOfAnalysis.create({
          data: {
            productId,
            batchNumber: batch,
            testDate: parseBatchDate(batch),
            testMethod: "HPLC",
            laboratory: "Janoshik",
            reportUrl: urls[0], // Latest Janoshik URL
            isPublished: true,
          },
        });
        existingSet.add(dedupKey);
        imported++;
      } catch (err) {
        errors.push(`Zeile ${i + 1}: ${(err as Error).message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: { imported, skipped, errors: errors.slice(0, 5) },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
