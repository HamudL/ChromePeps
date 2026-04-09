import { ImageResponse } from "next/og";

// Apple touch icon for iOS home screen.
// Next.js will serve this at /apple-icon and expose <link rel="apple-touch-icon">.

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: "linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontWeight: 900,
          letterSpacing: "-0.05em",
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
