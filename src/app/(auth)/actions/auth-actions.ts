"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { registerSchema } from "@/validators/auth";
import { rateLimit } from "@/lib/rate-limit";
import { verifyHCaptcha } from "@/lib/hcaptcha";
import bcrypt from "bcryptjs";
import { generateEmailVerifyToken } from "@/lib/email-verify";
import { sendEmailVerifyEmail } from "@/lib/mail/send";
import { EMAIL_VERIFY_TOKEN_TTL_MS } from "@/lib/constants";

export interface AuthActionResult {
  success: boolean;
  error?: string;
  /**
   * Captcha-Required-Flag: true wenn der User in den letzten 10min mind. 2
   * fehlgeschlagene Login-Attempts hatte. Frontend rendert dann das hCaptcha-
   * Widget und blockt Submit bis ein Token vorhanden ist.
   * AUDIT_REPORT_v3 §4.3.
   */
  captchaRequired?: boolean;
}

const LOGIN_FAIL_TTL_SECONDS = 600; // 10 Minuten Wartezeit, dann reset
const CAPTCHA_THRESHOLD = 2;

/**
 * Server-side rate limit check for login. Returnt zusätzlich `captchaRequired`
 * basierend auf einem separaten Failure-Counter (siehe `recordLoginFailure`),
 * damit der Client das hCaptcha-Widget einblenden kann.
 *
 * Die actual authentication happens client-side via fetch to /api/auth/callback,
 * which avoids the NEXT_REDIRECT issue in NextAuth v5 beta server actions.
 */
export async function checkLoginRateLimit(
  email: string,
  captchaToken?: string,
): Promise<AuthActionResult> {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) {
    return { success: false, error: "Invalid email format." };
  }

  const limit = await rateLimit(`login:${parsed.data}`, {
    maxRequests: 5,
    windowMs: 300_000, // 5 attempts per 5 minutes
  });
  if (!limit.success) {
    return {
      success: false,
      error: "Too many login attempts. Please try again in a few minutes.",
    };
  }

  // Captcha-Threshold: ab 2 fehlgeschlagenen Versuchen muss der nächste
  // Submit einen gültigen hCaptcha-Token mitbringen.
  let failCount = 0;
  try {
    const raw = await redis.get(loginFailKey(parsed.data));
    failCount = raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    /* Redis-Outage → fail-OPEN, captcha = false */
  }

  const captchaRequired = failCount >= CAPTCHA_THRESHOLD;
  if (captchaRequired) {
    if (!captchaToken) {
      return { success: false, captchaRequired: true, error: "captcha-required" };
    }
    const captchaOk = await verifyHCaptcha(captchaToken);
    if (!captchaOk) {
      return {
        success: false,
        captchaRequired: true,
        error: "Captcha-Verifikation fehlgeschlagen. Bitte erneut lösen.",
      };
    }
  }

  return { success: true, captchaRequired };
}

/**
 * Wird vom Client nach einem fehlgeschlagenen Login-Versuch (CredentialsSignin
 * error, InvalidTwoFactorCode etc.) gerufen, um den Failure-Counter für die
 * Email zu inkrementieren. Bei Erreichen des Captcha-Thresholds blendet der
 * nächste `checkLoginRateLimit`-Call das Captcha ein.
 */
export async function recordLoginFailure(email: string): Promise<void> {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return;
  try {
    const key = loginFailKey(parsed.data);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, LOGIN_FAIL_TTL_SECONDS);
    }
  } catch {
    /* Redis-Outage → silent fail, kein Captcha bis Redis wieder läuft */
  }
}

/**
 * Wird vom Server nach einem erfolgreichen Login (oder Pre-Verify-Stufe) gerufen,
 * um den Failure-Counter zurückzusetzen.
 */
export async function clearLoginFailures(email: string): Promise<void> {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return;
  try {
    await redis.del(loginFailKey(parsed.data));
  } catch {
    /* fail-silent */
  }
}

function loginFailKey(email: string): string {
  return `login-fail:${email.toLowerCase()}`;
}

/**
 * Creates a new user account. Does NOT sign in — the client handles
 * authentication separately via signIn() from next-auth/react.
 *
 * Captcha-Logik: nach 2 fehlgeschlagenen Register-Attempts (z.B. weil Email
 * bereits existiert oder rate-limit gebremst hat) verlangt der nächste Submit
 * einen hCaptcha-Token. Frontend rendert das Widget proaktiv ab dem 2. Versuch.
 */
export async function registerAction(
  formData: FormData,
): Promise<AuthActionResult> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };
  const captchaToken = formData.get("captchaToken");
  const captchaTokenStr = typeof captchaToken === "string" ? captchaToken : "";

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // Captcha-Threshold: gleiche Logik wie beim Login.
  let failCount = 0;
  try {
    const rawCount = await redis.get(registerFailKey(parsed.data.email));
    failCount = rawCount ? parseInt(rawCount, 10) || 0 : 0;
  } catch {
    /* fail-OPEN */
  }
  const captchaRequired = failCount >= CAPTCHA_THRESHOLD;
  if (captchaRequired) {
    if (!captchaTokenStr) {
      return { success: false, captchaRequired: true, error: "captcha-required" };
    }
    const captchaOk = await verifyHCaptcha(captchaTokenStr);
    if (!captchaOk) {
      return {
        success: false,
        captchaRequired: true,
        error: "Captcha-Verifikation fehlgeschlagen. Bitte erneut lösen.",
      };
    }
  }

  // Rate limit registration by email
  const limit = await rateLimit(`register:${parsed.data.email}`, {
    maxRequests: 3,
    windowMs: 600_000, // 3 attempts per 10 minutes
  });
  if (!limit.success) {
    await incrementRegisterFailure(parsed.data.email);
    return {
      success: false,
      captchaRequired,
      error: "Too many registration attempts. Please try again later.",
    };
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    await incrementRegisterFailure(parsed.data.email);
    return {
      success: false,
      captchaRequired: failCount + 1 >= CAPTCHA_THRESHOLD,
      error: "An account with this email already exists.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  // Fire-and-forget email verification. We use soft enforcement: the user is
  // allowed to log in immediately, but the dashboard nags them until they
  // verify. The mail failing never blocks registration — a resend button is
  // available from the dashboard.
  try {
    const { rawToken, tokenHash } = generateEmailVerifyToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TOKEN_TTL_MS);

    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: tokenHash,
        expires: expiresAt,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (baseUrl) {
      const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${rawToken}`;
      await sendEmailVerifyEmail({
        to: user.email,
        name: user.name,
        verifyUrl,
        expiresInHours: 24,
      });
    } else {
      console.warn(
        "[register] NEXT_PUBLIC_APP_URL not set — skipping verify email"
      );
    }
  } catch (err) {
    console.error(
      "[register] email verify step failed:",
      err instanceof Error ? err.message : err
    );
  }

  return { success: true };
}

function registerFailKey(email: string): string {
  return `register-fail:${email.toLowerCase()}`;
}

async function incrementRegisterFailure(email: string): Promise<void> {
  try {
    const key = registerFailKey(email);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, LOGIN_FAIL_TTL_SECONDS);
    }
  } catch {
    /* fail-silent */
  }
}
