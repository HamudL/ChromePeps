"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Three.js (~540 KB raw / ~150 KB gzip) wird NUR geladen wenn:
//   - User ist auf Desktop (>= 768 px) UND
//   - User hat KEIN `prefers-reduced-motion: reduce` gesetzt
// Auf Mobile ODER Reduced-Motion bleibt's beim StaticLogo — der
// dynamic-Import wird dann gar nicht ausgelöst, also kein Network-
// Request. AUDIT_REPORT_v3 §6 PR 11.
const ChromeLogo3D = dynamic(
  () =>
    import("@/components/shop/chrome-logo-3d").then((mod) => mod.ChromeLogo3D),
  {
    ssr: false,
  }
);

function StaticLogo() {
  return (
    <div className="relative w-full flex items-center justify-center py-4 sm:py-6">
      <h1 className="text-[clamp(2.5rem,12vw,5rem)] font-bold tracking-tight chrome-text text-center leading-none px-2">
        ChromePeps
      </h1>
    </div>
  );
}

export function HeroLogo() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mqDesktop = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mqDesktop.matches);
    const desktopHandler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mqDesktop.addEventListener("change", desktopHandler);

    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mqMotion.matches);
    const motionHandler = (e: MediaQueryListEvent) =>
      setPrefersReducedMotion(e.matches);
    mqMotion.addEventListener("change", motionHandler);

    return () => {
      mqDesktop.removeEventListener("change", desktopHandler);
      mqMotion.removeEventListener("change", motionHandler);
    };
  }, []);

  // SSR + mobile + reduced-motion → static CSS logo (kein WebGL, kein
  // Three.js-Download, keine Animation-Loop).
  if (!mounted || !isDesktop || prefersReducedMotion) return <StaticLogo />;
  // Desktop WebGL logo has no DOM heading — add a visually hidden h1 so the
  // page retains its document outline for screen readers and assistive tech.
  return (
    <>
      <h1 className="sr-only">ChromePeps — Premium Forschungspeptide</h1>
      <ChromeLogo3D />
    </>
  );
}
