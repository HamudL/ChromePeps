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
      email: true,
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
        <h1 className="text-2xl font-bold tracking-tight">Sicherheit · 2FA</h1>
        <p className="text-muted-foreground">
          Zwei-Faktor-Authentifizierung mit TOTP-Authenticator-App
          (Google Authenticator, Authy, 1Password, Bitwarden, …).
        </p>
      </div>

      {/* Status-Karte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEnabled ? (
              <>
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                2FA ist aktiv
              </>
            ) : (
              <>
                <ShieldAlert
                  className={
                    isAdmin
                      ? "h-5 w-5 text-amber-600"
                      : "h-5 w-5 text-muted-foreground"
                  }
                />
                2FA ist NICHT aktiv
              </>
            )}
          </CardTitle>
          <CardDescription>
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
            <p className="text-sm text-muted-foreground">
              Verbleibende Recovery-Codes:{" "}
              <strong className="text-foreground">
                {remainingRecoveryCodes} / 10
              </strong>
              {remainingRecoveryCodes <= 3 && remainingRecoveryCodes > 0 && (
                <span className="ml-2 text-amber-700">
                  — Du solltest neue generieren, bevor sie alle aufgebraucht sind.
                </span>
              )}
              {remainingRecoveryCodes === 0 && (
                <span className="ml-2 text-rose-700">
                  — Alle Recovery-Codes verbraucht. Bitte neue generieren!
                </span>
              )}
            </p>
          </CardContent>
        )}
      </Card>

      <TwoFactorSetupClient
        isEnabled={isEnabled}
        userEmail={user.email}
        remainingRecoveryCodes={remainingRecoveryCodes}
      />
    </div>
  );
}
