import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { organizationJsonLd, websiteJsonLd, safeJsonLd } from "@/lib/json-ld";
import "./globals.css";

// === Schrift-Stack: „Chromatogramm" ===
// Semantische CSS-Variablen-Namen damit zukünftige Wechsel ohne
// Search-and-Replace gehen. Tailwind exposed sie via theme.fontFamily.
//
// instrumentSans → UI / Body (präzise Grotesk, default)
// fraunces       → Display / Headlines (Serif mit optischer Größe + echter Kursive)
// ibmPlexMono    → Messdaten / Lot-Nummern / Mono-Labels

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "research peptides",
    "laboratory supplies",
    "in-vitro research",
    "peptide synthesis",
    "research chemicals",
    "Forschungspeptide",
    "Laborbedarf",
  ],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // KEIN globales alternates.canonical hier! Metadata wird in Next.js
  // vererbt — ein canonical "/" im Root-Layout würde JEDE Seite ohne
  // eigenes alternates auf die Startseite kanonisieren (Deindexierungs-
  // Risiko). Canonicals werden pro Seite gesetzt; relative Pfade lösen
  // gegen metadataBase auf.
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: BASE_URL,
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = organizationJsonLd();
  const websiteSchema = websiteJsonLd();

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Dark-Mode: setzt .dark VOR First Paint (kein FOUC). Default Light —
            .dark nur wenn der Nutzer es per Toggle gewählt hat (localStorage). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')==='dark'){document.documentElement.classList.add('dark')}}catch(e){}",
          }}
        />
        {/* Plausible Analytics — cookieless, DSGVO-konform, no consent needed */}
        <script
          defer
          data-domain="chromepeps.com"
          src="https://analytics.chromepeps.com/js/script.js"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteSchema) }}
        />
      </head>
      <body
        className={`${instrumentSans.variable} ${fraunces.variable} ${ibmPlexMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
