/**
 * Zentrale, spoofing-resistente Client-IP-Ermittlung.
 *
 * Hintergrund: Quasi alle IP-basierten Rate-Limits lasen bisher
 * `x-forwarded-for` und nahmen den ERSTEN Eintrag. Unser nginx setzt
 * den Header aber per `$proxy_add_x_forwarded_for`, d.h. er HÄNGT die
 * echte Peer-IP an eine ggf. client-gesendete Liste AN. Der erste
 * Eintrag ist damit frei wählbar — ein Angreifer konnte pro Request
 * eine andere "IP" behaupten und jedes IP-Limit in beliebig viele
 * Buckets zersplittern (Brute-Force, Enumeration, Checkout-Spam).
 *
 * Vertrauenswürdig sind nur:
 *   1. `x-real-ip` — von nginx hart auf `$remote_addr` gesetzt
 *      (die TCP-Peer-IP, nicht client-beeinflussbar), und
 *   2. der LETZTE Eintrag in `x-forwarded-for` — der wurde von
 *      unserem nginx angehängt.
 *
 * Lokale Entwicklung ohne Proxy: beide Header fehlen → "unknown".
 * Das ist gewollt — alle lokalen Requests teilen sich einen Bucket.
 */
export function getClientIp(headers: Headers | null | undefined): string {
  if (!headers) return "unknown";

  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return "unknown";
}
