import "server-only";

/**
 * hCaptcha-Server-Side-Verification.
 *
 * AUDIT_REPORT_v3 §4.3 + §6 PR 4.
 *
 * hCaptcha gibt dem Client einen Token nach erfolgreicher Lösung des
 * Captcha-Challenges. Wir POSTen diesen Token zusammen mit unserem
 * Secret an die hCaptcha-API und bekommen ein {success: bool}-Object
 * zurück. Erst dann lassen wir die ursprüngliche Auth-Action durch.
 *
 * Fail-modes:
 *  - Token fehlt → return false (Caller blockt)
 *  - Token bereits verbraucht → hCaptcha returnt success=false →
 *    Client muss neu lösen
 *  - Netzwerkfehler zur hCaptcha-API → fail-CLOSED (return false)
 *    weil Captcha bewusst eine zweite Verteidigungslinie ist.
 */

const HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify";

interface HCaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  score?: number;
}

export async function verifyHCaptcha(token: string): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    // Wenn der Server keinen Secret hat, ist Captcha effektiv ausgeschaltet —
    // wir lassen durch (fail-OPEN), damit lokale Dev-Setups nicht blocken.
    // In Prod ist HCAPTCHA_SECRET Pflicht (siehe .env.example).
    if (process.env.NODE_ENV === "production") {
      console.error("[hcaptcha] HCAPTCHA_SECRET fehlt in Production!");
      return false;
    }
    return true;
  }

  try {
    const params = new URLSearchParams();
    params.set("secret", secret);
    params.set("response", token);

    const res = await fetch(HCAPTCHA_VERIFY_URL, {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      // hCaptcha kann seltene Latency-Spikes haben; zu kurzes Timeout
      // führt zu fail-CLOSED. 8s ist ein guter Kompromiss.
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      console.warn(
        `[hcaptcha] non-200 from siteverify: ${res.status} ${res.statusText}`,
      );
      return false;
    }

    const data = (await res.json()) as HCaptchaResponse;
    if (!data.success && data["error-codes"]) {
      console.warn("[hcaptcha] verification failed:", data["error-codes"]);
    }
    return Boolean(data.success);
  } catch (err) {
    console.error(
      "[hcaptcha] verify request failed:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}
