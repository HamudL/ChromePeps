import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Isolierte Test-Route /3d-test — nur zum Verifizieren dass das
 * GLB-Vial-Modell mit react-three-fiber auf Production initialisiert,
 * BEVOR es in die Produkt-Detail-Page eingebaut wird.
 *
 * Standalone-Layout ohne Header/Footer/Provider. noindex + in
 * robots.ts disallow.
 */

export const metadata: Metadata = {
  title: "3D-Test · ChromePeps Internal",
  description: "Internes Tool: 3D-Vial-Modell-Rendering verifizieren.",
  robots: { index: false, follow: false },
};

export default function ThreeDTestLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0c",
        color: "#f5f3ee",
      }}
    >
      {children}
    </div>
  );
}
