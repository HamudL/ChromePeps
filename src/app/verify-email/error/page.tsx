import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: `Best\u00e4tigung fehlgeschlagen | ${APP_NAME}`,
};

const REASON_MESSAGES: Record<string, string> = {
  missing: "Der Best\u00e4tigungslink ist unvollst\u00e4ndig.",
  invalid: "Dieser Best\u00e4tigungslink ist ung\u00fcltig oder wurde bereits verwendet.",
  expired:
    "Dieser Best\u00e4tigungslink ist abgelaufen. Bitte fordern Sie einen neuen Link in Ihrem Dashboard an.",
  no_user: "Zu diesem Link wurde kein Konto gefunden.",
};

export default async function VerifyEmailErrorPage(props: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await props.searchParams;
  const message =
    REASON_MESSAGES[reason ?? ""] ??
    "Die Best\u00e4tigung ist fehlgeschlagen. Bitte versuchen Sie es erneut.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Bestätigung fehlgeschlagen
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Wenn Sie bereits eingeloggt sind, können Sie im Dashboard einen neuen
          Bestätigungslink anfordern.
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/dashboard">Zum Dashboard</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Zum Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
