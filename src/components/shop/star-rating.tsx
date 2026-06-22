import { Star } from "lucide-react";

/**
 * Geteilte 5-Sterne-Anzeige für Reviews. Die rating-Zahl wird auf den
 * nächsten Integer gerundet — halbe Sterne werden bewusst nicht
 * dargestellt, der avgRating-Float darüber zeigt die exakte Zahl.
 *
 * Server- und Client-tauglich (rein präsentational, kein State).
 */
export function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}
