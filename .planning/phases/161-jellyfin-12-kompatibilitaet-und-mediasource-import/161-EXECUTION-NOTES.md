# Phase 161 execution notes

## Environment and verification

Canonical checkout: /home/d1sk/team4s through ssh team4s-linux. Branch main, no worktrees; execute the approved plans sequentially. All Go and frontend commands run in existing Compose containers. Phase 160 waits for this repair.

The backend /app source is copied into its image, not bind-mounted. Synchronize only the currently owned changed files into /app with docker cp before testing. A comparison of 800 Go/module files against baseline b3b07ff0 matched before the first runtime changes. Air watches production Go files and may rebuild/restart the actual server when source is copied. Synchronize coherent source sets. Final live verification must establish source parity and actual running-code behavior; do not force Compose recreation merely to test, because recreation runs migrations first. Never count tests against stale image files as current-source verification.

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

Plans01–06 are complete; Plan07 is active, owned by jellyfin161_execute07. Root owns bookkeeping and Plan09 preparation. Finish07, then08, integrated09 gates and independent verification. No push or Human-UAT sign-off. Current verified summaries are authoritative; STATE/ROADMAP track6/9.
## Plan 02 verification completed

Implementation a72737f4; coordinator repeated expanded source/JSON tests with dedicated DB DSN: 174 pass, zero fail/skip. Summary and machine-readable plan02-checks.json record exact limits. The earlier runtime-restart inference is corrected below.

## Runtime correction after Plan 02

The backend runs Air (PID1), whose .air.toml watches production Go sources. Copying source into /app can rebuild/restart the live server automatically. Earlier statements that the running server necessarily remained unchanged were not verified and are superseded by this observation. Test-only files are excluded from the watcher. Source synchronization must remain coherent; final verification must establish the actual running code. Compose recreation executes migrate up first, so check pending migrations before any recreation.

## Coordinator verification preparation

Application implementation remains sequential through Plans01–08. While Plan05 owns repository changes, the coordinator may prepare the read-only Plan09 verification script independently (no shared application files, no DB writes). This is preparation only: final execution, integrated evidence and Plan09 completion remain gated on Plan08. This bounded scheduling adjustment avoids idle coordination without weakening the phase gates.

## Read-only verifier preparation and preflight

Prepared scripts/check-jellyfin12.py and four local stdlib boundary tests (requests/bytes, no redirects, no secret output, evidence-only destination). First preflight: 22 GETs, all HTTP checks successful, live12.0.0 schema matches all11 inventoried paths; Buddy13 matches pages5+5+3, 11eyes27/38/11 unchanged. One diagnostic assertion failed: it assumed returned ParentId equals queried library ID. Focused follow-up proved CollectionFolder Groups and physical Folder Subgroups have different IDs but exactly the same direct child set. Removed that invalid assertion, retained complete/direct-vs-descendant set checks and recorded parent IDs; added explicit library enumeration. Original failed preflight remains evidence, not rewritten as a pass. Final full run still follows Plan08. No app source or rows changed by this preparation.

## Bounded Plan07 source-consumer correction

Coordinator consumer review found resolveEpisodeVersionDuration still calls getJellyfinEpisodeDurationSeconds(itemID), which passes nil stored binding. A future bound alternative B with missing duration could therefore borrow own-source A runtime. Plan07 already owns the editor helper and shared source wiring; its Task2 now explicitly covers this consumer and a bound-B/own-A regression in existing admin_content_test.go. This is D-07 source coherence, not a new feature; no read-side persistence or unrelated editor redesign.

## Plan06 fixture boundary

If an old integration fixture lacks stream_sources.metadata, extend that guarded fixture to the actual existing schema. Do not introduce to_jsonb(row) schema-compatibility reads solely to keep incomplete test schemas working. A bounded editor source lookup is permitted and must report its fixed query cost; reuse the existing binding reader instead of duplicating SQL.

## Plan06 same-plan ownership split

Root implemented Task3 frontend hook/tests and one fallback-helper line while the executor finished Task2/backend scan; ownership was explicitly transferred before edits. This did not overlap application plans06/07. Source summaries record all commits and99 frontend test passes. Intermediate broad Go result repeats exactly50 existing failures; final coherent gates still follow08.
