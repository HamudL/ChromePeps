import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { APP_NAME } from "@/lib/constants";

// Inline formatPrice — can't import from @/lib/utils because it pulls in
// Node.js `crypto` which isn't available in the Edge runtime.
function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export const runtime = "edge";

export const alt = "ChromePeps Produkt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function ProductOGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug, isActive: true },
    select: {
      name: true,
      priceInCents: true,
      purity: true,
      weight: true,
      category: { select: { name: true } },
      // Aktuelle COA-Charge mit ins OG-Bild — Audit v3 §4.11 wollte
      // "Reinheit + Charge im Bild" für höhere Click-Through aus
      // WhatsApp/Reddit. Wir nehmen die neueste publizierte Charge.
      certificates: {
        where: { isPublished: true },
        orderBy: { testDate: "desc" },
        take: 1,
        select: { batchNumber: true, purity: true },
      },
    },
  });

  if (!product) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            color: "#fff",
            fontSize: 48,
            fontFamily: "sans-serif",
          }}
        >
          {APP_NAME}
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 45%, #3a3a3a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top: Logo + Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background:
                "linear-gradient(135deg, #2a2a2a 0%, #5a5a5a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              fontWeight: 900,
              letterSpacing: "-0.05em",
            }}
          >
            C
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            {APP_NAME}
          </div>
        </div>

        {/* Middle: Product Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Category */}
          <div
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: "#a0a0a0",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            {product.category.name}
          </div>

          {/* Product Name */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              maxWidth: 900,
            }}
          >
            {product.name}
          </div>

          {/* Details Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
              marginTop: 8,
            }}
          >
            {/* Price */}
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              {formatPrice(product.priceInCents)}
            </div>

            {/* Purity (bevorzugt aus neuester COA, sonst Produkt-Feld) */}
            {(product.certificates[0]?.purity ?? null) !== null ? (
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 500,
                  color: "#a0a0a0",
                  padding: "6px 16px",
                  border: "2px solid #444",
                  borderRadius: 8,
                }}
              >
                {product.certificates[0]!.purity!.toFixed(2)}% HPLC
              </div>
            ) : product.purity ? (
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 500,
                  color: "#a0a0a0",
                  padding: "6px 16px",
                  border: "2px solid #444",
                  borderRadius: 8,
                }}
              >
                {product.purity}
              </div>
            ) : null}

            {/* Weight */}
            {product.weight && (
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 500,
                  color: "#a0a0a0",
                  padding: "6px 16px",
                  border: "2px solid #444",
                  borderRadius: 8,
                }}
              >
                {product.weight}
              </div>
            )}

            {/* Aktuelle Charge (aus neuester publizierter COA) */}
            {product.certificates[0]?.batchNumber && (
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: "#d4af37",
                  padding: "6px 16px",
                  border: "2px solid #5a4a2a",
                  borderRadius: 8,
                  fontFamily: "monospace",
                }}
              >
                Lot {product.certificates[0].batchNumber}
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 10,
            background:
              "linear-gradient(90deg, #888 0%, #fff 50%, #888 100%)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
