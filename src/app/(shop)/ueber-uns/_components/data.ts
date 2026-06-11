/**
 * Statischer, typisierter Content der /ueber-uns Seite. Texte 1:1 aus der
 * früheren design-body.ts übernommen. Live-Werte (Lot/Reinheit/Datum/Counter)
 * kommen NICHT von hier, sondern als UeberUnsData-Props aus page.tsx.
 */

/** Chromatogramm-Sub-Nav: Sektionen als HPLC-Peaks (id muss den section-ids entsprechen). */
export const NAV_SECTIONS = [
  { id: "top", label: "01 Hero", peakX: 60 },
  { id: "manifest", label: "02 Manifest", peakX: 180 },
  { id: "story", label: "03 Vial", peakX: 320 },
  { id: "prozess", label: "04 Prozess", peakX: 460 },
  { id: "labor", label: "05 Labor", peakX: 610 },
  { id: "zahlen", label: "06 Zahlen", peakX: 750 },
  { id: "roadmap", label: "07 Roadmap", peakX: 870 },
  { id: "kontakt", label: "08 Kontakt", peakX: 960 },
] as const;

export const NAV_HEIGHTS = [8, 14, 18, 16, 36, 14, 12, 9] as const;

/**
 * Manifest: unsere Grundsätze als echtes Manifest (nummerierte Bekenntnisse,
 * nicht die früheren Firmen-Eckdaten, die jetzt allein in der Kontakt-Sektion
 * stehen). Bewusst kurz, deklarativ, RUO-konform: kein Heilversprechen.
 */
export interface ManifestTenet {
  no: string;
  statement: string;
  detail: string;
}

export const MANIFEST_TENETS: ManifestTenet[] = [
  {
    no: "01",
    statement: "Jede Charge trägt ihren Beweis.",
    detail:
      "Reinheit per HPLC, Identität per Massenspektrometrie, Lot-Nummer, Datum, Methode. Ohne Datensatz keine Freigabe.",
  },
  {
    no: "02",
    statement: "Das Labor ist unabhängig.",
    detail:
      "Janoshik Analytical misst, nicht wir. Jedes Ergebnis ist öffentlich verifizierbar, nicht von uns nacherzählt.",
  },
  {
    no: "03",
    statement: "Die Daten gehören dem Kunden.",
    detail:
      "Das Chromatogramm liegt jeder Bestellung bei. Transparenz ist bei uns die Voreinstellung, nicht das Upgrade.",
  },
  {
    no: "04",
    statement: "Wir geben keine Heilversprechen.",
    detail:
      "Material der Klasse Research Use Only, nach veröffentlichter Methode. Was damit erforscht wird, ist deine Wissenschaft.",
  },
  {
    no: "05",
    statement: "Im Zweifel wird gemessen.",
    detail:
      "Lieber eine Charge zu viel geprüft als ein Wert zu viel behauptet. Abweichung heißt Reject, nicht Anpassung.",
  },
];

/** Story-Panels (4 Schritte Vial → Charge). `lot` = true → dd nutzt Live-Lot-Nummer. */
export interface StoryPanel {
  label: string;
  /** h3 als Segmente: plain Text + optional ein hervorgehobenes accent-Segment. */
  title: Array<{ text: string; accent?: boolean }>;
  body: Array<{ text: string; bold?: boolean }>;
  facts: Array<{ dt: string; dd: string; lot?: boolean }>;
}

export const STORY_PANELS: StoryPanel[] = [
  {
    label: "i · WARENEINGANG",
    title: [
      { text: "Jede Charge erhält eine " },
      { text: "Identität", accent: true },
      { text: ", bevor sie ein Etikett bekommt." },
    ],
    body: [
      {
        text: "Eingangs­wiegung, Sicht­prüfung der Lyophilisat-Struktur, eindeutige Lot-Nummer.",
      },
    ],
    facts: [
      { dt: "Lot-ID", dd: "", lot: true },
      { dt: "Quarantäne", dd: "isoliert" },
      { dt: "Doku", dd: "End-to-End" },
      { dt: "Handling", dd: "≤ 60 min" },
    ],
  },
  {
    label: "ii · JANOSHIK",
    title: [
      { text: "Wir testen " },
      { text: "nicht selbst.", accent: true },
      { text: " Das ist der Punkt." },
    ],
    body: [
      {
        text: "Eine versiegelte Probe geht an Janoshik Analytical, ein unabhängiges Labor mit öffentlicher Datenbank. RP-HPLC bestimmt die Reinheit, ESI-MS verifiziert die Identität gegen Referenz­spektrum. Das Ergebnis ist nicht „unser“ Ergebnis.",
      },
    ],
    facts: [
      { dt: "Methode", dd: "RP-HPLC + ESI-MS" },
      { dt: "Schwelle", dd: "≥ 98 %" },
      { dt: "Labor", dd: "Janoshik s.r.o." },
      { dt: "Verifikation", dd: "janoshik.com" },
    ],
  },
  {
    label: "iii · FREIGABE & VERSAND",
    title: [
      { text: "Eine Charge wird " },
      { text: "erst freigegeben", accent: true },
      { text: ", wenn die Daten es erlauben." },
    ],
    body: [
      {
        text: "≥ 98 % Reinheit, bestätigte Identität. Erst dann verlässt die Charge das Lager. Versand in neutraler, isolierter Verpackung. Das CoA der konkreten Lot-Nummer liegt der Versandbestätigung automatisch bei.",
      },
    ],
    facts: [
      { dt: "Handling", dd: "~24 h" },
      { dt: "Verpackung", dd: "neutral · isoliert" },
      { dt: "Cold-Chain", dd: "EU-weit" },
      { dt: "CoA", dd: "auto · per Order" },
    ],
  },
  {
    label: "iv · WAS WIR NICHT SIND",
    title: [{ text: "Kein Apotheker. Kein Arzt. Kein Wundermittel­verkäufer." }],
    body: [
      {
        text: "ChromePeps liefert Material der Klasse ",
      },
      { text: "Research Use Only", bold: true },
      {
        text: ". Wir geben keine medizinische Beratung, keine Dosierungs­empfehlungen, keine Heilversprechen. Unsere Kunden wissen, wozu HPLC-Daten da sind: für die Wissenschaft, nicht für Werbung.",
      },
    ],
    facts: [
      { dt: "Klasse", dd: "RUO" },
      { dt: "Beratung", dd: "technisch" },
      { dt: "Datenschutz", dd: "DSGVO · cookieless" },
      { dt: "Sitz", dd: "BaWü, DE" },
    ],
  },
];

/** Prozess-Schritte (dunkle Sektion). `icon` → lucide-Komponente in Prozess.tsx gemappt. */
export interface ProzessStep {
  icon: "package" | "microscope" | "shield" | "mail";
  title: string;
  body: string;
  tags: Array<{ text: string; pass?: boolean }>;
}

export const PROZESS_STEPS: ProzessStep[] = [
  {
    icon: "package",
    title: "Eingang & Lot-Anlage",
    body: "Charge entgegen genommen, mit Lot-ID versehen und in den isolierten Kühlschrank eingelagert.",
    tags: [{ text: "≤ 60 min" }, { text: "ISOLIERT" }, { text: "Lot-ID" }],
  },
  {
    icon: "microscope",
    title: "Janoshik HPLC-Analyse",
    body: "Versiegelte Probe geht an Janoshik Analytical. RP-HPLC bestimmt Reinheit, ESI-MS bestätigt Identität gegen Referenz.",
    tags: [{ text: "RP-HPLC" }, { text: "ESI-MS" }, { text: "3rd party" }],
  },
  {
    icon: "shield",
    title: "Freigabe oder Reject",
    body: "≥ 98 % Reinheit + bestätigte Identität = Freigabe. Bei Abweichung wird die Charge zurückgewiesen, nicht „angepasst“.",
    tags: [{ text: "PASS ≥ 98 %", pass: true }, { text: "binary" }],
  },
  {
    icon: "mail",
    title: "Versand mit CoA",
    body: "Neutrale, isolierte Verpackung. Das CoA der konkreten Lot-Nummer kommt automatisch mit der Versandbestätigung.",
    tags: [{ text: "24 h Handling" }, { text: "CoA · auto" }, { text: "EU-weit" }],
  },
];

/** Kennzahlen (helle Sektion). `value: null` → Live-Wert wird in page.tsx eingesetzt. */
export interface Metric {
  fig: string;
  /** "avgPurity" | "chargenCount" → Live-Wert; sonst fester Zahlenwert. */
  source: "avgPurity" | "chargenCount" | number;
  decimals: number;
  suffix?: string;
  label: string;
  desc: string;
}

export const METRICS: Metric[] = [
  { fig: "fig. 5.1", source: "avgPurity", decimals: 2, suffix: "%", label: "Ø HPLC-Reinheit", desc: "12-Monats-Mittel · alle Janoshik-getesteten Chargen" },
  { fig: "fig. 5.2", source: "chargenCount", decimals: 0, label: "Chargen freigegeben", desc: "seit Gründung · Stand Mai 2026" },
  { fig: "fig. 5.3", source: 7, decimals: 0, suffix: "%", label: "Reject-Rate", desc: "zurückgewiesen, nicht „angepasst“" },
  { fig: "fig. 5.4", source: 22, decimals: 0, suffix: "h", label: "Ø Handling-Zeit", desc: "Bestelleingang → Versand" },
  { fig: "fig. 5.5", source: 0, decimals: 0, label: "Re-Calls", desc: "Charge je zurückgerufen: nein." },
  { fig: "fig. 5.6", source: 100, decimals: 0, suffix: "%", label: "CoA-Coverage", desc: "jede Bestellung · automatisch" },
];

/** Roadmap-Zeilen. */
export interface RoadmapRow {
  quarter: string;
  title: string;
  desc: string;
  status: string;
  state: "done" | "current" | "future";
}

export const ROADMAP_ROWS: RoadmapRow[] = [
  { quarter: "Q2 · 2026", title: "Gründung & erstes Sortiment", desc: "UG-Gründung in BaWü. Vier Kern-Peptide gelistet. Erster Janoshik-Vertrag.", status: "erledigt ✓", state: "done" },
  { quarter: "Q2 · 2026", title: "Lot-Tracking-System", desc: "Eigenes Tooling: Lot-ID, CoA-Mapping, automatisierter CoA-Versand pro Bestellung.", status: "erledigt ✓", state: "done" },
  { quarter: "Q2 · 2026", title: "Cold-Chain & EU-Versand", desc: "Isolierte Verpackung, ~24 h Handling, Versand in DE und ausgewählten EU-Ländern.", status: "erledigt ✓", state: "done" },
  { quarter: "Q4 · 2026", title: "Öffentliche CoA-Datenbank", desc: "Jede freigegebene Lot-Nummer ist auf chromepeps.com direkt verlinkbar, ohne Bestellung, ohne Login.", status: "in Arbeit ●", state: "current" },
  { quarter: "Q1 · 2027", title: "Endotoxin-Routine-Testing", desc: "LAL-Test zusätzlich zur HPLC für jede sensible Charge. Standard wird angehoben.", status: "geplant", state: "future" },
  { quarter: "Q3 · 2027", title: "ISO-9001 Pilot", desc: "Vorbereitung der Qualitäts­management-Zertifizierung für den UG-Standort.", status: "geplant", state: "future" },
];

/** Kontakt-Firmendaten (Reihenfolge wie im Original). Die "TODO:self"-Werte
 *  für USt-ID/HR sind nur Marker — Kontakt.tsx (Server-Component) ersetzt sie
 *  beim Rendern durch SELLER_DETAILS (env-basiert). Nicht hier importieren:
 *  data.ts wird auch von Client-Komponenten geladen, wo SELLER_*-Env fehlt. */
export const KONTAKT_FACTS: ReadonlyArray<[string, string]> = [
  ["Rechtsträger", "ChromePeps UG (haftungsbeschränkt)"],
  ["Sitz", "Baden-Württemberg, DE"],
  ["USt-ID", "TODO:self"],
  ["HR", "TODO:self"],
  ["Analytik", "Janoshik Analytical s.r.o."],
  ["Versand", "DHL · EU-weit"],
  ["Klasse", "Research Use Only"],
];

export const SUPPORT_EMAIL = "support@chromepeps.com";
