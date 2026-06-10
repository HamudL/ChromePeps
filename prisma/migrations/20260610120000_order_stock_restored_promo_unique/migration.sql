-- AlterTable: Doppel-Restore-Schutz für den Lagerbestand einer Order.
ALTER TABLE "orders" ADD COLUMN     "stockRestoredAt" TIMESTAMP(3);

-- "Einmal pro Käufer"-Regel für Promo-Codes auf DB-Ebene erzwingen.
-- Vorher nur check-then-create im App-Code (Race bei parallelen Checkouts).
-- Falls historische Duplikate existieren, schlägt CREATE UNIQUE INDEX fehl —
-- dann zuerst Duplikate konsolidieren (ältesten Eintrag behalten).
DROP INDEX IF EXISTS "promo_usages_promoId_idx";
DROP INDEX IF EXISTS "promo_usages_promoId_guestEmail_idx";

-- CreateIndex
CREATE UNIQUE INDEX "promo_usages_promoId_userId_key" ON "promo_usages"("promoId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_usages_promoId_guestEmail_key" ON "promo_usages"("promoId", "guestEmail");
