# ADL-0004: Component-Owned Docker Modules with Shared Compose Service Bases

- **Status:** Proposed
- **Date:** 2026-05-05
- **Owner:** CXwudi
- **Project:** `nijigen-video-site`
- **Related areas:** Docker Compose, local development workflow, backend containerization, frontend integration workflow, Just command organization

## 1. Context

The project is still in an early stage. The current Docker Compose setup lives under a centralized infrastructure directory and separates several local/backend workflows into different Compose files.

The project needs a clearer local Docker organization that supports both backend and future frontend development.

Backend developers need a local Docker/Compose setup that can:

- start backend dependency services only;
- start the local backend app stack;
- run one-off Gradle commands inside the container;
- run native-related Gradle tasks such as `:apps:api:nativeTest`;
- support JetBrains IDE container run targets.

Frontend developers should eventually be able to start a local frontend testing stack without understanding backend-specific Docker internals.

The desired developer experience is:

- each component owns its own Docker entrypoint;
- each developer-facing Compose file clearly lists what it launches;
- common service definitions are extracted only when they are genuinely shared;
- normal workflows avoid hidden Compose composition;
- Docker-related Just recipes have predictable working-directory behavior.

This ADL decides the local Docker module layout and command organization rules.

---

## 2. Decision

We will organize local Docker/Compose configuration as **component-owned Docker modules**.

The backend Docker module will live under:

```text
backend/docker/
```

The frontend Docker module will eventually live under:

```text
frontend/docker/
```

The shared Compose service base file will live under:

```text
infra/compose/common-services.yml
```

The backend Docker module will contain Docker-related files such as:

```text
backend/docker/
  justfile
  compose.local.yml
  Dockerfile
  .env.example
  .env
```

The folder name is `docker/`, not `compose/`, because the module may contain more than Compose YAML. It may contain:

- Dockerfile;
- Docker Compose file;
- Docker-focused `.env` files;
- Docker-focused Just recipes;
- future Docker scripts or documentation.

Normal local development workflows should avoid:

```yaml
include:
```

and should avoid requiring:

```bash
docker compose -f a.yml -f b.yml ...
```

Developer-facing Compose files should be explicit stack manifests.

For Just command organization, Docker command reuse should avoid `import`.

Accepted alternatives are:

1. `mod`, when we want namespaced module behavior and module-local working directory.
2. wrapper recipes that call another `just` command using another justfile explicitly.

---

## 3. Target Repository Layout

Initial target layout:

```text
nijigen-video-site/
  justfile

  infra/
    compose/
      common-services.yml
      compose.prod.yml

  backend/
    justfile
    .dockerignore
    docker/
      justfile
      compose.local.yml
      Dockerfile
      .env.example
      .env

  frontend/
    justfile
    docker/
      justfile
      compose.local.yml
      .env.example
      .env
```

The frontend Docker module can be introduced later when the frontend implementation becomes substantial.

Until then, the backend Docker module can be implemented first.

---

## 4. Responsibility Boundaries

### 4.1 `infra/compose/common-services.yml`

`common-services.yml` is a shared Compose definition file.

It should contain common reusable service definitions when they represent real shared behavior.

The following base services are expected to exist:

```text
api-compose-base
postgres-base
redis-base
flyway-base
```

`api-compose-base` is definitely needed.

It represents the shared API runtime contract across local, frontend, and production-like stacks.

It may contain API settings that are common regardless of how the API process is launched, such as:

```text
depends_on
Spring datasource environment variables
Redis environment variables
shared network membership
```

It should not contain API implementation details that differ by workflow, such as:

```text
image
build
entrypoint
command
ports
volumes
user
Gradle-specific environment
restart policy
```

Those belong in concrete Compose files or in a more specific reusable base if reuse justifies extraction.

Examples of common service bases:

```text
api-compose-base
postgres-base
redis-base
flyway-base
```

More specific API variant bases may be introduced or kept only when they are used more than once:

```text
api-local-gradle-base
api-local-jb-base
api-prod-base
```

These variant bases should not be created merely for conceptual completeness.

The rule is:

> Keep `api-compose-base`. Extract API variants only when there is concrete reuse.

---

### 4.2 `backend/docker/compose.local.yml`

`backend/docker/compose.local.yml` is the backend developer-facing local Compose stack.

It explicitly declares the services it can launch:

```text
api
api-jb
postgres
redis
flyway
```

Repeated infrastructure services should usually extend from `infra/compose/common-services.yml`.

The repetition is intentional. The local file acts as a visible manifest of what the backend local stack can launch.

Backend default behavior:

```bash
cd backend/docker
docker compose --env-file .env -f compose.local.yml up -d
```

should start backend dependencies only:

```text
postgres
redis
flyway
```

Starting the full backend local app stack should use a profile:

```bash
cd backend/docker
docker compose --env-file .env -f compose.local.yml --profile backend up -d
```

This should start:

```text
postgres
redis
flyway
api
```

JetBrains-oriented container support should be hidden behind a JetBrains-only or dummy profile:

```bash
cd backend/docker
docker compose --env-file .env -f compose.local.yml --profile jetbrains up -d
```

This should start:

```text
postgres
redis
flyway
api-jb
```

Normal backend development workflows should not start `api-jb`.

---

### 4.3 `frontend/docker/compose.local.yml`

`frontend/docker/compose.local.yml` is the future frontend developer-facing local Compose stack.

When added, it should explicitly declare the full local stack needed by frontend developers, likely including:

```text
frontend
api
postgres
redis
flyway
```

The frontend file should not extend from `backend/docker/compose.local.yml`.

It should either:

- define services directly; or
- extend shared services from `infra/compose/common-services.yml`; or
- extend from another shared YAML file if such a file is introduced later for a clear purpose.

The frontend local stack should have its own Compose project name, separate from the backend stack.

Frontend default behavior should probably start the whole frontend testing stack:

```bash
cd frontend/docker
docker compose --env-file .env -f compose.local.yml up -d
```

This should start:

```text
frontend
api
postgres
redis
flyway
```

Unlike the backend file, the frontend file does not need to preserve a “dependencies only” default. The default should match what frontend developers need for local testing.

Optional frontend services may use profiles, for example:

```text
storybook
e2e
mock-server
```

---

### 4.4 Root and Component Justfiles

The root `justfile` should act as a high-level shim.

The backend root `justfile` should also act as a shim.

Docker-specific recipes should live in:

```text
backend/docker/justfile
```

The backend root justfile should use `mod`:

```just
# backend/justfile

mod docker 'docker/justfile'
```

The repository root justfile can then use:

```just
# justfile

mod backend 'backend/justfile'
mod frontend 'frontend/justfile'
```

This enables commands such as:

```bash
# From repo root
just backend docker up
just backend docker up-backend
just backend docker run --rm api :apps:api:test
just backend docker run --rm api :apps:api:nativeTest

# From backend/
just docker up
just docker up-backend
just docker run --rm api :apps:api:test
```

The actual Docker/Compose behavior remains owned by:

```text
backend/docker/justfile
```

---

## 5. Detailed Decisions

### 5.1 Use `backend/docker/`, not `backend/compose/`

We will use:

```text
backend/docker/
```

instead of:

```text
backend/compose/
```

because the folder is not only about Docker Compose.

It may contain:

```text
compose.local.yml
Dockerfile
.env.example
.env
justfile
README.md
scripts/
```

The name `docker/` better describes a component-level containerization module.

---

### 5.2 Use explicit `--env-file` in Just recipes

Docker Compose commands invoked from Just must pass `--env-file` explicitly.

Example:

```just
compose := "docker compose --env-file .env -f compose.local.yml"
```

Because recipes inside a `mod` module run from the module directory, this means:

```text
backend/docker/.env
```

is used by:

```text
backend/docker/justfile
```

This avoids ambiguity about whether Compose reads `.env` from:

```text
backend/
```

or:

```text
backend/docker/
```

The selected rule is:

> Each Docker module owns its own `.env` file next to its `compose.local.yml`.

So:

```text
backend/docker/.env
frontend/docker/.env
```

are the local Compose environment files.

---

### 5.3 Avoid `just import` for Docker workflow reuse

`just import` is banned for Docker workflow reuse in this project.

Reason:

- Imported recipes are effectively included into the importing/root justfile.
- A recipe physically defined in `backend/docker/justfile` but imported into `backend/justfile` would normally run from `backend/`, not `backend/docker/`.
- That makes paths such as `.env`, `compose.local.yml`, `Dockerfile`, and local helper scripts less clear.

Accepted alternatives are:

#### Alternative A: Use `mod`

Example:

```just
# backend/justfile

mod docker 'docker/justfile'
```

This keeps Docker recipes namespaced and executes them from the module directory.

#### Alternative B: Wrapper recipe that calls another Justfile

Example:

```just
# backend/justfile

docker-up *args:
  just --justfile docker/justfile up {{args}}

docker-run *args:
  just --justfile docker/justfile run {{args}}
```

This is acceptable when a flat command name is desired, but the canonical Docker logic should still live inside:

```text
backend/docker/justfile
```

Initial preference:

> Use `mod` first. Add wrapper recipes only if command ergonomics require them.

---

### 5.4 Avoid Compose `include:`

Concrete local Compose files should not use:

```yaml
include:
  - ...
```

for normal local workflows.

Reason:

- It hides part of the launched stack in another Compose file.
- It makes the concrete local file less self-explanatory.
- It can create a hierarchy of stack definitions that is harder to audit.

Instead, each developer-facing `compose.local.yml` should explicitly list the services it launches.

---

### 5.5 Avoid normal workflows requiring multiple Compose files

Normal local development should not require commands such as:

```bash
docker compose -f compose.backend.yml -f compose.frontend.yml up
```

Reason:

- File order matters.
- Relative paths become less obvious.
- Developers must understand the final merged model.
- It violates the goal of a single obvious local stack file.

Instead, each component should have one concrete local Compose file for its normal workflow:

```text
backend/docker/compose.local.yml
frontend/docker/compose.local.yml
```

---

### 5.6 Use `extends` pragmatically

Concrete local Compose files may use `extends` to avoid duplicated service definitions.

For now, a single shared file is sufficient:

```text
infra/compose/common-services.yml
```

But the rule is not absolute.

Future shared Compose YAML files may be introduced if there is a clear reason.

For example, this is allowed in the future if justified:

```text
infra/compose/common-services.yml
infra/compose/common-observability.yml
infra/compose/common-object-storage.yml
```

The current preference is:

> Extend from `common-services.yml` for common service bases, but only extract shared YAML when it reduces real duplication.

Component Compose files should not extend from each other.

For example, this should be avoided:

```yaml
# frontend/docker/compose.local.yml

services:
  api:
    extends:
      file: ../../backend/docker/compose.local.yml
      service: api
```

Frontend should not depend on backend’s concrete local stack file.

---

### 5.7 API base service policy

`api-compose-base` is part of the intended shared Compose model and should be kept.

It represents shared API behavior that applies across API service variants.

Expected contents include:

```text
depends_on
Spring datasource configuration
Redis configuration
network membership
```

Example responsibilities:

```text
api depends on healthy postgres
api depends on healthy redis
api depends on completed flyway migration
api receives SPRING_DATASOURCE_URL
api receives SPRING_DATASOURCE_USERNAME
api receives SPRING_DATASOURCE_PASSWORD
api receives SPRING_DATA_REDIS_HOST
api receives SPRING_DATA_REDIS_PORT
api joins the app network
```

`api-compose-base` should avoid workflow-specific details.

It should not define:

```text
image
build
entrypoint
command
ports
volumes
user
GRADLE_USER_HOME
CI
restart policy
```

unless those settings are truly common across all API variants.

Concrete API services should extend `api-compose-base`.

For example:

```yaml
services:
  api:
    extends:
      file: ../../infra/compose/common-services.yml
      service: api-compose-base
    image: ...
    entrypoint: ...
    command: ...
```

More specific API bases are optional:

```text
api-local-gradle-base
api-local-jb-base
api-prod-base
```

These may be kept if they are used by more than one concrete service or Compose file.

For example:

- `api-local-gradle-base` may be useful if both `backend/docker/compose.local.yml` and `frontend/docker/compose.local.yml` launch the backend API through a mounted Gradle workspace.
- `api-local-jb-base` may be useful if multiple JetBrains-oriented services or stacks need the same dummy container shape.
- `api-prod-base` may be useful if multiple production-like Compose files share the same build/runtime behavior.

If a variant base is used only once, prefer inlining that variant directly in the concrete Compose file.

The extraction rule is:

> `api-compose-base` is required. API variant bases are reuse-driven.

---

### 5.8 Keep `.dockerignore` at `backend/.dockerignore`

If the backend Dockerfile moves to:

```text
backend/docker/Dockerfile
```

the backend build context should still be:

```text
backend/
```

Therefore the main `.dockerignore` should remain at:

```text
backend/.dockerignore
```

because it describes the backend build context.

The Compose build configuration should use:

```yaml
build:
  context: ..
  dockerfile: docker/Dockerfile
```

from:

```text
backend/docker/compose.local.yml
```

This means:

```text
context: ..
```

resolves to:

```text
backend/
```

and:

```text
dockerfile: docker/Dockerfile
```

resolves inside that context.

---

### 5.9 Local backend service uses Native Image Kit JDK image

The local backend `api` service should use the Native Image Kit JDK image.

Reason:

- The local backend Docker environment must support normal Gradle tasks.
- It should also support native-related tasks such as:

```bash
:apps:api:nativeTest
```

- Native testing may remain disabled in CI for performance reasons, but it should remain available locally.

The `api-jb` service may also use the same Native Image Kit JDK image for consistency.

The accepted tradeoff is a larger image in exchange for fewer image variants and fewer surprises.

---

### 5.10 Use `entrypoint` for Gradle launcher and `command` for default task

The local backend app service should be structured so that:

```yaml
entrypoint:
  - ./gradlew
  - --no-daemon

command:
  - :apps:api:bootRun
```

This allows:

```bash
docker compose --env-file .env -f compose.local.yml --profile backend up -d
```

to run:

```bash
./gradlew --no-daemon :apps:api:bootRun
```

and allows:

```bash
docker compose --env-file .env -f compose.local.yml run --rm api :apps:api:test
```

to run:

```bash
./gradlew --no-daemon :apps:api:test
```

Similarly:

```bash
docker compose --env-file .env -f compose.local.yml run --rm api :apps:api:nativeTest
```

runs:

```bash
./gradlew --no-daemon :apps:api:nativeTest
```

One-off shell access can override the entrypoint:

```bash
docker compose --env-file .env -f compose.local.yml run --rm \
  --entrypoint /bin/sh \
  api \
  -lc 'java -version && native-image --version'
```

---

### 5.11 Backend profile policy

`backend/docker/compose.local.yml` should use the following profile strategy:

```text
unprofiled:
  postgres
  redis
  flyway

profile backend:
  api

profile jetbrains:
  api-jb
```

This gives backend developers three useful modes.

Dependencies only:

```bash
cd backend/docker
docker compose --env-file .env -f compose.local.yml up -d
```

Full local backend stack:

```bash
cd backend/docker
docker compose --env-file .env -f compose.local.yml --profile backend up -d
```

JetBrains container target stack:

```bash
cd backend/docker
docker compose --env-file .env -f compose.local.yml --profile jetbrains up -d
```

Normal developer workflows and Just recipes should not start `api-jb`.

`api-jb` exists only for JetBrains tooling.

If JetBrains can target a profiled service directly, the profile can remain hidden from normal workflows.

If JetBrains requires the service to be visible without setting profiles, this decision may need to be revisited.

---

### 5.12 Frontend profile policy

When `frontend/docker/compose.local.yml` is introduced, its default profile policy may differ from the backend file.

Frontend default should likely launch the full frontend testing stack:

```text
frontend
api
postgres
redis
flyway
```

Therefore these normal-path services should probably be unprofiled in the frontend local Compose file.

Optional frontend services may use profiles, for example:

```text
storybook
e2e
visual-tests
```

This difference is intentional.

Backend’s default optimizes for backend dependency startup.

Frontend’s default optimizes for frontend integration testing.

---

### 5.13 Backend and frontend should use different Compose project names

Backend and frontend local stacks should use different default Compose project names.

Backend:

```yaml
name: ${COMPOSE_PROJECT_NAME:-nijigen-video-site-backend}
```

Frontend:

```yaml
name: ${COMPOSE_PROJECT_NAME:-nijigen-video-site-frontend}
```

Reason:

- backend and frontend local stacks are component-owned;
- each stack may declare services with the same names, such as `api`, `postgres`, `redis`, and `flyway`;
- using the same project name would make both files manage the same Compose project identity;
- switching between backend and frontend Compose files with the same project name could cause unwanted service recreation if resolved service definitions differ.

Different project names make the stacks independent by default.

---

### 5.14 Remove explicit `container_name`

Concrete Compose services should avoid `container_name`.

Reason:

- explicit container names prevent scaling a service to multiple replicas;
- explicit names make parallel local stacks harder;
- Compose already generates predictable names using the project and service name;
- project-specific generated names avoid conflicts between backend and frontend stacks.

For example, avoid this:

```yaml
services:
  postgres:
    container_name: nijigen-video-site-postgres
```

Prefer this:

```yaml
services:
  postgres:
    image: postgres:${POSTGRES_VERSION:-17}
```

Compose will generate a container name based on the project and service.

This enables future commands such as:

```bash
docker compose --env-file .env -f compose.local.yml up --scale api=2
```

if the service design supports it.

---

### 5.15 Let Compose namespace networks and volumes by project

Because backend and frontend stacks use different Compose project names, top-level networks and volumes should usually avoid explicit `name:`.

Prefer:

```yaml
networks:
  app:

volumes:
  postgres-data:
  redis-data:
```

instead of:

```yaml
networks:
  app:
    name: ${COMPOSE_PROJECT_NAME}-app

volumes:
  postgres-data:
    name: ${COMPOSE_PROJECT_NAME}-postgres-data
```

Both approaches can work, but allowing Compose to apply project-based names by default is simpler and reduces naming mistakes.

With backend project name:

```text
nijigen-video-site-backend
```

Compose will create resources such as:

```text
nijigen-video-site-backend_app
nijigen-video-site-backend_postgres-data
nijigen-video-site-backend_redis-data
```

With frontend project name:

```text
nijigen-video-site-frontend
```

Compose will create separate resources such as:

```text
nijigen-video-site-frontend_app
nijigen-video-site-frontend_postgres-data
nijigen-video-site-frontend_redis-data
```

---

### 5.16 Different project names may require different host ports

Because backend and frontend stacks are independent, they may both contain services such as:

```text
api
postgres
redis
```

If both stacks are running at the same time, host port mappings can conflict.

For example, both stacks cannot bind:

```text
localhost:8080 -> api:8080
localhost:5432 -> postgres:5432
localhost:6379 -> redis:6379
```

at the same time.

Therefore, each Docker module’s `.env.example` should define component-specific default host ports.

Example backend defaults:

```dotenv
COMPOSE_PROJECT_NAME=nijigen-video-site-backend
API_HTTP_PORT=8080
POSTGRES_HOST_PORT=5432
REDIS_HOST_PORT=6379
```

Example frontend defaults:

```dotenv
COMPOSE_PROJECT_NAME=nijigen-video-site-frontend
FRONTEND_HTTP_PORT=5173
API_HTTP_PORT=18080
POSTGRES_HOST_PORT=15432
REDIS_HOST_PORT=16379
```

Alternatively, the frontend stack may choose not to expose database and Redis ports to the host if frontend developers do not need direct access to them.

For example, in the frontend Compose file:

```yaml
postgres:
  extends:
    file: ../../infra/compose/common-services.yml
    service: postgres-base
  # No host port mapping unless needed.

redis:
  extends:
    file: ../../infra/compose/common-services.yml
    service: redis-base
  # No host port mapping unless needed.
```

This is often preferable for frontend workflows.

---

## 6. Proposed File Examples

### 6.1 `backend/justfile`

```just
mod docker 'docker/justfile'
```

Optional wrapper recipes may be added later.

Example:

```just
mod docker 'docker/justfile'

docker-up *args:
  just --justfile docker/justfile up {{args}}

docker-run *args:
  just --justfile docker/justfile run {{args}}
```

However, the preferred canonical form is:

```bash
just docker up
just docker up-backend
just docker run --rm api :apps:api:test
```

---

### 6.2 Root `justfile`

```just
mod backend 'backend/justfile'
mod frontend 'frontend/justfile'
```

This enables:

```bash
just backend docker up
just backend docker up-backend
just backend docker run --rm api :apps:api:nativeTest
```

---

### 6.3 `backend/docker/justfile`

```just
set shell := ["bash", "-euo", "pipefail", "-c"]

compose := "docker compose --env-file .env -f compose.local.yml"

# Start backend dependencies only: postgres, redis, flyway.
up:
  {{compose}} up -d

# Start backend dependencies and the local Gradle-backed API service.
up-backend:
  {{compose}} --profile backend up -d

# Start backend dependencies and the JetBrains-only container target.
up-jetbrains:
  {{compose}} --profile jetbrains up -d

# Stop all backend local Docker services managed by this file.
down:
  {{compose}} --profile backend --profile jetbrains down --remove-orphans

# Print the fully resolved Compose config.
config:
  {{compose}} --profile backend --profile jetbrains config

# Validate the resolved Compose config.
config-check:
  {{compose}} --profile backend --profile jetbrains config --quiet

# Run one-off commands against a service.
#
# Examples:
#   just docker run --rm api :apps:api:test
#   just docker run --rm api :apps:api:nativeTest
#   just docker run --rm --entrypoint /bin/sh api -lc 'java -version && native-image --version'
[positional-arguments]
run +args:
  {{compose}} run "$@"
```

---

### 6.4 `backend/docker/compose.local.yml`

This is a sketch, not final implementation code.

```yaml
name: ${COMPOSE_PROJECT_NAME:-nijigen-video-site-backend}

services:
  api:
    extends:
      file: ../../infra/compose/common-services.yml
      service: api-compose-base
    image: ghcr.io/bell-sw/hardened-liberica-native-image-kit-container:jdk-${JDK_VERSION:-25}-nik-${JDK_VERSION:-25}-glibc
    working_dir: /workspace/backend
    user: "${HOST_UID:-0}:${HOST_GID:-0}"
    profiles:
      - backend
    environment:
      GRADLE_USER_HOME: /gradle-home
      CI: ${CI:-}
    entrypoint:
      - ./gradlew
      - --no-daemon
    command:
      - :apps:api:bootRun
    ports:
      - ${API_HTTP_PORT:-8080}:8080
    volumes:
      - ..:/workspace/backend
      - ${HOST_GRADLE_USER_HOME:-${HOME}/.gradle}:/gradle-home
    restart: "no"

  api-jb:
    extends:
      file: ../../infra/compose/common-services.yml
      service: api-compose-base
    image: ghcr.io/bell-sw/hardened-liberica-native-image-kit-container:jdk-${JDK_VERSION:-25}-nik-${JDK_VERSION:-25}-glibc
    working_dir: /workspace/backend
    profiles:
      - jetbrains
    command:
      - sleep
      - infinity
    ports:
      - ${API_HTTP_PORT:-8080}:8080
    volumes:
      - ..:/workspace/backend
    restart: "no"

  postgres:
    extends:
      file: ../../infra/compose/common-services.yml
      service: postgres-base
    ports:
      - ${POSTGRES_HOST_PORT:-5432}:5432

  redis:
    extends:
      file: ../../infra/compose/common-services.yml
      service: redis-base
    ports:
      - ${REDIS_HOST_PORT:-6379}:6379

  flyway:
    extends:
      file: ../../infra/compose/common-services.yml
      service: flyway-base
    environment:
      FLYWAY_LOCATIONS: filesystem:/flyway/sql/baseline,filesystem:/flyway/sql/local
    volumes:
      - ../../infra/flyway/sql/local:/flyway/sql/local:ro

networks:
  app:

volumes:
  postgres-data:
  redis-data:
```

Notes:

- `api` and `api-jb` both extend `api-compose-base`.
- They inherit the shared API dependency and Spring environment contract.
- They define their own image, command, entrypoint, volumes, profile, and restart behavior.
- No `api-local-gradle-base` or `api-local-jb-base` is needed unless the same variant appears in more than one place.

---

### 6.5 `infra/compose/common-services.yml`

This is a sketch of the intended direction.

The file should contain common reusable service definitions.

```yaml
services:
  api-compose-base:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      flyway:
        condition: service_completed_successfully
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB:-nijigen}
      SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER:-nijigen}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD:-nijigen}
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: "6379"
    networks:
      - app

  postgres-base:
    image: postgres:${POSTGRES_VERSION:-17}
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-nijigen}
      POSTGRES_USER: ${POSTGRES_USER:-nijigen}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-nijigen}
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"
      interval: 2s
      timeout: 3s
      retries: 20
      start_period: 5s
    networks:
      - app
    restart: unless-stopped
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis-base:
    image: redis:${REDIS_VERSION:-8}
    command:
      - redis-server
      - --appendonly
      - "yes"
    healthcheck:
      test:
        - CMD
        - redis-cli
        - ping
      interval: 2s
      timeout: 3s
      retries: 20
      start_period: 5s
    networks:
      - app
    restart: unless-stopped
    volumes:
      - redis-data:/data

  flyway-base:
    image: flyway/flyway:${FLYWAY_VERSION:-11}
    command:
      - migrate
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      FLYWAY_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB:-nijigen}
      FLYWAY_USER: ${POSTGRES_USER:-nijigen}
      FLYWAY_PASSWORD: ${POSTGRES_PASSWORD:-nijigen}
      FLYWAY_CONNECT_RETRIES: "60"
      FLYWAY_LOCATIONS: filesystem:/flyway/sql/baseline
    networks:
      - app
    restart: "no"
    volumes:
      - ../flyway/sql/baseline:/flyway/sql/baseline:ro
```

Important note:

`common-services.yml` may refer to top-level resources such as:

```text
app
postgres-data
redis-data
```

but each concrete Compose file must still declare the top-level resources:

```yaml
networks:
  app:

volumes:
  postgres-data:
  redis-data:
```

This is intentional because `extends` is not a full stack include mechanism.

---

### 6.6 `backend/docker/Dockerfile`

If the backend Dockerfile moves to:

```text
backend/docker/Dockerfile
```

then any Compose `build` config should use:

```yaml
build:
  context: ..
  dockerfile: docker/Dockerfile
```

The Dockerfile should continue to assume that the build context is the backend root.

For example:

```dockerfile
COPY gradlew .
COPY gradle gradle
COPY settings.gradle.kts .
COPY build.gradle.kts .
COPY apps apps
COPY libs libs
```

These paths are relative to the build context, not the Dockerfile directory.

---

### 6.7 `backend/docker/.env.example`

Example backend defaults:

```dotenv
COMPOSE_PROJECT_NAME=nijigen-video-site-backend

JDK_VERSION=25

POSTGRES_VERSION=17
POSTGRES_DB=nijigen
POSTGRES_USER=nijigen
POSTGRES_PASSWORD=nijigen
POSTGRES_HOST_PORT=5432

REDIS_VERSION=8
REDIS_HOST_PORT=6379

FLYWAY_VERSION=11

API_HTTP_PORT=8080

# Usually filled by Just or the developer's shell.
HOST_UID=1000
HOST_GID=1000
HOST_GRADLE_USER_HOME=~/.gradle
```

---

### 6.8 Future `frontend/docker/.env.example`

Example frontend defaults:

```dotenv
COMPOSE_PROJECT_NAME=nijigen-video-site-frontend

NODE_VERSION=22

JDK_VERSION=25

POSTGRES_VERSION=17
POSTGRES_DB=nijigen
POSTGRES_USER=nijigen
POSTGRES_PASSWORD=nijigen

REDIS_VERSION=8
FLYWAY_VERSION=11

FRONTEND_HTTP_PORT=5173

# Use different host API port to avoid conflicting with backend stack.
API_HTTP_PORT=18080

# Optional: expose these only if frontend developers need direct DB/Redis access.
POSTGRES_HOST_PORT=15432
REDIS_HOST_PORT=16379
```

---

## 7. Consequences

### 7.1 Positive Consequences

#### Clear component ownership

Each component owns its local Docker entrypoint:

```text
backend/docker/compose.local.yml
frontend/docker/compose.local.yml
```

A backend developer does not need to understand a project-level local Compose file.

A frontend developer does not need to understand backend-specific Docker command internals.

---

#### Clear Docker command working directory

Because Docker commands live in a `just mod` module under:

```text
backend/docker/justfile
```

the working directory is naturally:

```text
backend/docker/
```

This makes these paths obvious:

```text
.env
compose.local.yml
Dockerfile
```

---

#### No hidden Compose stack composition

Local stacks are not assembled through:

```yaml
include:
```

or through:

```bash
docker compose -f a.yml -f b.yml ...
```

The developer-facing `compose.local.yml` lists the services it launches.

---

#### Shared service implementation where useful

Repeated concrete service declarations can extend from:

```text
infra/compose/common-services.yml
```

This reduces duplication for genuinely common services such as Postgres, Redis, and Flyway.

The design avoids premature abstractions such as local/prod API base variants until a real need appears.

---

#### Supports backend one-off commands

The local `api` service can be used as both:

- a long-running backend app service with `bootRun`;
- a one-off Gradle command runner.

Examples:

```bash
just docker run --rm api :apps:api:test
just docker run --rm api :apps:api:nativeTest
```

---

#### Supports native testing locally

Using the Native Image Kit JDK image for the local backend `api` service keeps native tooling available in the local Docker environment, even if native testing remains disabled in CI for performance reasons.

---

#### Allows replicas and parallel local stacks

Removing `container_name` allows Compose to manage generated names.

This improves support for:

```bash
docker compose up --scale api=2
```

and makes it easier for backend and frontend local stacks to coexist under different project names.

---

### 7.2 Negative Consequences

#### Concrete Compose files repeat service declarations

`backend/docker/compose.local.yml` and `frontend/docker/compose.local.yml` may both declare:

```text
api
postgres
redis
flyway
```

This is intentional but still a maintenance cost.

---

#### Adding a backend dependency requires multiple file updates

If the backend later adds a new dependency such as:

```text
minio
meilisearch
localstack
```

then each concrete local Compose file that launches `api` must also declare that new dependency.

For example, both files may need to add:

```yaml
minio:
  extends:
    file: ../../infra/compose/common-services.yml
    service: minio-base
```

This is the main tradeoff of avoiding `include:`.

---

#### Different project names can duplicate infrastructure

Backend and frontend stacks use different project names by default.

This means the frontend stack may start its own:

```text
api
postgres
redis
flyway
```

instead of reusing the backend stack.

This is intentional for stack independence, but it means:

- more containers;
- more disk usage;
- separate database volumes;
- separate Redis volumes;
- possible host port conflicts if both stacks expose the same ports.

---

#### Host port conflicts need to be managed

Because backend and frontend stacks may run at the same time, their exposed host ports must not conflict.

This should be handled through component-specific `.env.example` defaults.

Backend can use conventional ports:

```text
8080
5432
6379
```

Frontend can use alternative ports or avoid exposing backend dependency ports.

---

#### Commands are more namespaced

Instead of a flat command like:

```bash
just up
```

the canonical command may become:

```bash
just docker up
```

from the backend directory, or:

```bash
just backend docker up
```

from the repository root.

This is accepted because the namespacing makes ownership clear.

Optional wrapper recipes may be added later if needed.

---

## 8. Alternatives Considered

### 8.1 Keep all Compose files under `infra/compose/`

Rejected for local component workflows.

Pros:

- Centralized infrastructure location.
- Easy to find all Compose files in one place.

Cons:

- Backend and frontend local workflows become coupled to a central folder.
- Frontend developers may need to understand project-level Compose organization.
- Harder to give each component a clear local Docker entrypoint.

---

### 8.2 Use Compose `include:`

Rejected for normal local workflows.

Pros:

- Can reduce repeated service declarations.
- Can compose project-level stacks from component-level files.

Cons:

- Hides part of the launched stack.
- Makes the concrete local file less self-explanatory.
- Violates the goal that `compose.local.yml` should visibly declare what is launched.

---

### 8.3 Use multiple Compose files with `-f a.yml -f b.yml`

Rejected for normal local workflows.

Pros:

- Powerful and standard Compose overlay mechanism.
- Useful for advanced overrides.

Cons:

- File order matters.
- Relative paths become less obvious.
- Developers must understand the final merged model.
- Violates the goal of a single obvious local stack file.

---

### 8.4 Use `just import`

Rejected for Docker workflow reuse.

Pros:

- Shared recipes can be reused without namespacing.
- Commands can stay flat.

Cons:

- Imported recipes run from the importing/root justfile directory.
- This makes Docker module paths less clear.
- `.env`, Compose file, Dockerfile, and helper script resolution can become surprising.

Accepted alternatives:

```text
just mod
wrapper recipes that invoke another justfile explicitly
```

---

### 8.5 Put backend Docker files under `backend/compose/`

Rejected in favor of `backend/docker/`.

Pros:

- Clear that the main local file is Compose-based.

Cons:

- The folder may also contain `Dockerfile`, `.env`, and Docker scripts.
- `compose/` becomes too narrow as a folder name.

`backend/docker/` better represents the component’s containerization module.

---

### 8.6 Use one shared Compose project name for backend and frontend

Rejected.

Pros:

- Backend and frontend could theoretically manage the same Compose project identity.
- Service names and volumes could be shared.

Cons:

- Switching between component Compose files may cause unwanted service recreation.
- Service definitions may differ slightly between backend and frontend files.
- It becomes unclear which component owns the running stack.
- Explicit service names conflict more easily.
- It discourages independent frontend and backend local stacks.

Instead, backend and frontend should use different Compose project names by default.

---

## 9. Validation Strategy

Add CI checks that validate resolved Compose files.

Example backend validation:

```bash
cd backend/docker
cp .env.example .env
docker compose --env-file .env -f compose.local.yml --profile backend --profile jetbrains config --quiet
```

When frontend Docker support exists:

```bash
cd frontend/docker
cp .env.example .env
docker compose --env-file .env -f compose.local.yml config --quiet
```

If production Compose remains under `infra/compose`, validate it separately:

```bash
cd infra/compose
cp .env.example .env
docker compose --env-file .env -f compose.prod.yml config --quiet
```

The validation should catch cases where:

- a concrete Compose file forgets to declare a service referenced by `depends_on`;
- a top-level network or volume is missing;
- a shared base service in `common-services.yml` is invalid;
- required environment variables are missing;
- service extension paths are wrong after file moves.

---

## 10. Migration Plan

### Step 1: Create backend Docker module

Create:

```text
backend/docker/
```

Move or create:

```text
backend/docker/compose.local.yml
backend/docker/justfile
backend/docker/.env.example
```

Move backend `Dockerfile` to:

```text
backend/docker/Dockerfile
```

if desired.

Keep:

```text
backend/.dockerignore
```

at backend root.

---

### Step 2: Update build paths

If `Dockerfile` moves to `backend/docker/Dockerfile`, update Compose build definitions to use:

```yaml
build:
  context: ..
  dockerfile: docker/Dockerfile
```

---

### Step 3: Refactor shared service bases

Refactor:

```text
infra/compose/common-services.yml
```

to keep the common service bases that are actually shared.

Expected shared bases:

```text
api-compose-base
postgres-base
redis-base
flyway-base
```

`api-compose-base` should be kept.

It should contain shared API runtime contract settings such as:

```text
depends_on
Spring datasource environment variables
Redis environment variables
network membership
```

Avoid or remove API variant bases unless they have real reuse:

```text
api-local-gradle-base
api-local-jb-base
api-prod-base
```

These variant bases may be kept only if used by more than one concrete service or Compose file.

The practical migration rule is:

```text
Keep:
  api-compose-base
  postgres-base
  redis-base
  flyway-base

Inline unless reused:
  api-local-gradle-base
  api-local-jb-base
  api-prod-base
```

---

### Step 4: Add backend Just module

Create:

```text
backend/docker/justfile
```

with Docker/Compose recipes.

Update:

```text
backend/justfile
```

to use:

```just
mod docker 'docker/justfile'
```

Update root `justfile` as needed:

```just
mod backend 'backend/justfile'
```

---

### Step 5: Remove explicit `container_name`

Remove explicit `container_name` from shared and concrete Compose services.

Allow Compose to generate project-scoped container names.

---

### Step 6: Use different project names

Set backend default project name in:

```text
backend/docker/compose.local.yml
```

to:

```yaml
name: ${COMPOSE_PROJECT_NAME:-nijigen-video-site-backend}
```

When frontend Docker support is added, set frontend default project name to:

```yaml
name: ${COMPOSE_PROJECT_NAME:-nijigen-video-site-frontend}
```

---

### Step 7: Validate backend local workflow

Check:

```bash
cd backend
just docker config
just docker up
just docker up-backend
just docker run --rm api :apps:api:test
just docker run --rm api :apps:api:nativeTest
just docker down
```

Also verify direct Compose usage:

```bash
cd backend/docker
docker compose --env-file .env -f compose.local.yml up -d
docker compose --env-file .env -f compose.local.yml --profile backend up -d
docker compose --env-file .env -f compose.local.yml run --rm api :apps:api:test
```

---

### Step 8: Add frontend Docker module later

When frontend implementation is ready, create:

```text
frontend/docker/compose.local.yml
frontend/docker/justfile
frontend/docker/.env.example
frontend/justfile
```

Use the same principles:

- explicitly declare all launched services;
- avoid `include:`;
- avoid normal multi-`-f` workflows;
- avoid `just import`;
- use `mod` or wrapper recipes;
- use a frontend-specific Compose project name;
- avoid explicit `container_name`.

---

## 11. Open Questions

### 11.1 Should convenience wrapper recipes be added?

Possible backend wrapper recipes:

```just
# backend/justfile

mod docker 'docker/justfile'

up *args:
  just --justfile docker/justfile up {{args}}

run *args:
  just --justfile docker/justfile run {{args}}
```

This would allow:

```bash
just up
just run --rm api :apps:api:test
```

But it also hides the fact that Docker commands live under the Docker module.

Initial recommendation:

> Do not add wrapper aliases yet. Start with explicit `just docker ...` commands.

---

### 11.2 Should JetBrains use `api-jb` forever?

`api-jb` exists to support JetBrains tooling.

It should be placed behind a JetBrains-only profile such as:

```text
jetbrains
```

Normal Just recipes and normal developer workflows should not use it.

If JetBrains works correctly with the normal `api` service, `api-jb` can be removed later.

If JetBrains requires a long-running dummy service, keep `api-jb`.

---

### 11.3 Should frontend expose backend dependency ports?

The frontend stack may not need to expose Postgres or Redis to the host.

If frontend developers only interact with:

```text
frontend
api
```

then the frontend Compose file can avoid host port mappings for:

```text
postgres
redis
```

This reduces conflicts when backend and frontend stacks run at the same time.

---

### 11.4 When should API variant bases be extracted?

`api-compose-base` is required and should be kept.

The open question is not whether shared API configuration should be extracted. It should.

The open question is when to extract more specific API variant bases, such as:

```text
api-local-gradle-base
api-local-jb-base
api-prod-base
```

Initial rule:

> Extract a variant base only when it is used by more than one concrete service or Compose file.

Examples:

`api-local-gradle-base` may be extracted if both backend and frontend local stacks use the same source-mounted Gradle-based API definition.

`api-local-jb-base` may be extracted if multiple JetBrains-oriented service definitions need the same dummy service shape.

`api-prod-base` may be extracted if multiple production-like Compose files use the same Dockerfile build/runtime configuration.

If a variant is used only once, keep it inline in the concrete Compose file.

---

## 12. Final Decision Summary

We will adopt component-owned Docker modules.

The backend module will be:

```text
backend/docker/
```

It will contain the backend local Compose file, backend Dockerfile, backend Docker `.env` files, and backend Docker Just recipes.

Shared service definitions remain centralized in:

```text
infra/compose/common-services.yml
```

but only genuinely common service definitions should be extracted there.

Concrete local Compose files explicitly declare all services they launch.

Normal local workflows will avoid:

```text
Compose include
Compose multi-file override stacks
just import
```

For Just command composition, accepted approaches are:

```text
mod
wrapper recipes that call another justfile explicitly
```

Backend and frontend local stacks should use different Compose project names.

Explicit `container_name` should be removed to allow Compose-generated names, replicas, and independent local stacks.

This design favors developer clarity, predictable working-directory behavior, and component ownership over minimizing every repeated Compose service declaration.
