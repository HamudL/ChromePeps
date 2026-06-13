"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { StarRating } from "./star-rating";
import { FadeUp } from "@/app/(shop)/home-animations";

/**
 * Reduzierter Review-Shape für die Listen-Anzeige. Wir bekommen vom
 * Server initial 20 davon mit, weitere werden per /api/reviews
 * nachgeladen — beide Pfade liefern dasselbe Shape.
 */
export interface ReviewListItem {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerified: boolean;
  /**
   * ISO-String, weil React Server-Component → Client-Component Daten
   * über die JSON-Boundary serialisiert werden müssen. Date-Objekte
   * sind dort nicht stable.
   */
  createdAt: string;
  user: {
    name: string | null;
    image: string | null;
  } | null;
}

interface ReviewListProps {
  productId: string;
  initialReviews: ReviewListItem[];
  totalCount: number;
}

const PAGE_SIZE = 20;

/**
 * Client-Component die die Review-Einträge rendert + bei Bedarf weitere
 * Reviews lazy-loaded. Initial bekommt sie die ersten 20 Reviews vom
 * Server-Render, jeder Klick auf "Mehr Bewertungen laden" fetcht den
 * nächsten 20er-Block über /api/reviews?productId=X&offset=Y.
 *
 * Vorher (Phase F): die Detailseite lud alle 500+ Reviews + 500
 * User-JOINs in den SSR-Bundle, was das HTML für Bestseller-Produkte
 * mehrere MB groß machte. Jetzt: 20 Reviews initial im Bundle, der
 * Rest on-demand per kleinen JSON-API-Calls.
 */
export function ReviewList({
  productId,
  initialReviews,
  totalCount,
}: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewListItem[]>(initialReviews);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMore = reviews.length < totalCount;

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reviews?productId=${encodeURIComponent(productId)}&offset=${reviews.length}&limit=${PAGE_SIZE}`,
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Konnte Bewertungen nicht laden.");
        return;
      }
      const more = (json.data as ReviewListItem[]) ?? [];
      // Defensive: Duplikate über IDs ausschließen, falls zwischen den
      // Lade-Aufrufen ein neuer Review hinzugekommen ist (Offset würde
      // dann denselben Eintrag zweimal liefern).
      setReviews((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...more.filter((r) => !seen.has(r.id))];
      });
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  if (reviews.length === 0) {
    return null; // Empty-State wird vom Page-Code als "Sei der Erste!" gerendert
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {reviews.map((review, i) => (
          <FadeUp key={review.id} delay={i * 0.03}>
            <article className="h-full rounded-sm border border-border bg-card p-5 transition-colors hover:border-primary/50">
              <header className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {/* Initial-Kachel statt Avatar-Foto — eckig, Mono. */}
                  <div
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-muted font-mono text-sm font-semibold text-primary-strong"
                  >
                    {review.user?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {review.user?.name ?? "Anonym"}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                      {new Date(review.createdAt).toLocaleDateString("de-DE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StarRating rating={review.rating} />
                  {review.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-primary/40 bg-accent px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-primary-strong">
                      <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
                      Verifizierter Kauf
                    </span>
                  )}
                </div>
              </header>
              {review.title && (
                <p className="mt-3 text-sm font-semibold">{review.title}</p>
              )}
              {review.body && (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {review.body}
                </p>
              )}
            </article>
          </FadeUp>
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-sm border border-border bg-card px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] transition-colors hover:border-primary hover:text-primary-strong disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Mehr Bewertungen laden ({totalCount - reviews.length} weitere)
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-destructive">{error}</p>
      )}
    </>
  );
}
