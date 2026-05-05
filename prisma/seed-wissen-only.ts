/**
 * Standalone-Skript: seedet NUR den Wissen-Bereich (BlogCategories,
 * Authors, BlogPosts, FAQ, Glossar) — KEINE Admin-User, Categories,
 * Products, ShippingRates, etc.
 *
 * Use-Case: einmaliges Hinzufügen der 9 neuen Pillar-Artikel auf Prod
 * nachdem `seed.ts` (vollständiges Seed) im Setup nur die ersten 3
 * Posts gefüttert hat. Das Vollständige `prisma db seed` beim Deploy
 * würde User-Edits an Categories/Products überschreiben — daher
 * dieses gezielte Skript.
 *
 * Idempotent: alle Operationen sind upserts mit slug als Key. Re-Runs
 * sind safe.
 *
 * File liegt in `prisma/` damit es ins Production-Docker-Image
 * kopiert wird (`COPY ./prisma/ ./prisma/`-Step im Dockerfile). Der
 * `prisma/`-Folder ist die einzige Source-Location die der
 * App-Container zur Runtime hat.
 *
 * Auf VPS via Container ausführen:
 *   sudo docker compose -f /opt/chromepeps/docker/docker-compose.yml \
 *     run --rm --no-deps -T app npx ts-node \
 *     --compiler-options '{"module":"CommonJS"}' prisma/seed-wissen-only.ts
 *
 * AUDIT_REPORT_v3 §6 PR 16 — Daten-Hotfix.
 */

import { prisma, seedWissen } from "./seed";

async function run() {
  console.log("=== Wissen-only seed ===");
  console.log("Connecting to:", process.env.DATABASE_URL?.replace(/:[^@]+@/, ":***@"));
  await seedWissen();
  console.log("=== Done ===");
}

run()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
