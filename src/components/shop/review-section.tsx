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
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Lade Bewertungsformular...
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
