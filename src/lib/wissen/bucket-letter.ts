/**
 * Mappt einen Begriff auf seinen A–Z-Glossar-Bucket. Deutsche Umlaute
 * landen bei der ungezeichneten Variante (Ä→A, Ö→O, Ü→U), Eszett unter S.
 *
 * Begriffe die mit einem Sonderzeichen oder einer Zahl anfangen werden
 * unter "#" gebucket — eigene Sektion am Ende der A–Z-Liste.
 */
export function bucketLetter(term: string): string {
  if (!term) return "#";
  const trimmed = term.trim();
  if (!trimmed) return "#";

  // Erst die Sonderfall-Mappings VOR toUpperCase() anwenden — sonst
  // expandiert "ß".toUpperCase() zu "SS" und der Bucket wäre verloren.
  const first = trimmed.charAt(0);
  const mapped: Record<string, string> = {
    ä: "A",
    Ä: "A",
    ö: "O",
    Ö: "O",
    ü: "U",
    Ü: "U",
    ß: "S",
  };
  const direct = mapped[first];
  if (direct) return direct;

  const upper = first.toUpperCase();
  // Nur lateinische Großbuchstaben A–Z gelten als reguläre Buckets.
  if (upper.length === 1 && upper >= "A" && upper <= "Z") return upper;
  return "#";
}
