# Environment Setup

Before any development work, make sure to have:

1. mise
1. docker
1. git-bash for Windows users (Do not use PowerShell, all just recipes are
   written for bash)

`mise` will manage the rest of the tools needed for development, see
[`.mise.toml`](../.mise.toml) for the complete list.

## `mise install`

From the repository root, assuming mise is installed:

1.For the first time , trust the repo configuration:

   ```bash
   mise trust
   ```

1. Install the declared tools:

   ```bash
   mise install
   ```

   If you have configured `mise activate` in your shell profile,
   this step is automatically run when you enter the repository.

## Unified Environment by Docker Compose

The repo contains a sophisticated Docker Compose setup that unified the
environment for local development, CI/CD, and production deployment.

See [`../infra/compose/`](../infra/compose/).
