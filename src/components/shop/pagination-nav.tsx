import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Numerische Pagination im Apotheke/Wissen-Stil (nutzt die .pagination-num-
 * Klassen aus globals.css). Ersetzt die reine Prev/Next-Variante auf den
 * Produkt-Listings und vereinheitlicht die Pagination-Sprache zwischen
 * /products, /products/category und /wissen.
 *
 * Server-Component: `buildHref` ist eine reine Funktion, die pro Seitenzahl
 * eine URL baut — bleibt im RSC, keine Serialisierungsgrenze.
 */
function pageWindow(current: number, total: number): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];
  const neighbors = 1;
  pages.push(1);
  const start = Math.max(2, current - neighbors);
  const end = Math.min(total - 1, current + neighbors);
  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("ellipsis");
  if (total > 1) pages.push(total);
  return pages;
}

export function PaginationNav({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = pageWindow(currentPage, totalPages);

  return (
    <nav
      className="mt-14 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-8"
      aria-label="Pagination"
    >
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          rel="prev"
          aria-label="Vorherige Seite"
          className="pagination-num inline-flex w-auto items-center gap-1.5 px-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück
        </Link>
      ) : (
        <span
          aria-hidden
          className="pagination-num inline-flex w-auto cursor-not-allowed items-center gap-1.5 px-3 opacity-30"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Zurück
        </span>
      )}

      {pages.map((p, i) =>
        p === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            aria-hidden
            className="px-1 font-mono text-xs text-muted-foreground/50"
          >
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === currentPage ? "page" : undefined}
            aria-label={`Seite ${p}`}
            className={`pagination-num ${p === currentPage ? "active" : ""}`}
          >
            {p}
          </Link>
        ),
      )}

      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          rel="next"
          aria-label="Nächste Seite"
          className="pagination-num inline-flex w-auto items-center gap-1.5 px-3"
        >
          Weiter
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <span
          aria-hidden
          className="pagination-num inline-flex w-auto cursor-not-allowed items-center gap-1.5 px-3 opacity-30"
        >
          Weiter
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      )}
    </nav>
  );
}
