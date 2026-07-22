# Multi-stage build for @asaplocal/provider — run from the monorepo root:
#   docker build -f apps/provider/Dockerfile -t asaplocal-provider .

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ---- deps: install workspace deps with full monorepo context for correct hoisting ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/provider ./apps/provider
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS builder
COPY --from=deps /repo ./
RUN pnpm --filter @asaplocal/db generate
RUN pnpm --filter @asaplocal/provider build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
WORKDIR /repo

COPY --from=builder /repo/apps/provider/next.config.mjs ./apps/provider/next.config.mjs
COPY --from=builder /repo/apps/provider/public ./apps/provider/public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/provider/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/provider/.next/static ./apps/provider/.next/static

USER nextjs
EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/provider/server.js"]
