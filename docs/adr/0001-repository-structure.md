# ADR-001: Project Structure Baseline

- **Status:** Accepted
- **Date:** 2026-03-21

## Why this file exists

This project is a one-person practice project, but the stack is intentionally realistic:

- Spring Boot 4.x
- Java 25
- Spring JDBC
- PostgreSQL
- Redis
- RustFS
- Flyway
- AutoMQ
- LGTM stack
- TanStack Start + React

Even though the feature scope is reduced, I still want the project structure to feel like a real production-shaped system.

This document records the repo structure decision so I do not keep rethinking it later.

---

## The decision

We will use a **split-root monorepo**.

That means:

- `backend/` is the home of all JVM / Gradle code
- `frontend/` is the home of all Node / pnpm code
- `database/flyway/` is the home of standalone migrations
- `infra/` is the home of deployment and ops files
- the repo root stays clean and lightweight

I do **not** want Gradle and pnpm files mixed together in the repository root.

---

## What kind of backend this is

This project is **not** starting as microservices.

Instead, the backend is:

- one codebase
- shared feature modules
- two runtime entrypoints

Those two runtime apps are:

- `backend/apps/api`
- `backend/apps/worker`

So the shape is:

- **API app** for request/response work
- **Worker app** for async/background work
- **Shared modules** for reusable business logic

This keeps things realistic without overcomplicating a solo practice project.

---

## Final repo layout

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
│
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
│
├─ database/
│  └─ flyway/
│     ├─ conf/
│     ├─ sql/
│     ├─ callbacks/
│     └─ README.md
│
├─ infra/
│  ├─ compose/
│  ├─ k8s/
│  ├─ observability/
│  ├─ gateway/
│  │  └─ envoy/
│  └─ auth/
│     └─ ory/
│
├─ docs/
│  ├─ adr/
│  ├─ domain/
│  ├─ api/
│  └─ deployment/
│
├─ scripts/
├─ Makefile
├─ .env.example
├─ .gitignore
└─ README.md
```

---

## Why this structure feels right for this project

### 1. Backend and frontend live in their own worlds

I do not want:

- Gradle files at repo root
- pnpm files at repo root
- mixed Java and Node setup in the same top-level workspace

Keeping `backend/` and `frontend/` separate makes the project easier to reason about.

When I work on backend stuff, I stay in `backend/`.

When I work on frontend stuff, I stay in `frontend/`.

That is simple and clean.

---

### 2. `worker` is reserved now, not later

`backend/apps/worker` is included from the beginning because it is very likely this project will need it.

Examples:

- AutoMQ consumers
- retries
- cleanup jobs
- async media tasks
- danmaku-related background processing
- reconciliation or backfill tasks

I would rather reserve this now than do a repo reshape later.

The worker can start minimal, but it should exist as a real app.

---

### 3. Shared backend logic should not live inside the API app

If both `api` and `worker` need business logic, that logic should live in `backend/modules/*`, not be trapped inside `backend/apps/api`.

That is why there is a `modules/` directory.

Examples:

- `modules/video`
- `modules/media`
- `modules/danmaku`

This is the main thing that keeps the project from turning messy once the worker becomes real.

---

### 4. Flyway should stay truly standalone

Flyway is **not** owned by Spring Boot in this project.

Migrations live under:

```text
database/flyway/
```

not inside the Spring app resources.

This is intentional.

The application should depend on the schema being there, but it should **not** be the thing that creates or migrates it during startup.

---

## Frontend workspace: why there are multiple pnpm files

This part is easy to misunderstand, so here is the rule.

The frontend uses a **pnpm workspace layout**, even though there is only one app right now.

That means these files have different roles:

### `frontend/pnpm-workspace.yaml`

This defines the pnpm workspace itself.

It tells pnpm which packages belong to the frontend workspace.

Example:

```yaml
packages:
  - apps/*
```

That tells pnpm that `frontend/apps/web` is part of the workspace.

---

### `frontend/package.json`

This is **not** a second frontend app.

It is just the **workspace root package**.

Its job is to hold:

- frontend-wide scripts
- lightweight workspace metadata
- commands I want to run from `frontend/`

For example, this file might contain scripts like:

- `dev`
- `build`
- `lint`
- `typecheck`

This file should stay **thin**.

It should not become a second application and should not duplicate the app’s real dependencies.

---

### `frontend/apps/web/package.json`

This is the **actual web app package**.

This is where the real app dependencies live:

- TanStack Start
- React
- app-specific scripts
- app-specific build config

So the mental model is:

- `frontend/pnpm-workspace.yaml` = defines the workspace
- `frontend/package.json` = controls the frontend workspace
- `frontend/apps/web/package.json` = the actual app

---

### Why keep the workspace if there is only one app?

Because there is a good chance I will want one or more of these later:

- generated TypeScript SDK
- shared UI package
- frontend utilities shared across packages

I do **not** need to create those now.

But keeping the workspace structure now avoids another restructure later.

If the frontend stays permanently tiny, I can simplify it later.  
But for now, the workspace stays.

---

## Backend layout

The backend has three levels:

### `backend/apps/api`

This is the synchronous app.

It owns things like:

- HTTP endpoints
- request/response DTOs
- Spring Security integration
- request-driven danmaku endpoints
- normal application entrypoints

It should **not** become the place for every background or async concern.

---

### `backend/apps/worker`

This is the async/background app.

It owns things like:

- AutoMQ consumers
- retry flows
- cleanup jobs
- scheduled tasks
- future async media workflows
- future danmaku background workflows

This app can start small, but it exists on purpose.

---

### `backend/modules/*`

This is where reusable backend logic lives.

The modules are organized by **feature**, not by generic technical folders.

Good examples:

- `modules/auth`
- `modules/video`
- `modules/media`
- `modules/danmaku`

I do **not** want the classic structure like:

```text
controller/
service/
repository/
entity/
```

That usually looks simple at first and gets ugly later.

Feature-based modules are a better fit here.

---

## Data access decision

This project uses **Spring JDBC**, not JPA/Hibernate.

That means:

- SQL is written explicitly
- data access is intentional
- schema is managed separately through Flyway
- there is no ORM-driven schema generation
- domain design should not depend on JPA annotations or JPA lifecycle behavior

This matches the style I want for this project:

- simpler persistence mental model
- fewer ORM surprises
- tighter control over SQL and schema

---

## Database migration policy

Flyway is **standalone**.

Rules:

- migrations live in `database/flyway/`
- Spring Boot must **not** run Flyway automatically at app startup
- schema changes are executed explicitly
- Docker Compose / CI / Kubernetes Job can run migrations
- application code must not auto-manage schema

Example config:

```yaml
spring:
  flyway:
    enabled: false
```

Because this project uses Spring JDBC, schema ownership belongs fully to Flyway.

---

## Deployment policy

### Docker Compose first

Docker Compose is the main local deployment target.

Expected services:

- postgres
- redis
- rustfs
- automq
- flyway runner
- api
- worker
- web
- LGTM-related services

---

### Kubernetes later

Kubernetes is not the first target, but the layout should make that move straightforward.

Expected mapping:

- `api` -> Deployment
- `worker` -> Deployment
- `web` -> Deployment
- `flyway` -> Job

---

## Future things that are expected, but not urgent

These are likely later additions:

- `infra/gateway/envoy`
- `infra/auth/ory`

They are part of the long-term direction, but I do not need to overbuild them right now.

Also, if I later need shared frontend packages, they should go under:

```text
frontend/packages/
```

But I do not need to create that folder until there is a real package to put there.

---

## Things I am deliberately not doing

Right now, I am **not** doing these things:

- splitting into microservices
- putting Gradle files in the repo root
- putting pnpm files in the repo root
- letting Spring Boot own Flyway migrations
- using JPA/Hibernate
- creating a huge number of empty future-only modules
- treating `frontend/package.json` as another app

This project is supposed to be realistic, not overengineered.

---

## Why this is a good fit for a solo practice project

This structure gives me:

- realistic separation of concerns
- room for async/backend growth
- explicit DB migration ownership
- clear frontend/backend boundaries
- a clean repo root
- a place for future infrastructure without forcing it too early

It is more structured than a tiny demo repo, but still much simpler than a full-blown microservice platform.

That is exactly the balance I want.

---

## Final summary

This repository will use:

- a **split-root monorepo**
- a **Gradle-rooted backend** under `backend/`
- a **pnpm-rooted frontend workspace** under `frontend/`
- a **standalone Flyway setup** under `database/flyway/`
- a **modular backend** with:
  - `backend/apps/api`
  - `backend/apps/worker`
  - `backend/modules/*`

This is the baseline structure for the project unless there is a strong reason to change it later.