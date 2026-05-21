import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { UeberUnsInteractions } from "./interactions";
import { DESIGN_BODY_HTML } from "./design-body";
import "./ueber-uns.css";

/**
 * /ueber-uns — Über uns (Brand-Edition Redesign)
 *
 * Server-Component fetched Live-Daten aus der DB und setzt sie via
 * {{PLACEHOLDER}}-Tokens in die statische Design-HTML ein:
 *   - `chargenCount`  — distinct batchNumbers (published COAs) → Hero- +
 *     Zahlen-Counter "Chargen freigegeben"
 *   - `avgPurity`     — Ø purity über alle published COAs → Hero- + Zahlen-
 *     Counter "Ø HPLC-Reinheit"
 *   - `showcase`      — COA mit höchster purity → Specimen-Card-Lot, Story-
 *     Annotationen, HPLC-Figure-Card (Lot, Reinheit, Run-Datum)
 *
 * ISR mit 1h-Revalidate. Fallbacks: bei DB-Fehler/leerer Tabelle "—" für
 * die Counter + konsistente Demo-Werte für die Showcase-Felder.
 *
 * Das Vial ist unsere 120-Frame Cycles-Assembly: Hero zeigt frame_120
 * (assembled, statisch + Maus-Parallax), die Story-Section scrubbt frame_001
 * → frame_120 scroll-synchron (siehe interactions.tsx).
 *
 * TODO:self bleibt sichtbar — user füllt USt-ID, HRB selber (kontakt-card).
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Über uns — ${APP_NAME}`,
  description: `${APP_NAME} liefert Forschungspeptide nach veröffentlichter Methode. Jede Charge erhält eine Lot-Nummer und ein HPLC-Chromatogramm von Janoshik Analytical — gemessen, nicht versprochen.`,
  robots: { index: true, follow: true },
};

interface UeberUnsData {
  chargenCount: number | null;
  avgPurity: number | null;
  showcase: {
    batchNumber: string;
    purity: number;
    testDate: Date;
  } | null;
}

/**
 * Live-Daten aus der DB. Drei Queries parallel; Errors werden gefangen,
 * damit die Seite auch bei DB-Ausfall noch rendert (dann mit "—" + Demo).
 */
async function fetchUeberUnsData(): Promise<UeberUnsData> {
  try {
    const [distinctBatches, avg, showcase] = await Promise.all([
      db.certificateOfAnalysis.findMany({
        where: { isPublished: true },
        distinct: ["batchNumber"],
        select: { batchNumber: true },
      }),
      db.certificateOfAnalysis.aggregate({
        where: { isPublished: true, purity: { not: null } },
        _avg: { purity: true },
      }),
      db.certificateOfAnalysis.findFirst({
        where: { isPublished: true, purity: { not: null } },
        orderBy: [{ purity: "desc" }, { testDate: "desc" }],
        select: { batchNumber: true, purity: true, testDate: true },
      }),
    ]);

    return {
      chargenCount: distinctBatches.length,
      avgPurity: avg._avg.purity ?? null,
      showcase:
        showcase && showcase.purity != null
          ? {
              batchNumber: showcase.batchNumber,
              purity: showcase.purity,
              testDate: showcase.testDate,
            }
          : null,
    };
  } catch (err) {
    console.error("[ueber-uns] DB fetch failed:", err);
    return { chargenCount: null, avgPurity: null, showcase: null };
  }
}

/**
 * Setzt die {{PLACEHOLDER}}-Tokens mit echten Werten. Counter-Fallbacks
 * ersetzen das gesamte animierte Span durch ein statisches "—", damit kein
 * data-count="—" am DOM steht (parseFloat → NaN → "NaN" gerendert).
 */
function applyPlaceholders(html: string, data: UeberUnsData): string {
  let out = html;

  // Ø HPLC-Reinheit (Hero + Zahlen) — data-count braucht Dot-Decimal.
  if (data.avgPurity !== null) {
    out = out.replaceAll("{{AVG_PURITY_RAW}}", data.avgPurity.toFixed(2));
  } else {
    out = out.replaceAll(
      'data-count="{{AVG_PURITY_RAW}}" data-decimals="2">0',
      ">—",
    );
    out = out.replaceAll("{{AVG_PURITY_RAW}}", "—");
  }

  // Chargen freigegeben (Hero + Zahlen)
  if (data.chargenCount !== null) {
    out = out.replaceAll("{{CHARGEN_COUNT}}", String(data.chargenCount));
  } else {
    out = out.replaceAll(
      'data-count="{{CHARGEN_COUNT}}" data-decimals="0">0',
      ">—",
    );
    out = out.replaceAll("{{CHARGEN_COUNT}}", "—");
  }

  // Showcase-Felder: echte COA oder konsistente Demo-Werte
  const lotNumber = data.showcase?.batchNumber ?? "CS-re10-0322";
  const purity = data.showcase
    ? data.showcase.purity.toFixed(2).replace(".", ",")
    : "99,41";
  const testDate = data.showcase
    ? data.showcase.testDate.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "22. März 2025";

  out = out.replaceAll("{{LOT_NUMBER}}", lotNumber);
  out = out.replaceAll("{{PURITY}}", purity);
  out = out.replaceAll("{{TEST_DATE}}", testDate);

  return out;
}

export default async function UeberUnsPage() {
  const data = await fetchUeberUnsData();
  const html = applyPlaceholders(DESIGN_BODY_HTML, data);

  return (
    <>
      {/* Design nutzt drei Google Fonts. JSX-<link> wird von Next 15
          automatisch in den <head> gehoben + dedupliziert. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Comfortaa:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap"
      />

      <div
        className="ueber-uns-design"
        // Scoped CSS-Wrapper. dangerouslySetInnerHTML ist sicher: das HTML
        // kommt aus dem statischen Design-Bundle, Placeholder-Werte sind
        // serialisierte Numbers / DB-Strings (batchNumber) — keine User-Eingaben.
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <UeberUnsInteractions />
    </>
  );
}
