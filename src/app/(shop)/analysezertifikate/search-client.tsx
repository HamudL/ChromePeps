"use client";

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
      <div className="relative max-w-md mx-auto mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Nach Peptidname suchen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/analysezertifikate/${product.slug}`}
          >
            <Card className="group hover:shadow-lg transition-shadow duration-300 h-full">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {product._count.certificates}{" "}
                      {product._count.certificates === 1
                        ? "Zertifikat"
                        : "Zertifikate"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {query && filtered.length === 0 && (
        <p className="text-center text-muted-foreground mt-8">
          Keine Ergebnisse für &ldquo;{query}&rdquo;
        </p>
      )}
    </>
  );
}
