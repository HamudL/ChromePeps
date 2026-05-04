import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Konto erstellen | ChromePeps",
  description:
    "Konto bei ChromePeps anlegen — Forschungs-Erklärung beim Checkout, COA-Archiv pro Bestellung, Bestellverfolgung im Dashboard.",
  // Register-Pages NICHT in Suchmaschinen — User landen über das Login-
  // oder Checkout-CTA, nicht über Google. AUDIT_REPORT_v3 §3.7.
  robots: { index: false, follow: false },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
