# Docker Compose Setup Implementation Plan

> **For agentic workers:** Use the harness's preferred task-tracking and
> delegation tools when available. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Add the initial Docker Compose, Flyway, Dockerfile, CI, and
documentation setup for issue `#8` so the backend supports JVM-first local
debugging, native-default verification, and a native-default production runtime
with JVM and jar alternatives available.

**Source of Truth:** Approved design spec
`ref/spec/spec-docker-compose-setup-20260411.md`, plus GitHub issue `#8` and the
copied service deployment standard it references.

**Scope:** Revise the in-progress API Dockerfile and `.dockerignore`, create the
`infra/compose/` and `infra/flyway/` scaffolding, add a shared
`common-services.yml` plus explicit environment-specific Compose entry files,
add the Compose-backed backend verification workflow in GitHub Actions, and
document the resulting runtime and verification model. This plan does not
implement frontend containers, broader production hardening, or non-Compose
deployment automation.

**Approach:** First revise the already-started Docker build assets so they
support explicit JVM and native targets from one Dockerfile. Then layer the
Compose model around those targets with explicit entry files: `compose.dev.yml`
for JVM development, `compose.ci.yml` for JVM compile-health plus native
verification, and `compose.prod.yml` for native-default runtime, all reusing
shared service definitions from `common-services.yml` through `extends`. Finish
by documenting the workflow close to the Compose files and validating the full
local, CI, and production command surface.

**Verification:** Validate the environment-specific Compose configurations with
`docker compose ... config`, build the refreshed JVM and native image targets,
boot the local and fallback development stacks, run `testClasses`,
`nativeCompile`, and `nativeTest` through the CI Compose stack locally, and
ensure the GitHub workflow shape matches the documented backend-only path
filters and teardown rules.

---

## Expected Layout

After this issue is implemented, the new or refreshed infrastructure area should
look roughly like:

```text
infra/
├─ compose/
│  ├─ .env.example
│  ├─ common-services.yml
│  ├─ compose.dev.yml
│  ├─ compose.ci.yml
│  ├─ compose.prod.yml
│  ├─ justfile
│  ├─ README.md
│  └─ docs/
│     ├─ README.md
│     ├─ compose-guide.md
│     └─ service-deployment-standard.md
└─ flyway/
   └─ sql/
      ├─ baseline/
      └─ local/
```

The backend area should also contain the refreshed API build assets:

```text
backend/apps/api/
└─ Dockerfile
```

The repository root should also contain:

```text
.dockerignore
.github/workflows/backend-verify.yml
```

## Assumptions

- The existing untracked `backend/apps/api/Dockerfile` and `.dockerignore`
  should be revised in place rather than discarded conceptually, since they are
  already the starting point of Task 1 work.
- A single multi-stage Dockerfile will expose named targets for JVM development,
  JVM runtime, native build, and native runtime instead of splitting JVM and
  native paths across separate Dockerfiles.
- The initial verification commands should stay focused on the current
  `:apps:api` module rather than prematurely widening to every future backend
  module.
- `compose.ci.yml` will be used by both local verification runs and GitHub
  Actions, while `compose.dev.yml` remains focused on JVM development.
- Production should default to the native runtime target, while the JVM runtime
  target remains selectable as an explicit alternative without introducing an
  extra Compose override file.
- Shared service definitions should live in `common-services.yml`, and each
  environment-specific Compose file should explicitly declare the services it
  launches by extending those shared definitions.

## Risks To Address During Implementation

- Native builds are heavier and slower than JVM builds, so image targets,
  Compose services, and documentation need to preserve a clear fast-feedback JVM
  alternative for day-to-day development.
- Native Gradle tasks require a GraalVM distribution with `native-image`, so the
  container image choices must eliminate reliance on the host toolchain.
- A repo-root Docker build context makes `.dockerignore` important to keep build
  contexts small and avoid accidental file leakage into images.
- Compose startup ordering must make PostgreSQL readiness and Flyway completion
  explicit, otherwise the API and verification services can fail
  nondeterministically.
- The local host or WSL fallback flow is operationally simple but easy to miss
  in docs and verification if only the container-first path is exercised during
  implementation.
- CI teardown must run on failures as well as successes so verification stacks
  do not linger on the runner.

### Task 1: Refresh API Build Assets For JVM And Native Targets

#### 1.1 Intent

Revise the in-progress API Dockerfile work so one shared image definition can
power JVM local debugging, JVM runtime packaging, native verification, and the
native production runtime.

#### 1.2 Files

- Modify: `backend/apps/api/Dockerfile`
- Modify: `.dockerignore`

#### 1.3 Dependencies

None

- [x] **Step 1:** Replace the current `dev` and `prod`-only Dockerfile layout
      with explicit named targets for JVM development, JVM runtime, native
      build, and native runtime.
- [x] **Step 2:** Keep the repo-root build context and backend workspace copy
      model predictable so both JVM and native targets can execute Gradle
      commands from the same `WORKDIR` without path tricks.
- [x] **Step 3:** Use a GraalVM-capable builder image for the stages that run
      `nativeTest` and `nativeCompile`, while keeping the local JVM development
      target optimized for `bootRun` and `testClasses`.
- [x] **Step 4:** Ensure the JVM runtime target packages the jar alternative
      cleanly and the native runtime target copies the deployable main native
      executable cleanly.
- [x] **Step 5:** Revisit `.dockerignore` so the repo-root build context stays
      focused on the backend workspace while still preserving everything the
      refreshed Dockerfile needs for both the JVM and native paths.
- [x] **Step 6:** Keep Dockerfile comments brief and focused on why the stage
      split exists, especially where the JVM development path differs from the
      native verification and production paths.

#### 1.4 Verification

- Run:

  ```sh
  docker build \
    -t nijigen-api:jvm-dev-check \
    -f backend/apps/api/Dockerfile \
    --target jvm-dev \
    .
  ```

- Expect: the JVM development target builds successfully from the repository
  root context.
- Run:
  `docker run --rm nijigen-api:jvm-dev-check :apps:api:testClasses --dry-run`
- Expect: the JVM development target can execute its intended Gradle command
  path using the image's default entrypoint and working directory.
- Run: `docker build -f backend/apps/api/Dockerfile --target jvm-runtime .`
- Expect: the JVM runtime target also builds successfully and packages the jar
  alternative path.
- Run: `docker build -f backend/apps/api/Dockerfile --target native-runtime .`
- Expect: the native runtime target builds successfully, exercising the native
  build path end to end.

#### 1.5 Notes

- If the runtime or verification commands need a shell, make that explicit in
  the image design rather than assuming a base image provides one.
- Native runtime packaging should validate the deployable main executable, not
  only the native test binary.

### Task 2: Create Flyway Assets And Core Compose Stacks

#### 2.1 Intent

Create the initial `infra/compose/` and `infra/flyway/` structure, then express
the shared service model plus the local and production runtime overrides.

#### 2.2 Files

- Create: `infra/compose/.env.example`
- Create: `infra/compose/common-services.yml`
- Create: `infra/compose/compose.dev.yml`
- Create: `infra/compose/compose.prod.yml`
- Create: `infra/compose/justfile`
- Create: `infra/flyway/sql/baseline/V1__baseline.sql`
- Create: `infra/flyway/sql/local/README.md`
- Modify: `.gitignore`

#### 2.3 Dependencies

Task 1

- [x] **Step 1:** Create the `infra/compose/` and `infra/flyway/` directories in
      the approved shape, including a committed baseline migration and a small
      durable note under `infra/flyway/sql/local/` so the local-only directory
      has a real purpose in git.
- [x] **Step 2:** Add `infra/compose/.env.example` with the variables needed by
      the API, PostgreSQL, Redis, Flyway, fixed local HTTP and debug ports, and
      the production runtime target override that should default to the native
      runtime target.
- [x] **Step 3:** Author `common-services.yml` with the shared service library:
      `api-base`, `postgres-base`, `redis-base`, and `flyway-base`, plus shared
      environment blocks, named volumes, healthchecks, and dependency wiring
      that uses `service_healthy` and `service_completed_successfully` where
      appropriate.
- [x] **Step 4:** Author `compose.dev.yml` so container-first development is
      available through explicit `api-debug` and `api-jb` services that extend
      `api-base`, while `postgres`, `redis`, and `flyway` are also explicitly
      declared by extending the shared base services.
- [x] **Step 5:** Ensure the same dev stack also supports the host or WSL
      fallback path by allowing the support services to be started without
      enabling either dev API profile.
- [x] **Step 6:** Author `compose.prod.yml` with production-oriented overrides
      only, making the native runtime target the default while preserving the
      JVM runtime target as an explicit alternative selected through config.
- [x] **Step 7:** Add `infra/compose/justfile` recipes for `up`, `down`,
      `check-config`, `verify-jvm`, `verify-native`, and `verify-all`, and make
      those recipes align with the explicit environment files rather than the
      older base-plus-local naming.
- [x] **Step 8:** Update `.gitignore` so a real `infra/compose/.env` stays
      untracked while `.env.example` remains committed.

#### 2.4 Verification

- Run: `cp infra/compose/.env.example infra/compose/.env`
- Expect: an untracked local Compose env file exists before config rendering and
  recipe execution.
- Run:

  ```sh
  docker compose \
    --env-file infra/compose/.env \
    -f infra/compose/compose.dev.yml \
    config
  ```

- Expect: the merged local stack renders successfully with no path or
  interpolation errors.
- Run:

  ```sh
  docker compose \
    --env-file infra/compose/.env \
    -f infra/compose/compose.prod.yml \
    config
  ```

- Expect: the merged production stack renders successfully with the native
  runtime as the default.
- Run:

  ```sh
  env API_PROD_RUNTIME_TARGET=jvm-runtime \
    docker compose \
    --env-file infra/compose/.env \
    -f infra/compose/compose.prod.yml \
    config
  ```

- Expect: the same production stack also renders when the JVM runtime
  alternative is selected explicitly.
- Run: `just --justfile infra/compose/justfile up dev-container-debug`
- Expect: the dev stack starts with the JVM-based debug container-first path.
- Run: `just --justfile infra/compose/justfile up dev-local`
- Expect: only `postgres`, `redis`, and `flyway` start for the host or WSL
  fallback path.

#### 2.5 Notes

- Keep `flyway` unprofiled because it is part of the normal app and verification
  boot path.
- Raw Compose commands and `just` recipes should both pass
  `--env-file infra/compose/.env` explicitly instead of relying on implicit
  `.env` discovery.
- Do not add extra local override files beyond `compose.dev.yml` unless
  implementation reveals a real structural difference.
- Profiles may still be introduced for optional helper services later, but not
  for the core stack.

### Task 3: Add Compose-Native Verification Stack And GitHub Workflow

#### 3.1 Intent

Introduce the CI-specific Compose override and the GitHub Actions workflow so
JVM compile health and native verification run through the same Compose-owned
model locally and in CI.

#### 3.2 Files

- Create: `infra/compose/compose.ci.yml`
- Create: `.github/workflows/backend-verify.yml`
- Modify: `infra/compose/justfile`

#### 3.3 Dependencies

Tasks 1 and 2

- [x] **Step 1:** Add `compose.ci.yml` with a targeted `backend-verify-jvm`
      service that uses the JVM development target and runs
      `:apps:api:testClasses`.
- [x] **Step 2:** Add `compose.ci.yml` with a targeted `backend-verify-native`
      service that uses the GraalVM-capable build target and can run both
      `:apps:api:nativeTest` and `:apps:api:nativeCompile`.
- [x] **Step 3:** Keep the CI stack non-interactive by avoiding debugger flags,
      local-only host port publishing, and other developer-only assumptions,
      while still depending on PostgreSQL, Redis, and Flyway as needed.
- [x] **Step 4:** Extend the `justfile` with `verify-jvm`, `verify-native`, and
      `verify-all` recipes, plus any small helper recipes needed to keep the
      native test and native compile commands explicit and reusable.
- [x] **Step 5:** Add `.github/workflows/backend-verify.yml` with
      backend-focused path filters that include at least `backend/**`,
      `infra/compose/**`, and `infra/flyway/**`.
- [x] **Step 6:** Make the workflow run both required verification lanes, keep
      their failure surfaces clear, and always tear down the Compose stacks and
      related resources afterward.

#### 3.4 Verification

- Run:

  ```sh
  docker compose \
    --env-file infra/compose/.env \
    -f infra/compose/compose.ci.yml \
    config
  ```

- Expect: the merged CI stack renders successfully.
- Run: `just --justfile infra/compose/justfile verify-jvm`
- Expect: the Compose-managed JVM compile-health lane completes successfully and
  exits with the `testClasses` status.
- Run: `just --justfile infra/compose/justfile verify-native`
- Expect: the Compose-managed native verification lane completes successfully
  and covers both `nativeTest` and `nativeCompile`.
- Run: `just --justfile infra/compose/justfile verify-all`
- Expect: the combined verification command runs the JVM and native lanes in the
  documented order.
- Review: `.github/workflows/backend-verify.yml`
- Expect: backend-only path filters, separate required verification lanes, and
  `always()` teardown behavior are all explicit.

#### 3.5 Notes

- Local verification should intentionally use the CI stack instead of the local
  development stack so the verification model stays aligned with GitHub Actions.
- A single `backend-verify-native` service can still support separate CI steps
  for `nativeCompile` and `nativeTest` by overriding its command per invocation.
- The workflow file is named `backend-verify.yml` to match its broader role now
  that it gates more than tests alone.

### Task 4: Document The Compose Area And Link It Into Shared Docs

#### 4.1 Intent

Document the new infrastructure area in the same style as the rest of the
repository so both humans and AI agents have a clear source of truth for Compose
usage, verification, and runtime selection.

#### 4.2 Files

- Create: `infra/compose/README.md`
- Create: `infra/compose/docs/README.md`
- Create: `infra/compose/docs/compose-guide.md`
- Create: `infra/compose/docs/service-deployment-standard.md`
- Modify: `docs/README.md`
- Modify: `docs/environment-setup.md`

#### 4.3 Dependencies

Tasks 2 and 3

- [ ] **Step 1:** Add `infra/compose/docs/README.md` as the local docs index for
      Compose, and keep `infra/compose/README.md` short if it is retained as a
      directory landing page.
- [ ] **Step 2:** Copy the shared service deployment standard into
      `infra/compose/docs/service-deployment-standard.md` with a short note that
      explains its provenance and that repo-specific decisions live in local
      docs and specs.
- [ ] **Step 3:** Write `infra/compose/docs/compose-guide.md` as the merged
      repo-specific guide covering file roles, service roles, the native-default
      artifact strategy, the JVM local development workflow, the host or WSL
      fallback workflow, the local and CI verification commands, and the brief
      rationale for unprofiled Flyway and the lack of extra local-only override
      layers.
- [ ] **Step 4:** Update `docs/README.md` so the root docs index links to the
      new Compose docs area alongside backend and frontend docs.
- [ ] **Step 5:** Update `docs/environment-setup.md` so it points readers to the
      Compose docs for runtime and verification workflows without duplicating
      all commands inline.

#### 4.4 Verification

- Run:

  ```sh
  deno fmt \
    infra/compose/README.md \
    infra/compose/docs/README.md \
    infra/compose/docs/compose-guide.md \
    infra/compose/docs/service-deployment-standard.md \
    docs/README.md \
    docs/environment-setup.md
  ```

- Expect: all edited Markdown files format cleanly.
- Run:

  ```sh
  markdownlint-cli2 \
    infra/compose/README.md \
    infra/compose/docs/README.md \
    infra/compose/docs/compose-guide.md \
    infra/compose/docs/service-deployment-standard.md \
    docs/README.md \
    docs/environment-setup.md
  ```

- Expect: all edited Markdown files pass linting.
- Review: `infra/compose/docs/compose-guide.md`
- Expect: the native-default and JVM-alternative workflow story is clear and
  consistent with the spec and justfile commands.

#### 4.5 Notes

- Keep the repo-specific Compose guide practical and concise; avoid turning the
  copied deployment standard into the only explanation of how this repository
  works.

### Task 5: Run Final Integrated Verification And Cleanup

#### 5.1 Intent

Confirm that the refreshed container build assets, local development flows,
Compose-backed verification, CI workflow shape, and documentation all work
together as one coherent feature.

#### 5.2 Files

- Review: `backend/apps/api/Dockerfile`
- Review: `.dockerignore`
- Review: `infra/compose/common-services.yml`
- Review: `infra/compose/compose.dev.yml`
- Review: `infra/compose/compose.ci.yml`
- Review: `infra/compose/compose.prod.yml`
- Review: `infra/compose/justfile`
- Review: `.github/workflows/backend-verify.yml`
- Review: `infra/compose/docs/compose-guide.md`

#### 5.3 Dependencies

Tasks 1 through 4

- [x] **Step 1:** Render every supported Compose stack with
      `docker compose ... config`, including the native-default production shape
      and the explicit JVM runtime alternative, to catch merge, interpolation,
      or path regressions before runtime.
- [x] **Step 2:** Build the refreshed JVM and native Docker targets directly so
      the Dockerfile assumptions are validated independently of Compose.
- [x] **Step 3:** Boot the local container-first stack and verify the JVM-based
      API container starts successfully against the Compose-managed support
      services.
- [x] **Step 4:** Exercise the host or WSL fallback path by starting only the
      support services and verifying that the documented host-side `bootRun`
      command shape remains viable against the published local ports.
- [x] **Step 5:** Run the Compose-managed JVM compile-health lane and native
      verification lane locally through the CI stack and confirm the command
      model matches what the GitHub workflow will use.
- [x] **Step 6:** Tear down all Compose stacks cleanly and confirm there are no
      stale volumes, containers, or command mismatches left in the docs.

#### 5.4 Verification

- Run: `cp infra/compose/.env.example infra/compose/.env`
- Expect: the local verification flow has a concrete env file for Compose
  interpolation and justfile recipes.
- Run:

  ```sh
  docker compose \
    --env-file infra/compose/.env \
    -f infra/compose/compose.dev.yml \
    config
  ```

- Expect: the local stack renders cleanly.
- Run:

  ```sh
  docker compose \
    --env-file infra/compose/.env \
    -f infra/compose/compose.ci.yml \
    config
  ```

- Expect: the CI stack renders cleanly.
- Run:

  ```sh
  docker compose \
    --env-file infra/compose/.env \
    -f infra/compose/compose.prod.yml \
    config
  ```

- Expect: the native-default production stack renders cleanly.
- Run:

  ```sh
  env API_PROD_RUNTIME_TARGET=jvm-runtime \
    docker compose \
    --env-file infra/compose/.env \
    -f infra/compose/compose.prod.yml \
    config
  ```

- Expect: the JVM runtime alternative also renders cleanly.
- Run: `docker build -f backend/apps/api/Dockerfile --target jvm-dev .`
- Expect: the direct JVM development target still builds after the Compose work.
- Run:

  ```sh
  docker build \
    -t nijigen-api:jvm-dev-check \
    -f backend/apps/api/Dockerfile \
    --target jvm-dev \
    .
  ```

- Expect: the tagged JVM development target is available for a direct command
  path check.
- Run:
  `docker run --rm nijigen-api:jvm-dev-check :apps:api:testClasses --dry-run`
- Expect: the direct JVM development target still supports the intended Gradle
  command shape after the Compose work.
- Run: `docker build -f backend/apps/api/Dockerfile --target native-runtime .`
- Expect: the direct native runtime target still builds after the Compose work.
- Run: `just --justfile infra/compose/justfile up dev-container-debug`
- Expect: the dev API and its dependencies start under the debug profile.
- Run: `just --justfile infra/compose/justfile up dev-local`
- Expect: only the support services start for fallback development.
- Run: `just --justfile infra/compose/justfile verify-all`
- Expect: the Compose-managed verification lanes complete with the expected exit
  statuses.

#### 5.5 Notes

- If any integrated verification step reveals that the local, CI, and production
  stacks need materially different build or runtime behavior, refine the
  existing overrides first before considering new ones.

## References

<!-- markdownlint-disable MD013 -->

| Resource                                                                                                                                                       | Description                                                                                                                                 | Other Notes if any |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| [ref/spec/spec-docker-compose-setup-20260411.md](../spec/spec-docker-compose-setup-20260411.md)                                                                | Approved design spec for the Docker Compose setup and the primary source of truth for this refreshed plan.                                  | Must Read          |
| [GitHub issue #8](https://github.com/CXwudi/nijigen-video-site/issues/8)                                                                                       | Source issue requesting the initial Docker Compose setup, Flyway layout, and backend verification CI flow.                                  | Must Read          |
| [service-deployment-standard.md source](https://github.com/user-attachments/files/26337055/service-deployment-standard.md)                                     | Original shared deployment standard URL that should be copied into the repo-local Compose docs area.                                        | Important          |
| [backend/apps/api/Dockerfile](../../backend/apps/api/Dockerfile)                                                                                               | Current in-progress API Dockerfile that now needs to be revised from a JVM-only shape into the approved JVM and native multi-target design. | Must Read          |
| [.dockerignore](../../.dockerignore)                                                                                                                           | Current repo-root Docker ignore rules, which should be verified against the refreshed Dockerfile stages and build context.                  | Important          |
| [backend/apps/api/build.gradle.kts](../../backend/apps/api/build.gradle.kts)                                                                                   | Current API module build file that defines the application module targeted by the refreshed verification lanes.                             | Important          |
| [backend/gradle/plugins/backend/src/main/kotlin/my.spring-app.gradle.kts](../../backend/gradle/plugins/backend/src/main/kotlin/my.spring-app.gradle.kts)       | Shared backend application plugin that applies Spring Boot and GraalVM native build support.                                                | Important          |
| [backend/gradle/plugins/backend/src/main/kotlin/my.jvm-common.gradle.kts](../../backend/gradle/plugins/backend/src/main/kotlin/my.jvm-common.gradle.kts)       | Shared JVM conventions, including the toolchain settings that already mark the workspace as native-image capable.                           | Important          |
| [backend/settings.gradle.kts](../../backend/settings.gradle.kts)                                                                                               | Backend workspace entry point that informs the Gradle command shape for Docker and Compose services.                                        | Important          |
| [backend/gradlew](../../backend/gradlew)                                                                                                                       | Gradle wrapper entrypoint likely to be used inside the Docker build and verification containers.                                            | Important          |
| [backend/apps/api/src/main/resources/application.yaml](../../backend/apps/api/src/main/resources/application.yaml)                                             | Current baseline API application configuration, useful for deciding whether Compose can rely on environment variables alone.                | Important          |
| [backend/apps/api/src/test/resources/application-test.yaml](../../backend/apps/api/src/test/resources/application-test.yaml)                                   | Current test profile showing that the Compose verification path is intentionally different from the existing isolated test default.         | Important          |
| [docs/README.md](../../docs/README.md)                                                                                                                         | Shared documentation entry point that should link to the new Compose docs area.                                                             | Important          |
| [docs/environment-setup.md](../../docs/environment-setup.md)                                                                                                   | Existing environment setup doc that should point readers to the Compose runtime and verification workflow docs.                             | Important          |
| [Docker Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/)                                                                         | Official guidance for `depends_on`, `service_healthy`, and `service_completed_successfully`, relevant to PostgreSQL and Flyway ordering.    | Important          |
| [Docker Compose profiles](https://docs.docker.com/compose/how-tos/profiles/)                                                                                   | Official guidance that profiles are best reserved for optional services rather than the core application path.                              | Important          |
| [docker compose CLI reference](https://docs.docker.com/reference/cli/docker/compose/)                                                                          | Official reference for multi-file merge behavior, targeted service startup, and path resolution from the first Compose file.                | Important          |
| [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)                                           | Official reference for backend-only path filters, job structure, and teardown behavior in the new CI workflow.                              | Important          |
| [Gradle plugin for GraalVM Native Image](https://graalvm.github.io/native-build-tools/latest/gradle-plugin.html)                                               | Official GraalVM Native Build Tools reference covering `nativeCompile`, `nativeTest`, test binaries, and toolchain caveats.                 | Must Read          |
| [Testing GraalVM Native Images](https://docs.spring.io/spring-boot/how-to/native-image/testing-native-applications.html)                                       | Official Spring Boot guidance for native testing, including why JVM development remains useful and how `nativeTest` fits in.                | Must Read          |
| [GraalVM Community Edition Container Images](https://www.graalvm.org/jdk25/getting-started/container-images/)                                                  | Official GraalVM container image reference, relevant to choosing builder images that include `native-image`.                                | Important          |
| [JetBrains Spring Boot + Docker Compose debug tutorial](https://www.jetbrains.com/help/idea/run-and-debug-a-spring-boot-application-using-docker-compose.html) | Current official JetBrains guidance showing that IntelliJ supports Spring Boot debugging with Docker Compose services.                      | Important          |
| [JetBrains WSL documentation](https://www.jetbrains.com/help/idea/how-to-use-wsl-development-environment-in-product.html)                                      | Official guidance for Windows-host plus WSL workflows, including run and debug support in WSL and firewall considerations.                  | Important          |

<!-- markdownlint-enable MD013 -->
