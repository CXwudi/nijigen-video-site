# Docker Setup Explain

This document explains the Docker setup in this repository.
Docker Compose is used for local development, CI, and integration testing only. Production deployment platform selection is deferred.

## Unification by `extends` keyword

[`docker/compose.yml`](../docker/compose.yml) is the only stack entrypoint. It defines the API service directly and imports reusable dependency and pnpm definitions from [`docker/common-services.yml`](../docker/common-services.yml) using `extends`:

- You can still modify any field from extended services.
- The entrypoint explicitly declares every service and top-level volume it uses.
- Service definitions share image settings and dependencies without creating separate frontend and backend projects.

Profiles select services within the same project. They do not create isolated environments or inherit other profiles. API and web-init therefore belong to every scenario that needs them. The default project name is `nijigen-video-site`, with no fixed container names or globally named volumes.

## Application Services Setup

Each application service, for example, the `api` service on the backend side.
There are 3 scenarios we need to support:

1. Developers running commands, like gradle task or pnpm run
2. CI running tests
3. Temporarily bring up the stack

All 3 scenarios reduce to running a build tool command, whether it is a Gradle task, a pnpm command, a test command, or a server launch command.

So, each application service, for example, the `api` service on the backend side, is designed around being able to run any build tool command. Hence the service is set up as:

1. Mount the source code
2. Mount directories that are worth caching. E.g. `~/.gradle` for Gradle, so that we can reuse caches in CI
    - The frontend uses named volumes because pnpm relies on symlinks.
3. Since source code is mounted, the image uses a standard public development image. The API uses the non-hardened Liberica Native Image Kit JDK image to satisfy the backend's native-image-capable Gradle toolchain. Hardened application images in `backend/Dockerfile` are separate and are not used by Compose.
4. Since source code is mounted, the user ID and group ID should match the host
5. The `entrypoint` will use the build tool command. E.g. `./gradlew --no-daemon` for backend services
6. The `command` defaults to the launch command. E.g. `:apps:api:bootRun` for the API service to make `./gradlew --no-daemon :apps:api:bootRun`

## Q&A

### For just running any build tool command, why not have a Dockerfile simply copy the source code

Possible, but this is cumbersome to maintain vs mounting the source code directly.

But even so, we still need to mount cache folders like `~/.gradle` to improve CI performance. Then why not just mount the source code altogether.

### Could it be case where developer want to run a command not from the build tool? And even worse, a command/tool not available in the image?

We could use a Dockerfile to add more tools.

But remember, mounting the source code also means mounting the `mise.toml` file. So `mise trust` and `mise install` are enough to set up the tools needed in the image.
