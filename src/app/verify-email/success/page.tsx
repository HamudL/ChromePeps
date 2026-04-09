import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
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
  title: `E-Mail best\u00e4tigt | ${APP_NAME}`,
};

export default function VerifyEmailSuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">
            E-Mail bestätigt
          </CardTitle>
          <CardDescription>
            Vielen Dank! Ihre E-Mail-Adresse wurde erfolgreich bestätigt.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Sie erhalten ab jetzt alle Bestell- und Kontobenachrichtigungen an
          Ihre hinterlegte Adresse.
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/dashboard">Zum Dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
