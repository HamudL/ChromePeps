import type { Metadata } from "next";

export const metadata: Metadata = {
  // Kein "| ChromePeps"-Suffix — kommt vom title-Template in (auth)/layout.tsx.
  title: "Neues Passwort setzen",
  description: "Setze dein neues ChromePeps-Passwort.",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
