"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  checkLoginRateLimit,
} from "@/app/(auth)/actions/auth-actions";
import { APP_NAME } from "@/lib/constants";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import dynamic from "next/dynamic";

// hCaptcha lazy-loaded — die meisten User erreichen das Widget nie
// (sichtbar erst ab 2 Fehlversuchen). Spart ~50 KB First-Load.
const HCaptchaWidget = dynamic(
  () =>
    import("@/components/auth/hcaptcha-widget").then((m) => m.HCaptchaWidget),
  { ssr: false },
);

/**
 * Manual credential sign-in via fetch — bypasses next-auth/react's signIn()
 * which has a known bug: getProviders() failure causes a hard redirect to
 * /api/auth/error even when redirect:false is set.
 *
 * Mit 2FA-Support: wenn `totpCode` mitgegeben wird, ist das eine
 * "zweite Stufe" eines Logins, dessen Passwort schon stimmt. Der Server
 * (auth.ts > authorize) wirft `TwoFactorRequired` wenn 2FA an ist und
 * kein Code mitkommt — das fangen wir hier ab und propagieren als
 * eigenen error-Code.
 */
async function credentialSignIn(
  email: string,
  password: string,
  totpCode?: string,
  captchaToken?: string,
) {
  // 1. Get CSRF token (required by NextAuth)
  const csrfRes = await fetch("/api/auth/csrf");
  if (!csrfRes.ok) throw new Error("Failed to get CSRF token");
  const { csrfToken } = await csrfRes.json();

  // 2. POST to the credentials callback endpoint
  const body: Record<string, string> = {
    email,
    password,
    csrfToken,
    callbackUrl: window.location.origin,
  };
  if (totpCode) body.totpCode = totpCode;
  // Captcha-Token mitschicken — authorize() verlangt ihn server-seitig,
  // sobald der Failure-Counter den Threshold erreicht hat.
  if (captchaToken) body.captchaToken = captchaToken;

  const res = await fetch("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams(body),
  });

  const data = await res.json();

  // NextAuth v5 antwortet mit HTTP 200 SOWOHL bei Erfolg als auch bei Fehler —
  // die Unterscheidung steckt in data.url. Bei Erfolg ist das die callbackUrl,
  // bei Fehler eine /api/auth/signin?error=... URL. res.ok allein reicht also
  // nicht, sonst landet der User bei falschem Passwort einfach auf /.
  // NextAuth v5 legt die generische Fehlerklasse in `error` ab (bei Credentials
  // IMMER "CredentialsSignin") und den SPEZIFISCHEN Grund in `code`
  // (unsere CredentialsSignin-Subklassen setzen z.B. code="TwoFactorRequired"
  // / "InvalidTwoFactorCode"; ein echtes Falsch-Passwort liefert
  // code="credentials"). Wir MÜSSEN auf `code` keyen — würden wir nur `error`
  // lesen, sähe jeder Fall gleich aus ("CredentialsSignin") und der
  // 2FA-Schritt würde nie erkannt (2FA-User könnten sich nie einloggen).
  // Fallback auf `error`, falls `code` mal fehlt.
  let reason: string | null = null;
  try {
    const parsed = new URL(data.url);
    reason = parsed.searchParams.get("code") || parsed.searchParams.get("error");
  } catch {
    /* data.url fehlt oder ist kein gültiges URL — behandeln wie Erfolg, wenn res.ok */
  }

  if (res.ok && !reason) {
    return { ok: true, error: null };
  }

  return { ok: false, error: reason ?? "CredentialsSignin" };
}

function errorMessageFor(code: string): string {
  switch (code) {
    // NextAuth v5: `code` ist bei Falsch-Passwort "credentials"; "CredentialsSignin"
    // bleibt als Fallback drin, falls mal nur die generische Klasse durchkommt.
    case "credentials":
    case "CredentialsSignin":
      return "E-Mail oder Passwort ist falsch.";
    case "AccessDenied":
      return "Zugriff verweigert. Bitte verifiziere deine E-Mail-Adresse.";
    case "Configuration":
      return "Server-Konfigurationsfehler. Bitte später erneut versuchen.";
    case "InvalidTwoFactorCode":
      return "Der eingegebene 2FA-Code ist ungültig oder abgelaufen.";
    case "RateLimited":
      return "Zu viele Versuche. Bitte in ein paar Minuten erneut versuchen.";
    case "CaptchaRequired":
      return "Bitte zuerst das Captcha lösen.";
    default:
      return "Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
  }
}

export default function LoginPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 2FA-State (siehe oben)
  const [pendingCredentials, setPendingCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  // Captcha-State: server-side gesteuert via `captchaRequired` aus
  // `checkLoginRateLimit`. Nach 2 Fehlversuchen aus Sicht des Servers
  // (Redis-Counter) wird das Widget eingeblendet.
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const captchaResetRef = useRef<{ resetCaptcha: () => void } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      let email: string;
      let password: string;
      if (pendingCredentials) {
        // Stufe 2: Werte aus State, kein FormData mehr.
        email = pendingCredentials.email;
        password = pendingCredentials.password;
      } else {
        const formData = new FormData(e.currentTarget);
        email = formData.get("email") as string;
        password = formData.get("password") as string;

        // Reine UX-Vorabprüfung (nur Stufe 1): Rate-Limit-Hinweis +
        // "Widget einblenden?". Der hCaptcha-Token wird hier bewusst
        // NICHT mitgeschickt: Tokens sind single-use, und die einzige
        // verifizierende Stelle ist authorize() — ein Doppel-Verify
        // (Action + authorize) lehnte denselben Token beim zweiten Mal
        // als "already seen" ab und sperrte User in einer
        // Captcha-Schleife aus.
        const rateCheck = await checkLoginRateLimit(email);
        if (!rateCheck.success) {
          if (rateCheck.captchaRequired) {
            setCaptchaRequired(true);
          }
          if (rateCheck.error) {
            setError(rateCheck.error);
          }
          return;
        }
        if (rateCheck.captchaRequired) {
          setCaptchaRequired(true);
          // Ohne gelösten Token gar nicht erst einen Login-Versuch
          // verbrennen — authorize() würde ihn mit CaptchaRequired
          // ablehnen und das Rate-Limit-Budget kostet er trotzdem.
          if (!captchaToken) {
            return;
          }
        }
      }

      // Manual credential sign-in via fetch (not next-auth/react signIn)
      const result = await credentialSignIn(
        email,
        password,
        pendingCredentials ? totpCode : undefined,
        captchaToken || undefined,
      );

      // Der Token ist nach diesem Versuch verbraucht (single-use) —
      // unabhängig vom Ausgang frisches Widget für den nächsten Submit.
      if (captchaToken) {
        captchaResetRef.current?.resetCaptcha();
        setCaptchaToken("");
      }

      if (result.ok) {
        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get("callbackUrl") ?? "/";
      } else if (result.error === "TwoFactorRequired") {
        // Stufe 2 aktivieren — Email/Password merken, TOTP-Eingabe
        // einblenden. Kein Error-Banner: das ist ein erwarteter Step.
        setPendingCredentials({ email, password });
        setTotpCode("");
      } else if (result.error === "CaptchaRequired") {
        // Server-seitig erzwungen (authorize) — Widget einblenden und
        // neuen Token verlangen. Kein Failure-Recording: der Versuch
        // wurde gar nicht erst gegen das Passwort geprüft.
        setCaptchaRequired(true);
        captchaResetRef.current?.resetCaptcha();
        setCaptchaToken("");
        setError(errorMessageFor("CaptchaRequired"));
      } else {
        setError(errorMessageFor(result.error ?? "CredentialsSignin"));
        // Failure-Counting passiert seit der Server-Härtung im
        // authorize() selbst (nicht mehr umgehbar) — der frühere
        // Client-Aufruf recordLoginFailure() würde doppelt zählen.
        // Bei InvalidTwoFactorCode bleiben wir in Stufe 2, damit der
        // User nochmal eingeben kann.
        if (result.error !== "InvalidTwoFactorCode") {
          setPendingCredentials(null);
          setTotpCode("");
        }
      }
    } catch {
      setError("Etwas ist schiefgelaufen. Bitte erneut versuchen.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <h1 className="sr-only">Bei {APP_NAME} anmelden</h1>
      <CardHeader className="space-y-2">
        <span className="eyebrow">[ KONTO-ZUGANG ]</span>
        <CardTitle className="display-title text-3xl">
          Willkommen zurück
        </CardTitle>
        <CardDescription>
          Melden Sie sich bei Ihrem {APP_NAME}-Konto an — Bestellverlauf,
          Adressen und CoA-Archiv warten.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div
              id="login-error"
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {/* Stufe 1: Email + Password */}
          {!pendingCredentials && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email" className="field-label">
                  [ E-Mail ]
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="forschung@labor.de"
                  required
                  autoComplete="email"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="field-label">
                    [ Passwort ]
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Passwort vergessen?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Passwort eingeben"
                  required
                  autoComplete="current-password"
                  disabled={isPending}
                />
              </div>
            </>
          )}

          {/* hCaptcha — sichtbar sobald der Server >=2 Fehlversuche für
              diese Email gezählt hat. Bewusst AUCH in 2FA-Stufe 2:
              authorize() erzwingt das Captcha-Gate VOR der TOTP-Prüfung
              und zählt falsche Codes als Fehlversuche — ohne Widget in
              Stufe 2 wäre der CaptchaRequired-Fehler dort unlösbar. */}
          {captchaRequired && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Zur Sicherheit bitte das Captcha lösen.
              </p>
              <HCaptchaWidget
                resetRef={captchaResetRef}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken("")}
              />
            </div>
          )}

          {/* Stufe 2: TOTP-Code (oder Recovery-Code) */}
          {pendingCredentials && (
            <div className="space-y-2">
              <Label htmlFor="totpCode" className="field-label">
                [ Zwei-Faktor-Code ]
              </Label>
              <Input
                id="totpCode"
                name="totpCode"
                type="text"
                inputMode="numeric"
                placeholder="6-stelliger Code aus deiner Authenticator-App"
                required
                autoComplete="one-time-code"
                disabled={isPending}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Authenticator-App nicht zur Hand? Du kannst auch einen
                deiner Recovery-Codes (Format <code>XXXX-XXXX</code>)
                verwenden — dieser ist dann verbraucht.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPendingCredentials(null);
                  setTotpCode("");
                  setError(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                ← Zurück zur Anmeldung
              </button>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            variant="gold"
            className="w-full gap-2"
            disabled={isPending || (captchaRequired && !captchaToken)}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {pendingCredentials ? "Verifizieren …" : "Anmelden …"}
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {pendingCredentials ? "Code prüfen" : "Anmelden"}
              </>
            )}
          </Button>

          {/* Google-OAuth-Alternative — separat unter dem primären
              Submit, mit horizontalem Trenner. NICHT in Stufe 2 (TOTP)
              sichtbar, weil OAuth einen eigenen Flow startet. */}
          {!pendingCredentials && (
            <>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    oder
                  </span>
                </div>
              </div>
              <GoogleSignInButton className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Noch kein Konto?{" "}
                <Link
                  href="/register"
                  className="text-primary font-medium hover:underline"
                >
                  Jetzt registrieren
                </Link>
              </p>
            </>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
