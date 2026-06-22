"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Etwas ist schiefgelaufen. Bitte erneut versuchen.");
        return;
      }

      setSent(true);
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setIsPending(false);
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <h1 className="sr-only">Passwort zurücksetzen — E-Mail versandt</h1>
        <CardHeader className="text-center space-y-1">
          <CardTitle className="text-2xl font-bold">E-Mail versandt</CardTitle>
          <CardDescription>
            Pr&uuml;fen Sie Ihren Posteingang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir
            einen Link zum Zur&uuml;cksetzen Ihres Passworts verschickt. Der
            Link ist 60 Minuten lang g&uuml;ltig.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Keine E-Mail erhalten? Pr&uuml;fen Sie Ihren Spam-Ordner oder
            warten Sie einige Minuten.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Zur&uuml;ck zum Login</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <h1 className="sr-only">Passwort zurücksetzen</h1>
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-2xl font-bold">Passwort vergessen?</CardTitle>
        <CardDescription>
          Wir senden Ihnen einen Link zum Zur&uuml;cksetzen
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="researcher@lab.com"
              required
              autoComplete="email"
              disabled={isPending}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full gap-2" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Reset-Link senden
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Passwort doch erinnert?{" "}
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Zum Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
