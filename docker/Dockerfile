# =============================================================================
# ChromePeps Production Dockerfile
# Multi-stage build for Next.js standalone + Prisma
# =============================================================================

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
COPY prisma ./prisma/

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else npm install; \
  fi

# ---- Stage 2: Build ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build-time env vars (NEXT_PUBLIC_* are inlined into the JS bundle by Next.js,
# so they MUST be present during `npm run build`, not just at runtime).
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Sentry build-time config — NEXT_PUBLIC_SENTRY_DSN is inlined into the client
# bundle, SENTRY_AUTH_TOKEN/ORG/PROJECT are needed by withSentryConfig to
# upload source maps during the build. Missing tokens fall back to no upload
# (the runtime SDK still works), so builds never hard-fail on Sentry.
ARG NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
ARG SENTRY_AUTH_TOKEN
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ARG SENTRY_ORG
ENV SENTRY_ORG=${SENTRY_ORG}
ARG SENTRY_PROJECT
ENV SENTRY_PROJECT=${SENTRY_PROJECT}

# Build Next.js (standalone output).
# V8 heap limit — 1536 MB fits within the 1.8 GB RAM + 2 GB swap envelope
# when the app container is stopped during build (via deploy.sh).
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1536"
RUN npm run build

# ---- Stage 3: Production Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

# OpenSSL needed by Prisma engine binaries on Alpine
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# --- COPY ORDER MATTERS ---
# 1. Full node_modules FIRST (for Prisma CLI, migrate, seed, ts-node)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# 2. Standalone output SECOND — its traced node_modules overwrites/merges
#    on top of the full set. This ensures server.js gets the exact deps it traced.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# 3. Static assets (client JS bundles, CSS, fonts — not in standalone output)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 4. Public assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 4b. Ensure uploads directory exists with correct ownership for runtime writes
RUN mkdir -p /app/public/uploads/products && chown -R nextjs:nodejs /app/public/uploads

# 5. Prisma schema + migrations (for prisma migrate deploy / db push)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# 6. Config files needed for prisma db seed (ts-node needs tsconfig, seed reads package.json)
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
