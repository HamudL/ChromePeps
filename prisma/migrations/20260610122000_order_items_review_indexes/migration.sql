-- FK-Indizes für order_items: Postgres legt für Foreign Keys KEINE
-- automatischen Indizes an. Ohne sie laufen Bestseller-groupBy,
-- Related-Products, der Verified-Purchase-Check und Cascade-/SET-NULL-
-- Deletes als Sequential Scan über die gesamte order_items-Tabelle.
--
-- CONCURRENTLY würde den Tabellen-Lock vermeiden, ist aber außerhalb
-- einer Transaktion zu erstellen und die Standard-Prisma-Migration
-- läuft in einer Transaktion. Bei der typischen Order-Anzahl ist der
-- kurze AccessExclusiveLock unbedenklich.

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_variantId_idx" ON "order_items"("variantId");

-- Review-Pagination (WHERE productId=? ORDER BY createdAt DESC LIMIT n)
-- liest Filter + Sort jetzt komplett aus dem Compound-Index. Der alte
-- Single-Column-Index ist durch das führende productId-Feld vollständig
-- abgedeckt und wäre ein doppelter B-Tree — daher droppen.
DROP INDEX IF EXISTS "reviews_productId_idx";

-- CreateIndex
CREATE INDEX "reviews_productId_createdAt_idx" ON "reviews"("productId", "createdAt" DESC);
