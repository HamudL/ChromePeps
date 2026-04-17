import Link from "next/link";
import { APP_NAME, RESEARCH_DISCLAIMER } from "@/lib/constants";
import { NewsletterForm } from "@/components/shop/newsletter-form";

export function Footer() {
  return (
    <footer className="section-dark border-t border-white/5">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 space-y-3">
            <h3 className="text-lg font-bold chrome-text">{APP_NAME}</h3>
            <p className="text-sm text-white/50 max-w-sm">
              Premium-Forschungspeptide mit verifizierter Reinheit und
              umfassenden Analysezertifikaten.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-white/80">Newsletter</p>
              <NewsletterForm />
            </div>
          </div>

          {/* Service */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/80">Service</h4>
            <nav aria-label="Service" className="flex flex-col gap-2 text-sm text-white/60">
              <Link href="/kontakt" className="hover:text-white transition-colors">Kontakt</Link>
              <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
              <Link href="/ueber-uns" className="hover:text-white transition-colors">Über uns</Link>
              <Link href="/qualitaetskontrolle" className="hover:text-white transition-colors">Qualitätskontrolle</Link>
              <Link href="/order-status" className="hover:text-white transition-colors">Bestellung verfolgen</Link>
              <Link href="/versand" className="hover:text-white transition-colors">Versand</Link>
              <Link href="/zahlung" className="hover:text-white transition-colors">Zahlung</Link>
              <Link href="/dashboard" className="hover:text-white transition-colors">Mein Konto</Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/80">Rechtliches</h4>
            <nav aria-label="Rechtliches" className="flex flex-col gap-2 text-sm text-white/60">
              <Link href="/impressum" className="hover:text-white transition-colors">Impressum</Link>
              <Link href="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
              <Link href="/agb" className="hover:text-white transition-colors">AGB</Link>
              <Link href="/widerruf" className="hover:text-white transition-colors">Widerruf</Link>
            </nav>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-8 border-t border-white/10">
          <p className="text-xs text-white/60 text-center max-w-3xl mx-auto">
            {RESEARCH_DISCLAIMER}
          </p>
          <p className="text-xs text-white/50 text-center mt-4">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
