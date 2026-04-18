# Dockerfile for Veritas (Next.js 14 standalone + better-sqlite3)

FROM node:20-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# Install build tools needed for better-sqlite3 native compile
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Builder: compile Next.js
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

# Runner
FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone Next.js server
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Pre-seeded SQLite (built from local seed - already has docs/reports)
COPY veritas.db /app/veritas.db.seed

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
