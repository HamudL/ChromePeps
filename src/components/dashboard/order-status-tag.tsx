import { cn } from "@/lib/utils";

/**
 * OrderStatusTag — eckiges Status-Tag im Protokoll-Stil für das
 * Kunden-Dashboard.
 *
 * Bewusst NICHT die ORDER_STATUS_COLORS aus constants.ts (englische
 * Admin-Labels, bunte Tailwind-Palette-Pillen): das Laborjournal des
 * Kunden spricht Deutsch und nutzt ausschließlich Design-Tokens.
 * Der Admin-Bereich bleibt unberührt.
 */

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Offen",
  PROCESSING: "In Bearbeitung",
  SHIPPED: "Versandt",
  DELIVERED: "Zugestellt",
  CANCELLED: "Storniert",
  REFUNDED: "Erstattet",
  ARCHIVED: "Archiviert",
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING: "border-border bg-muted text-muted-foreground",
  PROCESSING: "border-primary/30 bg-accent text-accent-foreground",
  SHIPPED: "border-primary/40 bg-primary/10 text-primary-strong",
  DELIVERED: "border-success/30 bg-success/10 text-success",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
  REFUNDED: "border-border bg-secondary text-secondary-foreground",
  ARCHIVED: "border-border bg-muted text-muted-foreground",
};

export function OrderStatusTag({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mono-tag inline-flex items-center whitespace-nowrap rounded-[2px] border px-2 py-1",
        STATUS_CLASSES[status] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
