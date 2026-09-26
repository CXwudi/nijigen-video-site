# Docker Compose for dev, test, and CI

Run these tasks from the repository root after copying `docker/.env.example` to `docker/.env`:

| Task | Profile | Services selected |
| --- | --- | --- |
| `mise //docker:up-backend-deps` | None | postgres, redis, flyway |
| `mise //docker:up-backend` | backend | Dependencies + api |
| `mise //docker:up-frontend-deps` | frontend-deps | Dependencies + api + web-init |
| `mise //docker:up-full` | full | Dependencies + api + web-init + web |

Flyway and web-init are one-off services and exit after completion. web-init sets ownership of the pnpm store and node_modules volumes; it does not run `pnpm install` or prepare host node_modules. For a host-run frontend, `up-backend` is sufficient. After lockfile changes, rebuild the frontend image and use `mise //docker:clean-dependency-volumes` to refresh stale dependency volumes before starting web again.

`config-check` validates the default selection, each supported profile, and all profiles together. `config` prints all resolved services, including environment values. To inspect a particular profile or issue another Compose command with the same environment preparation:

```bash
mise exec -- bash docker/compose.sh --profile full config --services
mise exec -- bash docker/compose.sh ps
mise exec -- bash docker/compose.sh stop web
```

Starting fewer profiles does not stop previously started services. `mise //docker:down` stops the entire shared project across all profiles and preserves named volumes. `clean-dependency-volumes` stops/removes only web and web-init and deletes only the three frontend dependency volumes, using their resolved Compose names; PostgreSQL and Redis data remain intact.

The `run` task forwards arbitrary arguments to `docker compose run`, preserves its exit code, and leaves dependencies running for reuse:

```bash
mise //docker:run --rm api :apps:api:test
mise //docker:run --rm api :apps:api:nativeCompile
mise //docker:run --rm web --filter web test
mise //docker:run --rm --entrypoint sh api -c 'java -version'
```

Explicitly targeting api or web enables the relevant service and its declared dependencies without requiring a profile flag. `run` does not publish the target service's ports by default; use `--service-ports` for a one-off server that needs host access. `--no-deps` skips every dependency, including web-init, so initialize frontend dependency volumes before independent checks:

```bash
mise //docker:run --rm --no-deps web-init
mise //docker:run --rm --no-deps web --filter web lint
```

The API uses a non-hardened Liberica Native Image Kit JDK image for development, tests, and CI. Its health check requires an HTTP 200 response from `/actuator/health`.

CI uses this same entrypoint with a unique `COMPOSE_PROJECT_NAME` for each run/job. Frontend static checks bypass backend startup; tests that use the backend wait for the same Compose health check. The frontend job restores Gradle caches and prints container status and recent backend logs on failure before cleanup.
