#!/usr/bin/env bash
# scripts/provision-phase134-matrix-db.sh
#
# Phase 134-03 (CONTEXT.md D-07): idempotently provisions the dedicated,
# full-schema, versioned-fixture-seeded throwaway database
# `team4s_phase134_test`, replays every migration into it (the "full
# migration replay" approach — schema-only dumps would NOT carry the
# migration-embedded role_definitions/visibilities/review_statuses reference
# rows), starts a temporary backend instance bound to it on host port 18093,
# and seeds it once via the SAME Phase-129/134-01 idempotent API-driven seed
# script the shared rollout DB uses (D-01's "same fixture engine" guarantee).
#
# Run directly on the Linux host per CLAUDE.md's canonical-environment rule.
# Safe to re-run: every step is idempotent (T-134-07/T-134-10 do not apply
# here — this script never touches team4s_v2).
#
# Usage: bash scripts/provision-phase134-matrix-db.sh
set -euo pipefail

MATRIX_DB="team4s_phase134_test"
MATRIX_BACKEND_CONTAINER="team4s-phase134-backend"
MATRIX_HOST_PORT="18093"
MATRIX_DSN="postgres://team4s:team4s_dev_password@team4sv30-db:5432/${MATRIX_DB}?sslmode=disable"
HEALTH_URL="http://192.168.235.196:${MATRIX_HOST_PORT}/health"

echo "[provision-phase134-matrix-db] Step 1/5: idempotently create ${MATRIX_DB} if absent"
docker compose exec -T team4sv30-db sh -eu -c "
  exists=\"\$(psql -U team4s -d postgres -X -tAc \"SELECT 1 FROM pg_database WHERE datname = '${MATRIX_DB}'\")\"
  if [ \"\$exists\" != \"1\" ]; then
    createdb -U team4s -O team4s ${MATRIX_DB}
    echo 'created ${MATRIX_DB}'
  else
    echo '${MATRIX_DB} already exists'
  fi
"
docker compose exec -T team4sv30-db psql -U team4s -d postgres -X -tAc \
  "SELECT count(*) FROM pg_database WHERE datname = '${MATRIX_DB}'" | grep -q '^1$' \
  || { echo "FATAL: ${MATRIX_DB} was not provisioned" >&2; exit 1; }

echo "[provision-phase134-matrix-db] Step 2/5: replay every migration into ${MATRIX_DB}"
docker compose exec -T team4sv30-backend go run ./cmd/migrate up -database-url "${MATRIX_DSN}"

echo "[provision-phase134-matrix-db] Step 3/5: start temporary backend instance bound to ${MATRIX_DB}"
docker rm -f "${MATRIX_BACKEND_CONTAINER}" >/dev/null 2>&1 || true
docker compose run --rm -d \
  --name "${MATRIX_BACKEND_CONTAINER}" \
  -p "${MATRIX_HOST_PORT}:8092" \
  -e DATABASE_URL="${MATRIX_DSN}" \
  -e REDIS_DB=5 \
  team4sv30-backend

echo "[provision-phase134-matrix-db] Step 4/5: wait for ${HEALTH_URL} to become healthy"
attempt=0
until curl -sf "${HEALTH_URL}" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "${attempt}" -ge 30 ]; then
    echo "FATAL: ${MATRIX_BACKEND_CONTAINER} did not become healthy after 30s" >&2
    docker logs "${MATRIX_BACKEND_CONTAINER}" --tail 100 >&2 || true
    exit 1
  fi
  sleep 1
done
echo "[provision-phase134-matrix-db] temporary backend healthy at ${HEALTH_URL}"

# ---------------------------------------------------------------------------
# Step 4.5: identity/authz bootstrap (Rule 3 — blocking-issue fix, not in the
# original plan action text). scripts/seed-member-profile-fixtures.mjs talks
# ONLY to the real API and assumes two things already exist: (a) a verified
# member_claims link from each Keycloak account to its canonical member row,
# and (b) the admin account already holds the platform_admin global role. On
# the shared team4s_v2 database both were bootstrapped once, out-of-band, long
# before Phase 129/134 existed ("Current DB: members=2 ... both were empty
# shells at milestone start" per CONTEXT.md) — so the seed script itself never
# had to create them. A genuinely fresh, migration-only database has neither:
# there is no member yet to self-claim, and no platform_admin yet to grant the
# very first platform_admin. This is a pure identity/authz bootstrap (no
# scenario/business fixture data — that stays 100% owned by the seed script
# below) that only this throwaway matrix database needs.
# ---------------------------------------------------------------------------
echo "[provision-phase134-matrix-db] Step 4.5/5: bootstrap platform_admin + verified member_claims linking"
KC_BASE="http://192.168.235.196:18081"
ADMIN_USER="csubs-leader@team4s.local"
ADMIN_PW="123"
SHEP_USER="sheppert@team4s.local"
SHEP_PW="123"

fetch_kc_token() {
  curl -sf -X POST "${KC_BASE}/realms/team4s/protocol/openid-connect/token" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "grant_type=password" \
    --data-urlencode "client_id=team4s-frontend" \
    --data-urlencode "username=$1" \
    --data-urlencode "password=$2" \
    | jq -r '.access_token // empty'
}

admin_token="$(fetch_kc_token "${ADMIN_USER}" "${ADMIN_PW}")"
shep_token="$(fetch_kc_token "${SHEP_USER}" "${SHEP_PW}")"
[ -n "${admin_token}" ] || { echo "FATAL: could not obtain Keycloak token for ${ADMIN_USER}" >&2; exit 1; }
[ -n "${shep_token}" ] || { echo "FATAL: could not obtain Keycloak token for ${SHEP_USER}" >&2; exit 1; }

# JIT-provision app_users rows (idempotent upsert-on-subject) by hitting any
# authenticated endpoint once per account.
curl -sf "http://192.168.235.196:${MATRIX_HOST_PORT}/api/v1/me/profile" -H "Authorization: Bearer ${admin_token}" >/dev/null
curl -sf "http://192.168.235.196:${MATRIX_HOST_PORT}/api/v1/me/profile" -H "Authorization: Bearer ${shep_token}" >/dev/null

docker compose exec -T team4sv30-db psql -U team4s -d "${MATRIX_DB}" -v ON_ERROR_STOP=1 <<SQL
INSERT INTO members (nickname, display_name, public_slug, profile_visibility)
VALUES ('csubs-leader', 'Csubs Leader', 'csubs-leader', 'public')
ON CONFLICT (public_slug) DO NOTHING;

INSERT INTO members (nickname, display_name, public_slug, profile_visibility)
VALUES ('sheppert', 'Sheppert', 'sheppert', 'public')
ON CONFLICT (public_slug) DO NOTHING;

INSERT INTO member_claims (member_id, app_user_id, claim_status, verified_at)
SELECT m.id, au.id, 'verified', now()
FROM members m, app_users au
WHERE m.public_slug = 'csubs-leader' AND au.email = '${ADMIN_USER}'
ON CONFLICT (member_id, app_user_id) DO UPDATE SET claim_status = 'verified', verified_at = now();

INSERT INTO member_claims (member_id, app_user_id, claim_status, verified_at)
SELECT m.id, au.id, 'verified', now()
FROM members m, app_users au
WHERE m.public_slug = 'sheppert' AND au.email = '${SHEP_USER}'
ON CONFLICT (member_id, app_user_id) DO UPDATE SET claim_status = 'verified', verified_at = now();

INSERT INTO app_user_global_roles (app_user_id, role)
SELECT au.id, 'platform_admin'
FROM app_users au
WHERE au.email = '${ADMIN_USER}'
ON CONFLICT (app_user_id, role) DO NOTHING;
SQL
echo "[provision-phase134-matrix-db] identity/authz bootstrap complete"

echo "[provision-phase134-matrix-db] Step 5/5: seed ${MATRIX_DB} via the Plan-134-01 idempotent seed script"
docker exec team4sv30-frontend mkdir -p /tmp/fixtures
docker cp scripts/member-profile-fixture.manifest.json team4sv30-frontend:/tmp/member-profile-fixture.manifest.json
docker cp scripts/fixtures/seed134-story.jpg team4sv30-frontend:/tmp/fixtures/seed134-story.jpg
docker cp scripts/seed-member-profile-fixtures.mjs team4sv30-frontend:/tmp/seed134-matrix.mjs
docker exec \
  -e SEED_API_BASE="http://192.168.235.196:${MATRIX_HOST_PORT}" \
  -e SEED_KC_BASE="http://192.168.235.196:18081" \
  team4sv30-frontend node /tmp/seed134-matrix.mjs

echo "[provision-phase134-matrix-db] DONE"
echo "  Matrix database:        ${MATRIX_DB}"
echo "  Temporary backend:      ${HEALTH_URL}"
echo "  Container:               ${MATRIX_BACKEND_CONTAINER} (left running for the Go test run)"
