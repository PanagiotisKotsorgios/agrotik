# ─── Base ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# libc6-compat needed for many prebuilt binaries (next/swc, sharp, esbuild)
RUN apk add --no-cache libc6-compat

# ─── Dependencies ──────────────────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

# ─── Build ─────────────────────────────────────────────────────────────
FROM base AS builder
ENV NODE_OPTIONS="--max-old-space-size=4096"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NODE_ENV=production
RUN npm run build

# ─── Runtime ───────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Install psql/pg_dump for migrations and admin database backups.
RUN apk add --no-cache postgresql-client bash

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/supabase ./supabase
COPY --from=builder --chown=nextjs:nodejs /app/scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nextjs
EXPOSE 3000

# No HEALTHCHECK: the entrypoint's `sleep infinity` fallback keeps the
# container alive on any failure so Coolify Runtime Logs stay visible.

ENTRYPOINT ["/entrypoint.sh"]
