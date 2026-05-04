-- DropForeignKey
ALTER TABLE "product_components" DROP CONSTRAINT "product_components_componentProductId_fkey";

-- AddForeignKey
ALTER TABLE "product_components" ADD CONSTRAINT "product_components_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
