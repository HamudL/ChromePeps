"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { registerSchema } from "@/validators/auth";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server-side rate limit check for login.
 * The actual authentication happens client-side via signIn() from next-auth/react,
 * which avoids the NEXT_REDIRECT issue in NextAuth v5 beta server actions.
 */
export async function checkLoginRateLimit(
  email: string
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

  return { success: true };
}

/**
 * Creates a new user account. Does NOT sign in — the client handles
 * authentication separately via signIn() from next-auth/react.
 */
export async function registerAction(
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // Rate limit registration by email
  const limit = await rateLimit(`register:${parsed.data.email}`, {
    maxRequests: 3,
    windowMs: 600_000, // 3 attempts per 10 minutes
  });
  if (!limit.success) {
    return {
      success: false,
      error: "Too many registration attempts. Please try again later.",
    };
  }

  const existing = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  return { success: true };
}
