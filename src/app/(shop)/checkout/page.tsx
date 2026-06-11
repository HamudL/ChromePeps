import { getBankTransferInfo } from "@/lib/constants";
import { CheckoutClient } from "./checkout-client";

// Server-Wrapper: liest die Vorkasse-Konfiguration zur LAUFZEIT aus der
// Server-Env und reicht sie als Prop an die Client-Component. Die
// BANK_*-Variablen sind bewusst NICHT NEXT_PUBLIC_ (Build-Zeit-Inlining
// würde die generisch in CI gebauten Images dauerhaft auf "deaktiviert"
// festnageln) — siehe Kommentar in src/lib/constants.ts.
export default function CheckoutPage() {
  return <CheckoutClient bankTransfer={getBankTransferInfo()} />;
}
