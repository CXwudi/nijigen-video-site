# Docker Compose

This folder contains the Docker Compose setup for the whole project, including
both frontend and backend, including dev.

One proud thing about this project is the unified Docker Compose env across dev,
CI and prod, by utilizing the `extends` feature of Docker Compose.

Common setup is declared in [`common-services.yml`](common-services.yml), shared
by other compose files, with field-level overriding possibilities.
