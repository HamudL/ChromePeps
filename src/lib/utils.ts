import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// NOTE: Do NOT add Node-only imports (crypto, fs, path, stream, etc.) to
// this file. It is imported by client components for `cn`, `formatPrice`,
// etc., and every import here becomes part of the browser bundle. If a
// helper needs Node built-ins, put it under src/lib/{server,order,...}/
// so it stays out of the client tree. generateOrderNumber lives at
// src/lib/order/generate-order-number.ts for exactly that reason.

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set. Add it to your .env file."
    );
  }
  return `${base}${path}`;
}
