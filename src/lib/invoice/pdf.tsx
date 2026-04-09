import "server-only";
import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { APP_NAME, SELLER_DETAILS, TAX_RATE } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

// -------- Types --------

export interface InvoicePdfItem {
  name: string;
  variant?: string | null;
  sku: string;
  quantity: number;
  unitPriceInCents: number;
}

export interface InvoicePdfAddress {
  firstName: string;
  lastName: string;
  company?: string | null;
  street: string;
  street2?: string | null;
  postalCode: string;
  city: string;
  country: string;
}

export interface InvoicePdfInput {
  invoiceNumber: string;
  issuedAt: Date;
  orderNumber: string;
  placedAt: Date;
  paymentMethod: "STRIPE" | "BANK_TRANSFER" | string;
  paymentStatus: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED" | string;
  currency: string;
  customerName?: string | null;
  customerEmail?: string | null;
  billingAddress?: InvoicePdfAddress | null;
  items: InvoicePdfItem[];
  subtotalInCents: number;
  discountInCents: number;
  shippingInCents: number;
  taxInCents: number;
  totalInCents: number;
  promoCode?: string | null;
}

// -------- Styles --------

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  brand: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  brandTag: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  sellerBlock: {
    textAlign: "right",
    fontSize: 9,
    color: "#4b5563",
    lineHeight: 1.4,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
    marginTop: 12,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 16,
  },
  metaCol: {
    flexDirection: "column",
    maxWidth: "48%",
  },
  metaLabel: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 10,
    color: "#111827",
    marginTop: 1,
    marginBottom: 6,
  },
  addressHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 4,
    color: "#111827",
  },
  addressLine: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#111827",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    fontSize: 9,
    color: "#1f2937",
  },
  colDescription: { flex: 3 },
  colSku: { flex: 1.3 },
  colQty: { flex: 0.6, textAlign: "right" },
  colUnit: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.3, textAlign: "right" },
  variantLine: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 1,
  },
  totalsBlock: {
    alignSelf: "flex-end",
    width: "55%",
    marginTop: 12,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    fontSize: 10,
    color: "#374151",
  },
  totalsRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#111827",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  footer: {
    position: "absolute",
    bottom: 36,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#6b7280",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    lineHeight: 1.4,
  },
  notice: {
    fontSize: 9,
    color: "#4b5563",
    marginTop: 14,
    lineHeight: 1.4,
  },
});

// -------- Helpers --------

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(d);
}

function paymentMethodLabel(method: string): string {
  switch (method) {
    case "STRIPE":
      return "Kreditkarte / Stripe";
    case "BANK_TRANSFER":
      return "Vorkasse (Überweisung)";
    default:
      return method;
  }
}

function paymentStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Ausstehend";
    case "SUCCEEDED":
      return "Bezahlt";
    case "FAILED":
      return "Fehlgeschlagen";
    case "REFUNDED":
      return "Erstattet";
    default:
      return status;
  }
}

// -------- Document --------

export function InvoiceDocument(props: InvoicePdfInput) {
  const {
    invoiceNumber,
    issuedAt,
    orderNumber,
    placedAt,
    paymentMethod,
    paymentStatus,
    customerName,
    billingAddress,
    items,
    subtotalInCents,
    discountInCents,
    shippingInCents,
    taxInCents,
    totalInCents,
    promoCode,
  } = props;

  const netTotalInCents = totalInCents - taxInCents;

  return (
    <Document
      title={`Rechnung ${invoiceNumber}`}
      author={APP_NAME}
      subject={`Rechnung zur Bestellung ${orderNumber}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header with brand and seller block */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Text style={styles.brandTag}>Premium Research Peptides</Text>
          </View>
          <View style={styles.sellerBlock}>
            <Text>{SELLER_DETAILS.companyName}</Text>
            <Text>{SELLER_DETAILS.streetLine1}</Text>
            <Text>{SELLER_DETAILS.postalCodeCity}</Text>
            <Text>{SELLER_DETAILS.country}</Text>
            <Text>{SELLER_DETAILS.email}</Text>
            <Text>USt-IdNr: {SELLER_DETAILS.vatId}</Text>
          </View>
        </View>

        <Text style={styles.title}>Rechnung</Text>
        <Text style={{ fontSize: 10, color: "#6b7280" }}>
          Rechnungs-Nr. {invoiceNumber}
        </Text>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.addressHeading}>Rechnungsempfänger</Text>
            {customerName && (
              <Text style={styles.addressLine}>{customerName}</Text>
            )}
            {billingAddress && (
              <>
                <Text style={styles.addressLine}>
                  {billingAddress.firstName} {billingAddress.lastName}
                </Text>
                {billingAddress.company && (
                  <Text style={styles.addressLine}>{billingAddress.company}</Text>
                )}
                <Text style={styles.addressLine}>{billingAddress.street}</Text>
                {billingAddress.street2 && (
                  <Text style={styles.addressLine}>{billingAddress.street2}</Text>
                )}
                <Text style={styles.addressLine}>
                  {billingAddress.postalCode} {billingAddress.city}
                </Text>
                <Text style={styles.addressLine}>{billingAddress.country}</Text>
              </>
            )}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Rechnungsdatum</Text>
            <Text style={styles.metaValue}>{formatDate(issuedAt)}</Text>

            <Text style={styles.metaLabel}>Bestellnummer</Text>
            <Text style={styles.metaValue}>{orderNumber}</Text>

            <Text style={styles.metaLabel}>Bestelldatum</Text>
            <Text style={styles.metaValue}>{formatDate(placedAt)}</Text>

            <Text style={styles.metaLabel}>Zahlung</Text>
            <Text style={styles.metaValue}>
              {paymentMethodLabel(paymentMethod)} ·{" "}
              {paymentStatusLabel(paymentStatus)}
            </Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDescription}>Beschreibung</Text>
          <Text style={styles.colSku}>SKU</Text>
          <Text style={styles.colQty}>Menge</Text>
          <Text style={styles.colUnit}>Einzelpreis</Text>
          <Text style={styles.colTotal}>Summe</Text>
        </View>

        {items.map((item, idx) => (
          <View style={styles.tableRow} key={`${item.sku}-${idx}`}>
            <View style={styles.colDescription}>
              <Text>{item.name}</Text>
              {item.variant && (
                <Text style={styles.variantLine}>{item.variant}</Text>
              )}
            </View>
            <Text style={styles.colSku}>{item.sku}</Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colUnit}>
              {formatPrice(item.unitPriceInCents)}
            </Text>
            <Text style={styles.colTotal}>
              {formatPrice(item.unitPriceInCents * item.quantity)}
            </Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Zwischensumme</Text>
            <Text>{formatPrice(subtotalInCents)}</Text>
          </View>
          {discountInCents > 0 && (
            <View style={styles.totalsRow}>
              <Text>Rabatt{promoCode ? ` (${promoCode})` : ""}</Text>
              <Text>-{formatPrice(discountInCents)}</Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <Text>Versand</Text>
            <Text>
              {shippingInCents === 0 ? "Kostenlos" : formatPrice(shippingInCents)}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Netto</Text>
            <Text>{formatPrice(netTotalInCents)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>MwSt. ({Math.round(TAX_RATE * 100)}%)</Text>
            <Text>{formatPrice(taxInCents)}</Text>
          </View>
          <View style={styles.totalsRowGrand}>
            <Text>Gesamtsumme</Text>
            <Text>{formatPrice(totalInCents)}</Text>
          </View>
        </View>

        <Text style={styles.notice}>
          Im Gesamtbetrag ist die gesetzliche Mehrwertsteuer von{" "}
          {Math.round(TAX_RATE * 100)}% enthalten. Diese Rechnung ist nach
          § 14 UStG erstellt und ohne Unterschrift gültig. Alle Produkte sind
          ausschließlich für In-vitro-Forschung bestimmt.
        </Text>

        {/* Footer — legal info */}
        <View style={styles.footer} fixed>
          <Text>
            {SELLER_DETAILS.companyName} · {SELLER_DETAILS.streetLine1} ·{" "}
            {SELLER_DETAILS.postalCodeCity} · {SELLER_DETAILS.country}
          </Text>
          <Text>
            Geschäftsführer: {SELLER_DETAILS.managingDirector} ·{" "}
            {SELLER_DETAILS.registerCourt} {SELLER_DETAILS.registerNumber} ·
            USt-IdNr {SELLER_DETAILS.vatId}
          </Text>
          <Text>
            E-Mail: {SELLER_DETAILS.email} · Telefon: {SELLER_DETAILS.phone}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Renders the invoice document to a Buffer. Called by the invoice download
 * API to stream the PDF back to the user.
 */
export async function renderInvoicePdf(
  input: InvoicePdfInput
): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument {...input} />);
}
