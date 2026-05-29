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
 * `force-dynamic`: die Seite wird pro Request server-side gerendert (wie
 * /products), damit die Live-Counter echte Daten zeigen. Mit ISR
 * (`revalidate`) würde sie beim Docker-Build OHNE DB statisch vorgerendert
 * → der "—"-Fallback wäre eingebacken bis zur ersten Revalidation.
 * Fallbacks bleiben: bei DB-Fehler/leerer Tabelle "—" für die Counter +
 * konsistente Demo-Werte für die Showcase-Felder.
 *
 * Das Vial ist unsere 120-Frame Cycles-Assembly: Hero zeigt frame_120
 * (assembled, statisch + Maus-Parallax), die Story-Section scrubbt frame_001
 * → frame_120 scroll-synchron (siehe interactions.tsx).
 *
 * TODO:self bleibt sichtbar — user füllt USt-ID, HRB selber (kontakt-card).
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Über uns | ${APP_NAME}`,
  description: `${APP_NAME} liefert Forschungspeptide nach veröffentlichter Methode. Jede Charge erhält eine Lot-Nummer und ein HPLC-Chromatogramm von Janoshik Analytical: gemessen, nicht versprochen.`,
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
 * Live-Daten aus der DB. Die zwei Queries laufen über `Promise.allSettled`,
 * damit ein fehlschlagender Query die anderen NICHT mitreißt (sonst würde
 * z.B. eine kaputte Aggregation auch chargenCount + showcase auf null
 * ziehen → alles "—"). chargenCount + avgPurity kommen aus EINER findMany
 * (distinct in JS gezählt, Ø in JS gemittelt) — kein separater aggregate-
 * Query, ein Failure-Point weniger. Pro Query eigener Fallback auf null.
 */
async function fetchUeberUnsData(): Promise<UeberUnsData> {
  const [rowsRes, showcaseRes] = await Promise.allSettled([
    db.certificateOfAnalysis.findMany({
      where: { isPublished: true },
      select: { batchNumber: true, purity: true },
    }),
    db.certificateOfAnalysis.findFirst({
      where: { isPublished: true, purity: { not: null } },
      orderBy: [{ purity: "desc" }, { testDate: "desc" }],
      select: { batchNumber: true, purity: true, testDate: true },
    }),
  ]);

  let chargenCount: number | null = null;
  let avgPurity: number | null = null;
  if (rowsRes.status === "fulfilled") {
    const rows = rowsRes.value;
    chargenCount = new Set(rows.map((r) => r.batchNumber)).size;
    const purities = rows
      .map((r) => r.purity)
      .filter((p): p is number => p != null);
    avgPurity = purities.length
      ? purities.reduce((a, b) => a + b, 0) / purities.length
      : null;
  } else {
    console.error("[ueber-uns] COA rows query failed:", rowsRes.reason);
  }

  let showcase: UeberUnsData["showcase"] = null;
  if (showcaseRes.status === "fulfilled") {
    const sc = showcaseRes.value;
    if (sc && sc.purity != null) {
      showcase = {
        batchNumber: sc.batchNumber,
        purity: sc.purity,
        testDate: sc.testDate,
      };
    }
  } else {
    console.error("[ueber-uns] showcase query failed:", showcaseRes.reason);
  }

  return { chargenCount, avgPurity, showcase };
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
      ">n. v.",
    );
    out = out.replaceAll("{{AVG_PURITY_RAW}}", "n. v.");
  }

  // Chargen freigegeben (Hero + Zahlen)
  if (data.chargenCount !== null) {
    out = out.replaceAll("{{CHARGEN_COUNT}}", String(data.chargenCount));
  } else {
    out = out.replaceAll(
      'data-count="{{CHARGEN_COUNT}}" data-decimals="0">0',
      ">n. v.",
    );
    out = out.replaceAll("{{CHARGEN_COUNT}}", "n. v.");
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
      {/*
        DM Sans / Comfortaa / DM Mono werden bereits im Root-Layout via
        `next/font/google` self-hostet geladen und über die CSS-Variablen
        --font-sans, --font-display, --font-mono an die ueber-uns.css
        weitergereicht. Der frühere zusätzliche <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?...">-Block ist dadurch
        redundant — er erzwang einen render-blocking CSS-Roundtrip nach
        Google + extra Font-Binaries und triggerte die @next/next/no-
        page-custom-font Lint-Warnung. Entfernt.
      */}
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
