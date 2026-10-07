# syntax=docker/dockerfile:1

ARG NODE_VERSION
ARG PNPM_VERSION

FROM ghcr.io/pnpm/pnpm:${PNPM_VERSION} AS frontend-pnpm-base
ARG NODE_VERSION
# Use a direct Node executable so non-root Compose users do not need root's shim state.
RUN pnpm config set --global --json globalShims false
RUN pnpm runtime set node "${NODE_VERSION}" -g
RUN pnpm config set store-dir /pnpm/store
WORKDIR /workspace/frontend

FROM frontend-pnpm-base AS web-pnpm-base
# Keep manifests out of the fetch layer so script-only changes reuse its cache.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY package.json ./
COPY web/package.json web/package.json
# Preinstall dependencies to seed fresh Compose volumes instead of relying on pnpm 12's automatic run/exec install.
# The preinstallation is ran by root user. frontend-dep-init will adjust the ownership before frontend-app-web runs.
RUN pnpm install --offline --frozen-lockfile

FROM web-pnpm-base AS web-build
COPY . ./
RUN pnpm --filter web build

# BellSoft's hardened Node.js image on GHCR requires authentication.
FROM bellsoft/hardened-nodejs:${NODE_VERSION}-glibc AS web-runtime
ENV HOST="0.0.0.0"
ENV PORT="3000"
WORKDIR /app
COPY --from=web-build /workspace/frontend/web/.output ./
EXPOSE 3000
ENTRYPOINT ["/usr/sbin/tini", "--"]
CMD ["node", "server/index.mjs"]
