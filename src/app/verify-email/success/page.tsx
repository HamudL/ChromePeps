import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  // Kein "| ChromePeps"-Suffix - kommt vom title-Template des Root-Layouts
  // (sonst doppelter Brand-Suffix).
  title: "E-Mail bestätigt",
};

export default function VerifyEmailSuccessPage() {
  return (
    <div className="hero-ambient flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md border border-border bg-card p-8">
        {/* Protokoll-Kopfzeile */}
        <div className="flex items-baseline justify-between gap-4">
          <span className="mono-label text-muted-foreground">
            E-Mail-Verifikation
          </span>
          <span className="mono-label text-success">Bestätigt</span>
        </div>
        <div className="tick-rule mt-4" aria-hidden="true" />

        <div className="mt-6 flex items-start gap-3">
          <CheckCircle2
            className="mt-1 h-5 w-5 shrink-0 text-success"
            aria-hidden="true"
          />
          <div>
            <h1 className="display-title text-2xl">E-Mail bestätigt</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Vielen Dank! Ihre E-Mail-Adresse wurde erfolgreich bestätigt.
            </p>
          </div>
        </div>

        <p className="mt-5 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
          Sie erhalten ab jetzt alle Bestell- und Kontobenachrichtigungen an
          Ihre hinterlegte Adresse.
        </p>

        <div className="mt-7">
          <Button asChild variant="gold" className="w-full">
            <Link href="/dashboard">Zum Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
