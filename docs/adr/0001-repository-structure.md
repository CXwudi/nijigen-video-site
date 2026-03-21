# ADR-001: Repository Structure and Workspace Layout

- **Status:** Accepted
- **Date:** 2026-03-20

## Context

This project is a one-person practice project for a full-stack video site with danmaku support.

### Backend stack

- Spring Boot 4.x
- Java 25
- PostgreSQL
- Redis
- RustFS
- Flyway
- AutoMQ
- LGTM stack
- Spring Security for now
- Envoy API Gateway and Ory are planned for the future

### Frontend stack

- TanStack Start
- React
- pnpm

### Constraints and preferences

- Flyway must run **standalone** and must **not** be managed by Spring Boot.
- The system should run in Docker Compose now and remain easy to move to Kubernetes later.
- `apps/worker` is highly likely to be needed and should be reserved now.
- Frontend and backend should have their own roots.
- Gradle and pnpm control files should **not** live in the repository root.
- The product scope is intentionally simplified, but the infrastructure and stack should remain realistic.

## Decision

We will use a **split-root monorepo**.

- `backend/` is the Gradle root for all JVM code.
- `frontend/` is the pnpm workspace root for all Node/React code.
- `database/flyway/` is the standalone migration root.
- `infra/` contains deployment and operations assets.
- The repository root remains lightweight and does not contain Gradle or pnpm control files.

## Architecture shape

This project will **not** start as microservices.

Instead, the backend will use a **modular monolith with multiple runtime entrypoints**:

- `backend/apps/api` for synchronous HTTP-facing application logic
- `backend/apps/worker` for asynchronous and background processing
- `backend/modules/*` for reusable shared business modules

This gives us separate deployables without premature service fragmentation.

## Frontend workspace design

The frontend is intentionally organized as a **pnpm workspace root** plus one actual application package.

This means the following files have different jobs and are **not duplicates**:

| Path | Role |
| --- | --- |
| `frontend/pnpm-workspace.yaml` | Declares the pnpm workspace root and tells pnpm which packages belong to the workspace |
| `frontend/package.json` | Thin workspace-root manifest used for frontend-wide scripts and workspace-level metadata; this is **not** another app |
| `frontend/apps/web/package.json` | The manifest of the actual TanStack Start web application |

### Why `frontend/pnpm-workspace.yaml` exists

This file marks `frontend/` as the pnpm workspace root.

Its purpose is to define which package directories pnpm should treat as members of the workspace.

Example:

```yaml
packages:
  - apps/*
```

This means pnpm should treat `frontend/apps/web` as a workspace package.

### Why `frontend/package.json` exists

The root `frontend/package.json` is a **workspace control file**, not a second frontend application.

It exists so that we can:

- run frontend-wide scripts from `frontend/`
- keep workspace-level metadata in one place
- avoid needing to `cd frontend/apps/web` for common commands
- add future shared frontend packages later without changing the workspace shape

Typical use for this file:

- `dev`
- `build`
- `lint`
- `typecheck`

This file should stay **thin**.

It should **not** become another app and should **not** duplicate the real application's runtime dependencies.

### Why `frontend/apps/web/package.json` exists

This is the manifest for the actual web app.

It owns:

- TanStack Start dependencies
- React dependencies
- app-specific scripts
- app-specific build configuration
- app-level metadata

In other words:

- `frontend/package.json` = workspace control
- `frontend/apps/web/package.json` = real web app package

### Why we keep a workspace even with one frontend app

Even though there is only one frontend app today, the workspace structure is still useful because this project may later need frontend-side shared packages such as:

- a generated TypeScript SDK
- a shared UI package
- frontend-only utilities

We are **not** creating those packages yet, but the workspace layout avoids a future repo restructure.

### Simplification rule

If the frontend permanently remains a single app with no shared frontend packages, we may simplify later by collapsing the workspace.

That is **not** the accepted structure today.

Today, the accepted decision is to keep:

- `frontend/pnpm-workspace.yaml`
- `frontend/package.json`
- `frontend/apps/web/package.json`

## Backend build layout

The backend follows the same general idea, but in Gradle terms.

| Path | Role |
| --- | --- |
| `backend/settings.gradle.kts` | Declares the Gradle build root and includes backend subprojects |
| `backend/build.gradle.kts` | Shared backend build configuration |
| `backend/apps/api/build.gradle.kts` | API application module build |
| `backend/apps/worker/build.gradle.kts` | Worker application module build |
| `backend/modules/*/build.gradle.kts` | Shared feature module builds |

This means:

- `backend/` is the backend build root
- `backend/apps/*` are deployable applications
- `backend/modules/*` are reusable shared modules

## Repository layout

```text
video-site/
├─ backend/
│  ├─ settings.gradle.kts
│  ├─ build.gradle.kts
│  ├─ gradlew
│  ├─ gradlew.bat
│  ├─ gradle/
│  ├─ apps/
│  │  ├─ api/
│  │  │  ├─ build.gradle.kts
│  │  │  ├─ Dockerfile
│  │  │  └─ src/
│  │  └─ worker/
│  │     ├─ build.gradle.kts
│  │     ├─ Dockerfile
│  │     └─ src/
│  ├─ modules/
│  │  ├─ common/
│  │  ├─ auth/
│  │  ├─ video/
│  │  ├─ media/
│  │  ├─ danmaku/
│  │  └─ testkit/
│  ├─ contracts/
│  │  ├─ openapi/
│  │  └─ events/
│  └─ README.md
├─ frontend/
│  ├─ pnpm-workspace.yaml
│  ├─ package.json
│  ├─ pnpm-lock.yaml
│  ├─ apps/
│  │  └─ web/
│  │     ├─ package.json
│  │     ├─ Dockerfile
│  │     └─ src/
│  └─ README.md
├─ database/
│  └─ flyway/
│     ├─ conf/
│     ├─ sql/
│     ├─ callbacks/
│     └─ README.md
├─ infra/
│  ├─ compose/
│  ├─ k8s/
│  ├─ observability/
│  ├─ gateway/
│  │  └─ envoy/
│  └─ auth/
│     └─ ory/
├─ docs/
│  ├─ adr/
│  ├─ domain/
│  ├─ api/
│  └─ deployment/
├─ scripts/
├─ Makefile
├─ .env.example
├─ .gitignore
└─ README.md
```

## Responsibilities by area

### `backend/apps/api`

Owns:

- HTTP API
- request/response DTOs
- Spring Security integration
- synchronous application flows
- request-driven danmaku endpoints and transport adapters

Does **not** own:

- long-running background jobs
- message consumption loops
- retry orchestration
- periodic cleanup or reconciliation jobs

### `backend/apps/worker`

Owns:

- AutoMQ consumers
- background processing
- retries and dead-letter handling
- scheduled cleanup, reconciliation, and backfill jobs
- future async media and danmaku workflows

`apps/worker` is reserved **now** as a real application module, even if the initial implementation is minimal.

### `backend/modules/*`

Own reusable domain/application/infrastructure code shared by `api` and `worker`.

These modules are organized **by feature**, not by global technical layer.

Examples:

- `modules/video`
- `modules/media`
- `modules/danmaku`

We explicitly avoid a backend root organized as:

- `controller/`
- `service/`
- `repository/`
- `entity/`

That style tends to become hard to maintain as the project grows.

### `frontend/apps/web`

Owns the TanStack Start web application.

Recommended internal organization:

- `src/routes` for route entry points
- `src/features` for product/domain UI logic
- `src/components` for reusable UI
- `src/lib` for API clients, environment helpers, and utilities

## Database migration policy

Flyway is **standalone** and is **not managed by Spring Boot**.

Rules:

- SQL migrations live under `database/flyway/`
- Spring Boot applications must **not** execute Flyway migrations at startup
- migrations are executed explicitly through Compose, CI, or a Kubernetes Job

If Hibernate/JPA is used, schema mutation must remain disabled at runtime. Application startup should validate schema compatibility instead of creating or modifying schema.

Example Spring configuration:

```yaml
spring:
  flyway:
    enabled: false

  jpa:
    hibernate:
      ddl-auto: validate
```

> If JPA/Hibernate is not used for a given module, the equivalent rule still applies: application code must not own schema migration.

## Deployment policy

### Docker Compose

Docker Compose is the first-class local deployment target.

Expected services include:

- postgres
- redis
- rustfs
- automq
- flyway migration runner
- api
- worker
- web
- LGTM-related services as needed

### Kubernetes

Kubernetes is a future deployment target and the layout should remain compatible with it.

Expected mapping:

- `api` -> Deployment
- `worker` -> Deployment
- `web` -> Deployment
- `flyway` -> Job

## Future additions

The following are planned but do not need to be fully materialized immediately:

- `infra/gateway/envoy` for Envoy API Gateway
- `infra/auth/ory` for Ory-based authentication and authorization

These should be added when implementation starts, rather than creating large empty structures too early.

If the frontend later needs shared packages, they should be added under `frontend/packages/`, but that directory does **not** need to exist before there is an actual package to place there.

## Rationale

This structure was chosen because it gives us:

1. clear separation between backend and frontend tooling
2. a clean repository root without mixed ecosystem build files
3. standalone, explicit database migration ownership
4. a reserved worker runtime without forcing microservices too early
5. reusable backend feature modules shared between API and worker
6. a clear and intentional pnpm workspace layout
7. a straightforward path from local Compose to future Kubernetes deployment
8. enough realism for practice without unnecessary operational complexity

## Consequences

### Positive

- tooling boundaries are easy to understand
- backend shared code stays in one place
- async workloads have a proper home from day one
- Flyway ownership is explicit and operationally clean
- the frontend workspace is ready for future shared packages
- the meaning of root vs app-level pnpm files is explicit

### Negative

- the repository has slightly more nesting than a flat root-level monorepo
- the frontend has both a workspace root manifest and an app manifest, which must be understood correctly
- shared contracts and generated SDKs require deliberate coordination across `backend/` and `frontend/`
- Docker build contexts must be configured carefully because the build roots are not at the repository root

## Non-goals

At this stage, we are **not**:

- splitting the backend into multiple microservices
- allowing Spring Boot to own schema migrations
- putting Gradle or pnpm control files at the repository root
- treating `frontend/package.json` as a second frontend app
- creating large empty future-only modules unless there is a near-term implementation reason

## Implementation notes

- Start with `backend/apps/api`, `backend/apps/worker`, and `frontend/apps/web`
- Keep `apps/worker` minimal at first, but present
- Keep Flyway configuration and SQL migrations under `database/flyway`
- Keep `frontend/package.json` thin and workspace-oriented
- Put actual web-app dependencies in `frontend/apps/web/package.json`
- Add `frontend/packages/*` only when a real shared frontend package exists
- Keep the repo root focused on project-level documentation and orchestration only

## Status summary

This decision is accepted and will be used as the baseline repository structure for the project.
