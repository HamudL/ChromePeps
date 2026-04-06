import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatPrice, cn } from "@/lib/utils";
import { ADMIN_ITEMS_PER_PAGE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function AdminProductsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1"));
  const search = params.search ?? "";
  const skip = (page - 1) * ADMIN_ITEMS_PER_PAGE;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { sku: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: ADMIN_ITEMS_PER_PAGE,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        category: { select: { name: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  const totalPages = Math.ceil(total / ADMIN_ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products</h2>
          <p className="text-muted-foreground">
            Manage your product catalog ({total} total)
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Search products by name, SKU, or description..."
                defaultValue={search}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {search && (
              <Button asChild variant="ghost">
                <Link href="/admin/products">Clear</Link>
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.images[0]?.url ? (
                        <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                          <Image
                            src={product.images[0].url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.shortDesc && (
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                            {product.shortDesc}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {product.sku}
                      </code>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(product.priceInCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "font-medium",
                          product.stock <= 0
                            ? "text-red-600"
                            : product.stock <= 5
                              ? "text-yellow-600"
                              : "text-green-600"
                        )}
                      >
                        {product.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {product.category.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild size="icon" variant="ghost">
                          <Link href={`/admin/products/${product.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">
                      {search
                        ? "No products match your search."
                        : "No products yet. Add your first product."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {skip + 1}-{Math.min(skip + ADMIN_ITEMS_PER_PAGE, total)} of{" "}
            {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/products?page=${page - 1}${search ? `&search=${search}` : ""}`}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/products?page=${page + 1}${search ? `&search=${search}` : ""}`}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
