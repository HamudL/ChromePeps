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
  /** Showcase-Lot (höchste Reinheit) bzw. konsistenter Demo-Wert. */
  lotNumber: string;
  /** Showcase-Reinheit als DE-Dezimalstring, z. B. "99,41". */
  purityComma: string;
  /** Showcase-Testdatum, lang formatiert, z. B. "22. März 2025". */
  testDate: string;
}
