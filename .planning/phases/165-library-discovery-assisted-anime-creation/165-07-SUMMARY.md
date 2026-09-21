---
phase: 165-library-discovery-assisted-anime-creation
plan: 07
subsystem: api
tags: [go, gin, jellyfin, pgx, audit-log, multi-folder]

# Dependency graph
requires:
  - phase: 165-04
    provides: collectJellyfinFolderOptions / models.JellyfinFolderOption (shared folder-enumeration helper)
  - phase: 165-06
    provides: jellyfinDiscoveryExistingMatchRepository narrow-interface testability-seam precedent, auditLogWriter widening
provides:
  - "connectJellyfinFolderAdditively (D-05 Pitfall-3 fix): 'Verbinden' never force-overwrites an anime.source that already carries an anisearch: reference -- writes the new Jellyfin folder additively into anime_source_links instead"
  - "buildAnimeJellyfinContext.Folders: lists every connected jellyfin: folder with correct main-folder flagging (was: only the first)"
  - "DELETE /admin/anime/:id/jellyfin/folders/:source: removes non-main folders, server-side guarded against removing the main folder, audited"
  - "LinkAdditionalJellyfinSource / RemoveAnimeSourceLink repository functions (anime_source_links.go), reusing the table's ON CONFLICT (source) DO NOTHING discipline against its global UNIQUE(source) constraint"
affects: [165-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "165-06's narrow-repo-interface testability-seam pattern (discoveryExistingMatchRepo) reused verbatim for jellyfinFolderManagementRepository/folderManagementRepo -- h.repo is a concrete *repository.AdminContentRepository, so handler-level fake-repo tests need a dedicated interface field wired to the same production instance"
    - "Exported, self-transacting repository wrapper (LinkAdditionalJellyfinSource/RemoveAnimeSourceLink) around a private tx-scoped function (linkAdditionalJellyfinSource/removeAnimeSourceLink) -- callers outside the repository package cannot open their own pgx.Tx, but the private tx-variant stays directly testable from the same-package Postgres-integration test"
    - "Shared actorPointersFromIdentity helper de-dupes audit-entry actor-pointer construction between connectJellyfinFolderAdditively and RemoveAnimeJellyfinFolder"

key-files:
  created:
    - backend/internal/handlers/jellyfin_source_folder_management.go
    - backend/internal/handlers/jellyfin_source_folder_management_test.go
    - backend/internal/repository/anime_source_links_test.go
  modified:
    - backend/internal/handlers/jellyfin_metadata_resync.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/repository/anime_source_links.go
    - backend/internal/models/admin_content.go
    - backend/cmd/server/admin_routes.go

key-decisions:
  - "AdminAnimeJellyfinProvenanceContext.Folders reuses models.JellyfinFolderOption (already defined in models/episode_import.go by 165-04 for EpisodeImportContextResult.JellyfinFolders) instead of defining a duplicate 'AdminAnimeJellyfinFolder' type of identical shape -- same JellyfinItemID/IsMain fields, same JSON tags, single source of truth for both consumers."
  - "connectJellyfinFolderAdditively takes an extra middleware.AuthIdentity parameter beyond the plan's literal interface text, so the jellyfin_discovery.connected audit entry carries real actor attribution (ActorAppUserID/ActorLegacyUserID) instead of writing an unattributed entry -- required by CLAUDE.md's 'Admin actions need audit attribution by user ID' constraint and D-21."
  - "LinkAdditionalJellyfinSource/RemoveAnimeSourceLink are exported self-transacting wrappers around private tx-scoped functions (linkAdditionalJellyfinSource/removeAnimeSourceLink), not the tx-parameterized exported functions the plan's behavior text literally names -- the handler package cannot open its own pgx.Tx (repository.AdminContentRepository.db is a private field), so an exported no-tx wrapper is required for the handler call site; the private tx-variant remains directly callable from anime_source_links_test.go (same package) for the Postgres-integration idempotency assertions."
  - "The additive INSERT's ON CONFLICT target is `(source)` alone, not `(anime_id, source)`: the table's PRIMARY KEY is (anime_id, source) but it also carries a separate GLOBAL UNIQUE(source) constraint (migration 0047). A conflict target that only names the PK columns would not satisfy Postgres's exact-constraint-match requirement for the broader unique(source) violation and would surface as an unhandled error instead of resolving to DO NOTHING."

requirements-completed: [REQ-165-05, REQ-165-17, REQ-165-20, REQ-165-22]

# Metrics
duration: ~50min
completed: 2026-09-21
---

# Phase 165 Plan 07: Multi-Folder Jellyfin Provenance -- Additive Connect + Guarded Remove Summary

**Fixes the D-05 "Verbinden" Pitfall-3 bug (an anisearch:-sourced anime's connect action no longer force-overwrites `anime.source`), extends the Jellyfin provenance context to list every connected folder with correct main-folder flagging, and adds a server-side-guarded `DELETE` endpoint for non-main folders -- all audited.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 2/2
- **Files modified:** 8 (3 created, 5 modified)

## Accomplishments

- `connectJellyfinFolderAdditively` (new sibling file `jellyfin_source_folder_management.go`, kept out of the already-627-line `jellyfin_metadata_resync.go`): when `anime.source` already carries an `anisearch:` reference and the caller explicitly targeted a Jellyfin series, the new folder is written additively into `anime_source_links` via `LinkAdditionalJellyfinSource` -- `anime.source` is never touched. The pre-existing empty/`jellyfin:` force-write path (`ApplyJellyfinSyncMetadata`) is unchanged for every other case, proven by a regression test.
- D-16 (a renamed/moved Jellyfin folder reconnecting via a new item ID) needs zero new code: a regression test connects the same anime with two different Jellyfin IDs and both land via the identical additive insert path.
- `buildAnimeJellyfinContext` now populates `Folders` via the same `collectJellyfinFolderOptions` helper 165-04 already tested for `EpisodeImportContextResult.JellyfinFolders`, so the context endpoint and the episode-import ownership guard agree on what "connected" means without re-deriving the list.
- New `DELETE /admin/anime/:id/jellyfin/folders/:source` (`RemoveAnimeJellyfinFolder`): removes a non-main folder from `anime_source_links`; rejects with 400 *before any DELETE query runs* if the caller targets the main folder (matches `animeSource.Source` exactly) -- a real server-side guard, not just a hidden UI affordance.
- Both mutations (`connect`, `folder_removed`) write exactly one `audit_logs` entry each, with real actor attribution (`ActorAppUserID`/`ActorLegacyUserID`), via a shared `actorPointersFromIdentity` helper.
- `LinkAdditionalJellyfinSource`/`RemoveAnimeSourceLink` (repository layer) use `ON CONFLICT (source) DO NOTHING`, correctly honoring the table's global `UNIQUE(source)` constraint (migration 0047) rather than only the `(anime_id, source)` primary key.

## Task Commits

Each task was committed atomically (tests written together with the implementation and verified green before each commit, matching 165-06's documented precedent -- greenfield composition of already-tested building blocks, no pre-existing failing-test gate to observe first):

1. **Task 1: D-05 Pitfall-3 fix -- protect existing anisearch: source, write additively** - `e1a4435c` (feat)
2. **Task 2: Multi-folder context response + guarded DELETE endpoint** - `d2d4610e` (feat)

## Files Created/Modified

- `backend/internal/handlers/jellyfin_source_folder_management.go` - `connectJellyfinFolderAdditively`, `RemoveAnimeJellyfinFolder`, `actorPointersFromIdentity`
- `backend/internal/handlers/jellyfin_source_folder_management_test.go` - 9 tests: Pitfall-3 guard, force-write-path regression, D-16 rename regression, connect-audit, `buildAnimeJellyfinContext` multi-folder listing, DELETE remove/reject-main/audit/404
- `backend/internal/handlers/jellyfin_metadata_resync.go` - `ApplyAnimeMetadataFromJellyfin` captures `identity` and calls `connectJellyfinFolderAdditively` instead of `ApplyJellyfinSyncMetadata` directly; `buildAnimeJellyfinContext` gets one additive `result.Folders = ...` line
- `backend/internal/handlers/admin_content_handler.go` - new `jellyfinFolderManagementRepository` narrow interface + `folderManagementRepo` field, wired to the same `repo` instance in `NewAdminContentHandler` (165-06 testability-seam precedent)
- `backend/internal/repository/anime_source_links.go` - `linkAdditionalJellyfinSource`/`LinkAdditionalJellyfinSource`, `removeAnimeSourceLink`/`RemoveAnimeSourceLink`
- `backend/internal/repository/anime_source_links_test.go` - DSN-gated Postgres tests (`TEAM4S_ANIME_SOURCE_LINKS_TEST_DSN`), regex team4s_v2-rejection table test, idempotency tests for both new functions
- `backend/internal/models/admin_content.go` - `AdminAnimeJellyfinProvenanceContext.Folders []JellyfinFolderOption`
- `backend/cmd/server/admin_routes.go` - registers `DELETE /admin/anime/:id/jellyfin/folders/:source`, immediately after `jellyfin/metadata/apply`

## Decisions Made

See `key-decisions` in frontmatter: (1) reused `models.JellyfinFolderOption` instead of a duplicate type, (2) added an `identity` parameter to `connectJellyfinFolderAdditively` for real audit attribution, (3) exported self-transacting wrappers around private tx-scoped repository functions rather than the tx-parameterized exported signature the plan's behavior text literally named, (4) `ON CONFLICT (source)` target instead of `(anime_id, source)` to honor the table's global unique constraint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added `identity middleware.AuthIdentity` parameter to `connectJellyfinFolderAdditively`**
- **Found during:** Task 1 (writing the audit-write call)
- **Issue:** The plan's interface text lists `connectJellyfinFolderAdditively(ctx, animeID, animeSource, preview, explicitSeriesID) error` with no identity parameter. Without it, the `jellyfin_discovery.connected` audit entry would have no `ActorAppUserID`/`ActorLegacyUserID`, violating CLAUDE.md's "Admin actions need audit attribution by user ID" constraint and D-21's own stated purpose (repudiation mitigation, threat T-165-19).
- **Fix:** Added the parameter; `ApplyAnimeMetadataFromJellyfin` now captures `identity` (was discarded as `_`) and passes it through.
- **Files modified:** `jellyfin_source_folder_management.go`, `jellyfin_metadata_resync.go`
- **Verification:** `TestConnectJellyfinFolderAdditively_WritesAuditEntry` asserts the entry shape; `go build`/`go vet` clean.
- **Committed in:** `e1a4435c` (Task 1)

**2. [Rule 3 - Blocking] Added `jellyfinFolderManagementRepository` narrow interface + `folderManagementRepo` field to `admin_content_handler.go` (not in the plan's `files_modified` list)**
- **Found during:** Task 1 planning
- **Issue:** `h.repo` is a concrete `*repository.AdminContentRepository`, not an interface. The plan's own Test 1-4 (Task 1) and Test 2-4 (Task 2) require asserting exact call-argument shapes ("the fake repo's recorded call arguments") via `httptest`-driven handler tests with no live Postgres -- impossible against a concrete struct without a testability seam. This mirrors 165-06's exact same deviation (`discoveryExistingMatchRepo`) for the identical reason.
- **Fix:** Added the narrow interface (`GetAnimeSyncSource`, `ApplyJellyfinSyncMetadata`, `LinkAdditionalJellyfinSource`, `RemoveAnimeSourceLink`) + field, wired to the same `repo` instance in `NewAdminContentHandler` (`handler.folderManagementRepo = repo`) -- a pure testability seam, zero production behavior change.
- **Files modified:** `admin_content_handler.go`
- **Verification:** `go build ./...` clean; all 9 new handler tests pass against fakes with no live DB.
- **Committed in:** `e1a4435c` (Task 1), extended in `d2d4610e` (Task 2, added `RemoveAnimeSourceLink` to the interface)

**3. [Rule 1 - Bug] `LinkAdditionalJellyfinSource`/`RemoveAnimeSourceLink` are exported self-transacting wrappers, not tx-parameterized functions**
- **Found during:** Task 1 (writing `anime_source_links.go`)
- **Issue:** The plan's Task 1 action text specifies `LinkAdditionalJellyfinSource(ctx, animeID, source) error` (no `tx` param, called directly as `h.repo.LinkAdditionalJellyfinSource(...)`), but the plan's Task 1 *behavior* text describes Test 5 calling `LinkAdditionalJellyfinSource(ctx, tx, animeID, "jellyfin:xyz")` (with a `tx` param) -- these two descriptions are mutually inconsistent for a single exported symbol. Since `handlers` (a different package) cannot open its own `pgx.Tx` against `repository.AdminContentRepository`'s private `db` field, the handler-callable form must be tx-free.
- **Fix:** Split into a private tx-scoped function (`linkAdditionalJellyfinSource(ctx, tx, animeID, source)` / `removeAnimeSourceLink(ctx, tx, animeID, source)`) matching the plan's Test-5 call shape exactly (both are same-package `_test.go` files and can call the private form directly), plus an exported, self-transacting wrapper (`LinkAdditionalJellyfinSource(ctx, animeID, source)` / `RemoveAnimeSourceLink(ctx, animeID, source)`) that begins its own `pgx.Tx`, calls the private function, and commits -- this is what the handler calls. Both forms use the identical query, so behavior is unaffected either way.
- **Files modified:** `anime_source_links.go`, `anime_source_links_test.go`
- **Verification:** `TestLinkAdditionalJellyfinSource_IsIdempotent`/`TestRemoveAnimeSourceLink_DeletesExactlyOneRowAndIsIdempotent` (both `t.Skipf` without `TEAM4S_ANIME_SOURCE_LINKS_TEST_DSN`) exercise the private tx-variant directly; `go build ./...` confirms the handler compiles against the exported wrapper.
- **Committed in:** `e1a4435c` (Link, Task 1), `d2d4610e` (Remove, Task 2)

---

**Total deviations:** 3 auto-fixed (1 Rule 2 missing-critical-functionality fix, 1 Rule 3 blocking testability-seam fix mirroring 165-06's precedent, 1 Rule 1 bug/inconsistency fix in the plan's own two mutually-contradictory function-signature descriptions).
**Impact on plan:** All three were necessary for the code to compile, for the plan's own mandated fake-repo test strategy to be executable, and for D-21's audit-attribution requirement to actually hold. No scope creep -- all changes stayed within the plan's stated objective (additive connect fix, multi-folder context, guarded DELETE).

## Issues Encountered

- No local Go toolchain on the executor host; ran `go build`/`go vet`/`go test` inside a throwaway `golang:1.25-alpine` container with the full repo bind-mounted (matching 165-01/165-06 precedent).
- Full `go test ./internal/handlers/... ./internal/repository/... ./internal/models/...` shows pre-existing, environment-dependent failures unrelated to this plan: `TEAM4S_PHASE128_TEST_DSN`-gated Postgres tests (unset in this environment) and `TestPhase134Matrix*` tests requiring a live Keycloak/backend network (`192.168.235.196:18093` unreachable from inside the build container) -- both documented as pre-existing in 165-06's SUMMARY. `internal/handlers` (this plan's primary package) and `internal/models` are fully green.
- `gofmt -l` flagged a large number of pre-existing, unrelated files across the repo (formatting debt predating this plan); only the files this plan actually touches were checked and are gofmt-clean.

## User Setup Required

None - no external service configuration required. The running `team4sv30-backend` container was not rebuilt/restarted in this session (additive route registration + new handler methods only); a rebuild is needed before the new `DELETE` endpoint is reachable on the live container, matching 165-02/165-06's precedent of deferring container rebuilds to the plan that first needs the live endpoint (165-10, or an explicit deploy step).

## Next Phase Readiness

- `DELETE /admin/anime/:id/jellyfin/folders/:source` and the extended `GET /admin/anime/:id/jellyfin/context` response (`folders: [...]`) are ready for 165-10's frontend `AnimeJellyfinFolderList` component to consume.
- The `team4sv30-backend` container needs `docker compose up -d --build team4sv30-backend` before the new route is live-reachable; not done in this session.
- No blockers for 165-10.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-21*

## Self-Check: PASSED

All 4 claimed created/summary files verified present on disk; both task commit hashes
(`e1a4435c`, `d2d4610e`) verified present in `git log --oneline --all`.
