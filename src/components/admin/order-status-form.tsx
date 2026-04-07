"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Building2 } from "lucide-react";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;

interface OrderStatusFormProps {
  orderId: string;
  currentStatus: string;
  currentTracking: string | null;
  paymentMethod?: string;
  paymentStatus?: string;
}

export function OrderStatusForm({
  orderId,
  currentStatus,
  currentTracking,
  paymentMethod,
  paymentStatus,
}: OrderStatusFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [status, setStatus] = useState(currentStatus);
  const [trackingNumber, setTrackingNumber] = useState(
    currentTracking ?? ""
  );
  const [note, setNote] = useState("");
  const [markingPaid, setMarkingPaid] = useState(false);

  const isBankTransfer = paymentMethod === "BANK_TRANSFER";
  const isPendingPayment = paymentStatus === "PENDING";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          trackingNumber: trackingNumber || undefined,
          note: note || undefined,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to update order.");
        setSaving(false);
        return;
      }

      setSuccess("Order updated successfully.");
      setNote("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    }
    setSaving(false);
  }

  async function handleMarkAsPaid() {
    setMarkingPaid(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "SUCCEEDED",
        }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to mark as paid.");
        setMarkingPaid(false);
        return;
      }

      setSuccess("Payment confirmed! Order moved to Processing.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    }
    setMarkingPaid(false);
  }

  return (
    <div className="space-y-4">
      {/* Mark as Paid card for bank transfer orders */}
      {isBankTransfer && isPendingPayment && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Bank Transfer Payment
            </CardTitle>
            <CardDescription>
              This order is awaiting bank transfer payment. Mark as paid once
              the transfer has been received.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && !saving && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
                {error}
              </div>
            )}
            {success && !saving && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 mb-3">
                {success}
              </div>
            )}
            <Button
              onClick={handleMarkAsPaid}
              disabled={markingPaid}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {markingPaid ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Mark as Paid
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Standard status update form */}
      <Card>
        <CardHeader>
          <CardTitle>Update Status</CardTitle>
          <CardDescription>
            Change the order status and add tracking information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && saving && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}
            {success && saving && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {ORDER_STATUS_LABELS[s] ?? s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add a note for this status update..."
              />
            </div>

            <Button
              type="submit"
              disabled={saving || status === currentStatus}
              className="w-full"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Order
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
