import type { Metadata } from "next";

export const metadata: Metadata = {
  // Kein "| ChromePeps"-Suffix — kommt vom title-Template in (auth)/layout.tsx.
  title: "Passwort vergessen",
  description:
    "Passwort zurücksetzen — wir schicken dir einen Reset-Link per E-Mail.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
