import Link from "next/link";
import { AlertTriangle, PackageX } from "lucide-react";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LOW_STOCK_THRESHOLD } from "@/lib/products/badges";

interface LowStockRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  stock: number;
  isVariant: boolean;
  variantName?: string;
  parentSlug?: string;
}

/**
 * Scans the catalog for products (and product variants) whose stock is at or
 * below the low-stock threshold. Products and variants are merged into a
 * single list sorted by stock ascending — out-of-stock items float to the
 * top so admins see the urgent cases first.
 */
async function getLowStockItems(): Promise<LowStockRow[]> {
  const [products, variants] = await Promise.all([
    db.product.findMany({
      where: {
        isActive: true,
        stock: { lte: LOW_STOCK_THRESHOLD },
      },
      orderBy: { stock: "asc" },
      take: 20,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        stock: true,
      },
    }),
    db.productVariant.findMany({
      where: {
        isActive: true,
        stock: { lte: LOW_STOCK_THRESHOLD },
        product: { isActive: true },
      },
      orderBy: { stock: "asc" },
      take: 20,
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        product: {
          select: { name: true, slug: true },
        },
      },
    }),
  ]);

  const rows: LowStockRow[] = [
    ...products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      stock: p.stock,
      isVariant: false,
    })),
    ...variants.map((v) => ({
      id: v.id,
      name: v.product.name,
      slug: v.product.slug,
      parentSlug: v.product.slug,
      sku: v.sku,
      stock: v.stock,
      isVariant: true,
      variantName: v.name,
    })),
  ];

  rows.sort((a, b) => a.stock - b.stock);
  return rows.slice(0, 12);
}

export async function LowStockWidget() {
  const items = await getLowStockItems();
  const outOfStockCount = items.filter((i) => i.stock <= 0).length;
  const lowCount = items.length - outOfStockCount;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Bestand niedrig
            </CardTitle>
            <CardDescription>
              Produkte mit Bestand &le; {LOW_STOCK_THRESHOLD}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {outOfStockCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <PackageX className="h-3 w-3" />
                {outOfStockCount} aus
              </Badge>
            )}
            {lowCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800"
              >
                {lowCount} knapp
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Alles bestens — kein Produkt unter dem Schwellwert.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={`${item.isVariant ? "v" : "p"}-${item.id}`}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/products/${item.slug}`}
                    className="font-medium hover:underline line-clamp-1"
                  >
                    {item.name}
                    {item.variantName && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({item.variantName})
                      </span>
                    )}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.sku}
                  </p>
                </div>
                <div
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 text-xs font-semibold tabular-nums",
                    item.stock <= 0
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  )}
                >
                  {item.stock <= 0 ? "Ausverkauft" : `${item.stock} übrig`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
