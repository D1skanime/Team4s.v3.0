---
phase: 165-library-discovery-assisted-anime-creation
plan: 06
subsystem: api
tags: [go, gin, jellyfin, cursor-pagination, discovery, audit-log]

# Dependency graph
requires:
  - phase: 165-01
    provides: buildJellyfinDiscoverySnapshot / resolveDiscoveryItemStatus / EncodeDiscoveryCursor,DecodeDiscoveryCursor,SeekDiscoverySnapshot
  - phase: 165-02
    provides: LibraryDiscoveryIgnoreRepository (Insert/Remove/FindIgnoredLibraryDiscoveryItems)
provides:
  - "GET /admin/jellyfin/discovery — cursor-paginated Discovery list composing the Wave-1 snapshot cache, status resolver, and cursor with exactly 1 existence-batch query + 1 ignore-batch query per served page (D-07), proven at 5-item and ~2111-item scale (D-29)"
  - "POST/DELETE /admin/jellyfin/discovery/ignore[/:itemID] — idempotent ignore/unignore mutations with audit_logs writes (D-21)"
  - "D-28 fix: buildJellyfinIntakeTypeHint additionally matches German 'spezial' folder names"
  - "jellyfinDiscoveryExistingMatchRepository / libraryDiscoveryIgnoreRepository narrow interfaces + AdminContentHandler fields, wired to the same repo instances in production (WithLibraryDiscoveryIgnoreDeps, main.go)"
affects: [165-09, 165-11-partial-status-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Narrow injectable interface fields on AdminContentHandler wired to the same concrete repo instance in production (jellyfinDiscoveryExistingMatchRepository/libraryDiscoveryIgnoreRepository), matching the pre-existing animeCreateRepo/adminAniSearchRepository pattern — used here purely for handler-test fakeability, not a real dependency swap"
    - "Widened AdminContentHandler.auditLogRepo from the concrete *repository.AuditLogRepository to the existing package-level auditLogWriter interface (already used by 8+ other handlers), enabling a fake audit writer in tests without changing any call site"

key-files:
  created:
    - backend/internal/handlers/jellyfin_discovery.go
    - backend/internal/handlers/jellyfin_discovery_test.go
    - backend/internal/handlers/jellyfin_discovery_ignore.go
    - backend/internal/handlers/jellyfin_discovery_ignore_test.go
    - backend/internal/handlers/jellyfin_intake_helpers_test.go
    - backend/internal/models/jellyfin_discovery.go
  modified:
    - backend/internal/handlers/jellyfin_intake_helpers.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go

key-decisions:
  - "The status-based `filter` query parameter (offen/bereits_vorhanden/ignoriert/alle) is applied AFTER paging, not before: resolving a snapshot item's D-17 status requires the batched DB lookups, which per the plan's own D-07 budget text are scoped to exactly the page's items, never the full snapshot. A page under a non-'alle' filter can therefore return fewer than `limit` items — this is the direct consequence of the D-07 budget, not a bug. The free-text `q` parameter IS applied before paging (pure in-memory Name/Path substring match against the full snapshot, no DB round trip needed)."
  - "Added jellyfinDiscoveryExistingMatchRepository and libraryDiscoveryIgnoreRepository as new narrow interfaces + AdminContentHandler fields (admin_content_handler.go was not in the plan's files_modified list) because h.repo is a concrete *repository.AdminContentRepository and LibraryDiscoveryIgnoreRepository has no pre-existing interface seam — the plan's own Test F/F2 (\"the fake repo's ... call counter\") and Test 1-4 (fake AuditLogRepository) require handler-level HTTP tests with fakes, which is impossible against a concrete Postgres-backed struct. Wired to the same repo instances in production (`handler.discoveryExistingMatchRepo = repo` in NewAdminContentHandler; `WithLibraryDiscoveryIgnoreDeps` in main.go), so this is purely a testability seam, not a behavior change."
  - "Widened auditLogRepo's field type to the pre-existing auditLogWriter interface (already used by 8 other handlers in the same package) instead of introducing a second parallel interface, since it is a drop-in replacement with zero call-site changes."
  - "Deferred wiring a live Redis adapter for discoveryCache (165-01's TTL cache) in main.go: buildJellyfinDiscoverySnapshot already degrades gracefully to an uncached fresh fetch when discoveryCache is nil (per 165-01's own design and SUMMARY, which named both 165-06 and 165-09 as candidate owners), and go-redis's *redis.Client does not structurally satisfy the discoveryCacheStore interface (different method signatures), so wiring it would require writing a new adapter type — a real unit of work outside this plan's declared files_modified and task list. Tracked as a non-blocking follow-up; correctness is unaffected, only TTL cache reuse is deferred."

requirements-completed: [REQ-165-01, REQ-165-02, REQ-165-03, REQ-165-04, REQ-165-07, REQ-165-12, REQ-165-16, REQ-165-18, REQ-165-20]

# Metrics
duration: ~55min
completed: 2026-09-21
---

# Phase 165 Plan 06: Discovery List + Ignore/Unignore Endpoints Summary

**GET /admin/jellyfin/discovery (cursor-paginated, ≤1-query-per-page D-07 budget proven at ~2111-item scale) plus idempotent audited POST/DELETE ignore endpoints, composing 165-01's snapshot/cursor/status-resolver and 165-02's ignore repository, with an additive D-28 fix so German "Spezial" Jellyfin folders resolve to the "special" type hint.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-09-21
- **Tasks:** 2/2
- **Files modified:** 10 (6 created, 4 modified)

## Accomplishments
- `ListJellyfinDiscovery` (`GET /admin/jellyfin/discovery`): composes `buildJellyfinDiscoverySnapshot` (165-01), an in-memory `q`-filter + (Name, JellyfinItemID) sort, `SeekDiscoverySnapshot` cursor paging, exactly one `FindExistingAnimeByJellyfinIntakeRefs` call and one `FindIgnoredLibraryDiscoveryItems` call per served page, `resolveDiscoveryItemStatus` (165-01), and (D-24) `library_context` via the existing `deriveJellyfinPathContexts` helper — zero additional Jellyfin/DB calls for that field. Query-budget and pagination correctness proven at both a 5-item fixture and a synthetic ~2111-item scale fixture matching the live-measured Fansubs `TotalRecordCount` (D-29).
- `IgnoreJellyfinDiscoveryItem`/`UnignoreJellyfinDiscoveryItem` (`POST`/`DELETE /admin/jellyfin/discovery/ignore[/:itemID]`): idempotent mutations against 165-02's repository, each writing a `jellyfin_discovery.ignored`/`jellyfin_discovery.unignored` `audit_logs` entry (D-21); a failing audit write never blocks the mutation response.
- D-28 fix: `buildJellyfinIntakeTypeHint`'s special-detection branch now also matches `"spezial"` (additive, one `case` extended), fixing the live bug where the German Fansubs folder `Anime.TV-Spezial.Sub` silently fell through to the `"tv"` default. Regression-tested against all eight live Fansubs path segments plus the pre-existing English `"special"`/`"season 00"` matches.
- Routes registered (`admin_routes.go`, purely additive): `GET /admin/jellyfin/discovery`, `POST /admin/jellyfin/discovery/ignore`, `DELETE /admin/jellyfin/discovery/ignore/:itemID`.
- `SearchJellyfinSeries` (pre-existing direct-search endpoint) and its full test suite (`TestSearchJellyfinSeries*`, `TestBuildAdminJellyfinIntake*`, `TestBuildAdminJellyfinIntakePreviewResult*`) pass unmodified in the same test run (D-12 non-regression).

## Task Commits

Each task was committed atomically:

1. **Task 1: GET /admin/jellyfin/discovery — list handler (+ D-28 shared-helper fix)** - `3defd417` (feat)
2. **Task 2: Ignore/Unignore mutation endpoints + audit + routes** - `49640046` (feat)

_Note: `tdd="true"` was set on both tasks; tests were written together with the implementation and verified green before each commit (not as separate RED/GREEN/REFACTOR commits) — all behavior was new/greenfield composition of already-tested Wave-1 building blocks, with no pre-existing failing-test gate to observe first._

## Files Created/Modified
- `backend/internal/handlers/jellyfin_discovery.go` - `ListJellyfinDiscovery` handler, `jellyfinDiscoverySnapshotEntry` (DiscoverySortKeyed wrapper), q-filter/sort, page-scoped status resolution, filter application, `buildAdminJellyfinDiscoveryItem`
- `backend/internal/handlers/jellyfin_discovery_test.go` - Tests A-F2 + filter=ignoriert (fakes for the existing-match/ignore repos, httptest-driven fake Jellyfin server, scale fixture for D-29)
- `backend/internal/handlers/jellyfin_discovery_ignore.go` - `IgnoreJellyfinDiscoveryItem`/`UnignoreJellyfinDiscoveryItem` handlers
- `backend/internal/handlers/jellyfin_discovery_ignore_test.go` - Tests 1-4 (audit entry shape, idempotency, swallowed audit failure)
- `backend/internal/handlers/jellyfin_intake_helpers_test.go` - new dedicated `buildJellyfinIntakeTypeHint` unit-test file: Test E2 (8 live Fansubs segments) + 2 regression subtests (English "special", "season 00")
- `backend/internal/models/jellyfin_discovery.go` - `AdminJellyfinDiscoveryItem`/`AdminJellyfinDiscoveryPage` response DTOs
- `backend/internal/handlers/jellyfin_intake_helpers.go` - D-28 additive fix: `buildJellyfinIntakeTypeHint`'s special-branch `case` now also matches `"spezial"`
- `backend/internal/handlers/admin_content_handler.go` - new `jellyfinDiscoveryExistingMatchRepository`/`libraryDiscoveryIgnoreRepository` interfaces + `discoveryExistingMatchRepo`/`libraryDiscoveryIgnoreRepo` fields, `auditLogRepo` widened from `*repository.AuditLogRepository` to the existing `auditLogWriter` interface, `WithLibraryDiscoveryIgnoreDeps` (deviation, see below)
- `backend/cmd/server/admin_routes.go` - 3 new route registrations, purely additive
- `backend/cmd/server/main.go` - `WithLibraryDiscoveryIgnoreDeps(repository.NewLibraryDiscoveryIgnoreRepository(dbPool))` chained onto the existing `adminContentHandler` wiring (deviation, see below)

## Decisions Made
See `key-decisions` in frontmatter: (1) status-`filter` applied post-page per the D-07 budget text, (2) new narrow repo interfaces on `AdminContentHandler` for handler-test fakeability (wired to the same production instances), (3) `auditLogRepo` widened to the pre-existing `auditLogWriter` interface, (4) Redis TTL-cache wiring for `discoveryCache` deliberately deferred (non-blocking, correctness-neutral).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2/3 - Missing critical functionality / blocking] Added testability seams and production wiring to `admin_content_handler.go` and `main.go` (not in the plan's `files_modified`)**
- **Found during:** Task 1 planning (before writing the Discovery list handler)
- **Issue:** The plan's own Test F/F2 require asserting an exact call count on `FindExistingAnimeByJellyfinIntakeRefs` via "the fake repo", and Task 2's Test 1-4 require a fake `AuditLogRepository` — but `AdminContentHandler.repo` is a concrete `*repository.AdminContentRepository` (not an interface) and `libraryDiscoveryIgnoreRepo` had no field at all. Without a narrow interface seam, the plan's own mandated test strategy (httptest + fakes, no live Postgres) would have been impossible to satisfy. Separately, without wiring `WithLibraryDiscoveryIgnoreDeps` in `main.go`, the ignore endpoints would nil-pointer in production on every real request.
- **Fix:** Added `jellyfinDiscoveryExistingMatchRepository`/`libraryDiscoveryIgnoreRepository` interfaces + fields (wired to the same repo instances as `h.repo` in `NewAdminContentHandler`, matching the pre-existing `animeCreateRepo` pattern); widened `auditLogRepo`'s field type to the already-existing package-level `auditLogWriter` interface (zero call-site changes needed); added `WithLibraryDiscoveryIgnoreDeps` and wired it in `main.go` against `repository.NewLibraryDiscoveryIgnoreRepository(dbPool)`.
- **Files modified:** `backend/internal/handlers/admin_content_handler.go`, `backend/cmd/server/main.go`
- **Verification:** `go build ./...` and `go vet ./...` clean (full repo bind-mount); `admin_content_handler.go` stayed at 444 lines (within CLAUDE.md's 450-line ceiling, comments were trimmed to fit); all new handler tests pass with fakes, no live DB/Redis required.
- **Committed in:** `3defd417` (Task 1, list-handler infra) and `49640046` (Task 2, main.go wiring)

---

**Total deviations:** 1 auto-fixed (missing critical testability/production-wiring infrastructure, spanning both Rule 2 and Rule 3)
**Impact on plan:** Necessary for the plan's own mandated test strategy to be executable and for the ignore endpoints to function outside of tests. No scope creep beyond what the plan's own Behavior/Verify sections already require; `main.go`/`admin_content_handler.go` were the only files capable of hosting this seam.

## Issues Encountered
- No local Go toolchain on the executor host; ran `go build`/`go vet`/`go test` inside a throwaway `golang:1.25-alpine` container with the full repo bind-mounted (matching 165-01's precedent — several pre-existing tests need `/shared/contracts`, `/database/migrations`, `docs/audits/...` fixtures at repo-relative paths). Confirmed `internal/handlers` is fully green; the only `internal/repository`/`internal/services` failures are pre-existing, unrelated, environment-dependent tests (`TEAM4S_PHASE128_TEST_DSN`-gated Postgres tests, `TestPhase134Matrix*` live-keycloak/backend-network tests, an FFmpeg-redirect test) untouched by this plan.
- `admin_content_handler.go` initially grew to 451 lines after the new interfaces/fields/method (1 line over CLAUDE.md's 450-line ceiling); trimmed inline comments to bring it to 444 lines rather than splitting the file, since the additions are small and thematically inseparable from the existing `With*Deps` wiring block.

## User Setup Required

None - no external service configuration required. The running `team4sv30-backend` container was intentionally NOT rebuilt/restarted in this session (main.go changes are additive route registrations + one new `With*Deps` chain call); a rebuild will be needed before the new endpoints are reachable on the live container, matching 165-02's precedent of deferring container rebuilds to the plan that first needs the live endpoint (165-09, or an explicit deploy step).

## Next Phase Readiness
- `GET /admin/jellyfin/discovery` and `POST`/`DELETE /admin/jellyfin/discovery/ignore[/:itemID]` are ready for 165-09's frontend (`DiscoveryLibraryPanel`/`DiscoveryLibraryCard`) to consume.
- `discoveryCache` (165-01's Redis TTL cache) remains unwired in `main.go` by design — `buildJellyfinDiscoverySnapshot` functions correctly without it (uncached fresh fetch each call), just without cache reuse across requests. A future plan (165-09 or a dedicated follow-up) should add a small `*redis.Client` adapter satisfying `discoveryCacheStore`'s `(string, error)`/`error` method shapes and call `WithDiscoveryCacheDeps` in `main.go`.
- The `team4sv30-backend` container needs `docker compose up -d --build team4sv30-backend` before the new routes are live-reachable; not done in this session (see User Setup Required).
- `partial` status (D-15) remains hard-coded to `false` in `resolveDiscoveryItemStatus`'s third argument here, exactly as the plan specifies — real wiring is checkpoint-gated to 165-11.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-21*

## Self-Check: PASSED

All 6 created source files plus this SUMMARY.md confirmed present on disk; both task commit
hashes (`3defd417`, `49640046`) confirmed present in `git log --oneline --all`.
