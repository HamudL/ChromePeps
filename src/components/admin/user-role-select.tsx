"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserRoleSelectProps {
  userId: string;
  currentRole: string;
  isSelf: boolean;
}

export function UserRoleSelect({
  userId,
  currentRole,
  isSelf,
}: UserRoleSelectProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(currentRole);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  async function applyRoleChange(newRole: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const json = await res.json();
      if (json.success) {
        setRole(newRole);
        router.refresh();
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }

  function handleChange(newRole: string) {
    if (newRole === role) return;

    // Require double confirmation when promoting to ADMIN
    if (newRole === "ADMIN") {
      setPendingRole(newRole);
      setShowConfirm(true);
      return;
    }

    applyRoleChange(newRole);
  }

  function handleConfirm() {
    if (pendingRole) {
      applyRoleChange(pendingRole);
    }
    setShowConfirm(false);
    setPendingRole(null);
  }

  function handleCancel() {
    setShowConfirm(false);
    setPendingRole(null);
  }

  if (isSelf) {
    return (
      <span className="text-sm text-muted-foreground italic">
        {currentRole} (you)
      </span>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={role} onValueChange={handleChange} disabled={loading}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USER">USER</SelectItem>
            <SelectItem value="ADMIN">ADMIN</SelectItem>
          </SelectContent>
        </Select>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Promote to Admin?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This user will receive full admin privileges including access to
              orders, products, customer data, and all settings. This action can
              be reversed but should be done with caution.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Yes, Promote to Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
