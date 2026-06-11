-- AlterTable: Doppel-Restore-Schutz für den Lagerbestand einer Order.
ALTER TABLE "orders" ADD COLUMN     "stockRestoredAt" TIMESTAMP(3);

-- "Einmal pro Käufer"-Regel für Promo-Codes auf DB-Ebene erzwingen.
-- Vorher nur check-then-create im App-Code (Race bei parallelen Checkouts).
--
-- Historische Duplikate (durch genau diese Race entstanden) VOR dem
-- Unique-Index konsolidieren — sonst schlägt CREATE UNIQUE INDEX fehl
-- und das Deploy hängt halb-migriert. Behalten wird jeweils der älteste
-- Eintrag (die "echte" Erst-Einlösung); die Order-Zuordnung der
-- gelöschten Duplikat-Rows geht bewusst verloren (orderId ist ohnehin
-- pro Row unique, der Rabatt der Duplikat-Order bleibt auf der Order
-- selbst dokumentiert).
DELETE FROM "promo_usages" p
USING "promo_usages" older
WHERE p."promoId" = older."promoId"
  AND p."userId" IS NOT NULL
  AND p."userId" = older."userId"
  AND (older."createdAt" < p."createdAt"
       OR (older."createdAt" = p."createdAt" AND older."id" < p."id"));

DELETE FROM "promo_usages" p
USING "promo_usages" older
WHERE p."promoId" = older."promoId"
  AND p."guestEmail" IS NOT NULL
  AND p."guestEmail" = older."guestEmail"
  AND (older."createdAt" < p."createdAt"
       OR (older."createdAt" = p."createdAt" AND older."id" < p."id"));

DROP INDEX IF EXISTS "promo_usages_promoId_idx";
DROP INDEX IF EXISTS "promo_usages_promoId_guestEmail_idx";

-- CreateIndex
CREATE UNIQUE INDEX "promo_usages_promoId_userId_key" ON "promo_usages"("promoId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_usages_promoId_guestEmail_key" ON "promo_usages"("promoId", "guestEmail");
