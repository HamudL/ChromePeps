# =============================================================================
# Gemeinsame Security-Header für alle Server-/Location-Blöcke.
#
# WARUM EINE INCLUDE-DATEI: nginx-Semantik — `add_header` wird NUR vererbt,
# wenn der aktuelle Block selbst KEIN add_header enthält. Jede Location mit
# eigenem add_header (z.B. Cache-Control für Static Assets) verliert sonst
# stillschweigend ALLE server-level Security-Header. Deshalb wird diese Datei
# 1× im server-Block und zusätzlich in JEDER Location mit eigenem add_header
# eingebunden:  include /etc/nginx/conf.d/security-headers.inc;
#
# Endung .inc (nicht .conf!) — nginx.conf lädt `include /etc/nginx/conf.d/
# *.conf`, diese Datei darf dort nicht als eigenständige Config auto-geladen
# werden, sondern nur explizit per include in einem server-/location-Kontext.
#
# X-Frame-Options DENY hält die Header konsistent mit der App: Next.js setzt
# in next.config.ts ebenfalls DENY + CSP frame-ancestors 'none' (vorher stand
# hier SAMEORIGIN — widersprüchliche Header je nach Pfad).
# =============================================================================

add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(self)" always;
