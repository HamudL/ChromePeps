"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertTriangle } from "lucide-react";

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();

  // useState-Initializer läuft nur beim ersten Render — wenn die
  // Session initial `undefined` ist (SSR → hydration → client lookup)
  // und erst danach befüllt wird, bleiben die Inputs leer. Daher
  // unten ein useEffect der Name/Email mit dem Session-User syncht,
  // sobald sie ankommen bzw. sich ändern.
  const [name, setName] = useState(session?.user?.name ?? "");
  const [email, setEmail] = useState(session?.user?.email ?? "");

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);
  useEffect(() => {
    if (session?.user?.email) setEmail(session.user.email);
  }, [session?.user?.email]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Konto-Löschen — eigener State weil der Flow völlig getrennt
  // von Profile-Edit und Password-Change ist (eigener Confirm-Dialog,
  // eigene Fehlermeldung).
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileMessage({
          type: "error",
          text: data.error ?? "Profil konnte nicht aktualisiert werden.",
        });
        return;
      }

      setProfileMessage({
        type: "success",
        text: "Profil erfolgreich aktualisiert.",
      });
      await updateSession({ name: data.data.name, email: data.data.email });
    } catch {
      setProfileMessage({
        type: "error",
        text: "Etwas ist schiefgegangen. Bitte erneut versuchen.",
      });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Passwörter stimmen nicht überein.",
      });
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: "error",
        text: "Das neue Passwort muss mindestens 8 Zeichen haben.",
      });
      setPasswordLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordMessage({
          type: "error",
          text: data.error ?? "Passwort konnte nicht geändert werden.",
        });
        return;
      }

      setPasswordMessage({
        type: "success",
        text: "Passwort erfolgreich geändert.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordMessage({
        type: "error",
        text: "Etwas ist schiefgegangen. Bitte erneut versuchen.",
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: deletePassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(
          data.error ?? "Konto konnte nicht gelöscht werden.",
        );
        setDeleteLoading(false);
        return;
      }

      // Erfolg — sofort ausloggen + auf die Startseite. signOut macht
      // den ganzen Flow atomar (CSRF-POST + Session-Cookie weg + harte
      // Redirect zur callbackUrl), sonst rendern wir kurz das Profil
      // mit ungültiger Session und useSession knallt.
      signOut({ callbackUrl: "/", redirect: true });
    } catch {
      setDeleteError("Etwas ist schiefgegangen. Bitte erneut versuchen.");
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Profil-Informationen */}
      <Card>
        <CardHeader>
          <CardTitle>Profil-Informationen</CardTitle>
          <CardDescription>
            Aktualisieren Sie Ihren Namen und Ihre E-Mail-Adresse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ihr Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ihre@e-mail.de"
                  required
                />
              </div>
            </div>

            {profileMessage && (
              <p
                className={
                  profileMessage.type === "success"
                    ? "text-sm text-green-600"
                    : "text-sm text-destructive"
                }
              >
                {profileMessage.text}
              </p>
            )}

            <Button type="submit" disabled={profileLoading}>
              {profileLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Änderungen speichern
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Passwort ändern */}
      <Card>
        <CardHeader>
          <CardTitle>Passwort ändern</CardTitle>
          <CardDescription>
            Halten Sie Ihr Konto sicher mit einem starken Passwort.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Neues Passwort</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mind. 8 Zeichen"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Neues Passwort bestätigen</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {passwordMessage && (
              <p
                className={
                  passwordMessage.type === "success"
                    ? "text-sm text-green-600"
                    : "text-sm text-destructive"
                }
              >
                {passwordMessage.text}
              </p>
            )}

            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Passwort ändern
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger Zone — Konto-Löschung mit Anonymisierung der Bestelldaten.
          Gewollt visuell abgesetzt von den Standard-Edits, damit niemand
          versehentlich auf den Button klickt. */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Konto löschen
          </CardTitle>
          <CardDescription>
            Diese Aktion ist endgültig. Ihr Konto, gespeicherte Adressen,
            Merkliste und Sitzungen werden sofort gelöscht.
            <br />
            Bestellungen bleiben aus rechtlichen Gründen (§§ 147 AO,
            257 HGB &mdash; 10 Jahre Aufbewahrungspflicht) erhalten,
            werden aber anonymisiert (Name und E-Mail entfernt).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              setDeletePassword("");
              setDeleteError(null);
              setDeleteDialogOpen(true);
            }}
          >
            Konto endgültig löschen
          </Button>
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleteLoading) setDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konto wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Geben Sie zur Bestätigung Ihr aktuelles Passwort ein. Nach
              dem Klick werden Ihr Konto und alle persönlichen Daten
              entfernt. Bestellungen bleiben anonymisiert für die
              gesetzliche Aufbewahrungsfrist erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="deletePassword">Aktuelles Passwort</Label>
            <Input
              id="deletePassword"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={deleteLoading}
              autoFocus
            />
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Default-Verhalten von AlertDialogAction ist "schließen
                // beim Click" — wir wollen aber WARTEN bis das DELETE
                // durch ist (oder failed). Daher preventDefault + manuell
                // den async-Flow steuern; wenn fail, bleibt der Dialog
                // offen damit der User das Passwort korrigieren kann.
                e.preventDefault();
                handleDeleteAccount();
              }}
              disabled={deleteLoading || deletePassword.length === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Konto endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
