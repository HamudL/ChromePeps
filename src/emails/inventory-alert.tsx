import {
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/email-layout";

export interface LowStockItem {
  /** Anzeigename (Produkt oder "Produkt — Variante"). */
  name: string;
  sku: string;
  stock: number;
  threshold: number;
}

interface InventoryAlertEmailProps {
  items: LowStockItem[];
  adminUrl?: string;
}

export function InventoryAlertEmail({
  items,
  adminUrl = "https://chromepeps.com/admin/products",
}: InventoryAlertEmailProps) {
  const outOfStock = items.filter((i) => i.stock === 0);
  const low = items.filter((i) => i.stock > 0);
  const previewLine =
    outOfStock.length > 0
      ? `${outOfStock.length} ausverkauft, ${low.length} knapp`
      : `${low.length} Produkte am Limit`;

  return (
    <EmailLayout preview={previewLine}>
      <Text className="m-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Inventory-Alert
      </Text>
      <Heading className="m-0 mt-2 text-2xl font-bold leading-tight text-neutral-900">
        {items.length} Artikel unter Mindestbestand
      </Heading>
      <Text className="mt-5 text-sm leading-6 text-neutral-700">
        Diese Produkte / Varianten liegen aktuell auf oder unter ihrer
        konfigurierten Low-Stock-Schwelle. Bitte Nachschub planen oder
        die Schwelle anpassen, wenn das gewollt ist.
      </Text>

      {outOfStock.length > 0 && (
        <Section className="mt-6">
          <Text className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700">
            Ausverkauft ({outOfStock.length})
          </Text>
          {outOfStock.map((item) => (
            <Text
              key={item.sku}
              className="m-0 mt-2 text-sm leading-6 text-neutral-900"
            >
              <strong>{item.name}</strong>
              <span className="text-neutral-500"> · {item.sku}</span>
              <span className="text-rose-700"> — 0 / {item.threshold}</span>
            </Text>
          ))}
        </Section>
      )}

      {low.length > 0 && (
        <Section className="mt-6">
          <Text className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Knapp ({low.length})
          </Text>
          {low.map((item) => (
            <Text
              key={item.sku}
              className="m-0 mt-2 text-sm leading-6 text-neutral-900"
            >
              <strong>{item.name}</strong>
              <span className="text-neutral-500"> · {item.sku}</span>
              <span className="text-amber-700">
                {" "}
                — {item.stock} / {item.threshold}
              </span>
            </Text>
          ))}
        </Section>
      )}

      <Hr className="my-6 border-zinc-200" />

      <Text className="m-0 text-xs leading-5 text-zinc-500">
        Direktlink:{" "}
        <a
          href={adminUrl}
          className="text-neutral-700 underline"
        >
          /admin/products
        </a>
        . Alert-Schwelle pro Produkt: Edit-Form, Feld „Low-Stock
        Threshold&ldquo;. Stille einzelne Produkte indem du die Schwelle auf
        0 setzt — dann nie wieder Alert für dieses Produkt.
      </Text>
    </EmailLayout>
  );
}
