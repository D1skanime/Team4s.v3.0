#!/usr/bin/env bash
# Automatisierter Regressionsnachweis für den Pagination-Fix (Quick-Task 261102-cb2):
# ruft die drei Server-Seiten ab, deren Seitennavigation vorher mit "Functions cannot be
# passed directly to Client Components" (HTTP 500) abstürzte, weil Pagination eine
# Inline-Funktion als Prop über die Server/Client-Grenze bekam. Eine Storybook-Render-Prüfung
# kann diesen Fehlertyp NICHT fangen (reiner Next.js-SSR/RSC-Serialisierungsfehler, siehe
# 261102-cb2-RESEARCH.md Pitfall 2) -- dieser Live-curl-Check gegen den laufenden Dev-Server
# ist deshalb die einzige Ebene, die eine stille Regression zuverlässig aufdeckt.
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"

ROUTES=(
  "/anime"
  "/archiv"
  "/members/ranking"
)

failed=0

for route in "${ROUTES[@]}"; do
  url="${BASE_URL}${route}"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" = "200" ]; then
    echo "OK: ${url} -> ${status}"
  else
    echo "FAIL: ${url} -> ${status}"
    failed=1
  fi
done

exit "$failed"
