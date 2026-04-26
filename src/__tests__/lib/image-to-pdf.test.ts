import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { imageToPdfBuffer } from "@/lib/certificates/image-to-pdf";

describe("imageToPdfBuffer", () => {
  it("wraps a small PNG into a valid PDF buffer", async () => {
    // Generate a 200×200 red PNG fully in-memory — no external fixture needed.
    const pngBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 220, g: 53, b: 69, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const pdf = await imageToPdfBuffer(pngBuffer);

    // PDF header magic — the first 5 bytes must be "%PDF-".
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    // Sanity: a 1-page PDF with an embedded image is at least a few KB.
    expect(pdf.length).toBeGreaterThan(1000);
  }, 20_000);

  it("downscales an oversized image (> 2000 px) before embedding", async () => {
    // 3000 px wide red rectangle — should be capped to 2000 inside the helper.
    const bigPng = await sharp({
      create: {
        width: 3000,
        height: 1500,
        channels: 4,
        background: { r: 0, g: 100, b: 200, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const pdf = await imageToPdfBuffer(bigPng);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    // The capped+JPEG-recompressed embed should be well below the original
    // PNG raw byte count — a smoke check that the resize actually ran.
    expect(pdf.length).toBeLessThan(bigPng.length);
  }, 20_000);

  it("handles JPEG input the same way", async () => {
    const jpgBuffer = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 100, g: 150, b: 50 },
      },
    })
      .jpeg({ quality: 85 })
      .toBuffer();

    const pdf = await imageToPdfBuffer(jpgBuffer);
    expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  }, 20_000);
});
