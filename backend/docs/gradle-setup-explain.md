# Backend Gradle Setup Explanation

This document explains how the backend Gradle workspace is currently organized.

## Root Build

The backend root is intentionally thin:

- `settings.gradle.kts` defines the backend workspace, includes the current
  modules, and includes the internal plugin build at `gradle/plugins`
- `build.gradle.kts` keeps the root project lightweight and only declares shared
  plugin aliases
- `gradle.properties` holds backend-wide Gradle runtime settings

## Version Catalog

`gradle/libs.versions.toml` is the source of truth for:

- shared versions
- dependency coordinates
- plugin coordinates

The catalog is shared by the main backend build and the internal plugin build.
When a BOM is cataloged, it becomes the source of truth for the versions it
manages, so those libraries should not also get individual catalog entries.

## Internal Plugin Build

The backend uses an included build at `gradle/plugins/` for shared Gradle logic.

That internal build contains:

- `version-catalog/` generates Kotlin constants under `my.catalog` so
  precompiled script plugins can consume catalog values from the TOML file. This
  is a workaround for
  [gradle/gradle#15383](https://github.com/gradle/gradle/issues/15383)
- `backend/` contains the backend convention plugins used by backend modules
- `settings/` contains the backend settings plugin used by the root settings
  file

## Convention Plugins

The current backend convention plugins are:

- `my.jvm-common` shared JVM build defaults, Java toolchain setup, and shared
  test setup
- `my.lib` reusable library-module conventions layered on top of `my.jvm-common`
- `my.spring-app` application-module conventions layered on top of
  `my.jvm-common`, plus the Kotlin Spring plugin, Spring Boot, GraalVM native
  support, and the Spring BOM

The backend settings plugin is:

- `my.root-settings-plugins` wraps the Develocity and Foojay settings plugins
  for backend settings

In the current backend workspace:

- modules under `apps/` use `my.spring-app`
- reusable modules under `modules/` use `my.lib`

## Build Environment

The current backend Gradle setup also includes a few project-specific choices:

- project repositories inside subprojects are disallowed
- build scan publishing only happens when `CI` is present
- the Gradle heap is capped at `6g`

## Notes

Configuration cache is currently enabled in `gradle.properties`. If native build
tooling issues show up later, that setting can be revisited there.
