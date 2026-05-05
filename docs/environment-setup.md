# Environment Setup

Before any development work, make sure to have:

1. mise
1. docker
1. git-bash for Windows users (Do not use PowerShell, all just recipes are
   written for bash)

`mise` manages the rest of the tools needed for development. See
[`.mise.toml`](../.mise.toml) for the complete tool list.

## `mise install`

From the repository root, assuming mise is installed:

1. For the first time, trust the repo configuration:

   ```bash
   mise trust
   ```

1. Install the declared tools:

   ```bash
   mise install
   ```

   If `mise activate` is configured in your shell profile, this step is run
   automatically when you enter the repository.

## Unified Environment by Docker Compose

Docker Compose configuration is split by responsibility:

- backend local development lives in [`../backend/docker/`](../backend/docker/)
- shared Compose service bases and production-like Compose live in
  [`../infra/compose/`](../infra/compose/)

For backend local work, copy the backend Docker environment example and use the
backend Just module:

```bash
cp backend/docker/.env.example backend/docker/.env
just backend docker up
just backend docker up-backend
just backend docker run --rm api :apps:api:test
```
