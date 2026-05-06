# Docker Compose

This folder contains shared and production-oriented Docker Compose files.

- [`common-services.yml`](common-services.yml) defines reusable service bases for
  API runtime settings, Gradle-backed API runs, Postgres, Redis, Flyway, and etc.
  This file itself is launchable, only being used by `extends` from other Compose files.
- [`compose.prod.yml`](compose.prod.yml) is the production-like stack entrypoint.

Backend and frontend have their own
Docker Compose files extending from the `common-services.yml` file.

<!-- TODO: add link to the documentation to both frontend and backend -->
