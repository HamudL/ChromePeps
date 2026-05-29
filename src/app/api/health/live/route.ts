import { NextResponse } from "next/server";

/**
 * GET|HEAD /api/health/live — Liveness-Probe.
 *
 * Bewusst MINIMAL: gibt immer 200 zurück, solange der Node-Prozess HTTP
 * bedient. KEIN DB-, KEIN Redis-Check und vor allem kein React-Streaming.
 *
 * Warum getrennt von `/api/health`:
 *   - `/api/health` ist eine *Readiness*-Probe (503 wenn DB/Redis weg) —
 *     richtig für externe Monitore (UptimeRobot) und Load-Balancer, die
 *     Traffic wegnehmen sollen wenn die App keine echten Daten liefern kann.
 *   - Dockers HEALTHCHECK ist dagegen ein *Liveness*-Trigger: wird der
 *     Container "unhealthy", startet/ersetzt Docker ihn. Würde man den auf
 *     die DB-abhängige Readiness-Probe zeigen, löst ein kurzer DB-Hänger
 *     eine sinnlose Neustart-Schleife aus.
 *
 * Zusätzlicher Nebeneffekt: Der vorherige Docker-Healthcheck rief alle 30 s
 * `wget --spider http://127.0.0.1:3000/` auf. `/` ist eine gestreamte
 * React-Server-Seite; wget bricht die Verbindung ab sobald der Header da
 * ist, wodurch Node mitten im TransformStream den (harmlosen) Fehler
 * `controller[kState].transformAlgorithm is not a function` wirft — der bis
 * dato ~1000×/Tag Sentry zugemüllt hat (0 echte User betroffen). Eine
 * gepufferte JSON-Antwort wie hier streamt nicht → kein Abbruch-Fehler.
 */

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { status: "alive" },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

// `wget --spider` schickt primär einen HEAD-Request — explizit behandeln,
// damit kein Render-/Streaming-Pfad getriggert wird.
export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
