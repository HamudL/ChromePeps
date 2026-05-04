"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

/**
 * Live-Search-Box für /wissen. Tippt-Debounce 300 ms; rendert ein
 * Dropdown unter dem Input mit bis zu 5 Treffern pro Resource
 * (BlogPost, Glossar, FAQ).
 *
 * Endpoint: GET /api/wissen/search?q=...
 *
 * Tasten:
 *  - Esc → schließt Dropdown
 *  - Klick außerhalb → schließt Dropdown
 *
 * AUDIT_REPORT_v3 §3.3.
 */

interface PostHit {
  slug: string;
  title: string;
  excerpt: string;
  category: { slug: string; name: string };
}
interface GlossarHit {
  slug: string;
  term: string;
  acronym: string | null;
  shortDef: string;
}
interface FaqHit {
  id: string;
  question: string;
  categoryName: string;
}

interface SearchResult {
  posts: PostHit[];
  glossar: GlossarHit[];
  faq: FaqHit[];
}

const DEBOUNCE_MS = 300;

export function WissenSearchBox() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside + Escape: Dropdown schließen.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  // Debounced fetch.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/wissen/search?q=${encodeURIComponent(trimmed)}`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (json?.success) {
          setResult(json.data);
          setOpen(true);
        } else {
          setResult({ posts: [], glossar: [], faq: [] });
        }
      } catch {
        setResult({ posts: [], glossar: [], faq: [] });
      }
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  const totalHits =
    (result?.posts.length ?? 0) +
    (result?.glossar.length ?? 0) +
    (result?.faq.length ?? 0);

  return (
    <div ref={containerRef} className="max-w-[640px] relative">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => result && setOpen(true)}
        placeholder='Begriff, Substanz oder Methode suchen — z. B. „Tirzepatid HPLC"'
        className="input-search"
        aria-label="Im Wissensbereich suchen"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setResult(null);
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5"
          aria-label="Suche zurücksetzen"
        >
          <X size={14} />
        </button>
      )}

      {open && result && (
        <div className="absolute z-40 left-0 right-0 mt-2 max-h-[480px] overflow-y-auto rounded-md border border-border bg-white shadow-xl">
          {loading && (
            <p className="p-4 text-xs text-muted-foreground">Suche läuft…</p>
          )}
          {!loading && totalHits === 0 && (
            <p className="p-4 text-xs text-muted-foreground italic">
              Keine Treffer für „{query}&ldquo;.
            </p>
          )}

          {result.posts.length > 0 && (
            <Section label="Artikel">
              {result.posts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/wissen/${p.slug}`}
                  className="block px-4 py-2.5 hover:bg-muted/40 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <p className="text-sm font-medium line-clamp-1">
                    {p.title}
                  </p>
                  <p
                    className="mt-0.5 mono-tag text-muted-foreground"
                    style={{ fontSize: 9 }}
                  >
                    {p.category.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {p.excerpt}
                  </p>
                </Link>
              ))}
            </Section>
          )}

          {result.glossar.length > 0 && (
            <Section label="Glossar">
              {result.glossar.map((g) => (
                <Link
                  key={g.slug}
                  href={`/wissen/glossar#${g.slug}`}
                  className="block px-4 py-2.5 hover:bg-muted/40 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <p className="text-sm">
                    <span className="font-semibold">{g.term}</span>
                    {g.acronym && (
                      <span
                        className="ml-2 mono-tag text-muted-foreground"
                        style={{ fontSize: 9 }}
                      >
                        {g.acronym}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {g.shortDef}
                  </p>
                </Link>
              ))}
            </Section>
          )}

          {result.faq.length > 0 && (
            <Section label="FAQ">
              {result.faq.map((f) => (
                <Link
                  key={f.id}
                  href="/faq"
                  className="block px-4 py-2.5 hover:bg-muted/40 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <p className="text-sm font-medium line-clamp-1">
                    {f.question}
                  </p>
                  <p
                    className="mt-0.5 mono-tag text-muted-foreground"
                    style={{ fontSize: 9 }}
                  >
                    {f.categoryName}
                  </p>
                </Link>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <p
        className="mono-tag text-muted-foreground bg-muted/30 px-4 py-1.5 sticky top-0"
        style={{ fontSize: 9 }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
