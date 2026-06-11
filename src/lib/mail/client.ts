import "server-only";
import { Resend } from "resend";

/**
 * Lazy singleton Resend client.
 *
 * We intentionally do NOT throw when RESEND_API_KEY is missing — Phase 3's
 * contract is "log only, never block orders on mail failures". The client is
 * created on first use so dev builds without a key stay functional.
 */
let cachedClient: Resend | null = null;

export function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

export interface SendMailAttachment {
  filename: string;
  content: Buffer;
}

export interface SendMailInput {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  /** Plain-text fallback for clients that can't render HTML. */
  text?: string;
  /** Unique tag for logging and Resend dashboard filtering. */
  tag?: string;
  /** File attachments (e.g. COA PDFs). */
  attachments?: SendMailAttachment[];
  /**
   * Blind-Copy-Empfänger. Genutzt z.B. vom Inventory-Alert-Cron, damit
   * mehrere Admin-Adressen nicht gegenseitig im To-Header sichtbar sind.
   */
  bcc?: string | string[];
  /**
   * Anzahl ZUSÄTZLICHER Versuche bei transienten Fehlern (Default 2 →
   * max. 3 Versuche, Backoff 1s/5s). INTERAKTIVE Pfade, die das Resultat
   * im Request awaiten (Forgot-Password, Registrierung, Newsletter-
   * Subscribe, resend-verification), setzen retries: 0 — sonst hinge
   * jeder dieser Requests bei einem Resend-Ausfall ~6+ Sekunden am
   * Spinner. Fire-and-forget-Pfade (Bestellbestätigung im Webhook,
   * Versand-Mails) behalten den vollen Retry: dort zählt Zustellung,
   * nicht Latenz.
   */
  retries?: number;
}

export interface SendMailResult {
  success: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

// Backoff-Stufen für transiente Fehler: 3 Versuche gesamt, Pausen 1 s
// und 5 s. Kurz genug, dass Request-Handler (z.B. Newsletter-Subscribe,
// die das Resultat awaiten) nicht in Timeouts laufen, lang genug, dass
// kurze Resend-Hiccups/Rate-Limits typischerweise vorbei sind.
const RETRY_DELAYS_MS = [1_000, 5_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Entscheidet, ob ein Resend-Fehlerobjekt einen Retry rechtfertigt.
 *
 * Transient = Netzwerk/Server-seitig vorübergehend: 429 (Rate-Limit) und
 * 5xx. 4xx-Validierungsfehler (kaputte Empfängeradresse, fehlendes Feld,
 * ungültiger API-Key, Quota erschöpft) würden bei jedem Versuch identisch
 * fehlschlagen — die retryen wir bewusst NICHT, sonst stünde derselbe
 * Fehler nur dreifach im Log und die Antwortlatenz stiege grundlos.
 * `statusCode` ist laut SDK-Typ nullable — dann fallen wir auf den
 * Resend-Fehlernamen zurück.
 */
function isTransientResendError(error: {
  statusCode: number | null;
  name?: string;
}): boolean {
  if (error.statusCode === 429) return true;
  if (error.statusCode !== null && error.statusCode >= 500) return true;
  return (
    error.statusCode === null &&
    (error.name === "rate_limit_exceeded" ||
      error.name === "internal_server_error" ||
      error.name === "application_error")
  );
}

/**
 * Sends an email via Resend with graceful failure.
 *
 * Never throws. On failure, logs the error and returns a failed result so
 * callers can decide what to do (typically: log and continue).
 *
 * Transiente Fehler (Netzwerk, 429, 5xx) werden bis zu 3-mal mit Backoff
 * versucht — eine Bestellbestätigung, die an einem einzelnen Resend-Hiccup
 * scheitert, wäre sonst unwiederbringlich verloren (kein Caller hat eine
 * Requeue-Mechanik). Validierungsfehler (4xx) brechen sofort ab.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const client = getResendClient();
  const tag = input.tag ?? "email";

  if (!client) {
    console.warn(
      `[mail:${tag}] RESEND_API_KEY not set — skipping mail to ${
        Array.isArray(input.to) ? input.to.join(",") : input.to
      }`
    );
    return { success: false, skipped: true, error: "RESEND_API_KEY not set" };
  }

  const from =
    process.env.MAIL_FROM ?? "ChromePeps <no-reply@chromepeps.com>";
  const replyTo = process.env.MAIL_REPLY_TO ?? "support@chromepeps.com";

  const maxAttempts =
    Math.min(input.retries ?? RETRY_DELAYS_MS.length, RETRY_DELAYS_MS.length) +
    1;
  let lastError = "unknown error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Backoff VOR dem Retry (nicht nach dem letzten Versuch) — der erste
    // Versuch startet sofort.
    if (attempt > 1) {
      await sleep(RETRY_DELAYS_MS[attempt - 2]);
    }

    try {
      const { data, error } = await client.emails.send({
        from,
        to: input.to,
        bcc: input.bcc,
        subject: input.subject,
        react: input.react,
        text: input.text,
        replyTo,
        tags: [{ name: "category", value: tag }],
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
      });

      if (error) {
        lastError = error.message;
        if (isTransientResendError(error) && attempt < maxAttempts) {
          console.warn(
            `[mail:${tag}] transient Resend error (attempt ${attempt}/${maxAttempts}), retrying:`,
            error
          );
          continue;
        }
        console.error(`[mail:${tag}] Resend returned error:`, error);
        return { success: false, error: error.message };
      }

      console.log(
        `[mail:${tag}] sent id=${data?.id ?? "unknown"} to=${
          Array.isArray(input.to) ? input.to.join(",") : input.to
        }`
      );
      return { success: true, id: data?.id };
    } catch (err) {
      // Geworfene Fehler sind hier praktisch immer Netzwerk-/Fetch-Probleme
      // (DNS, Timeout, Connection-Reset) — also transient → Retry.
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts) {
        console.warn(
          `[mail:${tag}] send threw (attempt ${attempt}/${maxAttempts}), retrying:`,
          lastError
        );
        continue;
      }
    }
  }

  console.error(
    `[mail:${tag}] send failed after ${maxAttempts} attempts:`,
    lastError
  );
  return { success: false, error: lastError };
}
