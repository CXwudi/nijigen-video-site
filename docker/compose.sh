#!/usr/bin/env bash
# Run Compose with consistent paths and host ownership from any working directory.
set -euo pipefail

docker_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export HOST_GRADLE_USER_HOME="${HOST_GRADLE_USER_HOME:-${GRADLE_USER_HOME:-$HOME/.gradle}}"
export HOST_UID="${HOST_UID:-$(id -u)}"
export HOST_GID="${HOST_GID:-$(id -g)}"
mkdir -p "$HOST_GRADLE_USER_HOME"

exec docker compose --env-file "$docker_dir/.env" -f "$docker_dir/compose.yml" "$@"
