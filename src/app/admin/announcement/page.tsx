"use client";

import { useEffect, useState } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AnnouncementAdminPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/announcement")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setText(json.data?.text ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage(text ? "Announcement-Bar aktiviert." : "Announcement-Bar deaktiviert.");
      } else {
        setMessage(`Fehler: ${json.error}`);
      }
    } catch {
      setMessage("Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Announcement-Bar</h1>
        <p className="text-muted-foreground">
          Schmales Banner oben auf der Seite. Leer lassen zum Deaktivieren.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Promo-Hinweis
          </CardTitle>
          <CardDescription>
            Text wird allen Besuchern im Shop oben angezeigt. Maximal eine Zeile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="announcement-text">Announcement-Text</Label>
            <Input
              id="announcement-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="z.B. 🔥 Gratis Versand ab 99€ — nur diese Woche!"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {text.length}/200 Zeichen. Leer = deaktiviert.
            </p>
          </div>

          {/* Preview */}
          {text && (
            <div className="rounded-md overflow-hidden border">
              <div className="bg-primary text-primary-foreground text-center text-sm py-2 px-4">
                {text}
              </div>
            </div>
          )}

          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              "Speichern"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
