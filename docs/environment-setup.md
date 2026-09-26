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

   It is highly recommended to configure `mise activate` in your shell profile, so that the repository's tools and environment variables are activated automatically when you enter the repository.

### `mise` tasks

This repository uses mise monorepo tasks. This is similar to Bazel.

For example, from the repository root:

```bash
cp docker/.env.example docker/.env
mise //docker:config-check
mise //docker:run --rm api :apps:api:test
mise //docker:up-full
```

From a task's own directory, use the local task name:

```bash
cd docker
mise :config-check
mise :run --rm api :apps:api:test
```

### `mise` environment variables

Root [`mise.toml`](../mise.toml) `[env]` owns environment variables used across the whole monorepo. So far only some runtime versions are set this way.

Those values are exported by shell activation, `mise exec`, and mise tasks.
To change a major version, update `[env]` in the root `mise.toml`.

Environment variables set by root [`mise.toml`](../mise.toml) have higher priority than `.env` / `.env.example` files.

Docker configuration lives in the untracked `docker/.env`. Mise Docker tasks detect the current host UID/GID unless explicitly exported, and consistently resolve the Gradle cache directory. For direct Compose runs, set `HOST_UID` and `HOST_GID` in that env file to the host user's values and supply the runtime versions through mise. The default ports are API `8080`, web `5173`, PostgreSQL `5432`, and Redis `6379`.

For a custom Gradle cache path in mise tasks, export `HOST_GRADLE_USER_HOME`; otherwise the wrapper uses `GRADLE_USER_HOME` or `$HOME/.gradle`. Setting that path only in `docker/.env` applies to direct Compose invocations, since the wrapper exports its host-resolved path before calling Compose.

## Unified Environment by Docker Compose

One Compose entrypoint manages a shared development project for the whole repository.

Local development, CI, and integration testing share Docker Compose service bases to keep their environments consistent. Production deployment platform selection is deferred.

Specifically:

- [`docker/compose.yml`](../docker/compose.yml) explicitly declares the stack and its profiles.
- [`docker/common-services.yml`](../docker/common-services.yml) defines reusable service bases.
- Local development defaults to project `nijigen-video-site`; CI overrides `COMPOSE_PROJECT_NAME` per workflow run and job. Separate worktrees can also override the project name and host ports.

See [`Docker Setup Explain`](docker-setup-explain.md) for more explanation.
