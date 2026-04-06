import Link from "next/link";
import { APP_NAME, RESEARCH_DISCLAIMER } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t bg-chrome-50 dark:bg-chrome-950">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold chrome-text">{APP_NAME}</h3>
            <p className="text-sm text-muted-foreground">
              Premium research peptides with verified purity and comprehensive
              certificates of analysis.
            </p>
          </div>

          {/* Products */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Products</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/products?category=growth-hormone-peptides" className="hover:text-foreground transition-colors">GH Peptides</Link>
              <Link href="/products?category=metabolic-peptides" className="hover:text-foreground transition-colors">Metabolic Peptides</Link>
              <Link href="/products?category=research-blends" className="hover:text-foreground transition-colors">Research Blends</Link>
              <Link href="/products?category=cosmetic-peptides" className="hover:text-foreground transition-colors">Cosmetic Peptides</Link>
            </nav>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Account</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
              <Link href="/register" className="hover:text-foreground transition-colors">Create Account</Link>
              <Link href="/dashboard" className="hover:text-foreground transition-colors">My Orders</Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Information</h4>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Shipping Policy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Return Policy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
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
