"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Google-OAuth-Button. Triggert den NextAuth-Flow für den `google`-Provider
 * via FORM-POST mit CSRF-Token an /api/auth/signin/google.
 *
 * Wichtig: NextAuth v5 erwartet POST mit `csrfToken` aus /api/auth/csrf.
 * Ein simpler GET-Redirect liefert nur die default Sign-in-Page zurück,
 * die wegen unseres `pages.signIn = "/login"` direkt zurück auf /login
 * leitet — das hat sich beim ersten Versuch wie ein Page-Refresh
 * angefühlt.
 *
 * Account-Linking: NextAuth verbindet automatisch das Google-Account mit
 * einem existierenden User-Datensatz mit derselben Email
 * (`allowDangerousEmailAccountLinking: true` im Provider-Config) — sicher
 * weil Google verifizierte Emails liefert.
 *
 * Captcha-Bypass: OAuth-Logins werden NICHT per hCaptcha gegated weil der
 * gesamte OAuth-Flow extern bei Google läuft (eigene Brute-Force-Detection).
 *
 * AUDIT_REPORT_v3 §4.1 + §6 PR 4.
 */

interface Props {
  /** Pfad nach erfolgreichem Login. Default: `/`. */
  callbackUrl?: string;
  className?: string;
}

export function GoogleSignInButton({ callbackUrl = "/", className }: Props) {
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    try {
      // 1. CSRF-Token holen (wie beim Credentials-Flow)
      const csrfRes = await fetch("/api/auth/csrf");
      if (!csrfRes.ok) throw new Error("CSRF-Token fehlt");
      const { csrfToken } = await csrfRes.json();

      // 2. Hidden Form bauen + submit. Damit der Browser dem 302-
      //    Redirect zu Google folgt, MUSS das ein echter Form-Submit
      //    sein (kein fetch — fetch folgt 302s nicht zu cross-origin).
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/auth/signin/google";

      const csrfInput = document.createElement("input");
      csrfInput.type = "hidden";
      csrfInput.name = "csrfToken";
      csrfInput.value = csrfToken;
      form.appendChild(csrfInput);

      const callbackInput = document.createElement("input");
      callbackInput.type = "hidden";
      callbackInput.name = "callbackUrl";
      callbackInput.value = callbackUrl;
      form.appendChild(callbackInput);

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error("[GoogleSignIn]", err);
      setIsPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isPending}
      className={className}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="mr-2 h-4 w-4" />
      )}
      Mit Google anmelden
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
