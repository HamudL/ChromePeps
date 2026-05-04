import "server-only";
import { sendMail, type SendMailResult } from "./client";
import PasswordResetEmail from "@/emails/password-reset";
import EmailVerifyEmail from "@/emails/email-verify";
import OrderConfirmationEmail, {
  type OrderConfirmationItem,
  type OrderConfirmationShippingAddress,
} from "@/emails/order-confirmation";
import OrderShippedEmail, {
  type OrderShippedItem,
  type OrderShippedAddress,
} from "@/emails/order-shipped";
import ReviewRequestEmail, {
  type ReviewRequestProduct,
} from "@/emails/review-request";
import {
  InventoryAlertEmail,
  type LowStockItem,
} from "@/emails/inventory-alert";
import { BANK_DETAILS } from "@/lib/constants";

/**
 * High-level mail wrappers. Each one is a thin shell around `sendMail` that
 * constructs the React element, subject, and tag. Callers don't need to know
 * about templates — just pass the data.
 *
 * All wrappers inherit the graceful-failure contract from `sendMail`:
 * they never throw, they log, and they return a result the caller can log too.
 */

export interface SendPasswordResetInput {
  to: string;
  name?: string | null;
  resetUrl: string;
  expiresInMinutes?: number;
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetInput
): Promise<SendMailResult> {
  return sendMail({
    to: input.to,
    subject: "Passwort zur\u00fccksetzen",
    tag: "password-reset",
    react: PasswordResetEmail({
      name: input.name,
      resetUrl: input.resetUrl,
      expiresInMinutes: input.expiresInMinutes,
    }),
  });
}

export interface SendOrderConfirmationInput {
  to: string;
  customerName?: string | null;
  orderNumber: string;
  orderUrl?: string;
  placedAt: Date;
  items: OrderConfirmationItem[];
  subtotalInCents: number;
  shippingInCents: number;
  taxInCents: number;
  discountInCents: number;
  totalInCents: number;
  paymentMethod: "STRIPE" | "BANK_TRANSFER";
  shippingAddress?: OrderConfirmationShippingAddress | null;
}

export async function sendOrderConfirmationEmail(
  input: SendOrderConfirmationInput
): Promise<SendMailResult> {
  const isBank = input.paymentMethod === "BANK_TRANSFER";
  const subject = isBank
    ? `Ihre Bestellung ${input.orderNumber} \u2013 bitte Vorkasse \u00fcberweisen`
    : `Bestellbest\u00e4tigung ${input.orderNumber}`;

  // Load COA PDFs for ordered products. Pro OrderItem matchen wir auf
  // Produkt + Variante (Dosis) — und bei Blends auch die Komponenten-COAs.
  const attachments = await loadCoaAttachments(
    input.items
      .filter((i): i is OrderConfirmationItem & { productId: string } =>
        Boolean(i.productId),
      )
      .map((i) => ({
        productId: i.productId,
        variantName: i.variant ?? null,
      })),
  );

  return sendMail({
    to: input.to,
    subject,
    tag: isBank ? "order-confirmation-bank" : "order-confirmation-stripe",
    attachments,
    react: OrderConfirmationEmail({
      customerName: input.customerName,
      orderNumber: input.orderNumber,
      orderUrl: input.orderUrl,
      placedAt: input.placedAt,
      items: input.items,
      subtotalInCents: input.subtotalInCents,
      shippingInCents: input.shippingInCents,
      taxInCents: input.taxInCents,
      discountInCents: input.discountInCents,
      totalInCents: input.totalInCents,
      paymentMethod: input.paymentMethod,
      shippingAddress: input.shippingAddress,
      bankDetails: isBank
        ? {
            accountHolder: BANK_DETAILS.accountHolder,
            iban: BANK_DETAILS.iban,
            bic: BANK_DETAILS.bic,
            bankName: BANK_DETAILS.bankName,
          }
        : undefined,
      hasCoaAttachments: attachments.length > 0,
    }),
  });
}

/**
 * Lädt COA-PDFs als Mail-Anhänge passend zu den bestellten Items.
 *
 * Matching-Logik:
 *  - Pro Item suchen wir den COA mit gleicher `dosage` (matcht
 *    OrderItem.variantName, z.B. "5mg"). Wenn keiner passt → neuester
 *    veröffentlichter COA des Produkts (Fallback).
 *  - Ist das Produkt ein Blend (hat `ProductComponent`-Einträge), dann
 *    werden zusätzlich die COAs jeder Komponente angehängt — wieder
 *    dosage-matched mit Fallback.
 *
 * Dedup: wenn mehrere Items denselben (productId, dosage) treffen, wird
 * der Anhang nur einmal verschickt — mehrfach den gleichen PDF an die
 * gleiche Mail anzuhängen ist nur Lärm.
 */
async function loadCoaAttachments(
  items: Array<{ productId: string; variantName: string | null }>,
): Promise<import("./client").SendMailAttachment[]> {
  if (items.length === 0) return [];

  try {
    const { db } = await import("@/lib/db");
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");

    // 1) Top-Level-Produkte sammeln (deduped)
    const topLevelIds = Array.from(new Set(items.map((it) => it.productId)));

    // 2) Für jedes Top-Level-Produkt: die Blend-Komponenten holen.
    //    Ein Top-Level-Produkt OHNE Komponenten ist ein normales
    //    Single-Wirkstoff-Produkt — dann bleibt der Componenten-Eintrag leer.
    const productsWithComponents = await db.product.findMany({
      where: { id: { in: topLevelIds } },
      select: {
        id: true,
        components: {
          select: { componentProductId: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    const componentsByParent = new Map<string, string[]>(
      productsWithComponents.map((p) => [
        p.id,
        p.components.map((c) => c.componentProductId),
      ]),
    );

    // 3) Targets aufbauen: jedes (productId, preferredDosage)-Paar, das
    //    angehängt werden muss. Top-Level-Items + deren Komponenten.
    type Target = { productId: string; preferredDosage: string | null };
    const targets: Target[] = [];
    const seenTargets = new Set<string>();
    const addTarget = (productId: string, preferredDosage: string | null) => {
      const k = `${productId}::${preferredDosage ?? ""}`;
      if (seenTargets.has(k)) return;
      seenTargets.add(k);
      targets.push({ productId, preferredDosage });
    };
    for (const item of items) {
      addTarget(item.productId, item.variantName);
      const compIds = componentsByParent.get(item.productId) ?? [];
      for (const cid of compIds) {
        // Komponente erbt die Dosis des Items als "preferred" — wenn der
        // Komponenten-COA keinen Match dazu hat, fällt loadCoa unten auf
        // den neuesten zurück.
        addTarget(cid, item.variantName);
      }
    }

    // 4) Alle in Frage kommenden COAs in einem Query holen.
    const allTargetProductIds = Array.from(
      new Set(targets.map((t) => t.productId)),
    );
    const allCoas = await db.certificateOfAnalysis.findMany({
      where: {
        productId: { in: allTargetProductIds },
        isPublished: true,
        pdfUrl: { not: null },
      },
      orderBy: { testDate: "desc" },
      select: {
        pdfUrl: true,
        dosage: true,
        productId: true,
        product: { select: { name: true } },
      },
    });
    const coasByProduct = new Map<string, typeof allCoas>();
    for (const coa of allCoas) {
      const arr = coasByProduct.get(coa.productId) ?? [];
      arr.push(coa);
      coasByProduct.set(coa.productId, arr);
    }

    // 5) Defense-in-depth: `pdfUrl` kommt aus der DB und wird von Admins
    //    gesetzt. Ein kompromittierter Admin-Account (oder ein Bug, der
    //    non-admin input in das Feld bringt) könnte `../../server.js`
    //    hinterlegen → `join()` resolved zu einem Pfad außerhalb von
    //    public/uploads/certificates und ein sensibler File wäre als
    //    Mail-Anhang leakbar. Wir pinnen den erlaubten Prefix hart,
    //    bevor readFile läuft — wenn der Path nicht darunter liegt,
    //    überspringen wir still.
    const allowedRoot = join(
      process.cwd(),
      "public",
      "uploads",
      "certificates",
    );

    const attachments: import("./client").SendMailAttachment[] = [];
    const seenAttachmentKeys = new Set<string>(); // dedupe by (productId, COA.dosage)

    for (const target of targets) {
      const productCoas = coasByProduct.get(target.productId) ?? [];
      if (productCoas.length === 0) continue;

      // Bevorzugter Match: dosage gleich. Sonst neuester (Liste ist
      // bereits testDate desc sortiert, also Index 0).
      const matched =
        (target.preferredDosage
          ? productCoas.find((c) => c.dosage === target.preferredDosage)
          : undefined) ?? productCoas[0];
      if (!matched?.pdfUrl) continue;

      const attachmentKey = `${matched.productId}::${matched.dosage ?? ""}`;
      if (seenAttachmentKeys.has(attachmentKey)) continue;
      seenAttachmentKeys.add(attachmentKey);

      try {
        const filePath = join(process.cwd(), "public", matched.pdfUrl);
        if (!filePath.startsWith(allowedRoot)) {
          console.warn(
            `[mail] COA pdfUrl outside allowed root, skipping: ${matched.pdfUrl}`,
          );
          continue;
        }
        const content = await readFile(filePath);
        const safeName = matched.product.name.replace(/[^a-zA-Z0-9-]/g, "_");
        const dosageSuffix = matched.dosage
          ? `-${matched.dosage.replace(/[^a-zA-Z0-9]/g, "")}`
          : "";
        attachments.push({
          filename: `COA-${safeName}${dosageSuffix}.pdf`,
          content,
        });
      } catch {
        // File not found — skip silently
        console.warn(`[mail] COA PDF not found: ${matched.pdfUrl}`);
      }
    }

    return attachments;
  } catch (err) {
    console.error("[mail] Failed to load COA attachments:", err);
    return [];
  }
}

// -------- Email verification --------

export interface SendEmailVerifyInput {
  to: string;
  name?: string | null;
  verifyUrl: string;
  expiresInHours?: number;
}

export async function sendEmailVerifyEmail(
  input: SendEmailVerifyInput
): Promise<SendMailResult> {
  return sendMail({
    to: input.to,
    subject: "Bitte best\u00e4tigen Sie Ihre E-Mail-Adresse",
    tag: "email-verify",
    react: EmailVerifyEmail({
      name: input.name,
      verifyUrl: input.verifyUrl,
      expiresInHours: input.expiresInHours,
    }),
  });
}

// -------- Order shipped --------

export interface SendOrderShippedInput {
  to: string;
  customerName?: string | null;
  orderNumber: string;
  orderUrl?: string;
  shippedAt: Date;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  items: OrderShippedItem[];
  shippingAddress?: OrderShippedAddress | null;
}

export async function sendOrderShippedEmail(
  input: SendOrderShippedInput
): Promise<SendMailResult> {
  return sendMail({
    to: input.to,
    subject: `Ihre Bestellung ${input.orderNumber} ist unterwegs`,
    tag: "order-shipped",
    react: OrderShippedEmail({
      customerName: input.customerName,
      orderNumber: input.orderNumber,
      orderUrl: input.orderUrl,
      shippedAt: input.shippedAt,
      trackingNumber: input.trackingNumber,
      trackingUrl: input.trackingUrl,
      items: input.items,
      shippingAddress: input.shippingAddress,
    }),
  });
}

// -------- Review request --------

export interface SendReviewRequestInput {
  to: string;
  customerName?: string | null;
  orderNumber: string;
  products: ReviewRequestProduct[];
}

export async function sendReviewRequestEmail(
  input: SendReviewRequestInput
): Promise<SendMailResult> {
  return sendMail({
    to: input.to,
    subject: `Wie war Ihre Bestellung ${input.orderNumber}?`,
    tag: "review-request",
    react: ReviewRequestEmail({
      customerName: input.customerName,
      orderNumber: input.orderNumber,
      products: input.products,
    }),
  });
}

// -------- Inventory Alert (Cron) --------

export interface SendInventoryAlertInput {
  to: string | string[];
  items: LowStockItem[];
  adminUrl?: string;
}

export async function sendInventoryAlertEmail(
  input: SendInventoryAlertInput,
): Promise<SendMailResult> {
  const outCount = input.items.filter((i) => i.stock === 0).length;
  const lowCount = input.items.length - outCount;
  // Subject ist informativ, damit Admin in Inbox-Vorschau direkt sieht
  // was los ist — ohne Mail öffnen zu müssen.
  const subject =
    outCount > 0
      ? `[Inventory] ${outCount} ausverkauft, ${lowCount} knapp`
      : `[Inventory] ${input.items.length} Artikel am Limit`;

  return sendMail({
    to: input.to,
    subject,
    tag: "inventory-alert",
    react: InventoryAlertEmail({
      items: input.items,
      adminUrl: input.adminUrl,
    }),
  });
}
