#!/usr/bin/env bash
# Run Compose with consistent paths and host ownership from any working directory.
set -euo pipefail

docker_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
export HOST_GRADLE_USER_HOME="${HOST_GRADLE_USER_HOME:-${GRADLE_USER_HOME:-$HOME/.gradle}}"
export HOST_UID="${HOST_UID:-$(id -u)}"
export HOST_GID="${HOST_GID:-$(id -g)}"

if [[ -z "${HOST_PNPM_STORE_DIR:-}" ]]; then
  pnpm_store_path="$(pnpm --dir "$docker_dir/../frontend" store path)"
  # Mount the store root; pnpm appends its versioned subdirectory (e.g. v11).
  # Normalize Windows paths reported by pnpm when invoked from Git Bash.
  pnpm_store_path="${pnpm_store_path//\\//}"
  HOST_PNPM_STORE_DIR="$(dirname -- "$pnpm_store_path")"
fi
HOST_PNPM_CACHE_DIR="${HOST_PNPM_CACHE_DIR:-$(pnpm --dir "$docker_dir/../frontend" cache path)}"
HOST_PNPM_CACHE_DIR="${HOST_PNPM_CACHE_DIR//\\//}"
export HOST_PNPM_STORE_DIR HOST_PNPM_CACHE_DIR
mkdir -p "$HOST_GRADLE_USER_HOME" "$HOST_PNPM_STORE_DIR" "$HOST_PNPM_CACHE_DIR"

exec docker compose --env-file "$docker_dir/.env" -f "$docker_dir/compose.yml" "$@"
