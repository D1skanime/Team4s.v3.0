---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
plan: "01"
subsystem: api
tags: [jellyfin, authentication, pagination, go, httptest]
requires:
  - phase: 161-discovery
    provides: Audited callers, live Jellyfin 12 query evidence and approved plans
provides:
  - Shared origin-bound Jellyfin header authentication and sanitized transport errors
  - Four metadata/status callers wired to the shared boundary
  - Direct group roots, complete child paging and exact group/series item lookup
affects: [161-02, 161-03, 161-04, 161-09]
tech-stack:
  added: []
  patterns: [Shared request constructor, per-call client copy, ID-based pagination validation]
key-files:
  created:
    - backend/internal/jellyfin/request.go
    - backend/internal/jellyfin/request_test.go
    - backend/internal/handlers/jellyfin12_metadata_test.go
  modified:
    - backend/internal/handlers/jellyfin_client.go
    - backend/internal/handlers/anime_backdrops_client.go
    - backend/internal/handlers/group_assets_jellyfin.go
    - backend/internal/handlers/group_assets_jellyfin_test.go
    - backend/internal/handlers/jellyfin_client_series.go
    - backend/internal/handlers/admin_content_test.go
key-decisions:
  - Copy each caller's http.Client per execution so redirect policy cannot race with shared clients.
  - Represent optional TotalRecordCount explicitly; zero and omitted totals have different completeness semantics.
  - Keep existing decoder and application status ownership; source selection and binary consumers remain assigned to subsequent plans.
patterns-established:
  - BuildURL creates key-free URLs; NewRequest attaches modern auth only at the configured origin; Do constrains redirects and sanitizes transport/body errors.
requirements-completed: [P161-AUTH, P161-API, P161-ITEMS]
duration: 15min
completed: 2026-09-15
---

# Phase 161 Plan 01: Jellyfin request boundary and metadata query summary

**Metadata/status requests now use origin-bound header authentication; group pagination detects incomplete responses and exact item lookups cannot select another ID.**

## Performance

- Duration: approximately 15 minutes including context, implementation and verification.
- Completed: 2026-09-15.
- Tasks: 3/3.
- Source/test files changed: 9.
- Execution: canonical Linux checkout via SSH; no worktrees, push, restart or live data changes.
- Requirements above identify this plan's coverage. Phase-wide AUTH/API completion still depends on the subsequent transport/source plans and integrated verification.

## Accomplishments

- Added shared `internal/jellyfin.BuildURL`, `NewRequest`, and `Do`. They preserve base prefixes, encoded paths and query values, strip legacy auth query keys without mutating caller maps, reject CR/LF credentials and foreign request origins, block cross-origin/downgrade redirects, and retain same-origin authentication.
- Preserved shared client timeouts, transport and custom redirect policy using a per-call client copy. Sanitized transport and response-body read/close errors retain `errors.Is` and timeout classification.
- Wired Admin JSON, Anime JSON, Anime status and GroupAssets JSON requests. Kept existing decoders, status/error mapping, caching, body closure and admin non-UTF8 normalization.
- Explicitly request `Recursive=false` for project roots and `true` for group descendants. Child reads reuse existing paging and path sorting.
- Reject duplicate/missing IDs, changing/negative/exceeded totals and empty pages before a promised total. An absent total still supports short/empty-page termination. No partial result is reported as complete after an inconsistent page.
- Changed group detail to `/Items?Ids=...` with exact-ID validation. Removed wrong-first-item fallbacks from both series lookup and intake detail. Removed invalid series/group ItemFields while retaining normally returned year/image/runtime data.
- Fanart, Emby and other provider code is unchanged.

## Task Commits

1. Shared request boundary:
   - `9412efbe` — test(161-01): define Jellyfin request security boundary (RED: missing shared API).
   - `8b940181` — feat(161-01): implement origin-bound Jellyfin header authentication (GREEN).
2. Metadata/status callers:
   - `972b26ad` — test(161-01): capture metadata owner authentication and failures (RED: missing headers, URL secrets and leaked transport diagnostics).
   - `cb8603b8` — feat(161-01): route metadata owners through Jellyfin header transport (GREEN).
3. GetItems semantics:
   - `9c38ef56` — test(161-01): expose group paging and exact item query regressions (RED: nested roots, 200-item cutoff, inconsistent pages, invalid fields and unrelated IDs).
   - `29a0ab7f` — feat(161-01): enforce complete group pagination and exact item lookup (GREEN).

## Verification

All commands executed in Docker on the canonical Linux host. Backend source is image-copied, not bind-mounted: every changed file was explicitly copied to `/app` before testing. Formatting ran only on assigned files inside the backend container and was copied back to the canonical tree.

- `docker exec -w /app team4sv30-backend go test ./internal/jellyfin -count=1` — PASS.
- Task 2 planned metadata/normalization/editor-context gate — PASS with dedicated `TEAM4S_PHASE117_TEST_DSN`.
- Task 3 planned GroupAssets/Jellyfin12Metadata/JellyfinSearch/JellyfinIntake gate — PASS.
- Expanded final handler gate: `go test ./internal/handlers -run 'Test.*(Jellyfin|MediaProxy|GroupAssets|Subtitle|EpisodeImport|Subgroup|GroupAsset|GroupEpisodeAssets|NormalizeJellyfin|EpisodeVersionEditorContext)' -count=1 -json` — **136 test/subtest passes, 0 failures, 0 skips**.
- All four actual editor-context database fixtures executed using the guarded `team4s_phase117_test_161` database and temporary schemas: unauthorized upstream degrades to 200, success remains nondegraded, unconfigured remains nondegraded, scan keeps 502.
- `go build ./...` — PASS.
- `go vet ./internal/jellyfin ./internal/handlers` — PASS.
- Recorded Jellyfin 12 schema check: every requested ItemFields token in the changed series/group calls exists in `openapi-used-endpoints.json`.
- `git diff --check` — PASS.
- Stub scan and new threat-surface review — no unfinished stubs or unmodeled surfaces; no public contract/schema change.

## Request Counts

- Metadata/status owner fixtures: one HTTP request per call, unchanged.
- Group root fixture: one direct-root Items request with a cached library ID; existing 501-root fixture still uses two root pages plus the library lookup.
- Child fixture: 201 unique IDs, 200 + 1, exactly two HTTP requests (previously one truncated 200-item read).
- Exact group, exact series and intake detail: one request each. Wrong/absent IDs return no item.
- Bounded title search retains its supplied limit; no unbounded traversal was introduced.
- Inconsistent/repeated page fixtures terminate after one or two requests with an error.
- Same-origin redirect fixture uses two requests; foreign and downgrade destinations receive zero requests.

## Deviations from Plan

**[Rule 3 - Blocking] Updated existing assertion-only fixtures for the approved transport/query change.**
- The existing group library fixture encoded the legacy query credential in its expected URI; changed it to the key-free URI during Task 2.
- Expanded verification found three existing assertions in `admin_content_test.go` expecting query authentication or invalid `ProductionYear` ItemFields. Updated only those assertions in Task 3.
- This additional test file was necessary to preserve accurate coverage after the planned change; no extra runtime behavior or API contract was added.
- Commits: `cb8603b8`, `29a0ab7f`.

## Issues Encountered and Evidence Limits

- `go test -race` could not run: backend image disables CGO and has no gcc when CGO is enabled. Normal concurrent-client tests execute and pass; no toolchain was installed.
- The repository's GSD wrapper exposes legacy verbs (`init execute-phase`, `state load`) rather than SDK `query` verbs. Context was loaded through the supported wrapper.
- The initial new-package test before container synchronization reported a missing directory; it was not counted as RED proof. After synchronization the intended undefined shared-API errors provided RED evidence.
- No frontend files changed. Existing global frontend lint/typecheck/CSS failures and broad unrelated Go fixture/invariant failures remain documented in the discovery baseline; this plan did not claim those global gates green.
- No live API retest or application restart is claimed here. Only the container's test source was synchronized; root owns integrated runtime verification and phase bookkeeping.
- No authentication gate occurred.

## Next Plan Readiness

The shared auth/request API is available to subsequent plans. Source DTO/resolver and remaining binary/FFmpeg callers still belong to their assigned plans. Before subsequent Docker tests, explicitly synchronize changed canonical source into `/app`; the running backend image does not mount it.

STATE, ROADMAP and REQUIREMENTS edits are owned by the coordinating agent, per this execution assignment.

## Self-Check: PASSED

All three created implementation/test files, this summary and all six RED/GREEN commits were verified on the canonical host. No tracked file deletion was introduced.

### Runtime observation correction

The coordinator subsequently established that PID1 is Air and production Go source copies can trigger its watcher. No manual service restart was issued in this plan, but the earlier claim that the application necessarily stayed on old code is not established. Final integrated checks will verify the actual live code. See 161-EXECUTION-NOTES.md and runtime-source-watch.json.
