import type { Prisma } from "@prisma/client";

/**
 * Friert die Liefer-/Rechnungsadresse einer Bestellung in eine
 * UNVERAENDERLICHE, BESITZERLOSE Kopie ein und liefert deren id zurueck.
 *
 * Hintergrund (AUDIT_REPORT: Daten-Integritaet #17/#18): Authentifizierte
 * Checkouts referenzierten bisher direkt die veraenderbare Adressbuch-Zeile
 * des Users (`Order.shipping/billingAddressId` -> `Address`). Das hatte zwei
 * Fehlbilder:
 *   - DELETE einer gespeicherten Adresse nullte via `ON DELETE SET NULL`
 *     die Adresse bereits abgeschlossener Bestellungen -> die nach §14 UStG
 *     10 Jahre aufzubewahrende Rechnung verlor die Empfaengeranschrift.
 *   - PATCH (In-Place-Edit, z.B. Umzug) aenderte die Anschrift ALLER darauf
 *     zeigenden historischen Bestellungen und ihrer bereits ausgestellten
 *     Rechnungen rueckwirkend.
 *
 * Die Kopie bekommt `userId = null`. Damit
 *   - taucht sie NICHT im Adressbuch des Users auf (Listing filtert auf
 *     `userId = session.user.id`), und
 *   - ist gegen die Adress-API immun: PATCH/DELETE /api/addresses/[id]
 *     lehnen jede Zeile mit `userId !== session.user.id` mit 404 ab.
 * Die gespeicherte Adresse des Users bleibt dadurch frei editier-/loeschbar,
 * ohne jemals eine bestehende Bestellung zu beruehren.
 *
 * Gaeste erzeugen bereits eine frische Einweg-Adresszeile pro Checkout und
 * brauchen diese Kopie nicht — der Aufrufer ruft die Funktion nur fuer
 * authentifizierte Bestellungen auf.
 *
 * Liefert `null`, wenn die Quell-Adresse nicht (mehr) existiert (z.B. Konto
 * inkl. Adressen wurde zwischen Bezahlung und Webhook geloescht) — so haengt
 * die Order nicht an einem toten Foreign Key.
 */
export async function snapshotOrderAddress(
  tx: Prisma.TransactionClient,
  addressId: string
): Promise<string | null> {
  const src = await tx.address.findUnique({ where: { id: addressId } });
  if (!src) return null;

  const snapshot = await tx.address.create({
    data: {
      // Bewusst besitzerlos: unveraenderlicher Order-Snapshot, kein
      // Adressbuch-Eintrag.
      userId: null,
      isDefault: false,
      label: src.label,
      company: src.company,
      firstName: src.firstName,
      lastName: src.lastName,
      street: src.street,
      street2: src.street2,
      city: src.city,
      state: src.state,
      postalCode: src.postalCode,
      country: src.country,
      phone: src.phone,
    },
  });

  return snapshot.id;
}
