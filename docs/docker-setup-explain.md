# Docker Setup Explain

This document explains the Docker setup in this repository.
Docker Compose is only used for local development/testing, running command line, or CI only. Production deployment does not use Docker Compose.

## Unification by `extends` keyword

There are many ways to share configuration in Docker Compose files, but we specifically choose `extends` keywords because:

- Requires the caller Docker Compose file to explicitly declares every service and top-level volume it uses. (The main reason! make it explicit)
- You can still modify any field from extended services.

## Application Services Setup

A mise task called `run` was designed to run any single command given a fixed entrypoint. Application services such as `backend-app-api` from the backend and `frontend-app-web` from the frontend, can benefit from this to call any `./gradlew` or `pnpm` command. Hence reaching the support of all 3 following within a single service:

- development commands
- commands ran by CI
- or simply bring up the stack.

However, how this is setup are very different between backend gradle and frontend pnpm.

| Setup | Backend application (Gradle) | Frontend application (pnpm) |
| --- | --- | --- |
| Image | Upstream non-hardened Liberica Native Image Kit JDK; no application-image build | Dependency image built from [`frontend/Dockerfile`](../frontend/Dockerfile) |
| Source bind mount | `backend/` → `/workspace/backend` | `frontend/` → `/workspace/frontend` |
| Dependency storage | Host Gradle user home → `/gradle-home` | Docker named volumes for the pnpm store, workspace-root `node_modules`, and application-project `node_modules` |
| Preparation | Gradle resolves dependencies and builds from the mounted source | The image preinstalls dependencies; an initialization service adjusts volume ownership |
| Entrypoint | `./gradlew --no-daemon` | `pnpm` |
| Application command pattern | `:apps:<application>:bootRun` | `--filter <application> dev --host 0.0.0.0` |

For Gradle, [`docker/compose.sh`](../docker/compose.sh) finds the host gradle cache directory from `HOST_GRADLE_USER_HOME`, then `GRADLE_USER_HOME`, then `$HOME/.gradle`. Compose bind-mounts that directory at `/gradle-home` and sets the container's `GRADLE_USER_HOME` accordingly. This bind-mounting helps the container to reuse gradle cache from host to speed up gradle commands. The container also runs as `HOST_UID:HOST_GID` so it does not create root-owned source or cache files.

For pnpm, `node_modules` contains links into a virtual store. Rather than sharing the host's pnpm store or `node_modules`, this setup builds container dependencies into an image and keeps their directory layout in Docker volumes:

1. The dependency-image stages install the configured Node.js runtime and copy the workspace manifests, lockfile, and pnpm configuration. They run `pnpm fetch`, then `pnpm install --offline --frozen-lockfile`. This prepares the toolchain and dependencies, not the application source or a production server bundle.
2. Empty named volumes are initialized from the corresponding image directories. A frontend application uses the pnpm store at `/pnpm/store`, workspace-root dependencies at `/workspace/frontend/node_modules`, and dependencies under its own project's `node_modules` directory.
3. A one-off initialization service mounts those volumes and runs as root only to create directories and set their ownership to `HOST_UID:HOST_GID`. It does not install dependencies or populate host `node_modules`.
4. The application service bind-mounts the live frontend workspace and mounts the dependency volumes over the workspace-root and application-project `node_modules` paths. This keeps the image-prepared dependencies accessible despite the source mount, without using host-installed packages. The pnpm command then runs as `HOST_UID:HOST_GID` and selects the application with `--filter`.

CI follows the same separation: Gradle caching restores the runner's host cache directory before it is mounted into the backend application service, while the frontend dependency-image build reuses BuildKit layers and seeds fresh dependency volumes for the job's Compose project. See [`docker/README.md`](../docker/README.md) for the startup, one-off command, and cleanup tasks.

## Q&A

### For just running any build tool command, why not have a Dockerfile simply copy the source code

Copying all source into an image would require rebuilding that image for source changes. Application services instead bind-mount their build workspace so edits are available immediately.

Gradle can use the upstream JDK image with the mounted workspace and host cache. pnpm uses a Dockerfile to prepare its runtime and dependencies, but Compose targets the dependency-image stage, before the stage that copies all source and builds an application. Source-only edits therefore do not require rebuilding the dependency image.

### Could it be case where developer want to run a command not from the build tool? And even worse, a command/tool not available in the image?

Override the application service's entrypoint to use a tool already available in the image. The command pattern is `mise //docker:run --rm --entrypoint sh <application-service> -c 'pwd'`.

If a required tool is missing, add it through an appropriate Dockerfile and use that image in Compose. Mise runs on the host to provide configuration and invoke Compose; mounting a `mise.toml` file does not install mise or its tools inside a container.
