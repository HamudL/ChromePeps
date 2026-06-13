export const dynamic = "force-dynamic";

import { format } from "date-fns";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { requireAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TwoFactorSetupClient } from "@/components/dashboard/two-factor-setup-client";

/**
 * /dashboard/security/2fa
 *
 * Setup-Hub für TOTP-Zwei-Faktor-Authentifizierung. Liest den
 * aktuellen Status (aktiv ja/nein, wann eingerichtet, wieviele
 * Recovery-Codes verbleibend) und delegiert dann an einen
 * Client-Component, der die Setup/Disable/Regenerate-Flows handlet.
 *
 * AUDIT_REPORT_v3 §4.2 + §6 PR 7.
 */

export default async function TwoFactorSettingsPage() {
  const session = await requireAuth();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      totpEnabledAt: true,
      totpRecoveryCodes: true,
    },
  });
  if (!user) {
    // Sollte nicht passieren — requireAuth garantiert eine valide Session.
    return null;
  }

  const isEnabled = !!user.totpEnabledAt;
  const remainingRecoveryCodes = user.totpRecoveryCodes.length;
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Sicherheit</span>
        <h2 className="display-title mt-2 text-2xl">Zwei-Faktor-Authentifizierung</h2>
        <p className="mt-1 text-muted-foreground">
          Zusätzlicher Schutz mit TOTP-Authenticator-App
          (Google Authenticator, Authy, 1Password, Bitwarden, …).
        </p>
        <div className="tick-rule mt-4" aria-hidden />
      </div>

      {/* Status-Karte — Ink-Panel als bewusster Sicherheits-Fokus */}
      <Card variant="ink" className="card-ink overflow-hidden">
        <CardHeader>
          <span className="eyebrow">Status</span>
          <CardTitle className="mt-2 flex items-center gap-2 text-ink-foreground">
            {isEnabled ? (
              <>
                <ShieldCheck className="h-5 w-5 text-primary" />
                2FA ist aktiv
              </>
            ) : (
              <>
                <ShieldAlert
                  className={
                    isAdmin
                      ? "h-5 w-5 text-primary"
                      : "h-5 w-5 text-ink-muted"
                  }
                />
                2FA ist nicht aktiv
              </>
            )}
          </CardTitle>
          <CardDescription className="text-ink-muted">
            {isEnabled
              ? `Aktiviert am ${format(new Date(user.totpEnabledAt!), "dd.MM.yyyy HH:mm")}.
                Bei jedem Login wird zusätzlich zu Email und Passwort
                ein 6-stelliger Code aus deiner Authenticator-App
                abgefragt.`
              : isAdmin
                ? "Als Admin solltest du 2FA aktivieren — du hast Vollzugriff auf Bestellungen und Kundendaten. Aktivieren ist nicht erzwungen, aber dringend empfohlen."
                : "Optional. Erhöht den Schutz deines Kontos gegen Passwort-Diebstahl."}
          </CardDescription>
        </CardHeader>
        {isEnabled && (
          <CardContent>
            <p className="text-sm text-ink-muted">
              Verbleibende Recovery-Codes:{" "}
              <strong className="text-ink-foreground tabular-nums">
                {remainingRecoveryCodes} / 10
              </strong>
              {remainingRecoveryCodes <= 3 && remainingRecoveryCodes > 0 && (
                <span className="ml-2 text-primary">
                  — Du solltest neue generieren, bevor sie alle aufgebraucht sind.
                </span>
              )}
              {remainingRecoveryCodes === 0 && (
                <span className="ml-2 font-medium text-[hsl(0_72%_62%)]">
                  — Alle Recovery-Codes verbraucht. Bitte neue generieren!
                </span>
              )}
            </p>
          </CardContent>
        )}
      </Card>

      <TwoFactorSetupClient
        isEnabled={isEnabled}
        remainingRecoveryCodes={remainingRecoveryCodes}
      />
    </div>
  );
}
