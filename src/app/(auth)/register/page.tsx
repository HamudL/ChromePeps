"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { UserPlus, Loader2 } from "lucide-react";
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
import { registerAction } from "@/app/(auth)/actions/auth-actions";
import { registerSchema } from "@/validators/auth";
import { APP_NAME } from "@/lib/constants";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import dynamic from "next/dynamic";

// hCaptcha lazy-loaded — sichtbar erst ab 2 Fehlversuchen, spart
// ~50 KB First-Load für 99% der Registrierungen.
const HCaptchaWidget = dynamic(
  () =>
    import("@/components/auth/hcaptcha-widget").then((m) => m.HCaptchaWidget),
  { ssr: false },
);

export default function RegisterPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const captchaResetRef = useRef<{ resetCaptcha: () => void } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    // Client-side validation
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!errors[field]) {
          errors[field] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    // Captcha-Token in den FormData mitschicken — der Server liest
    // ihn aus formData.get("captchaToken").
    if (captchaRequired && captchaToken) {
      formData.set("captchaToken", captchaToken);
    }

    setIsPending(true);
    try {
      // Create account via server action (handles rate limiting + DB)
      const result = await registerAction(formData);
      if (!result.success) {
        if (result.captchaRequired) {
          setCaptchaRequired(true);
          captchaResetRef.current?.resetCaptcha();
          setCaptchaToken("");
        }
        if (result.error && result.error !== "captcha-required") {
          setError(
            result.error ?? "Etwas ist schiefgegangen. Bitte erneut versuchen.",
          );
        }
        return;
      }

      // Account created — sign in via manual fetch (bypasses next-auth/react bugs)
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      const signInRes = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Auth-Return-Redirect": "1",
        },
        body: new URLSearchParams({
          email: raw.email,
          password: raw.password,
          csrfToken,
          callbackUrl: window.location.origin,
        }),
      });

      if (signInRes.ok) {
        window.location.href = "/";
      } else {
        // Account was created but auto-login failed — redirect to login
        window.location.href = "/login";
      }
    } catch {
      setError("Etwas ist schiefgegangen. Bitte erneut versuchen.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <h1 className="sr-only">{APP_NAME}-Konto erstellen</h1>
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-2xl font-bold">Konto erstellen</CardTitle>
        <CardDescription>
          Registrieren Sie sich bei {APP_NAME}, um Forschungspeptide zu bestellen.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div
              id="register-error"
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Vollständiger Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Dr. Jane Schmidt"
              required
              autoComplete="name"
              disabled={isPending}
              aria-invalid={!!fieldErrors.name}
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
            />
            {fieldErrors.name && (
              <p id="name-error" role="alert" className="text-xs text-destructive">
                {fieldErrors.name}
              </p>
            )}
          </div>

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
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email && (
              <p id="email-error" role="alert" className="text-xs text-destructive">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mind. 8 Zeichen"
              required
              autoComplete="new-password"
              disabled={isPending}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={
                fieldErrors.password ? "password-error" : "password-hint"
              }
            />
            {fieldErrors.password && (
              <p id="password-error" role="alert" className="text-xs text-destructive">
                {fieldErrors.password}
              </p>
            )}
            <p id="password-hint" className="text-xs text-muted-foreground">
              Muss Großbuchstaben, Kleinbuchstaben und eine Zahl enthalten.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Passwort erneut eingeben"
              required
              autoComplete="new-password"
              disabled={isPending}
              aria-invalid={!!fieldErrors.confirmPassword}
              aria-describedby={
                fieldErrors.confirmPassword ? "confirmPassword-error" : undefined
              }
            />
            {fieldErrors.confirmPassword && (
              <p
                id="confirmPassword-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          {/* hCaptcha — sichtbar nach 2 fehlgeschlagenen Register-
              Attempts (z.B. Email existiert bereits). */}
          {captchaRequired && (
            <div className="space-y-2 w-full">
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

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={
              isPending || (captchaRequired && !captchaToken)
            }
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Konto wird erstellt …
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Konto erstellen
              </>
            )}
          </Button>

          {/* Google-OAuth-Alternative für Registrierung */}
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">oder</span>
            </div>
          </div>
          <GoogleSignInButton className="w-full" />

          <p className="text-sm text-muted-foreground text-center">
            Bereits ein Konto?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Anmelden
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
