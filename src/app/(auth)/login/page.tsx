"use client";

import { useState } from "react";
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
import { checkLoginRateLimit } from "@/app/(auth)/actions/auth-actions";
import { APP_NAME } from "@/lib/constants";

/**
 * Manual credential sign-in via fetch — bypasses next-auth/react's signIn()
 * which has a known bug: getProviders() failure causes a hard redirect to
 * /api/auth/error even when redirect:false is set.
 */
async function credentialSignIn(email: string, password: string) {
  // 1. Get CSRF token (required by NextAuth)
  const csrfRes = await fetch("/api/auth/csrf");
  if (!csrfRes.ok) throw new Error("Failed to get CSRF token");
  const { csrfToken } = await csrfRes.json();

  // 2. POST to the credentials callback endpoint
  const res = await fetch("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({
      email,
      password,
      csrfToken,
      callbackUrl: window.location.origin,
    }),
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
    default:
      return "Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
  }
}

export default function LoginPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      // Server-side rate limit check
      const rateCheck = await checkLoginRateLimit(email);
      if (!rateCheck.success) {
        setError(rateCheck.error ?? "Too many attempts.");
        return;
      }

      // Manual credential sign-in via fetch (not next-auth/react signIn)
      const result = await credentialSignIn(email, password);

      if (result.ok) {
        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get("callbackUrl") ?? "/";
      } else {
        setError(errorMessageFor(result.error ?? "CredentialsSignin"));
      }
    } catch {
      setError("Etwas ist schiefgelaufen. Bitte erneut versuchen.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <h1 className="sr-only">Sign in to {APP_NAME}</h1>
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
        <CardDescription>
          Sign in to your {APP_NAME} account
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

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="researcher@lab.com"
              required
              autoComplete="email"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
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
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              disabled={isPending}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full gap-2" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign In
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-medium hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
