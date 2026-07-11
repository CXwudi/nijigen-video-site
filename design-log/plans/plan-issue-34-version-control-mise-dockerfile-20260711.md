# Issue 34 Mise-to-Docker Version Control Implementation Plan

**Goal:** Make root `mise.toml` the primary version source for JDK 25, Node.js 24, and pnpm 11 across host tools, Gradle, Dockerfiles, Compose, and CI while preserving Java 25 in the Gradle catalog as the direct-Gradle fallback.

**Source of Truth:** [GitHub issue #34](https://github.com/CXwudi/nijigen-video-site/issues/34), the user's decisions that `PNPM_VERSION` is major version 11 and the included Gradle build should overlay `JDK_VERSION` on its imported TOML catalog while retaining the catalog value as fallback, and the current repository Docker/environment conventions.

**Scope:** Includes JDK, Node.js, and pnpm version declarations and every current consumer of those versions. It also includes required Compose, CI, env-template, and documentation updates. It excludes unrelated image names such as `WEB_PNPM_IMAGE`, application dependency versions, and changing the existing major-version pinning policy to exact patch versions.

**Approach:** Declare `JDK_VERSION=25`, `NODE_VERSION=24`, and `PNPM_VERSION=11` under root mise `[env]`, then reference those values from mise's `[tools]`. Pass the exported values explicitly across process boundaries: Compose interpolation supplies image tags, container environment, and build arguments; Dockerfiles consume `ARG`s; the included Gradle build conditionally overrides its imported `java` catalog version from `JDK_VERSION`; and the frontend workflow exposes step outputs to the Docker build action.

**Verification:** Validate mise's resolved environment and tool versions, render all three Compose entrypoints, run backend and frontend checks, build the affected Docker targets, and inspect the resulting Java, Node.js, and pnpm major versions.

---

## Key Design Decisions

- Root `mise.toml` owns the normal JDK, Node.js, and pnpm version policies. Component `.env` files no longer duplicate them; Java 25 remains in `libs.versions.toml` only as the direct-Gradle fallback.
- Keep major-version semantics: JDK 25, Node.js 24, and pnpm 11 may resolve to newer compatible patch releases.
- Dockerfiles declare version `ARG`s without independent numeric defaults. A missing bridge should fail instead of silently drifting back to a duplicated version.
- Compose uses required interpolation such as `${JDK_VERSION:?JDK_VERSION must be provided}`. Commands launched through mise receive the values automatically, while direct Docker builds must pass the documented `--build-arg` values.
- The included plugin build imports `libs.versions.toml`, then conditionally overwrites its `java` alias from `JDK_VERSION`. If the environment variable is absent, the imported Java 25 value remains in effect.
- `backend/gradle/plugins/version-catalog/build.gradle.kts` and the `my.jvm-common.gradle.kts` precompiled script plugin remain unchanged; they continue consuming the generated `Versions.Java` value.
- `WEB_PNPM_IMAGE` remains in the frontend env template because it names a locally built image; it does not select the pnpm release inside that image.

## File Impact Map

- `mise.toml`: own and export all three versions; derive mise tools from them.
- `backend/gradle/plugins/settings.gradle.kts`: import the existing TOML catalog and conditionally overlay its `java` alias from `JDK_VERSION`.
- `backend/gradle/libs.versions.toml`: retain Java 25 as the fallback when Gradle is invoked without the mise environment; no implementation change is needed.
- `backend/docker/Dockerfile` and `frontend/docker/Dockerfile`: parameterize all version-bearing image tags and Node installation commands.
- `infra/compose/common-dev-services.yml`, `backend/docker/compose.local.yml`, and `infra/compose/compose.prod.yml`: bridge mise values into image tags, container environment, and Docker build arguments.
- `backend/docker/.env.example`, `frontend/docker/.env.example`, and `infra/compose/prod.env.example`: remove duplicated language-version values.
- `.github/workflows/frontend-check.yml`: pass mise-derived Node.js and pnpm versions into the Docker build action without copying numeric values into workflow YAML.
- `.github/renovate.json5`: revise Java-specific guidance so the catalog is the intentional direct-Gradle fallback and literal Docker tags are no longer the synchronization mechanism.
- `docs/environment-setup.md`, `docs/docker-setup-explain.md`, and `backend/docs/gradle-setup-explain.md`: document ownership and invocation contracts.

## Task Steps

When executing the plan:

- mark `[ ]` boxes as completed `[x]` when an item is completed
- after each task, do a code review by spawning another subagent, and fix any valuable feedback
- before moving to the next task, commit the changes

### Task 1: Establish mise with a Gradle Catalog Fallback

#### 1.1 Intent

Create one exported version policy for normal workflows and connect the included Gradle build to it without breaking direct Gradle usage.

#### 1.2 Files

- Modify: `mise.toml`
- Modify: `backend/gradle/plugins/settings.gradle.kts`
- Modify: `backend/docs/gradle-setup-explain.md`

#### 1.3 Dependencies

None.

- [x] **Step 1:** Add root `[env]` entries for `JDK_VERSION="25"`, `NODE_VERSION="24"`, and `PNPM_VERSION="11"`.
- [x] **Step 2:** Change `[tools]` so Java, Node.js, and pnpm use mise templates referencing the corresponding exported variables; keep unrelated tools unchanged.
- [x] **Step 3:** In `backend/gradle/plugins/settings.gradle.kts`, keep the existing single `from(files("../libs.versions.toml"))` import and conditionally call `version("java", value)` only when `providers.environmentVariable("JDK_VERSION")` is present. Let the imported `versions.java` value remain untouched when the variable is absent.
- [x] **Step 4:** Leave `backend/gradle/libs.versions.toml`, the generated `Versions.Java` adapter in `backend/gradle/plugins/version-catalog/build.gradle.kts`, and `backend/gradle/plugins/backend/src/main/kotlin/my.jvm-common.gradle.kts` unchanged.
- [x] **Step 5:** Update the Gradle setup documentation to identify root `mise.toml` as the normal Java version owner and `libs.versions.toml` as the compatibility fallback for Gradle commands invoked without `JDK_VERSION`.

#### 1.4 Verification

- Run: `mise env --json`
- Expect: `JDK_VERSION=25`, `NODE_VERSION=24`, and `PNPM_VERSION=11` are present.
- Run: `mise current java && mise current node && mise current pnpm`
- Expect: resolved tools use JDK 25, Node.js 24, and pnpm 11 patch releases.
- Run: `mise //backend:gradle javaToolchains`
- Expect: the included catalog overlay generates `Versions.Java` as 25 and Gradle configures a Java 25 native-image-capable toolchain.
- Run: `env -u JDK_VERSION ./backend/gradlew -p backend help --rerun-tasks`
- Run: `rg 'Java: Int = 25' backend/gradle/plugins/version-catalog/build/generated/sources/buildConfig/main/my/catalog/Versions.kt`
- Expect: direct Gradle use succeeds and generates Java 25 from the TOML fallback.
- Run: `JDK_VERSION=24 ./backend/gradlew -p backend help --rerun-tasks`
- Run: `rg 'Java: Int = 24' backend/gradle/plugins/version-catalog/build/generated/sources/buildConfig/main/my/catalog/Versions.kt`
- Expect: a supplied environment value overrides the imported catalog version, proving the overlay path independently of the normal value 25.
- Run: `mise //backend:gradle help --rerun-tasks`
- Expect: the generated source is restored to Java 25 after the override test.

#### 1.5 Notes

- Use mise's documented `{{ env.VARIABLE_NAME }}` template form; do not copy the numeric values back into `[tools]`.
- Gradle documents combining one `from(...)` import with programmatic `version(...)` calls as the supported way to override an imported version.
- Do not create a second `libs` catalog in `backend/settings.gradle.kts`; the main build already auto-imports `gradle/libs.versions.toml`. The targeted overlay belongs in the included plugin build, where the catalog is explicitly imported.

### Task 2: Bridge Versions Through Docker and Compose

#### 2.1 Intent

Make every development and production-like image consume the mise-owned values through explicit Docker/Compose boundaries.

#### 2.2 Files

- Modify: `backend/docker/Dockerfile`
- Modify: `frontend/docker/Dockerfile`
- Modify: `infra/compose/common-dev-services.yml`
- Modify: `backend/docker/compose.local.yml`
- Modify: `infra/compose/compose.prod.yml`
- Modify: `backend/docker/.env.example`
- Modify: `frontend/docker/.env.example`
- Modify: `infra/compose/prod.env.example`

#### 2.3 Dependencies

Task 1.

- [x] **Step 1:** Add a global `JDK_VERSION` build argument to the backend Dockerfile and substitute it into the NIK builder and JVM runtime tags. Expose the same value inside `gradle-base` so Gradle toolchain configuration sees it during JVM and native builds.
- [x] **Step 2:** Add global `PNPM_VERSION` and `NODE_VERSION` arguments to the frontend Dockerfile. Use them for the pnpm base tag, `pnpm runtime set node`, and the hardened Node.js runtime tag.
- [x] **Step 3:** In the shared development Compose file, require `JDK_VERSION` for the API development image, pass it into the API container, and pass required Node.js/pnpm build args into `web-pnpm-base`.
- [x] **Step 4:** Require `JDK_VERSION` in the JetBrains API image reference in backend local Compose. Do not add it to that container's environment: IntelliJ replaces this minimal service's entrypoint and mounts built jars, so Gradle does not evaluate the project inside `api-jb`.
- [x] **Step 5:** Add required JDK build args to the production-like API build and required Node.js/pnpm build args to its web build.
- [x] **Step 6:** Remove `JDK_VERSION` from all three checked-in env templates; do not add Node.js or pnpm versions to them. Retain deployment settings, credentials, ports, runtime targets, and `WEB_PNPM_IMAGE` unchanged.
- [x] **Step 7:** Refresh ignored local env files from their templates when needed for verification, preserving any developer-specific credentials or port overrides instead of overwriting them blindly.

#### 2.4 Verification

- Run: `mise //backend/docker:config-check`
- Run: `mise //frontend/docker:config-check`
- Run: `mise //infra/compose:config-check`
- Expect: all Compose models render with JDK 25, Node.js 24, and pnpm 11 in the appropriate image names, container environment, and build args even though the env templates no longer declare them.
- Run: `env -u JDK_VERSION HOST_UID="$(id -u)" HOST_GID="$(id -g)" HOST_GRADLE_USER_HOME="${GRADLE_USER_HOME:-$HOME/.gradle}" docker compose --env-file backend/docker/.env.example -f backend/docker/compose.local.yml --profile backend config --quiet`
- Expect: direct Compose use without mise fails with the actionable required `JDK_VERSION` interpolation message.
- Run: `mise exec -- bash -c 'docker build --build-arg JDK_VERSION="$JDK_VERSION" -f backend/docker/Dockerfile --target gradle-base -t nijigen-gradle-base:verify backend'`
- Run: `docker run --rm --entrypoint java nijigen-gradle-base:verify -version`
- Expect: the backend builder reports Java 25.
- Run: `mise exec -- bash -c 'docker build --build-arg NODE_VERSION="$NODE_VERSION" --build-arg PNPM_VERSION="$PNPM_VERSION" -f frontend/docker/Dockerfile --target web-pnpm-base -t nijigen-web-pnpm:verify frontend'`
- Run: `docker run --rm --entrypoint node nijigen-web-pnpm:verify --version`
- Run: `docker run --rm --entrypoint pnpm nijigen-web-pnpm:verify --version`
- Expect: the frontend builder reports Node.js 24.x and pnpm 11.x.
- Run: `mise exec -- bash -c 'docker build --build-arg JDK_VERSION="$JDK_VERSION" -f backend/docker/Dockerfile --target api-jvm-runtime -t nijigen-api-jvm:verify backend'`
- Run: `docker run --rm --entrypoint java nijigen-api-jvm:verify -version`
- Expect: the parameterized JVM runtime stage builds and reports Java 25.
- Run: `mise exec -- bash -c 'docker build --build-arg NODE_VERSION="$NODE_VERSION" --build-arg PNPM_VERSION="$PNPM_VERSION" -f frontend/docker/Dockerfile --target web-runtime -t nijigen-web:verify frontend'`
- Run: `docker run --rm --entrypoint node nijigen-web:verify --version`
- Expect: the parameterized hardened runtime stage builds and reports Node.js 24.x.

#### 2.5 Notes

- A shell variable does not cross a Docker build boundary by itself. Compose `build.args` or CLI `--build-arg` must connect it to a Dockerfile `ARG`.
- Declare global Dockerfile arguments before the first `FROM`; redeclare an argument within a stage when build instructions in that stage need its value.

### Task 3: Keep CI and Maintenance Metadata on the Same Path

#### 3.1 Intent

Prevent CI from bypassing the version bridge and remove maintenance guidance that would send future updates to literal Docker tags instead of the mise policy and intentional Gradle fallback.

#### 3.2 Files

- Modify: `.github/workflows/frontend-check.yml`
- Modify: `.github/renovate.json5`

#### 3.3 Dependencies

Task 2.

- [x] **Step 1:** Add a frontend workflow step that reads `NODE_VERSION` and `PNPM_VERSION` through `mise exec`, validates that both are non-empty, and publishes them as step outputs or `GITHUB_ENV` values.
- [x] **Step 2:** Pass those derived values to `docker/build-push-action` using its `build-args` input. Do not place `24` or `11` directly in workflow YAML.
- [x] **Step 3:** Update Renovate comments so the disabled Java catalog rule is described as protecting the direct-Gradle fallback, which must be kept aligned manually with root `JDK_VERSION`; remove references to literal BellSoft tags as the synchronization mechanism. Keep major language-runtime upgrades manual unless issue #34 explicitly expands into dependency automation.

#### 3.4 Verification

- Run: `mise x actionlint@latest -- actionlint .github/workflows/frontend-check.yml`
- Expect: the workflow syntax and step-output references are valid.
- Run the workflow's version-export shell snippet locally with a temporary `GITHUB_OUTPUT` file.
- Expect: it emits Node.js `24` and pnpm `11` from mise without hard-coded workflow values.
- Run: `mise //frontend/docker:config-check`
- Expect: the workflow-oriented frontend Compose path still renders.

#### 3.5 Notes

- Prefer step outputs for the Docker action because GitHub expression inputs do not inherit a preceding shell process's environment automatically.
- Do not replace the existing Buildx action with a plain Docker command; retain its cache configuration.

### Task 4: Document and Integrate the Unified Workflow

#### 4.1 Intent

Make the new ownership model discoverable and verify the repository as a whole.

#### 4.2 Files

- Modify: `docs/environment-setup.md`
- Modify: `docs/docker-setup-explain.md`

#### 4.3 Dependencies

Tasks 1 through 3.

- [ ] **Step 1:** Document root `mise.toml` as the normal place to change JDK, Node.js, or pnpm major versions and list the downstream consumers. For a JDK upgrade, also update the intentional `libs.versions.toml` fallback in the same change.
- [ ] **Step 2:** Explain that mise activation or `mise exec`/mise tasks exports versions to Compose, while standalone `docker build` calls must pass the corresponding build args.
- [ ] **Step 3:** Document Compose shell-over-env-file precedence so developers understand why local and production env templates no longer own runtime versions.
- [ ] **Step 4:** Search for stale literal version declarations and comments; enumerate and review every remaining match. Retain literals only in root `mise.toml`, the intentional Gradle catalog fallback, immutable historical design logs, or documentation and verification examples that are not active configuration sources.

#### 4.4 Verification

- Run: `rg -n --hidden --glob '!.git/**' --glob '!design-log/**' --glob '!**/node_modules/**' '(JDK_VERSION.?=.?25|java.?=.?"25"|runtime set node 24|pnpm/pnpm:latest|hardened-nodejs:24|jdk-25|jre-25|versions\.java)' .`
- Expect: every remaining match is explicitly accepted as the root declaration, the Gradle fallback/overlay, or a non-configuration example; no unintended duplicate declaration remains.
- Run: `mise //:docs-link-check`
- Expect: all local documentation links pass.
- Run: `mise //backend/docker:run --rm api :apps:api:test`
- Run: `mise //frontend/docker:run --rm --no-deps web-init`
- Run: `mise //frontend/docker:run --rm --no-deps web --filter web format:check`
- Run: `mise //frontend/docker:run --rm --no-deps web --filter web lint`
- Run: `mise //frontend/docker:run --rm --no-deps web --filter web typecheck`
- Run: `mise //frontend/docker:run --rm web --filter web test`
- Run: `mise //frontend/docker:run --rm --no-deps web --filter web build`
- Expect: backend and frontend checks pass using images derived from the root version policy.

#### 4.5 Notes

- Clean both Compose stacks with their existing `down` tasks after integration verification.
- Historical files under `design-log/` are immutable records and are not migration targets.

## Risks and Guardrails

- Missing mise activation: direct Compose invocation fails on required version interpolation, while direct Gradle invocation intentionally falls back to `libs.versions.toml`. Supported tasks run under mise and receive `[env]` automatically.
- JDK fallback drift: root `JDK_VERSION` and `libs.versions.java` are two checked-in values by design. Documentation, Renovate guidance, and verification of both paths must keep their normal values aligned.
- Docker `ARG` scope: a global argument works in `FROM` but must be redeclared in a stage before it can be used by `ENV` or `RUN`.
- Compose precedence: the invoking shell overrides `--env-file`; verify this with `docker compose config --environment` rather than relying only on visual inspection of YAML.
- IDE behavior: Gradle sync outside a mise-activated shell uses the catalog fallback. The JetBrains Compose service still requires the root version for its image tag, but does not evaluate Gradle inside that container.
- Floating patches: major pins intentionally allow patch advancement. Exact reproducibility would require a separate decision to pin full versions.

## References

| Resource | Description | Other Notes if any |
| --- | --- | --- |
| [GitHub issue #34](https://github.com/CXwudi/nijigen-video-site/issues/34) | Requests unified JDK, Node.js, and pnpm versions flowing from mise to Docker. | Must Read |
| ![Root mise configuration](../../mise.toml) | Current host tool declarations and future primary owner of exported runtime versions. | Must Read |
| ![Backend Dockerfile](../../backend/docker/Dockerfile) | Contains literal JDK 25 builder and runtime tags. | Must Read |
| ![Frontend Dockerfile](../../frontend/docker/Dockerfile) | Contains the floating pnpm image and literal Node.js 24 build/runtime selections. | Must Read |
| ![Shared development services](../../infra/compose/common-dev-services.yml) | Owns the backend development JDK image and frontend Docker build definition. | Must Read |
| ![Backend local Compose](../../backend/docker/compose.local.yml) | Contains the JetBrains-specific JDK image consumer. | Important |
| ![Production-like Compose](../../infra/compose/compose.prod.yml) | Builds both application runtime images and must forward version args. | Important |
| ![Included plugin build settings](../../backend/gradle/plugins/settings.gradle.kts) | Imports the TOML catalog and is the selected boundary for the conditional `JDK_VERSION` overlay. | Must Read |
| ![Backend Java version catalog](../../backend/gradle/libs.versions.toml) | Retains Java 25 as the direct-Gradle fallback. | Important |
| ![Version-catalog adapter](../../backend/gradle/plugins/version-catalog/build.gradle.kts) | Continues generating `Versions.Java` from the resolved catalog without modification. | Important |
| ![Backend JVM convention plugin](../../backend/gradle/plugins/backend/src/main/kotlin/my.jvm-common.gradle.kts) | Continues consuming the generated Java value without modification. | Important |
| ![Frontend CI workflow](../../.github/workflows/frontend-check.yml) | Builds the pnpm image outside Compose and therefore needs an explicit version bridge. | Important |
| [mise environments](https://mise.jdx.dev/environments/) | Documents `[env]`, task/exec export behavior, and shell activation. | Must Read |
| [mise templates](https://mise.jdx.dev/templates.html) | Documents referencing `[env]` values from `[tools]`. | Must Read |
| [Docker build variables](https://docs.docker.com/build/building/variables/) | Defines `ARG`/`ENV` behavior and multi-stage scope. | Must Read |
| [Compose build specification](https://docs.docker.com/reference/compose-file/build/) | Defines Compose `build.args`. | Important |
| [Compose interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/) | Defines shell and `--env-file` interpolation precedence and inspection commands. | Important |
| [Gradle build environment](https://docs.gradle.org/current/userguide/build_environment.html) | Documents lazy environment access through `providers.environmentVariable()`. | Important |
| [Gradle version catalogs](https://docs.gradle.org/current/userguide/version_catalogs.html#sec:overwriting-catalog-versions) | Documents combining `from(...)` with programmatic version overrides. | Must Read |
| [Gradle JVM toolchains](https://docs.gradle.org/current/userguide/toolchains.html) | Documents Java language-version selection and `javaToolchains` verification. | Important |
| [GitHub Actions outputs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/pass-job-outputs) | Documents publishing values through `GITHUB_OUTPUT`. | Important |
| [Docker build-push action](https://github.com/docker/build-push-action) | Documents the action's newline-delimited `build-args` input. | Important |
