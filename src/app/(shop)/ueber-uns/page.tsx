import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";
import { UeberUnsInteractions } from "./interactions";
import { DESIGN_BODY_HTML } from "./design-body";
import "./ueber-uns.css";

/**
 * /ueber-uns — Über uns
 *
 * Phase-1-Integration des Claude-Design-Handoff
 * ("Über uns-handoff.zip"). Strategie:
 *
 *   - Design-HTML steckt 1:1 in design-body.ts und wird per
 *     dangerouslySetInnerHTML in einen .ueber-uns-design Wrapper
 *     injected. Das HTML manuell zu JSX zu konvertieren wäre 500+
 *     Zeilen Mechanik und fehleranfällig — der Wrapper plus CSS-
 *     Scoping isolieren die Design-Styles vom Rest der App.
 *   - CSS (ueber-uns.css) ist auto-scoped auf .ueber-uns-design (siehe
 *     dortigen Header-Kommentar). Dadurch leaken die :root-Variables
 *     und body/html-Resets nicht in andere Seiten.
 *   - JS (interactions.tsx) ist ein Client-Component, das nach Mount
 *     die Reveal-Observer, Scroll-Progress, Hero-Parallax, sticky
 *     Story, Count-up, Magnetic Buttons und HPLC-Animation einrichtet
 *     und auf Unmount sauber wieder abräumt.
 *
 * Phase-1-Scope:
 *   - Statisches Rendering der Design-Sections, exakt wie im Handoff
 *   - Vial-Frames aus dem Handoff-ZIP (36× WebP) liegen unter
 *     /ueber-uns/vial/ — werden in Phase 3 ggf. neu gerendert
 *   - TODO/TODO:self-Marker im Design bleiben sichtbar, werden in
 *     Phase 2 mit echten Daten / Eigentümer-Markierung ersetzt
 *   - Site-Header und Site-Footer aus dem (shop)-Layout bleiben aktiv;
 *     der Design-eigene Footer wurde entfernt, die Design-Nav
 *     bleibt als Section-Sub-Nav für diese lange Seite drin
 */

export const metadata: Metadata = {
  title: `Über uns — ${APP_NAME}`,
  description: `${APP_NAME} ist ein deutsches Labor-Supply für Forschungspeptide. Jede Charge wird durch Janoshik Labs per HPLC analysiert, bevor sie das Lager verlässt.`,
  robots: { index: true, follow: true },
};

export default function UeberUnsPage() {
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
        // Scoped CSS-Wrapper. dangerouslySetInnerHTML ist hier sicher,
        // weil das HTML aus dem statischen Design-Bundle kommt (kein
        // User-Input, kein dynamischer Content).
        dangerouslySetInnerHTML={{ __html: DESIGN_BODY_HTML }}
      />

      <UeberUnsInteractions />
    </>
  );
}
