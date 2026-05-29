"use client";

import { useState } from "react";
import { Tag, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cart-store";
import { formatPrice } from "@/lib/utils";

/**
 * Gutscheincode-Eingabe bereits im Warenkorb. Reduziert die wahrgenommene
 * Reibung ("lohnt sich mein Code?") und befüllt den Code an der Kasse vor.
 *
 * Validierung läuft über den BESTEHENDEN Endpoint /api/promos/validate:
 *  - Eingeloggte Nutzer: Live-Preview des Rabatts.
 *  - Gäste: der Endpoint verlangt eine E-Mail (im Cart noch nicht bekannt)
 *    → wir MERKEN den Code (setPromoCode) und lösen ihn an der Kasse ein,
 *    wo die E-Mail vorliegt. Ungültige Codes (404/Mindestbestellwert)
 *    werden hingegen als Fehler angezeigt und NICHT gespeichert.
 *
 * Einzel-Selektoren (Zustand v5). Greift nicht in den Item-/Sync-Pfad ein.
 */
export function CartPromoInput() {
  const items = useCartStore((s) => s.items);
  const promoCode = useCartStore((s) => s.promoCode);
  const setPromoCode = useCartStore((s) => s.setPromoCode);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discount, setDiscount] = useState<number | null>(null);

  const subtotal = items.reduce(
    (sum, i) => sum + i.priceInCents * i.quantity,
    0,
  );

  async function apply() {
    const code = input.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/promos/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotalInCents: subtotal }),
      });
      const json = await res.json();
      if (json.success) {
        setPromoCode(code);
        setDiscount(json.data?.discountAmount ?? null);
        setInput("");
      } else {
        const msg: string =
          json.error ?? "Code konnte nicht eingelöst werden.";
        // Gast ohne E-Mail: Code ist nicht ungültig, es fehlt nur die
        // Identität (kommt an der Kasse). Also merken + dort einlösen.
        if (/e-?mail|einloggen/i.test(msg)) {
          setPromoCode(code);
          setDiscount(null);
          setInput("");
        } else {
          setError(msg);
        }
      }
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  function remove() {
    setPromoCode(null);
    setDiscount(null);
    setError(null);
  }

  if (promoCode) {
    return (
      <div className="rounded-md border border-success/30 bg-success/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
            <span className="font-mono font-medium">{promoCode}</span>
            {discount != null ? (
              <span className="text-success">−{formatPrice(discount)}</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                wird an der Kasse eingelöst
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={remove}
            aria-label="Gutscheincode entfernen"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        <Tag className="h-3 w-3" aria-hidden />
        Gutscheincode
      </span>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Code eingeben"
          className="h-10 font-mono uppercase"
          aria-label="Gutscheincode"
        />
        <Button
          type="button"
          variant="outline"
          onClick={apply}
          disabled={loading || !input.trim()}
          className="shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anwenden"}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
