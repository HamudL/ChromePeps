import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { APP_NAME } from "@/lib/constants";

/**
 * OG-Image für /products/[slug] — Lab-Cert-Karte 1200x630.
 *
 * Layout (vom Design vorgegeben):
 *   - Linke Spalte (0-723):
 *       Header (CP-Logo + ChromePeps + Certified-Badge)
 *       Kategorie-Label (uppercase, letterspaced)
 *       Produktname (Comfortaa, 108px)
 *       Preis (Arvo italic, gold, 38px)
 *       Lab-Cert-Block (PURITY/SIZE/LOT/FORMAT, JetBrains Mono)
 *   - Rechte Spalte (723-1200):
 *       Radial-Gradient-Background mit purple Glow
 *       Vial-Bild (product.images[0])
 *       "RESEARCH USE ONLY"-Footer
 *
 * AUDIT_REPORT_v3 §6 PR 9 — finaler Visual.
 *
 * Hinweise zur Implementation:
 *  - `runtime = "edge"` NICHT setzen — Prisma läuft nicht in Edge ohne
 *    Driver-Adapter. Default ist nodejs.
 *  - Custom Fonts (Inter, Comfortaa, Arvo Italic, JetBrains Mono)
 *    werden aus `node_modules/@fontsource/...` geladen. Satori
 *    unterstützt WOFF (NICHT WOFF2) — wir nehmen die WOFF-Variante.
 *  - Bei JSX-Mixed-Content (Expression + String in einem div) sieht
 *    Satori 2 Children und verlangt `display: flex`. Daher entweder
 *    Template-Literal oder explizit display:flex setzen.
 *  - `<img>` muss absolute URL haben — relative `/uploads/...`-Pfade
 *    werden vom Vercel-OG-Edge-Crawler nicht aufgelöst. Wir prefixen
 *    mit `NEXT_PUBLIC_APP_URL`.
 */

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export const alt = "ChromePeps Produkt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Farbpalette (1:1 aus dem V3-Lab-Certificate-Design extrahiert).
const COLORS = {
  bgDark: "#08080a",
  paneRightFrom: "#1a1b20",
  paneRightTo: "#0a0a0c",
  glowPurple: "rgba(150, 90, 200, 0.20)",
  offWhite: "#f5f3ee",
  textPrimary: "rgba(245, 243, 238, 0.92)",
  textMuted45: "rgba(255, 255, 255, 0.45)",
  textMuted60: "rgba(255, 255, 255, 0.60)",
  textMuted35: "rgba(255, 255, 255, 0.35)",
  textMuted30: "rgba(255, 255, 255, 0.30)",
  gold: "#d6a854",
  goldSoft: "rgba(214, 168, 84, 0.85)",
  borderHairline: "rgba(255, 255, 255, 0.08)",
} as const;

async function loadFontsAndAssets() {
  const fontsBase = path.join(process.cwd(), "node_modules", "@fontsource");
  const [interSemibold, comfortaa, arvoItalic, jbMono, cpLogo] =
    await Promise.all([
      readFile(path.join(fontsBase, "inter/files/inter-latin-600-normal.woff")),
      readFile(
        path.join(fontsBase, "comfortaa/files/comfortaa-latin-400-normal.woff"),
      ),
      readFile(
        path.join(fontsBase, "arvo/files/arvo-latin-400-italic.woff"),
      ),
      readFile(
        path.join(
          fontsBase,
          "jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff",
        ),
      ),
      readFile(path.join(process.cwd(), "public/email-logo.png")),
    ]);
  return { interSemibold, comfortaa, arvoItalic, jbMono, cpLogo };
}

export default async function ProductOGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [product, assets] = await Promise.all([
    db.product.findUnique({
      where: { slug, isActive: true },
      select: {
        name: true,
        priceInCents: true,
        purity: true,
        weight: true,
        form: true,
        category: { select: { name: true } },
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
          select: { url: true },
        },
        certificates: {
          where: { isPublished: true },
          orderBy: { testDate: "desc" },
          take: 1,
          select: { batchNumber: true, purity: true },
        },
      },
    }),
    loadFontsAndAssets(),
  ]);

  const fonts = [
    {
      name: "Inter",
      data: assets.interSemibold,
      weight: 600 as const,
      style: "normal" as const,
    },
    {
      name: "Comfortaa",
      data: assets.comfortaa,
      weight: 400 as const,
      style: "normal" as const,
    },
    {
      name: "Arvo",
      data: assets.arvoItalic,
      weight: 400 as const,
      style: "italic" as const,
    },
    {
      name: "JetBrains Mono",
      data: assets.jbMono,
      weight: 400 as const,
      style: "normal" as const,
    },
  ];
  const cpLogoSrc = `data:image/png;base64,${assets.cpLogo.toString("base64")}`;

  // Fallback wenn Produkt nicht existiert
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
            backgroundColor: COLORS.bgDark,
            color: COLORS.offWhite,
            fontFamily: "Comfortaa",
            fontSize: 80,
          }}
        >
          {APP_NAME}
        </div>
      ),
      { ...size, fonts },
    );
  }

  // Vial-Bild auf absolute URL bringen — Vercel-OG/Satori folgt
  // KEINEN relativen Paths.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://chromepeps.com";
  const rawImg = product.images[0]?.url;
  const vialUrl = rawImg
    ? rawImg.startsWith("http")
      ? rawImg
      : `${baseUrl}${rawImg.startsWith("/") ? "" : "/"}${rawImg}`
    : null;

  // Lab-Cert-Daten — bevorzuge die letzte publizierte COA, sonst
  // Produkt-Felder, sonst „—".
  const purityValue =
    product.certificates[0]?.purity != null
      ? `${product.certificates[0].purity.toFixed(2)}% HPLC`
      : (product.purity ?? "—");
  const lotValue = product.certificates[0]?.batchNumber ?? "—";
  const sizeValue = product.weight ?? "—";
  const formatValue = product.form ?? "—";
  const categoryLabel = product.category.name;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: COLORS.bgDark,
          fontFamily: "Inter",
          color: COLORS.offWhite,
          position: "relative",
        }}
      >
        {/* ────────────────── LINKE PANE ────────────────── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 723,
            height: 630,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header-Zeile: Logo + Brand */}
          <div
            style={{
              position: "absolute",
              top: 48,
              left: 56,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cpLogoSrc}
              alt=""
              width={39}
              height={28}
              style={{ width: 39, height: 28 }}
            />
            <div
              style={{
                display: "flex",
                color: COLORS.textPrimary,
                fontFamily: "Inter",
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: -0.17,
              }}
            >
              ChromePeps
            </div>
          </div>

          {/* „◆ CERTIFIED" oben rechts in der linken Pane.
              Der Diamond-Glyph (U+25C6) ist nicht in der JetBrains-Mono-
              WOFF-Subset enthalten und rendert als Tofu-Replacement.
              Lösung: Inline-SVG-Diamond als eigenes <svg>-Element. Pixel-
              genau gleicher Look, unabhängig von Font-Coverage. */}
          <div
            style={{
              position: "absolute",
              top: 54,
              left: 555,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: COLORS.goldSoft,
              fontFamily: "JetBrains Mono",
              fontSize: 12,
              letterSpacing: 2.16,
            }}
          >
            <svg
              width="9"
              height="9"
              viewBox="0 0 9 9"
              fill="rgba(214, 168, 84, 0.85)"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M4.5 0 L9 4.5 L4.5 9 L0 4.5 Z" />
            </svg>
            CERTIFIED
          </div>

          {/* Kategorie */}
          <div
            style={{
              position: "absolute",
              top: 173,
              left: 56,
              display: "flex",
              color: COLORS.textMuted45,
              fontFamily: "Inter",
              fontSize: 13,
              letterSpacing: 4.16,
              textTransform: "uppercase",
            }}
          >
            {categoryLabel}
          </div>

          {/* Produktname (Headline) */}
          <div
            style={{
              position: "absolute",
              top: 200,
              left: 56,
              width: 610,
              height: 110,
              display: "flex",
              alignItems: "flex-start",
              color: COLORS.offWhite,
              fontFamily: "Comfortaa",
              fontSize: 92,
              lineHeight: 1.05,
              overflow: "hidden",
            }}
          >
            {product.name}
          </div>

          {/* Preis */}
          <div
            style={{
              position: "absolute",
              top: 320,
              left: 56,
              display: "flex",
              color: COLORS.gold,
              fontFamily: "Arvo",
              fontStyle: "italic",
              fontSize: 38,
            }}
          >
            {formatPrice(product.priceInCents)}
          </div>

          {/* Lab-Cert-Block */}
          <div
            style={{
              position: "absolute",
              top: 446,
              left: 56,
              width: 610,
              display: "flex",
              flexDirection: "column",
              borderTop: `1px solid ${COLORS.borderHairline}`,
              paddingTop: 18,
            }}
          >
            <LabRow k="PURITY" v={purityValue} />
            <LabRow k="SIZE" v={sizeValue} />
            <LabRow k="LOT" v={lotValue} gold />
            <LabRow k="FORMAT" v={formatValue} />
          </div>
        </div>

        {/* ────────────────── RECHTE PANE ────────────────── */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 723,
            width: 477,
            height: 630,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: `radial-gradient(circle, ${COLORS.paneRightFrom} 0%, ${COLORS.paneRightTo} 80%)`,
          }}
        >
          {/* Purple Glow hinter dem Vial */}
          <div
            style={{
              position: "absolute",
              top: 155,
              left: 79,
              width: 320,
              height: 320,
              display: "flex",
              borderRadius: "50%",
              backgroundImage: `radial-gradient(circle, ${COLORS.glowPurple} 0%, rgba(0,0,0,0) 65%)`,
            }}
          />

          {/* Vial-Bild — fallback auf transparente Box wenn kein Bild */}
          {vialUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vialUrl}
              alt=""
              style={{
                position: "absolute",
                top: 45,
                left: 21,
                width: 435,
                height: 540,
                objectFit: "contain",
              }}
            />
          )}

          {/* Footer */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              display: "flex",
              color: COLORS.textMuted30,
              fontFamily: "JetBrains Mono",
              fontSize: 11,
              letterSpacing: 1.5,
            }}
          >
            RESEARCH USE ONLY
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}

/**
 * Eine Zeile im Lab-Cert-Block: Label links, Wert rechts.
 * Inline-Komponente damit das Haupt-JSX lesbarer bleibt.
 */
function LabRow({
  k,
  v,
  gold = false,
}: {
  k: string;
  v: string;
  gold?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        height: 28,
        fontFamily: "JetBrains Mono",
        fontSize: 14,
      }}
    >
      <div
        style={{
          width: 86,
          display: "flex",
          color: COLORS.textMuted35,
        }}
      >
        {k}
      </div>
      <div
        style={{
          display: "flex",
          color: gold ? COLORS.gold : COLORS.textMuted60,
        }}
      >
        {v}
      </div>
    </div>
  );
}
