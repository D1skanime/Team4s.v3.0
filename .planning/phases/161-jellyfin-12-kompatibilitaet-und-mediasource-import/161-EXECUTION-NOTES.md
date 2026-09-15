# Phase 161 execution notes

## Environment and verification

Canonical checkout: /home/d1sk/team4s through ssh team4s-linux. Branch main, no worktrees; execute the approved plans sequentially. All Go and frontend commands run in existing Compose containers. Phase 160 waits for this repair.

The backend /app source is copied into its image, not bind-mounted. Synchronize only the currently owned changed files into /app with docker cp before testing. A comparison of 800 Go/module files against baseline b3b07ff0 matched before the first runtime changes. Source synchronization does not replace the running go-run process; no backend restart has occurred through Plan 01. Final live verification must rebuild/restart the backend deliberately after all changes and recheck the actual runtime. Never count tests against stale image files as current-source verification.

Frontend /app is bind-mounted. Its node_modules and .next are volumes. Production builds must use a separate directory in the frontend container, never the active .next. The complete baseline build compiled and then reproduced the existing Next Page export error.

The sanitized 11eyes fixtures live once in docs/audits/2026-09-15-jellyfin12/fixtures. They have also been copied to /docs/audits/2026-09-15-jellyfin12/fixtures inside the backend container for tests; these copies disappear on image recreation and must be synchronized again if required.

## Isolated integration database

Dedicated database: team4s_phase117_test_161 on Compose service team4sv30-db. Existing testsupport.OpenPhase117Postgres enforces a permitted test database name, a unique schema and a search_path excluding public; cleanup is restricted to that schema. Do not use application DATABASE_URL as a test target.

To execute tests, a VM Python subprocess reads the existing database container Config.Env through docker inspect in memory. Construct a URL-escaped DSN for the dedicated database, place it only in the subprocess environment as TEAM4S_PHASE117_TEST_DSN, and invoke docker exec -e TEAM4S_PHASE117_TEST_DSN -w /app team4sv30-backend go test with the exact focused packages and patterns. Never print or persist the environment, database password or DSN. Required DB tests must execute; skipped tests do not establish correctness.

## Baseline and live evidence

Full baseline classification and machine-readable results are under docs/audits/2026-09-15-jellyfin12. Full .log files are present locally and ignored by Git; committed JSON and BASELINE.md record the results. Known frontend failures: 13 lint errors/328 warnings, two Page type errors, two CSS guard test failures; 2714 frontend tests pass. Backend build/vet and focused Jellyfin tests pass; the broad suite has 50 pre-existing fixture/invariant failure headings.

Team4s baseline: group assets 502; persisted anime backdrop manifest 200; release40 200 with missing audio/subtitle language; logo proxy already 200. Do not claim these previously successful routes were broken. Shared browser release40 details were inspected anonymously. No active protected browser session should be assumed.

11eyes: 27 genuine items, 38 nested sources, 11 source IDs not resolvable as items; each actual item has a unique own-path source. Preserve separate item/source identities and one selected source per item. No provider library scan or live import/relink is authorized; database persistence tests use isolated fixtures. A later normal operator import/relink may populate existing rows, but this phase does not run a backfill.

## User clarification D-16

Unknown audio language displays Japanisch only in the existing UI field. Known audio language wins. Raw source/API values remain null when unknown, and subtitle language receives no Japanese default. Plans 02/04/08 and the independent plan check include this explicit user decision.

## Progress

Plan 01 complete, summary commit 9818a5a1; phase bookkeeping and D-16 commit 47f41b66. Plan 02 is the current executor slice. Its files are owned by jellyfin161_execute02; root owns audit/bookkeeping documents. Do not stage another owner's files. Next: finish 02, execute 03, then 04–09 and independent phase verification. No push or human UAT sign-off has been performed.

## Plan 02 verification completed

Implementation a72737f4; coordinator repeated expanded source/JSON tests with dedicated DB DSN: 174 pass, zero fail/skip. Summary and machine-readable plan02-checks.json record exact limits. Plan03 proceeds; application process remains unrestarted.

## Runtime correction after Plan 02

The backend runs Air (PID1), whose .air.toml watches production Go sources. Copying source into /app can rebuild/restart the live server automatically. Earlier statements that the running server necessarily remained unchanged were not verified and are superseded by this observation. Test-only files are excluded from the watcher. Source synchronization must remain coherent; final verification must establish the actual running code. Compose recreation executes migrate up first, so check pending migrations before any recreation.
