-- CreateIndex
-- Postgres legt FKs nicht automatisch index-mäßig ab. Jede
-- productCardSelect-Subquery (WHERE "productId"=? ORDER BY "sortOrder" ASC
-- LIMIT 1) auf jeder Listing-Seite × 12 Cards lief vorher als Sequential
-- Scan. Pattern entspricht dem bestehenden Index auf product_variants.
CREATE INDEX "product_images_productId_idx" ON "product_images"("productId");
