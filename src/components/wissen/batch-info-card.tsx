import "server-only";
import { ArrowRight, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { format } from "date-fns";
import { de } from "date-fns/locale";

/**
 * "Aktuelle Charge"-Modul für Methoden-Artikel — zeigt eine Live-COA
 * eines Produkts im Article-Body. Server-Komponente: Lookup direkt
 * gegen die DB, kein Client-Fetch nötig.
 *
 * Wenn es zum Produkt-Slug keine veröffentlichte COA gibt, returnt
 * `null` — Article rendert ohne den Block weiter.
 */
interface Props {
  productSlug: string;
}

export async function BatchInfoCard({ productSlug }: Props) {
  const coa = await db.certificateOfAnalysis.findFirst({
    where: {
      product: { slug: productSlug },
      isPublished: true,
    },
    orderBy: { testDate: "desc" },
    include: {
      product: {
        select: { name: true, slug: true, weight: true },
      },
    },
  });

  if (!coa) return null;

  const verifiedAgo = formatRelative(coa.testDate);
  const formattedDate = format(coa.testDate, "dd.MM.yyyy", { locale: de });

  return (
    <aside className="my-8 not-prose section-ink rounded-sm border border-ink-border p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="mono-tag text-primary">Aktuelle Charge</span>
        <span
          className="mono-label text-ink-muted"
          style={{ fontSize: 10 }}
        >
          Live · {verifiedAgo}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <div>
          <p className="font-serif text-[26px] leading-tight font-medium">
            {coa.product.name}
            {coa.product.weight && (
              <span className="text-ink-muted"> · {coa.product.weight}</span>
            )}
          </p>
          <p
            className="font-mono text-[11px] text-ink-muted mt-1"
            style={{ letterSpacing: "0.06em" }}
          >
            Lot {coa.batchNumber}
            {coa.dosage && ` · ${coa.dosage}`}
          </p>
        </div>
        {coa.purity != null && (
          <span
            className="font-mono font-semibold tabular-nums text-primary"
            style={{ fontSize: 32 }}
          >
            {coa.purity.toFixed(2)}
            <span style={{ fontSize: 18, opacity: 0.85 }}>%</span>
          </span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-6 border-t border-ink-border">
        <Row k="Methode" v={coa.testMethod} />
        <Row k="Labor" v={coa.laboratory} />
        <Row k="Datum" v={formattedDate} />
        <Row k="Status" v="Freigegeben" />
      </dl>
      <div className="mt-5 flex items-center justify-between">
        <a
          href={`/products/${coa.product.slug}`}
          className="btn-ink inline-flex items-center gap-2"
        >
          Zum Produkt <ArrowRight size={12} />
        </a>
        {coa.reportUrl && (
          <a
            href={coa.reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10.5px] text-ink-muted hover:text-ink-foreground inline-flex items-center gap-1"
            style={{ letterSpacing: "0.12em" }}
          >
            <ExternalLink size={11} /> Report
          </a>
        )}
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="py-2.5 border-b border-ink-border">
      <dt className="mono-tag text-ink-muted">{k}</dt>
      <dd className="font-mono text-[12.5px] mt-0.5">{v}</dd>
    </div>
  );
}

/** "vor X Tagen" / "vor X Wochen" — kompakt, keine Bibliothek. */
function formatRelative(d: Date): string {
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "heute";
  if (days === 1) return "vor 1 Tag";
  if (days < 14) return `vor ${days} Tagen`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `vor ${weeks} Wochen`;
  const months = Math.floor(days / 30);
  return `vor ${months} Monaten`;
}
