-- Compound-Index für die Bestseller-Listing-Query der Homepage:
--   WHERE "isActive" = true AND "isBestseller" = true
--   ORDER BY "sortOrder" ASC, "createdAt" DESC LIMIT 4
-- Ohne den Index läuft Postgres als Sequential Scan über die gesamte
-- products-Tabelle. Bei 1k+ Produkten und Cache-Miss-Spikes auf der
-- Homepage spürbar.
--
-- CONCURRENTLY würde den Tabellen-Lock vermeiden, ist aber außerhalb
-- einer Transaktion zu erstellen und die Standard-Prisma-Migration
-- läuft in einer Transaktion. Bei der typischen Produktanzahl (<10k)
-- ist der kurze AccessExclusiveLock unbedenklich.
CREATE INDEX "products_isActive_isBestseller_sortOrder_idx"
  ON "products" ("isActive", "isBestseller", "sortOrder");
