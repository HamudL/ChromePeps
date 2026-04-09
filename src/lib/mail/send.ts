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

  return sendMail({
    to: input.to,
    subject,
    tag: isBank ? "order-confirmation-bank" : "order-confirmation-stripe",
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
    }),
  });
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
