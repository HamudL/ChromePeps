/**
 * Slugifiziert eine Heading-Children-Sequenz (kann Strings ODER React-
 * Nodes enthalten — react-markdown übergibt manchmal Inline-Code o.Ä.)
 * zu einem URL-/anchor-tauglichen ID-String.
 *
 * Pragmatisch: alle Strings rekursiv extrahieren, lowercased, alle
 * Nicht-Word-Chars zu "-", Mehrfach-"-" kollabieren, trim. Deutsche
 * Umlaute werden mit ihren transliterierten Formen gemappt.
 */
import type { ReactNode } from "react";

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (
    node &&
    typeof node === "object" &&
    "props" in node &&
    node.props &&
    typeof node.props === "object" &&
    "children" in node.props
  ) {
    return extractText((node.props as { children: ReactNode }).children);
  }
  return "";
}

export function slugifyHeading(children: ReactNode): string {
  const raw = extractText(children).toLowerCase().trim();
  const transliterated = raw
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
