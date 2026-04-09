"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

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
      <h1 className="text-[clamp(2.25rem,10vw,4rem)] font-bold tracking-tight chrome-text text-center leading-none px-2">
        ChromePeps
      </h1>
    </div>
  );
}

export function HeroLogo() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // SSR + mobile → static CSS logo (no WebGL, no animation loop)
  if (!mounted || !isDesktop) return <StaticLogo />;
  return <ChromeLogo3D />;
}
