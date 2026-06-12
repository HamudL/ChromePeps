import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/**
 * Prisma-P2002 (Unique-Constraint verletzt) erkennen — strukturell statt
 * über instanceof, weil der Fehler je nach Bundling/Edge-Runtime nicht
 * immer eine PrismaClientKnownRequestError-Instanz ist.
 */
export function isPrismaUniqueError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}
