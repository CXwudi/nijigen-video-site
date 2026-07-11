# Environment Setup

Before any development work, make sure to have:

1. mise
1. docker
1. (For Windows) git-bash or MSYS2 bash
   - Make sure `PATH` resolves `bash` to git-bash or MSYS2 bash, not `C:\Windows\System32\bash.exe`. Use `Get-Command bash` in PowerShell to check which executable `bash` resolves to.
   - All mise tasks are written for bash. PowerShell is not supported for running tasks.
   - You can still use PowerShell to run docker commands or mise commands other than mise tasks

## mise-en-place

`mise` manages the rest of the tools needed for development, and also set necessary environment variables.
See [`mise.toml`](../mise.toml) for more details of the setup.

### `mise install`

From the repository root, assuming mise is installed:

1. For the first time, trust the repo configuration:

   ```bash
   mise trust
   ```

1. Install the declared tools:

   ```bash
   mise install
   ```

   It is highly recommended to configure `mise activate` in your shell profile, so that `mise install` will be run automatically when you enter the repository.

### `mise` tasks

This repository uses mise monorepo tasks. This is similar to Bazel.

For example, from the repository root:

```bash
mise //backend/docker:config-check
mise //backend/docker:run --rm api :apps:api:test
mise //frontend/docker:config-check
```

From a task's own directory, use the local task name:

```bash
cd backend/docker
mise :config-check
mise :run --rm api :apps:api:test
```

### `mise` envrionment variables

mise also manage some environment variables.
So far only some runtime versions (JDK, node, pnpm) are managed by environment variables, to be used in Dockerfile and docker compose

## Unified Environment by Docker Compose

One thing this project is proud of is the unified environment setup by Docker Compose.

Development, CI, and production all share the same Docker Compose setup, ensuring consistency across all environments and eliminating environmental surprises.

Specifically:

- [`infra/compose/common-services.yml`](../infra/compose/common-services.yml) defines reusable service bases
- All other Docker Compose files build on top of the common services

See [`Docker Setup Explain`](docker-setup-explain.md) for more explanation.
