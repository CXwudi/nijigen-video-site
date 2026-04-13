# Docker Compose Setup Design Spec

## Problem or Goal

Issue `#8` needs an initial Docker Compose setup for local development,
containerized debugging, backend CI verification, and production-oriented
runtime packaging.

The setup must:

- live under `infra/compose/`
- follow the shared service deployment standard closely enough to stay
  recognizable, while allowing the repository to use a shared
  `common-services.yml` plus explicit environment-specific Compose entry files
- support the current backend stack around `apps/api`, PostgreSQL, Redis, and
  Flyway
- support native image as the default build, verification, and production
  runtime path
- keep JVM and jar flows available as alternative paths for debugging, fast
  feedback, and operational fallback
- allow backend verification to run through Compose both locally and in GitHub
  Actions
- support two developer workflows:
  - container-first JVM debugging as the default developer experience
  - host or WSL-based application launch with localhost port forwarding as a
    fallback when IDE or Docker integration becomes unreliable

The design also needs to settle the open questions from the issue about whether
to introduce extra override files, where Flyway assets should live, where the
API Dockerfile should live, how CI should differ from local development, and how
native and JVM artifact paths should coexist.

## Context

The repository is a split-root project with backend code under `backend/` and a
reference area under `ref/` for plans and specs. The backend currently contains
an early Spring Boot `apps/api` app, and its shared backend plugin already
applies the GraalVM Native Build Tools plugin. That means the API module already
exposes native-oriented Gradle tasks such as `nativeCompile`,
`nativeTestCompile`, and `nativeTest`.

The issue originally asked for these four services in the base Compose model:

- `api`
- `postgres`
- `redis`
- `flyway`

During brainstorming, the desired runtime and verification model became clearer:

- containerized application debugging should be the default local workflow, but
  it should stay JVM-based because native image debugging is a rougher and less
  familiar developer experience
- developers must still be able to run the API directly from WSL or the host
  against localhost-forwarded infra when IntelliJ, Docker Desktop, or WSL
  integration is acting up
- native build and native test should become the default verification path in
  local verification and CI because the intended deployment artifact is a native
  executable
- JVM compilation should remain a required alternative verification lane in CI,
  but as a compile-health check rather than a second full test lane

The current host environment also does not guarantee a GraalVM distribution with
`native-image` installed. That makes a containerized GraalVM-capable build
environment part of the design, not just a convenience.

This means the Compose design is not only a deployment artifact. It must also
act as a development, verification, and packaging boundary.

## Design Options

### Option 1: JVM development with native-default verify and production

Keep the deployment-standard ideas, but express them with a shared service
library plus explicit environment files:

- `common-services.yml` defines reusable service templates for the shared API
  shape and the shared support services
- `compose.dev.yml` turns that service library into the normal developer
  environment with fixed localhost ports plus explicit `api-debug` and `api-jb`
  services
- `compose.ci.yml` adds CI-specific verification services without carrying over
  local-only ports, debugger flags, or developer bind mounts
- `compose.prod.yml` carries deployment-oriented overrides and defaults the API
  runtime to the native executable while keeping a JVM runtime alternative
  available

In this model, local development defaults to running the API in Compose on the
JVM with a stable debug port, while host or WSL execution remains available by
starting the local infra stack and connecting to published database and cache
ports.

The CI verification commands run through Compose-managed services defined only
in the CI layer. This keeps the environment-specific files explicit about what
they launch while still making both native verification and the JVM
compile-health check Compose-native.

### Option 2: JVM-first everywhere

Keep Compose centered around the JVM path everywhere. Developers debug on the
JVM, CI runs JVM-oriented compilation and tests by default, and production also
prefers a JVM runtime image. Native image support remains available, but it is
not the default path.

This is simpler from a local tooling perspective, but it does not match the goal
that deployment should default to a native executable. It also weakens the
feedback loop between CI and the final production artifact.

### Option 3: Native-first everywhere, including local debugging

Run the API, verification, and production all through native executables by
default, including the everyday local debugging path.

This is the most uniform option from an artifact perspective, but it creates a
much rougher local debugging story. It does not fit the accepted requirement to
preserve a practical JVM-based debugging loop for IntelliJ, Docker Compose, and
WSL workflows.

## Recommendation

Choose Option 1.

It preserves the strongest benefits from both sides of the discussion:

- the default local workflow is container-first, so the application runs in a
  Compose-managed environment by default while preserving JVM debugging
- the fallback local workflow remains available and officially supported
- native verification and production can be the default path without removing
  the JVM alternative path that developers still need day to day
- the deployment-standard layering stays recognizable
- CI gets a real Compose-native verification path that is different enough from
  local development to justify its own override file

This option also gives the cleanest answer to the issue's override-file
questions:

- use `compose.dev.yml` as the developer entry file
- add `compose.ci.yml` because CI has meaningful behavioral differences from
  development
- keep `common-services.yml` as the shared service library instead of a runnable
  environment file

## Proposed Design

### File Layout

The Compose setup should live under `infra/compose/` with a structure close to
the deployment standard:

```text
infra/
├─ compose/
│  ├─ .env.example
│  ├─ README.md
│  ├─ common-services.yml
│  ├─ compose.dev.yml
│  ├─ compose.ci.yml
│  ├─ compose.prod.yml
│  └─ justfile
└─ flyway/
   ├─ conf/
   └─ sql/
      ├─ baseline/
      └─ local/
```

The API Dockerfile should live at `backend/apps/api/Dockerfile`.

`infra/flyway/` is intentionally outside `infra/compose/` so migration assets
remain reusable and are not mixed with Compose control files.

### Dockerfile Placement

The API Dockerfile should live at `backend/apps/api/Dockerfile`.

Reasoning:

- it is application-specific build logic, not a generic infrastructure asset
- keeping it next to the app source makes ownership and maintenance clearer
- Compose can still reference it from the shared service definitions under
  `infra/compose/common-services.yml`

Because Docker Compose resolves relative paths from the file that defines the
service, the shared service file should use repository-root-relative build
settings consistently, such as a repo-root build context plus an explicit
Dockerfile path.

### Compose Layers

#### `common-services.yml`

This file should define the shared service library used by the environment
files. It should contain:

- `api-base`
- `postgres-base`
- `redis-base`
- `flyway-base`

The shared service file should own:

- common API environment values and dependency wiring
- shared support-service healthchecks and restart policies
- shared image or build definitions
- the baseline Flyway location

It should not be treated as a runnable entry point. Its job is reuse through
`extends`, not to define a complete environment on its own.

`flyway-base` should depend on PostgreSQL readiness using
`depends_on.condition: service_healthy`, and any service that requires the
database schema should in turn depend on Flyway completion when appropriate.

#### `compose.dev.yml`

This becomes the actual development entry file. It should do all of the
following:

- publish fixed host ports for developer access
- expose both `api-debug` and `api-jb` as explicit services that extend
  `api-base`
- keep PostgreSQL and Redis reachable from localhost for the fallback host or
  WSL workflow
- allow a local-only Flyway extension path for seed or fixture data when useful

The important design point is that `compose.dev.yml` must support two valid
local workflows with one environment file:

1. containerized debugging by enabling `api-debug` or `api-jb`
2. fallback: start infra through Compose, but run the API from WSL or the host
   against published PostgreSQL and Redis ports without enabling either API
   profile

This means local port publishing is not just for browser access. It is also the
escape hatch that keeps development unblocked when IDE-to-container integration
fails.

For planning purposes, the fallback workflow should be treated as an
infra-targeted local invocation rather than a second full-stack mode. In other
words, developers should be able to start only the needed support services such
as `postgres`, `redis`, and `flyway`, then launch `./gradlew bootRun` from WSL
or the host without enabling a containerized API profile.

Local verification should still use the CI stack rather than this local stack so
the native-default verification path stays aligned between local runs and CI.

#### `compose.ci.yml`

This file is justified and should exist.

Its job is not to redefine the full stack. Its job is to make the stack
non-interactive and verification-oriented. In practice it should:

It should be the Compose file used by both local verification runs and GitHub
Actions.

- add a Compose-managed JVM compile-oriented verification service, such as
  `backend-verify-jvm`
- add a Compose-managed native verification service, such as
  `backend-verify-native`
- remove or avoid local-only host port publishing
- avoid debugger flags and interactive developer assumptions
- keep CI execution deterministic and easy to tear down

The verification services should be started directly, relying on Compose to
bring up only the services they depend on. This avoids starting unrelated
services unnecessarily while keeping the required CI gates Compose-native.

This also means there is no need for a regular runtime `api` service in the CI
file. The environment file should explicitly declare only the verification
services plus the shared support services they need.

The default CI verification lanes should be:

- a JVM compile-health lane that compiles production and test code through
  `testClasses`
- a native verification lane that runs `nativeTest` and `nativeCompile`

The native lane needs both tasks because `nativeTest` validates the native test
binary, while `nativeCompile` validates the deployable main native binary.
Native verification is the default CI path. The JVM lane remains required, but
only as a compile-oriented alternative lane rather than a second full test lane.

#### `compose.prod.yml`

This file should hold deployment-oriented differences such as:

- production command or image target selection, defaulting to the native runtime
  target
- reverse-proxy or external-network integration
- removal of local-only published ports
- production-only environment variables and stricter requirements

`compose.prod.yml` should remain focused on deployment behavior rather than
developer convenience. The native runtime should be the default production
target, while a JVM runtime target can remain available as an explicit
alternative. The production `api` service should extend `api-base`.

### Compose Profiles

Docker Compose profiles can be useful in this design, but only as a complement
to the file-layering approach, not as a replacement for it.

Recommended profile use cases:

- optional developer tooling that should not start by default, such as future
  database or cache admin UIs
- opt-in local data seeding helpers if those become separate services instead of
  only extra Flyway locations
- one-off utility services that are useful to keep in the model but should not
  be part of the default startup path

Profiles are a good fit for switching between the two approved development API
services:

- `api-debug`
- `api-jb`

The fallback host or WSL workflow still shares the same development environment
shape. The difference is mainly whether one of the containerized API services is
enabled.

For that reason:

- keep core support services such as `postgres`, `redis`, and `flyway`
  unprofiled
- use profiles only for the optional dev API services
- model the host or WSL fallback as a targeted local invocation that starts only
  the support services
- reserve profiles for optional services rather than for the normal application
  path

Flyway should also remain unprofiled. In this design, schema migration is part
of the normal application and verification boot path rather than an optional
tool. If a future local-only seed or demo-data helper is introduced, that helper
may use a profile, but the core `flyway` migration service should not.

### Extra Local Override Files

Do not add extra override files such as `compose.dev.container.yml` or
`compose.dev.host.yml` at this stage.

Reasoning:

- the current difference between the two local workflows is operational, not
  structural
- extra local layers would increase the command matrix and complexity
- the fallback path can already be represented cleanly by targeting only the
  support services from `compose.dev.yml`

An extra local override should only be introduced later if the two local modes
develop materially different configuration, such as incompatible API commands,
different mounts, different required ports, or substantially different helper
services.

### API Artifact Strategy

The design should support a multi-stage API image so local and production
behavior can stay related without being identical.

The intended split is:

- a JVM development target with the tooling needed for local container-based
  debugging
- a JVM runtime target kept as an alternative packaging path
- one or more GraalVM-capable build targets used for native verification and
  native packaging
- a native runtime target used by the production override by default

The exact stage names can be chosen during implementation, but the design should
assume one shared Dockerfile with named targets rather than separate Dockerfiles
for JVM and native flows.

Stages that execute native Gradle tasks should use a GraalVM-capable container
image so local and CI native verification do not depend on the host having a
working GraalVM toolchain.

Jar packaging should remain available as an alternative path, but it does not
need to be a required CI gate.

### Backend Verification Services

Backend verification should run as Compose services, not as ad hoc host commands
in CI.

The verification services should:

- run from Java and Gradle-capable image targets, with GraalVM-capable targets
  for native work
- execute the required backend verification commands from the repository
  workspace
- depend on PostgreSQL, Redis, and Flyway as needed
- be usable both locally and in GitHub Actions

The expected shape is that local developers and CI both use the same targeted
Compose verification services through the CI file, even if the development stack
itself remains JVM-oriented.

The intended verification model should be explicit:

- container-first local development uses `compose.dev.yml` with the appropriate
  dev API profile
- host or WSL fallback development also uses `compose.dev.yml`, but starts only
  the support services instead of enabling either API profile
- local and CI verification use `compose.ci.yml`, with the targeted verification
  services driving startup of only their declared dependencies

Local verification runs should intentionally use `compose.ci.yml` rather than
`compose.dev.yml` so local verification and CI stay aligned around the same
non-interactive verification model.

The initial verification commands can target the current API module directly:

- JVM compile-health lane: `:apps:api:testClasses`
- native verification lane: `:apps:api:nativeTest` and `:apps:api:nativeCompile`

If the backend workspace grows into multiple applications later, this model can
be widened, but the initial design should stay grounded in the current
`apps/api` module.

### Flyway Layout

Flyway assets should live under `infra/flyway/`.

Recommended split:

- `infra/flyway/sql/baseline` for baseline migrations shared across environments
- `infra/flyway/sql/local` for optional local-only seed data or convenience
  migrations
- `infra/flyway/conf/` only if a dedicated Flyway configuration file becomes
  useful

Local sample data should stay opt-in through the local override rather than
becoming part of the default CI path. CI should prefer the smallest clean
database state that still satisfies the tests.

### Developer Commands

The `infra/compose/justfile` should wrap the common Compose combinations so
developers and CI do not need to remember long `docker compose -f ...` command
lines.

Illustrative recipe names can be `up`, `down`, `check-config`, `verify-jvm`,
`verify-native`, and `verify-all`.

At minimum, the command surface should support:

- bringing up the development or production stack by named profile
- tearing down the development or production stack by named profile
- rendering config for development, CI, or production
- running the JVM compile-health verification through the CI stack
- running the native verification through the CI stack
- running all required verification lanes through the CI stack

Additional convenience commands such as logs or restart can be added if they
stay small and obvious.

For clarity, the fallback local workflow should have a concrete command shape,
for example `just up dev-local` to start only `postgres`, `redis`, and `flyway`
from `compose.dev.yml` before the developer runs `./gradlew bootRun` from WSL or
the host.

### GitHub Actions Design

A dedicated backend test workflow should be added under `.github/workflows/`.

It should:

- run on backend-related changes only
- include `backend/**`, `infra/compose/**`, and `infra/flyway/**` in its path
  filters
- use the Compose CI stack to run both required verification lanes
- always tear down containers and volumes after the run, including failure paths

The workflow should make both of these gates required:

- the JVM compile-health lane
- the native verification lane

The workflow can model them as separate jobs or as clearly separated steps, but
both must block the workflow result. Jar packaging can remain available as an
alternative path, but it does not need to be a required CI gate.

### Documentation Design

Compose should also get area-local documentation under `infra/compose/docs/`,
linked from the root docs index.

The initial documentation set should stay small:

- `infra/compose/docs/README.md` as the local docs index
- `infra/compose/docs/service-deployment-standard.md` as the copied shared
  deployment standard with a short provenance note
- `infra/compose/docs/compose-guide.md` as the repo-specific guide that combines
  stack layout and workflows in one place

`compose-guide.md` should cover:

- the purpose of each Compose file and supporting asset
- the core services and their roles
- the native-default artifact and verification strategy
- the local container-first JVM workflow
- the host or WSL fallback JVM workflow
- the local and CI verification workflows
- brief notes on why Flyway stays unprofiled and why there are no extra
  local-only override layers

Root documentation should also be updated so `docs/README.md` links to the new
Compose docs area, and `docs/environment-setup.md` can point readers there for
runtime and verification workflow details instead of duplicating those commands.

## Scope and Non-Goals

- In scope: the initial Compose layout under `infra/compose/`
- In scope: the first Dockerfile for `backend/apps/api`
- In scope: Compose definitions for `api`, `postgres`, `redis`, and `flyway`
- In scope: a Compose-native backend verification path for local and CI use
- In scope: native-default build and runtime decisions for the current API app
- In scope: JVM alternative paths for debugging, fast feedback, and fallback
- In scope: GitHub Actions wiring for backend-only test runs
- In scope: developer documentation for how to use the new Compose setup
- Out of scope: full production hardening beyond the initial override structure
- Out of scope: frontend Compose services
- Out of scope: Kubernetes manifests or cloud deployment automation
- Out of scope: replacing the fallback host or WSL workflow
- Out of scope: making native image the default local debugging path

## Risks and Open Questions

- The exact local JVM debugging mechanism can be implemented either through
  stable remote debug ports or via richer IDE run-target integration. The design
  should not require the more fragile IDE-specific path to be the only supported
  one.
- Docker Desktop, WSL, and IntelliJ integration can still introduce local
  friction, so the fallback host-run path must remain documented and tested.
- Native verification is slower and heavier than JVM verification, so the docs
  and command surface must make the alternative fast-feedback JVM path obvious.
- A multi-stage Dockerfile adds some up-front complexity, but it prevents local,
  CI, and production needs from drifting into separate image definitions.
- GraalVM-capable build stages are heavier than plain JDK stages, but they avoid
  host-toolchain drift and make native verification reproducible.
- If Flyway local seed data becomes too convenient, there is a risk of tests
  accidentally depending on it. CI should stay intentionally stricter than the
  local stack.
- If path filters in GitHub Actions are too narrow, backend-affecting changes in
  shared infra folders could skip CI unintentionally.
- If the JVM alternative path is not exercised at all in CI, it can silently
  rot. The compile-health gate is intended to reduce that risk without doubling
  the full test workload.

## Validation Considerations

The design should be considered successful if:

- a developer can start the local Compose stack and debug the API on the JVM in
  a container-first workflow with stable ports
- a developer can also run the API on the JVM from WSL or the host against the
  same Compose-managed PostgreSQL and Redis stack
- local and CI verification can run through Compose with the same high-level
  command model, including the JVM compile-health lane and the native
  verification lane
- production defaults to a native runtime path while the JVM runtime remains
  available as an explicit alternative
- CI tears down the Compose stack reliably on both success and failure
- the resulting layout still matches the deployment standard closely enough to
  remain recognizable and maintainable

## References

<!-- markdownlint-disable MD013 -->

| Resource                                                                                                                                                       | Description                                                                                                                              | Other Notes if any |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| [GitHub issue #8](https://github.com/CXwudi/nijigen-video-site/issues/8)                                                                                       | Source issue for the Docker Compose setup, including the original questions about base, local, prod, dev, and CI layering.               | Must Read          |
| [service-deployment-standard.md](https://github.com/user-attachments/files/26337055/service-deployment-standard.md)                                            | Shared deployment convention that defines the expected base, local, and prod Compose structure plus the `justfile` workflow.             | Must Read          |
| [Docker Compose profiles](https://docs.docker.com/compose/how-tos/profiles/)                                                                                   | Official guidance that profiles are intended for optional services and that core services should usually remain unprofiled.              | Important          |
| [docker compose CLI reference](https://docs.docker.com/reference/cli/docker/compose/)                                                                          | Official reference confirming multi-file merge order and that relative paths are resolved from the first Compose file.                   | Important          |
| [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/)                                                                         | Official guidance for `depends_on`, `service_healthy`, and `service_completed_successfully`, relevant to PostgreSQL and Flyway ordering. | Important          |
| [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)                                           | Official reference for workflow path filters and job structure, used for the backend-only CI design.                                     | Important          |
| [Gradle plugin for GraalVM Native Image](https://graalvm.github.io/native-build-tools/latest/gradle-plugin.html)                                               | Official GraalVM Native Build Tools reference covering `nativeCompile`, `nativeTest`, test binaries, and toolchain caveats.              | Must Read          |
| [Testing GraalVM Native Images](https://docs.spring.io/spring-boot/how-to/native-image/testing-native-applications.html)                                       | Official Spring Boot guidance for native testing, including why JVM development remains useful and how `nativeTest` fits in.             | Must Read          |
| [GraalVM Community Edition Container Images](https://www.graalvm.org/jdk25/getting-started/container-images/)                                                  | Official GraalVM container image reference, relevant to choosing builder images that include `native-image`.                             | Important          |
| [JetBrains Spring Boot + Docker Compose debug tutorial](https://www.jetbrains.com/help/idea/run-and-debug-a-spring-boot-application-using-docker-compose.html) | Current official JetBrains guidance showing that IntelliJ supports Spring Boot debugging with Docker Compose services.                   | Important          |
| [JetBrains WSL documentation](https://www.jetbrains.com/help/idea/how-to-use-wsl-development-environment-in-product.html)                                      | Official guidance for Windows-host plus WSL workflows, including run and debug support in WSL and firewall considerations.               | Important          |
| [README.md](../../README.md)                                                                                                                                   | Repository root documentation entry point and current project framing.                                                                   | Must Read          |
| [docs/environment-setup.md](../../docs/environment-setup.md)                                                                                                   | Repository-wide development environment document that already declares Docker as a prerequisite.                                         | Important          |
| [backend/README.md](../../backend/README.md)                                                                                                                   | Backend entry point showing the current backend workspace boundary.                                                                      | Important          |
| [backend/apps/api/build.gradle.kts](../../backend/apps/api/build.gradle.kts)                                                                                   | Current API module build file and the starting point for the future API container image.                                                 | Important          |
| [backend/gradle/plugins/backend/src/main/kotlin/my.spring-app.gradle.kts](../../backend/gradle/plugins/backend/src/main/kotlin/my.spring-app.gradle.kts)       | Shared backend application plugin that applies Spring Boot and GraalVM native build support.                                             | Important          |
| [backend/gradle/plugins/backend/src/main/kotlin/my.jvm-common.gradle.kts](../../backend/gradle/plugins/backend/src/main/kotlin/my.jvm-common.gradle.kts)       | Shared JVM conventions, including the toolchain settings that already mark the workspace as native-image capable.                        | Important          |
| [backend/apps/api/src/main/resources/application.yaml](../../backend/apps/api/src/main/resources/application.yaml)                                             | Current baseline Spring Boot application configuration for the API app.                                                                  | Important          |
| [backend/apps/api/src/test/resources/application-test.yaml](../../backend/apps/api/src/test/resources/application-test.yaml)                                   | Existing test profile showing that backend tests are currently designed to avoid local infra by default.                                 | Important          |

<!-- markdownlint-enable MD013 -->
