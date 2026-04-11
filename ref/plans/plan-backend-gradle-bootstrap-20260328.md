# Backend Gradle Bootstrap Implementation Plan

<!-- markdownlint-disable MD024 -->

> **For agentic workers:** Use the harness's preferred task-tracking and
> delegation tools when available. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Bootstrap `backend/` as a multi-module Gradle project with shared
version management, convention plugins, and the first `apps/api` and
`modules/common` modules.

**Source of Truth:** GitHub issue #2 plus the approved backend documentation
baseline spec, with ADR-001 used only as contextual input for repo and backend
boundaries.

**Scope:** Includes the backend Gradle wrapper and root build files,
`gradle/libs.versions.toml`, the unified `gradle/plugins` composite build for
all precompiled script plugins, a generated version-catalog helper module, one
backend convention plugin module exposing `my.jvm-common`, `my.lib`, and
`my.spring-app`, one settings plugin for Develocity and Foojay, and the first
`apps/api` and `modules/common` backend modules, plus the initial backend docs
baseline under `backend/docs/`. Excludes business logic, database setup, a
worker placeholder or runtime, and any frontend or infra work.

**Approach:** Use `gradle init` only to bootstrap the wrapper and basic Kotlin
DSL files inside `backend/`, then reshape the generated scaffold into the
ADR-aligned multi-module layout. Keep all internal plugin infrastructure inside
the unified `backend/gradle/plugins/` composite build, keep
`gradle/libs.versions.toml` as the single source of truth for versions,
dependencies, and plugin coordinates, and use a generated Kotlin helper module
so precompiled script plugins can consume those coordinates without reading the
TOML file directly. For the documentation task, follow the approved backend docs
baseline spec by keeping `backend/README.md` short and putting the detail into
focused docs under `backend/docs/`.

**Verification:** Validate the integrated setup by running Gradle from
`backend/` to confirm project discovery, included builds, plugin application,
and dependency resolution, then verify the backend docs surfaces describe the
implemented skeleton accurately. Do not add bootstrap application source code
yet; verification should stop at the Gradle skeleton and documentation baseline
level for this first pass.

---

## Planned Target Layout

The backend tree should end up roughly like this:

```text
backend/
├─ settings.gradle.kts
├─ build.gradle.kts
├─ gradle.properties
├─ gradlew
├─ gradlew.bat
├─ gradle/
│  ├─ wrapper/
│  ├─ libs.versions.toml
│  └─ plugins/
│     ├─ settings.gradle.kts
│     ├─ build.gradle.kts
│     ├─ version-catalog/
│     │  └─ build.gradle.kts
│     ├─ backend/
│     │  ├─ build.gradle.kts
│     │  └─ src/main/kotlin/
│     │     ├─ my.jvm-common.gradle.kts
│     │     ├─ my.lib.gradle.kts
│     │     └─ my.spring-app.gradle.kts
│     └─ settings/
│        ├─ build.gradle.kts
│        └─ src/main/kotlin/
│           └─ my.root-settings-plugins.settings.gradle.kts
├─ apps/
│  └─ api/
│     ├─ build.gradle.kts
│     └─ src/
└─ modules/
   └─ common/
      ├─ build.gradle.kts
      └─ src/
```

## Confirmed Decisions

- Keep this bootstrap limited to `apps/api` and `modules/common`.
- Keep the settings plugin inside the unified `backend/gradle/plugins/`
  composite build.
- Keep this pass at the Gradle skeleton level only, without adding a minimal
  Spring Boot application class yet.
- Treat `foojar` in the issue as
  `org.gradle.toolchains.foojay-resolver-convention`.
- Keep the plugin build simpler than the fully decomposed `mixin/` and
  `convention/` split used by `modern-gradle-template-simplified`, because issue
  #2 explicitly asks for one `backend` plugin module plus one `version-catalog`
  module.

### Task 1: Bootstrap the Backend Root Gradle Build

#### Intent

Create the `backend/` Gradle wrapper and root build files, then reshape the
generated scaffold into the monorepo-friendly backend root expected by ADR-001.

#### Files

- Create: `backend/settings.gradle.kts`
- Create: `backend/build.gradle.kts`
- Create: `backend/gradle.properties`
- Create: `backend/gradle/libs.versions.toml`
- Create: `backend/gradle/wrapper/gradle-wrapper.jar`
- Create: `backend/gradle/wrapper/gradle-wrapper.properties`
- Create: `backend/gradlew`
- Create: `backend/gradlew.bat`

#### Dependencies

None

- [x] **Step 1:** Run `gradle init` inside `backend/` to generate the wrapper
      and Kotlin DSL root files, using it only as a bootstrap step rather than
      the final layout generator.
- [x] **Step 2:** Replace any irrelevant generated sample project content with a
      lightweight root build that only declares globally shared plugin aliases
      and leaves real configuration to convention plugins.
- [x] **Step 3:** Configure `backend/settings.gradle.kts` with the root project
      name, repositories, version catalog import, included builds for the plugin
      infrastructure, and explicit module includes for `apps/api` and
      `modules/common`.
- [x] **Step 4:** Populate `backend/gradle/libs.versions.toml` with Java 25,
      Kotlin 2.3.20, Spring Boot, GraalVM native build tools, JUnit, MockK,
      Develocity, Foojay, and any plugin dependencies or BOM coordinates needed
      by the convention plugins.

#### Verification

- Run: `cd backend && ./gradlew help`
- Run: `cd backend && ./gradlew projects`
- Expect: Gradle resolves the shared version catalog, discovers the included
  plugin build(s), and lists `:apps:api` and `:modules:common` once they are
  added.

#### Notes

- The issue explicitly says the version catalog TOML is the single source of
  truth, so no duplicate version declarations should remain in root build files
  after bootstrapping.

### Task 2: Build the Composite Plugin Infrastructure

#### Intent

Create the internal Gradle build that houses reusable precompiled script plugins
and the generated version-catalog access layer.

#### Files

- Create: `backend/gradle/plugins/settings.gradle.kts`
- Create: `backend/gradle/plugins/build.gradle.kts`
- Create: `backend/gradle/plugins/version-catalog/build.gradle.kts`
- Create: `backend/gradle/plugins/backend/build.gradle.kts`
- Create: `backend/gradle/plugins/settings/build.gradle.kts`

#### Dependencies

Task 1

- [x] **Step 1:** Configure `backend/gradle/plugins/settings.gradle.kts` to
      import `../libs.versions.toml` as a `libs` catalog and auto-include the
      plugin submodules that belong to this internal build.
- [x] **Step 2:** Create `version-catalog/build.gradle.kts` using
      `embedded-kotlin` and `com.github.gmazzo.buildconfig`, following the
      `realworld-cmp-decompose-mvikotlin-app` pattern so generated Kotlin
      objects expose selected versions, libraries, and BOM coordinates to other
      plugin modules.
- [x] **Step 3:** Create `backend/build.gradle.kts` with `kotlin-dsl` and
      dependencies on `:version-catalog` plus the plugin artifacts needed to
      apply Kotlin, Spring Boot, and GraalVM from precompiled script plugins.
- [x] **Step 4:** Create the settings plugin module with `kotlin-dsl` and
      dependencies on the Develocity and Foojay resolver plugin artifacts, then
      add the precompiled `*.settings.gradle.kts` script that applies them.

#### Verification

- Run: `cd backend && ./gradlew help`
- Expect: The main build can resolve the included plugin build and the settings
  plugin applies without unresolved plugin versions.

#### Notes

- Unlike the older `dev-version-constraints` approach from
  `modern-gradle-template-simplified`, this bootstrap should not add a separate
  platform build just to feed versions into precompiled script plugins.

### Task 3: Implement the Backend Precompiled Script Plugins

#### Intent

Encode the backend build conventions once so the first modules can stay small
and declarative.

#### Files

- Create:
  `backend/gradle/plugins/backend/src/main/kotlin/my.jvm-common.gradle.kts`
- Create: `backend/gradle/plugins/backend/src/main/kotlin/my.lib.gradle.kts`
- Create:
  `backend/gradle/plugins/backend/src/main/kotlin/my.spring-app.gradle.kts`

#### Dependencies

Task 2

- [x] **Step 1:** Implement `my.jvm-common` to apply Java and Kotlin JVM,
      configure Java 25 toolchains, enable `-parameters`, apply shared Kotlin
      compiler flags, and add baseline test dependencies such as JUnit and
      MockK.
- [x] **Step 2:** Implement `my.lib` to apply `my.jvm-common`, add
      `java-library` conventions such as `withSourcesJar()`, and keep any
      library-specific dependency wiring focused on reusable modules.
- [x] **Step 3:** Implement `my.spring-app` to apply `my.jvm-common`, apply the
      Spring Boot and GraalVM plugins, avoid the Spring dependency-management
      plugin, and instead attach the Spring BOM to the `implementation` and
      `annotationProcessor` configurations.
- [x] **Step 4:** Keep plugin scripts dependent on generated version-catalog
      constants instead of attempting to read the TOML file directly from the
      precompiled script layer.

#### Verification

- Run: `cd backend && ./gradlew tasks`
- Run: `cd backend && ./gradlew :apps:api:tasks --all`
- Expect: The custom plugin ids resolve and the Spring application module
  exposes Boot-related tasks without duplicate or ad hoc configuration in the
  module build file.

#### Notes

- Because issue #2 asks for a single `backend` plugin module, the three plugin
  scripts should live together under one module unless the user explicitly asks
  for a more decomposed layout later.

### Task 4: Create the Initial Backend Modules

#### Intent

Apply the new conventions to the first real backend modules and prove the setup
is usable beyond the plugin build itself.

#### Files

- Create: `backend/apps/api/build.gradle.kts`
- Create: `backend/modules/common/build.gradle.kts`
- Optional Create: `backend/apps/api/src/main/...`
- Optional Create: `backend/modules/common/src/main/...`

#### Dependencies

Task 3

- [x] **Step 1:** Add `backend/apps/api` and `backend/modules/common` to the
      root settings include list using the desired project path style.
- [x] **Step 2:** Configure `apps/api/build.gradle.kts` to apply
      `my.spring-app`, depend on `:modules:common`, and declare only
      module-local dependencies that are truly specific to the API runtime.
- [x] **Step 3:** Configure `modules/common/build.gradle.kts` to apply `my.lib`,
      add the Spring BOM to `implementation` as requested by issue #2, and keep
      it ready for shared domain or infrastructure helpers.
- [x] **Step 4:** Keep these modules as Gradle skeletons only for now, which
      means creating the module directories and build files without adding
      placeholder runtime source code yet.

#### Verification

- Run: `cd backend && ./gradlew :modules:common:tasks --all`
- Run: `cd backend && ./gradlew :apps:api:tasks --all`
- Run:
  `cd backend && ./gradlew :apps:api:dependencies --configuration implementation`
- Expect: Both modules configure successfully as empty Gradle skeletons, the API
  module uses the custom app plugin, and the common module resolves the Spring
  BOM through its `implementation` configuration.

#### Notes

- `apps/worker` is intentionally deferred to a later issue even though ADR-001
  reserves it in the long-term backend shape.

### Task 5: Create the Backend Docs Baseline

#### Intent

Create the minimum backend-specific documentation set defined by the approved
spec: two focused backend docs, a backend docs index, and a short backend
landing page.

#### Files

- Create: `backend/docs/tech-stack.md`
- Create: `backend/docs/folder-structure.md`
- Modify: `backend/docs/README.md`
- Modify: `backend/README.md`
- Optional Modify: `docs/README.md`

#### Dependencies

Task 4 plus `ref/spec/spec-backend-docs-baseline-20260328.md`

- [x] **Step 1:** Update `backend/README.md` so it stays a short landing page
      that links readers into `backend/docs/` instead of carrying the detailed
      backend reference content itself.
- [x] **Step 2:** Update `backend/docs/README.md` to act as the backend docs
      index and link to `tech-stack.md` and `folder-structure.md` with brief
      descriptions of each document.
- [x] **Step 3:** Create `backend/docs/tech-stack.md` to describe the current
      committed backend stack and build conventions only, including the version
      catalog, Kotlin/JVM setup, Spring Boot, GraalVM native tooling, and the
      precompiled plugin approach already present in the codebase.
- [x] **Step 4:** Create `backend/docs/folder-structure.md` to describe the
      current backend layout only, including the root Gradle build, the internal
      `gradle/plugins` composite build, `apps/api`, and `modules/common`, while
      avoiding speculative documentation for not-yet-implemented modules such as
      `apps/worker`.
- [x] **Step 5:** Re-check `docs/README.md` and only update it if the existing
      backend docs entry becomes inaccurate after the backend documentation
      files are added.

#### Verification

- Run:

  ```sh
  rg -n "backend/docs|tech-stack|folder-structure" \
    backend/README.md backend/docs/README.md docs/README.md
  ```

- Expect: The backend landing page and docs indexes point to the new backend
  docs, and the root docs index remains accurate.
- Expect: A new contributor can read `backend/docs/tech-stack.md` and
  `backend/docs/folder-structure.md` to understand the implemented backend
  skeleton without reading Gradle files first.
- Expect: The folder-structure doc describes the current backend skeleton and
  does not present reserved future modules as already implemented.

#### Notes

- `backend/README.md` should stay short and navigation-oriented.
- `backend/docs/tech-stack.md` and `backend/docs/folder-structure.md` should be
  grounded in the current codebase, not in future plans.
- For documentation layout, follow `docs/README.md` and the approved spec rather
  than the older documentation tree example shown in ADR-001.

## References

<!-- list of references, such as files, urls, or other resources -->

<!-- markdownlint-disable MD013 -->

| Resource                                                                                                                                                                                                                                                                                                         | Description                                                                                                                               | Other Notes if any |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| [spec/spec-backend-docs-baseline-20260328.md](../spec/spec-backend-docs-baseline-20260328.md)                                                                                                                                                                                                                    | Approved spec defining the Task 5 backend documentation baseline, deliverables, and layout rules.                                         | Must Read          |
| [ADR-001](../adr/0001-project-structure-baseline.md)                                                                                                                                                                                                                                                             | Accepted project structure baseline defining backend as a split-root Gradle workspace with `apps/api`, `apps/worker`, and shared modules. | Must Read          |
| [Issue #2: Gradle Init](https://github.com/CXwudi/nijigen-video-site/issues/2)                                                                                                                                                                                                                                   | Primary implementation requirements for the backend Gradle bootstrap, convention plugins, version-catalog helper, and initial modules.    | Must Read          |
| [modern-gradle-template-simplified/settings.gradle.kts](https://github.com/CXwudi/modern-gradle-template-simplified/blob/main/settings.gradle.kts)                                                                                                                                                               | Reference for composite-build wiring, version-catalog import, and root settings plugin application.                                       | Important          |
| [modern-gradle-template-simplified/gradle/plugins/settings.gradle.kts](https://github.com/CXwudi/modern-gradle-template-simplified/blob/main/gradle/plugins/settings.gradle.kts)                                                                                                                                 | Reference for auto-including submodules inside the internal plugin build.                                                                 |                    |
| [modern-gradle-template-simplified/gradle/settings/root-settings-plugins/src/main/kotlin/my.root-settings-plugins.settings.gradle.kts](https://github.com/CXwudi/modern-gradle-template-simplified/blob/main/gradle/settings/root-settings-plugins/src/main/kotlin/my.root-settings-plugins.settings.gradle.kts) | Reference for wrapping Develocity and Foojay inside a precompiled settings plugin.                                                        | Important          |
| [modern-gradle-template-simplified/gradle/plugins/mixin/kotlin-jvm/src/main/kotlin/my/mixin/kotlin-jvm.gradle.kts](https://github.com/CXwudi/modern-gradle-template-simplified/blob/main/gradle/plugins/mixin/kotlin-jvm/src/main/kotlin/my/mixin/kotlin-jvm.gradle.kts)                                         | Reference for JVM-wide toolchain, compiler flag, and shared test dependency conventions.                                                  |                    |
| [modern-gradle-template-simplified/gradle/plugins/mixin/lib/src/main/kotlin/my/mixin/lib.gradle.kts](https://github.com/CXwudi/modern-gradle-template-simplified/blob/main/gradle/plugins/mixin/lib/src/main/kotlin/my/mixin/lib.gradle.kts)                                                                     | Reference for library-specific conventions that inform `my.lib`.                                                                          |                    |
| [modern-gradle-template-simplified/gradle/plugins/mixin/app/src/main/kotlin/my/mixin/app.gradle.kts](https://github.com/CXwudi/modern-gradle-template-simplified/blob/main/gradle/plugins/mixin/app/src/main/kotlin/my/mixin/app.gradle.kts)                                                                     | Reference for application-specific conventions that inform `my.spring-app`.                                                               |                    |
| [realworld-cmp-decompose-mvikotlin-app/build-src/plugins/settings.gradle.kts](https://github.com/CXwudi/realworld-cmp-decompose-mvikotlin-app/blob/master/build-src/plugins/settings.gradle.kts)                                                                                                                 | Reference for importing a shared `libs.versions.toml` into the internal plugin build.                                                     | Important          |
| [realworld-cmp-decompose-mvikotlin-app/build-src/plugins/version-catalog-util/build.gradle.kts](https://github.com/CXwudi/realworld-cmp-decompose-mvikotlin-app/blob/master/build-src/plugins/version-catalog-util/build.gradle.kts)                                                                             | Reference for generating Kotlin constants from the version catalog so precompiled plugins can consume version and library coordinates.    | Must Read          |

<!-- markdownlint-enable MD013 -->
