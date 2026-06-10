import type { Metadata } from "next";

// page.tsx ist eine Client-Component ("use client") und kann daher kein
// Metadata exportieren — Title/Robots leben deshalb in diesem minimalen
// Segment-Layout (Server-Component). Funktionsseite mit Query-Params
// (orderNumber/email) → noindex, damit keine personalisierten URLs im
// Google-Index landen.
export const metadata: Metadata = {
  title: "Bestellstatus",
  description:
    "Bestellstatus abfragen: Mit Bestellnummer und E-Mail-Adresse den aktuellen Stand Ihrer ChromePeps-Bestellung verfolgen.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/order-status" },
};

export default function OrderStatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
