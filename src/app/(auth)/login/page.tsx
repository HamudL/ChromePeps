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
  recordLoginFailure,
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
  let errorParam: string | null = null;
  try {
    errorParam = new URL(data.url).searchParams.get("error");
  } catch {
    /* data.url fehlt oder ist kein gültiges URL — behandeln wie Erfolg, wenn res.ok */
  }

  if (res.ok && !errorParam) {
    return { ok: true, error: null };
  }

  return { ok: false, error: errorParam ?? "CredentialsSignin" };
}

function errorMessageFor(code: string): string {
  switch (code) {
    case "CredentialsSignin":
      return "E-Mail oder Passwort ist falsch.";
    case "AccessDenied":
      return "Zugriff verweigert. Bitte verifiziere deine E-Mail-Adresse.";
    case "Configuration":
      return "Server-Konfigurationsfehler. Bitte später erneut versuchen.";
    case "InvalidTwoFactorCode":
      return "Der eingegebene 2FA-Code ist ungültig oder abgelaufen.";
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

        // Server-side rate limit + captcha check (nur in Stufe 1).
        const rateCheck = await checkLoginRateLimit(
          email,
          captchaRequired ? captchaToken : undefined,
        );
        if (!rateCheck.success) {
          if (rateCheck.captchaRequired) {
            setCaptchaRequired(true);
          }
          // „captcha-required" ist ein interner Code — keine User-Meldung
          // wenn der Server nur signalisiert „bitte erst Captcha lösen".
          if (rateCheck.error && rateCheck.error !== "captcha-required") {
            setError(rateCheck.error);
          }
          captchaResetRef.current?.resetCaptcha();
          setCaptchaToken("");
          return;
        }
        // Captcha war erfolgreich — Token verbrauchen, neuer braucht's
        // erst beim nächsten Failure.
        if (captchaRequired) {
          captchaResetRef.current?.resetCaptcha();
          setCaptchaToken("");
        }
      }

      // Manual credential sign-in via fetch (not next-auth/react signIn)
      const result = await credentialSignIn(
        email,
        password,
        pendingCredentials ? totpCode : undefined,
      );

      if (result.ok) {
        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get("callbackUrl") ?? "/";
      } else if (result.error === "TwoFactorRequired") {
        // Stufe 2 aktivieren — Email/Password merken, TOTP-Eingabe
        // einblenden. Kein Error-Banner: das ist ein erwarteter Step.
        setPendingCredentials({ email, password });
        setTotpCode("");
      } else {
        setError(errorMessageFor(result.error ?? "CredentialsSignin"));
        // Failure-Counter erhöhen → eventuell zeigt der nächste
        // Submit-Versuch das Captcha. Fire-and-forget.
        void recordLoginFailure(email);
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
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-2xl font-bold">Willkommen zurück</CardTitle>
        <CardDescription>
          Melden Sie sich bei Ihrem {APP_NAME}-Konto an
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
                <Label htmlFor="email">E-Mail</Label>
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
                  <Label htmlFor="password">Passwort</Label>
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

          {/* hCaptcha — nur sichtbar wenn der Server >=2 Fehlversuche
              für diese Email gezählt hat. Wird automatisch nach
              erfolgreichem Login wieder versteckt. */}
          {captchaRequired && !pendingCredentials && (
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
              <Label htmlFor="totpCode">Zwei-Faktor-Code</Label>
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
            className="w-full gap-2"
            disabled={
              isPending || (captchaRequired && !pendingCredentials && !captchaToken)
            }
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
