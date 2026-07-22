# Multi-stage build for @asaplocal/admin — run from the monorepo root:
#   docker build -f apps/admin/Dockerfile -t asaplocal-admin .

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# ---- deps: install workspace deps with full monorepo context for correct hoisting ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/admin ./apps/admin
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS builder
COPY --from=deps /repo ./
RUN pnpm --filter @asaplocal/db generate
RUN pnpm --filter @asaplocal/admin build

# ---- runtime ----
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
WORKDIR /repo

COPY --from=builder /repo/apps/admin/next.config.mjs ./apps/admin/next.config.mjs
COPY --from=builder /repo/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs
EXPOSE 3002
ENV PORT=3002
CMD ["node", "apps/admin/server.js"]
