"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  async function handleChange(newRole: string) {
    if (newRole === role) return;
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

  if (isSelf) {
    return (
      <span className="text-sm text-muted-foreground italic">
        {currentRole} (you)
      </span>
    );
  }

  return (
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
  );
}
