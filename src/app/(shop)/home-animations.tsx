"use client";

import { useEffect, useRef, type ReactNode } from "react";

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

    // Apply initial hidden state
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";

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
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// Export directly as named export — NOT as object property.
// RSC cannot resolve component references from object properties.
export { FadeUp };
