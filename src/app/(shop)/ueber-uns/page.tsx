import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { db } from "@/lib/db";
import { safeJsonLd } from "@/lib/json-ld";
import shared from "./_components/shared.module.css";
import type { UeberUnsData } from "./_components/types";
import { ChromNav } from "./_components/ChromNav";
import { HeroCinematic } from "./_components/HeroCinematic";
import { Manifest } from "./_components/Manifest";
import { Story } from "./_components/Story";
import { Prozess } from "./_components/Prozess";
import { Labor } from "./_components/Labor";
import { Zahlen } from "./_components/Zahlen";
import { Roadmap } from "./_components/Roadmap";
import { Kontakt } from "./_components/Kontakt";
import { PageEnhancements } from "./_components/PageEnhancements";

/**
 * /ueber-uns: Über uns (Brand-Edition, sauberer React-Neuaufbau)
 *
 * Server-Component: holt Live-COA-Daten aus der DB und reicht sie als
 * typisierte Props an die Sektions-Komponenten (ersetzt die frühere
 * dangerouslySetInnerHTML-/{{PLACEHOLDER}}-Architektur).
 *
 * `force-dynamic`: pro Request server-side gerendert, damit die Live-Counter
 * echte Daten zeigen (mit ISR würde der "n. v."-Fallback im DB-losen Docker-
 * Build eingebacken). Pro Query eigener Fallback via Promise.allSettled.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Kein "| ChromePeps"-Suffix — den hängt das title-Template des
  // Root-Layouts automatisch an (sonst doppelter Brand-Suffix).
  title: "Über uns",
  description: `${APP_NAME} liefert Forschungspeptide nach veröffentlichter Methode. Jede Charge erhält eine Lot-Nummer und ein HPLC-Chromatogramm von Janoshik Analytical: gemessen, nicht versprochen.`,
  robots: { index: true, follow: true },
  alternates: { canonical: "/ueber-uns" },
};

interface RawData {
  chargenCount: number | null;
  avgPurity: number | null;
  showcase: { batchNumber: string; purity: number; testDate: Date } | null;
}

/**
 * Live-Daten aus der DB. Zwei Queries über Promise.allSettled, damit ein
 * fehlschlagender Query die anderen nicht mitreißt. chargenCount + avgPurity
 * aus EINER findMany (distinct/Ø in JS): ein Failure-Point weniger.
 */
async function fetchUeberUnsData(): Promise<RawData> {
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
    const purities = rows.map((r) => r.purity).filter((p): p is number => p != null);
    avgPurity = purities.length
      ? purities.reduce((a, b) => a + b, 0) / purities.length
      : null;
  } else {
    console.error("[ueber-uns] COA rows query failed:", rowsRes.reason);
  }

  let showcase: RawData["showcase"] = null;
  if (showcaseRes.status === "fulfilled") {
    const sc = showcaseRes.value;
    if (sc && sc.purity != null) {
      showcase = { batchNumber: sc.batchNumber, purity: sc.purity, testDate: sc.testDate };
    }
  } else {
    console.error("[ueber-uns] showcase query failed:", showcaseRes.reason);
  }

  return { chargenCount, avgPurity, showcase };
}

/** Testdatum kompakt für den "PASSED"-Stempel der HPLC-Figure, z. B. "22 · MÄR · 25". */
function toStampDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = d
    .toLocaleDateString("de-DE", { month: "short" })
    .replace(".", "")
    .toUpperCase();
  const year = String(d.getFullYear() % 100).padStart(2, "0");
  return `${day} · ${month} · ${year}`;
}

/**
 * Rohdaten → Anzeige-fertiges UeberUnsData (DE-Formatierung).
 *
 * BEWUSST keine Demo-Fallbacks mehr: Hier wurden früher bei leerer DB
 * erfundene Chargen-/Reinheitswerte ("CS-re10-0322" / "99,41" /
 * "22. März 2025") als echte Messung ausgegeben. Ohne veröffentlichte COA
 * bleiben die Showcase-Felder jetzt null — Hero-Lot-Tag, Story-Annotations
 * und Labor-Chromatogramm blenden sich dann aus statt Werte zu faken.
 */
function toDisplayData(raw: RawData): UeberUnsData {
  return {
    chargenCount: raw.chargenCount,
    avgPurity: raw.avgPurity,
    lotNumber: raw.showcase?.batchNumber ?? null,
    purityComma: raw.showcase
      ? raw.showcase.purity.toFixed(2).replace(".", ",")
      : null,
    testDate: raw.showcase
      ? raw.showcase.testDate.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : null,
    testDateStamp: raw.showcase ? toStampDate(raw.showcase.testDate) : null,
  };
}

export default async function UeberUnsPage() {
  const data = toDisplayData(await fetchUeberUnsData());

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `Über uns | ${APP_NAME}`,
    description: metadata.description,
    isPartOf: { "@type": "Organization", name: APP_NAME },
  };

  return (
    // `dark` erzwingt die cinematische Dark-Welt der Seite unabhängig vom
    // App-Theme-Toggle (App-Dark-Tokens → globale Klassen wie Buttons stimmen).
    <div className={`${shared.page} dark`} data-ueber-uns>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <ChromNav />
      <HeroCinematic data={data} />
      <Manifest />
      <Story lotNumber={data.lotNumber} purityComma={data.purityComma} />
      <Prozess />
      <Labor data={data} />
      <Zahlen data={data} />
      <Roadmap />
      <Kontakt />
      <PageEnhancements />
      <div className={shared.grain} aria-hidden="true" />
    </div>
  );
}
