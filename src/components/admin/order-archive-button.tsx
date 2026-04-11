"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderArchiveButtonProps {
  orderId: string;
  currentStatus: string;
}

const ARCHIVABLE = ["CANCELLED", "DELIVERED", "REFUNDED"];

export function OrderArchiveButton({ orderId, currentStatus }: OrderArchiveButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!ARCHIVABLE.includes(currentStatus)) return null;

  const handleArchive = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to archive order.");
        setLoading(false);
        setConfirming(false);
        return;
      }
      router.push("/admin/orders");
      router.refresh();
    } catch {
      setError("Network error.");
      setLoading(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Archive this order? It will be hidden from the default list but
          preserved for records.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleArchive}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Yes, Archive
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={loading}
          >
            Cancel
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
      <Archive className="h-3.5 w-3.5" />
      Archive Order
    </Button>
  );
}
