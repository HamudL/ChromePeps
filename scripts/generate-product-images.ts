/**
 * generate-product-images.ts
 *
 * Batch-generates premium e-commerce product photos for the ChromePeps shop
 * using Nano Banana Pro (Gemini 3 Pro Image) via the Google GenAI API.
 *
 * USAGE
 *   npm run generate:product-images           # generates all configured products × all views
 *
 * INPUTS
 *   assets/brand/label-retatrutide.png   → the ChromePeps chrome label banner
 *   assets/brand/vial-reference.jpg      → a clean photo of a real ChromePeps vial
 *
 * OUTPUT (per product, 3 views)
 *   public/products/generated/<slug>-front.jpg   → pure front, full label visible
 *   public/products/generated/<slug>-right.jpg   → ~40° right three-quarter
 *   public/products/generated/<slug>-left.jpg    → ~40° left three-quarter
 *
 * The script does NOT touch the database. It only writes files. Once you've
 * reviewed the generated images and picked the good ones, a second pass can
 * update ProductImage rows in Prisma.
 */

import * as dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";

// -----------------------------------------------------------------------------
// Env loading
// -----------------------------------------------------------------------------
// Vanilla dotenv only loads `.env` by default — Next.js has special logic to
// also read `.env.local`, but standalone scripts don't. Load both explicitly,
// with `.env.local` taking precedence (Next.js convention).

const ROOT_DIR = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT_DIR, ".env") });
dotenv.config({ path: path.join(ROOT_DIR, ".env.local"), override: true });

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  const envLocalPath = path.join(ROOT_DIR, ".env.local");
  const exists = fs.existsSync(envLocalPath);
  throw new Error(
    `GEMINI_API_KEY is missing.\n` +
      `  .env.local path: ${envLocalPath}\n` +
      `  .env.local exists: ${exists}\n` +
      (exists
        ? `  → File exists but GEMINI_API_KEY is not set inside it. Check for typos or quoting issues.`
        : `  → File does not exist. Create it with: GEMINI_API_KEY="your-key-here"`),
  );
}

/**
 * Nano Banana Pro = Gemini 3 Pro Image. Best for product photography with
 * label fidelity and multi-reference input. Override via env if you hit
 * access issues (fallback: "gemini-2.5-flash-image-preview" = regular Nano Banana).
 */
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image-preview";

const ROOT = path.resolve(__dirname, "..");
const BRAND_DIR = path.join(ROOT, "assets", "brand");
const OUTPUT_DIR = path.join(ROOT, "public", "products", "generated");

// -----------------------------------------------------------------------------
// Product definitions
// -----------------------------------------------------------------------------

type ProductSpec = {
  slug: string;
  displayName: string;
  dosage: string;
  labelFile: string;
  vialRefFile: string;
};

const PRODUCTS: ProductSpec[] = [
  {
    slug: "retatrutide-10mg",
    displayName: "Retatrutide",
    dosage: "10mg",
    labelFile: "label-retatrutide.png",
    vialRefFile: "vial-reference.jpg",
  },
];

// -----------------------------------------------------------------------------
// Views — three camera angles per product for the shop gallery
// -----------------------------------------------------------------------------
//
// We generate three images per product: front, right three-quarter, and left
// three-quarter. Strict 90° profile views would hide most of the wrapped label,
// so we use ~40° rotations — the label stays clearly readable in all three
// shots while still giving the shop a proper "rotate to see" product feel.

type ViewAngle = "front" | "right" | "left";

const VIEWS: readonly ViewAngle[] = ["front", "right", "left"] as const;

function viewInstructions(view: ViewAngle): string {
  switch (view) {
    case "front":
      return `CAMERA ANGLE — FRONT VIEW
The camera is directly in front of the vial, at eye level with the center of the vial body. Zero rotation on any axis. The ENTIRE ChromePeps label is visible and centered: the "CP" logomark, the full "Retatrutide" chrome typography from first letter to last, the "Research Use Only" badge, and the "10mg" dosage marker — all squarely facing the viewer. Classic Amazon-style hero shot, dead straight.`;

    case "right":
      return `CAMERA ANGLE — RIGHT THREE-QUARTER VIEW
The vial is physically rotated on its vertical axis so that the viewer now sees the vial from the front-right. This is the classic Amazon "second product image" angle — where the product is turned to show that it has depth and a right side.

WHAT MUST BE VISIBLE:
- The RIGHT HALF of the ChromePeps label is facing the camera and readable. The right edge of the label (where the label originally ended on its right side) is now near the center of the visible vial face.
- The LEFT HALF of the label has physically wrapped AROUND THE BACK of the cylindrical vial and is NOT visible from this angle.
- Of the chrome "Retatrutide" typography, only the right-hand letters (roughly "...utide") are clearly visible, curving naturally along the vial's cylindrical surface. The leftmost letters ("Retatr...") are HIDDEN behind the vial's curvature.
- The right flank of the glass vial (the edge nearest the camera) catches a bright chrome rim-light highlight.
- The left flank of the vial recedes into shadow against the obsidian background.

ABSOLUTELY FORBIDDEN — DO NOT:
- Render this as a front view with the label artificially shifted sideways. The vial must ACTUALLY be rotated with real cylindrical perspective.
- Move the label's position on the vial. The label is physically glued to the glass; when the vial rotates, the label rotates WITH it. The label never slides around the surface.
- Render both halves of the "Retatrutide" text at once. Only the right half. The left half is OCCLUDED by the curve of the cylinder.
- Flatten, squish, or compress the label to keep it fully readable. Partial visibility is CORRECT and REQUIRED.
- Copy the front-facing angle from the vial reference image — use it only for shape, proportions, and materials.

ANALOGY: Imagine a Coca-Cola can with "COCA-COLA" printed around it. Rotate the can to your left so you now only see the letters "...COLA" while "COCA" has curved around the back of the can and disappeared. That is the exact effect we want on this vial.`;

    case "left":
      return `CAMERA ANGLE — LEFT VIEW
Rotate the vial about 60 degrees clockwise on its vertical axis (as seen from above). The camera now sees the front-left side of the vial.

The label from image 1 is physically glued to the vial and rotates WITH it. Show only the LEFT portion of the label exactly as it appears in image 1 — the right portion has wrapped around to the back of the vial and is not visible.

Use image 1 as the label exactly as provided. Do NOT redesign, reinterpret, or invent any new label content. Just show the portion of the existing label that is physically visible at this rotation angle.`;
  }
}

// -----------------------------------------------------------------------------
// Prompt
// -----------------------------------------------------------------------------

/**
 * Master prompt for Nano Banana Pro. Tuned for the ChromePeps editorial/premium
 * shop aesthetic (liquid chrome branding, dark backgrounds, 4:5 product cards).
 *
 * The label and vial reference are attached as inline images after this prompt.
 */
function buildPrompt(p: ProductSpec, view: ViewAngle): string {
  return `Ultra-premium e-commerce hero product photograph for a luxury research peptide brand called ChromePeps.

${viewInstructions(view)}

SUBJECT
A single 10ml pharmaceutical-grade clear borosilicate glass vial containing white lyophilized peptide powder resting at the bottom (approximately 1/3 full). The vial has a silver aluminum crimp seal and a vibrant purple rubber flip-top cap — match the exact vial shape, proportions, and hardware from the provided vial reference image (image 2).

LABEL
Wrap the provided ChromePeps label design (image 1) around the cylindrical body of the vial as a high-quality glossy product label. Preserve EXACTLY:
- The deep black background of the label
- The chrome / liquid-metal typography for "Retatrutide" (${p.dosage})
- The "CP" chrome logomark
- The "Research Use Only" pill badge
- The "${p.dosage}" dosage marker
- Any illustrative artwork present in the label design
The label must wrap naturally around the curved glass surface with realistic perspective, subtle light reflection on the chrome text, and very slight edge softening where the label meets the vial's curvature. The label should cover roughly the middle 60% of the vial body. Keep text crisp and readable — do not distort, warp, or misspell "Retatrutide".

COMPOSITION
- Single hero vial, perfectly centered in the frame — both horizontally and vertically
- The vial stands dead straight: strictly vertical axis, zero tilt, zero lean, zero roll. It is geometrically plumb and sits squarely on an invisible base. This is non-negotiable — do NOT add any artistic tilt, lean, or camera Dutch angle, not even subtle. The top of the cap sits directly above the bottom of the vial.
- Vertical 4:5 portrait aspect ratio (the shop uses 4:5 product cards)
- Vial occupies ~65% of frame height
- Sharp focus on the label text, gentle falloff on the cap and base
- No hands, no props, no other objects in frame — only the vial

LIGHTING
Dramatic studio lighting:
- Key light from the upper-left at ~45 degrees
- Chrome rim-light along the right edge of the vial emphasizing the cylindrical form
- Soft spec highlight on the glass shoulder and cap
- Subtle glow picked up by the chrome text of the label
- Barely-visible soft shadow pool directly beneath the vial

BACKGROUND
Deep obsidian-to-charcoal gradient — #000000 fading to #1a1a1a — with a very subtle chrome-silver radial glow behind the vial suggesting a luxury editorial studio. Completely smooth, matte surface. No texture, no grain, no visible horizon line. The mood is high-end pharmaceutical meets luxury fashion editorial.

STYLE
Hyperrealistic commercial product photography, 8K sharpness, shallow depth of field, premium editorial e-commerce aesthetic. Think Byredo × Aesop × pharmaceutical laboratory. No watermarks, no text other than what's on the label itself, no borders, no UI elements.`;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function loadImagePart(filepath: string) {
  if (!fs.existsSync(filepath)) {
    throw new Error(
      `Reference image not found: ${filepath}\n` +
        `→ Place the source images in assets/brand/ (see assets/brand/README.md).`,
    );
  }
  const data = fs.readFileSync(filepath);
  const ext = path.extname(filepath).slice(1).toLowerCase();
  const mimeType =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : `image/${ext}`;
  return {
    inlineData: {
      data: data.toString("base64"),
      mimeType,
    },
  };
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// -----------------------------------------------------------------------------
// Core generation
// -----------------------------------------------------------------------------

async function generateOne(
  ai: GoogleGenAI,
  product: ProductSpec,
  view: ViewAngle,
): Promise<string> {
  const tag = `${product.slug}/${view}`;
  const labelPath = path.join(BRAND_DIR, product.labelFile);
  const vialPath = path.join(BRAND_DIR, product.vialRefFile);

  console.log(`\n[${tag}] Loading references...`);
  console.log(`  label:  ${path.relative(ROOT, labelPath)}`);
  console.log(`  vial:   ${path.relative(ROOT, vialPath)}`);

  const labelPart = loadImagePart(labelPath);
  const vialPart = loadImagePart(vialPath);
  const prompt = buildPrompt(product, view);

  console.log(`[${tag}] Calling ${MODEL}...`);
  const started = Date.now();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, labelPart, vialPart],
      },
    ],
  });

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`[${tag}] Response received in ${elapsed}s`);

  // Extract the first image part from the response
  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error(`No candidates returned. Full response:\n${JSON.stringify(response, null, 2)}`);
  }

  const parts = candidate.content?.parts ?? [];
  const imagePart = parts.find(
    (p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data,
  );

  if (!imagePart?.inlineData?.data) {
    // Surface any text the model returned (often explains refusals / safety blocks)
    const textParts = parts
      .map((p: { text?: string }) => p.text)
      .filter(Boolean)
      .join("\n");
    throw new Error(
      `No image in response for ${tag}.\n` +
        (textParts ? `Model text:\n${textParts}\n` : "") +
        `Finish reason: ${candidate.finishReason ?? "unknown"}`,
    );
  }

  ensureDir(OUTPUT_DIR);
  const outExt = imagePart.inlineData.mimeType === "image/png" ? "png" : "jpg";
  const outputPath = path.join(OUTPUT_DIR, `${product.slug}-${view}.${outExt}`);
  fs.writeFileSync(outputPath, Buffer.from(imagePart.inlineData.data, "base64"));

  const sizeKb = (fs.statSync(outputPath).size / 1024).toFixed(0);
  console.log(`[${tag}] ✓ Saved ${path.relative(ROOT, outputPath)} (${sizeKb} KB)`);

  return outputPath;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const total = PRODUCTS.length * VIEWS.length;
  console.log(`ChromePeps product image generator`);
  console.log(`Model: ${MODEL}`);
  console.log(
    `Products: ${PRODUCTS.length}  |  Views per product: ${VIEWS.length}  |  Total images: ${total}`,
  );

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const results: { slug: string; view: ViewAngle; path?: string; error?: string }[] = [];

  for (const product of PRODUCTS) {
    for (const view of VIEWS) {
      try {
        const outPath = await generateOne(ai, product, view);
        results.push({ slug: product.slug, view, path: outPath });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[${product.slug}/${view}] ✗ ${message}`);
        results.push({ slug: product.slug, view, error: message });
      }
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  const ok = results.filter((r) => r.path).length;
  const fail = results.filter((r) => r.error).length;
  console.log(`Done: ${ok} generated, ${fail} failed`);

  if (fail > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
