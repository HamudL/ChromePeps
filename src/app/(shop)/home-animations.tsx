import type { CSSProperties, ReactNode } from "react";

/**
 * FadeUp — fade-and-translate on scroll-into-view.
 *
 * SERVER COMPONENT. Rendert reines HTML mit zwei CSS-Custom-Properties
 * (`--fade-delay`) und einer Initial-Klasse. Die Animation läuft per CSS
 * (`@keyframes fadeUpIn`), getriggert durch eine `.fade-in`-Klasse, die
 * ein einzelner globaler IntersectionObserver auf der ganzen Page setzt
 * (siehe `<RevealController />` in `(shop)/layout.tsx`).
 *
 * Vorher: jede FadeUp-Instanz war ein eigener Client-Component mit
 *   - eigener useRef
 *   - eigenem useEffect
 *   - eigenem IntersectionObserver
 *   - eigenem setTimeout
 * Auf der Homepage = ~16 Instances → 16 Hydration-Mount-Cycles, 16
 * IOs, 16 setTimeouts. Jetzt: 0 Hydration für FadeUp selbst, 1 globaler
 * IO im Layout, CSS macht den Rest.
 */
function FadeUp({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  /**
   * Wrapper-Element. Default "div". Wird auf "li" gesetzt, wenn FadeUp
   * direkt in einer <ol>/<ul> sitzt — sonst entstünde eine Liste mit
   * Nicht-Listen-Kindern (invalide Semantik, Screenreader meldet 0
   * Einträge). Bewusst auf die zwei genutzten Tags begrenzt, damit TS
   * die Element-Props (className/style/children) sauber auflöst.
   */
  as?: "div" | "li";
}) {
  // `style` setzt nur die per-Instanz-Variable. CSS verwendet sie als
  // animation-delay-Wert.
  const style: CSSProperties & { ["--fade-delay"]?: string } =
    delay > 0 ? { ["--fade-delay"]: `${delay}s` } : {};

  const cls = `reveal-up ${className ?? ""}`;
  return Tag === "li" ? (
    <li className={cls} style={style}>
      {children}
    </li>
  ) : (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}

// Export directly as named export — NOT as object property.
// RSC cannot resolve component references from object properties.
export { FadeUp };
