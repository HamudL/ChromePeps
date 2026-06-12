/**
 * Kunden-Link auf eine Bestellung für Transaktions-Mails — zentral, damit
 * Webhook, Vorkasse, verify-session und Admin-Versandmail dieselbe URL-Form
 * erzeugen. Gäste haben kein Dashboard: sie bekommen den öffentlichen
 * Order-Status-Link (Bestellnummer + E-Mail als Query, URL-encoded),
 * Account-Kunden den Dashboard-Deeplink. Ohne konfigurierte Base-URL
 * `undefined` — die Mail-Templates lassen den Button dann weg.
 */
export function buildOrderUrl(args: {
  orderId: string;
  orderNumber: string;
  email: string;
  isGuest: boolean;
}): string | undefined {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!base) return undefined;
  return args.isGuest
    ? `${base}/order-status?orderNumber=${encodeURIComponent(
        args.orderNumber
      )}&email=${encodeURIComponent(args.email)}`
    : `${base}/dashboard/orders/${args.orderId}`;
}
