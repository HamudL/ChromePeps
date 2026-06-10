import type { Metadata } from "next";

// page.tsx ist eine Client-Component ("use client") und kann daher kein
// Metadata exportieren — das Canonical/Title lebt deshalb in diesem
// minimalen Segment-Layout (Server-Component).
export const metadata: Metadata = {
  title: "Warenkorb",
  description:
    "Ihr Warenkorb bei ChromePeps: Artikel prüfen, Mengen anpassen und zur Kasse gehen.",
  alternates: { canonical: "/cart" },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
