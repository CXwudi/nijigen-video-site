# Docker Compose

This folder contains shared and production-oriented Docker Compose files.

- [`common-services.yml`](common-services.yml) defines reusable service bases for
  API runtime settings, Gradle-backed API runs, Postgres, Redis, Flyway, and etc.
  This file itself is launchable, only being used by `extends` from other Compose files.
- [`compose.prod.yml`](compose.prod.yml) is the production-like stack entrypoint.

For development, testing and tool oriented Docker Compose files for Backend and frontend,
head over to the cooresponding folders:

- [`/backend/docker`](../../backend/docker/)
- [`/frontend/docker`](../../frontend/docker/)
