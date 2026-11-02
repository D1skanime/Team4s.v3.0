#!/usr/bin/env bash
# Automatisierter Regressionsnachweis für den Pagination-Fix (Quick-Task 261102-cb2):
# ruft die drei Server-Seiten ab, deren Seitennavigation vorher mit "Functions cannot be
# passed directly to Client Components" (HTTP 500) abstürzte, weil Pagination eine
# Inline-Funktion als Prop über die Server/Client-Grenze bekam. Eine Storybook-Render-Prüfung
# kann diesen Fehlertyp NICHT fangen (reiner Next.js-SSR/RSC-Serialisierungsfehler). Der
# Live-Check liest deshalb neben dem HTTP-Status den Response-Body und die seit seinem Start
# entstandenen Frontend-Logs: Next kann den Fehler trotz HTTP 200 ausschließlich dort melden.
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"
ERROR_MARKER='Functions cannot be passed directly to Client Components'
started_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
response_file=$(mktemp)
trap 'rm -f "$response_file"' EXIT

ROUTES=(
  "/anime"
  "/archiv"
  "/members/ranking"
)

failed=0

for route in "${ROUTES[@]}"; do
  url="${BASE_URL}${route}"
  status=$(curl -sS -o "$response_file" -w "%{http_code}" "$url")
  if [ "$status" != "200" ]; then
    echo "FAIL: ${url} -> ${status}"
    failed=1
  elif grep -Fq "$ERROR_MARKER" "$response_file"; then
    echo "FAIL: ${url} -> ${status}; RSC-Serialisierungsfehler im Response-Body"
    failed=1
  else
    echo "OK: ${url} -> ${status}"
  fi
done

if ! frontend_logs=$(docker compose logs --since "$started_at" --no-color team4sv30-frontend); then
  echo 'FAIL: Frontend-Containerlog konnte nicht gelesen werden'
  failed=1
elif grep -Fq "$ERROR_MARKER" <<<"$frontend_logs"; then
  echo 'FAIL: RSC-Serialisierungsfehler im Frontend-Containerlog'
  failed=1
fi

exit "$failed"
