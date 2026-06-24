# Issue 18 Frontend Setup Design Spec

## Problem or Goal

Issue `#18` needs the first frontend application setup for `nijigen-video-site`.

The setup must introduce a frontend-owned pnpm workspace at `frontend/`, create the first application under `frontend/web/`, use the selected React and TanStack frontend stack, apply the Snow Miku daisyUI theme from issue `#27`, and complete the frontend Docker Compose workflow.

The Docker workflow should be Docker-first for normal frontend development while still allowing a host-run frontend to use the API and backend dependencies from Docker. The production-like Compose stack should also learn how to build and run the frontend web application.

## Context

The repository is split by component:

- backend code and backend local Docker entrypoints live under `backend/`;
- frontend code and frontend local Docker entrypoints live under `frontend/`;
- shared Compose service bases live under `infra/compose/`;
- durable design records live under `design-log/`.

The existing Docker design uses component-owned Docker modules and explicit developer-facing Compose manifests. Shared Compose definitions are extracted only when they represent real reusable behavior.

The backend currently follows that model:

- `infra/compose/common-services.yml` owns common runtime service contracts;
- `infra/compose/common-dev-services.yml` owns reusable local development service bases such as `api-gradle-base`;
- `backend/docker/compose.local.yml` owns the concrete backend local stack;
- `infra/compose/compose.prod.yml` owns the production-like stack.

The frontend already has a local Compose file, but its `web` service is a temporary `nginx:alpine` placeholder. Issue `#18` asks to replace that with the real frontend setup and to reference the backend Docker setup style.

## Design Decision

Create a pnpm workspace rooted at `frontend/`, not at the repository root.

The first frontend application will live at:

```text
frontend/web/
```

The initial frontend stack is:

- pnpm workspace;
- TanStack Start, including TanStack Router;
- React;
- Tailwind CSS;
- daisyUI;
- TanStack Query;
- Zustand;
- Vite;
- Vitest;
- Oxlint and Oxfmt;
- TypeScript and React.

Tool versions should be selected from the current latest GA versions at implementation time.

The frontend Docker setup will use three layers of responsibility:

1. `web-compose-base` in `infra/compose/common-services.yml` captures the common runtime contract, such as environment variables and API dependency wiring, for the web service.
1. `web-pnpm-base` in `infra/compose/common-dev-services.yml` captures reusable local pnpm development behavior for the web service.
1. `web` in `frontend/docker/compose.local.yml` owns the concrete frontend local stack entrypoint.

The `web` local service will be behind a Compose profile named `frontend`. `mise` is the blessed task runner, so it is acceptable if raw `docker compose up -d` from `frontend/docker/` does not start the complete frontend stack.

The intended local workflows are:

```sh
# Docker-first frontend development.
mise //frontend/docker:up

# Host-run frontend with API and backend dependencies in Docker.
mise //frontend/docker:up-backend
pnpm --dir frontend --filter web dev
```

The frontend Dockerfile will live under the frontend Docker module and support both build caching and production packaging.

The initial Dockerfile stage model is inspired by [the pnpm Docker CI/CD guidance](https://pnpm.io/docker#example-3-build-on-cicd), especially the lockfile-first `pnpm fetch` pattern:

1. a pnpm store priming stage that copies the lockfile and runs `pnpm fetch`;
1. a `web`-specific production build stage that installs from the primed store and builds `frontend/web/`;
1. a `web`-specific runtime packaging stage that copies the build artifact into the final runtime image.

The repeated build and runtime stages are intentionally web-specific for now. When the frontend workspace gains more applications, each new application can receive its own build and runtime targets.

## Proposed File Layout

The frontend area should move toward this shape:

```text
frontend/
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  web/
    package.json
    src/
  docker/
    Dockerfile
    compose.local.yml
    mise.toml
    .env.example
```

The repository root should not become the JavaScript package root. Keeping the pnpm workspace under `frontend/` preserves the repository's component boundary and avoids making root-level tooling look frontend-specific.

## Compose Service Design

### `web-compose-base`

`web-compose-base` belongs in `infra/compose/common-services.yml`.

It should hold only common runtime contract details that are not specific to a local source-mounted pnpm workflow. Initially this may be small, but the service base gives the web service the same explicit shared-contract shape as the API.

Expected responsibilities:

- define common web-to-api dependency wiring;
- hold common web environment variables when they become stable;
- avoid local-only source mounts, user mapping, pnpm commands, and pnpm cache volumes.

It is acceptable for the initial environment block to be empty or nearly empty if there are no stable common web environment variables yet.

### `web-pnpm-base`

`web-pnpm-base` belongs in `infra/compose/common-dev-services.yml`.

It should extend `web-compose-base` and define the local development image and source-mounted pnpm behavior.

Expected responsibilities:

- build the frontend Dockerfile with context `../../frontend`, Dockerfile `docker/Dockerfile`, and target `web-pnpm-base`;
- set the frontend workspace as the working directory;
- run as the host user through `HOST_UID` and `HOST_GID`;
- mount `../../frontend` into the container;
- mount container-owned dependency state for `node_modules` and the pnpm store;
- set pnpm-related environment values needed by local development.

The service should remain `web`-specific for now. A generic `frontend-pnpm-base` should wait until there is more than one frontend project or a clear second consumer.

### `frontend/docker/compose.local.yml`

The frontend local Compose file owns the concrete runnable stack.

It should explicitly declare:

- `web`;
- `api`;
- `postgres`;
- `redis`;
- `flyway`;
- top-level volumes used by the frontend local stack.

The `web` service should:

- extend `web-pnpm-base`;
- use `profiles: [frontend]`;
- publish `${FRONTEND_HTTP_PORT}` to the default port generated by the TanStack Start setup;
- run the TanStack Start development server on `0.0.0.0`;
- inherit API dependency wiring from `web-compose-base`.

Because Compose `extends` reuses service definitions but does not make the caller automatically inherit top-level resources, the concrete frontend Compose file must declare named volumes such as:

```yaml
volumes:
  frontend-node-modules:
  web-node-modules:
  frontend-pnpm-store:
```

The base service may define volume mounts, but the concrete stack owns the volume resources and their lifecycle.

## pnpm Dependency State

Do not bind-mount the user's host pnpm store as the default Docker-first workflow.

pnpm's `node_modules` layout depends on a content-addressable store plus hardlinks and symlinks. That is different from Gradle's dependency cache and is more sensitive to host/container filesystem boundaries.

For local Docker development:

- bind-mount source code;
- keep root workspace `node_modules` in a Docker named volume such as `frontend-node-modules`;
- keep `web/node_modules` in an app-specific Docker named volume such as `web-node-modules`;
- keep the pnpm store in a frontend workspace Docker named volume such as `frontend-pnpm-store`, mounted at `/pnpm/store`.

This avoids writing container-owned dependency state into the host checkout and keeps the host-run frontend workflow independent from Docker's dependency state.

Workspace-level dependency volumes can be reused by future frontend app containers because they represent shared `frontend/` workspace state. App-level `node_modules` volumes should stay app-specific. For example, a future `frontend/admin/` app can share `frontend-node-modules` and `frontend-pnpm-store` with `web`, but should use its own `admin-node-modules` volume instead of reusing `web-node-modules`.

The frontend Dockerfile's pnpm fetch stage can provide a warm dependency layer. When a Docker named volume is first created, Docker can populate it from the image path mounted by that volume. However, once the volume already exists, it can mask newer image-layer store contents after `pnpm-lock.yaml` changes.

For that reason, `frontend/docker/mise.toml` should include a task for cleaning the affected frontend dependency volumes. The `up` task should print a short hint telling developers to run this cleanup task when dependency volumes appear stale after a lockfile change.

A local startup command should use a normal frozen install that can download missing packages when needed, for example:

```sh
pnpm install --frozen-lockfile --prefer-offline
pnpm --filter web dev --host 0.0.0.0
```

If Docker filesystem boundaries cause pnpm hardlink or cross-device-link problems, the implementation should set pnpm's package import method to `copy` inside Docker development.

CI should not depend on Docker Compose named volume caching. GitHub Actions Docker layer caching should be used for frontend Docker builds.

## Frontend Dockerfile Design

Create `frontend/docker/Dockerfile`.

The Dockerfile should begin with a pnpm store priming stage. Conceptually:

```dockerfile
FROM ghcr.io/pnpm/pnpm:latest AS web-node-base
RUN pnpm runtime set node lts -g
RUN pnpm config set store-dir /pnpm/store
WORKDIR /workspace/frontend

FROM web-node-base AS web-pnpm-base
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch
```

The official pnpm image should provide the current stable pnpm release, and pnpm should install the current Node LTS independently through `pnpm runtime set`.

The production build stage should copy the frontend workspace, install from the primed pnpm store, and build the first web application:

```dockerfile
FROM web-pnpm-base AS web-build
COPY . ./
RUN pnpm install --offline --frozen-lockfile
RUN pnpm --filter web build
```

The runtime packaging stage should copy only the production build artifact into the runtime image:

```dockerfile
FROM web-node-base AS web-runtime
WORKDIR /app
COPY --from=web-build /workspace/frontend/web/.output /app
CMD ["node", "server/index.mjs"]
```

The final artifact path and runtime command should be verified against the actual TanStack Start output during implementation. The exposed container port should also follow the default port generated by the TanStack Start setup. The intent is stable even if the exact output path, port, or command needs adjustment.

## Frontend CI Design

Frontend CI should use Docker Compose as the environment boundary, matching the backend workflow style.

The frontend CI setup should:

- run frontend package install, lint, format, typecheck, tests, and production build checks through Docker or Compose-managed services;
- use GitHub Actions Docker layer caching for frontend Docker builds;
- avoid relying on Docker Compose named volumes for CI dependency caching;
- accept fresh pnpm downloads when a cache miss happens.

The implementation may choose the exact GitHub Actions cache mechanism, but the cache should be attached to Docker build layers rather than Compose volume lifecycle.

## Production Compose Design

`infra/compose/compose.prod.yml` should gain a `web` service.

The production-like `web` service should:

- extend `web-compose-base`;
- build with context `../../frontend` and Dockerfile `docker/Dockerfile`;
- use `${WEB_PROD_RUNTIME_TARGET:-web-runtime}` as the target;
- run the packaged TanStack Start production artifact;
- depend on the `api` service through `web-compose-base`.

`infra/compose/prod.env.example` should gain the frontend production settings needed by the production-like stack, such as the web runtime target and public HTTP port when the stack publishes one.

The API production Dockerfile remains backend-owned. The web production Dockerfile remains frontend-owned.

## mise Task Design

`frontend/docker/mise.toml` should remain the blessed frontend Docker interface.

Recommended tasks:

- `up`: start the full Docker-first frontend local stack using the `frontend` profile;
- `up-backend`: start the API and backend dependencies without the `frontend` profile;
- `down`: stop the frontend local stack and remove orphans;
- `config`: render the full local config with the `frontend` profile;
- `config-check`: validate the full local config with the `frontend` profile;
- `clean-dependency-volumes`: remove only frontend dependency volumes such as `frontend-node-modules`, `web-node-modules`, and `frontend-pnpm-store`;
- `run`: run one-off commands against frontend stack services, usually pnpm commands from the `frontend/` folder.

The `up` task should export `HOST_UID`, `HOST_GID`, and any needed cache or tooling environment before invoking Compose, mirroring the backend Docker task style.

## Alternatives Considered

### Root-level pnpm workspace

This was not chosen because the repository root is intentionally shared by multiple component ecosystems. A root-level pnpm workspace would make the whole repository look like a JavaScript package and weaken the frontend/backend component boundary.

### Raw `docker compose up -d` starts the full frontend stack

This was not chosen because `mise` is the project's universal task runner. Using a `web` profile gives a clean host-frontend fallback while keeping the Docker-first workflow available through `mise //frontend/docker:up`.

### Bind-mount the host pnpm store

This was not chosen because pnpm's store, hardlink, and symlink behavior does not map as cleanly to host/container sharing as Gradle's cache does. Keeping Docker dependency state container-owned is simpler and safer.

### CI Compose volume caching

This was not chosen for the initial implementation. Docker Compose volume caching in CI adds lifecycle and invalidation complexity. The initial design uses GitHub Actions Docker layer caching for frontend Docker builds instead.

## Scope and Non-Goals

In scope:

- frontend-owned pnpm workspace under `frontend/`;
- initial `frontend/web/` application scaffolding;
- selected frontend stack and tooling from issue `#18`;
- Snow Miku daisyUI theme integration from issue `#27`;
- local Docker-first frontend workflow;
- host-run frontend fallback with Docker backend;
- shared `web-compose-base` and `web-pnpm-base` Compose bases;
- frontend Dockerfile with pnpm fetch, web build, and web runtime stages;
- production-like Compose support for the web service;
- frontend CI workflow using Compose and Docker layer caching;
- documentation updates needed to explain the frontend workflow.

Out of scope:

- adding Base UI or shadcn-style components before a concrete component need;
- designing multiple frontend applications beyond leaving room for future app targets;
- production hardening beyond the existing production-like Compose model;
- unrelated backend Docker refactoring;
- changing the backend API implementation.

## Risks and Open Questions

- TanStack Start's exact production output path and runtime command must be verified during implementation.
- The initial web-to-api environment contract may be small. Avoid inventing unstable public configuration before the app has real API calls.
- Existing pnpm store named volumes can hide newer image-layer store contents after lockfile changes. Local commands should use `--prefer-offline`, not require perfect offline installs, and the local task set should include a targeted frontend dependency-volume cleanup command.
- pnpm may need `package-import-method=copy` inside Docker if hardlink or cross-device behavior causes local development problems.
- The exact current latest GA versions must be checked during implementation, especially for Node, TanStack Start, daisyUI, Tailwind CSS, Vitest, Oxlint, and Oxfmt.
- Frontend CI still needs an implementation choice for whether checks run through a Compose service, a Docker build target, or both, while keeping Docker layer caching in place.

## Validation Considerations

Implementation should validate:

- `mise //frontend/docker:config-check`;
- `mise //frontend/docker:up`, confirming the web service starts through the `frontend` profile;
- `mise //frontend/docker:up-backend`, confirming the API and backend dependencies start without the web service;
- frontend dependency-volume cleanup, confirming it removes only frontend dependency volumes and preserves Postgres and Redis data volumes;
- host-run frontend development against the Docker API stack;
- frontend package install and dev server startup inside Docker;
- frontend lint, format, typecheck, and tests;
- production-like Compose config rendering after adding the `web` service;
- production web Docker image build through the `web-runtime` target;
- frontend GitHub Actions workflow behavior, including Docker layer cache configuration and successful frontend checks.

## References

| Resouce | Description | Other Notes if any |
| --- | --- | --- |
| [Issue #18: Frontend Setup](https://github.com/CXwudi/nijigen-video-site/issues/18) | Source issue for the frontend stack, tooling, and Compose setup requirements. | Must Read |
| [Issue #27: Design DaisyUI themes based on Snow Miku](https://github.com/CXwudi/nijigen-video-site/issues/27) | Source issue for the Snow Miku daisyUI theme direction. | Must Read |
| [../../README.md](../../README.md) | Repository entrypoint and documentation source-of-truth guidance. | Must Read |
| [../../docs/docker-setup-explain.md](../../docs/docker-setup-explain.md) | Current Docker setup explanation and Compose reuse model. | Must Read |
| [../adl/004-component-owned-docker-modules.md](../adl/004-component-owned-docker-modules.md) | Architecture decision for component-owned Docker modules and shared Compose bases. | Must Read |
| [../../infra/compose/common-services.yml](../../infra/compose/common-services.yml) | Existing shared runtime Compose service bases. | Must Read |
| [../../infra/compose/common-dev-services.yml](../../infra/compose/common-dev-services.yml) | Existing shared local development Compose service bases. | Must Read |
| [../../frontend/docker/compose.local.yml](../../frontend/docker/compose.local.yml) | Current frontend local Compose stack with temporary web placeholder. | Must Read |
| [../../frontend/docker/mise.toml](../../frontend/docker/mise.toml) | Current frontend Docker task definitions. | Must Read |
| [../../infra/compose/compose.prod.yml](../../infra/compose/compose.prod.yml) | Existing production-like Compose stack that should gain the web service. | Must Read |
| [../../backend/docker/Dockerfile](../../backend/docker/Dockerfile) | Existing backend production Dockerfile pattern for build and runtime targets. | Important |
| [pnpm Docker documentation](https://pnpm.io/docker) | Docker guidance, including the `pnpm fetch` CI/CD layering pattern. | Important |
| [pnpm symlinked node_modules structure](https://pnpm.io/symlinked-node-modules-structure) | Explains pnpm's content-addressable store, hardlinks, and symlinked dependency layout. | Important |
