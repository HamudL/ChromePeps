"use client";

import { useMemo, useState } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { bucketLetter } from "@/lib/wissen/bucket-letter";
import { Callout } from "@/components/wissen/callout";

/**
 * Client-Wrapper für /wissen/glossar — handlet Live-Suche +
 * Buchstaben-Anchor-Bar (Sticky).
 *
 * Hero (Titel + Stats) wird vom Server-Component gerendert; dieser
 * Client-Block übernimmt ab der Such-Input.
 */

export interface GlossarTermDTO {
  slug: string;
  term: string;
  acronym: string | null;
  shortDef: string;
}

interface Props {
  terms: GlossarTermDTO[];
}

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function GlossarClient({ terms }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return terms;
    return terms.filter(
      (g) =>
        g.term.toLowerCase().includes(ql) ||
        (g.acronym && g.acronym.toLowerCase().includes(ql)) ||
        g.shortDef.toLowerCase().includes(ql),
    );
  }, [terms, q]);

  const grouped = useMemo(() => {
    const m: Record<string, GlossarTermDTO[]> = {};
    for (const g of filtered) {
      const bucket = bucketLetter(g.term);
      (m[bucket] ||= []).push(g);
    }
    return m;
  }, [filtered]);

  const presentLetters = useMemo(() => {
    const set = new Set<string>();
    for (const g of terms) set.add(bucketLetter(g.term));
    return set;
  }, [terms]);

  const groupKeys = Object.keys(grouped).sort();

  return (
    <>
      {/* Search */}
      <section className="container">
        <div className="relative max-w-[640px] mt-9">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Begriff suchen — z. B. „HPLC"  oder  „Lyophilisat"'
            className="input-search"
            aria-label="Glossar durchsuchen"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5"
              aria-label="Suche zurücksetzen"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {q && (
          <p
            className="mt-3 mono-label text-muted-foreground"
            style={{ fontSize: 10.5 }}
          >
            {filtered.length} Treffer für „{q}&ldquo;
          </p>
        )}
      </section>

      {/* Sticky A–Z bar */}
      <nav
        aria-label="Buchstaben"
        className="sticky top-0 z-30 border-b border-border mt-8"
        style={{
          background: "hsl(var(--background) / 0.96)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="container py-3 flex items-center gap-1 overflow-x-auto">
          <span
            className="mono-tag text-muted-foreground mr-3"
            style={{ fontSize: 10 }}
          >
            A–Z
          </span>
          {ALL_LETTERS.map((l) => {
            const has = presentLetters.has(l);
            return (
              <a
                key={l}
                href={has ? `#letter-${l}` : undefined}
                className={`letter-link ${!has ? "disabled" : ""}`}
              >
                {l}
              </a>
            );
          })}
        </div>
      </nav>

      {/* Letter sections */}
      <section className="container">
        <div className="max-w-[920px] mx-auto py-10 md:py-14">
          {groupKeys.length === 0 && (
            <p className="text-center py-16 text-muted-foreground">
              Keine Treffer. Versuchen Sie einen anderen Begriff.
            </p>
          )}
          {groupKeys.map((L) => (
            <section
              key={L}
              id={`letter-${L}`}
              className="mb-14 scroll-mt-24"
            >
              <header className="flex items-end gap-5 pb-2">
                <span
                  className="hash-anchor"
                  style={{ fontSize: 42, lineHeight: 1 }}
                  aria-hidden="true"
                >
                  #
                </span>
                <h2 className="font-serif text-[80px] md:text-[120px] leading-[0.85] tracking-[-0.04em] font-medium">
                  {L}
                </h2>
                <span
                  className="mono-tag text-muted-foreground mb-3 ml-auto"
                  style={{ fontSize: 10.5 }}
                >
                  {grouped[L].length}{" "}
                  {grouped[L].length === 1 ? "Eintrag" : "Einträge"}
                </span>
              </header>
              <dl className="border-b border-border">
                {grouped[L].map((g) => (
                  <div
                    className="glossary-entry scroll-mt-24"
                    key={g.slug}
                    id={g.slug}
                  >
                    <dt>
                      {g.term}
                      {g.acronym && <span className="abbr">{g.acronym}</span>}
                    </dt>
                    <dd>
                      {g.shortDef}
                      <span className="block mt-2">
                        <a
                          href={`#${g.slug}`}
                          className="font-mono text-[10.5px] text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                          style={{
                            letterSpacing: "0.12em",
                            textTransform: "uppercase",
                          }}
                        >
                          Anker <ArrowRight size={10} />
                        </a>
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </section>

      <section className="container pb-16">
        <div className="max-w-[920px] mx-auto">
          <Callout type="info" title="Mitwirken">
            Begriff fehlt oder Definition zu knapp? Schreibt an{" "}
            <a href="mailto:labs@chromepeps.com">labs@chromepeps.com</a> — wir
            kuratieren das Glossar laufend mit der wissenschaftlichen
            Community.
          </Callout>
        </div>
      </section>
    </>
  );
}
