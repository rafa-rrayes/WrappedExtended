FROM node:22-slim AS base
# Pin pnpm 9.x: pnpm 10 (what @latest now resolves to) makes dependency build
# scripts opt-in and exits non-zero on unapproved ones (sharp, core-js),
# breaking non-interactive builds. pnpm 9 runs them automatically.
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Build
FROM base AS builder
# NEXT_PUBLIC_* vars are inlined at build time, so they must be present here.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `public/` is empty in the repo (git drops empty dirs), so guarantee it exists
# before the runner stage COPYs it.
RUN mkdir -p public && pnpm build

# Production
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3050
ENV HOSTNAME="0.0.0.0"
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3050
CMD ["node", "server.js"]
