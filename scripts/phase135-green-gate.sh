#!/usr/bin/env bash
# Phase 135 green gate (135-07 Task 1) -- full automated suite.
# Runs all 8 steps, prints PASS/FAIL per step, exits non-zero on any failure.
# Per 135-VALIDATION.md "Full suite command": full backend go test + full frontend vitest.
set -u
cd "$(dirname "$0")/.." || exit 1

LOGDIR="${GREEN_GATE_LOGDIR:-/tmp/phase135-green-gate-logs}"
rm -rf "$LOGDIR"; mkdir -p "$LOGDIR"
FAILED=()

run() {
  local name="$1"; shift
  printf '\n=== [%s] %s ===\n' "$name" "$*"
  if "$@" >"$LOGDIR/$name.log" 2>&1; then
    echo "PASS: $name"
  else
    local code=$?
    echo "FAIL: $name (exit $code)"
    FAILED+=("$name")
    echo "----- last 20 lines of $name.log -----"
    tail -n 20 "$LOGDIR/$name.log"
    echo "--------------------------------------"
  fi
}

run backend-build      docker compose exec -T team4sv30-backend go build ./...
run backend-vet        docker compose exec -T team4sv30-backend go vet ./...
run backend-test       docker compose exec -T team4sv30-backend go test ./...
run frontend-typecheck docker compose exec -T team4sv30-frontend npm run typecheck
run frontend-lint      docker compose exec -T team4sv30-frontend npm run lint
run frontend-test      docker compose exec -T team4sv30-frontend npm test
run frontend-build     docker compose exec -T team4sv30-frontend npm run build
run git-diff-check     git diff --check

echo
echo "================ SUMMARY ================"
echo "logs: $LOGDIR"
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "GREEN GATE: PASS (all 8 steps green)"
  exit 0
else
  echo "GREEN GATE: FAIL -- failed steps: ${FAILED[*]}"
  echo "(partition pre-existing/out-of-scope vs Phase-135 regressions from the per-step logs above)"
  exit 1
fi
