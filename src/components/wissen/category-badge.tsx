import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Mono-Tag-Badge für Kategorie-Labels in Article-Cards und
 * Article-Headers. Vier Farb-Varianten: default (white auf border),
 * gold (Outline + warm-bg), ink (Outline auf dunklem Bg), solid
 * (Gold-Fläche, für Featured-Markierung).
 */

interface Props {
  children: ReactNode;
  color?: "default" | "gold" | "ink" | "solid";
  className?: string;
}

const VARIANTS: Record<NonNullable<Props["color"]>, string> = {
  default: "border-border bg-white text-foreground/85",
  gold: "border-primary bg-amber-50/80 text-amber-700",
  ink: "border-primary/50 bg-transparent text-primary",
  solid: "bg-primary text-ink border-primary",
};

export function CategoryBadge({
  children,
  color = "default",
  className,
}: Props) {
  return (
    <span
      className={cn(
        "mono-tag inline-flex items-center px-2.5 py-1 rounded-sm border",
        VARIANTS[color],
        className,
      )}
      style={{ letterSpacing: "0.18em" }}
    >
      {children}
    </span>
  );
}
