import Link from "next/link";
import { BadgeCheck, FlaskConical, ShieldCheck } from "lucide-react";
import { APP_NAME, RESEARCH_DISCLAIMER } from "@/lib/constants";
import { NewsletterForm } from "@/components/shop/newsletter-form";

const SERVICE_LINKS = [
  { href: "/kontakt", label: "Kontakt" },
  { href: "/faq", label: "FAQ" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/qualitaetskontrolle", label: "Qualitätskontrolle" },
  { href: "/order-status", label: "Bestellung verfolgen" },
  { href: "/versand", label: "Versand" },
  { href: "/zahlung", label: "Zahlung" },
  { href: "/dashboard", label: "Mein Konto" },
] as const;

const LEGAL_LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB" },
  { href: "/widerruf", label: "Widerruf" },
] as const;

const TRUST_SIGNALS = [
  { icon: BadgeCheck, label: "HPLC · Janoshik-geprüft" },
  { icon: ShieldCheck, label: "Sichere Zahlung" },
  { icon: FlaskConical, label: "CoA zu jeder Charge" },
] as const;

/**
 * Footer — „Chromatogramm": dunkles Protokoll-Schlussblatt. Oben das
 * Mess-Lineal als Übergabe vom Seiteninhalt, dann ein editorialer
 * Claim-Block mit großer Fraunces-Marke, Link-Spalten, Specimen-Tags
 * und der Pflicht-Disclaimer als sauber gesetzte Fußnote.
 */
export function Footer() {
  return (
    <footer className="section-ink relative grain-overlay">
      <div className="absolute inset-0 apo-grid opacity-50" aria-hidden />
      <div className="container relative pt-16 pb-10">
        {/* Marken-Statement */}
        <div className="flex flex-col gap-6 border-b border-ink-border pb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">Analyse-Protokoll · Ende</span>
            <p className="display-title mt-4 text-4xl text-ink-foreground md:text-5xl">
              {APP_NAME}
              <span className="ml-3 font-display text-2xl italic text-ink-muted md:text-3xl">
                — gemessen, nicht versprochen.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {TRUST_SIGNALS.map((signal) => (
              <span key={signal.label} className="trust-pill">
                <signal.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                {signal.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-12 pt-12 md:grid-cols-12">
          {/* Newsletter */}
          <div className="col-span-2 md:col-span-6 lg:col-span-5">
            <span className="mono-label text-ink-muted">
              Newsletter · neue Chargen &amp; COAs
            </span>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              Forschungspeptide mit unabhängig per HPLC geprüfter Reinheit.
              Jede Charge erhält eine Lot-Nummer und ein Analysezertifikat —
              verifizierbar, nicht behauptet.
            </p>
            <div className="mt-6 max-w-sm">
              <NewsletterForm />
            </div>
          </div>

          {/* Spacer-Spalte auf Desktop für redaktionelle Asymmetrie */}
          <div className="hidden lg:col-span-1 lg:block" aria-hidden />

          {/* Service */}
          <div className="md:col-span-3">
            <span className="mono-label text-ink-muted">Service</span>
            <nav
              aria-label="Service"
              className="mt-5 flex flex-col gap-2.5 text-sm text-ink-muted"
            >
              {SERVICE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="w-fit gold-underline transition-colors hover:text-ink-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div className="md:col-span-3">
            <span className="mono-label text-ink-muted">Rechtliches</span>
            <nav
              aria-label="Rechtliches"
              className="mt-5 flex flex-col gap-2.5 text-sm text-ink-muted"
            >
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="w-fit gold-underline transition-colors hover:text-ink-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="tick-rule mt-14" aria-hidden />

        {/* Disclaimer + Copyright */}
        <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
            {RESEARCH_DISCLAIMER}
          </p>
          <p className="mono-tag shrink-0 text-ink-muted/80">
            &copy; {new Date().getFullYear()} {APP_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}
