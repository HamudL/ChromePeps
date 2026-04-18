"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TestOrderToggleProps {
  orderId: string;
  isTestOrder: boolean;
}

export function TestOrderToggle({ orderId, isTestOrder }: TestOrderToggleProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleToggle = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTestOrder: !isTestOrder }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Aktion fehlgeschlagen.");
        setLoading(false);
        setConfirming(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Netzwerkfehler.");
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {isTestOrder
            ? "Kennzeichnung als Testbestellung aufheben? Die Bestellung taucht dann wieder in Statistiken und Exports auf."
            : "Bestellung als Testbestellung markieren? Sie wird aus Statistiken, Exports und E-Mail-Versand ausgeschlossen."}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant={isTestOrder ? "outline" : "default"}
            size="sm"
            onClick={handleToggle}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {isTestOrder ? "Ja, echte Bestellung machen" : "Ja, als Test markieren"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={loading}
          >
            Abbrechen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2 text-muted-foreground"
      onClick={() => setConfirming(true)}
    >
      <FlaskConical className="h-3.5 w-3.5" />
      {isTestOrder ? "Als echte Bestellung markieren" : "Als Testbestellung markieren"}
    </Button>
  );
}
