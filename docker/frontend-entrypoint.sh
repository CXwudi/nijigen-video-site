#!/usr/bin/env sh
# Make dependency volumes writable, then run pnpm as the host user.
set -eu

: "${HOST_UID:?HOST_UID must be provided}"
: "${HOST_GID:?HOST_GID must be provided}"

chown "${HOST_UID}:${HOST_GID}" /workspace/frontend/node_modules /workspace/frontend/web/node_modules

exec setpriv --reuid="${HOST_UID}" --regid="${HOST_GID}" --clear-groups pnpm "$@"
