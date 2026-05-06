# Docker Compose

This folder contains shared and production-oriented Docker Compose files.

- [`common-services.yml`](common-services.yml) defines reusable service bases for
  API runtime settings, Gradle-backed API runs, Postgres, Redis, and Flyway.
- [`compose.prod.yml`](compose.prod.yml) is the production-like stack entrypoint.

Local component workflows are owned by each component. Backend and frontend
local Docker commands live under their component `docker/` folders.
