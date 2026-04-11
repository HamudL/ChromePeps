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

const ACCENT = "#18181b"; // zinc-900

const styles = StyleSheet.create({
  page: {
    padding: 48,
    paddingBottom: 80,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  accentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: ACCENT,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  brand: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 0.5,
  },
  brandTag: {
    fontSize: 8,
    color: "#9ca3af",
    marginTop: 2,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sellerBlock: {
    textAlign: "right",
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.5,
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#9ca3af",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 20,
  },
  metaCol: {
    flexDirection: "column",
    maxWidth: "48%",
  },
  metaLabel: {
    fontSize: 7,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontFamily: "Helvetica-Bold",
  },
  metaValue: {
    fontSize: 10,
    color: "#111827",
    marginTop: 2,
    marginBottom: 8,
  },
  addressHeading: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginBottom: 6,
    color: ACCENT,
  },
  addressLine: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: ACCENT,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#ffffff",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  tableRowEven: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    fontSize: 9,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },
  tableRowOdd: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    fontSize: 9,
    color: "#1f2937",
    backgroundColor: "#fafafa",
  },
  colDescription: { flex: 3 },
  colSku: { flex: 1.3 },
  colQty: { flex: 0.6, textAlign: "right" },
  colUnit: { flex: 1.2, textAlign: "right" },
  colTotal: { flex: 1.3, textAlign: "right" },
  variantLine: {
    fontSize: 8,
    color: "#9ca3af",
    marginTop: 1,
  },
  totalsBlock: {
    alignSelf: "flex-end",
    width: "55%",
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    fontSize: 10,
    color: "#4b5563",
  },
  totalsRowGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 2,
    borderTopColor: ACCENT,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 7,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    lineHeight: 1.5,
  },
  notice: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 20,
    lineHeight: 1.5,
    padding: 10,
    backgroundColor: "#fafafa",
    borderRadius: 4,
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
      return "Vorkasse (\u00DCberweisung)";
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
        {/* Accent bar at top */}
        <View style={styles.accentBar} fixed />

        {/* Header with brand and seller block */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{APP_NAME}</Text>
            <Text style={styles.brandTag}>Research Peptides</Text>
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
        <Text style={styles.subtitle}>
          Rechnungs-Nr. {invoiceNumber}
        </Text>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.addressHeading}>Rechnungsempf\u00e4nger</Text>
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
              {paymentMethodLabel(paymentMethod)} \u00b7{" "}
              {paymentStatusLabel(paymentStatus)}
            </Text>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.tableHeader}>
          <Text style={styles.colDescription}>Beschreibung</Text>
          <Text style={styles.colSku}>SKU</Text>
          <Text style={styles.colQty}>Menge</Text>
          <Text style={styles.colUnit}>Einzelpreis</Text>
          <Text style={styles.colTotal}>Summe</Text>
        </View>

        {items.map((item, idx) => (
          <View
            style={idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}
            key={`${item.sku}-${idx}`}
          >
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

        <View style={styles.notice}>
          <Text>
            Im Gesamtbetrag ist die gesetzliche Mehrwertsteuer von{" "}
            {Math.round(TAX_RATE * 100)}% enthalten. Diese Rechnung ist nach
            \u00a7 14 UStG erstellt und ohne Unterschrift g\u00fcltig. Alle
            Produkte sind ausschlie\u00dflich als Referenzmaterialien f\u00fcr
            die In-vitro-Forschung bestimmt.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>
            {SELLER_DETAILS.companyName} \u00b7 {SELLER_DETAILS.streetLine1} \u00b7{" "}
            {SELLER_DETAILS.postalCodeCity} \u00b7 {SELLER_DETAILS.country}
          </Text>
          <Text>
            Gesch\u00e4ftsf\u00fchrer: {SELLER_DETAILS.managingDirector} \u00b7{" "}
            {SELLER_DETAILS.registerCourt} {SELLER_DETAILS.registerNumber} \u00b7
            USt-IdNr {SELLER_DETAILS.vatId}
          </Text>
          <Text>
            E-Mail: {SELLER_DETAILS.email} \u00b7 Telefon: {SELLER_DETAILS.phone}
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
