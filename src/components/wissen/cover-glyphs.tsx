/**
 * Inline-SVG-Glyphs für CoverPlaceholder — wenn ein Article kein
 * coverImage hat, wird statt eines generischen Stockfotos eine kleine,
 * neutrale Illustration gerendert. Vier Motive: HPLC-Kurve, Peptid-
 * Kette, Lyo-Drop, Lab-Grid.
 *
 * `currentColor` als Stroke — die Farbe kommt aus `.cover-ph .glyph`-
 * CSS-Selector, der auf den Card-Background abgestimmt ist.
 */

export function HplcCurveGlyph() {
  return (
    <svg
      width="180"
      height="80"
      viewBox="0 0 180 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <line x1="6" y1="68" x2="174" y2="68" strokeOpacity="0.4" />
      <line x1="6" y1="68" x2="6" y2="10" strokeOpacity="0.4" />
      <path
        d="M6 64 L36 60 L60 56 L78 50 L88 28 L92 12 L96 28 L106 50 L120 58 L150 62 L174 64"
        fill="none"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ChainGlyph() {
  return (
    <svg
      width="180"
      height="60"
      viewBox="0 0 180 60"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      {[18, 48, 78, 108, 138, 168].map((cx, i) => (
        <g key={cx}>
          <circle cx={cx} cy="30" r="10" fill="none" />
          <text
            x={cx}
            y="33.5"
            textAnchor="middle"
            fontFamily="var(--font-geist-mono), monospace"
            fontSize="9"
            fill="currentColor"
            stroke="none"
            opacity="0.7"
          >
            {["G", "H", "K", "P", "S", "V"][i]}
          </text>
          {i < 5 && <line x1={cx + 10} y1="30" x2={cx + 20} y2="30" />}
        </g>
      ))}
    </svg>
  );
}

export function GridGlyph() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
    >
      {[0, 1, 2, 3].flatMap((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={10 + c * 22}
            y={10 + r * 22}
            width="16"
            height="16"
            strokeOpacity={0.3 + (r + c) * 0.05}
          />
        )),
      )}
    </svg>
  );
}

export function DropGlyph() {
  return (
    <svg
      width="60"
      height="80"
      viewBox="0 0 60 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <path d="M30 8 C 18 30 12 44 12 54 a 18 18 0 0 0 36 0 C 48 44 42 30 30 8 Z" />
      <path d="M22 50 a 6 6 0 0 0 8 4" strokeOpacity="0.5" />
    </svg>
  );
}
