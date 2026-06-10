"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Live-Search-Box für /wissen. Tippt-Debounce 300 ms; rendert ein
 * Dropdown unter dem Input mit bis zu 5 Treffern pro Resource
 * (BlogPost, Glossar, FAQ).
 *
 * Endpoint: GET /api/wissen/search?q=...
 *
 * Tasten:
 *  - ArrowDown/ArrowUp → aktive Option bewegen (mit Wrap-Around)
 *  - Enter → aktive Option öffnen
 *  - Esc → schließt Dropdown
 *  - Klick außerhalb → schließt Dropdown
 *
 * A11y: Combobox-Pattern (role="combobox" + aria-expanded/-controls/
 * -activedescendant am Input, role="listbox" am Dropdown, role="option"
 * an den Einträgen) — vorher war das Dropdown für Screenreader nur
 * eine unsichtbare Link-Liste ohne Bezug zum Suchfeld.
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
const LISTBOX_ID = "wissen-search-listbox";

export function WissenSearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // Index der per Pfeiltasten aktiven Option in der FLACHEN Options-
  // Liste (posts → glossar → faq); -1 = keine Option aktiv.
  const [activeIndex, setActiveIndex] = useState(-1);
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

  // Flache Options-Liste in Render-Reihenfolge — eine gemeinsame Quelle
  // für Pfeiltasten-Index, aria-activedescendant und Enter-Navigation.
  const options = useMemo(() => {
    if (!result) return [];
    return [
      ...result.posts.map((p) => ({
        id: `wissen-search-opt-post-${p.slug}`,
        href: `/wissen/${p.slug}`,
      })),
      ...result.glossar.map((g) => ({
        id: `wissen-search-opt-glossar-${g.slug}`,
        href: `/wissen/glossar#${g.slug}`,
      })),
      ...result.faq.map((f) => ({
        id: `wissen-search-opt-faq-${f.id}`,
        href: "/faq",
      })),
    ];
  }, [result]);

  // Neue Treffer → alte Pfeiltasten-Position ist bedeutungslos.
  useEffect(() => {
    setActiveIndex(-1);
  }, [result]);

  // Dropdown zu → keine aktive Option mehr (sonst zeigt
  // aria-activedescendant auf ein nicht gerendertes Element).
  useEffect(() => {
    if (!open) setActiveIndex(-1);
  }, [open]);

  // Aktive Option im scrollbaren Dropdown sichtbar halten.
  useEffect(() => {
    if (activeIndex < 0) return;
    const id = options[activeIndex]?.id;
    if (id) {
      document.getElementById(id)?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, options]);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (options.length === 0) return;
      // Caret-Sprung an Anfang/Ende des Inputs unterdrücken.
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((prev) => {
        if (e.key === "ArrowDown") {
          return prev >= options.length - 1 ? 0 : prev + 1;
        }
        return prev <= 0 ? options.length - 1 : prev - 1;
      });
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && options[activeIndex]) {
        e.preventDefault();
        setOpen(false);
        router.push(options[activeIndex].href);
      }
    }
  }

  const totalHits =
    (result?.posts.length ?? 0) +
    (result?.glossar.length ?? 0) +
    (result?.faq.length ?? 0);

  const dropdownOpen = open && result !== null;
  // Offsets der Sektionen innerhalb der flachen Options-Liste.
  const glossarOffset = result?.posts.length ?? 0;
  const faqOffset = glossarOffset + (result?.glossar.length ?? 0);

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
        onKeyDown={handleInputKeyDown}
        placeholder='Begriff, Substanz oder Methode suchen — z. B. „Tirzepatid HPLC"'
        className="input-search"
        aria-label="Im Wissensbereich suchen"
        role="combobox"
        aria-expanded={dropdownOpen}
        aria-controls={dropdownOpen ? LISTBOX_ID : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? options[activeIndex]?.id : undefined
        }
        aria-autocomplete="list"
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

      {dropdownOpen && result && (
        <div
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Suchergebnisse"
          className="absolute z-40 left-0 right-0 mt-2 max-h-[480px] overflow-y-auto rounded-md border border-border bg-card shadow-xl"
        >
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
              {result.posts.map((p, i) => (
                <Link
                  key={p.slug}
                  id={options[i]?.id}
                  role="option"
                  aria-selected={activeIndex === i}
                  href={`/wissen/${p.slug}`}
                  className={cn(
                    "block px-4 py-2.5 hover:bg-muted/40 transition-colors",
                    activeIndex === i && "bg-muted/40",
                  )}
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
              {result.glossar.map((g, i) => (
                <Link
                  key={g.slug}
                  id={options[glossarOffset + i]?.id}
                  role="option"
                  aria-selected={activeIndex === glossarOffset + i}
                  href={`/wissen/glossar#${g.slug}`}
                  className={cn(
                    "block px-4 py-2.5 hover:bg-muted/40 transition-colors",
                    activeIndex === glossarOffset + i && "bg-muted/40",
                  )}
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
              {result.faq.map((f, i) => (
                <Link
                  key={f.id}
                  id={options[faqOffset + i]?.id}
                  role="option"
                  aria-selected={activeIndex === faqOffset + i}
                  href="/faq"
                  className={cn(
                    "block px-4 py-2.5 hover:bg-muted/40 transition-colors",
                    activeIndex === faqOffset + i && "bg-muted/40",
                  )}
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
    // role="group" hält die Listbox-Struktur valide: Kinder einer
    // Listbox müssen Optionen oder Gruppen sein, nicht nackte Divs.
    <div
      role="group"
      aria-label={label}
      className="border-b border-border last:border-b-0"
    >
      <p
        aria-hidden="true"
        className="mono-tag text-muted-foreground bg-muted/30 px-4 py-1.5 sticky top-0"
        style={{ fontSize: 9 }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
