import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Animations Demo",
  description: "Interne Vorschau interaktiver Effekte",
  robots: { index: false, follow: false },
};

export default function AnimationsDemoLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
