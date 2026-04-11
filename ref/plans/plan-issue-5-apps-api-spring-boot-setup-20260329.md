# API Spring Boot Setup Implementation Plan

> **For agentic workers:** Use the harness's preferred task-tracking and
> delegation tools when available. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Bootstrap `backend/apps/api` as the first real Spring Boot API app by
adapting the Spring Initializr output into the existing backend Gradle
conventions and Java 25 workspace.

**Source of Truth:** GitHub issue `#5` plus the Spring Initializr URL attached
in the issue comment, with backend structure constraints inherited from issue
`#2` and ADR-001.

**Scope:** Populate the `apps:api` module with its Spring Boot build,
application entrypoint, baseline resources, and a passing bootstrap test; update
shared Gradle conventions only where the generated app reveals missing shared
behavior; refresh backend docs to reflect the committed state. This plan does
not cover feature endpoints, authentication flows, Flyway migrations,
Dockerfiles, or the future `apps/worker` module.

**Approach:** Start by reconciling the generated Spring Initializr build with
the current version-catalog and convention-plugin setup so shared Spring app
behavior lives in one place. Then add the API module sources and configuration
in small steps, with explicit test-time guardrails so the bootstrap remains
runnable without PostgreSQL, Pulsar, or OAuth providers already standing up.

**Verification:** Validate the adapted module with focused Gradle checks from
`backend/`, ending with `./gradlew :apps:api:test :apps:api:bootJar`, and
confirm the docs still describe the committed backend layout accurately.

---

## Expected Layout

After this issue is implemented, `backend/apps/api/` should look roughly like:

```text
backend/apps/api/
├─ build.gradle.kts
└─ src/
   ├─ main/
   │  ├─ kotlin/io/github/cxwudi/nijigenvideosite/apps/api/
   │  │  └─ ApiApp.kt
   │  └─ resources/
   │     └─ application.yaml
   └─ test/
      ├─ kotlin/io/github/cxwudi/nijigenvideosite/apps/api/
      │  └─ ApiAppTests.kt
      └─ resources/
         └─ application-test.yaml
```

`application-test.yaml` is included here intentionally because the generated
dependency set is likely to require test-only bootstrap controls once JDBC,
PostgreSQL, Pulsar, and OAuth client auto-configuration are all present.

## Assumptions

- Keep the generated package root `io.github.cxwudi.nijigenvideosite.apps.api`
  and simplify the application entry class name to `ApiApp`.
- Keep using the existing backend convention plugins instead of importing the
  standalone Spring Initializr `settings.gradle.kts`, wrapper, or repository
  setup.
- Treat the current `modules:common` dependency as part of the API baseline, but
  do not add domain logic there as part of this issue.

## Risks To Address During Implementation

- The generated Spring Initializr build applies `kotlin("plugin.spring")`, while
  the current `my.spring-app` convention plugin does not.
- The generated project uses the Spring dependency-management plugin, but issue
  `#2` explicitly says this repository should manage Spring dependencies via the
  Spring BOM instead.
- A default `@SpringBootTest` may fail once JDBC, PostgreSQL, Pulsar, and OAuth
  client auto-configuration are active without external services or test
  overrides in place.
- ADR-001 says Flyway stays outside the Spring app, so bootstrap configuration
  should not quietly pull schema management into `apps/api`.

### Task 1: Align Shared Build Conventions With The Generated Spring App

#### Task 1 Intent

**Status:** Done

Translate the Spring Initializr Gradle expectations into the existing backend
convention-plugin model so `apps:api` can stay small and future Spring apps can
reuse the same defaults.

#### Task 1 Files

- Modify: `backend/gradle/libs.versions.toml`
- Modify: `backend/gradle/plugins/backend/build.gradle.kts`
- Modify:
  `backend/gradle/plugins/backend/src/main/kotlin/my.spring-app.gradle.kts`

#### Task 1 Dependencies

None

- [x] **Step 1:** Compare the generated Initializr build against `my.spring-app`
      and record which concerns belong in shared conventions versus `apps/api`
      only.
- [x] **Step 2:** Add any missing catalog entries needed for the API bootstrap,
      especially the Kotlin Spring plugin artifact. When a BOM is the chosen
      version source, prefer that BOM over new per-library version entries in
      the catalog for all libraries it manages.
- [x] **Step 3:** Update `my.spring-app` so it provides the shared Spring app
      behavior that should apply to future runtime modules, while still honoring
      the existing Spring BOM strategy and avoiding the dependency-management
      plugin.
- [x] **Step 4:** Add or refine a short note in `gradle/libs.versions.toml`
      clarifying that once a BOM is added to the catalog, libraries managed by
      that BOM should no longer have individual version entries in the catalog
      unless a library falls outside the BOM on purpose.
- [x] **Step 5:** Keep `my.jvm-common` and the root settings behavior unchanged
      unless the API bootstrap exposes a real shared build gap.

#### Task 1 Verification

- Run: `cd backend && ./gradlew :apps:api:help`
- Expect: the `apps:api` module configures successfully through the updated
  convention plugins without reintroducing project-level repositories or the
  Spring dependency-management plugin.

#### Task 1 Notes

- The generated sample currently targets Java 17 and a standalone build, so its
  wrapper and settings files are reference material only, not files to copy.
- If `kotlin("plugin.spring")` is added through the convention plugin, keep the
  plugin version sourced from the existing version catalog.
- This rule is broader than Spring: once a BOM is the version source, its
  managed libraries should stop carrying their own catalog versions.

### Task 2: Populate The API Module Build And Bootstrap Source Set

#### Task 2 Intent

**Status:** Done

Create the API module’s real source/resource structure and adapt the generated
Spring Initializr dependencies into the repository’s multi-module layout.

#### Task 2 Files

- Modify: `backend/apps/api/build.gradle.kts`
- Create:
  `backend/apps/api/src/main/kotlin/io/github/cxwudi/nijigenvideosite/apps/api/ApiApp.kt`
- Create: `backend/apps/api/src/main/resources/application.yaml`
- Create:
  `backend/apps/api/src/test/kotlin/io/github/cxwudi/nijigenvideosite/apps/api/ApiAppTests.kt`

#### Task 2 Dependencies

Task 1

- [x] **Step 1:** Replace the minimal `apps/api/build.gradle.kts` stub with the
      starter dependencies from the issue’s Initializr URL, expressed through
      the version catalog and the existing `my.spring-app` plugin.
- [x] **Step 2:** Preserve `implementation(project(":modules:common"))` and add
      the Spring starters, supporting libraries, annotation processor, runtime
      driver, and test dependencies that belong in this module.
- [x] **Step 3:** Add the Spring Boot application class as `ApiApp` plus the
      `main` function, including brief KDoc so the class and entrypoint are
      documented per repo guidance.
- [x] **Step 4:** Add the baseline `application.yaml` with the application name
      and only the minimal committed defaults that are safe to keep in-repo at
      this stage.
- [x] **Step 5:** Add the initial `@SpringBootTest` coverage so the module has a
      real bootstrap test instead of only compiling.

#### Task 2 Verification

- Run:
  `cd backend && ./gradlew :apps:api:compileKotlin :apps:api:processResources`
- Expect: the API module compiles and packages resources cleanly with no missing
  dependency aliases or source-set wiring problems.

#### Task 2 Notes

- Do not copy the generated Initializr wrapper files, `.gitignore`, or `HELP.md`
  into `backend/apps/api/`; only the module-specific build and source material
  should be adapted.
- Prefer module-local dependency declarations over bloating `modules:common`
  with API-only concerns such as Spring MVC, security, or actuator starters.

### Task 3: Make Bootstrap Tests Deterministic Without Local Infra

#### Task 3 Intent

**Status:** Done

Ensure `:apps:api:test` passes in a clean development environment even though
the module now depends on infrastructure-oriented starters that usually expect
external services.

#### Task 3 Files

- Modify:
  `backend/apps/api/src/test/kotlin/io/github/cxwudi/nijigenvideosite/apps/api/ApiAppTests.kt`
- Create: `backend/apps/api/src/test/resources/application-test.yaml`
- Modify: `backend/apps/api/src/main/resources/application.yaml`

#### Task 3 Dependencies

Task 2

- [x] **Step 1:** Run the API bootstrap test once the module is wired so the
      first real failure mode is observed instead of guessed.
- [x] **Step 2:** Add test-only configuration or test annotations that keep the
      application context loadable without requiring live PostgreSQL, Pulsar, or
      OAuth credentials.
- [x] **Step 3:** Keep those controls scoped to tests or clearly non-production
      defaults so the app still reflects the intended runtime integrations.
- [x] **Step 4:** Document any intentional exclusions or placeholder settings in
      comments or KDoc where future implementers would otherwise have to reverse
      engineer the bootstrap choices.

#### Task 3 Verification

- Run: `cd backend && ./gradlew :apps:api:test`
- Expect: `ApiAppTests` passes on its own and the context load path is stable
  without manually starting external infrastructure.

#### Task 3 Notes

- If the first failure comes from a different auto-configuration path than
  expected, update the implementation in response to the actual failure instead
  of hard-coding assumptions from this plan.
- Avoid adding embedded database or migration behavior just to satisfy the
  bootstrap test; that would drift away from ADR-001.

### Task 4: Refresh Backend Docs And Final Verification

#### Task 4 Intent

**Status:** Done

Leave the repository in a state where both humans and future agents can see how
the backend changed after `apps/api` becomes a real Spring Boot app.

#### Task 4 Files

- Modify: `backend/docs/folder-structure.md` if a short description of `api` is
  needed
- Modify: `backend/docs/gradle-setup-explain.md`
- Modify: `backend/docs/tech-stack.md`

#### Task 4 Dependencies

Task 3

- [x] **Step 1:** Update the backend folder-structure doc so `apps/api` is no
      longer just a bare placeholder, but keep the change minimal if the
      structure itself stays the same. A one-sentence description of `api` as
      the request/response app is enough.
- [x] **Step 2:** Update the Gradle setup explanation so it explicitly states
      that modules under `apps/` use `my.spring-app` and reusable modules under
      `modules/` use `my.lib`.
- [x] **Step 3:** Update the backend tech-stack page to reflect the newly
      committed API bootstrap technologies that now exist in code, regrouping
      them into clearer categories and reusing the official documentation links
      from the generated Spring Initializr `HELP.md` where practical.
- [x] **Step 4:** Run the final module-level checks and confirm the docs match
      the implemented state.

#### Task 4 Verification

- Run:

  ```sh
  cd backend && ./gradlew :apps:api:test :apps:api:bootJar
  deno fmt \
    "plans/plan-issue-5-apps-api-spring-boot-setup-20260329.md" \
    "backend/docs/folder-structure.md" \
    "backend/docs/gradle-setup-explain.md" \
    "backend/docs/tech-stack.md"
  markdownlint-cli2 --fix \
    "plans/plan-issue-5-apps-api-spring-boot-setup-20260329.md" \
    "backend/docs/folder-structure.md" \
    "backend/docs/gradle-setup-explain.md" \
    "backend/docs/tech-stack.md"
  ```

- Expect: the API module produces a boot jar, the bootstrap test passes, and the
  updated docs describe the committed backend state without formatting
  regressions.

#### Task 4 Notes

- If documentation wording uncovers a broader naming or module-boundary
  question, capture it as a follow-up issue rather than expanding this bootstrap
  task mid-flight.
- `folder-structure.md` should stay focused on structure, so avoid turning that
  page into a feature overview.

## References

<!-- markdownlint-disable MD013 -->

| Resource                                                                                                                                                                                                                                                                                                                                                                                                                                           | Description                                                                                                                                                                                                 | Other Notes if any |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| [Issue #5](https://github.com/CXwudi/nijigen-video-site/issues/5)                                                                                                                                                                                                                                                                                                                                                                                  | Primary request to set up `backend/apps/api` as a Spring Boot project and adapt it to this repository’s Gradle conventions                                                                                  | Must Read          |
| [Spring Initializr URL](https://start.spring.io/#!type=gradle-project-kotlin&language=kotlin&platformVersion=4.0.5&packaging=jar&configurationFileFormat=yaml&jvmVersion=25&groupId=io.github.cxwudi.nijigenvideosite&artifactId=apps-api&packageName=io.github.cxwudi.nijigenvideosite.apps.api&dependencies=configuration-processor,springdoc-openapi,security,oauth2-client,postgresql,jdbc,pulsar,validation,cache,actuator,opentelemetry,web) | Generated app baseline that this issue wants adapted into `backend/apps/api`                                                                                                                                | Must Read          |
| [Issue #2](https://github.com/CXwudi/nijigen-video-site/issues/2)                                                                                                                                                                                                                                                                                                                                                                                  | Original backend Gradle bootstrap issue that defines the convention-plugin and Spring BOM constraints still in force for issue `#5`                                                                         | Must Read          |
| [ref/adr/0001-project-structure-baseline.md](../adr/0001-project-structure-baseline.md)                                                                                                                                                                                                                                                                                                                                                            | Backend shape decision showing `backend/apps/api` as a real runtime app and `modules/*` as the shared-code home                                                                                             | Must Read          |
| [backend/docs/gradle-setup-explain.md](../../backend/docs/gradle-setup-explain.md)                                                                                                                                                                                                                                                                                                                                                                 | Current explanation of the version catalog, included plugin build, and convention-plugin layering that issue `#5` must preserve                                                                             | Must Read          |
| [backend/gradle/libs.versions.toml](../../backend/gradle/libs.versions.toml)                                                                                                                                                                                                                                                                                                                                                                       | Current backend version catalog and plugin coordinates, including the place to document that any BOM-managed libraries should stop carrying individual catalog versions once the BOM is the source of truth | Must Read          |
| [backend/gradle/plugins/backend/src/main/kotlin/my.spring-app.gradle.kts](../../backend/gradle/plugins/backend/src/main/kotlin/my.spring-app.gradle.kts)                                                                                                                                                                                                                                                                                           | Existing Spring app convention plugin that already applies Spring Boot, GraalVM native support, and the Spring BOM                                                                                          | Must Read          |
| [backend/gradle/plugins/backend/src/main/kotlin/my.jvm-common.gradle.kts](../../backend/gradle/plugins/backend/src/main/kotlin/my.jvm-common.gradle.kts)                                                                                                                                                                                                                                                                                           | Shared JVM defaults, Java toolchain setup, and baseline test configuration that the API app inherits                                                                                                        | Important          |
| [backend/apps/api/build.gradle.kts](../../backend/apps/api/build.gradle.kts)                                                                                                                                                                                                                                                                                                                                                                       | Current stub of the API module build file that will be expanded from a placeholder into the real Spring Boot module                                                                                         | Important          |
| [backend/modules/common/build.gradle.kts](../../backend/modules/common/build.gradle.kts)                                                                                                                                                                                                                                                                                                                                                           | Existing shared module dependency baseline, including the current Spring BOM usage outside the app module                                                                                                   | Important          |
| [backend/settings.gradle.kts](../../backend/settings.gradle.kts)                                                                                                                                                                                                                                                                                                                                                                                   | Root backend settings that include the plugin build and the current module set                                                                                                                              | Important          |
| [backend/docs/folder-structure.md](../../backend/docs/folder-structure.md)                                                                                                                                                                                                                                                                                                                                                                         | Backend layout doc that may only need a brief sentence describing what `apps/api` does if the structure itself does not change                                                                              |                    |
| [backend/docs/tech-stack.md](../../backend/docs/tech-stack.md)                                                                                                                                                                                                                                                                                                                                                                                     | Current committed tech-stack snapshot that should be regrouped and expanded with the API bootstrap technologies and docs links                                                                              |                    |
| [Spring Boot Gradle Plugin 4.0.5 Reference](https://docs.spring.io/spring-boot/4.0.5/gradle-plugin)                                                                                                                                                                                                                                                                                                                                                | Official reference for how Spring Boot expects its Gradle plugin integration to behave                                                                                                                      |                    |

<!-- markdownlint-enable MD013 -->
