#!/usr/bin/env bash
#
# scripts/test-backend.sh
#
# Phase 185-11 (CONTEXT.md D-07, Reproducibility): a single script that
# reproduces the Ist-Stand analysis's full, unscoped backend test run end to
# end -- correct test-runner image, correct mount (the WHOLE repo, NOT just
# `backend/`, which was Lauf 1's documented root cause of false-red
# results), every required `*_TEST_DSN` env var pointing at a freshly
# created, uniquely-named throwaway database (with the "volles Schema"
# pg_dump --schema-only setup the 10 fixtures that need it require), and
# teardown of every one of those databases afterward. `team4s_v2` is only
# ever READ from (via pg_dump, to clone its schema) and is never written to,
# dropped, or targeted by any DDL anywhere in this script.
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
# --- Database-name patterns (discovered empirically, not assumable) -------
# The naive "team4s_<name>_test" bare name does NOT satisfy every fixture's
# own validatePhaseNNNDatabaseName regex guard: most phaseNNN helpers
# (106/107/117/135/137/139/145/150/165/167/182) require a MANDATORY trailing
# `_[a-z0-9]+` suffix, a handful (128/129/131/150_04/152/155 + the 5 named
# fixtures) accept the suffix OPTIONALLY, and exactly one
# (TEAM4S_PHASE134_TEST_DSN, the unused verification-matrix helper) requires
# an EXACT match with NO suffix at all. This script therefore always appends
# a random run-scoped suffix to every throwaway database name except
# TEAM4S_PHASE134_TEST_DSN's. TEAM4S_PHASE150_04_TEST_DSN is a further
# special case: its own regex expects the SAME base name as
# TEAM4S_PHASE150_TEST_DSN ("team4s_phase150_test", not
# "team4s_phase150_04_test" the uniform stripping rule would otherwise
# produce) -- confirmed by reading member_profile_public_repository_postgres_test.go's
# phase15004DatabasePattern directly, not assumed.
#
# --- "Volles Schema" fixtures (CONTEXT.md Risiken) -------------------------
# 10 of the 23 throwaway databases are NOT hand-rolled stand-in-table
# fixtures -- CONTEXT.md's Risiken section documents them as needing the
# FULL real team4s_v2 schema (a `pg_dump --schema-only` clone, confirmed by
# the "pg_dump --schema-only of team4s_v2" comments in
# member_profile_public_repository_postgres_test.go,
# fansub_public_profile_load_path_test.go, member_profile_query_budget_test.go):
# TEAM4S_PHASE129/131/150_04/152/155_TEST_DSN plus the 5 named fixtures
# (ANIME_SOURCE_LINKS, EPISODE_METADATA, FANSUB, LIBRARY_DISCOVERY,
# RELATIONS). Without this step those 10 databases are empty and every test
# using them fails on "relation does not exist" instead of exercising real
# behavior. team4s_v2 is dumped exactly ONCE (read-only, --schema-only, so it
# is never written to) and the same dump is restored into all 10 throwaway
# databases.
#
# --- Phase-134-Matrix cluster (CONTEXT.md D-03b, 9 tests) ------------------
# internal/repository/phase134_verification_matrix_{access_,}test.go's 9
# tests are unconditional HTTP integration tests (no DSN-missing skip-guard)
# against a SEPARATE, fully migrated + seeded temporary backend instance,
# not the plain throwaway `team4s_phase134_test` database this script would
# otherwise just `createdb` empty. D-03b already fixed their hardcoded host
# IP to read TEAM4S_PHASE134_MATRIX_BASE_URL/TEAM4S_PHASE134_MATRIX_KC_BASE
# (falling back to the host-IP default for manual/local runs outside this
# script). scripts/provision-phase134-matrix-db.sh already builds exactly
# this fixture (migration replay, Keycloak identity/authz bootstrap, the
# Plan-134-01 seed script, a temporary `team4s-phase134-backend` container)
# and its own header comment already anticipates being driven by a
# containerized test runner like this one -- this script therefore calls it
# directly instead of re-implementing it, then points the two env vars above
# at the container-network-internal addresses
# (http://team4s-phase134-backend:8092, http://team4sv30-keycloak:8080) so
# the ephemeral golang:1.25-alpine container (attached to the same
# team4s_default network) can reach them. The temporary backend container
# and team4s_phase134_test database are torn down at the end alongside every
# other throwaway database, per CONTEXT.md's "ausschliesslich selbst
# angelegte und wieder entfernte Wegwerf-Datenbanken" rule -- even though
# provision-phase134-matrix-db.sh's own standalone convention is to leave
# them running for manual reuse.
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
SOURCE_SCHEMA_DB="team4s_v2"

# Local Go module/build cache bind-mounts so repeated runs do not
# re-download the entire module graph every time (mirrors the cache
# bind-mount approach 185-04 used for its own repeated container runs).
GOMODCACHE_DIR="/tmp/team4s-test-backend-gomodcache"
GOCACHE_DIR="/tmp/team4s-test-backend-gocache"
mkdir -p "${GOMODCACHE_DIR}" "${GOCACHE_DIR}"

# One random, lowercase-hex, run-scoped suffix for every throwaway database
# created by this invocation (matches every fixture's `[a-z0-9]+` suffix
# pattern).
RUN_SUFFIX="$(head -c 4 /dev/urandom | od -An -tx1 | tr -d ' \n')"

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
# 2. Derive the throwaway database name for each var.
# ---------------------------------------------------------------------------
# FULL_SCHEMA_VARS: the 10 "volles Schema" fixtures documented in
# CONTEXT.md's Risiken section. This is a fixed, reviewable, hand-maintained
# list (not re-derivable from a generic grep) -- the staleness assertion
# right after it fails loudly if the live-derived DSN-var list and this list
# ever diverge, so this list cannot silently go stale.
FULL_SCHEMA_VARS=(
  TEAM4S_PHASE129_TEST_DSN
  TEAM4S_PHASE131_TEST_DSN
  TEAM4S_PHASE150_04_TEST_DSN
  TEAM4S_PHASE152_TEST_DSN
  TEAM4S_PHASE155_TEST_DSN
  TEAM4S_ANIME_SOURCE_LINKS_TEST_DSN
  TEAM4S_EPISODE_METADATA_TEST_DSN
  TEAM4S_FANSUB_TEST_DSN
  TEAM4S_LIBRARY_DISCOVERY_TEST_DSN
  TEAM4S_RELATIONS_TEST_DSN
)
for fsv in "${FULL_SCHEMA_VARS[@]}"; do
  found=0
  for var in "${THROWAWAY_DSN_VARS[@]}"; do
    [ "${var}" = "${fsv}" ] && { found=1; break; }
  done
  if [ "${found}" -eq 0 ]; then
    echo "FATAL: FULL_SCHEMA_VARS names ${fsv}, but it was not found in the live-derived DSN var list -- this script's hardcoded list has gone stale, update it" >&2
    exit 1
  fi
done

is_full_schema_var() {
  local candidate="$1"
  for fsv in "${FULL_SCHEMA_VARS[@]}"; do
    [ "${candidate}" = "${fsv}" ] && return 0
  done
  return 1
}

declare -A DB_NAME_FOR_VAR
for var in "${THROWAWAY_DSN_VARS[@]}"; do
  # TEAM4S_PHASE150_04_TEST_DSN's own regex expects the SAME base name as
  # TEAM4S_PHASE150_TEST_DSN, not "team4s_phase150_04_test" -- see header
  # comment. All other vars use the uniform stripping rule: strip the
  # TEAM4S_ prefix and _TEST_DSN suffix, lowercase it.
  if [ "${var}" = "TEAM4S_PHASE150_04_TEST_DSN" ]; then
    base_name="team4s_phase150_test"
  else
    middle="${var#TEAM4S_}"
    middle="${middle%_TEST_DSN}"
    middle_lower="$(printf '%s' "${middle}" | tr '[:upper:]' '[:lower:]')"
    base_name="team4s_${middle_lower}_test"
  fi

  # TEAM4S_PHASE134_TEST_DSN's helper (OpenPhase134MatrixPostgres, currently
  # unused by any test) requires an EXACT match with no suffix at all -- see
  # header comment. Every other var always gets this run's random suffix
  # appended (works for both the mandatory-suffix and optional-suffix
  # fixtures).
  if [ "${var}" = "TEAM4S_PHASE134_TEST_DSN" ]; then
    db_name="${base_name}"
  else
    db_name="${base_name}_${RUN_SUFFIX}"
  fi

  # Absolute guard (T-185-11-01): refuse anything that is not the expected
  # team4s_<name>[_suffix] shape, and refuse team4s_v2 by construction.
  if [[ ! "${db_name}" =~ ^team4s_[a-z0-9_]+$ ]] || [ "${db_name}" = "${SOURCE_SCHEMA_DB}" ]; then
    echo "FATAL: derived database name '${db_name}' for ${var} is unsafe -- refusing to proceed" >&2
    exit 1
  fi
  DB_NAME_FOR_VAR["${var}"]="${db_name}"
done

echo ""
echo "Derived throwaway database names:"
for var in "${THROWAWAY_DSN_VARS[@]}"; do
  schema_note=""
  is_full_schema_var "${var}" && schema_note="  (volles Schema: pg_dump --schema-only clone of ${SOURCE_SCHEMA_DB})"
  echo "  ${var} -> ${DB_NAME_FOR_VAR[${var}]}${schema_note}"
done

# ---------------------------------------------------------------------------
# 3. Idempotently create every throwaway database, then restore the
#    schema-only team4s_v2 dump into the 10 "volles Schema" databases.
#    TEAM4S_PHASE134_TEST_DSN's database is provisioned separately below via
#    scripts/provision-phase134-matrix-db.sh (migrations + seed + temp
#    backend), not by a plain createdb here -- see header comment.
# ---------------------------------------------------------------------------
PHASE134_MATRIX_VAR="TEAM4S_PHASE134_TEST_DSN"
PHASE134_MATRIX_CONTAINER="team4s-phase134-backend"

section "Creating ${#THROWAWAY_DSN_VARS[@]} throwaway databases (idempotent)"
CREATE_FAILED=0
for var in "${THROWAWAY_DSN_VARS[@]}"; do
  if [ "${var}" = "${PHASE134_MATRIX_VAR}" ]; then
    continue
  fi
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

section "Provisioning the Phase-134 verification-matrix database + temporary backend"
PHASE134_MATRIX_BASE_URL="http://${PHASE134_MATRIX_CONTAINER}:8092"
PHASE134_MATRIX_KC_BASE="http://team4sv30-keycloak:8080"
PHASE134_MATRIX_PROVISION_OK=1
if ! bash scripts/provision-phase134-matrix-db.sh; then
  echo "FATAL: scripts/provision-phase134-matrix-db.sh failed -- the 9-test Phase-134-Matrix cluster will fail" >&2
  PHASE134_MATRIX_PROVISION_OK=0
fi

section "Cloning ${SOURCE_SCHEMA_DB}'s schema (read-only pg_dump --schema-only) into the 10 volles-Schema databases"
SCHEMA_DUMP_FILE="$(mktemp)"
if ! docker compose exec -T "${DB_SVC}" pg_dump -U "${DB_USER}" --schema-only --no-owner --no-privileges -d "${SOURCE_SCHEMA_DB}" > "${SCHEMA_DUMP_FILE}"; then
  echo "FATAL: pg_dump --schema-only of ${SOURCE_SCHEMA_DB} failed (read-only operation; ${SOURCE_SCHEMA_DB} itself was never modified)" >&2
  rm -f "${SCHEMA_DUMP_FILE}"
  exit 1
fi

SCHEMA_RESTORE_FAILED=0
for var in "${FULL_SCHEMA_VARS[@]}"; do
  db_name="${DB_NAME_FOR_VAR[${var}]}"
  echo "restoring schema into ${db_name} (for ${var})"
  if ! docker compose exec -T "${DB_SVC}" psql -U "${DB_USER}" -d "${db_name}" -v ON_ERROR_STOP=1 -q < "${SCHEMA_DUMP_FILE}" > /dev/null; then
    echo "FATAL: failed to restore schema into ${db_name}" >&2
    SCHEMA_RESTORE_FAILED=1
  fi
done
rm -f "${SCHEMA_DUMP_FILE}"

if [ "${SCHEMA_RESTORE_FAILED}" -eq 1 ]; then
  echo "FATAL: one or more volles-Schema databases failed to receive the schema clone -- aborting before running tests" >&2
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

# Point the Phase-134-Matrix cluster's HTTP calls at the container-network-
# internal addresses (D-03b) instead of its host-IP default, so it can reach
# the temporary backend/Keycloak from inside the ephemeral test container.
DOCKER_ENV_FLAGS+=(-e "TEAM4S_PHASE134_MATRIX_BASE_URL=${PHASE134_MATRIX_BASE_URL}")
DOCKER_ENV_FLAGS+=(-e "TEAM4S_PHASE134_MATRIX_KC_BASE=${PHASE134_MATRIX_KC_BASE}")

echo "Exported ${#THROWAWAY_DSN_VARS[@]} throwaway DSN vars + ${MIGRATION_DSN_VAR} (maintenance DB, not a throwaway DB)."
echo "Phase-134-Matrix cluster: TEAM4S_PHASE134_MATRIX_BASE_URL=${PHASE134_MATRIX_BASE_URL}, TEAM4S_PHASE134_MATRIX_KC_BASE=${PHASE134_MATRIX_KC_BASE}"

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
#    and drop the database as TWO separate psql invocations -- PostgreSQL's
#    simple query protocol implicitly wraps a multi-statement `-c` string in
#    one transaction block, and DROP DATABASE cannot run inside one. The
#    temporary Phase-134-Matrix backend container is removed first, so its
#    own open DB connections do not block that database's drop below.
# ---------------------------------------------------------------------------
section "Removing the temporary Phase-134-Matrix backend container"
docker rm -f "${PHASE134_MATRIX_CONTAINER}" >/dev/null 2>&1 || true

section "Dropping ${#THROWAWAY_DSN_VARS[@]} throwaway databases"
DROP_FAILED=0
for var in "${THROWAWAY_DSN_VARS[@]}"; do
  db_name="${DB_NAME_FOR_VAR[${var}]}"
  if [ "${db_name}" = "${SOURCE_SCHEMA_DB}" ]; then
    echo "FATAL: refusing to drop ${SOURCE_SCHEMA_DB}" >&2
    DROP_FAILED=1
    continue
  fi
  if ! docker compose exec -T "${DB_SVC}" psql -U "${DB_USER}" -d postgres -X -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${db_name}' AND pid <> pg_backend_pid();" >/dev/null; then
    echo "WARNING: failed to terminate lingering connections to ${db_name}" >&2
  fi
  if ! docker compose exec -T "${DB_SVC}" psql -U "${DB_USER}" -d postgres -X -c \
    "DROP DATABASE IF EXISTS ${db_name};" >/dev/null; then
    echo "WARNING: failed to drop ${db_name}" >&2
    DROP_FAILED=1
  fi
done

# ---------------------------------------------------------------------------
# 7. Structured summary: confirm every expected suite actually RAN, not
#    silently skipped for a missing env var (CONTEXT.md's "kein Test wird
#    stillschweigend uebersprungen" rule). Several fixtures intentionally
#    ship a self-test (e.g. TestPhaseNNNDSNSelectionIgnoresDatabaseURL) that
#    deliberately t.Setenv()s the DSN var to "" for ONE nested subtest, to
#    prove the fixture does NOT fall back to DATABASE_URL -- that produces a
#    legitimate, expected, INDENTED "--- SKIP:" subtest line even though the
#    DSN var is correctly set for the rest of the run. Only a genuinely
#    silent skip of a whole top-level test shows as an UNINDENTED
#    "--- SKIP:" line, so only that shape is treated as blocking here.
# ---------------------------------------------------------------------------
section "SUMMARY"

SKIPPED_SUITES=()
pending_var=""
pending_line=""
while IFS= read -r line; do
  for var in "${THROWAWAY_DSN_VARS[@]}" "${MIGRATION_DSN_VAR}"; do
    if [[ "${line}" == *"${var}"* ]] && [[ "${line}" == *skip* || "${line}" == *Skip* ]]; then
      pending_var="${var}"
      pending_line="${line}"
    fi
  done
  if [[ "${line}" =~ ^---\ SKIP: ]] && [ -n "${pending_var}" ]; then
    SKIPPED_SUITES+=("${pending_var}: ${pending_line}")
    pending_var=""
  fi
done < "${TEST_OUTPUT_FILE}"

rm -f "${TEST_OUTPUT_FILE}"

echo "go test exit code: ${TEST_EXIT}"
echo "Throwaway databases created+dropped: ${#THROWAWAY_DSN_VARS[@]} (${#FULL_SCHEMA_VARS[@]} with a volles-Schema clone)"
echo "Maintenance DSN handled separately (not a throwaway DB): ${MIGRATION_DSN_VAR}"
if [ "${PHASE134_MATRIX_PROVISION_OK}" -eq 1 ]; then
  echo "Phase-134-Matrix provisioning: OK (9-test cluster ran against a live temporary backend)"
else
  echo "Phase-134-Matrix provisioning: FAILED (see FATAL above -- the 9-test cluster could not run correctly)"
fi

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
if [ "${PHASE134_MATRIX_PROVISION_OK}" -ne 1 ]; then GATE_EXIT=1; fi

echo ""
if [ "${GATE_EXIT}" -eq 0 ]; then
  echo "GATE: GREEN (0)"
else
  echo "GATE: RED (1)"
fi

exit "${GATE_EXIT}"
