# Service Deployment Standard

This document is a local copy of the shared deployment standard referenced by
issue `#8`.

Source:
[service-deployment-standard.md](https://github.com/user-attachments/files/26337055/service-deployment-standard.md)

Repo-specific decisions for `nijigen-video-site` live in
[`../../infra/compose/docs/compose-guide.md`](../../infra/compose/docs/compose-guide.md)
and the approved design material under [`../README.md`](../README.md).

## File Structure

The tree should look like this:

```text
.
├── .env
├── .env.example
├── compose.base.yml
├── compose.local.yml
├── compose.prod.yml
├── justfile
└── README.md
```

If there is no need for local or production specific configuration, just a
`compose.yml` is also acceptable.

## `compose.base.yml`

The `compose.base.yml` should have:

1. Explicit naming for containers, networks, volumes
   1. `<service>` is the name of the service that the whole compose file is for,
      like n8n, rsshub, lobechat, nginx, etc.
   2. `<role>` is the role of this container in the service, like app, main,
      worker, db, cache, etc.
   3. So `<service>-<role>` forms like: n8n-main, n8n-worker, rsshub-redis,
      lobechat-db (can also be lobechat-pgvector), etc. This name should be
      unique across all other services on the same host machine.
   4. If there is only one container in the compose file, use the `<service>`
      instead of `<service>-<role>` on the both the container name and container
      identifier, like nginx instead of nginx-main or main.
2. Container can be on the latest or versioned latest tag if make sense to do
   so, usually they are dependencies like database, cache, etc.
3. Use a single `.env` file, and use `x-shared-env` in compose file to avoid
   duplication
4. Environment variables can optionally either provide default values using
   `:-default_value` or enforce required variables with error message using
   `:?Error Msg` in compose file
   1. There should be no hard coded environment variable values in compose file,
      either use `.env` file or provide default or enforce required in compose
      file
5. Restart policy: unless-stopped, unless there is a strong reason to use other
   policies

Example:

<!-- markdownlint-disable MD013 -->

```yaml
# Shared environment variables for main application instances
# Use YAML anchors to avoid duplication when multiple containers need same config
x-shared-env: &shared-env
  COMMON_ENV_VAR1: ${COMMON_ENV_VAR1}
  COMMON_ENV_VAR2: ${COMMON_ENV_VAR2:-default_value2} # optionally provide default
  COMMON_ENV_VAR3: ${COMMON_ENV_VAR3:?Error, COMMON_ENV_VAR3 is not set in .env file} # optionally enforce required variable
# Add more shared environment variables as needed

services:
  <role>/<service>:
    image: service-image:${SERVICE_VERSION} # can be latest or versioned-latest if make sense
    container_name: <service>-<role>/<service>
    restart: unless-stopped
    environment:
      <<: *shared-env
      # Instance-specific configuration
      INSTANCE_ENV_VAR1: ${INSTANCE_ENV_VAR1}
      INSTANCE_ENV_VAR2: ${INSTANCE_ENV_VAR2:-instance_default} # optionally provide default
      INSTANCE_ENV_VAR3: ${INSTANCE_ENV_VAR3:?Error, INSTANCE_ENV_VAR3 is not set in .env file} # optionally enforce required variable
    # depends_on: # Define dependencies if needed
    volumes:
      - <role>:/app/data
      # Add configuration files as needed
      # - ./config:/app/config:ro
    # labels: # Optional if this container should be excluded from watchtower updates
    #   - "com.centurylinklabs.watchtower.enable=false"
    # healthcheck: # Optional
    #   test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    #   interval: 3s
    #   timeout: 3s
    #   retries: 6

  # ... more services

networks:
  default:
    name: <service>-defnet

volumes:
  <role>:
    name: <service>-<role>-data
```

## `compose.local.yml` and `compose.prod.yml`

These files contain environment-specific overrides, usually they are:

- Environment variables specific to the local or production environment. Most of
  the time is just app URLs
- Port mappings. Usually local environment exposes ports to host for testing
- Network. In production, all connections go through a reverse proxy, so the
  entry or main container in the compose file connect to a global external
  network
- Any other configuration that needs to change based on the environment

## `justfile`

The `justfile` at least should contains:

```makefile
supported_envs := "local prod"
compose_base := "compose.base.yml"
compose_local := "compose.local.yml"
compose_prod := "compose.prod.yml"

boot env="prod":
  #!/usr/bin/env bash
  set -euo pipefail

  if [[ "{{env}}" == "prod" || "{{env}}" == "env=prod" ]]; then
    compose_files="-f {{compose_base}} -f {{compose_prod}}"
  elif [[ "{{env}}" == "local" || "{{env}}" == "env=local" ]]; then
    compose_files="-f {{compose_base}} -f {{compose_local}}"
  else
    echo "Unsupported environment '{{env}}'. Expected one of: {{supported_envs}}." >&2
    exit 1
  fi

  docker compose ${compose_files} up -d

down env="prod":
  #!/usr/bin/env bash
  set -euo pipefail

  if [[ "{{env}}" == "prod" || "{{env}}" == "env=prod" ]]; then
    compose_files="-f {{compose_base}} -f {{compose_prod}}"
  elif [[ "{{env}}" == "local" || "{{env}}" == "env=local" ]]; then
    compose_files="-f {{compose_base}} -f {{compose_local}}"
  else
    echo "Unsupported environment '{{env}}'. Expected one of: {{supported_envs}}." >&2
    exit 1
  fi

  docker compose ${compose_files} down

reboot env="prod": (down env) (boot env)
```

<!-- markdownlint-enable MD013 -->

## Example

Use the [`n8n`](../production-power-server/n8n) service as best example
