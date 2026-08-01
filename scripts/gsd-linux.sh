#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "${script_dir}/.." && pwd)"
node_image="${GSD_NODE_IMAGE:-node:20-bookworm-slim}"
gsd_entrypoint=".codex/get-shit-done/bin/gsd-tools.cjs"

if [[ ! -f "${repo_root}/${gsd_entrypoint}" ]]; then
  echo "GSD entrypoint not found: ${repo_root}/${gsd_entrypoint}" >&2
  exit 1
fi

exec docker run --rm --init \
  --network none \
  --user "$(id -u):$(id -g)" \
  --workdir /workspace \
  --mount "type=bind,src=${repo_root},dst=/workspace" \
  --mount "type=bind,src=/dev/null,dst=/workspace/.env,readonly" \
  --mount "type=tmpfs,dst=/workspace/media" \
  --tmpfs /tmp \
  --env HOME=/tmp \
  "${node_image}" \
  node "${gsd_entrypoint}" "$@"
