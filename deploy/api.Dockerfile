# API và worker NestJS. Build từ gốc monorepo: docker build -f deploy/api.Dockerfile .
FROM node:24.22.2-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
RUN corepack enable && corepack prepare pnpm@12.18.0 --activate
WORKDIR /repo

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter "@lab-fourt/api..."
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @lab-fourt/shared build && pnpm --filter @lab-fourt/api build

FROM base AS runtime
ENV NODE_ENV=production
# Giữ nguyên node_modules của bước build vì cần Prisma CLI để chạy migration khi khởi động
COPY --from=build --chown=node:node /repo /repo
WORKDIR /repo/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
