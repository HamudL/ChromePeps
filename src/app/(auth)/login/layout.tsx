import type { Metadata } from "next";

export const metadata: Metadata = {
  // Kein "| ChromePeps"-Suffix — kommt vom title-Template in (auth)/layout.tsx.
  title: "Anmelden",
  description:
    "Mit deinem ChromePeps-Konto anmelden — Bestellverlauf, gespeicherte Adressen, COA-Archiv.",
  // Login-Pages NICHT in Suchmaschinen indexieren — kein Seo-Wert,
  // kein Crawling-Trash. AUDIT_REPORT_v3 §3.7.
  robots: { index: false, follow: false },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
