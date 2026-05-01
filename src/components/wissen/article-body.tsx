import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Callout } from "./callout";
import { slugifyHeading } from "@/lib/wissen/slugify-heading";
import type { ReactNode, ReactElement } from "react";

/**
 * Article-Body-Renderer für Wissens-Posts. Server-Komponente —
 * react-markdown läuft serverseitig, kein Client-Bundle.
 *
 * Custom Components-Mapping:
 *  - h2/h3 bekommen IDs für Anchor-Links + TOC-Scrollspy.
 *  - Blockquote mit GitHub-Alert-Marker am Anfang
 *    (`> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]`, `> [!TIP]`,
 *    `> [!CAUTION]`) wird als <Callout> umgebaut. Andere Blockquotes
 *    bleiben Standard-blockquote.
 *  - Code-Blöcke mit `language-…`-Hint kriegen ein dezentes Lang-Tag
 *    oben rechts (z.B. "FORMEL", "BASH", "SQL").
 *
 * Tabellen, Listen, Bilder rendern als Standard-Markdown — via .prose-
 * Klasse im umgebenden Container styled.
 */

interface Props {
  markdown: string;
}

const ALERT_PATTERNS: Record<string, "info" | "note" | "warn"> = {
  "[!NOTE]": "info",
  "[!TIP]": "note",
  "[!IMPORTANT]": "note",
  "[!WARNING]": "warn",
  "[!CAUTION]": "warn",
};

const ALERT_TITLES: Record<string, string> = {
  "[!NOTE]": "Hinweis",
  "[!TIP]": "Tipp",
  "[!IMPORTANT]": "Wichtig",
  "[!WARNING]": "Warnung",
  "[!CAUTION]": "Achtung",
};

/** Holt das erste Text-Token aus einer ReactMarkdown-Children-Sequenz. */
function firstTextToken(children: ReactNode): string | null {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    for (const c of children) {
      const t = firstTextToken(c);
      if (t !== null) return t;
    }
    return null;
  }
  if (
    children &&
    typeof children === "object" &&
    "props" in children &&
    children.props &&
    typeof children.props === "object" &&
    "children" in children.props
  ) {
    return firstTextToken(
      (children.props as { children: ReactNode }).children,
    );
  }
  return null;
}

/** Strippt das Alert-Marker-Token aus dem ersten Paragraph der Blockquote. */
function stripAlertMarker(
  children: ReactNode,
  marker: string,
): ReactNode {
  // children ist typischerweise [<p>{markerToken + content}</p>, ...].
  // Wir traversieren den Tree und ersetzen den ersten String-Treffer.
  let stripped = false;
  function walk(node: ReactNode): ReactNode {
    if (stripped) return node;
    if (typeof node === "string") {
      const idx = node.indexOf(marker);
      if (idx === -1) return node;
      stripped = true;
      // Marker + ggf. nachfolgender Whitespace/Newline entfernen
      const before = node.slice(0, idx);
      const after = node.slice(idx + marker.length).replace(/^\s*\n?/, "");
      return before + after;
    }
    if (Array.isArray(node)) {
      return node.map(walk);
    }
    if (
      node &&
      typeof node === "object" &&
      "props" in node &&
      node.props &&
      typeof node.props === "object" &&
      "children" in node.props
    ) {
      const el = node as ReactElement<{ children?: ReactNode }>;
      const newChildren = walk(el.props.children);
      // Re-clone das Element mit neuen children. Statt cloneElement
      // einfacher: wir umhüllen es nicht — ist nur das obere <p> betroffen
      // (Markdown rendert die erste Quote-Zeile als <p>).
      return {
        ...el,
        props: { ...el.props, children: newChildren },
      } as ReactElement;
    }
    return node;
  }
  return walk(children);
}

const components: Components = {
  h2: ({ children, ...props }) => (
    <h2 id={slugifyHeading(children)} {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 id={slugifyHeading(children)} {...props}>
      {children}
    </h3>
  ),
  blockquote: ({ children, ...props }) => {
    const firstText = firstTextToken(children) ?? "";
    const matchedMarker = Object.keys(ALERT_PATTERNS).find((m) =>
      firstText.startsWith(m),
    );
    if (matchedMarker) {
      const type = ALERT_PATTERNS[matchedMarker];
      const title = ALERT_TITLES[matchedMarker];
      const stripped = stripAlertMarker(children, matchedMarker);
      return (
        <Callout type={type} title={title}>
          {stripped}
        </Callout>
      );
    }
    return <blockquote {...props}>{children}</blockquote>;
  },
  // pre+code rendern als Lang-Tag-Wrapper. react-markdown gibt uns
  // <pre><code class="language-xxx">…</code></pre>; wir wrappen das
  // mit einem zusätzlichen Lang-Label.
  pre: ({ children, ...props }) => {
    // Lang-Hint extrahieren — react-markdown übergibt das Code-Element
    // als Child mit `className="language-xxx"`.
    let lang: string | null = null;
    const childNode = children as
      | ReactElement<{ className?: string }>
      | undefined;
    if (
      childNode &&
      typeof childNode === "object" &&
      "props" in childNode &&
      childNode.props?.className
    ) {
      const m = /language-(\w+)/.exec(childNode.props.className);
      if (m) lang = m[1].toUpperCase();
    }
    return (
      <pre {...props}>
        {lang && <span className="lang-tag">{lang}</span>}
        {children}
      </pre>
    );
  },
};

export function ArticleBody({ markdown }: Props) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {markdown}
    </ReactMarkdown>
  );
}
