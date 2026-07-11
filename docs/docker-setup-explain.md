# Docker Setup Explain

This document explains the Docker setup in this repository.
For more info, see [`ADL-0004: Component-Owned Docker Modules with Shared Compose Service Bases`](../design-log/adl/004-component-owned-docker-modules.md).
However, over time, this ADL may become outdated. Always use this document as the source of truth.

## Unification by `extends` keyword

There are multiple ways to reuse services in Docker Compose, but the `extends` keyword is chosen for:

- You can still modify any field from extended services.
- Enforce the caller Compose file to explicitly declare all the services it uses.
  - This helps both developers and AI agents understand what will be launched, which is less clear with override Compose files or `include`.
  - This also means some redundant declarations in each caller, but we accept that tradeoff for clarity.

`extends` works extremely well for dependencies like Postgres and Redis.
For application services, things are more complicated.

## Application Services Setup

Each application service, for example, the `api` service on the backend side.
There are 4 scenarios we need to support:

1. Developers running commands, like gradle task or pnpm run
2. CI running tests
3. Temporarily bring up the stack
4. Production launch

However, looking at all 4 scenarios, except the last one, all others can be reduced into one:

1. Running a build tool command, whether it is a Gradle task, a pnpm command, a test command, or a server launch command
2. Production launch

Production launch is the outlier because the final image built only contains running artifacts with no knowledge of source code or build tools.

So, each application service, for example, the `api` service on the backend side, is designed around being able to run any build tool command. Hence the service is set up as:

1. Mount the source code
2. Mount directories that are worth caching. E.g. `~/.gradle` for Gradle, so that we can reuse caches in CI
    - The frontend uses named volumes because pnpm relies on symlinks.
3. Since source code is mounted, the image would need to be based on standard public image. E.g. Liberica Hardened JDK image for backend services
4. Since source code is mounted, the user ID and group ID should match the host
5. The `entrypoint` will use the build tool command. E.g. `./gradlew --no-daemon` for backend services
6. The `command` defaults to the launch command. E.g. `:apps:api:bootRun` for the API service to make `./gradlew --no-daemon :apps:api:bootRun`

<!-- TODO: more to add -->

## Q&A

### For just running any build tool command, why not have a Dockerfile simply copy the source code

Possible, but this is cumbersome to maintain vs mounting the source code directly.

But even so, we still need to mount cache folders like `~/.gradle` to improve CI performance. Then why not just mount the source code altogether.

### Could it be case where developer want to run a command not from the build tool? And even worse, a command/tool not available in the image?

We could use a Dockerfile to add more tools.

But remember, mounting the source code also means mounting the `mise.toml` file. So `mise trust` and `mise install` are enough to set up the tools needed in the image.
