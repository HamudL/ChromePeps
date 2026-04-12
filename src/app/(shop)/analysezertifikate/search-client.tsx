"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ArrowRight, FileCheck, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

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

      {/* Grid — larger cards with product image */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/analysezertifikate/${product.slug}`}
          >
            <Card className="group hover:shadow-lg transition-all duration-300 h-full cursor-pointer overflow-hidden">
              {/* Product image or fallback */}
              <div className="relative h-32 bg-muted overflow-hidden">
                {product.images[0] ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <FlaskConical className="h-8 w-8 text-muted-foreground/25" />
                  </div>
                )}
              </div>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCheck className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
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
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
