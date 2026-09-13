#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
[[ "${1:-}" == 158 && "${2:-}" =~ ^--(fixtures|gates)$ ]] || { echo 'Usage: bash scripts/verify-anime-detail-phase.sh 158 --fixtures|--gates'; exit 2; }
SERVICE=team4sv30-frontend
EVIDENCE=docs/audits/2026-09-13-public-anime-detail/phase158
mkdir -p "$EVIDENCE"
if [[ "$2" == --fixtures ]]; then
  # All large artifacts stay on the Docker disk. No .env, live .next or node_modules copy.
  docker compose exec -T "$SERVICE" sh -c 'if test -e /tmp/team4s-phase158-production; then test ! -L /tmp/team4s-phase158-production && test "$(cat /tmp/team4s-phase158-production/.phase158-owned 2>/dev/null)" = phase158 || exit 2; rm -rf /tmp/team4s-phase158-production; fi; mkdir /tmp/team4s-phase158-production; printf phase158 > /tmp/team4s-phase158-production/.phase158-owned; cd /app; tar --exclude="./.env*" --exclude="./.next" --exclude="./node_modules" --exclude="./scripts/shot2.mjs" -cf - . | tar -xf - -C /tmp/team4s-phase158-production; ln -s /app/node_modules /tmp/team4s-phase158-production/node_modules'
  set +e
  docker compose exec -T -w /tmp/team4s-phase158-production -e NODE_ENV=production -e NEXT_TELEMETRY_DISABLED=1 -e API_INTERNAL_URL=http://127.0.0.1:3159 -e NEXT_PUBLIC_API_URL=http://127.0.0.1:3158 -e NEXT_PUBLIC_AUTH_BYPASS_LOCAL=false "$SERVICE" npm run build -- --webpack > "$EVIDENCE/production-build.log" 2>&1
  build_code=$?
  printf '%s\n' "$build_code" > "$EVIDENCE/production-build.exit"
  set -e
  if [[ "$build_code" != 0 ]]; then
    # A full build failure is never a PASS. Only the exact pre-existing route export blocker
    # permits a separately labelled selective production proof for the affected public routes.
    grep -q 'formatEditLoadError.*not a valid Page export' "$EVIDENCE/production-build.log" || exit "$build_code"
    git show 7c7e1c7d:frontend/src/app/admin/anime/\[id\]/edit/page.tsx | grep -q 'export function formatEditLoadError' || exit 2
    # Next16 selective path categorization accepts app/ but not src/app. This alias changes
    # neither route source nor parent layout; it exists only in the disposable copy.
    docker compose exec -T -w /tmp/team4s-phase158-production "$SERVICE" ln -s src/app app
    docker compose exec -T -w /tmp/team4s-phase158-production -e NODE_ENV=production -e NEXT_TELEMETRY_DISABLED=1 -e API_INTERNAL_URL=http://127.0.0.1:3159 -e NEXT_PUBLIC_API_URL=http://127.0.0.1:3158 -e NEXT_PUBLIC_AUTH_BYPASS_LOCAL=false "$SERVICE" npm run build -- --webpack --debug-build-paths 'app/anime/**/page.tsx,app/fansubs/**/page.tsx' > "$EVIDENCE/production-selective-build.log" 2>&1
    grep -Fq '/anime/[id]' "$EVIDENCE/production-selective-build.log"
    grep -Fq '/fansubs/[slug]/fansubprojekt/[animeSlug]' "$EVIDENCE/production-selective-build.log"
    printf '0\n' > "$EVIDENCE/production-selective-build.exit"
  fi
  set +e
  docker compose exec -T -w /tmp/team4s-phase158-production -e NODE_ENV=production -e PHASE158_FIXTURES=1 -e API_INTERNAL_URL=http://127.0.0.1:3159 -e NEXT_PUBLIC_API_URL=http://127.0.0.1:3158 -e NEXT_PUBLIC_AUTH_BYPASS_LOCAL=false "$SERVICE" node scripts/anime-detail-phase158-probe.mjs > "$EVIDENCE/fixture-run.log" 2>&1
  fixture_code=$?
  set -e
  printf '%s\n' "$fixture_code" > "$EVIDENCE/fixture-run.exit"
  docker cp "$(docker compose ps -q "$SERVICE"):/tmp/team4s-phase158-evidence/." "$EVIDENCE/"
  exit "$fixture_code"
fi
run_gate() {
  local name="$1"; shift
  set +e
  "$@" > "$EVIDENCE/$name.log" 2>&1
  local code=$?
  set -e
  printf '%s\n' "$code" > "$EVIDENCE/$name.exit"
  printf '%s: exit %s\n' "$name" "$code"
}
run_gate frontend-tests docker compose exec -T "$SERVICE" npm test
run_gate typecheck docker compose exec -T "$SERVICE" npm run typecheck
run_gate lint docker compose exec -T "$SERVICE" npm run lint
run_gate backend-build docker compose exec -T team4sv30-backend go build ./...
run_gate backend-vet docker compose exec -T team4sv30-backend go vet ./internal/repository ./internal/handlers ./internal/models
run_gate diff-check git diff 7c7e1c7d02ac870e7c68c02b66fd7f4b33f36b85 --check
# SQL uses only an opt-in disposable database; no application DATABASE_URL is read.
if docker inspect team4s-phase158-test >/dev/null 2>&1; then
  echo 'Existing isolated SQL fixture container; refusing to take ownership.' >&2
  exit 2
fi
sql_id=$(docker run -d --rm --name team4s-phase158-test --network team4s_default --tmpfs /var/lib/postgresql/data:rw -e POSTGRES_DB=team4s_phase106_test_p158 -e POSTGRES_PASSWORD=phase158-isolated-test postgres:16)
trap 'docker stop "$sql_id" >/dev/null' EXIT
for attempt in {1..30}; do
  if docker exec "$sql_id" pg_isready -U postgres -d team4s_phase106_test_p158 >/dev/null 2>&1; then break; fi
  sleep 1
done
run_gate backend-anime-tests docker compose exec -T -e TEAM4S_PHASE106_TEST_DSN=postgres://postgres:phase158-isolated-test@team4s-phase158-test:5432/team4s_phase106_test_p158?sslmode=disable team4sv30-backend go test ./internal/repository ./internal/handlers ./internal/models -run 'Test.*(Anime|ParseAnimeID|Phase136ContractParity)' -count=1 -v
grep -q -- '--- PASS: TestAnimePublicReadRelationsStatusAndSQLBudget' "$EVIDENCE/backend-anime-tests.log"
grep -q -- '--- PASS: TestAnimePublicReadRelationsDatabaseErrors' "$EVIDENCE/backend-anime-tests.log"
grep -q -- '--- PASS: TestAnimePublicReadDetailStoredSlugAndSQLBudget' "$EVIDENCE/backend-anime-tests.log"
# Legacy integration SKIPs elsewhere are recorded separately, never credited as executed SQL.
# Baseline classification and guarded SQL fixture evidence are reviewed in RESULTS.md.
# An aggregate green exit must never conceal the two acknowledged global baseline failures.
[[ "$(cat "$EVIDENCE/backend-anime-tests.exit")" == 0 && "$(cat "$EVIDENCE/frontend-tests.exit")" == 0 && "$(cat "$EVIDENCE/lint.exit")" == 0 && "$(cat "$EVIDENCE/typecheck.exit")" == 0 && "$(cat "$EVIDENCE/backend-build.exit")" == 0 && "$(cat "$EVIDENCE/backend-vet.exit")" == 0 && "$(cat "$EVIDENCE/diff-check.exit")" == 0 ]]
