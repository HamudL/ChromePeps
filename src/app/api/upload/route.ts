import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { imageToPdfBuffer } from "@/lib/certificates/image-to-pdf";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
];
const MAX_SIZE_IMAGE = 5 * 1024 * 1024; // 5MB
const MAX_SIZE_PDF = 10 * 1024 * 1024; // 10MB

// COA-Mode: PNG/JPG werden serverseitig in eine 1-Page-PDF gewrapped,
// damit der Mail-Anhang-Code (loadCoaAttachments in lib/mail/send.ts)
// unverändert PDFs liest. So kann der Admin Janoshik-Screenshots als
// PNG ablegen und der Kunde bekommt trotzdem eine saubere PDF im
// Bestellbestätigungs-Mail-Anhang.
const COA_WRAPPABLE_TYPES = new Set(["image/png", "image/jpeg"]);

/**
 * Verify that the first bytes of the buffer match the magic number for the
 * claimed MIME type. The browser-supplied `file.type` header is trivially
 * spoofable — this check ensures that "image/png" actually contains PNG
 * bytes, blocking a malicious admin from uploading a script disguised as an
 * image. AVIF is intentionally not magic-checked (its `ftypavif` / `ftypheic`
 * variants make inline detection messy); we fall back to MIME for AVIF only.
 */
function verifyMagicBytes(buffer: Buffer, claimedType: string): boolean {
  if (claimedType === "image/avif") {
    // AVIF uses an ISO-BMFF box structure. A minimal-risk heuristic: the box
    // type at offset 4-8 must be "ftyp" and the brand at 8-12 must contain
    // "avif" or "heic"/"heif"/"mif1". We only spot-check the "ftyp" box.
    return (
      buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp"
    );
  }
  const head = buffer.subarray(0, 16);
  const hex = head.toString("hex");
  switch (claimedType) {
    case "image/jpeg":
      // FF D8 FF
      return hex.startsWith("ffd8ff");
    case "image/png":
      // 89 50 4E 47 0D 0A 1A 0A
      return hex.startsWith("89504e470d0a1a0a");
    case "image/webp":
      // RIFF....WEBP
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    case "application/pdf":
      // %PDF-
      return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // `?as=coa` schaltet COA-Modus ein: Bilder werden in PDF gewrapped,
  // PDFs werden 1:1 in /uploads/certificates abgelegt. Default-Mode
  // bleibt für Produktbilder etc. unverändert.
  const isCoaMode = req.nextUrl.searchParams.get("as") === "coa";

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json(
      { success: false, error: "No files provided" },
      { status: 400 }
    );
  }

  const urls: string[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `Invalid file type: ${file.type}. Allowed: JPG, PNG, WebP, AVIF, PDF` },
        { status: 400 }
      );
    }

    const isPdf = file.type === "application/pdf";
    const maxSize = isPdf ? MAX_SIZE_PDF : MAX_SIZE_IMAGE;

    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: `File "${file.name}" exceeds ${isPdf ? "10MB" : "5MB"} limit` },
        { status: 400 }
      );
    }

    let buffer = Buffer.from(await file.arrayBuffer());

    // Magic-byte verification: don't trust `file.type` alone — that's the
    // browser-supplied Content-Type header and can be spoofed. This blocks a
    // compromised admin session from uploading a script renamed to .jpg.
    if (!verifyMagicBytes(buffer, file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `File "${file.name}" contents don't match its declared type (${file.type}).`,
        },
        { status: 400 }
      );
    }

    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
      "application/pdf": "pdf",
    };
    let ext = MIME_TO_EXT[file.type] ?? "jpg";
    let subDir = isPdf ? "certificates" : "products";

    // COA-Mode: Bilder sofort zu PDF wrappen, damit `loadCoaAttachments`
    // im Mail-Send unverändert PDFs lesen kann. Das spart ein neues DB-
    // Feld (`imageUrl`) und hält die Mail-Pipeline einfach.
    if (isCoaMode && COA_WRAPPABLE_TYPES.has(file.type)) {
      try {
        // Re-wrap mit Buffer.from() damit der Type von Buffer<ArrayBufferLike>
        // (kommt aus react-pdf renderToBuffer) zurück auf Buffer<ArrayBuffer>
        // normalisiert wird — das was fs.writeFile erwartet.
        buffer = Buffer.from(await imageToPdfBuffer(buffer));
        ext = "pdf";
        subDir = "certificates";
      } catch (err) {
        console.error("[upload] COA image→PDF wrap failed:", err);
        return NextResponse.json(
          {
            success: false,
            error: `Konnte "${file.name}" nicht in PDF konvertieren.`,
          },
          { status: 500 }
        );
      }
    } else if (isCoaMode && isPdf) {
      // bereits PDF — direkt in certificates/, kein Wrap.
      subDir = "certificates";
    }

    const uniqueName = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const uploadDir = join(process.cwd(), "public", "uploads", subDir);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, uniqueName), buffer);

    urls.push(`/uploads/${subDir}/${uniqueName}`);
  }

  return NextResponse.json({ success: true, data: urls });
}
