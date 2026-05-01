/**
 * Extrahiert Table-of-Contents-Items aus einem Markdown-Body. Sucht
 * H2- und H3-Headings, generiert deren Slug-IDs (gleicher Algorithmus
 * wie der ReactMarkdown-Renderer für h2/h3) und gibt eine flache Liste
 * für die <TocList>-Komponente zurück.
 *
 * Kein Markdown-Parser nötig — H2/H3 sind in 99 % der Fälle als
 * "## Title" / "### Subtitle" am Zeilenanfang. Edge-Cases (Setext-
 * Headings, escaped Markdown in Code-Blocks) werden ignoriert; der
 * Pillar-Content im Wissensbereich ist redaktionell kuratiert.
 */
export interface TocItem {
  id: string;
  label: string;
  lvl: 2 | 3;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function extractToc(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  // In Code-Blöcken (```...```) keine Headings extrahieren.
  let inCodeFence = false;

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trimEnd();
    if (line.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    const h2 = /^##\s+(.+?)\s*$/.exec(line);
    if (h2) {
      const label = h2[1].trim();
      items.push({ id: slugify(label), label, lvl: 2 });
      continue;
    }
    const h3 = /^###\s+(.+?)\s*$/.exec(line);
    if (h3) {
      const label = h3[1].trim();
      items.push({ id: slugify(label), label, lvl: 3 });
    }
  }

  return items;
}
