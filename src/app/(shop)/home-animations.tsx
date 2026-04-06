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

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Animate in after delay
          setTimeout(() => {
            el.style.transition = "opacity 0.5s ease-out, transform 0.5s ease-out";
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, delay * 1000);
          observer.unobserve(el);
        }
      },
      { rootMargin: "-40px" }
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

export const HomeAnimations = {
  FadeUp,
};
