import { ImageResponse } from "next/og";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

// Dynamic Open Graph image for the homepage / default social share card.
// Next.js will serve this at /opengraph-image and reference it in <meta property="og:image">.

export const runtime = "edge";

export const alt = `${APP_NAME} — Premium Research Peptides`;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 45%, #3a3a3a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 18,
              background: "linear-gradient(135deg, #2a2a2a 0%, #5a5a5a 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              color: "#ffffff",
            }}
          >
            C
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            {APP_NAME}
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 78,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginBottom: 24,
            maxWidth: 1000,
          }}
        >
          Premium Research Peptides
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "#c0c0c0",
            lineHeight: 1.3,
            maxWidth: 900,
          }}
        >
          {APP_DESCRIPTION}
        </div>

        {/* Footer bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 12,
            background:
              "linear-gradient(90deg, #888 0%, #fff 50%, #888 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
