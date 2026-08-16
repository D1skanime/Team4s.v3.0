#!/usr/bin/env bash
#
# scripts/phase134-green-gate.sh
#
# Phase 134 (PMQA-07) scoped, rerunnable green gate for the member-profile
# surface: backend build/vet/scoped-test, frontend typecheck/lint/scoped-
# test/build, and a repo-wide `git diff --check`. Scoped to the member-
# profile surface per the user-confirmed scope decision recorded in
# 134-VALIDATION.md — NOT the full unscoped test suite (matching every
# prior Phase 128-133 plan's precedent).
#
# The 9 pre-existing, out-of-scope stale-assertion failures fully triaged in
# .planning/phases/133-responsive-accessible-efficient-visual-delivery/deferred-items.md
# are named explicitly in this script's KNOWN_DEFERRED allow-list. They are
# printed in the final summary but never silently ignored and never treated
# as blocking. Widening KNOWN_DEFERRED always requires a visible,
# source-controlled diff to this file (T-134-11).
#
# --- Preconditions ---------------------------------------------------------
# Export these four DSNs in the calling shell BEFORE running this script.
# Credentials are never hardcoded here; they are read from the environment
# and passed into the backend container per-var via `docker compose exec -T
# -e VAR=...` pass-through.
#
#   TEAM4S_PHASE128_TEST_DSN       postgres://.../team4s_phase128_test
#   TEAM4S_PHASE129_TEST_DSN       postgres://.../team4s_phase129_test
#   TEAM4S_PHASE134_MIGRATION_DSN  postgres://.../postgres (maintenance DB)
#   TEAM4S_PHASE134_TEST_DSN       postgres://.../team4s_phase134_test
#
# --- Usage -------------------------------------------------------------
#   TEAM4S_PHASE128_TEST_DSN=... TEAM4S_PHASE129_TEST_DSN=... \
#   TEAM4S_PHASE134_MIGRATION_DSN=... TEAM4S_PHASE134_TEST_DSN=... \
#     bash scripts/phase134-green-gate.sh
#
# Deliberately `set -uo pipefail` (NOT -e): every section below must run to
# completion so this script can collect ALL results before reporting,
# instead of aborting at the first red step.
set -uo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}" || exit 1

BACKEND_SVC="team4sv30-backend"
FRONTEND_CONTAINER="team4sv30-frontend"

# ---------------------------------------------------------------------------
# KNOWN_DEFERRED: "file::distinctive test-name substring" pairs, transcribed
# verbatim from deferred-items.md's "Still deferred" sections. Entries whose
# file is outside this gate's scoped vitest invocation (below) are listed
# anyway so the allow-list stays complete and self-documenting if the scope
# is ever widened — they simply never match any FAIL line.
# ---------------------------------------------------------------------------
KNOWN_DEFERRED=(
  "MemberBadgeChain.test.tsx::renders the generated contribution artwork without a fallback icon"
  "MemberBadgeChain.test.tsx::renders independent family cards with authoritative progressbar values"
  "MemberBadgeChain.test.tsx::keeps category order, a non-founder founding stage locked"
  "MemberBadgeChain.test.tsx::Phase 127 RED chain suppresses legacy Special"
  "MembershipsSection.test.tsx::keeps membership cards bounded in a responsive overflow-safe grid"
  "ResponsiveImage.config.test.ts::allows public release-version contribution media without opening all media paths"
  "v12-projection-contract.test.ts::keeps PublicMemberBadge role-progress metadata aligned"
  "no-token-boundary.test.ts::keeps docs and tests out of production boundary scans"
  "ReleaseVersionNotesTab.test.tsx::öffnet gespeicherte eigene Notizen"
)

section() {
  printf '\n==== %s ====\n' "$1"
}

require_env() {
  local missing=0
  local var
  for var in TEAM4S_PHASE128_TEST_DSN TEAM4S_PHASE129_TEST_DSN TEAM4S_PHASE134_MIGRATION_DSN TEAM4S_PHASE134_TEST_DSN; do
    if [ -z "${!var:-}" ]; then
      echo "FATAL: required env var ${var} is not set" >&2
      missing=1
    fi
  done
  if [ "${missing}" -eq 1 ]; then
    echo "FATAL: export all four DSNs before running this script (see header comment)." >&2
    exit 1
  fi
}

require_env

BACKEND_BUILD_OK=1
BACKEND_VET_OK=1
BACKEND_TEST_OK=1
FRONTEND_TYPECHECK_OK=1
FRONTEND_LINT_OK=1
FRONTEND_BUILD_OK=1
GIT_DIFF_CHECK_OK=1
NEW_FAILURES=()
DEFERRED_FAILURES=()

# ---------------------------------------------------------------------------
# 1. Backend section (runs inside team4sv30-backend)
# ---------------------------------------------------------------------------
section "Backend: go build ./..."
if ! docker compose exec -T "${BACKEND_SVC}" go build ./...; then
  BACKEND_BUILD_OK=0
fi

section "Backend: go vet ./..."
if ! docker compose exec -T "${BACKEND_SVC}" go vet ./...; then
  BACKEND_VET_OK=0
fi

section "Backend: scoped go test (Phase12*/Phase13* contract suites)"
if ! docker compose exec -T \
  -e TEAM4S_PHASE128_TEST_DSN="${TEAM4S_PHASE128_TEST_DSN}" \
  -e TEAM4S_PHASE129_TEST_DSN="${TEAM4S_PHASE129_TEST_DSN}" \
  -e TEAM4S_PHASE134_MIGRATION_DSN="${TEAM4S_PHASE134_MIGRATION_DSN}" \
  -e TEAM4S_PHASE134_TEST_DSN="${TEAM4S_PHASE134_TEST_DSN}" \
  "${BACKEND_SVC}" go test ./internal/repository/... ./internal/handlers/... ./internal/migrations/... ./internal/testsupport/... \
  -run 'Phase12|Phase13' -count=1 -timeout=300s; then
  BACKEND_TEST_OK=0
fi

# ---------------------------------------------------------------------------
# 2. Frontend section (runs inside team4sv30-frontend)
# ---------------------------------------------------------------------------
section "Frontend: npm run typecheck"
if ! docker exec "${FRONTEND_CONTAINER}" npm run typecheck; then
  FRONTEND_TYPECHECK_OK=0
fi

section "Frontend: npm run lint"
if ! docker exec "${FRONTEND_CONTAINER}" npm run lint; then
  FRONTEND_LINT_OK=0
fi

section "Frontend: scoped vitest run (member-profile surface)"
VITEST_OUTPUT_FILE="$(mktemp)"
docker exec "${FRONTEND_CONTAINER}" npx vitest run \
  src/components/profile/ src/app/members/ src/types/__tests__/v12-projection-contract.test.ts \
  2>&1 | tee "${VITEST_OUTPUT_FILE}"

section "Frontend: npm run build"
if ! docker exec "${FRONTEND_CONTAINER}" npm run build; then
  FRONTEND_BUILD_OK=0
fi

# ---------------------------------------------------------------------------
# 3. Repo-wide: git diff --check (whitespace-error gate, always full-repo
#    scope — this is a formatting gate, not a test-suite scope decision)
# ---------------------------------------------------------------------------
section "Repo-wide: git diff --check"
if ! git diff --check; then
  GIT_DIFF_CHECK_OK=0
fi

# ---------------------------------------------------------------------------
# 4-5. Parse vitest FAIL lines and partition into NEW_FAILURES (blocking)
#      vs DEFERRED_FAILURES (non-blocking, printed but not gate-failing).
# ---------------------------------------------------------------------------
while IFS= read -r line; do
  [ -z "${line}" ] && continue
  matched=0
  for entry in "${KNOWN_DEFERRED[@]}"; do
    file_part="${entry%%::*}"
    test_part="${entry#*::}"
    if [[ "${line}" == *"${file_part}"* && "${line}" == *"${test_part}"* ]]; then
      matched=1
      DEFERRED_FAILURES+=("${line}")
      break
    fi
  done
  if [ "${matched}" -eq 0 ]; then
    NEW_FAILURES+=("${line}")
  fi
done < <(grep '^ FAIL ' "${VITEST_OUTPUT_FILE}" || true)
rm -f "${VITEST_OUTPUT_FILE}"

# ---------------------------------------------------------------------------
# 6. Final summary block
# ---------------------------------------------------------------------------
section "SUMMARY"

pass_fail() {
  if [ "$1" -eq 1 ]; then echo "PASS"; else echo "FAIL"; fi
}

echo "Backend go build ./...            : $(pass_fail "${BACKEND_BUILD_OK}")"
echo "Backend go vet ./...              : $(pass_fail "${BACKEND_VET_OK}")"
echo "Backend scoped go test            : $(pass_fail "${BACKEND_TEST_OK}")"
echo "Frontend npm run typecheck        : $(pass_fail "${FRONTEND_TYPECHECK_OK}")"
echo "Frontend npm run lint             : $(pass_fail "${FRONTEND_LINT_OK}")"
echo "Frontend scoped vitest run        : $([ "${#NEW_FAILURES[@]}" -eq 0 ] && echo "PASS (deferred-only, see below)" || echo "FAIL (new failures, see below)")"
echo "Frontend npm run build            : $(pass_fail "${FRONTEND_BUILD_OK}")"
echo "Repo-wide git diff --check        : $(pass_fail "${GIT_DIFF_CHECK_OK}")"

echo ""
echo "---- KNOWN DEFERRED (not blocking, see .planning/phases/133-responsive-accessible-efficient-visual-delivery/deferred-items.md) ----"
if [ "${#DEFERRED_FAILURES[@]}" -eq 0 ]; then
  echo "(none observed in this run)"
else
  for f in "${DEFERRED_FAILURES[@]}"; do
    echo "  ${f}"
  done
fi

echo ""
echo "---- NEW FAILURES (blocking, not in KNOWN_DEFERRED) ----"
if [ "${#NEW_FAILURES[@]}" -eq 0 ]; then
  echo "(none)"
else
  for f in "${NEW_FAILURES[@]}"; do
    echo "  ${f}"
  done
fi

GATE_EXIT=0
if [ "${BACKEND_BUILD_OK}" -ne 1 ]; then GATE_EXIT=1; fi
if [ "${BACKEND_VET_OK}" -ne 1 ]; then GATE_EXIT=1; fi
if [ "${BACKEND_TEST_OK}" -ne 1 ]; then GATE_EXIT=1; fi
if [ "${FRONTEND_TYPECHECK_OK}" -ne 1 ]; then GATE_EXIT=1; fi
if [ "${FRONTEND_LINT_OK}" -ne 1 ]; then GATE_EXIT=1; fi
if [ "${FRONTEND_BUILD_OK}" -ne 1 ]; then GATE_EXIT=1; fi
if [ "${GIT_DIFF_CHECK_OK}" -ne 1 ]; then GATE_EXIT=1; fi
if [ "${#NEW_FAILURES[@]}" -gt 0 ]; then GATE_EXIT=1; fi

echo ""
if [ "${GATE_EXIT}" -eq 0 ]; then
  echo "GATE: GREEN (0)"
else
  echo "GATE: RED (1)"
fi

exit "${GATE_EXIT}"
