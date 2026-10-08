#!/usr/bin/env bash
# Run Compose from this directory with consistent host ownership and caches.
set -euo pipefail

docker_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
if [[ "$(pwd -P)" != "$docker_dir" ]]; then
  printf 'Run this script from %s, or use mise //docker:compose.\n' "$docker_dir" >&2
  exit 1
fi

# Pass host UID/GID
export HOST_UID="${HOST_UID:-$(id -u)}"
export HOST_GID="${HOST_GID:-$(id -g)}"

# Pass host Gradle user home
export HOST_GRADLE_USER_HOME="${HOST_GRADLE_USER_HOME:-${GRADLE_USER_HOME:-$HOME/.gradle}}"

# Pass host pnpm store and cache directories
if [[ -z "${HOST_PNPM_STORE_DIR:-}" ]]; then
  # Get the pnpm store path.
  # The location can be different, espacially on different drives on Windows. So use `pnpm store path` to get the actual path
  pnpm_store_path="$(pnpm store path)"
  # Mount the store root without the versioned directory (e.g., v11)
  HOST_PNPM_STORE_DIR="$(dirname -- "$pnpm_store_path")"
fi
HOST_PNPM_CACHE_DIR="${HOST_PNPM_CACHE_DIR:-$(pnpm cache path)}"
export HOST_PNPM_STORE_DIR HOST_PNPM_CACHE_DIR

# Ensure these directories exist on the host
mkdir -p "$HOST_GRADLE_USER_HOME" "$HOST_PNPM_STORE_DIR" "$HOST_PNPM_CACHE_DIR"

exec docker compose --env-file .env -f compose.yml "$@"
