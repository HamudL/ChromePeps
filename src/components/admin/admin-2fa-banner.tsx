import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";

/**
 * Soft-Enforcement-Banner für Admins ohne aktivem 2FA.
 *
 * Wird in src/app/admin/layout.tsx über dem Page-Content gerendert,
 * wenn `User.totpEnabledAt` null ist. Kein Modal, keine Redirect —
 * Pflicht-2FA wäre ein separater Toggle und ist hier explizit
 * OUT-OF-SCOPE (User-Pick: soft + recovery codes).
 *
 * AUDIT_REPORT_v3 §4.2 + §6 PR 7.
 */

export function AdminTwoFactorBanner() {
  return (
    <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="flex-1 space-y-1">
          <p className="font-medium">
            Zwei-Faktor-Authentifizierung dringend empfohlen
          </p>
          <p className="text-amber-900/80">
            Als Admin hast du Vollzugriff auf Bestellungen und
            Kundendaten. Aktiviere 2FA, damit ein gestohlenes Passwort
            allein dein Konto nicht öffnet.
          </p>
        </div>
        <Link
          href="/dashboard/security/2fa"
          className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-100/60 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
        >
          Jetzt einrichten
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
