import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { UeberUnsInteractions } from "./interactions";
import { DESIGN_BODY_HTML } from "./design-body";
import "./ueber-uns.css";

/**
 * /ueber-uns — Über uns
 *
 * Phase 2 (Daten):
 *   - Server-Component fetched zwei Live-Daten aus der DB:
 *     · `chargenCount` — distinct batchNumbers in CertificateOfAnalysis
 *       (published) → "Chargen freigegeben"-Zahlen in Hero + Zahlen-Section
 *     · `showcaseLot` — eine veröffentlichte COA mit höchster purity
 *       (egal welches Produkt) → HPLC-Demo-Chart unten (Lot-Nummer,
 *       Purity, Produkt-Name, Run-Datum)
 *   - Die Werte werden via {{PLACEHOLDER}}-Tokens in die statische
 *     Design-HTML-String eingesetzt, bevor sie ins DOM injected wird.
 *   - ISR mit 1h-Revalidate: die Seite cached, regen sich aber nach
 *     einer Stunde neu — wenn neue Chargen freigegeben werden,
 *     erscheint die aktuelle Zahl ohne Deploy.
 *   - Fallbacks: bei DB-Fehler oder leerer Tabelle wird "—" für die
 *     Counter angezeigt; für die Demo-HPLC ein Hardcoded-Beispiel,
 *     damit das Chart immer mit konsistenten Demo-Werten rendert.
 *
 * Phase 1 (vorhanden):
 *   - Design-HTML aus design-body.ts, scoped-CSS aus ueber-uns.css,
 *     Client-Interactions aus interactions.tsx.
 *   - Frames aus /public/ueber-uns/vial/frame_*.webp (Phase 3 ggf. neu).
 *
 * TODO:self bleibt sichtbar — user füllt EST., Standort, Gegründet,
 * Lagerung, USt-ID, HRB selber.
 */

// ISR: cache 1 Stunde, dann auf nächsten Request frisch.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Über uns — ${APP_NAME}`,
  description: `${APP_NAME} ist ein deutsches Labor-Supply für Forschungspeptide. Jede Charge wird durch Janoshik Labs per HPLC analysiert, bevor sie das Lager verlässt.`,
  robots: { index: true, follow: true },
};

interface UeberUnsData {
  chargenCount: number | null;
  showcase: {
    batchNumber: string;
    purity: number;
    testDate: Date;
    productNameUpper: string;
  } | null;
}

/**
 * Live-Daten aus der DB. Beide Queries laufen parallel. Errors werden
 * gefangen, damit die Seite auch bei DB-Ausfall noch rendert — dann
 * mit "—" und Hardcoded-Demo-Werten.
 */
async function fetchUeberUnsData(): Promise<UeberUnsData> {
  try {
    const [distinctBatches, showcase] = await Promise.all([
      db.certificateOfAnalysis.findMany({
        where: { isPublished: true },
        distinct: ["batchNumber"],
        select: { batchNumber: true },
      }),
      db.certificateOfAnalysis.findFirst({
        where: { isPublished: true, purity: { not: null } },
        orderBy: [{ purity: "desc" }, { testDate: "desc" }],
        include: { product: { select: { name: true } } },
      }),
    ]);

    return {
      chargenCount: distinctBatches.length,
      showcase:
        showcase && showcase.purity != null
          ? {
              batchNumber: showcase.batchNumber,
              purity: showcase.purity,
              testDate: showcase.testDate,
              productNameUpper: showcase.product.name.toUpperCase(),
            }
          : null,
    };
  } catch (err) {
    // Build- und Dev-Mode ohne DB sollen nicht crashen.
    console.error("[ueber-uns] DB fetch failed:", err);
    return { chargenCount: null, showcase: null };
  }
}

/**
 * Setzt die {{PLACEHOLDER}}-Tokens in der Design-HTML mit echten
 * Werten. Fallbacks rendern in einem konsistenten Demo-State (kein
 * leeres "%" oder "LOT-"-Tail), falls die DB nichts liefert.
 */
function applyPlaceholders(html: string, data: UeberUnsData): string {
  let out = html;

  // Chargen-Count: wenn DB-Wert da ist, normal substituieren (die
  // Counter-Animation greift via [data-count]). Wenn null/Fehler:
  // das gesamte animierte Span durch ein statisches "—" ersetzen,
  // damit kein data-count="—" am DOM steht (parseFloat würde NaN
  // liefern und "NaN" rendern).
  if (data.chargenCount !== null) {
    out = out.replaceAll("{{CHARGEN_COUNT}}", String(data.chargenCount));
  } else {
    out = out.replaceAll(
      'data-count="{{CHARGEN_COUNT}}" data-decimals="0">0',
      ">—",
    );
    // safety net falls noch ein Token rumliegt
    out = out.replaceAll("{{CHARGEN_COUNT}}", "—");
  }

  // HPLC-Showcase: echte COA oder konsistente Demo-Werte
  const lotNumber = data.showcase?.batchNumber ?? "CS-re10-0322";
  const purity = data.showcase
    ? data.showcase.purity.toFixed(2).replace(".", ",")
    : "99,41";
  const productNameUpper =
    data.showcase?.productNameUpper ?? "RETATRUTIDE";
  const testDateRun = data.showcase
    ? data.showcase.testDate.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "22.03.2025";

  out = out.replaceAll("{{LOT_NUMBER}}", lotNumber);
  out = out.replaceAll("{{PURITY}}", purity);
  out = out.replaceAll("{{PRODUCT_NAME_UPPER}}", productNameUpper);
  out = out.replaceAll("{{TEST_DATE_RUN}}", testDateRun);

  return out;
}

export default async function UeberUnsPage() {
  const data = await fetchUeberUnsData();
  const html = applyPlaceholders(DESIGN_BODY_HTML, data);

  return (
    <>
      {/* Design nutzt drei Google Fonts. JSX-<link> wird von Next 15
          automatisch in den <head> gehoben + dedupliziert. Phase 5
          stellt das ggf. auf next/font/google um (self-hosted, ohne
          Render-Block). */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Comfortaa:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap"
      />

      <div
        className="ueber-uns-design"
        // Scoped CSS-Wrapper. dangerouslySetInnerHTML ist hier sicher:
        // das HTML kommt aus dem statischen Design-Bundle, und die
        // Placeholder-Werte sind serialisierte Numbers / DB-Strings
        // (batchNumber, product.name) — keine User-Eingaben.
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <UeberUnsInteractions />
    </>
  );
}
