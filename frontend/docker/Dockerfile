# syntax=docker/dockerfile:1

FROM ghcr.io/pnpm/pnpm:latest AS frontend-pnpm-base
RUN pnpm runtime set node 24 -g
RUN pnpm config set store-dir /pnpm/store
WORKDIR /workspace/frontend

FROM frontend-pnpm-base AS web-pnpm-base
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json
# Seed the pnpm store and temporary node_modules artifacts.
# Compose uses a root-run init service to chown the mounted volumes
# before the source-mounted pnpm service runs as HOST_UID:HOST_GID.
RUN pnpm fetch --frozen-lockfile

FROM web-pnpm-base AS web-build
COPY . ./
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter web build

# BellSoft's hardened Node.js image on GHCR requires authentication.
FROM bellsoft/hardened-nodejs:24-glibc AS web-runtime
ENV HOST="0.0.0.0"
ENV PORT="3000"
WORKDIR /app
COPY --from=web-build /workspace/frontend/web/.output ./
EXPOSE 3000
CMD ["node", "server/index.mjs"]
