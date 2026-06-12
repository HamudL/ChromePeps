import { useEffect, type RefObject } from "react";

interface VisibilityGatedRafOptions {
  /** Vorlauf des IntersectionObservers, bevor das Element sichtbar wird. */
  rootMargin?: string;
  /** false = Hook inaktiv (z.B. bis ein Mobile-/Reduced-Motion-Gate entschieden hat). */
  enabled?: boolean;
}

/**
 * Geteiltes Loop-Gating für Canvas-Animationen: der rAF-Loop läuft nur,
 * solange das Element im Viewport ist (IntersectionObserver mit
 * rootMargin) UND der Tab sichtbar ist (visibilitychange) — sonst
 * Dauerlast auf CPU/GPU für ein unsichtbares Element.
 *
 * Der Frame-Callback kommt als Ref statt als Funktion, weil die Ticks
 * der Consumer in deren Setup-Effekt entstehen (Closure über Canvas-
 * State, der erst dort existiert). Der Hook ruft pro Frame
 * `tickRef.current` auf und plant den nächsten Frame NACH dem Tick —
 * wirft der Tick, stirbt der Loop (wie zuvor inline).
 */
export function useVisibilityGatedRaf(
  targetRef: RefObject<Element | null>,
  tickRef: RefObject<(() => void) | null>,
  { rootMargin = "100px", enabled = true }: VisibilityGatedRafOptions = {}
): void {
  useEffect(() => {
    if (!enabled) return;
    const target = targetRef.current;
    if (!target) return;

    let raf = 0;
    let isLooping = false;
    let isVisible = true;

    const frame = () => {
      tickRef.current?.();
      raf = requestAnimationFrame(frame);
    };
    const startLoop = () => {
      if (isLooping) return;
      isLooping = true;
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      if (!isLooping) return;
      isLooping = false;
      cancelAnimationFrame(raf);
    };

    // Sofort starten — nicht auf die Observer warten.
    startLoop();

    // Pause wenn off-screen. Reine Optimierung; der Loop läuft bereits.
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !document.hidden) startLoop();
        else stopLoop();
      },
      { rootMargin }
    );
    io.observe(target);

    // Pause wenn der Tab versteckt ist.
    const onVisibilityChange = () => {
      if (document.hidden) stopLoop();
      else if (isVisible) startLoop();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopLoop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, rootMargin, targetRef, tickRef]);
}
