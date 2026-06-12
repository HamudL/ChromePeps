import { describe, it, expect, vi, beforeEach } from "vitest";
import { join } from "path";

/**
 * High-level Mail-Wrapper (lib/mail/send.ts). Fokus:
 *  - Subject/Tag/retries-Verdrahtung pro Mail-Typ
 *  - Bank- vs. Stripe-Bestellbestätigung (Vorkasse-Subject, Bankdaten
 *    nur wenn IBAN konfiguriert)
 *  - COA-Anhang-Logik: Dosage-Match mit Fallback, Dedupe,
 *    Path-Traversal-Pin auf public/uploads/certificates,
 *    25-MB-Budget, fehlende Files überspringen, DB-Fehler → keine
 *    Anhänge statt Mail-Abbruch
 *
 * sendMail selbst ist gemockt (eigene Tests in mail-client.test.ts);
 * die React-Templates sind Stubs — hier zählt nur die Verdrahtung.
 */
const {
  sendMailMock,
  productFindManyMock,
  coaFindManyMock,
  readFileMock,
} = vi.hoisted(() => ({
  sendMailMock: vi.fn(),
  productFindManyMock: vi.fn(),
  coaFindManyMock: vi.fn(),
  readFileMock: vi.fn(),
}));

vi.mock("@/lib/mail/client", () => ({ sendMail: sendMailMock }));
vi.mock("@/lib/db", () => ({
  db: {
    product: { findMany: productFindManyMock },
    certificateOfAnalysis: { findMany: coaFindManyMock },
  },
}));
vi.mock("fs/promises", () => ({ readFile: readFileMock }));

// Templates stubben — kein react-email-Rendering in diesem Test.
vi.mock("@/emails/password-reset", () => ({ default: vi.fn(() => null) }));
vi.mock("@/emails/email-verify", () => ({ default: vi.fn(() => null) }));
vi.mock("@/emails/order-confirmation", () => ({ default: vi.fn((p) => p) }));
vi.mock("@/emails/order-shipped", () => ({ default: vi.fn(() => null) }));
vi.mock("@/emails/review-request", () => ({ default: vi.fn(() => null) }));
vi.mock("@/emails/inventory-alert", () => ({
  InventoryAlertEmail: vi.fn(() => null),
}));

// Bankdaten deterministisch setzen (echte Werte kämen aus BANK_*-Env).
vi.mock("@/lib/constants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/constants")>()),
  BANK_DETAILS: {
    accountHolder: "ChromePeps GmbH",
    iban: "DE89370400440532013000",
    bic: "COBADEFFXXX",
    bankName: "Commerzbank",
  },
}));

import {
  sendPasswordResetEmail,
  sendEmailVerifyEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendReviewRequestEmail,
  sendInventoryAlertEmail,
  type SendOrderConfirmationInput,
} from "@/lib/mail/send";

function orderInput(
  overrides: Partial<SendOrderConfirmationInput> = {}
): SendOrderConfirmationInput {
  return {
    to: "kunde@example.com",
    orderNumber: "CP-2026-0001",
    placedAt: new Date("2026-06-01"),
    items: [],
    subtotalInCents: 4999,
    shippingInCents: 599,
    taxInCents: 0,
    discountInCents: 0,
    totalInCents: 5598,
    paymentMethod: "STRIPE",
    ...overrides,
  };
}

function coa(
  productId: string,
  dosage: string | null,
  pdfUrl: string,
  name = "BPC-157"
) {
  return { pdfUrl, dosage, productId, product: { name } };
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMailMock.mockResolvedValue({ success: true, id: "email_1" });
  productFindManyMock.mockResolvedValue([]);
  coaFindManyMock.mockResolvedValue([]);
  readFileMock.mockResolvedValue(Buffer.from("pdf-bytes"));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("interaktive Mails — retries: 0 (kein Spinner-Hang)", () => {
  it("Password-Reset", async () => {
    await sendPasswordResetEmail({ to: "a@b.de", resetUrl: "https://x/r" });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Passwort zurücksetzen",
        tag: "password-reset",
        retries: 0,
      })
    );
  });

  it("E-Mail-Verifizierung", async () => {
    await sendEmailVerifyEmail({ to: "a@b.de", verifyUrl: "https://x/v" });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "email-verify", retries: 0 })
    );
  });
});

describe("sendOrderConfirmationEmail — Bank vs. Stripe", () => {
  it("Stripe: Standard-Subject, kein bankDetails-Block", async () => {
    await sendOrderConfirmationEmail(orderInput());

    const call = sendMailMock.mock.calls[0][0];
    expect(call.subject).toBe("Bestellbestätigung CP-2026-0001");
    expect(call.tag).toBe("order-confirmation-stripe");
    // Template-Stub reicht Props durch → bankDetails prüfbar.
    expect(call.react.bankDetails).toBeUndefined();
    expect(call.react.hasCoaAttachments).toBe(false);
  });

  it("Vorkasse: Überweisungs-Subject + Bankdaten aus BANK_DETAILS", async () => {
    await sendOrderConfirmationEmail(
      orderInput({ paymentMethod: "BANK_TRANSFER" })
    );

    const call = sendMailMock.mock.calls[0][0];
    expect(call.subject).toBe(
      "Ihre Bestellung CP-2026-0001 – bitte Vorkasse überweisen"
    );
    expect(call.tag).toBe("order-confirmation-bank");
    expect(call.react.bankDetails).toEqual({
      accountHolder: "ChromePeps GmbH",
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      bankName: "Commerzbank",
    });
  });
});

describe("sendOrderConfirmationEmail — COA-Anhänge", () => {
  const item = (productId: string | null, variant: string | null) => ({
    name: "Item",
    quantity: 1,
    priceInCents: 4999,
    productId,
    variant,
  });

  it("Items ohne productId → gar kein DB-Lookup, keine Anhänge", async () => {
    await sendOrderConfirmationEmail(orderInput({ items: [item(null, null)] }));

    expect(productFindManyMock).not.toHaveBeenCalled();
    expect(sendMailMock.mock.calls[0][0].attachments).toEqual([]);
  });

  it("Dosage-Match gewinnt; Dateiname wird sanitisiert + Dosis-Suffix", async () => {
    productFindManyMock.mockResolvedValue([{ id: "p1", components: [] }]);
    coaFindManyMock.mockResolvedValue([
      coa("p1", "10mg", "/uploads/certificates/neu.pdf", "BPC 157®"),
      coa("p1", "5mg", "/uploads/certificates/alt.pdf", "BPC 157®"),
    ]);

    await sendOrderConfirmationEmail(orderInput({ items: [item("p1", "5mg")] }));

    const call = sendMailMock.mock.calls[0][0];
    expect(call.attachments).toEqual([
      { filename: "COA-BPC_157_-5mg.pdf", content: Buffer.from("pdf-bytes") },
    ]);
    expect(call.react.hasCoaAttachments).toBe(true);
    expect(readFileMock).toHaveBeenCalledWith(
      join(process.cwd(), "public", "/uploads/certificates/alt.pdf")
    );
  });

  it("kein Dosage-Match → Fallback auf neuesten COA (Index 0), ohne Suffix bei dosage null", async () => {
    productFindManyMock.mockResolvedValue([{ id: "p1", components: [] }]);
    coaFindManyMock.mockResolvedValue([
      coa("p1", null, "/uploads/certificates/latest.pdf"),
    ]);

    await sendOrderConfirmationEmail(
      orderInput({ items: [item("p1", "99mg")] })
    );

    expect(sendMailMock.mock.calls[0][0].attachments).toEqual([
      { filename: "COA-BPC-157.pdf", content: Buffer.from("pdf-bytes") },
    ]);
  });

  it("Dedupe: zwei Items mit gleichem (Produkt, Dosis)-Treffer → ein Anhang", async () => {
    productFindManyMock.mockResolvedValue([{ id: "p1", components: [] }]);
    coaFindManyMock.mockResolvedValue([
      coa("p1", "5mg", "/uploads/certificates/a.pdf"),
    ]);

    await sendOrderConfirmationEmail(
      orderInput({ items: [item("p1", "5mg"), item("p1", "5mg")] })
    );

    expect(sendMailMock.mock.calls[0][0].attachments).toHaveLength(1);
  });

  it("Blend: Komponenten-COAs werden zusätzlich angehängt", async () => {
    productFindManyMock.mockResolvedValue([
      { id: "blend", components: [{ componentProductId: "comp1" }] },
    ]);
    coaFindManyMock.mockResolvedValue([
      coa("blend", "5mg", "/uploads/certificates/blend.pdf", "Blend"),
      coa("comp1", null, "/uploads/certificates/comp.pdf", "Komponente"),
    ]);

    await sendOrderConfirmationEmail(
      orderInput({ items: [item("blend", "5mg")] })
    );

    const filenames = sendMailMock.mock.calls[0][0].attachments.map(
      (a: { filename: string }) => a.filename
    );
    expect(filenames).toEqual(["COA-Blend-5mg.pdf", "COA-Komponente.pdf"]);
  });

  it("Path-Traversal-pdfUrl (außerhalb uploads/certificates) wird NICHT gelesen", async () => {
    productFindManyMock.mockResolvedValue([{ id: "p1", components: [] }]);
    coaFindManyMock.mockResolvedValue([
      coa("p1", null, "/../.env"),
    ]);

    await sendOrderConfirmationEmail(orderInput({ items: [item("p1", null)] }));

    expect(readFileMock).not.toHaveBeenCalled();
    expect(sendMailMock.mock.calls[0][0].attachments).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("outside allowed root")
    );
  });

  it("fehlende PDF-Datei → Skip mit Warnung, Mail geht trotzdem raus", async () => {
    productFindManyMock.mockResolvedValue([{ id: "p1", components: [] }]);
    coaFindManyMock.mockResolvedValue([
      coa("p1", null, "/uploads/certificates/weg.pdf"),
    ]);
    readFileMock.mockRejectedValue(new Error("ENOENT"));

    await sendOrderConfirmationEmail(orderInput({ items: [item("p1", null)] }));

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock.mock.calls[0][0].attachments).toEqual([]);
  });

  it("25-MB-Budget: zu großer COA wird übersprungen, kleinerer danach kommt noch mit", async () => {
    productFindManyMock.mockResolvedValue([
      { id: "p1", components: [] },
      { id: "p2", components: [] },
    ]);
    coaFindManyMock.mockResolvedValue([
      coa("p1", null, "/uploads/certificates/riesig.pdf", "Riese"),
      coa("p2", null, "/uploads/certificates/klein.pdf", "Zwerg"),
    ]);
    readFileMock
      .mockResolvedValueOnce(Buffer.alloc(26 * 1024 * 1024)) // sprengt Budget
      .mockResolvedValueOnce(Buffer.from("klein"));

    await sendOrderConfirmationEmail(
      orderInput({ items: [item("p1", null), item("p2", null)] })
    );

    const call = sendMailMock.mock.calls[0][0];
    expect(call.attachments.map((a: { filename: string }) => a.filename)).toEqual([
      "COA-Zwerg.pdf",
    ]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("budget exceeded")
    );
  });

  it("DB-Fehler beim COA-Laden → Mail ohne Anhänge statt Fehlschlag", async () => {
    productFindManyMock.mockRejectedValue(new Error("db down"));

    const result = await sendOrderConfirmationEmail(
      orderInput({ items: [item("p1", null)] })
    );

    expect(result).toEqual({ success: true, id: "email_1" });
    expect(sendMailMock.mock.calls[0][0].attachments).toEqual([]);
    expect(console.error).toHaveBeenCalledWith(
      "[mail] Failed to load COA attachments:",
      expect.any(Error)
    );
  });
});

describe("Versand-/Review-/Inventory-Mails", () => {
  it("Order-Shipped nutzt vollen Retry (fire-and-forget)", async () => {
    await sendOrderShippedEmail({
      to: "a@b.de",
      orderNumber: "CP-1",
      shippedAt: new Date(),
      items: [],
    });
    const call = sendMailMock.mock.calls[0][0];
    expect(call.tag).toBe("order-shipped");
    expect(call.retries).toBeUndefined();
  });

  it("Review-Request mit Bestellnummer im Subject", async () => {
    await sendReviewRequestEmail({
      to: "a@b.de",
      orderNumber: "CP-2",
      products: [],
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Wie war Ihre Bestellung CP-2?",
        tag: "review-request",
      })
    );
  });

  it("Inventory-Alert: ausverkaufte Artikel dominieren das Subject", async () => {
    await sendInventoryAlertEmail({
      to: "admin@example.com",
      bcc: ["zweiter@example.com"],
      items: [
        { name: "A", stock: 0 },
        { name: "B", stock: 2 },
      ] as never,
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "[Inventory] 1 ausverkauft, 1 knapp",
        bcc: ["zweiter@example.com"],
        tag: "inventory-alert",
      })
    );
  });

  it("Inventory-Alert: nur knappe Artikel → Limit-Subject", async () => {
    await sendInventoryAlertEmail({
      to: "admin@example.com",
      items: [{ name: "B", stock: 2 }] as never,
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "[Inventory] 1 Artikel am Limit" })
    );
  });
});
