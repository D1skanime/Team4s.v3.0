---
phase: 139-scalable-user-admin-projections
plan: 04
subsystem: api
tags: [go, postgres, sql, gin, admin, media]

# Dependency graph
requires:
  - phase: 139-01
    provides: AdminUserMediaPage/AdminMediaReleaseBlock/AdminMediaItem/AdminMediaFilterOptions DTOs and testsupport.OpenPhase139Postgres
  - phase: 139-03
    provides: The shared admin_users_handler.go filter-parsing block and admin_users_tab_repository.go file-ownership sequencing (Wave-3 dependency for sequencing, not code reuse)
provides:
  - Server-side grouped/paginated GetUserMedia (anime+project+release/episode grouping, real PublicURL/FileSizeBytes derivation)
  - AdminUserMediaFilter query-param wiring on GetUserMedia
  - AdminUsersRepository constructor now threads cfg.MediaStorageDir (mirrors NewFansubRepository/NewMediaRepository)
  - admin-content.yaml documenting the new response/query shape
affects: [139-06, 139-07, 139-08, 139-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Internal-only adminUserMediaItemRow scan struct carries file_path across the SQL->Go boundary so PublicURL/OriginalFilename can be derived in Go (mediaStorageDir is a Go-side constructor field, not threaded into SQL) while the raw physical path never reaches the JSON response (D18)"
    - "COALESCE(rvm.fansub_group_id, MIN(release_version_groups.fansub_group_id)) deterministically resolves a single grouping-key fansub_group_id for a release version even when the persisted source-group column is NULL (ambiguous/legacy row), rather than fanning out one row per candidate group"

key-files:
  created:
    - backend/internal/repository/admin_users_media_query.go
    - backend/internal/repository/admin_users_media_query_test.go
  modified:
    - backend/internal/repository/admin_users_tab_repository.go
    - backend/internal/repository/admin_users_repository.go
    - backend/internal/repository/admin_users_repository_test.go
    - backend/internal/repository/admin_users_contributions_query_test.go
    - backend/internal/handlers/admin_users_handler.go
    - backend/internal/handlers/admin_users_handler_test.go
    - backend/cmd/server/main.go
    - shared/contracts/admin-content.yaml

key-decisions:
  - "AdminUsersRepository's constructor now takes mediaStorageDir (NewAdminUsersRepository(db, mediaStorageDir)), matching the existing convention every other storage-path-consuming repository already uses (NewFansubRepository/NewMediaRepository/NewGroupThemesRepository all receive cfg.MediaStorageDir as a constructor arg) rather than a package-level global — required updating 4 call sites (main.go, admin_users_repository_test.go, admin_users_contributions_query_test.go's 9 NewAdminUsersRepository(pool) sites, and the interface assertion in admin_users_repository_test.go), none of which were in the plan's stated files_modified list, but all necessary to keep the module compiling (Rule 3)."
  - "GetUserMedia's WHERE clause keeps filtering directly on rvm.uploaded_by_user_id = appUserID (the app_users.id path param), NOT translated through app_users.legacy_user_id -> users.id the way member_profile_contributions_repository.go/media_repository.go do for the public member-profile seam. This preserves the exact row-set semantics the existing, already-shipped admin_users_queries.go MediaUploadCount aggregate uses for the same column in the same package -- changing the join key would be an out-of-scope adjacent-surface change per RESEARCH.md Pitfall 2's guidance, not something this plan's D11-D19 scope calls for."
  - "F-02 Option A executed: extended admin-user-media in place in admin-content.yaml (not a new admin-users.yaml file), matching 139-03's precedent and RESEARCH.md's hybrid recommendation."

requirements-completed: [UADM-05, UADM-08, QUAL-06]

# Metrics
duration: ~40min
completed: 2026-08-24
---

# Phase 139 Plan 04: Media Grouping Query + Real URL/Size Derivation Summary

**GetUserMedia rewritten from an unbounded flat fetch with hardcoded `''`/`0` PublicURL/FileSizeBytes into a server-side grouped-by-(anime, project, release/episode), filtered, paginated projection with real `/media/...` URL and byte-size derivation — required threading `mediaStorageDir` through `AdminUsersRepository`'s constructor for the first time.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-08-24
- **Tasks:** 3/3 complete
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- New `backend/internal/repository/admin_users_media_query.go`: one round-trip SQL query groups `release_version_media` rows by `(anime_id, fansub_group_id, release_version_id)`, aggregates items via `jsonb_agg` (no per-block N+1), computes `COUNT(*) OVER()` on the grouped blocks (not raw rows, D13), and paginates on block level via `ClampAdminListPage` (D12).
- Real `PublicURL`/`FileSizeBytes` derivation closes D17: `buildAdminMediaPublicURL` ports `AdminContentHandler.buildRVMPublicURL`'s exact `TrimPrefix(mediaStorageDir)` + `/media/` prefix convention into the repository package; `FileSizeBytes` is now a real value joined from `media_files` (preferring `variant='original'`), replacing the old hardcoded `0`.
- `AdminMediaItem.OriginalFilename` is now a real basename (`path.Base`) derived from the storage path in Go — the OLD query had actually written the entire raw storage path into this field (a latent bug beyond what the plan explicitly named); the new code exposes only the filename, never the physical path (D18), verified by an explicit test asserting the raw storage-root prefix never appears anywhere in the serialized response.
- `AdminUsersRepository` gained a `mediaStorageDir` constructor field (mirroring `NewFansubRepository`/`NewMediaRepository`'s existing pattern) since it had no prior access to this config value — required updating `main.go` and two existing test files' call sites (see Deviations).
- All 7 named integration tests (D11-D19, `TestGetUserMedia*`) pass GREEN on the first real run against `testsupport.OpenPhase139Postgres` (no RED-phase bug found this time, unlike 139-03's `cardinality(text)` incident — this query never uses the `ARRAY_AGG(...)[1]`-on-an-array-column pattern that caused that bug; only `jsonb_agg` on scalar/object values is used).
- Extended `shared/contracts/admin-content.yaml`'s existing `admin-user-media` entry in place (F-02 Option A): `response.type` is now `AdminUserMediaPage`, plus a new `query_params` block (`anime_id`, `fansub_group_id`, `release_version_id`, `media_type`, `from`, `to`, `limit`, `offset`).
- Full scoped regression (`go build ./...`, `go vet ./...`, `go test ./internal/repository/... ./internal/handlers/...`): exactly 60 pre-existing failures (36 repository + 24 handlers), matching 139-BASELINE.md's documented count exactly — zero new failures introduced by any file this plan touches.

## Task Commits

1. **Task 1: Media grouping query + real URL/size derivation (RED then GREEN)** - `3b366028` (feat) — includes the `mediaStorageDir` constructor-threading change (main.go + 2 test files) required for D17 to compile
2. **Task 2: Wire GetUserMedia handler filter params + interface/stub update** - `891bed82` (feat)
3. **Task 3: admin-content.yaml (F-02 Option A)** - `2966a9d0` (docs)

**Plan metadata:** this commit (docs: complete plan, includes SUMMARY.md/STATE.md/ROADMAP.md)

## Files Created/Modified

- `backend/internal/repository/admin_users_media_query.go` - New grouping/real-URL/real-size SQL (`base` -> `release_blocks` -> `filtered_blocks`/`paged` CTE chain) and its Go scan/assembly logic; `AdminUserMediaFilter` struct; `buildAdminMediaPublicURL`/`deriveOriginalFilename` helpers
- `backend/internal/repository/admin_users_media_query_test.go` - 7 integration tests proving D11-D19 against `testsupport.OpenPhase139Postgres`, all GREEN
- `backend/internal/repository/admin_users_tab_repository.go` - Old unbounded flat `GetUserMedia` body deleted; now delegates to `listUserMediaGrouped`
- `backend/internal/repository/admin_users_repository.go` - `AdminUsersRepository` struct gained `mediaStorageDir string`; `NewAdminUsersRepository` signature extended
- `backend/internal/repository/admin_users_repository_test.go` - Constructor call + static interface assertion's `GetUserMedia` signature updated in lockstep
- `backend/internal/repository/admin_users_contributions_query_test.go` - 9 `NewAdminUsersRepository(pool)` call sites updated to pass an (unused, empty-string) second arg
- `backend/internal/handlers/admin_users_handler.go` - `GetUserMedia` now parses filter/pagination query params; `AdminUsersRepository` interface signature updated
- `backend/internal/handlers/admin_users_handler_test.go` - `adminUsersRepoStub` updated in lockstep with the interface
- `backend/cmd/server/main.go` - `NewAdminUsersRepository` call site now passes `cfg.MediaStorageDir`
- `shared/contracts/admin-content.yaml` - `admin-user-media` entry extended in place (F-02 Option A)

## Decisions Made

- **`mediaStorageDir` as a constructor parameter, not a package-level config value:** the plan's own `<action>` text explicitly allowed either approach ("accept it as a constructor/method parameter or package-level config value"); the constructor-parameter route was chosen because it is the codebase's actual, consistently-applied existing convention for this exact kind of dependency (`NewFansubRepository(dbPool, cfg.MediaStorageDir)`, `NewMediaRepository(dbPool, ..., cfg.MediaStorageDir)`, `NewGroupThemesRepository(dbPool, cfg.MediaStorageDir)`) — a package-level global would have been a genuinely new, inconsistent pattern in this specific package.
- **`rvm.uploaded_by_user_id = appUserID` (no legacy_user_id translation):** verified that `release_version_media.uploaded_by_user_id` FKs to the legacy `users` table, not `app_users`, and that a translation via `app_users.legacy_user_id` is the correct join for the PUBLIC member-profile media seam (`member_profile_contributions_repository.go`). However, the ADMIN seam's own existing `admin_users_queries.go` (unrelated, un-touched file powering `AdminUserOverview.MediaUploadCount`) already filters the exact same column directly against the app_users id with no translation — kept this plan's new query byte-consistent with that established (if arguably imprecise) sibling convention rather than silently changing row-set semantics for an admin surface not explicitly scoped by this plan's D11-D19 (Pitfall 2's guidance: do not touch adjacent counts/logic outside stated scope).
- **F-02 Option A (extend in place):** per RESEARCH.md's explicit hybrid recommendation and 139-03's precedent; no new contract file created.
- **Deterministic `MIN()` fallback for `fansub_group_id` grouping key:** when `release_version_media.fansub_group_id` is `NULL` (ambiguous/legacy row per migration 0130's conservative backfill), the query falls back to the smallest `release_version_groups.fansub_group_id` for that release version rather than dropping the row or fanning out per candidate group — an informational-grouping-only choice (not a security/access-control decision), since every release realistically has at least one group.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `AdminUsersRepository` had no access to `mediaStorageDir`, required by D17**
- **Found during:** Task 1 planning/implementation (confirmed via `<read_first>`'s own instruction to check how `AdminUsersRepository` is constructed today)
- **Issue:** `NewAdminUsersRepository(db *pgxpool.Pool) *AdminUsersRepository` had no config parameter at all; `PublicURL` derivation (D17) needs `mediaStorageDir` to strip the storage-root prefix, exactly like `AdminContentHandler.buildRVMPublicURL` already does with `h.mediaStorageDir`.
- **Fix:** Extended the constructor to `NewAdminUsersRepository(db *pgxpool.Pool, mediaStorageDir string) *AdminUsersRepository`, matching the established convention of every other storage-path-consuming repository constructor in this codebase. Updated all 4 real call sites: `main.go` (now passes `cfg.MediaStorageDir`), `admin_users_repository_test.go`'s `NewAdminUsersRepository(nil)` call and its static interface assertion's `GetUserMedia` signature, and 9 `NewAdminUsersRepository(pool)` call sites in 139-03's `admin_users_contributions_query_test.go` (updated to pass an unused empty string — those tests never touch media).
- **Files modified:** `backend/internal/repository/admin_users_repository.go`, `backend/internal/repository/admin_users_repository_test.go`, `backend/internal/repository/admin_users_contributions_query_test.go`, `backend/cmd/server/main.go`
- **Verification:** `go build ./...`/`go vet ./...` clean across the whole module after the change.
- **Committed in:** `3b366028` (Task 1 commit)

**2. [Rule 3 - Blocking issue] gofmt formatting drift on 5 touched files**
- **Found during:** Pre-commit verification (`gofmt -l`)
- **Issue:** `admin_users_media_query.go` (new), `admin_users_tab_repository.go`, `admin_users_handler.go`, `admin_users_handler_test.go`, and `main.go` were not `gofmt`-clean after edits (whitespace/alignment only).
- **Fix:** Ran `gofmt -w` on all 5 files; re-ran `go build ./...`/`go vet ./...` and the full scoped test suite afterward to confirm zero behavioral change.
- **Files modified:** same 5 files listed above
- **Committed in:** `3b366028` (the gofmt pass on `admin_users_media_query.go`/`admin_users_tab_repository.go`/`main.go` predates that commit; `admin_users_handler.go`/`admin_users_handler_test.go` gofmt landed in `891bed82`)

**3. [Rule 1 - Bug, found but scoped out] Old query's `OriginalFilename` was actually the raw storage path**
- **Found during:** Task 1 read-first inspection of the old `GetUserMedia` query
- **Issue:** The pre-existing (now-deleted) query scanned `COALESCE(ma.file_path, '')` directly into the `OriginalFilename` field — meaning the "original filename" shown to admins was actually the full physical storage path, a real correctness bug beyond what the plan's `<interfaces>` block explicitly called out (which only named `PublicURL`/`FileSizeBytes` as hardcoded-broken).
- **Fix:** Since this plan already replaces the entire query body and DTO (`AdminMediaItem` is a NEW type per 139-01, with no `OriginalFilename`-from-file_path precedent to preserve), the new query derives a real basename via Go's `path.Base()` — fixed as a natural side effect of the rewrite, not a separate change, and covered by the same `TestGetUserMediaNoOwnerContextOrPermissionField` test that asserts the raw storage-root prefix never appears in the response.
- **Files modified:** `backend/internal/repository/admin_users_media_query.go` (new file; no separate fix commit needed since it never existed in old form here)

---

**Total deviations:** 2 auto-fixed blocking issues (constructor threading, gofmt) + 1 fixed-as-natural-consequence-of-rewrite bug (OriginalFilename).
**Impact on plan:** All three were necessary for the plan's own stated success criteria (D17 provably true; module keeps compiling; response shape excludes physical paths per D18). No scope creep — no additional functionality was added beyond what the plan specified.

## Issues Encountered

None beyond the documented deviations above — the disposable Phase-139 Postgres DSN was available throughout this session, so all 7 integration tests ran to completion (GREEN, not SKIP) on the first attempt.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `GetUserMedia` now returns `models.AdminUserMediaPage` end to end (repository -> handler -> HTTP), with server-side filters, block-level pagination, and real PublicURL/FileSizeBytes derivation. This is the data foundation the later frontend plans (139-07/08/09) will consume for the rewritten Media-Tab UI.
- `frontend/src/lib/api.ts`'s `getAdminUserMedia(userId)` still calls the endpoint with no query params and types its response as the OLD `AdminUserMediaResponse` shape — this is expected and untouched by design (139-04 is backend-only per its own scope); a later frontend plan must rewire this call and the `UserMediaTab.tsx` consumer against the new `AdminUserMediaPage` shape (139-02's TS mirror types already exist).
- `shared/contracts/admin-content.yaml` documents the new shape.
- No blockers for 139-06 (QUAL-06 gates) or the frontend tab-rewrite plans.

---
*Phase: 139-scalable-user-admin-projections*
*Completed: 2026-08-24*

## Self-Check: PASSED

- FOUND: `backend/internal/repository/admin_users_media_query.go`
- FOUND: `backend/internal/repository/admin_users_media_query_test.go`
- FOUND: `.planning/phases/139-scalable-user-admin-projections/139-04-SUMMARY.md`
- FOUND: commit `3b366028` in `git log`
- FOUND: commit `891bed82` in `git log`
- FOUND: commit `2966a9d0` in `git log`
- FOUND: `go build ./...` / `go vet ./...` clean
- FOUND: `go test ./internal/repository/... ./internal/handlers/...` FAIL count = 60 (36 + 24), matches 139-BASELINE.md documented baseline exactly
