"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
 * Client-Component die die Review-Cards rendert + bei Bedarf weitere
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map((review, i) => (
          <FadeUp key={review.id} delay={i * 0.03}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-semibold text-primary">
                      {review.user?.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {review.user?.name ?? "Anonym"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString(
                          "de-DE",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StarRating rating={review.rating} />
                    {review.isVerified && (
                      <Badge
                        variant="outline"
                        className="border-primary/40 bg-primary/5 text-[10px] px-1.5 py-0"
                      >
                        <ShieldCheck className="mr-1 h-2.5 w-2.5 text-primary" />
                        Verifiziert
                      </Badge>
                    )}
                  </div>
                </div>
                {review.title && (
                  <p className="mt-3 font-semibold text-sm">{review.title}</p>
                )}
                {review.body && (
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {review.body}
                  </p>
                )}
              </CardContent>
            </Card>
          </FadeUp>
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border bg-card px-5 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
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
