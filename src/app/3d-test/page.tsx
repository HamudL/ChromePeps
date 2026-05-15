"use client";

import { ProductVialTurntable } from "@/components/shop/product-vial-turntable";

/**
 * /3d-test — Render-Check des 360°-Turntable-Viewers.
 *
 * Zeigt das Vial groß und allein, ohne Produkt-Page-Kontext. Wenn das
 * hier rendert + dreht + draggbar ist, kann der Turntable sicher in
 * die ImageGallery der Produkt-Detailseiten eingebaut werden.
 *
 * Die Komponente nutzt 36 pre-rendered Cycles-Frames statt Echtzeit-3D
 * — Photo-Qualität, dafür nur Z-Achsen-Rotation (kein Tilt/Zoom).
 */

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
          Turntable-Vial — Render-Check
        </h1>
        <p style={{ fontSize: 14, opacity: 0.6, marginTop: 8 }}>
          Drag horizontal zum Drehen. 36 pre-rendered Cycles-Frames,
          Photo-Qualität. Idle dreht sich auto.
        </p>
      </div>

      {/* Turntable-Bühne — quadratisch, mit Rahmen. Heller Hintergrund
          weil die Frames transparenten BG haben und das Vial dunkel
          ist — auf hell hebt es sich ab. */}
      <div
        style={{
          position: "relative",
          width: "min(640px, 90vw)",
          aspectRatio: "1 / 1",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          overflow: "hidden",
          background: "#eef0f2",
        }}
      >
        <ProductVialTurntable alt="ChromePeps Retatrutide 10mg Vial — drehen per Drag" />
      </div>

      <div
        style={{
          fontFamily: "monospace",
          fontSize: 11,
          opacity: 0.4,
          letterSpacing: 1,
        }}
      >
        public/3d/vial-turntable/ · 36 frames · ~1.1 MB · WebP
      </div>
    </main>
  );
}
