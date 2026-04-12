import Link from "next/link";
import { APP_NAME, RESEARCH_DISCLAIMER } from "@/lib/constants";
import { NewsletterForm } from "@/components/shop/newsletter-form";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 space-y-3">
            <h3 className="text-lg font-bold chrome-text">{APP_NAME}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Premium-Forschungspeptide mit verifizierter Reinheit und
              umfassenden Analysezertifikaten.
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Newsletter</p>
              <NewsletterForm />
            </div>
          </div>

          {/* Products */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Produkte</h4>
            <nav aria-label="Produkte" className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/products?category=growth-hormone-peptides" className="hover:text-foreground transition-colors">GH Peptides</Link>
              <Link href="/products?category=metabolic-peptides" className="hover:text-foreground transition-colors">Metabolic Peptides</Link>
              <Link href="/products?category=research-blends" className="hover:text-foreground transition-colors">Research Blends</Link>
              <Link href="/products?category=cosmetic-peptides" className="hover:text-foreground transition-colors">Cosmetic Peptides</Link>
            </nav>
          </div>

          {/* Service / Account */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Service</h4>
            <nav aria-label="Service" className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/kontakt" className="hover:text-foreground transition-colors">Kontakt</Link>
              <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
              <Link href="/ueber-uns" className="hover:text-foreground transition-colors">Über uns</Link>
              <Link href="/qualitaetskontrolle" className="hover:text-foreground transition-colors">Qualitätskontrolle</Link>
              <Link href="/analysezertifikate" className="hover:text-foreground transition-colors">Analysezertifikate</Link>
              <Link href="/versand" className="hover:text-foreground transition-colors">Versand</Link>
              <Link href="/zahlung" className="hover:text-foreground transition-colors">Zahlung</Link>
              <Link href="/dashboard" className="hover:text-foreground transition-colors">Mein Konto</Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Rechtliches</h4>
            <nav aria-label="Rechtliches" className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
              <Link href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
              <Link href="/agb" className="hover:text-foreground transition-colors">AGB</Link>
              <Link href="/widerruf" className="hover:text-foreground transition-colors">Widerruf</Link>
            </nav>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 pt-8 border-t">
          <p className="text-xs text-muted-foreground/70 text-center max-w-3xl mx-auto">
            {RESEARCH_DISCLAIMER}
          </p>
          <p className="text-xs text-muted-foreground/50 text-center mt-4">
            &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
