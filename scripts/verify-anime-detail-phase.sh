#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
[[ "${1:-}" =~ ^(158|159)$ && "${2:-}" =~ ^--(fixtures|gates)$ ]] || { echo 'Usage: bash scripts/verify-anime-detail-phase.sh 158|159 --fixtures|--gates'; exit 2; }
PHASE="$1"
SERVICE=team4sv30-frontend
EVIDENCE="docs/audits/2026-09-13-public-anime-detail/phase$PHASE"
PRODUCTION="/tmp/team4s-phase$PHASE-production"
mkdir -p "$EVIDENCE"
if [[ "$2" == --fixtures ]]; then
  SOURCE_SHA=$(git ls-files -z frontend/src frontend/public frontend/package.json frontend/package-lock.json frontend/next.config.mjs | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1)
  if [[ "${PHASE_REUSE_BUILD:-0}" == 1 ]]; then
    docker compose exec -T "$SERVICE" sh -c 'test -f "$1/.next/BUILD_ID" && test "$(cat "$1/.phase-source-sha")" = "$2"' sh "$PRODUCTION" "$SOURCE_SHA"
    # Harness edits do not change the built product. Reuse only the verified product hash.
    tar -C frontend -cf - scripts/anime-detail-phase158-probe.mjs scripts/anime-detail-phase159-probe.mjs scripts/fixtures/anime-detail-fixture-server.mjs | docker compose exec -T "$SERVICE" tar -xf - -C "$PRODUCTION"
  else
    docker compose exec -T -e PHASE="$PHASE" "$SERVICE" sh -c '
      set -eu
      case "$PHASE" in 158|159) ;; *) exit 2;; esac
      target="/tmp/team4s-phase$PHASE-production"
      if test -e "$target"; then
        test ! -L "$target" && test "$(cat "$target/.phase-owned" 2>/dev/null)" = "$PHASE" || exit 2
        rm -rf "$target"
      fi
      mkdir "$target"; printf "%s" "$PHASE" > "$target/.phase-owned"
      cd /app
      tar --exclude="./.env*" --exclude="./.next" --exclude="./node_modules" --exclude="./scripts/shot2.mjs" -cf - . | tar -xf - -C "$target"
      ln -s /app/node_modules "$target/node_modules"
    '
    set +e
    docker compose exec -T -w "$PRODUCTION" -e NODE_ENV=production -e NEXT_TELEMETRY_DISABLED=1 -e API_INTERNAL_URL=http://127.0.0.1:3159 -e NEXT_PUBLIC_API_URL=http://127.0.0.1:3158 -e NEXT_PUBLIC_AUTH_BYPASS_LOCAL=false -e MEDIA_BASE_PATH="$PRODUCTION/fixture-media" "$SERVICE" npm run build -- --webpack > "$EVIDENCE/production-build.log" 2>&1
    build_code=$?
    printf '%s\n' "$build_code" > "$EVIDENCE/production-build.exit"
    set -e
    if [[ "$build_code" != 0 ]]; then
      grep -q 'formatEditLoadError.*not a valid Page export' "$EVIDENCE/production-build.log" || exit "$build_code"
      git show c3bfcb23781addca1ccd3931592535416f706787:frontend/src/app/admin/anime/\[id\]/edit/page.tsx | grep -q 'export function formatEditLoadError'
      docker compose exec -T -w "$PRODUCTION" "$SERVICE" ln -s src/app app
      routes='app/anime/**/page.tsx,app/fansubs/**/page.tsx'
      if [[ "$PHASE" == 159 ]]; then routes="$routes,app/api/releases/**/route.ts,app/api/v1/**/route.ts,app/media/**/route.ts,app/covers/**/route.ts"; fi
      printf '%s\n' "$routes" > "$EVIDENCE/production-selected-routes.txt"
      docker compose exec -T -w "$PRODUCTION" -e NODE_ENV=production -e NEXT_TELEMETRY_DISABLED=1 -e API_INTERNAL_URL=http://127.0.0.1:3159 -e NEXT_PUBLIC_API_URL=http://127.0.0.1:3158 -e NEXT_PUBLIC_AUTH_BYPASS_LOCAL=false -e MEDIA_BASE_PATH="$PRODUCTION/fixture-media" "$SERVICE" npm run build -- --webpack --debug-build-paths "$routes" > "$EVIDENCE/production-selective-build.log" 2>&1
      grep -Fq '/anime/[id]' "$EVIDENCE/production-selective-build.log"
      if [[ "$PHASE" == 159 ]]; then
        grep -Fq '/covers/display/[file]' "$EVIDENCE/production-selective-build.log"
        grep -Fq '/api/releases/[id]/stream' "$EVIDENCE/production-selective-build.log"
      fi
      printf '0\n' > "$EVIDENCE/production-selective-build.exit"
    fi
    docker compose exec -T "$SERVICE" sh -c 'printf "%s" "$2" > "$1/.phase-source-sha"' sh "$PRODUCTION" "$SOURCE_SHA"
  fi
  set +e
  docker compose exec -T -w "$PRODUCTION" -e NODE_ENV=production -e "PHASE${PHASE}_FIXTURES=1" -e API_INTERNAL_URL=http://127.0.0.1:3159 -e NEXT_PUBLIC_API_URL=http://127.0.0.1:3158 -e NEXT_PUBLIC_AUTH_BYPASS_LOCAL=false -e MEDIA_BASE_PATH="$PRODUCTION/fixture-media" "$SERVICE" node scripts/anime-detail-phase158-probe.mjs > "$EVIDENCE/fixture-run.log" 2>&1
  fixture_code=$?
  set -e
  printf '%s\n' "$fixture_code" > "$EVIDENCE/fixture-run.exit"
  docker cp "$(docker compose ps -q "$SERVICE"):/tmp/team4s-phase$PHASE-evidence/." "$EVIDENCE/"
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
if [[ "$PHASE" == 159 ]]; then
  # Root owns full frontend gates at the final product snapshot; no duplicate heavy run.
  test -d "$EVIDENCE/root-gates-15905"
  printf '%s\n' 'Full frontend gates are independently recorded in root-gates-15905; see RESULTS for exact baseline classification.' > "$EVIDENCE/frontend-gates-owner.txt"
else
  run_gate frontend-tests docker compose exec -T "$SERVICE" npm test
  run_gate typecheck docker compose exec -T "$SERVICE" npm run typecheck
  run_gate lint docker compose exec -T "$SERVICE" npm run lint
fi
SCRATCH="/app/tmp/phase${PHASE}-gates"
docker compose exec -T -e PHASE="$PHASE" team4sv30-backend sh -c '
  set -eu
  case "$PHASE" in 158|159) ;; *) exit 2;; esac
  target="/app/tmp/phase${PHASE}-gates"
  if test -e "$target"; then
    test ! -L "$target" && test "$(cat "$target/.phase-owned" 2>/dev/null)" = "$PHASE" || exit 2
    rm -rf "$target"
  fi
  mkdir "$target"; printf "%s" "$PHASE" > "$target/.phase-owned"
'
tar --exclude=backend/tmp --exclude='backend/.env*' -cf - backend database/migrations shared/contracts frontend/src/types | docker compose exec -T team4sv30-backend tar -xf - -C "$SCRATCH"
run_gate backend-build docker compose exec -T -w "$SCRATCH/backend" team4sv30-backend go build ./...
run_gate backend-vet docker compose exec -T -w "$SCRATCH/backend" team4sv30-backend go vet ./internal/repository ./internal/handlers ./internal/models
run_gate diff-check git diff c3bfcb23781addca1ccd3931592535416f706787 --check
sql_name="team4s-phase${PHASE}-gate-test"
if docker inspect "$sql_name" >/dev/null 2>&1; then echo 'Existing fixture name; refusing ownership' >&2; exit 2; fi
sql_id=$(docker run -d --rm --name "$sql_name" --network team4s_default --tmpfs /var/lib/postgresql/data:rw -e POSTGRES_DB="team4s_phase117_test_p$PHASE" -e POSTGRES_PASSWORD=phase159-isolated-test postgres:16)
printf '%s\n' "$sql_id" > "$EVIDENCE/sql-container.id"
trap 'docker stop "$sql_id" >/dev/null' EXIT
for attempt in {1..30}; do
  if docker exec "$sql_id" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$sql_id" createdb -U postgres "team4s_phase106_test_p$PHASE"
run_gate backend-anime-tests docker compose exec -T -w "$SCRATCH/backend" -e "TEAM4S_PHASE106_TEST_DSN=postgres://postgres:phase159-isolated-test@$sql_name:5432/team4s_phase106_test_p$PHASE?sslmode=disable" -e "TEAM4S_PHASE117_TEST_DSN=postgres://postgres:phase159-isolated-test@$sql_name:5432/team4s_phase117_test_p$PHASE?sslmode=disable" team4sv30-backend go test ./internal/repository ./internal/handlers ./internal/models -run 'Test.*(Anime|EpisodeVersionPublic|ReleaseStream|ParseAnimeID|Phase136ContractParity)' -count=1 -v
for proof in TestAnimePublicReadRelationsStatusAndSQLBudget TestAnimePublicReadDetailStoredSlugAndSQLBudget TestEpisodeVersionPublicAtomicPages TestEpisodeVersionPublicRawQueryCompatibility TestReleaseStreamIdentityCanonicalGrantAndSource; do
  grep -q -- "--- PASS: $proof" "$EVIDENCE/backend-anime-tests.log"
done
[[ "$(cat "$EVIDENCE/backend-anime-tests.exit")" == 0 && "$(cat "$EVIDENCE/backend-build.exit")" == 0 && "$(cat "$EVIDENCE/backend-vet.exit")" == 0 && "$(cat "$EVIDENCE/diff-check.exit")" == 0 ]]
