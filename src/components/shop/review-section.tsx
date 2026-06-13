"use client";

import { useEffect, useState } from "react";
import { ReviewForm } from "./review-form";
import { Loader2 } from "lucide-react";

interface ReviewSectionProps {
  productId: string;
}

/**
 * Client wrapper around ReviewForm that fetches review eligibility
 * from the API instead of relying on server-side auth().
 * This allows the product detail page to use ISR (revalidate).
 */
export function ReviewSection({ productId }: ReviewSectionProps) {
  const [state, setState] = useState<{
    isLoggedIn: boolean;
    canReview: boolean;
    alreadyReviewed: boolean;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/reviews/eligibility?productId=${productId}`)
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState({ isLoggedIn: false, canReview: false, alreadyReviewed: false }));
  }, [productId]);

  if (!state) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-border py-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Bewertungsformular wird geladen …
      </div>
    );
  }

  return (
    <ReviewForm
      productId={productId}
      canReview={state.canReview}
      isLoggedIn={state.isLoggedIn}
      alreadyReviewed={state.alreadyReviewed}
    />
  );
}
