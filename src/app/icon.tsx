import { ImageResponse } from "next/og";

// Next.js file-based metadata: generates /icon at build time
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons

export const runtime = "edge";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: "linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontWeight: 900,
          letterSpacing: "-0.02em",
          borderRadius: 6,
        }}
      >
        C
      </div>
    ),
    {
      ...size,
    }
  );
}
