"use client";

import { useState } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Dashboard banner that nags the user to verify their email. Soft
 * enforcement: login still works, but the banner sticks until verified.
 *
 * Rendered by `dashboard/layout.tsx` when the server determined the user
 * has `emailVerified === null`.
 */
export function EmailVerifyBanner({ email }: { email: string }) {
  const [state, setState] = useState<
    "idle" | "loading" | "sent" | "already" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleResend() {
    setState("loading");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.error ?? "Fehler beim Senden. Bitte sp\u00e4ter erneut versuchen.");
        setState("error");
        return;
      }
      if (json.data?.alreadyVerified) {
        setState("already");
      } else {
        setState("sent");
      }
    } catch {
      setErrorMsg("Netzwerkfehler. Bitte sp\u00e4ter erneut versuchen.");
      setState("error");
    }
  }

  if (state === "already") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p>Ihre E-Mail-Adresse ist bereits best&auml;tigt.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Bitte bestätigen Sie Ihre E-Mail-Adresse</p>
          <p className="text-xs text-amber-800">
            {state === "sent"
              ? `Wir haben eine neue Bestätigungs-Mail an ${email} gesendet. Bitte pr\u00fcfen Sie Ihren Posteingang.`
              : state === "error" && errorMsg
                ? errorMsg
                : `Wir haben Ihnen eine Bestätigungs-Mail an ${email} geschickt. Klicken Sie dort auf den Link.`}
          </p>
        </div>
      </div>
      {state !== "sent" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
          onClick={handleResend}
          disabled={state === "loading"}
        >
          {state === "loading" ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Sende...
            </>
          ) : (
            "Best\u00e4tigungsmail erneut senden"
          )}
        </Button>
      )}
    </div>
  );
}
