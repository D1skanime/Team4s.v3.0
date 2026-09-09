#!/bin/sh
set -eu
cd /home/d1sk/team4s
# Execute only after run-isolation.py has restored original source.
test ! -e docs/audits/2026-09-09-public-member-performance/source-backup.json
docker compose exec -T -e AUDIT_LABEL=baseline-final -e AUDIT_REPEATS=2 team4sv30-frontend node scripts/audit-public-member-performance.mjs
docker compose exec -T -e AUDIT_LABEL=stress -e AUDIT_CYCLES=30 -e AUDIT_WARM=0 -e AUDIT_ROUTES=members/qc,members/kara,fansubs/new-subs team4sv30-frontend node scripts/audit-public-member-performance.mjs
docker compose exec -T -e AUDIT_LABEL=no-javascript -e AUDIT_JS_OFF=1 -e AUDIT_WARM=0 team4sv30-frontend node scripts/audit-public-member-performance.mjs
docker compose exec -T -e AUDIT_LABEL=optimizer-failure -e AUDIT_FAIL_BADGES=1 -e AUDIT_WARM=0 -e AUDIT_ROUTES=members/timer,members/kara team4sv30-frontend node scripts/audit-public-member-performance.mjs
docker compose exec -T -e AUDIT_LABEL=slow4g-cpu4 -e AUDIT_SLOW=1 -e AUDIT_CPU=4 -e AUDIT_WARM=0 team4sv30-frontend node scripts/audit-public-member-performance.mjs
