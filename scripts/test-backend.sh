#!/usr/bin/env bash
#
# scripts/test-backend.sh
#
# Phase 185-11 (CONTEXT.md D-07, Reproducibility): a single script that
# reproduces the Ist-Stand analysis's full, unscoped backend test run end to
# end -- correct test-runner image, correct mount (the WHOLE repo, NOT just
# `backend/`, which was Lauf 1's documented root cause of false-red
# results), every required `*_TEST_DSN` env var pointing at a freshly
# created, uniquely-named throwaway database, and teardown of every one of
# those databases afterward. `team4s_v2` is never read from, written to, or
# referenced by name/pattern anywhere in this script.
#
# --- Image choice (185-04's D-03a finding) ---------------------------------
# golang:1.25-alpine. The 3-test Jellyfin-preview-EOF cluster that originally
# motivated probing a Debian image turned out to be a real test-fixture bug
# (fixed in 185-04's own commit), reproducing identically on BOTH
# golang:1.25 and golang:1.25-alpine -- so that cluster does NOT constrain
# this choice (185-04-SUMMARY.md). The remaining environment-sensitive
# cluster that DOES matter here is the vips-tools/ffmpeg media-handler
# cluster (CONTEXT.md: TestSaveUpload_* tests need `vipsthumbnail`/`ffmpeg`
# on PATH). The production image (backend/Dockerfile) is itself Alpine-based
# and already names the exact `apk` packages needed (build-time:
# build-base pkgconfig vips-dev for the CGO/govips compile; runtime: vips
# vips-tools ffmpeg fontconfig font-dejavu font-noto font-noto-cjk) --
# reusing golang:1.25-alpine here means this script installs those EXACT,
# already-proven package names instead of guessing Debian/apt-get
# equivalents.
#
# --- Mount -------------------------------------------------------------
# The WHOLE repo (not just backend/) is bind-mounted, with WORKDIR set to
# the backend subdirectory inside the container. `go test ./...` therefore
# runs from `backend/` while `database/migrations/` and `shared/contracts/`
# remain reachable via the relative `../` paths the existing test fixtures
# already expect (e.g. phase139_postgres.go's own migration-dir resolution).
#
# --- -p 1 ----------------------------------------------------------------
# The Ist-Zustand narrative's Lauf 3 used `-p 1` for deterministic
# package-test ordering, avoiding a class of cross-file contamination on
# shared, non-isolated fixtures. Kept here for the same reason.
#
# Deliberately `set -uo pipefail` (NOT -e): every teardown step below must
# run to completion even if an earlier step (provisioning, the test run
# itself) failed, so no throwaway database is ever left behind.
#
# --- Usage -----------------------------------------------------------------
#   bash scripts/test-backend.sh
#
# No env vars need to be exported manually -- every `*_TEST_DSN` var is
# derived live from backend/internal and exported by this script itself.
set -uo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}" || exit 1

DB_SVC="team4sv30-db"
NETWORK="team4s_default"
TEST_IMAGE="golang:1.25-alpine"
DB_USER="team4s"
DB_PASSWORD="team4s_dev_password"

# Local Go module/build cache bind-mounts so repeated runs do not
# re-download the entire module graph every time (mirrors the cache
# bind-mount approach 185-04 used for its own repeated container runs).
GOMODCACHE_DIR="/tmp/team4s-test-backend-gomodcache"
GOCACHE_DIR="/tmp/team4s-test-backend-gocache"
mkdir -p "${GOMODCACHE_DIR}" "${GOCACHE_DIR}"

section() {
  printf '\n==== %s ====\n' "$1"
}

# ---------------------------------------------------------------------------
# 1. Derive every *_TEST_DSN env var name LIVE from backend/internal --
#    never hand-transcribed, since the list drifts as fixtures are added.
# ---------------------------------------------------------------------------
section "Deriving *_TEST_DSN env var list from backend/internal"
mapfile -t ALL_DSN_VARS < <(grep -rhoP 'TEAM4S_[A-Z0-9_]+_TEST_DSN' backend/internal | sort -u)

if [ "${#ALL_DSN_VARS[@]}" -eq 0 ]; then
  echo "FATAL: no *_TEST_DSN env vars found under backend/internal -- grep pattern or repo layout changed" >&2
  exit 1
fi

echo "Found ${#ALL_DSN_VARS[@]} *_TEST_DSN env vars:"
printf '  %s\n' "${ALL_DSN_VARS[@]}"

# TEAM4S_PHASE134_MIGRATION_DSN is a special case: it must point at the
# `postgres` maintenance database, not a dedicated throwaway database --
# the migration fresh/up/down proof test creates/drops its OWN ephemeral
# database (team4s_phase134_migration_fresh) through this connection. It is
# handled separately below and excluded from the create/drop throwaway-
# database loop.
MIGRATION_DSN_VAR="TEAM4S_PHASE134_MIGRATION_DSN"

THROWAWAY_DSN_VARS=()
for var in "${ALL_DSN_VARS[@]}"; do
  if [ "${var}" = "${MIGRATION_DSN_VAR}" ]; then
    continue
  fi
  THROWAWAY_DSN_VARS+=("${var}")
done

# ---------------------------------------------------------------------------
# 2. Derive the throwaway database name for each var: strip the TEAM4S_
#    prefix and _TEST_DSN suffix, lowercase -> team4s_<name>_test.
# ---------------------------------------------------------------------------
declare -A DB_NAME_FOR_VAR
for var in "${THROWAWAY_DSN_VARS[@]}"; do
  middle="${var#TEAM4S_}"
  middle="${middle%_TEST_DSN}"
  middle_lower="$(printf '%s' "${middle}" | tr '[:upper:]' '[:lower:]')"
  db_name="team4s_${middle_lower}_test"

  # Absolute guard (T-185-11-01): refuse anything that is not the uniform
  # team4s_<name>_test shape, and refuse team4s_v2 by construction.
  if [[ ! "${db_name}" =~ ^team4s_[a-z0-9_]+_test$ ]] || [ "${db_name}" = "team4s_v2" ]; then
    echo "FATAL: derived database name '${db_name}' for ${var} is unsafe -- refusing to proceed" >&2
    exit 1
  fi
  DB_NAME_FOR_VAR["${var}"]="${db_name}"
done

echo ""
echo "Derived throwaway database names:"
for var in "${THROWAWAY_DSN_VARS[@]}"; do
  echo "  ${var} -> ${DB_NAME_FOR_VAR[${var}]}"
done

# ---------------------------------------------------------------------------
# 3. Idempotently create every throwaway database.
# ---------------------------------------------------------------------------
section "Creating ${#THROWAWAY_DSN_VARS[@]} throwaway databases (idempotent)"
CREATE_FAILED=0
for var in "${THROWAWAY_DSN_VARS[@]}"; do
  db_name="${DB_NAME_FOR_VAR[${var}]}"
  if ! docker compose exec -T "${DB_SVC}" sh -eu -c "
    exists=\"\$(psql -U ${DB_USER} -d postgres -X -tAc \"SELECT 1 FROM pg_database WHERE datname = '${db_name}'\")\"
    if [ \"\$exists\" != \"1\" ]; then
      createdb -U ${DB_USER} -O ${DB_USER} ${db_name}
      echo 'created ${db_name}'
    else
      echo '${db_name} already exists'
    fi
  "; then
    echo "FATAL: failed to create ${db_name}" >&2
    CREATE_FAILED=1
  fi
done

if [ "${CREATE_FAILED}" -eq 1 ]; then
  echo "FATAL: one or more throwaway databases failed to provision -- aborting before running tests" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. Export every DSN env var and build the docker run -e flag list.
# ---------------------------------------------------------------------------
section "Exporting DSN env vars"
DOCKER_ENV_FLAGS=(-e "CGO_ENABLED=1")
for var in "${THROWAWAY_DSN_VARS[@]}"; do
  db_name="${DB_NAME_FOR_VAR[${var}]}"
  dsn="postgres://${DB_USER}:${DB_PASSWORD}@${DB_SVC}:5432/${db_name}?sslmode=disable"
  export "${var}=${dsn}"
  DOCKER_ENV_FLAGS+=(-e "${var}=${dsn}")
done

MIGRATION_DSN="postgres://${DB_USER}:${DB_PASSWORD}@${DB_SVC}:5432/postgres?sslmode=disable"
export "${MIGRATION_DSN_VAR}=${MIGRATION_DSN}"
DOCKER_ENV_FLAGS+=(-e "${MIGRATION_DSN_VAR}=${MIGRATION_DSN}")

echo "Exported ${#THROWAWAY_DSN_VARS[@]} throwaway DSN vars + ${MIGRATION_DSN_VAR} (maintenance DB, not a throwaway DB)."

# ---------------------------------------------------------------------------
# 5. Run the full backend suite against a bare golang:1.25-alpine toolchain
#    container, whole repo mounted, WORKDIR set to backend/.
# ---------------------------------------------------------------------------
section "Running full backend suite (go test ./... -p 1 -v) in ${TEST_IMAGE}"
TEST_OUTPUT_FILE="$(mktemp)"
docker run --rm \
  -v "${REPO_ROOT}:/repo" \
  -v "${GOMODCACHE_DIR}:/go/pkg/mod" \
  -v "${GOCACHE_DIR}:/root/.cache/go-build" \
  -w /repo/backend \
  --network "${NETWORK}" \
  "${DOCKER_ENV_FLAGS[@]}" \
  "${TEST_IMAGE}" \
  sh -c "apk add --no-cache build-base pkgconfig vips-dev vips vips-tools ffmpeg fontconfig font-dejavu font-noto font-noto-cjk >/dev/null && go test ./... -p 1 -v" \
  2>&1 | tee "${TEST_OUTPUT_FILE}"
TEST_EXIT=${PIPESTATUS[0]}

# ---------------------------------------------------------------------------
# 6. Teardown: drop every throwaway database (idempotent), regardless of
#    whether the test run above succeeded. Terminate lingering connections
#    first so DROP DATABASE never blocks on a stale test connection.
# ---------------------------------------------------------------------------
section "Dropping ${#THROWAWAY_DSN_VARS[@]} throwaway databases"
DROP_FAILED=0
for var in "${THROWAWAY_DSN_VARS[@]}"; do
  db_name="${DB_NAME_FOR_VAR[${var}]}"
  if [ "${db_name}" = "team4s_v2" ]; then
    echo "FATAL: refusing to drop team4s_v2" >&2
    DROP_FAILED=1
    continue
  fi
  if ! docker compose exec -T "${DB_SVC}" psql -U "${DB_USER}" -d postgres -X -c "
    SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db_name}' AND pid <> pg_backend_pid();
    DROP DATABASE IF EXISTS ${db_name};
  " >/dev/null; then
    echo "WARNING: failed to drop ${db_name}" >&2
    DROP_FAILED=1
  fi
done

# ---------------------------------------------------------------------------
# 7. Structured summary: confirm every expected suite actually RAN, not
#    silently skipped for a missing env var (CONTEXT.md's "kein Test wird
#    stillschweigend uebersprungen" rule). Any line in the captured output
#    that mentions "skip" (case-insensitive) AND names one of this script's
#    own exported DSN vars fails the gate.
# ---------------------------------------------------------------------------
section "SUMMARY"

SKIPPED_SUITES=()
while IFS= read -r line; do
  for var in "${THROWAWAY_DSN_VARS[@]}" "${MIGRATION_DSN_VAR}"; do
    if [[ "${line}" == *"${var}"* ]]; then
      SKIPPED_SUITES+=("${var}: ${line}")
    fi
  done
done < <(grep -i 'skip' "${TEST_OUTPUT_FILE}" || true)

rm -f "${TEST_OUTPUT_FILE}"

echo "go test exit code: ${TEST_EXIT}"
echo "Throwaway databases created+dropped: ${#THROWAWAY_DSN_VARS[@]}"
echo "Maintenance DSN handled separately (not a throwaway DB): ${MIGRATION_DSN_VAR}"

if [ "${#SKIPPED_SUITES[@]}" -gt 0 ]; then
  echo ""
  echo "---- SUITES SILENTLY SKIPPED (blocking) ----"
  printf '  %s\n' "${SKIPPED_SUITES[@]}"
else
  echo "No expected suite was silently skipped for a missing DSN."
fi

GATE_EXIT=0
if [ "${TEST_EXIT}" -ne 0 ]; then GATE_EXIT=1; fi
if [ "${#SKIPPED_SUITES[@]}" -gt 0 ]; then GATE_EXIT=1; fi
if [ "${DROP_FAILED}" -eq 1 ]; then GATE_EXIT=1; fi

echo ""
if [ "${GATE_EXIT}" -eq 0 ]; then
  echo "GATE: GREEN (0)"
else
  echo "GATE: RED (1)"
fi

exit "${GATE_EXIT}"
