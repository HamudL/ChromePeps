import { getBankTransferInfo } from "@/lib/constants";
import { CheckoutSuccessClient } from "./success-client";

// Server-Wrapper: reicht searchParams durch und liest die Vorkasse-
// Konfiguration zur LAUFZEIT aus der Server-Env (kein NEXT_PUBLIC_ —
// siehe Kommentar in src/lib/constants.ts).
export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string;
    method?: string;
    orderId?: string;
    orderNumber?: string;
    total?: string;
  }>;
}) {
  return (
    <CheckoutSuccessClient
      searchParams={searchParams}
      bankTransfer={getBankTransferInfo()}
    />
  );
}
