"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * FadeUp — fade-and-translate on scroll-into-view.
 *
 * Wichtig: Der initial-hidden State (opacity:0 + translateY) wird als
 * INLINE-Style am JSX-Element gesetzt, NICHT erst im useEffect. Früher
 * lief der useEffect erst nach Hydration — dazwischen blitzte der
 * voll sichtbare Content kurz auf, dann setzte useEffect opacity=0
 * (Pop), dann faded der Content ein. Auf above-the-fold Elementen
 * (HeroLogo, Headlines) war das als sichtbares Flimmern wahrnehmbar.
 *
 * Jetzt: SSR-Output ist bereits unsichtbar. Der useEffect setzt die
 * Transition an und flippt zu opacity:1 — keine visible flash mehr.
 */
function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animateIn = () => {
      setTimeout(() => {
        el.style.transition = "opacity 0.5s ease-out, transform 0.5s ease-out";
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }, delay * 1000);
    };

    // Check if already in viewport (above the fold)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      animateIn();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animateIn();
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: 0, transform: "translateY(24px)" }}
    >
      {children}
    </div>
  );
}

// Export directly as named export — NOT as object property.
// RSC cannot resolve component references from object properties.
export { FadeUp };
