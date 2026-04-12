import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
];
const MAX_SIZE_IMAGE = 5 * 1024 * 1024; // 5MB
const MAX_SIZE_PDF = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

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

    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
      "application/pdf": "pdf",
    };
    const ext = MIME_TO_EXT[file.type] ?? "jpg";
    const subDir = isPdf ? "certificates" : "products";
    const uniqueName = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = join(process.cwd(), "public", "uploads", subDir);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, uniqueName), buffer);

    urls.push(`/uploads/${subDir}/${uniqueName}`);
  }

  return NextResponse.json({ success: true, data: urls });
}
