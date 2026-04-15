"use client";

/**
 * ⚠️  PUBLIC ACCESS DISABLED
 *
 * Supports /analysezertifikate, which is intentionally blocked by
 * src/middleware.ts. This client component is kept alive with the parent
 * route so the file tree is self-consistent, but it is never rendered in
 * production — the middleware redirect kicks in before the parent page
 * runs. See src/app/(shop)/analysezertifikate/page.tsx for the full note.
 */
import { useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, FileCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductWithCerts {
  id: string;
  name: string;
  slug: string;
  images: { url: string }[];
  _count: { certificates: number };
}

export function AnalysezertifikateSearch({
  products,
}: {
  products: ProductWithCerts[];
}) {
  const [query, setQuery] = useState("");

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      {/* Search */}
      <div className="relative max-w-md mx-auto mb-10">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Nach Peptidname suchen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* Grid — clean cards without product image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/analysezertifikate/${product.slug}`}
          >
            <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 h-full cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 shrink-0 group-hover:bg-primary/15 transition-colors">
                  <FileCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {product._count.certificates}{" "}
                      {product._count.certificates === 1
                        ? "Zertifikat"
                        : "Zertifikate"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Janoshik HPLC</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {query && filtered.length === 0 && (
        <p className="text-center text-muted-foreground mt-10">
          Keine Ergebnisse für &ldquo;{query}&rdquo;
        </p>
      )}
    </>
  );
}
