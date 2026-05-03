import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Helper für Wissen-Admin-API-Routes: prüft Admin-Role, returnt
 * NextResponse mit 403 wenn nicht autorisiert. Caller schreibt:
 *
 *   const guard = await requireWissenAdmin();
 *   if (guard) return guard;
 */
export async function requireWissenAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 },
    );
  }
  return null;
}
