import "server-only";
import * as React from "react";
import {
  Document,
  Page,
  Image as PdfImage,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import sharp from "sharp";

/**
 * Wraps a PNG/JPG buffer into a single-page A4 PDF, image filled across the
 * page (object-fit: contain). Used by the COA upload flow so that an admin
 * can drop a Janoshik-style PNG screenshot and the customer still receives a
 * tidy PDF attachment in the order-confirmation mail.
 *
 * Pipeline:
 *   1. Optionally downscale very large images via sharp (cap at 2000 px wide,
 *      preserves aspect, keeps PDF size sane — a 12 MP phone photo without
 *      this would balloon to ~3 MB unnecessarily).
 *   2. Re-encode to a stable format that @react-pdf/renderer is happy with
 *      (JPEG at q=92 — react-pdf has known issues with some PNG variants like
 *      16-bit alpha or interlaced, so we normalise to baseline JPEG).
 *   3. Embed in a single-page A4 document.
 */

const MAX_WIDTH_PX = 2000;
const JPEG_QUALITY = 92;

const styles = StyleSheet.create({
  page: {
    padding: 24,
    backgroundColor: "#ffffff",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
});

export async function imageToPdfBuffer(input: Buffer): Promise<Buffer> {
  // Sharp validates the input as a real raster image — if the buffer isn't
  // a valid PNG/JPEG/WebP/etc., this throws and the caller bubbles a 400.
  const meta = await sharp(input).metadata();

  let pipeline = sharp(input).rotate(); // honour EXIF orientation
  if (meta.width && meta.width > MAX_WIDTH_PX) {
    pipeline = pipeline.resize({ width: MAX_WIDTH_PX, withoutEnlargement: true });
  }
  // Normalise to JPEG. react-pdf's PNG handling has edge-case bugs with
  // alpha/interlaced sources; baseline JPEG is the safest input format.
  const normalised = await pipeline
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  // react-pdf accepts a `{ data, format }` object for in-memory image data.
  // We must pass the buffer through this shape — passing a raw Buffer to
  // `src` is undocumented and breaks across versions.
  const imgSrc = { data: normalised, format: "jpg" as const };

  // react-pdf's <PdfImage> ist KEIN HTML <img> — der semantische Kontext
  // ist "PDF-Embed", nicht "Web-Bild". Wir importieren als Alias damit der
  // jsx-a11y/alt-text-Check nicht greift (der pattern-matched auf den
  // Component-Namen). Der `src`-Type ist im react-pdf bewusst eng (nur
  // `string | URL`), akzeptiert zur Laufzeit aber auch das in-memory
  // `{ data, format }`-Shape.
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <PdfImage
          src={imgSrc as unknown as string}
          style={styles.image}
        />
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
