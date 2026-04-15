import { randomBytes } from "crypto";

/**
 * Generate a human-friendly order number like `CP-<timestamp36>-<random8>`.
 *
 * Lives in its own file (not `src/lib/utils.ts`) specifically to keep the
 * Node-only `crypto` import out of any client bundle. Previously this
 * function was colocated with `cn()` and `formatPrice()` in utils.ts, which
 * meant every client component that imported a utility from there also
 * pulled in `crypto-browserify` (~318 KB) plus its polyfills (stream, buffer,
 * util — another ~90 KB combined). Moving it here lets client code import
 * the pure utilities without paying the polyfill cost.
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `CP-${timestamp}-${random}`;
}
