# Docker Compose for dev, test, and CI

Copy `docker/.env.example` to `docker/.env`. And run task defined in [`mise.toml`](mise.toml).

## Quick Start

```bash
# bring up the stack of backend dependencies, using the default profile
mise //docker:up-backend-deps

# bring up the backend stack, using the `backend` profile
mise //docker:up-backend

# bring up the backend stack and initialize frontend dependency volumes, using the `frontend-deps` profile
mise //docker:up-frontend-deps

# bring up the full backend and frontend stack, using the `full` profile
mise //docker:up-full

# validate the default selection, each supported profile, and all profiles together
mise //docker:config-check

# print the resolved Compose configuration for all services, including environment values
mise //docker:config

# stop the stack across all profiles, preserving named volumes
mise //docker:down

# stop and remove frontend services and delete node_volumes and pnpm store. This does not delete volumes from other dependent services such as PostgreSQL and Redis
mise //docker:clear-frontend-node-volumes
```

You can run these tasks **anywhere** from the repository, as `//docker` means `/docker` from the root [`mise.toml`](../mise.toml) file

Starting fewer profiles does not stop previously started services. `mise //docker:down` stops the entire shared project across all profiles and preserves named volumes. `clear-frontend-node-volumes` stops/removes only `frontend-app-web` and `frontend-dep-init` and deletes only the three frontend dependency volumes, using their resolved Compose names; PostgreSQL and Redis data remain intact.

## Run arbituary command in app service

The `run` task forwards arbitrary arguments to `docker compose run`, preserves its exit code, and leaves dependencies running for reuse:

```bash
mise //docker:run --rm backend-app-api :apps:api:test  # Runs `./gradlew :apps:api:test` in the backend-app-api service
mise //docker:run --rm backend-app-api :apps:api:nativeCompile
mise //docker:run --rm frontend-app-web --filter web test  # Runs `pnpm --filter web test` in the frontend-app-web service
mise //docker:run --rm --entrypoint sh backend-app-api -c 'java -version'
```

Explicitly targeting `backend-app-api` or `frontend-app-web` enables the relevant service and its declared dependencies without requiring a profile flag. `run` does not publish the target service's ports by default; use `--service-ports` for a one-off server that needs host access. `--no-deps` skips every dependency, including `frontend-dep-init`, so initialize frontend dependency volumes before independent checks:

```bash
mise //docker:run --rm --no-deps frontend-dep-init
mise //docker:run --rm --no-deps frontend-app-web --filter web lint
```

## Run arbituery `docker compose` command

To run Compose command with the same environment preparation, run these direct script commands from the repository root:

```bash
mise exec -- bash docker/compose.sh --profile full config --services
mise exec -- bash docker/compose.sh ps
mise exec -- bash docker/compose.sh stop frontend-app-web
```
