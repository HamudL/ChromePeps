import { cn } from "@/lib/utils";

/**
 * Cover-Image-Fallback für Article-Cards ohne hinterlegtes coverImage.
 * Sechs Tint-Varianten + dark-Variante — der Cover-Stil leiht sich vom
 * Mockup, wo Karten ohne Bild dezent verschiedenartige Hintergründe
 * bekommen, damit ein Listing nicht visuell uniform wird.
 *
 * Glyph: optionale SVG-Illustration mittig — HPLC-Kurve (für Methodik),
 * Peptid-Kette, Lyo-Drop, etc. Kommt aus `cover-glyphs.tsx`.
 */

interface Props {
  variant?: "v1" | "v2" | "v3" | "v4" | "v5" | "v6";
  aspect?: string; // e.g. "16/10", "1/1", "4/3", "21/9"
  glyph?: "hplc" | "chain" | "drop" | "grid" | "flask" | "beaker" | "book" | "clipboard";
  dark?: boolean;
  className?: string;
  label?: string;
}

import {
  HplcCurveGlyph,
  ChainGlyph,
  DropGlyph,
  GridGlyph,
} from "./cover-glyphs";
import { Beaker, BookOpen, ClipboardList, FlaskConical } from "lucide-react";

const GLYPH_MAP = {
  hplc: <HplcCurveGlyph />,
  chain: <ChainGlyph />,
  drop: <DropGlyph />,
  grid: <GridGlyph />,
  flask: <FlaskConical size={48} strokeWidth={1.4} />,
  beaker: <Beaker size={48} strokeWidth={1.4} />,
  book: <BookOpen size={48} strokeWidth={1.4} />,
  clipboard: <ClipboardList size={48} strokeWidth={1.4} />,
};

export function CoverPlaceholder({
  variant = "v1",
  aspect = "16/10",
  glyph = "flask",
  dark = false,
  className,
  label,
}: Props) {
  const Glyph = GLYPH_MAP[glyph] ?? GLYPH_MAP.flask;
  return (
    <div
      className={cn("cover-ph", variant, dark && "dark", className)}
      style={{ aspectRatio: aspect }}
      role="img"
      aria-label={label ?? "Artikel-Cover Platzhalter"}
    >
      <div className="glyph">{Glyph}</div>
    </div>
  );
}
