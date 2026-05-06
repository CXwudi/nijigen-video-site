# Environment Setup

Before any development work, make sure to have:

1. mise
1. docker
1. git-bash for Windows users (Do not use PowerShell, all just recipes are
   written for bash)

`mise` manages the rest of the tools needed for development. See
[`mise.toml`](../mise.toml) for the complete tool list.

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

One of the proud thing in this project is the unified environment setup by Docker Compose.

Development, CI, and production all share the same Docker Compose setup, ensuring consistency across all environments, eliminating environmental suprises.

Specifically:

- [`infra/compose/common-services.yml`](../infra/compose/common-services.yml) defines reusable service bases
- All other Docker Compose files build on top of the common services
