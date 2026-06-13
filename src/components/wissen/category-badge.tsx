import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Mono-Tag-Badge für Kategorie-Labels in Article-Cards und
 * Article-Headers — eckiges Specimen-Etikett. Vier Farb-Varianten:
 * default (Card auf Border), gold (historischer Name; Viridian-Outline
 * auf Mint-Wash), ink (Outline auf dunklem Bg), solid (Viridian-Fläche
 * für Featured-Markierungen).
 */

interface Props {
  children: ReactNode;
  color?: "default" | "gold" | "ink" | "solid";
  className?: string;
}

const VARIANTS: Record<NonNullable<Props["color"]>, string> = {
  default: "border-border bg-card text-foreground/85",
  gold: "border-primary/50 bg-accent text-primary-strong",
  ink: "border-primary/50 bg-transparent text-primary",
  solid: "bg-primary text-primary-foreground border-primary",
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
