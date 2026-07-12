import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join, resolve, sep, extname } from "path";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;

  // ".."-Segmente und Null-Bytes direkt ablehnen (Defense-in-Depth gegen
  // Path-Traversal), bevor der Pfad überhaupt aufgelöst wird.
  for (const segment of path) {
    if (segment.includes("\0") || segment === "..") {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const filePath = resolve(UPLOADS_DIR, ...path);

  // Path-Traversal-Schutz: der aufgelöste absolute Pfad muss das Uploads-
  // Verzeichnis selbst oder ein echtes Kind davon sein. Der abschließende
  // path.sep verhindert, dass ein Geschwister-Verzeichnis wie
  // ".../uploads-backup" den reinen Prefix-Check fälschlich besteht.
  if (filePath !== UPLOADS_DIR && !filePath.startsWith(UPLOADS_DIR + sep)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
