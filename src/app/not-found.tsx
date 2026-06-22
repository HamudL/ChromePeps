import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Fehler 404
        </p>
        <h1 className="mt-2 text-7xl font-bold chrome-text leading-none">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">
          Seite nicht gefunden
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Die von dir gesuchte Seite existiert nicht, wurde verschoben oder
          befindet sich vorübergehend nicht im Sortiment. Schau dich gerne im
          Shop um oder kehre zur Startseite zurück.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Zur Startseite
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/products">
              <Search className="mr-2 h-4 w-4" />
              Produkte durchsuchen
            </Link>
          </Button>
        </div>

        <div className="mt-10 pt-6 border-t text-xs text-muted-foreground">
          <p className="mb-2">
            Brauchst du Hilfe?{" "}
            <Link href="/kontakt" className="underline hover:text-foreground">
              Kontaktiere uns
            </Link>
          </p>
          <p>&copy; {new Date().getFullYear()} {APP_NAME}</p>
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Zurück
          </Link>
        </div>
      </div>
    </div>
  );
}
