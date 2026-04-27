"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CountryOption {
  countryCode: string;
  countryName: string;
}

interface Props {
  /** Aktueller Code-Wert (z.B. "DE"). */
  value: string;
  /** Callback bei Änderung — bekommt den ISO-3166-1-Alpha-2 Code. */
  onChange: (value: string) => void;
  /** Optional: HTML-id für Label-Verknüpfung. */
  id?: string;
  /** Optional: Disabled-Zustand (z.B. während eines Submits). */
  disabled?: boolean;
  /** Optional: required-Flag — wirkt nur a11y, der Select-Component validiert nicht. */
  required?: boolean;
}

/**
 * Wiederverwendbarer Country-Dropdown, gespeist aus den aktiven
 * `shipping_rates`. So bleiben drei Eigenschaften garantiert:
 *
 *   1. Was im Dropdown auftaucht, beliefern wir auch tatsächlich
 *      (Server-side gilt dieselbe Tabelle als Wahrheit).
 *   2. Admin kann im /admin/shipping ein Land deaktivieren und es
 *      verschwindet beim nächsten Page-Load aus allen Address-Forms.
 *   3. Wenn die User-Adresse einen Legacy-Code hat (z.B. "CH" obwohl
 *      CH nicht in den 27 EU-Defaults ist), zeigen wir den Code
 *      trotzdem an — sonst würde der Select scheinbar leer angezeigt
 *      und die gespeicherte Adresse wäre kaputt.
 *
 * Fallback bei Network-Error oder leerer DB: hartkodiertes "DE" als
 * einzige Option, damit der Submit nicht in einen Zustand mit
 * undefinierter country kippt.
 */
export function CountrySelect({
  value,
  onChange,
  id,
  disabled,
  required,
}: Props) {
  const [options, setOptions] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/shipping/rates")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && Array.isArray(json.data)) {
          setOptions(
            json.data.map((r: CountryOption) => ({
              countryCode: r.countryCode,
              countryName: r.countryName,
            })),
          );
        }
      })
      .catch(() => {
        // Silent fail — Submit-Pfad ist die Wahrheit, das Dropdown ist
        // nur Komfort. Bei leerem options-Array greift unten der
        // Single-DE-Fallback.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Wenn `value` nicht in der Liste ist (Legacy-Code aus alter Adresse),
  // prepend ihn als Option damit der Select ihn anzeigt statt leer zu
  // sein. Dropdown-Sortierung selbst kommt vom Server (sortOrder).
  const valueIsKnown = options.some((o) => o.countryCode === value);
  const finalOptions: CountryOption[] =
    !valueIsKnown && value
      ? [{ countryCode: value, countryName: value }, ...options]
      : options;

  // Während des initialen Loads sehen wir noch keine Rates — als
  // Fallback bieten wir wenigstens DE an, damit der Customer nicht
  // ein leeres Dropdown sieht und denkt, die Seite sei kaputt.
  const renderOptions =
    finalOptions.length > 0
      ? finalOptions
      : [{ countryCode: "DE", countryName: "Deutschland" }];

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || loading}
      required={required}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="Land auswählen" />
      </SelectTrigger>
      <SelectContent>
        {renderOptions.map((o) => (
          <SelectItem key={o.countryCode} value={o.countryCode}>
            {o.countryName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
