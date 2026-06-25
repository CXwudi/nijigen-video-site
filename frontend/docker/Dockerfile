# syntax=docker/dockerfile:1

FROM ghcr.io/pnpm/pnpm:latest AS frontend-pnpm-base
RUN pnpm runtime set node 24 -g
RUN pnpm config set store-dir /pnpm/store
WORKDIR /workspace/frontend

FROM frontend-pnpm-base AS web-pnpm-base
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json
# Keep the fetched store, but let HOST_UID/HOST_GID own mounted node_modules.
# At this stage, we don't know the host UID/GID yet,
# so we are deleting node_modules and web/node_modules.
# Let the container in compose file create them with correct UID/GID.
RUN umask 000 \
  && pnpm fetch --frozen-lockfile \
  && rm -rf node_modules web/node_modules \
  && mkdir -m 0777 -p node_modules web/node_modules \
  && find /pnpm/store -type d -exec chmod a+rwx {} +

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
