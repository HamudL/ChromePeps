import type { Metadata } from "next";
import {
  Inter,
  Manrope,
  DM_Sans,
  Space_Grotesk,
  Bricolage_Grotesque,
  Fraunces,
  EB_Garamond,
  Newsreader,
  Comfortaa,
  JetBrains_Mono,
  IBM_Plex_Mono,
  Space_Mono,
  DM_Mono,
} from "next/font/google";
import type { ReactNode } from "react";

/**
 * Standalone-Layout für /fonts-demo. Lädt alle Demo-Fonts via
 * next/font/google. CSS-Variablen werden auf <body> gesetzt; jede
 * Palette in der Page nutzt ihre eigenen vars.
 *
 * Bewusst KEIN Header/Footer/Provider — diese Page ist ein internes
 * Tool zur Auswahl der Marken-Fonts und soll keine Site-Layout-
 * Inkonsistenzen einbringen.
 *
 * `noindex` damit das Tool nicht in Suchmaschinen landet.
 */

export const metadata: Metadata = {
  title: "Fonts-Demo · ChromePeps Internal",
  description: "Internes Tool zum Vergleich verschiedener Schrift-Paletten.",
  robots: { index: false, follow: false },
};

// ─── Sans ──────────────────────────────────────────────────────
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-demo-inter",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-demo-manrope",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-demo-dm-sans",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-demo-space-grotesk",
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-demo-bricolage",
  display: "swap",
});

// ─── Serif / Display ───────────────────────────────────────────
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-demo-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-demo-eb-garamond",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-demo-newsreader",
  display: "swap",
});
const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-demo-comfortaa",
  display: "swap",
});

// ─── Mono ──────────────────────────────────────────────────────
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-demo-jetbrains-mono",
  display: "swap",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-demo-ibm-plex-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-demo-space-mono",
  weight: ["400", "700"],
  display: "swap",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-demo-dm-mono",
  weight: ["300", "400", "500"],
  display: "swap",
});

const allFontVars = [
  inter.variable,
  manrope.variable,
  dmSans.variable,
  spaceGrotesk.variable,
  bricolage.variable,
  fraunces.variable,
  ebGaramond.variable,
  newsreader.variable,
  comfortaa.variable,
  jetbrainsMono.variable,
  ibmPlexMono.variable,
  spaceMono.variable,
  dmMono.variable,
].join(" ");

export default function FontsDemoLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={allFontVars}
      style={{ minHeight: "100vh", backgroundColor: "#f5f3ee", color: "#0a0a0c" }}
    >
      {children}
    </div>
  );
}
