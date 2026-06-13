"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * Newsletter-Block im Ink-Stil für die Wissens-Section. Postet an
 * `/api/newsletter` (Double-Opt-In via Token im Backend). Server
 * antwortet auch bei "bereits subscribed" mit success: true (siehe
 * Newsletter-API-Route, Sicherheitsentscheidung gegen Email-Enumeration).
 *
 * UX: Loading-Spinner während Submit, danach Erfolgs- oder Fehler-Text
 * inline statt Toast — der Block ist self-contained und braucht keinen
 * globalen Provider.
 */
export function NewsletterBlock() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (json?.success) {
        setState("ok");
        setEmail("");
      } else {
        setState("err");
        setErrorMsg(
          json?.error ??
            "Anmeldung fehlgeschlagen. Bitte später erneut versuchen.",
        );
      }
    } catch {
      setState("err");
      setErrorMsg("Netzwerkfehler.");
    }
  }

  return (
    <section className="section-ink relative overflow-hidden rounded-sm">
      <div className="absolute inset-0 apo-grid opacity-100 pointer-events-none" />
      <div className="relative grid grid-cols-1 md:grid-cols-5 gap-8 p-8 md:p-12">
        <div className="md:col-span-3">
          <span className="mono-tag text-primary">Newsletter</span>
          <h3 className="mt-4 font-serif text-[28px] md:text-[34px] leading-[1.1] tracking-tight font-medium max-w-[18ch]">
            Monatlich neue Chargen-Tests und Forschungs-Updates per Mail.
          </h3>
          <p className="mt-3 text-[14.5px] text-ink-muted leading-relaxed max-w-[52ch]">
            Eine kompakte Mail pro Monat: die wichtigsten neuen Methoden-
            Artikel, aktuelle HPLC-Resultate und Updates zur regulatorischen
            Lage. Kein Marketing.
          </p>
        </div>
        <form
          className="md:col-span-2 flex flex-col justify-center gap-3"
          onSubmit={handleSubmit}
        >
          <label
            className="mono-tag text-ink-muted"
            htmlFor="wissen-newsletter-email"
          >
            E-Mail-Adresse
          </label>
          <div className="flex gap-2">
            <input
              id="wissen-newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="forscher@labor.de"
              disabled={state === "loading" || state === "ok"}
              className="flex-1 bg-[hsl(20_14%_7%)] border border-ink-border text-ink-foreground rounded-sm px-3 py-3 text-sm font-sans placeholder:text-ink-muted focus:border-primary focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={state === "loading" || state === "ok"}
              className="btn-gold whitespace-nowrap disabled:opacity-60"
            >
              {state === "loading" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {state !== "loading" && "Abonnieren"}
              {state !== "loading" && <ArrowRight size={14} />}
            </button>
          </div>
          {state === "ok" ? (
            <p
              className="font-mono text-[10.5px] text-primary leading-snug"
              style={{ letterSpacing: "0.06em" }}
              role="status"
            >
              Fast geschafft — Bestätigungslink in der Mailbox.
            </p>
          ) : state === "err" ? (
            <p
              className="font-mono text-[10.5px] text-red-300 leading-snug"
              style={{ letterSpacing: "0.06em" }}
              role="alert"
            >
              {errorMsg}
            </p>
          ) : (
            <p
              className="font-mono text-[10.5px] text-ink-muted leading-snug"
              style={{ letterSpacing: "0.06em" }}
            >
              Jederzeit per 1-Klick abbestellbar. Keine Weitergabe an Dritte.
              Siehe Datenschutz.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
