import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

export async function requireAuth() {
  const session = await auth();
  // `session.user.id === ""` tritt auf, wenn der session-Callback in
  // auth.ts erkannt hat, dass der User in der DB nicht mehr existiert
  // (gelöscht / DB-Wipe). Das ist der Fallback-Signalweg, falls der
  // expires=0 im Callback vom Caller noch nicht ausgewertet wurde.
  if (!session?.user || !session.user.id) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }
  return session;
}

export async function requireRole(role: Role) {
  const session = await requireAuth();
  if (session.user.role !== role) {
    redirect("/");
  }
  return session;
}

export async function getSession() {
  return auth();
}
