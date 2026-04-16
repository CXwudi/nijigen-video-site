# ADR-003: Compose-First Container Build Workflow for Backend Apps

- **Status:** Accepted
- **Date:** 2026-04-16

## Why this file exists

The repository now has an initial backend container workflow in place:

- a Gradle multi-project backend workspace under `backend/`
- one deployable backend app at `backend/apps/api`
- one multi-stage Dockerfile for that app
- Compose files under `infra/compose/`
- a `justfile`-driven operator workflow

At the same time, the repo is expected to grow into a more realistic monorepo
shape over time. ADR-001 already reserved a future `backend/apps/worker`, and it
is reasonable to expect more deployable images later.

This ADR records the container-build direction so we do not prematurely add a
separate build orchestration layer or split the Docker layout before the repo
actually needs it.

---

## Context

The current backend image setup is small but production-shaped:

- `backend/apps/api/Dockerfile` already contains a shared `gradle-base` stage
- that Dockerfile produces both `jvm-runtime` and `native-runtime` targets
- Compose currently selects targets for development and production use cases
- CI verification already runs through Compose-oriented commands

A few questions came up while reviewing this setup:

1. Should JVM and native runtime move to separate Dockerfiles?
2. Should the build base be split into JVM-specific and native-specific builder
   stages?
3. Should Docker Bake be introduced now for image build orchestration?
4. Should production remain source-build oriented for now, or should the repo
   immediately move to a release-image-first model?

The main constraint is that the repo does **not** yet have a large image build
matrix. Today there is effectively one real deployable backend image path, with
multiple runtime targets but not multiple regularly-published app images.

---

## The decision

We will keep the backend container workflow **Compose-first** for now.

More specifically:

1. For a backend app family, we will keep **one multi-stage Dockerfile** that
   can produce both JVM and native runtime outputs.
2. We will keep the shared builder setup as a single **`gradle-base`** stage
   unless a real toolchain divergence appears later.
3. We will continue to use **Docker Compose** to describe runnable stacks and
   select build targets where appropriate.
4. We will continue to use the **`justfile`** as the human-facing command layer
   for development, verification, and operational workflows.
5. We will **not** introduce Docker Bake yet.
6. We will revisit Bake only when image building becomes a real matrix/release
   orchestration problem rather than a simple local or CI build concern.

---

## What this means in practice

### One Dockerfile for JVM and native is the default

JVM and native are treated as two packaging/runtime variants of the same app,
not as two unrelated container workflows.

That means the preferred shape is:

- one app-family Dockerfile
- shared setup near the top
- named targets such as `gradle-base`, `jvm-runtime`, and `native-runtime`

We do **not** split into separate `Dockerfile.jvm` and `Dockerfile.native`
files unless the flows diverge enough that the split reduces complexity instead
of increasing duplication.

### `gradle-base` stays unified

The current shared Gradle stage is acceptable.

We do **not** need separate `gradle-jvm-base` and `gradle-native-base` stages
just for conceptual neatness. If later the native path needs a materially
different toolchain, package set, or maintenance boundary, that can be revisited.

### Compose remains the runtime orchestration layer

Compose is the source of truth for:

- which services run together
- environment wiring
- service dependencies
- volumes and ports
- environment-specific stack behavior

This is especially appropriate because the repo currently has support services
such as PostgreSQL, Redis, and Flyway that are part of the same operational
story as the app container.

### `justfile` remains the operator/developer interface

The `justfile` should remain the primary command surface for common workflows,
for example:

- config checks
- local stack boot/down
- JVM verification
- native verification
- any simple image build helpers needed by the repo

This keeps Docker and Compose details out of day-to-day command usage without
introducing an additional orchestration layer too early.

---

## Why we are not adopting Bake yet

Docker Bake is useful, but it solves a build orchestration problem that this
repo does not really have yet.

Bake becomes much more compelling when one or more of the following become true:

- there are multiple deployable app images
- each app has multiple routinely-built variants
- CI publishes images to a registry as first-class release artifacts
- releases need multiple tags such as version, SHA, `latest`, `-jvm`, and
  `-native`
- multi-platform builds become required
- the `justfile` or CI pipeline starts duplicating build-matrix logic
- production shifts from source builds on the host to immutable prebuilt images

None of those pressures are strong enough yet to justify another layer of build
configuration.

For the current repo, introducing Bake now would mostly add:

- another file to maintain
- another abstraction to explain
- another place where image naming and target selection can drift

So the simpler approach wins for now.

---

## Alternatives considered

### 1. Split JVM and native into separate Dockerfiles

This was rejected for now.

Reason:

- it would duplicate shared setup
- it would increase maintenance cost
- the current multi-stage Dockerfile is still small enough to understand
- the build paths are variants of one app, not fully separate products

### 2. Introduce Docker Bake now

This was rejected for now.

Reason:

- the repo currently has too little build-matrix complexity
- Compose + `justfile` already covers the practical workflows well
- release-image publishing is not yet the dominant operational model

### 3. Move to one giant repo-wide Dockerfile for all future apps

This was rejected as a default strategy.

Reason:

- it would centralize too much unrelated build logic
- app-specific branches would accumulate over time
- the resulting file would likely become harder to maintain than either a
  reusable per-family Dockerfile or thin per-app Dockerfiles

---

## Consequences

### Positive

- container build logic stays simple and easy to understand
- JVM and native variants remain close together and avoid duplication
- Compose continues to model the real runtime stack directly
- the repo avoids premature tooling and abstraction growth
- the future remains flexible: Bake can still be introduced later behind the
  same `justfile` UX if the repo grows into it

### Negative / tradeoffs

- release-image orchestration remains comparatively manual for now
- if the repo starts publishing many image variants, the current approach will
  eventually become awkward
- if production later moves to an immutable-image model, Compose-only build
  wiring may no longer be the cleanest release setup

These tradeoffs are acceptable at the current repo size.

---

## Triggers to revisit this ADR

Revisit this decision when any of the following happen:

1. `backend/apps/worker` becomes a real deployable container image
2. more deployable backend or frontend app images are added
3. CI starts pushing versioned images to a registry
4. multi-architecture image publishing becomes a requirement
5. the `justfile` begins to mirror a build matrix instead of remaining a thin UX
   wrapper
6. production deployment shifts to prebuilt immutable images instead of source
   builds on the deploy host

If at least several of those become true at once, Docker Bake should be
reconsidered as the release-build orchestration layer.

---

## Bottom line

For the current state of `nijigen-video-site`:

- keep one multi-stage Dockerfile per backend app family
- keep JVM and native targets in that one Dockerfile
- keep the shared `gradle-base`
- keep Compose for stack orchestration
- keep `justfile` for workflow ergonomics
- defer Docker Bake until release/build complexity actually justifies it
