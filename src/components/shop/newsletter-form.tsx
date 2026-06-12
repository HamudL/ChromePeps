"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Anmeldung fehlgeschlagen.");
        setState("error");
      } else {
        setState("success");
      }
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Bitte prüfen Sie Ihr Postfach zur Bestätigung.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Ihre E-Mail-Adresse"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-10 text-sm"
          disabled={state === "loading"}
        />
        <Button
          type="submit"
          variant="gold"
          disabled={state === "loading"}
          className="shrink-0"
        >
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Anmelden"
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
