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
}

export interface SendMailResult {
  success: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Sends an email via Resend with graceful failure.
 *
 * Never throws. On failure, logs the error and returns a failed result so
 * callers can decide what to do (typically: log and continue).
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

  try {
    const { data, error } = await client.emails.send({
      from,
      to: input.to,
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
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[mail:${tag}] send failed:`, message);
    return { success: false, error: message };
  }
}
