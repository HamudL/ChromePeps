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
    // role="img" + aria-label liefert Screenreadern eine Textalternative
    // (WCAG 1.1.1); die Sterne selbst sind rein dekorativ und werden per
    // aria-hidden aus dem Accessibility-Baum genommen. Der gerundete Wert
    // entspricht exakt der sichtbaren Sternfüllung (Math.round unten).
    <div
      role="img"
      aria-label={`Bewertung: ${Math.round(rating)} von 5 Sternen`}
      className="flex items-center gap-0.5"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          aria-hidden="true"
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
