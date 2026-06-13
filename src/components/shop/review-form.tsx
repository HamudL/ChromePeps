"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ReviewFormProps {
  productId: string;
  /** Server-computed. True when a logged-in user has a DELIVERED order containing this product. */
  canReview: boolean;
  /** True when the user is logged in. Used to show the correct CTA. */
  isLoggedIn: boolean;
  /** True when the user already has a review on this product. */
  alreadyReviewed: boolean;
}

export function ReviewForm({
  productId,
  canReview,
  isLoggedIn,
  alreadyReviewed,
}: ReviewFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  if (!isLoggedIn) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Bewertung abgeben</CardTitle>
          <CardDescription>
            Bitte melden Sie sich an, um eine Bewertung zu hinterlassen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/login">Zum Login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (alreadyReviewed) {
    return (
      <Card className="border-green-200 bg-green-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Vielen Dank für Ihre Bewertung
          </CardTitle>
          <CardDescription>
            Sie haben dieses Produkt bereits bewertet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!canReview) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Bewertung abgeben</CardTitle>
          <CardDescription>
            Bewertungen sind nur für Kunden möglich, die dieses Produkt bereits
            erhalten haben. Ihre Bestellung muss den Status <em>Geliefert</em>
            haben.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (state === "success") {
    return (
      <Card className="border-green-200 bg-green-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Bewertung gesendet
          </CardTitle>
          <CardDescription>
            Vielen Dank! Ihre Bewertung wurde erfolgreich gespeichert.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError("Bitte wählen Sie eine Bewertung zwischen 1 und 5 Sternen.");
      return;
    }

    setState("loading");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error ?? "Ihre Bewertung konnte nicht gespeichert werden.");
        setState("idle");
        return;
      }

      setState("success");
      // Refresh the server component so the new review appears in the list.
      router.refresh();
    } catch {
      setError("Netzwerkfehler. Bitte versuchen Sie es sp\u00e4ter erneut.");
      setState("idle");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bewertung abgeben</CardTitle>
        <CardDescription>
          Teilen Sie Ihre Erfahrung mit anderen Forschenden.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Sterne</Label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => {
                const value = i + 1;
                const active = (hoverRating || rating) >= value;
                return (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="rounded focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary"
                    aria-label={`${value} von 5 Sternen`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        active
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                );
              })}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} / 5
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-title">Titel (optional)</Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Kurze Zusammenfassung"
              maxLength={120}
              disabled={state === "loading"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-body">Ihre Bewertung (optional)</Label>
            <Textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Wie war das Produkt? Reinheit, Versand, Verpackung..."
              maxLength={2000}
              rows={5}
              disabled={state === "loading"}
            />
            <p className="text-xs text-muted-foreground text-right">
              {body.length} / 2000
            </p>
          </div>

          <Button type="submit" disabled={state === "loading" || rating === 0}>
            {state === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Senden...
              </>
            ) : (
              "Bewertung senden"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
