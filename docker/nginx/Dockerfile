# Nginx with Brotli compression — Alpine-based, minimal footprint.
# fholzer/nginx-brotli ships the standard nginx:alpine image plus
# the pre-compiled ngx_brotli module so we don't need to build from source.
#
# SECURITY: Tag + Digest gepinnt statt :latest — der TLS-Terminator soll sich
# nicht still bei jedem Rebuild auf ein anderes Image drehen (Supply-Chain).
# v1.30.2 = nginx stable branch; Digest ermittelt am 2026-06-10 via Docker-Hub-
# API (multi-arch Manifest-List, identisch mit dem damaligen :latest).
# Update-Prozedur: neuen Tag/Digest auf
# https://hub.docker.com/r/fholzer/nginx-brotli/tags nachschlagen, hier
# eintragen, auf dem VPS `docker compose build nginx && docker compose up -d
# nginx`. Falls der Digest je nicht mehr pullbar ist (Re-Push des Tags),
# `@sha256:...` entfernen und nur den Tag verwenden.
FROM fholzer/nginx-brotli:v1.30.2@sha256:2418024f615b5b1721b2d961fd3098581e23bc4e01de9096c36ee0a241a343b6
