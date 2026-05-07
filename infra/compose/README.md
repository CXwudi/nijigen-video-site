# Docker Compose

This folder contains shared and production-oriented Docker Compose files.

- [`common-services.yml`](common-services.yml) defines reusable service bases for API runtime settings, Postgres, Redis, Flyway, etc. This file is not intended as a standalone entrypoint; it is used via `extends` from other Compose files.
- [`gradle-services.yml`](gradle-services.yml) defines reusable Gradle-backed service bases for local development and CI.
- [`compose.prod.yml`](compose.prod.yml) is the production-like stack entrypoint.
- [`mise.toml`](mise.toml) defines production-like Compose tasks that use `prod.env`.
- [`prod.env.example`](prod.env.example) is the production deployment env template. Copy it to ignored `prod.env` and replace credentials before launching.
- [`.env.example`](.env.example) keeps local/manual example values.

For development, testing, and tool-oriented Docker Compose files for backend and frontend, head over to the corresponding folders:

- [`/backend/docker`](../../backend/docker/)
- [`/frontend/docker`](../../frontend/docker/)
