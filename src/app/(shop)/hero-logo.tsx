"use client";

import dynamic from "next/dynamic";

const ChromeLogo3D = dynamic(
  () =>
    import("@/components/shop/chrome-logo-3d").then((mod) => mod.ChromeLogo3D),
  {
    ssr: false,
    loading: () => (
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight chrome-text text-center">
        ChromePeps
      </h1>
    ),
  }
);

export function HeroLogo() {
  return <ChromeLogo3D />;
}
