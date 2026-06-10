/**
 * Geteilte Typen für die /ueber-uns Sektions-Komponenten.
 *
 * `UeberUnsData` wird in page.tsx aus den Live-COA-Daten der DB abgeleitet
 * (siehe fetchUeberUnsData) und als Props an die Sektionen gereicht; ersetzt
 * die frühere {{PLACEHOLDER}}-String-Ersetzung im injizierten HTML.
 */
export interface UeberUnsData {
  /** Distinct batchNumbers veröffentlichter COAs; oder null (DB-Fehler/leer). */
  chargenCount: number | null;
  /** Ø HPLC-Reinheit über alle veröffentlichten COAs; oder null. */
  avgPurity: number | null;
  /**
   * Showcase-Lot (höchste Reinheit) — oder null, wenn keine veröffentlichte
   * COA existiert. Früher gab es hier erfundene Demo-Fallbacks
   * ("CS-re10-0322" / "99,41" / "22. März 2025"); bei null blenden die
   * Sektionen die betroffene Darstellung aus, statt Messwerte zu faken.
   */
  lotNumber: string | null;
  /** Showcase-Reinheit als DE-Dezimalstring, z. B. "99,41"; oder null. */
  purityComma: string | null;
  /** Showcase-Testdatum, lang formatiert, z. B. "22. März 2025"; oder null. */
  testDate: string | null;
  /** Showcase-Testdatum kompakt für den "PASSED"-Stempel, z. B. "22 · MÄR · 25". */
  testDateStamp: string | null;
}
