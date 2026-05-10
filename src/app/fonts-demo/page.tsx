/**
 * Fonts-Demo-Page — interner Vergleich verschiedener Schrift-Paletten
 * für die Marken-Auswahl. 6 Paletten gestackt, jede zeigt Hero,
 * Produkt-Karte, Wissen-Artikel, Lab-Cert-Block und Buttons in
 * realistischem ChromePeps-Inhalt.
 *
 * Nicht im Sitemap, noindex via Layout. URL: /fonts-demo
 */

import type { CSSProperties } from "react";

interface Palette {
  id: string;
  name: string;
  tagline: string;
  /** Sans-Stack für Body/UI/Labels */
  sans: string;
  /** Serif/Display-Stack für Headlines */
  display: string;
  /** Monospace-Stack für Lab-Cert / Code */
  mono: string;
  /** Welche Google-Fonts kombiniert werden (für Anzeige im Header) */
  fonts: { sans: string; display: string; mono: string };
  /** Optional: Display-Style abweichend (italic / weight) */
  displayStyle?: CSSProperties;
}

const PALETTES: Palette[] = [
  {
    id: "klassik",
    name: "Apotheke Klassik",
    tagline: "Aktueller Stack — pharmazeutisch, editorial, mit italic accent",
    sans: "var(--font-geist-sans), system-ui, sans-serif",
    display: "var(--font-demo-fraunces), serif",
    mono: "var(--font-demo-jetbrains-mono), monospace",
    fonts: {
      sans: "Geist",
      display: "Fraunces (variable, italic accent)",
      mono: "JetBrains Mono",
    },
    displayStyle: { fontStyle: "italic" },
  },
  {
    id: "modern",
    name: "Lab Modern",
    tagline: "Sachlicher, neutraler Sans + warme Serif für Lesetexte",
    sans: "var(--font-demo-inter), system-ui, sans-serif",
    display: "var(--font-demo-newsreader), serif",
    mono: "var(--font-demo-jetbrains-mono), monospace",
    fonts: {
      sans: "Inter",
      display: "Newsreader (literary serif)",
      mono: "JetBrains Mono",
    },
  },
  {
    id: "academic",
    name: "Academic Press",
    tagline: "Wie ein Forschungs-Journal — klassisch, lesbar, autoritativ",
    sans: "var(--font-demo-inter), system-ui, sans-serif",
    display: "var(--font-demo-eb-garamond), serif",
    mono: "var(--font-demo-ibm-plex-mono), monospace",
    fonts: {
      sans: "Inter",
      display: "EB Garamond",
      mono: "IBM Plex Mono",
    },
  },
  {
    id: "industrial",
    name: "Industrial Tech",
    tagline: "Geometrisch, technisch, an Lab-Equipment-UIs angelehnt",
    sans: "var(--font-demo-space-grotesk), sans-serif",
    display: "var(--font-demo-space-grotesk), sans-serif",
    mono: "var(--font-demo-space-mono), monospace",
    fonts: {
      sans: "Space Grotesk",
      display: "Space Grotesk (Bold)",
      mono: "Space Mono",
    },
    displayStyle: { fontWeight: 700 },
  },
  {
    id: "premium",
    name: "Premium Editorial",
    tagline: "Sanftere geometrische Sans + Display-Serif — Magazin-Look",
    sans: "var(--font-demo-manrope), sans-serif",
    display: "var(--font-demo-fraunces), serif",
    mono: "var(--font-demo-jetbrains-mono), monospace",
    fonts: {
      sans: "Manrope",
      display: "Fraunces (variable, regular)",
      mono: "JetBrains Mono",
    },
  },
  {
    id: "soft-bio",
    name: "Soft Bio-Pharma",
    tagline: "Rounded Display + freundlicher Sans — moderne Pharma-Brands",
    sans: "var(--font-demo-dm-sans), sans-serif",
    display: "var(--font-demo-comfortaa), sans-serif",
    mono: "var(--font-demo-dm-mono), monospace",
    fonts: {
      sans: "DM Sans",
      display: "Comfortaa (rounded)",
      mono: "DM Mono",
    },
  },
  {
    id: "brutal",
    name: "Brutal Editorial",
    tagline: "Mutige Display-Serif/Grotesque + monochrom-Mono",
    sans: "var(--font-geist-sans), system-ui, sans-serif",
    display: "var(--font-demo-bricolage), sans-serif",
    mono: "var(--font-geist-mono), monospace",
    fonts: {
      sans: "Geist",
      display: "Bricolage Grotesque",
      mono: "Geist Mono",
    },
    displayStyle: { fontWeight: 700 },
  },
];

const COLORS = {
  bg: "#f5f3ee",
  ink: "#0a0a0c",
  inkSoft: "rgba(10,10,12,0.65)",
  inkMuted: "rgba(10,10,12,0.4)",
  gold: "#b89244",
  goldLight: "#d6a854",
  border: "rgba(10,10,12,0.08)",
  dark: "#08080a",
  darkSoft: "#1a1b20",
};

export default function FontsDemoPage() {
  return (
    <main style={{ paddingBottom: 120 }}>
      <PageHeader />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {PALETTES.map((p, i) => (
          <PaletteSection key={p.id} palette={p} index={i + 1} />
        ))}
      </div>
      <Footer />
    </main>
  );
}

// ============================================================
// Header / Intro
// ============================================================

function PageHeader() {
  return (
    <header
      style={{
        backgroundColor: COLORS.dark,
        color: COLORS.bg,
        padding: "80px 64px 64px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "var(--font-demo-jetbrains-mono), monospace",
            fontSize: 12,
            letterSpacing: 3,
            opacity: 0.6,
            marginBottom: 20,
          }}
        >
          INTERNAL TOOL · FONTS-DEMO
        </div>
        <h1
          style={{
            fontFamily: "var(--font-demo-fraunces), serif",
            fontSize: 64,
            lineHeight: 1.05,
            margin: 0,
            fontWeight: 400,
            fontStyle: "italic",
          }}
        >
          Schrift-Paletten zur Auswahl
        </h1>
        <p
          style={{
            fontFamily: "var(--font-demo-inter), system-ui, sans-serif",
            fontSize: 18,
            lineHeight: 1.5,
            maxWidth: 720,
            marginTop: 24,
            opacity: 0.85,
          }}
        >
          7 Kombinationen von Sans / Display / Mono, jede mit identischem
          ChromePeps-Inhalt: Hero, Produkt-Karte, Wissen-Artikel-Auszug,
          Lab-Cert-Block und Buttons. Scroll dich durch und sag welche du
          willst — ich migrier den globalen Stack.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 36,
            flexWrap: "wrap",
            fontFamily: "var(--font-demo-jetbrains-mono), monospace",
            fontSize: 11,
            opacity: 0.7,
          }}
        >
          {PALETTES.map((p, i) => (
            <a
              key={p.id}
              href={`#palette-${p.id}`}
              style={{
                padding: "6px 12px",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 4,
                color: COLORS.bg,
                textDecoration: "none",
                letterSpacing: 1,
              }}
            >
              {String(i + 1).padStart(2, "0")} · {p.name.toUpperCase()}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}

// ============================================================
// Eine Palette: Header + Demo-Komposition
// ============================================================

function PaletteSection({
  palette,
  index,
}: {
  palette: Palette;
  index: number;
}) {
  return (
    <section
      id={`palette-${palette.id}`}
      style={{
        borderTop: `1px solid ${COLORS.border}`,
        padding: "72px 64px",
        backgroundColor: COLORS.bg,
        scrollMarginTop: 24,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Section header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 48,
            paddingBottom: 24,
            borderBottom: `1px solid ${COLORS.border}`,
            fontFamily: "var(--font-demo-jetbrains-mono), monospace",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 3,
                color: COLORS.inkMuted,
                marginBottom: 8,
              }}
            >
              PALETTE {String(index).padStart(2, "0")}
            </div>
            <div
              style={{
                fontSize: 28,
                fontFamily: palette.display,
                fontWeight: 600,
                color: COLORS.ink,
                ...palette.displayStyle,
              }}
            >
              {palette.name}
            </div>
            <div
              style={{
                fontFamily: palette.sans,
                fontSize: 14,
                color: COLORS.inkSoft,
                marginTop: 6,
              }}
            >
              {palette.tagline}
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: COLORS.inkSoft,
              textAlign: "right",
              minWidth: 240,
            }}
          >
            <div>
              <span style={{ color: COLORS.inkMuted }}>SANS · </span>
              {palette.fonts.sans}
            </div>
            <div>
              <span style={{ color: COLORS.inkMuted }}>DISPLAY · </span>
              {palette.fonts.display}
            </div>
            <div>
              <span style={{ color: COLORS.inkMuted }}>MONO · </span>
              {palette.fonts.mono}
            </div>
          </div>
        </div>

        {/* Demo-Grid: zwei Spalten — links Hero+Wissen, rechts Produkt+Buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 48,
          }}
        >
          {/* Linke Spalte */}
          <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
            <HeroBlock palette={palette} />
            <WissenBlock palette={palette} />
          </div>

          {/* Rechte Spalte */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <ProductCard palette={palette} />
            <UIBlock palette={palette} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// Demo-Bausteine
// ============================================================

function HeroBlock({ palette }: { palette: Palette }) {
  return (
    <div>
      <div
        style={{
          fontFamily: palette.mono,
          fontSize: 11,
          letterSpacing: 3,
          color: COLORS.gold,
          marginBottom: 16,
        }}
      >
        ◆ FORSCHUNGS-PEPTIDE · ANALYTISCH GEPRÜFT
      </div>
      <h2
        style={{
          fontFamily: palette.display,
          fontSize: 72,
          lineHeight: 1.02,
          margin: 0,
          color: COLORS.ink,
          fontWeight: 400,
          ...palette.displayStyle,
        }}
      >
        Peptide für die nächste Generation der Forschung
      </h2>
      <p
        style={{
          fontFamily: palette.sans,
          fontSize: 18,
          lineHeight: 1.55,
          color: COLORS.inkSoft,
          marginTop: 24,
          marginBottom: 0,
          maxWidth: 580,
        }}
      >
        Jede Charge HPLC-getestet bei ≥ 98 % Reinheit, jede CoA öffentlich
        verifizierbar. EU-Versand 24–48h, Bezahlung via Stripe oder
        Vorkasse.
      </p>
    </div>
  );
}

function WissenBlock({ palette }: { palette: Palette }) {
  return (
    <article
      style={{
        borderTop: `1px solid ${COLORS.border}`,
        paddingTop: 32,
      }}
    >
      <div
        style={{
          fontFamily: palette.mono,
          fontSize: 10,
          letterSpacing: 2.5,
          color: COLORS.inkMuted,
          marginBottom: 12,
        }}
      >
        WISSEN · METHODIK · 12 MIN LESEZEIT
      </div>
      <h3
        style={{
          fontFamily: palette.display,
          fontSize: 38,
          lineHeight: 1.15,
          margin: 0,
          color: COLORS.ink,
          fontWeight: 400,
          ...palette.displayStyle,
        }}
      >
        HPLC-Reinheitsanalyse: wie wir Peptide auf 98 %+ testen
      </h3>
      <p
        style={{
          fontFamily: palette.sans,
          fontSize: 16,
          lineHeight: 1.7,
          color: COLORS.inkSoft,
          marginTop: 20,
          marginBottom: 16,
        }}
      >
        Reinheit ist bei Forschungspeptiden kein Marketing-Wert — sie ist
        die Voraussetzung dafür, dass ein In-vitro-Experiment überhaupt
        interpretierbar bleibt. Eine 92-%-Charge enthält nicht bloss eine
        andere Konzentration: sie enthält 8 % Verunreinigungen, deren
        biologische Aktivität in der Regel nicht charakterisiert ist.
      </p>
      <pre
        style={{
          fontFamily: palette.mono,
          fontSize: 13,
          lineHeight: 1.6,
          color: COLORS.ink,
          backgroundColor: "rgba(10,10,12,0.04)",
          padding: 16,
          borderRadius: 4,
          margin: "16px 0",
          overflowX: "auto",
        }}
      >
{`reinheit_% = (A_haupt / Σ A_alle) × 100

# Beispiel Lot CS-tz5-0118:
# A_haupt = 4 218 421
# Σ A_alle = 4 252 612
# → 4 218 421 / 4 252 612 × 100 = 99,20 %`}
      </pre>
      <p
        style={{
          fontFamily: palette.sans,
          fontSize: 16,
          lineHeight: 1.7,
          color: COLORS.inkSoft,
          margin: 0,
        }}
      >
        Wir laufen jede Charge <em style={{ ...palette.displayStyle, fontFamily: palette.display, fontSize: "1.05em" }}>doppelt</em> —
        einmal bei Eingang, ein zweites Mal nach 30 Tagen Lagerung bei
        −24 °C, um Zerfallsdrift früh zu erkennen.
      </p>
    </article>
  );
}

function ProductCard({ palette }: { palette: Palette }) {
  return (
    <div
      style={{
        backgroundColor: COLORS.dark,
        color: COLORS.bg,
        padding: 32,
        borderRadius: 4,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: palette.mono,
            fontSize: 10,
            letterSpacing: 2.5,
            color: "rgba(245,243,238,0.5)",
          }}
        >
          METABOLIC RESEARCH
        </div>
        <div
          style={{
            fontFamily: palette.mono,
            fontSize: 10,
            letterSpacing: 2,
            color: COLORS.goldLight,
          }}
        >
          ◆ CERTIFIED
        </div>
      </div>

      <h4
        style={{
          fontFamily: palette.display,
          fontSize: 56,
          lineHeight: 1,
          margin: 0,
          color: COLORS.bg,
          fontWeight: 400,
          ...palette.displayStyle,
        }}
      >
        Tirzepatide
      </h4>
      <div
        style={{
          fontFamily: palette.sans,
          fontSize: 14,
          lineHeight: 1.5,
          color: "rgba(245,243,238,0.55)",
          marginTop: 12,
        }}
      >
        Dual GIP/GLP-1-Rezeptoragonist · 39 Aminosäuren ·
        Lipidiert für verlängerte Halbwertszeit
      </div>

      <div
        style={{
          fontFamily: palette.display,
          fontSize: 32,
          color: COLORS.goldLight,
          marginTop: 24,
          fontStyle: palette.id === "klassik" ? "italic" : "normal",
          fontWeight: palette.id === "industrial" ? 700 : 400,
        }}
      >
        39,99 €
      </div>

      {/* Lab-Cert-Block */}
      <div
        style={{
          marginTop: 28,
          paddingTop: 20,
          borderTop: "1px solid rgba(255,255,255,0.1)",
          fontFamily: palette.mono,
          fontSize: 12,
          lineHeight: 2,
        }}
      >
        {[
          ["PURITY", "99,76 % HPLC", false],
          ["SIZE", "10 mg", false],
          ["LOT", "CS-tz5-0118", true],
          ["FORMAT", "Lyophilized · sealed vial", false],
        ].map(([k, v, gold]) => (
          <div
            key={k as string}
            style={{ display: "flex" }}
          >
            <div
              style={{ width: 78, color: "rgba(245,243,238,0.35)" }}
            >
              {k}
            </div>
            <div
              style={{
                color: gold ? COLORS.goldLight : "rgba(245,243,238,0.7)",
              }}
            >
              {v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UIBlock({ palette }: { palette: Palette }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          fontFamily: palette.mono,
          fontSize: 10,
          letterSpacing: 2.5,
          color: COLORS.inkMuted,
        }}
      >
        UI-ELEMENTE
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          style={{
            fontFamily: palette.sans,
            fontSize: 14,
            fontWeight: 600,
            padding: "12px 24px",
            backgroundColor: COLORS.ink,
            color: COLORS.bg,
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            letterSpacing: 0.2,
          }}
        >
          In den Warenkorb
        </button>
        <button
          type="button"
          style={{
            fontFamily: palette.sans,
            fontSize: 14,
            fontWeight: 500,
            padding: "12px 24px",
            backgroundColor: "transparent",
            color: COLORS.ink,
            border: `1px solid ${COLORS.ink}`,
            borderRadius: 4,
            cursor: "pointer",
            letterSpacing: 0.2,
          }}
        >
          CoA herunterladen
        </button>
      </div>

      {/* Form-Input */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginTop: 8,
        }}
      >
        <label
          style={{
            fontFamily: palette.mono,
            fontSize: 10,
            letterSpacing: 2,
            color: COLORS.inkMuted,
          }}
        >
          E-MAIL FÜR LAB-NOTES
        </label>
        <input
          type="email"
          placeholder="forschung@labor.de"
          style={{
            fontFamily: palette.sans,
            fontSize: 15,
            padding: "12px 16px",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 4,
            backgroundColor: "white",
            color: COLORS.ink,
          }}
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginTop: 12,
          borderBottom: `1px solid ${COLORS.border}`,
          fontFamily: palette.sans,
          fontSize: 14,
        }}
      >
        {["Beschreibung", "CoA & Charge", "Versand"].map((t, i) => (
          <div
            key={t}
            style={{
              padding: "12px 20px",
              borderBottom:
                i === 0
                  ? `2px solid ${COLORS.ink}`
                  : "2px solid transparent",
              color: i === 0 ? COLORS.ink : COLORS.inkSoft,
              fontWeight: i === 0 ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Mono Datacode */}
      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          backgroundColor: "rgba(10,10,12,0.04)",
          fontFamily: palette.mono,
          fontSize: 12,
          color: COLORS.inkSoft,
          lineHeight: 1.7,
          borderRadius: 4,
        }}
      >
        $ npx prisma db push --skip-generate
        <br />
        <span style={{ color: COLORS.gold }}>✓</span> migrations applied
        <br />
        <span style={{ color: COLORS.inkMuted }}>
          # CS-tz5-0118 · 99,76 % · 10 mg
        </span>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer
      style={{
        marginTop: 80,
        padding: "32px 64px",
        borderTop: `1px solid ${COLORS.border}`,
        fontFamily: "var(--font-demo-jetbrains-mono), monospace",
        fontSize: 11,
        color: COLORS.inkMuted,
        letterSpacing: 1.5,
      }}
    >
      INTERNAL · FONTS-DEMO · NICHT IM SITEMAP · NOINDEX
    </footer>
  );
}
