import { getBankTransferInfo } from "@/lib/constants";
import { CheckoutClient } from "./checkout-client";

// force-dynamic: Die BANK_*-Env wird zur LAUFZEIT gelesen. Ohne den
// Export würde der (seit dem Header-Session-Island statikfähige) Baum
// diese Seite beim CI-Build prerendern — mit der dort leeren Build-Env
// wäre die Vorkasse-Konfiguration bis zum nächsten Image-Build
// eingefroren. Personalisierte Checkout-Seite cacht ohnehin nichts.
export const dynamic = "force-dynamic";

// Server-Wrapper: liest die Vorkasse-Konfiguration zur LAUFZEIT aus der
// Server-Env und reicht sie als Prop an die Client-Component. Die
// BANK_*-Variablen sind bewusst NICHT NEXT_PUBLIC_ (Build-Zeit-Inlining
// würde die generisch in CI gebauten Images dauerhaft auf "deaktiviert"
// festnageln) — siehe Kommentar in src/lib/constants.ts.
export default function CheckoutPage() {
  return <CheckoutClient bankTransfer={getBankTransferInfo()} />;
}
