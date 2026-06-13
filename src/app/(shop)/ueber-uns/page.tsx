import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Package, Microscope, ShieldCheck, Mail, ArrowRight } from "lucide-react";
import { APP_NAME, SELLER_DETAILS } from "@/lib/constants";
import { db } from "@/lib/db";
import { safeJsonLd } from "@/lib/json-ld";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UeberUnsData } from "./_components/types";
import {
  MANIFEST_TENETS,
  STORY_PANELS,
  PROZESS_STEPS,
  METRICS,
  ROADMAP_ROWS,
  KONTAKT_FACTS,
  SUPPORT_EMAIL,
  type Metric,
  type ProzessStep,
} from "./_components/data";

/**
 * /ueber-uns: Über uns — editoriales Manifest der Marke.
 *
 * Server-Component ohne Client-JS: holt Live-COA-Daten aus der DB und
 * rendert die Protokoll-Sektionen direkt mit den globalen
 * „Chromatogramm“-Primitives (section-ink, eyebrow, display-title,
 * tick-rule, stat-value …). Scroll-Reveals übernimmt der globale
 * RevealController des Shop-Layouts.
 *
 * `force-dynamic`: pro Request server-side gerendert, damit die Live-Werte
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

/** Testdatum kompakt für den "PASSED"-Stempel, z. B. "22 · MÄR · 25". */
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
 * BEWUSST keine Demo-Fallbacks: Ohne veröffentlichte COA bleiben die
 * Showcase-Felder null — Hero-Lot-Tag und Labor-Befundkarte blenden sich
 * dann aus, statt Messwerte zu faken.
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

/** Zahl DE-formatiert; null (DB-Fehler/leer) ehrlich als "n. v.". */
function fmt(value: number | null, decimals: number, suffix = ""): string {
  if (value == null) return "n. v.";
  const s = value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return suffix ? `${s} ${suffix}` : s;
}

function metricValue(source: Metric["source"], data: UeberUnsData): number | null {
  if (source === "avgPurity") return data.avgPurity;
  if (source === "chargenCount") return data.chargenCount;
  return source;
}

const PROZESS_ICONS: Record<ProzessStep["icon"], typeof Package> = {
  package: Package,
  microscope: Microscope,
  shield: ShieldCheck,
  mail: Mail,
};

/** Gestaffeltes Reveal über die globale --fade-delay-Variable. */
const delay = (i: number) => ({ "--fade-delay": `${0.06 * i}s` }) as CSSProperties;

export default async function UeberUnsPage() {
  const data = toDisplayData(await fetchUeberUnsData());

  // USt-ID/HR kommen zentral aus SELLER_DETAILS (env-basiert) statt als
  // "TODO:self"-Hardcode in data.ts — die Ersetzung passiert hier in der
  // Server-Component, weil SELLER_*-Variablen nur server-seitig existieren.
  const kontaktFacts: ReadonlyArray<[string, string]> = KONTAKT_FACTS.map(
    ([k, v]): [string, string] => {
      if (k === "USt-ID") return [k, SELLER_DETAILS.vatId];
      if (k === "HR") return [k, SELLER_DETAILS.registerNumber];
      return [k, v];
    }
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `Über uns | ${APP_NAME}`,
    description: metadata.description,
    isPartOf: { "@type": "Organization", name: APP_NAME },
  };

  return (
    <div data-ueber-uns>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* ===== 01 · Hero — Ink-Statement =============================== */}
      <section className="section-ink grain-overlay relative overflow-hidden">
        <div className="apo-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container relative z-[2] section-pad">
          <div className="grid items-center gap-12 lg:grid-cols-[7fr_5fr] lg:gap-16">
            <div className="reveal-up">
              <p className="eyebrow">Über uns · Analyse-Protokoll</p>
              <h1 className="display-title mt-5 text-5xl text-ink-foreground sm:text-6xl lg:text-7xl">
                Reinheit, <em className="text-primary">gemessen</em>.
                <br />
                Nicht versprochen.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
                {APP_NAME} liefert Forschungspeptide nach veröffentlichter
                Methode. Jede Charge bekommt eine Lot-Nummer und ein
                HPLC-Chromatogramm von Janoshik Analytical — bevor sie ein
                Etikett bekommt.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                <span className="trust-pill">Research Use Only</span>
                <span className="trust-pill">Janoshik-verifiziert</span>
                <span className="trust-pill">Est. 2026</span>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-ink-border pt-6">
                <div>
                  <p className="stat-value text-3xl sm:text-4xl">
                    {fmt(data.avgPurity, 2, "%")}
                  </p>
                  <p className="stat-key mt-2">Ø HPLC-Reinheit</p>
                </div>
                <div>
                  <p className="stat-value text-3xl sm:text-4xl">
                    {fmt(data.chargenCount, 0)}
                  </p>
                  <p className="stat-key mt-2">Chargen freigegeben</p>
                </div>
                <div>
                  <p className="stat-value text-3xl sm:text-4xl">100&nbsp;%</p>
                  <p className="stat-key mt-2">3rd-Party verifiziert</p>
                </div>
              </div>
            </div>

            {/* Specimen-Tafel: ein ruhiges Vial-Still statt Scroll-Kino. */}
            <figure className="reveal-up relative mx-auto w-full max-w-sm" style={delay(2)}>
              <div className="relative border border-ink-border bg-[hsl(218_32%_9%)] p-8">
                <div className="apo-grid absolute inset-0" aria-hidden="true" />
                <div className="relative flex items-center justify-between">
                  <span className="mono-tag text-ink-muted">Fig. 0.1</span>
                  <span className="mono-tag text-ink-muted">10 ml · Lyophilisat</span>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element -- einzelnes dekoratives WebP-Frame */}
                <img
                  src="/ueber-uns/vial-assembly/frame_120.webp"
                  alt="ChromePeps Forschungspeptid-Vial"
                  className="relative mx-auto mt-4 w-full max-w-[260px]"
                  loading="eager"
                />
                <div className="tick-rule relative mt-6" aria-hidden="true" />
                <figcaption className="relative mt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-muted">
                  {data.lotNumber && data.purityComma ? (
                    <>
                      <b className="font-semibold text-ink-foreground">
                        LOT {data.lotNumber}
                      </b>{" "}
                      · <span className="text-primary">HPLC {data.purityComma} %</span>
                    </>
                  ) : (
                    <>Referenzmaterial · In-vitro-Forschung</>
                  )}
                </figcaption>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* ===== 02 · Manifest =========================================== */}
      <section className="section-pad relative">
        <div className="container">
          <header className="reveal-up max-w-3xl">
            <p className="eyebrow">01 · Manifest</p>
            <h2 className="display-title mt-4 text-4xl sm:text-5xl">
              Wir verkaufen keine Versprechen.
              <br />
              Wir liefern <em className="text-primary-strong">Messwerte</em>.
            </h2>
          </header>

          <div className="tick-rule mt-10" aria-hidden="true" />

          <ol className="mt-2">
            {MANIFEST_TENETS.map((t, i) => (
              <li
                key={t.no}
                className="reveal-up grid gap-x-10 gap-y-2 border-b border-border py-8 sm:grid-cols-[96px_1fr] lg:grid-cols-[120px_1fr_1fr]"
                style={delay(i)}
              >
                <span className="index-ghost text-5xl sm:text-6xl" aria-hidden="true">
                  {t.no}
                </span>
                <h3 className="display-title text-2xl sm:text-[28px]">{t.statement}</h3>
                <p className="max-w-prose text-[15px] leading-relaxed text-muted-foreground lg:pt-1">
                  {t.detail}
                </p>
              </li>
            ))}
          </ol>

          <footer className="reveal-up mt-10 flex items-baseline gap-4">
            <span className="h-px w-12 bg-primary" aria-hidden="true" />
            <span className="font-display text-xl italic">
              Gemessen, nicht versprochen.
            </span>
            <span className="mono-label text-muted-foreground">{APP_NAME}</span>
          </footer>
        </div>
      </section>

      {/* ===== 03 · Protokoll: Vial → Charge =========================== */}
      <section className="section-pad relative border-t border-border bg-muted/40">
        <div className="container">
          <header className="reveal-up max-w-2xl">
            <p className="eyebrow">02 · Vial → Charge</p>
            <h2 className="display-title mt-4 text-3xl sm:text-4xl">
              Was passiert, bevor das Etikett{" "}
              <em className="text-primary-strong">freigegeben</em> wird.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Vier Schritte vom Rohstoff bis zur versendeten Charge — als
              Protokoll, nicht als Werbetext.
            </p>
          </header>

          <div className="mt-12 space-y-0">
            {STORY_PANELS.map((panel, pi) => (
              <article
                key={panel.label}
                className="reveal-up grid gap-x-12 gap-y-5 border-t border-border py-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"
                style={delay(pi)}
              >
                <div>
                  <p className="mono-label text-primary-strong">{panel.label}</p>
                  <h3 className="display-title mt-3 text-2xl sm:text-3xl">
                    {panel.title.map((seg, i) =>
                      seg.accent ? (
                        <em className="text-primary-strong" key={i}>
                          {seg.text}
                        </em>
                      ) : (
                        <span key={i}>{seg.text}</span>
                      ),
                    )}
                  </h3>
                  <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-muted-foreground">
                    {panel.body.map((seg, i) =>
                      seg.bold ? (
                        <strong className="font-semibold text-foreground" key={i}>
                          {seg.text}
                        </strong>
                      ) : (
                        <span key={i}>{seg.text}</span>
                      ),
                    )}
                  </p>
                </div>

                {/* Protokollzeilen: Mess-Fakten des Schritts. */}
                <dl className="self-start border border-border bg-card">
                  {panel.facts.map((f) => (
                    <div
                      key={f.dt}
                      className="flex items-baseline justify-between gap-6 border-b border-border px-5 py-3 last:border-b-0"
                    >
                      <dt className="mono-label text-muted-foreground">{f.dt}</dt>
                      {/* Ohne echte COA keinen Lot-Wert erfinden — "—". */}
                      <dd className="font-mono text-[13px] tabular-nums">
                        {f.lot ? data.lotNumber ?? "—" : f.dd}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 04 · Prozess — Ink-Einschub ============================= */}
      <section className="section-ink grain-overlay relative overflow-hidden">
        <div className="apo-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container relative z-[2] section-pad">
          <header className="reveal-up max-w-2xl">
            <p className="eyebrow">03 · Der Prozess</p>
            <h2 className="display-title mt-4 text-3xl text-ink-foreground sm:text-4xl">
              Vom Eingang zum Etikett in vier verifizierten Schritten.
            </h2>
            <p className="mt-4 text-ink-muted">
              Keine Abkürzungen. Keine Ausnahmen. Keine „Sonderchargen“.
            </p>
          </header>

          <div className="mt-12 grid gap-px border border-ink-border bg-ink-border sm:grid-cols-2 lg:grid-cols-4">
            {PROZESS_STEPS.map((step, i) => {
              const Icon = PROZESS_ICONS[step.icon];
              return (
                <div
                  key={step.title}
                  className="reveal-up relative bg-ink p-7"
                  style={delay(i)}
                >
                  <span className="index-ghost absolute right-5 top-4 text-6xl" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon className="h-6 w-6 text-primary" strokeWidth={1.8} aria-hidden="true" />
                  <h3 className="mt-5 text-base font-semibold text-ink-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {step.tags.map((t) => (
                      <span
                        key={t.text}
                        className={`mono-tag border px-2 py-1 ${
                          t.pass
                            ? "border-primary/40 text-primary"
                            : "border-ink-border text-ink-muted"
                        }`}
                      >
                        {t.text}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== 05 · Labor / Evidenz ==================================== */}
      <section className="section-pad relative">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <div className="reveal-up">
              <p className="eyebrow">04 · Evidenz, nicht Marketing</p>
              <h2 className="display-title mt-4 text-3xl sm:text-4xl">
                So sieht ein <em className="text-primary-strong">„passed“</em>{" "}
                Lot aus.
              </h2>
              <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-muted-foreground">
                Jede Charge wird per RP-HPLC bei Janoshik Analytical vermessen.
                Der Haupt-Peak ist das Zielpeptid; die Fläche unter der Kurve im
                Verhältnis zur Gesamtfläche ergibt die Reinheit
                {data.purityComma ? (
                  <>
                    {" "}
                    — beim Showcase-Lot{" "}
                    <strong className="font-semibold text-foreground">
                      {data.purityComma} %
                    </strong>
                  </>
                ) : null}
                .
              </p>

              <dl className="mt-8 border-t border-foreground">
                {[
                  ["Säule", "C18, 4,6 × 250 mm, 5 µm"],
                  ["Fluss", "1,0 ml/min · UV 220 nm"],
                  ["Gradient", "0,1 % TFA / Acetonitril, 5 → 60 % über 10 min"],
                  ["Referenz", "Janoshik MS-Library · Match-Score 0,997"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="grid gap-x-8 gap-y-1 border-b border-border py-3.5 sm:grid-cols-[120px_1fr]"
                  >
                    <dt className="mono-label text-muted-foreground">{k}</dt>
                    <dd className="font-mono text-[13px]">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8">
                <Button asChild variant="gold" className="gap-2">
                  <Link href="/qualitaetskontrolle">
                    Qualitätskontrolle ansehen
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Befundkarte nur mit ECHTEN Showcase-Daten rendern —
                ohne veröffentlichte COA keine fabrizierten Messwerte. */}
            {data.lotNumber && data.purityComma && data.testDate && (
              <Card variant="ink" className="reveal-up self-start p-7" style={delay(2)}>
                <div className="flex items-center justify-between">
                  <span className="mono-tag text-ink-muted">Analyse-Befund</span>
                  <span className="mono-tag border border-primary/40 px-2 py-1 text-primary">
                    Passed{data.testDateStamp ? ` · ${data.testDateStamp}` : ""}
                  </span>
                </div>
                <div className="tick-rule mt-5" aria-hidden="true" />
                <dl className="mt-2">
                  {(
                    [
                      ["Lot", data.lotNumber],
                      ["Reinheit (HPLC)", `${data.purityComma} %`],
                      ["Testdatum", data.testDate],
                      ["Labor", "Janoshik Analytical s.r.o."],
                      ["Methode", "RP-HPLC + ESI-MS"],
                    ] as const
                  ).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-baseline justify-between gap-6 border-b border-ink-border py-3 last:border-b-0"
                    >
                      <dt className="mono-label text-ink-muted">{k}</dt>
                      <dd className="font-mono text-[13px] tabular-nums text-ink-foreground">
                        {v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ===== 06 · Zahlen ============================================= */}
      <section className="section-pad relative border-t border-border">
        <div className="subtle-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="container relative">
          <header className="reveal-up max-w-2xl">
            <p className="eyebrow">05 · In Zahlen</p>
            <h2 className="display-title mt-4 text-3xl sm:text-4xl">
              Operationelle Realität, <em className="text-primary-strong">2026</em>.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Werte aus dem laufenden Janoshik-Verifikationsfluss, keine
              Hochrechnungen.
            </p>
          </header>

          <div className="mt-12 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {METRICS.map((m, i) => (
              <div key={m.fig} className="reveal-up bg-card p-7" style={delay(i)}>
                <p className="mono-tag text-muted-foreground">{m.fig}</p>
                <p className="stat-value mt-4 text-4xl sm:text-5xl">
                  {fmt(metricValue(m.source, data), m.decimals, m.suffix)}
                </p>
                <p className="stat-key mt-3">{m.label}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 07 · Roadmap ============================================ */}
      <section className="section-pad relative border-t border-border">
        <div className="container">
          <header className="reveal-up max-w-2xl">
            <p className="eyebrow">06 · Roadmap</p>
            <h2 className="display-title mt-4 text-3xl sm:text-4xl">
              Was als Nächstes <em className="text-primary-strong">verifizierbar</em>{" "}
              wird.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Eine Roadmap ist nur dann ehrlich, wenn auch die noch nicht
              erreichten Punkte darin stehen. Hier sind beide.
            </p>
          </header>

          <div className="tick-rule mt-10" aria-hidden="true" />

          <div className="mt-2">
            {ROADMAP_ROWS.map((row, i) => (
              <div
                key={`${row.title}-${i}`}
                className={`reveal-up grid gap-x-10 gap-y-1.5 border-b border-border py-6 sm:grid-cols-[120px_minmax(0,1fr)_140px] ${
                  row.state === "future" ? "opacity-60" : ""
                }`}
                style={delay(i)}
              >
                <span
                  className={`mono-label ${
                    row.state === "current"
                      ? "text-primary-strong"
                      : "text-muted-foreground"
                  }`}
                >
                  {row.quarter}
                </span>
                <div>
                  <h3 className="text-base font-semibold">{row.title}</h3>
                  <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
                    {row.desc}
                  </p>
                </div>
                <span
                  className={`mono-label sm:text-right ${
                    row.state === "current"
                      ? "text-primary-strong"
                      : "text-muted-foreground"
                  }`}
                >
                  {row.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 08 · Kontakt ============================================ */}
      <section className="section-pad hero-ambient relative border-t border-border">
        <div className="container relative">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <div className="reveal-up">
              <p className="eyebrow">07 · Kontakt</p>
              <h2 className="display-title mt-4 text-3xl sm:text-4xl">
                Forschungsfragen. Sortimentsanfragen.{" "}
                <em className="text-primary-strong">CoA-Verifikation.</em>
              </h2>
              <p className="mt-4 max-w-prose text-muted-foreground">
                Wir antworten innerhalb eines Werktags, auf Deutsch oder
                Englisch. Kein Bot, kein Ticket-System.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="gold" className="gap-2">
                  <a href={`mailto:${SUPPORT_EMAIL}`}>
                    {SUPPORT_EMAIL}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/faq">FAQ ansehen</Link>
                </Button>
              </div>
            </div>

            <Card className="reveal-up self-start" style={delay(2)}>
              <div className="border-b border-border px-6 py-4">
                <span className="mono-label text-muted-foreground">Firmendaten</span>
              </div>
              <dl className="px-6 py-2">
                {kontaktFacts.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-baseline justify-between gap-6 border-b border-border py-3 last:border-b-0"
                  >
                    <dt className="mono-label text-muted-foreground">{k}</dt>
                    <dd className="text-right font-mono text-[13px]">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
