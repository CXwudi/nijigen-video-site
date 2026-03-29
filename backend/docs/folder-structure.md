# Backend Folder Structure

This document describes the backend structure that is currently implemented in
the repository.

## Current Layout

```text
backend/
|
├─ README.md
|
├─ apps/
│  └─ api/
|
├─ modules/
│  └─ common/
|
├─ docs/
|
├─ gradle/
│  ├─ libs.versions.toml
│  ├─ plugins/
│  │  ├─ backend/
│  │  ├─ settings/
│  │  ├─ version-catalog/
│  │  ├─ build.gradle.kts
│  │  └─ settings.gradle.kts
│  └─ wrapper/
|
└─ ... root-level Gradle files ...
```

## Top-Level Roles

This page focuses on the backend folder shape.

For Gradle-specific setup details, see
[Gradle Setup Explanation](gradle-setup-explain.md).

### `README.md`

The backend landing page. It should stay short and point readers into
`backend/docs/`.

### `apps/`

Holds backend runtime entrypoint modules.

Currently implemented:

- `api/` request/response Spring Boot application for the backend HTTP API

### `docs/`

Holds backend-specific documentation.

### `gradle/`

Holds shared Gradle assets for the backend workspace.

Inside `gradle/`:

- `libs.versions.toml` shared version catalog
- `plugins/` internal Gradle plugin build
- `wrapper/` Gradle wrapper distribution files

### `modules/`

Holds reusable backend modules that can be shared across apps.

Currently implemented:

- `common/`

### Root-Level Gradle Files

- `gradlew` and `gradlew.bat` backend Gradle wrapper scripts
- `settings.gradle.kts` root Gradle settings file
- `build.gradle.kts` root Gradle build file
- `gradle.properties` backend-wide Gradle properties file

## Notes

More modules will likely be added in the near future.
