# Docker Setup Explain

This document explains the Docker setup in this repository

## Unification by `extends` keyword

There are multiple ways to reuse services in Docker Compose, but the `extends` keyword is chosen for:

- You still can modify any field from extended services
- Enforce the caller Compose file to explicitly declare all the services it uses.
  - This makes dev clear about what are going to be launched, which overriding compose files or `include` can not achieve.
  - This also means some redundant declaration each caller, but we trade off simplicity for clarity.

The `extends` works extremely well for dependencies like Postgres, Redis.

For application services, things are more complicated

## Application Services Setup

Each application service, for example, the `api` service from backend side.
There are 4 scenarios we need to support:

1. Developers running commands, like gradle task or pnpm run
2. CI running tests
3. Temporary bring up the stack
4. Production launch

However, looking at all 4 scenarios, except the last one, all others can be reduced into one, so we really only need to support:

1. Running a build tool command (whether it's gradle task or pnpm run that is running tests, or bring up the server)
2. Production launch

Production launch is the outlier as it is the only one using the Dockerfile, which produce running artifacts knowledges about the source code and build tools.

So, each application service, for example, the `api` service from backend side, is designed around being able to run any build tool command. Hence the setup is:

1. Mount the source code, instead of using Dockerfile
   - Including mounting directories that some build tools would use. E.g. `~/.gradle` for Gradle
2. Since source code is mounted, image would be standard public image. E.g. Liberica Hardened JDK image for backend services
3. The `entrypoint` will use the build tool command. E.g. `./gradlew --no-daemon` for backend services
4. The `commands` will be defauted to the launch command. E.g. `./gradlew --no-daemon :api:run` for api service

<!-- TODO: more to add -->

## Q&A

### For just running any build tool command, why Dockerfile can't be used?

Possibly we could have a Dockerfile simply copy the source code, but this is cucumbersome to maintain vs mounting the source code directly.

### Could it be case where developer want to run a command not from the build tool? And even worse, a command/tool not available in the image?

We could use a Dockerfile to add more tools

But remember, we also mounted the source code, so any shell script can be written for any custom command.

We probably can also find any public image that including tools we need, but that will break the unification where all environments share the similar images.
