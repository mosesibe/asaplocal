# Multi-stage build for @asaplocal/web — run from the monorepo root:
#   docker build -f apps/web/Dockerfile -t asaplocal-web .

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ---- deps: install workspace deps with full monorepo context for correct hoisting ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS builder
COPY --from=deps /repo ./
RUN pnpm --filter @asaplocal/db generate
RUN pnpm --filter @asaplocal/web build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
WORKDIR /repo

COPY --from=builder /repo/apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY --from=builder /repo/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
