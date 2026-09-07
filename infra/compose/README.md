# Docker Compose

This folder contains shared Docker Compose service bases for local development, CI, and integration testing. Production deployment platform selection is deferred; see [ADL-012](../../design-log/adl/012-defer-production-deployment.md).

- [`common-services.yml`](common-services.yml) defines reusable service bases for API runtime settings, Postgres, Redis, Flyway, etc. This file is not intended as a standalone entrypoint; it is used via `extends` from other Compose files.
- [`common-dev-services.yml`](common-dev-services.yml) defines reusable development service bases for local development and CI.

For development, testing, and tool-oriented Docker Compose files for backend and frontend, head over to the corresponding folders:

- [`/backend/docker`](../../backend/docker/)
- [`/frontend/docker`](../../frontend/docker/)
