import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Passwort vergessen | ChromePeps",
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
