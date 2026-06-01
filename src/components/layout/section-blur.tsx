/**
 * Progressive-Blur-Übergang zwischen einer hellen und einer dunklen Sektion.
 *
 * Als Geschwister-Element DIREKT ZWISCHEN die beiden Sektionen setzen — es
 * überlappt beide (negative Margins + z-index) und zeichnet die harte
 * Farbkante in einen weichen, gestaffelten Frost. Nutzt nur `backdrop-filter`
 * (keine Farben) → funktioniert für hell→dunkel UND dunkel→hell, ohne
 * Layout-Shift. Das eigentliche CSS lebt als `.section-blur` in globals.css.
 *
 * WICHTIG: Die angrenzenden Sektionen brauchen am Übergangsrand etwas
 * Innenabstand (≳ 48px / py-12), damit der Blur nur die Farbkante weichzeichnet
 * und NICHT über Text/Inhalt läuft.
 */
export function SectionBlur({ variant }: { variant?: "footer" }) {
  return (
    <div
      aria-hidden
      className={variant === "footer" ? "section-blur-footer" : "section-blur"}
    />
  );
}
