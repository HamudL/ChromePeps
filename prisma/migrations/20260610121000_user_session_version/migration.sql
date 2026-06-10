-- AlterTable: Session-Versioning für JWT-Invalidierung nach
-- Passwort-Reset/-Wechsel und 2FA-Aktivierung.
ALTER TABLE "users" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;
