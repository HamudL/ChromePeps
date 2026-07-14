import Link from "next/link";
import { APP_NAME, RESEARCH_DISCLAIMER } from "@/lib/constants";
import { NewsletterForm } from "@/components/shop/newsletter-form";

/**
 * Footer in drei ruhigen Zeilen:
 *
 *  1. Marke + Kurzbeschreibung links, Newsletter rechts
 *  2. Vier gleich breite, thematisch sortierte Link-Spalten
 *     (Shop / Hilfe & Service / Unternehmen / Rechtliches)
 *  3. Research-Disclaimer + Copyright, zentriert
 *
 * Die Link-Spalten sind bewusst ausbalanciert (3–4 Einträge pro
 * Spalte) — neue Links bitte in die passende Kategorie einsortieren
 * statt eine Spalte wachsen zu lassen.
 */

const FOOTER_NAV: {
  heading: string;
  links: { href: string; label: string }[];
}[] = [
  {
    heading: "Shop",
    links: [
      { href: "/products", label: "Alle Produkte" },
      { href: "/order-status", label: "Bestellung verfolgen" },
      { href: "/dashboard", label: "Mein Konto" },
    ],
  },
  {
    heading: "Hilfe & Service",
    links: [
      { href: "/kontakt", label: "Kontakt" },
      { href: "/faq", label: "FAQ" },
      { href: "/versand", label: "Versand" },
      { href: "/zahlung", label: "Zahlung" },
    ],
  },
  {
    heading: "Unternehmen",
    links: [
      { href: "/ueber-uns", label: "Über uns" },
      { href: "/qualitaetskontrolle", label: "Qualitätskontrolle" },
      { href: "/wissen", label: "Wissen" },
    ],
  },
  {
    heading: "Rechtliches",
    links: [
      { href: "/impressum", label: "Impressum" },
      { href: "/datenschutz", label: "Datenschutz" },
      { href: "/agb", label: "AGB" },
      { href: "/widerruf", label: "Widerruf" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="section-dark">
      <div className="container pt-14 pb-10">
        {/* Zeile 1 — Marke + Newsletter */}
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start pb-10 border-b border-white/10">
          <div className="space-y-3">
            <h3 className="text-lg font-bold chrome-text">{APP_NAME}</h3>
            <p className="text-sm text-white/50 max-w-sm">
              Forschungspeptide mit unabhängig per HPLC geprüfter Reinheit.
              Jede Charge wird mit Analysezertifikat ausgeliefert.
            </p>
          </div>
          <div className="space-y-2 w-full max-w-md lg:justify-self-end">
            <p className="text-sm font-medium text-white/80">Newsletter</p>
            <NewsletterForm />
          </div>
        </div>

        {/* Zeile 2 — Link-Spalten */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10 py-10">
          {FOOTER_NAV.map((column) => (
            <div key={column.heading} className="space-y-3">
              <h4 className="text-sm font-semibold text-white/80">
                {column.heading}
              </h4>
              <nav
                aria-label={column.heading}
                className="flex flex-col gap-2 text-sm text-white/60"
              >
                {column.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        {/* Zeile 3 — Disclaimer + Copyright */}
        <div className="pt-8 border-t border-white/10">
          <p className="text-xs text-white/60 text-center max-w-3xl mx-auto">
            {RESEARCH_DISCLAIMER}
          </p>
          <p className="text-xs text-white/50 text-center mt-4">
            &copy; {new Date().getFullYear()} {APP_NAME}. Alle Rechte
            vorbehalten.
          </p>
        </div>
      </div>
    </footer>
  );
}
