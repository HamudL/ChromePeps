"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface UserDeleteButtonProps {
  userId: string;
  isSelf: boolean;
}

export function UserDeleteButton({ userId, isSelf }: UserDeleteButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        router.refresh();
      } else {
        // Fehler sichtbar machen statt still zu verschlucken — sonst
        // sieht der Admin nur, dass die Row "einfach nicht verschwindet".
        toast.error(json?.error ?? "Benutzer konnte nicht gelöscht werden.");
      }
    } catch {
      toast.error("Netzwerkfehler — Benutzer wurde nicht gelöscht.");
    }
    setDeleting(false);
    setConfirming(false);
  }

  if (isSelf) return null;

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="destructive"
          disabled={deleting}
          onClick={handleDelete}
        >
          {deleting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            "Confirm"
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
