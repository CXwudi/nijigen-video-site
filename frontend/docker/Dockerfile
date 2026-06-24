# syntax=docker/dockerfile:1

FROM ghcr.io/pnpm/pnpm:latest AS frontend-pnpm-base
RUN pnpm runtime set node lts -g
RUN pnpm config set store-dir /pnpm/store
WORKDIR /workspace/frontend

FROM frontend-pnpm-base AS web-pnpm-base
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json
RUN pnpm fetch --frozen-lockfile

FROM web-pnpm-base AS web-build
COPY . ./
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter web build

FROM node:lts-slim AS web-runtime
ENV HOST="0.0.0.0"
ENV PORT="3000"
WORKDIR /app
COPY --from=web-build /workspace/frontend/web/.output ./
EXPOSE 3000
CMD ["node", "server/index.mjs"]
