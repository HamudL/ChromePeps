import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neues Passwort setzen | ChromePeps",
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
