import type { Metadata } from "next";
import { DM_Sans, Comfortaa, DM_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { organizationJsonLd, websiteJsonLd } from "@/lib/json-ld";
import "./globals.css";

// === Schrift-Stack: „Soft Bio-Pharma"-Palette ===
// User-Auswahl aus dem Vergleichs-Tool /fonts-demo (Palette 06).
// Semantische CSS-Variablen-Namen damit zukünftige Wechsel ohne
// Search-and-Replace gehen. Tailwind exposed sie via theme.fontFamily.
//
// dmSans     → UI / Body (default)
// comfortaa  → Display / Headlines (rounded, freundlich, pharma-modern)
// dmMono     → Lab-Cert / Code / Mono-Labels

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const comfortaa = Comfortaa({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["300", "400", "500"],
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
  alternates: {
    canonical: "/",
  },
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
        {/* Plausible Analytics — cookieless, DSGVO-konform, no consent needed */}
        <script
          defer
          data-domain="chromepeps.com"
          src="https://analytics.chromepeps.com/js/script.js"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${comfortaa.variable} ${dmMono.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
