"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
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

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const formData = new FormData(e.currentTarget);
      const password = formData.get("password") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Etwas ist schiefgelaufen.");
        return;
      }

      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch {
      setError("Verbindung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setIsPending(false);
    }
  };

  if (done) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <h1 className="sr-only">Passwort erfolgreich geändert</h1>
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Passwort ge&auml;ndert</CardTitle>
          <CardDescription>Sie werden zum Login weitergeleitet...</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/login">Jetzt anmelden</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <h1 className="sr-only">Neues Passwort setzen</h1>
      <CardHeader className="text-center space-y-1">
        <CardTitle className="text-2xl font-bold">Neues Passwort</CardTitle>
        <CardDescription>
          W&auml;hlen Sie ein starkes Passwort
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
            <Label htmlFor="password">Neues Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              disabled={isPending}
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              Mindestens 8 Zeichen, ein Gro&szlig;- und ein Kleinbuchstabe und
              eine Zahl.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Passwort best&auml;tigen</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              disabled={isPending}
              minLength={8}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full gap-2" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird gespeichert...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Passwort speichern
              </>
            )}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            <Link
              href="/login"
              className="text-primary font-medium hover:underline"
            >
              Zur&uuml;ck zum Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
