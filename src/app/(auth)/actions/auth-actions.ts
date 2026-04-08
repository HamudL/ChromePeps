"use server";

import { signIn, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { registerSchema, loginSchema } from "@/validators/auth";
import { rateLimit } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function loginAction(
  formData: FormData
): Promise<AuthActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // Rate limit by email — prevents brute-force on specific accounts
  const limit = await rateLimit(`login:${parsed.data.email}`, {
    maxRequests: 5,
    windowMs: 300_000, // 5 attempts per 5 minutes
  });
  if (!limit.success) {
    return {
      success: false,
      error: "Too many login attempts. Please try again in a few minutes.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Invalid email or password." };
    }
    throw error;
  }
}

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

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: true }; // Account created, login failed — still a success
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirect: false });
}
