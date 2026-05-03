"use client";

import { useCallback, useRef } from "react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Code,
  Code2,
  Quote,
  List,
  ListOrdered,
  Table as TableIcon,
  Info,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Markdown-Editor mit Toolbar für den Wissens-CMS-Bereich. Reine
 * Textarea + Markdown-Snippet-Helper — keine externe Editor-Lib weil
 * (a) wir die Live-Preview separat rendern (siehe MarkdownEditorWithPreview)
 * und (b) Editor-Libs wie @uiw/react-md-editor ihre eigene Preview
 * mitbringen, die NICHT der Live-Site entspricht.
 *
 * Toolbar-Buttons fügen Markdown-Snippets bei der Cursor-Position ein.
 * Wenn Text selektiert ist, wird er gewrappt (z.B. `**selektion**`).
 *
 * Keyboard-Shortcuts: Ctrl/Cmd+B (bold), Ctrl/Cmd+I (italic),
 * Ctrl/Cmd+K (link). Tab wird zur Standard-Indent statt Focus-Switch
 * — innerhalb des Textareas, sonst unbenutzbar für Code-Listings.
 */

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  /** Wenn true: kompakter Modus (kürzere Toolbar) für FAQ/Glossar-Inputs. */
  compact?: boolean;
}

interface SnippetConfig {
  /** Wenn `wrap` gesetzt: vor + nach Selektion einfügen. Sonst `inline`-Snippet. */
  wrap?: { before: string; after: string; placeholder?: string };
  /** Block-Snippet: wird auf eigene Zeile(n) eingefügt — Newlines werden vorne/hinten ergänzt falls nötig. */
  block?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 24,
  className,
  compact = false,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = useCallback(
    (config: SnippetConfig) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = value.slice(0, start);
      const selected = value.slice(start, end);
      const after = value.slice(end);

      let next: string;
      let cursorAt: number;

      if (config.wrap) {
        const inner = selected || (config.wrap.placeholder ?? "");
        next = `${before}${config.wrap.before}${inner}${config.wrap.after}${after}`;
        cursorAt = before.length + config.wrap.before.length + inner.length;
        // Wenn Placeholder eingefügt wurde, selektiere ihn statt nur Cursor zu setzen.
        if (!selected && config.wrap.placeholder) {
          setTimeout(() => {
            ta.focus();
            ta.setSelectionRange(
              before.length + config.wrap!.before.length,
              before.length + config.wrap!.before.length + inner.length,
            );
          }, 0);
        } else {
          setTimeout(() => {
            ta.focus();
            ta.setSelectionRange(cursorAt, cursorAt);
          }, 0);
        }
      } else if (config.block) {
        // Block-Snippet: vor Snippet ein Blank-Line wenn before nicht
        // schon mit \n\n endet, danach ebenfalls.
        const needsLeadingBlank = before && !before.endsWith("\n\n");
        const needsTrailingBlank = after && !after.startsWith("\n\n");
        const lead = needsLeadingBlank ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
        const trail = needsTrailingBlank ? "\n\n" : "";
        next = `${before}${lead}${config.block}${trail}${after}`;
        cursorAt = before.length + lead.length + config.block.length;
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(cursorAt, cursorAt);
        }, 0);
      } else {
        return;
      }

      onChange(next);
    },
    [value, onChange],
  );

  // Tab zur Indent-Funktion umfunktionieren (nur in der Textarea selbst).
  // Sonst kann man Code-Blöcke nicht sinnvoll bearbeiten.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = e.currentTarget;
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      if (ctrlOrMeta && e.key.toLowerCase() === "b") {
        e.preventDefault();
        insertSnippet({
          wrap: { before: "**", after: "**", placeholder: "fett" },
        });
        return;
      }
      if (ctrlOrMeta && e.key.toLowerCase() === "i") {
        e.preventDefault();
        insertSnippet({
          wrap: { before: "*", after: "*", placeholder: "kursiv" },
        });
        return;
      }
      if (ctrlOrMeta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        insertSnippet({
          wrap: {
            before: "[",
            after: "](https://)",
            placeholder: "Linktext",
          },
        });
        return;
      }
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const next = value.slice(0, start) + "  " + value.slice(end);
        onChange(next);
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(start + 2, start + 2);
        }, 0);
      }
    },
    [insertSnippet, value, onChange],
  );

  return (
    <div
      className={cn(
        "flex flex-col rounded-md border border-border bg-white overflow-hidden",
        className,
      )}
    >
      <Toolbar
        compact={compact}
        onInsert={insertSnippet}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        placeholder={placeholder ?? "Hier schreiben — Markdown wird gerendert. Tab fügt 2 Spaces ein. Strg+B/I/K für Bold/Italic/Link."}
        className="w-full flex-1 px-4 py-3 font-mono text-[13.5px] leading-relaxed resize-y focus:outline-none placeholder:text-muted-foreground/60"
        spellCheck={false}
      />
    </div>
  );
}

interface ToolbarProps {
  compact: boolean;
  onInsert: (config: SnippetConfig) => void;
}

function Toolbar({ compact, onInsert }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-2 py-1.5">
      <ToolbarButton
        title="Fett (Strg+B)"
        onClick={() =>
          onInsert({
            wrap: { before: "**", after: "**", placeholder: "fett" },
          })
        }
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Kursiv (Strg+I)"
        onClick={() =>
          onInsert({
            wrap: { before: "*", after: "*", placeholder: "kursiv" },
          })
        }
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>

      {!compact && (
        <>
          <Sep />
          <ToolbarButton
            title="Heading 2"
            onClick={() => onInsert({ block: "## Überschrift" })}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Heading 3"
            onClick={() => onInsert({ block: "### Unter-Überschrift" })}
          >
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>
        </>
      )}

      <Sep />
      <ToolbarButton
        title="Link (Strg+K)"
        onClick={() =>
          onInsert({
            wrap: {
              before: "[",
              after: "](https://)",
              placeholder: "Linktext",
            },
          })
        }
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        title="Inline-Code"
        onClick={() =>
          onInsert({
            wrap: { before: "`", after: "`", placeholder: "code" },
          })
        }
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      {!compact && (
        <>
          <ToolbarButton
            title="Code-Block"
            onClick={() =>
              onInsert({
                block: "```text\nhier code\n```",
              })
            }
          >
            <Code2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <Sep />
          <ToolbarButton
            title="Aufzählung"
            onClick={() =>
              onInsert({ block: "- erstes Item\n- zweites Item" })
            }
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Nummerierte Liste"
            onClick={() =>
              onInsert({ block: "1. erstes Item\n2. zweites Item" })
            }
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Zitat"
            onClick={() =>
              onInsert({ block: "> Zitat-Text" })
            }
          >
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>
          <Sep />
          <ToolbarButton
            title="Tabelle"
            onClick={() =>
              onInsert({
                block:
                  "| Spalte A | Spalte B |\n|----------|----------|\n| Zeile 1  | Wert 1   |\n| Zeile 2  | Wert 2   |",
              })
            }
          >
            <TableIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Bild"
            onClick={() =>
              onInsert({ block: "![Alt-Text](https://...)" })
            }
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <Sep />
          <ToolbarButton
            title="Hinweis-Callout (GitHub-Alert)"
            onClick={() =>
              onInsert({
                block:
                  "> [!NOTE]\n> Hinweis-Text — wird als Info-Callout gerendert.",
              })
            }
          >
            <Info className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Warn-Callout (GitHub-Alert)"
            onClick={() =>
              onInsert({
                block:
                  "> [!WARNING]\n> Warnungs-Text — wird als rot eingefärbter Callout gerendert.",
              })
            }
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </ToolbarButton>
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="mx-0.5 h-4 w-px bg-border" aria-hidden="true" />;
}
