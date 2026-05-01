import type { ReactNode } from "react";
import { AlertTriangle, Beaker, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Callout-Box im Article-Body. Drei Varianten:
 *  - info: chrome-700 Border (default neutral hint)
 *  - note: gold border + warm bg (Methodik-Hervorhebung)
 *  - warn: red border + bg (Forschungsgebrauch / Risiko)
 *
 * Wird vom ArticleBody-Renderer aufgerufen, wenn ein Markdown-Blockquote
 * mit einem GitHub-Alert-Marker beginnt (`> [!NOTE]`, `> [!WARNING]`,
 * `> [!IMPORTANT]`).
 */

interface Props {
  type?: "info" | "note" | "warn";
  title?: string;
  children: ReactNode;
  className?: string;
}

const CONFIG: Record<
  NonNullable<Props["type"]>,
  { cls: string; icon: ReactNode; defaultTitle: string }
> = {
  info: {
    cls: "callout-info",
    icon: <Info size={16} />,
    defaultTitle: "Hinweis",
  },
  note: {
    cls: "callout-note",
    icon: <Beaker size={16} />,
    defaultTitle: "Methodik",
  },
  warn: {
    cls: "callout-warn",
    icon: <AlertTriangle size={16} />,
    defaultTitle: "Warnung",
  },
};

export function Callout({
  type = "info",
  title,
  children,
  className,
}: Props) {
  const cfg = CONFIG[type];
  return (
    <aside className={cn("callout", cfg.cls, className)} role="note">
      <span style={{ marginTop: 2 }}>{cfg.icon}</span>
      <div>
        <strong className="callout-title">{title ?? cfg.defaultTitle}</strong>
        <div>{children}</div>
      </div>
    </aside>
  );
}
