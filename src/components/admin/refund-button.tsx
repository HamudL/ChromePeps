"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Refund-Button für Admin-Order-Detail. Öffnet einen Dialog mit
 * Betrags-Input (default = remaining), optionalem Stripe-Reason und
 * Notes-Feld. Schickt POST /api/admin/orders/[id]/refund.
 *
 * Nur sichtbar wenn Order via Stripe bezahlt + nicht voll-refunded.
 *
 * AUDIT_REPORT_v3 §4.7.
 */

interface Props {
  orderId: string;
  orderNumber: string;
  totalInCents: number;
  // Falls bekannt: bereits erstatteter Anteil. Wenn null, wird im
  // Backend gegen Stripe geprüft. Vorbefüllung im Form-Field nutzt
  // totalInCents als Default.
  alreadyRefundedInCents?: number | null;
}

export function RefundButton({
  orderId,
  orderNumber,
  totalInCents,
  alreadyRefundedInCents = 0,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const remaining = totalInCents - (alreadyRefundedInCents ?? 0);
  const remainingEur = (remaining / 100).toFixed(2);

  const [amountEur, setAmountEur] = useState(remainingEur);
  const [reason, setReason] = useState<string>("none");
  const [notes, setNotes] = useState("");

  async function handleRefund() {
    setError("");
    setSuccess("");

    const cents = Math.round(parseFloat(amountEur) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Bitte gültigen Betrag eingeben (> 0).");
      return;
    }
    if (cents > remaining) {
      setError(
        `Maximal ${remainingEur} € noch erstattbar (Total: ${(totalInCents / 100).toFixed(2)} €).`,
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInCents: cents,
          ...(reason !== "none" ? { reason } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Refund fehlgeschlagen.");
        setLoading(false);
        return;
      }
      setSuccess(
        `Refund über ${(cents / 100).toFixed(2)} € erfolgreich (${json.data.status}). Webhook aktualisiert die Order in wenigen Sekunden.`,
      );
      setLoading(false);
      // Nach 1.5 s Dialog schließen + Page reloaden — der Webhook hat
      // bis dahin meistens den Status aktualisiert.
      setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 1500);
    } catch {
      setError("Netzwerkfehler.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Erstatten
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bestellung {orderNumber} erstatten</DialogTitle>
          <DialogDescription>
            Triggert eine Stripe-Erstattung. Der Webhook setzt danach
            Order-Status, schreibt OrderEvent und stellt Stock wieder her.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refund-amount">Betrag in EUR</Label>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              min={0}
              max={remaining / 100}
              value={amountEur}
              onChange={(e) => setAmountEur(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Maximal {remainingEur} € erstattbar (Total{" "}
              {(totalInCents / 100).toFixed(2)} €
              {(alreadyRefundedInCents ?? 0) > 0 &&
                `, davon ${((alreadyRefundedInCents ?? 0) / 100).toFixed(2)} € bereits erstattet`}
              ).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-reason">Grund (optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="refund-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Kein Grund —</SelectItem>
                <SelectItem value="duplicate">Duplikat</SelectItem>
                <SelectItem value="fraudulent">Betrug</SelectItem>
                <SelectItem value="requested_by_customer">
                  Auf Kundenwunsch
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Stripe-internes Feld, beeinflusst Disput-Statistiken.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund-notes">Interne Notiz (optional)</Label>
            <Textarea
              id="refund-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. „Versandverlust laut DHL — siehe Mail vom 4.5.“"
            />
            <p className="text-xs text-muted-foreground">
              Landet im Audit-Log + Stripe-Refund-Metadata.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleRefund}
            disabled={loading || Boolean(success)}
          >
            {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refund auslösen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
