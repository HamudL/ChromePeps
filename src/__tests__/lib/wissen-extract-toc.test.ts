import { describe, expect, it } from "vitest";
import { extractToc } from "@/lib/wissen/extract-toc";

describe("extractToc", () => {
  it("extrahiert H2/H3-Headings in Reihenfolge", () => {
    const md = `## Einleitung
text

### Sub
more text

## Methode

### Säulenwahl

text`;
    const toc = extractToc(md);
    expect(toc.map((t) => t.lvl)).toEqual([2, 3, 2, 3]);
    expect(toc.map((t) => t.label)).toEqual([
      "Einleitung",
      "Sub",
      "Methode",
      "Säulenwahl",
    ]);
  });

  it("slugifiziert Umlaute zu ascii-IDs", () => {
    const md = `## Säulenwahl & Mobilphase`;
    const toc = extractToc(md);
    expect(toc[0].id).toBe("saeulenwahl-mobilphase");
  });

  it("ignoriert Headings innerhalb von Code-Blöcken", () => {
    const md = `## Echt

\`\`\`text
## Im Code-Block sollte nicht als TOC auftauchen
\`\`\`

## Auch echt`;
    const toc = extractToc(md);
    expect(toc.map((t) => t.label)).toEqual(["Echt", "Auch echt"]);
  });

  it("ignoriert H1 und H4+", () => {
    const md = `# Title (H1, kein TOC)
## Sektion
#### Klein (H4, kein TOC)
### Sub`;
    const toc = extractToc(md);
    expect(toc.map((t) => t.label)).toEqual(["Sektion", "Sub"]);
  });

  it("returnt leere Liste bei keinen Headings", () => {
    expect(extractToc("nur paragraph")).toEqual([]);
    expect(extractToc("")).toEqual([]);
  });
});
