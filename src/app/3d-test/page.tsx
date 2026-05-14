"use client";

import dynamic from "next/dynamic";

/**
 * /3d-test — isolierter Render-Test des GLB-Vial-Modells.
 *
 * Zeigt das 3D-Vial groß und allein, ohne Produkt-Page-Kontext.
 * Wenn das hier rendert + drehbar ist, kann das Modell sicher in
 * die ImageGallery eingebaut werden.
 *
 * Bewusst: kein Lazy-Wrapper hier, sondern direkt dynamic({ ssr:false })
 * damit der Test so nah wie möglich am echten Render-Pfad ist.
 */

const Product3DVial = dynamic(
  () =>
    import("@/components/shop/product-3d-vial").then((m) => ({
      default: m.Product3DVial,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontFamily: "monospace",
          fontSize: 13,
          color: "rgba(245,243,238,0.5)",
        }}
      >
        Lade 3D-Modell …
      </div>
    ),
  },
);

export default function ThreeDTestPage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px",
        gap: 24,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 11,
            letterSpacing: 3,
            opacity: 0.5,
          }}
        >
          INTERNAL · 3D-TEST
        </div>
        <h1 style={{ fontSize: 28, margin: "8px 0 0", fontWeight: 600 }}>
          GLB-Vial-Modell — Render-Check
        </h1>
        <p style={{ fontSize: 14, opacity: 0.6, marginTop: 8 }}>
          Drag zum Drehen. Wenn das Modell hier rendert + sich dreht,
          ist es production-ready für die Produkt-Seiten.
        </p>
      </div>

      {/* 3D-Canvas-Bühne — quadratisch, mit Rahmen */}
      <div
        style={{
          position: "relative",
          width: "min(640px, 90vw)",
          aspectRatio: "1 / 1",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Product3DVial />
      </div>

      <div
        style={{
          fontFamily: "monospace",
          fontSize: 11,
          opacity: 0.4,
          letterSpacing: 1,
        }}
      >
        public/3d/vial.glb · 6 meshes · ~2.5 MB
      </div>
    </main>
  );
}
