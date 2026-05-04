"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Copy, Check, Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * 2FA-Setup-Client.
 *
 * Drei sichtbare Modi:
 * 1. Disabled + button "Aktivieren" → POST /setup → zeigt QR + Secret
 *    + TOTP-Input → POST /verify → zeigt Recovery-Codes (einmalig).
 * 2. Enabled + buttons "Recovery-Codes neu generieren" und
 *    "2FA deaktivieren".
 *
 * AUDIT_REPORT_v3 §4.2 + §6 PR 7.
 */

interface Props {
  isEnabled: boolean;
  userEmail: string;
  remainingRecoveryCodes: number;
}

type SetupData = {
  secret: string;
  qrDataUrl: string;
};

export function TwoFactorSetupClient({
  isEnabled,
  remainingRecoveryCodes,
}: Props) {
  const router = useRouter();

  // Setup-Flow-State
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Recovery-Codes-Display nach Verify oder Regenerate
  const [shownRecoveryCodes, setShownRecoveryCodes] = useState<string[] | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  // Disable-Dialog
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  // Regenerate-Dialog
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenPassword, setRegenPassword] = useState("");
  const [regenTotp, setRegenTotp] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  async function startSetup() {
    setSetupError(null);
    setSetupLoading(true);
    try {
      const res = await fetch("/api/security/2fa/setup", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        setSetupError(json.error ?? "Setup fehlgeschlagen.");
        return;
      }
      setSetupData(json.data);
    } catch {
      setSetupError("Netzwerkfehler.");
    } finally {
      setSetupLoading(false);
    }
  }

  async function verifySetup() {
    setSetupError(null);
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/security/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        setSetupError(json.error ?? "Code ungültig.");
        return;
      }
      setShownRecoveryCodes(json.data.recoveryCodes);
      setSetupData(null);
      setVerifyCode("");
      router.refresh();
    } catch {
      setSetupError("Netzwerkfehler.");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function disableTwoFactor() {
    setDisableError(null);
    setDisableLoading(true);
    try {
      const res = await fetch("/api/security/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setDisableError(json.error ?? "Deaktivierung fehlgeschlagen.");
        return;
      }
      setDisableOpen(false);
      setDisablePassword("");
      setDisableCode("");
      router.refresh();
    } catch {
      setDisableError("Netzwerkfehler.");
    } finally {
      setDisableLoading(false);
    }
  }

  async function regenerateRecoveryCodes() {
    setRegenError(null);
    setRegenLoading(true);
    try {
      const res = await fetch("/api/security/2fa/recovery-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: regenPassword,
          totpCode: regenTotp.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setRegenError(json.error ?? "Generierung fehlgeschlagen.");
        return;
      }
      setShownRecoveryCodes(json.data.recoveryCodes);
      setRegenOpen(false);
      setRegenPassword("");
      setRegenTotp("");
      router.refresh();
    } catch {
      setRegenError("Netzwerkfehler.");
    } finally {
      setRegenLoading(false);
    }
  }

  function copyRecoveryCodes() {
    if (!shownRecoveryCodes) return;
    navigator.clipboard.writeText(shownRecoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadRecoveryCodes() {
    if (!shownRecoveryCodes) return;
    const text = `ChromePeps 2FA Recovery-Codes\nGeneriert am ${new Date().toISOString()}\n\n${shownRecoveryCodes.join("\n")}\n\nJeder Code ist nur einmal verwendbar.\n`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chromepeps-2fa-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // Recovery-Codes-Anzeige (One-Shot, blockiert alles andere)
  // ============================================================
  if (shownRecoveryCodes) {
    return (
      <Card className="border-emerald-300 bg-emerald-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <AlertTriangle className="h-5 w-5" />
            Speichere diese Recovery-Codes JETZT
          </CardTitle>
          <CardDescription className="text-emerald-900/80">
            Du siehst diese Codes nur einmal. Bewahre sie an einem
            sicheren Ort auf — sie sind dein Notausgang, falls du den
            Zugriff auf deine Authenticator-App verlierst. Jeder Code
            ist nach einmaliger Verwendung verbraucht.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-md border border-emerald-300 bg-white p-4 font-mono text-sm">
            {shownRecoveryCodes.map((code) => (
              <div key={code} className="text-center">
                {code}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={copyRecoveryCodes}
              className="flex-1"
            >
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Kopiert!" : "In Zwischenablage"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={downloadRecoveryCodes}
              className="flex-1"
            >
              <Download className="mr-2 h-4 w-4" />
              Als .txt herunterladen
            </Button>
          </div>
          <Button
            type="button"
            onClick={() => setShownRecoveryCodes(null)}
            className="w-full"
          >
            Ich habe die Codes gespeichert — schließen
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Setup-Phase: QR + Verify-Code-Input sichtbar
  // ============================================================
  if (setupData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schritt 2: Code aus deiner App eingeben</CardTitle>
          <CardDescription>
            Scanne den QR-Code mit deiner Authenticator-App ODER tippe das
            Secret manuell ab. Dann bestätige mit dem ersten 6-stelligen
            Code, den die App anzeigt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-3 rounded-md border bg-muted/30 p-4">
            <Image
              src={setupData.qrDataUrl}
              alt="QR-Code für TOTP-Authenticator"
              width={240}
              height={240}
              unoptimized
              className="rounded bg-white p-2"
            />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Manuelles Setup-Secret:
              </p>
              <code className="text-sm font-mono tracking-wider">
                {setupData.secret}
              </code>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verifyCode">6-stelliger Code aus der App</Label>
            <Input
              id="verifyCode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              autoComplete="one-time-code"
              autoFocus
            />
          </div>

          {setupError && (
            <p className="text-sm text-destructive">{setupError}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSetupData(null);
                setVerifyCode("");
                setSetupError(null);
              }}
              disabled={verifyLoading}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={verifySetup}
              disabled={verifyLoading || verifyCode.length !== 6}
              className="flex-1"
            >
              {verifyLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Aktivieren
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================
  // Default: Aktivieren (wenn disabled) ODER Manage (wenn enabled)
  // ============================================================
  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>2FA aktivieren</CardTitle>
          <CardDescription>
            Du brauchst eine Authenticator-App auf deinem Smartphone:
            Google Authenticator, Authy, 1Password, Bitwarden, …
          </CardDescription>
        </CardHeader>
        <CardContent>
          {setupError && (
            <p className="mb-3 text-sm text-destructive">{setupError}</p>
          )}
          <Button onClick={startSetup} disabled={setupLoading}>
            {setupLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Schritt 1: Setup starten
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 2FA aktiv — Manage-Buttons
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recovery-Codes neu generieren</CardTitle>
          <CardDescription>
            Ersetzt alle bestehenden Codes. Aktuell verbleibend:{" "}
            {remainingRecoveryCodes} / 10.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setRegenOpen(true)} variant="outline">
            Neue Codes generieren
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">2FA deaktivieren</CardTitle>
          <CardDescription>
            Verlangt Bestätigung mit Passwort + 2FA-Code (TOTP oder
            Recovery). Nach dem Deaktivieren wird beim Login nur noch
            Email und Passwort abgefragt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setDisableOpen(true)}
          >
            2FA deaktivieren
          </Button>
        </CardContent>
      </Card>

      {/* === Disable-Dialog === */}
      <AlertDialog
        open={disableOpen}
        onOpenChange={(open) => {
          if (!disableLoading) {
            setDisableOpen(open);
            if (!open) {
              setDisablePassword("");
              setDisableCode("");
              setDisableError(null);
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>2FA wirklich deaktivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Bestätige mit deinem Passwort und einem aktuellen TOTP-Code
              ODER Recovery-Code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="disablePassword">Passwort</Label>
              <Input
                id="disablePassword"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                autoComplete="current-password"
                disabled={disableLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="disableCode">2FA-Code</Label>
              <Input
                id="disableCode"
                type="text"
                placeholder="123456 oder XXXX-XXXX"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                disabled={disableLoading}
              />
            </div>
            {disableError && (
              <p className="text-sm text-destructive">{disableError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disableLoading}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                disableTwoFactor();
              }}
              disabled={
                disableLoading ||
                disablePassword.length === 0 ||
                disableCode.length === 0
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disableLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              2FA deaktivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* === Regenerate-Dialog === */}
      <AlertDialog
        open={regenOpen}
        onOpenChange={(open) => {
          if (!regenLoading) {
            setRegenOpen(open);
            if (!open) {
              setRegenPassword("");
              setRegenTotp("");
              setRegenError(null);
            }
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recovery-Codes neu generieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle aktuell gültigen Codes werden ungültig. Bestätige mit
              deinem Passwort und einem aktuellen TOTP-Code (KEIN
              Recovery-Code hier).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="regenPassword">Passwort</Label>
              <Input
                id="regenPassword"
                type="password"
                value={regenPassword}
                onChange={(e) => setRegenPassword(e.target.value)}
                autoComplete="current-password"
                disabled={regenLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regenTotp">TOTP-Code (6 Ziffern)</Label>
              <Input
                id="regenTotp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={regenTotp}
                onChange={(e) => setRegenTotp(e.target.value)}
                disabled={regenLoading}
              />
            </div>
            {regenError && (
              <p className="text-sm text-destructive">{regenError}</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenLoading}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                regenerateRecoveryCodes();
              }}
              disabled={
                regenLoading ||
                regenPassword.length === 0 ||
                regenTotp.length !== 6
              }
            >
              {regenLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Neue Codes generieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
