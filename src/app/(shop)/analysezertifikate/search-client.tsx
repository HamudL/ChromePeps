"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, FileCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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
      <div className="relative max-w-md mx-auto mb-10">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Nach Peptidname suchen..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11 bg-muted/30 border-border/60 focus:border-primary/40"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/analysezertifikate/${product.slug}`}
          >
            <Card className="group border-border/50 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 h-full cursor-pointer">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 shrink-0 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                    <FileCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors duration-200">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {product._count.certificates}{" "}
                      {product._count.certificates === 1
                        ? "Zertifikat"
                        : "Zertifikate"}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
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
