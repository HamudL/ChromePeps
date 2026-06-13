import { ImageResponse } from "next/og";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

// Dynamic Open Graph image for the homepage / default social share card.
// Next.js will serve this at /opengraph-image and reference it in <meta property="og:image">.
//
// Palette: „Chromatogramm" — kaltes Nachtblau (Ink), ein Viridian-Akzent,
// Serif-Anmutung für die Wortmarke (System-Serif, da Edge-Runtime ohne
// Custom-Font-Loading auskommen soll).

export const runtime = "edge";

export const alt = `${APP_NAME}: Forschungspeptide mit unabhängig geprüfter Reinheit`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const INK = "#0c1220";
const INK_BORDER = "rgba(160, 180, 210, 0.14)";
const FOREGROUND = "#e8edf4";
const MUTED = "#8b94a3";
const VIRIDIAN = "#0e6457";
const MINT = "#46c2a5";
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: `linear-gradient(160deg, #0a0f1b 0%, ${INK} 55%, #101a2c 100%)`,
          color: FOREGROUND,
          fontFamily: SERIF,
          position: "relative",
        }}
      >
        {/* Viridian-Tönung oben links — ruhig, kein Orb-Theater */}
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -120,
            width: 700,
            height: 480,
            display: "flex",
            background:
              "radial-gradient(closest-side, rgba(14, 100, 87, 0.35), rgba(0,0,0,0))",
          }}
        />

        {/* Protokoll-Kopfzeile: Wortmarke + Mono-Tag */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            width: "100%",
            marginBottom: 56,
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: SERIF,
              fontSize: 46,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            {APP_NAME}
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: MONO,
              fontSize: 17,
              letterSpacing: "0.22em",
              color: MINT,
              textTransform: "uppercase",
            }}
          >
            Analyse-Protokoll
          </div>
        </div>

        {/* Mess-Lineal: Haarlinie mit Ticks — Signatur-Detail */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 10,
            marginBottom: 56,
            backgroundImage: `linear-gradient(to right, ${INK_BORDER}, ${INK_BORDER}), repeating-linear-gradient(90deg, rgba(139,148,163,0.5) 0 2px, transparent 2px 40px)`,
            backgroundSize: "100% 2px, 100% 10px",
            backgroundPosition: "bottom left, bottom left",
            backgroundRepeat: "no-repeat, repeat-x",
          }}
        />

        {/* Headline — Serif, mit Viridian-Akzentwort */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            fontSize: 82,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1.08,
            marginBottom: 28,
            maxWidth: 1000,
          }}
        >
          <span>Forschungspeptide,&nbsp;</span>
          <span style={{ color: MINT, fontStyle: "italic" }}>
            HPLC-geprüft.
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            fontFamily: "system-ui, sans-serif",
            fontSize: 28,
            fontWeight: 400,
            color: MUTED,
            lineHeight: 1.4,
            maxWidth: 880,
          }}
        >
          {APP_DESCRIPTION}
        </div>

        {/* Fußzeile: Mono-Metadaten */}
        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            bottom: 56,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: MONO,
            fontSize: 16,
            letterSpacing: "0.18em",
            color: MUTED,
            textTransform: "uppercase",
            borderTop: `1px solid ${INK_BORDER}`,
            paddingTop: 24,
          }}
        >
          <span>Research Use Only</span>
          <span>3rd-Party verifiziert</span>
        </div>

        {/* Akzentkante unten — Viridian-Haarlinie */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 8,
            display: "flex",
            background: `linear-gradient(90deg, ${VIRIDIAN} 0%, ${MINT} 35%, ${VIRIDIAN} 100%)`,
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
