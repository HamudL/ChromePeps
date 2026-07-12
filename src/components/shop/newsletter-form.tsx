"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>Bitte prüfen Sie Ihr Postfach zur Bestätigung.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Label htmlFor="newsletter-email" className="sr-only">
          E-Mail-Adresse für Newsletter
        </Label>
        <Input
          id="newsletter-email"
          type="email"
          placeholder="Ihre E-Mail-Adresse"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-9 text-sm"
          disabled={state === "loading"}
        />
        <Button type="submit" size="sm" disabled={state === "loading"}>
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Anmelden"
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      {/* Datenschutzhinweis am Erhebungspunkt (Art. 13 DSGVO): kurzer
          Transparenztext mit Verlinkung auf die Datenschutzerklärung direkt
          am Formular. */}
      <p className="text-xs text-white/40">
        Mit der Anmeldung stimmen Sie dem Erhalt des Newsletters zu. Details in
        unserer{" "}
        <Link href="/datenschutz" className="underline hover:text-white/70">
          Datenschutzerklärung
        </Link>
        .
      </p>
    </form>
  );
}
