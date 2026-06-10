-- AlterTable: Abmelde-Zeitstempel für Newsletter-Subscriber. null = aktiv,
-- gesetzt = abgemeldet (via /api/newsletter/unsubscribe mit HMAC-Token).
-- Soft-Flag statt Row-Delete, damit Re-Subscribe und Audit möglich bleiben.
ALTER TABLE "newsletter_subscribers" ADD COLUMN     "unsubscribedAt" TIMESTAMP(3);
