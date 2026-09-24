---
phase: quick-260924-i0a
plan: 01
subsystem: api
tags: [go, gin, jellyfin, episode-import, react, nextjs, accessibility]

# Dependency graph
requires:
  - phase: quick-260924-b7s
    provides: hydrateJellyfinFolderDisplayNames batched Jellyfin folder path/name hydration (GAP-01), reused by this plan's owner-pair construction
provides:
  - Shared multi-folder Jellyfin ownership check (jellyfin_owned_sources.go) used by episode-import apply, editor relink and editor file preview
  - role="alert" apply-failure alert (EpisodeImportApplyErrorAlert.tsx) with scroll/focus on every new message
affects: [167-fansub-gruppenerkennung-beim-import]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backend: owned-pair ownership matcher (jellyfinOwnedSource/matchOwnedJellyfinSource) generalizes a single (seriesID, folder) fail-closed check to a set of legitimate connected-folder pairs, reused across three call sites via one shared file instead of duplicated per-caller logic."
    - "Frontend: a bulk-action's error gets its own dedicated state (applyErrorMessage) and its own alert component colocated with the triggering button, separate from the page-level context/preview error state, so a failed bulk action is never silently absorbed into an unrelated, far-away error banner."

key-files:
  created:
    - backend/internal/handlers/jellyfin_owned_sources.go
    - backend/internal/handlers/jellyfin_owned_sources_test.go
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportApplyErrorAlert.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportApplyErrorAlert.test.tsx
  modified:
    - backend/internal/handlers/episode_version_source_hydration.go
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/handlers/admin_content_episode_version_editor_helpers.go
    - backend/internal/handlers/admin_episode_import_test.go
    - backend/internal/handlers/episode_version_source_hydration_test.go
    - backend/internal/handlers/admin_content_episode_version_editor_context_test.go
    - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.test.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
    - .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md

key-decisions:
  - "matchOwnedJellyfinSource treats an empty FolderPath on an owned pair as a wildcard on the path dimension only -- SeriesID stays mandatory -- mirroring the pre-GAP-11 single-pair contract where an empty folder meant 'not checked on that dimension'."
  - "ownedJellyfinSourcesFromFolders always builds the main pair from the caller-supplied (mainSeriesID, mainFolderPath) verbatim, never re-derived from the folder list's own main entry, keeping the single-folder case byte-identical to the pre-GAP-11 behavior."
  - "GAP-12's new applyErrorMessage state is used exclusively by the bulk 'Mapping anwenden' button; the existing per-row applyRow errorMessage path is left untouched since the Live-UAT report was specifically about the bulk button."

requirements-completed: [GAP-11, GAP-12]

# Metrics
duration: 27min
completed: 2026-09-24
---

# Quick Task 260924-i0a: GAP-11/GAP-12 Mapping-Apply-Fixes Summary

**Generalized the Jellyfin ownership check from a single main-folder pair to a set of all connected-folder pairs (import apply, editor relink, editor file preview), and gave failed bulk "Mapping anwenden" clicks a dedicated role="alert" that scrolls/focuses itself into view.**

## Performance

- **Duration:** 27 min (13:12 - 13:39 UTC, 2026-09-24)
- **Tasks:** 4/4 completed
- **Files modified:** 15 (2 new backend files, 2 new frontend files, 11 modified)

## Accomplishments

- New `jellyfin_owned_sources.go` (`jellyfinOwnedSource`, `matchOwnedJellyfinSource`, `ownedJellyfinSourcesFromFolders`, `hydrateFansubFolderPathsForRelink`) generalizes the Jellyfin file-ownership check from one main-folder pair to the full set of connected folders, at all three affected call sites (episode-import apply, editor relink create/patch, editor read-only file preview) -- with no new Jellyfin request per file.
- 8 new isolated unit tests for the owner-pair logic itself (match/wildcard/legacy-fallback/batched-vs-skipped hydration), plus 3 new real-Postgres regression tests (one per call site) proving a second connected folder now succeeds and a genuinely foreign series/folder is still rejected fail-closed -- while every pre-existing single-folder test in those three files stays untouched and green.
- `admin_episode_import.go` did not grow (still 783 lines), per the plan's hard constraint; new ownership logic lives entirely in the new file.
- New `EpisodeImportApplyErrorAlert.tsx` renders a `role="alert"` `ErrorState` card directly under the "Mapping anwenden" button, scrolling and focusing itself on every new (not just first) apply failure.
- New `applyErrorMessage` state in `useEpisodeImportBuilder.ts`, used exclusively by the bulk apply action; a new context/preview load clears any stale apply error so it never outlives its context.
- `167-UAT.md` closed with GAP-11 (blocker) and GAP-12 (minor) as `status: resolved`, same format as the existing GAP-08/09/10 entries, LF-only preserved.
- Backend container rebuilt (`docker compose up -d --build team4sv30-backend`), frontend container restarted (`docker restart team4sv30-frontend`); both confirmed running with newer start timestamps and healthy responses.

## Task Commits

1. **Task 1: GAP-11 -- shared multi-folder Jellyfin ownership check** - `a7b3c59e` (feat)
2. **Task 2: GAP-11 -- regression proof (second folder succeeds, foreign folder still rejected)** - `9cdef2b4` (test)
3. **Task 3: GAP-12 -- apply error visible and focused at the button** - `7c265c98` (feat)
4. **Task 4: 167-UAT.md entries, full verification, container rebuild/restart** - `80a47973` (docs)

## Files Created/Modified

- `backend/internal/handlers/jellyfin_owned_sources.go` - new shared owner-pair matcher/builder/batched-hydration helpers
- `backend/internal/handlers/jellyfin_owned_sources_test.go` - 8 isolated unit tests for the new helpers
- `backend/internal/handlers/episode_version_source_hydration.go` - `resolveReviewedJellyfinSource`/`resolveEpisodeVersionSource` now use the owned-pair set instead of a single (seriesID, folder) pair
- `backend/internal/handlers/admin_episode_import.go` - `rehydrateEpisodeImportSources` builds the owned-pair set from the already-loaded `importContext.JellyfinFoldersForOwnershipCheck` (net 0 line-count change)
- `backend/internal/handlers/admin_content_episode_version_editor_helpers.go` - `enrichEpisodeVersionSelectedFile` builds the owned-pair set via `hydrateJellyfinFolderDisplayNames`
- `backend/internal/handlers/admin_episode_import_test.go` - new `TestApplyEpisodeImport_AcceptsFileFromAdditionalConnectedJellyfinFolder`
- `backend/internal/handlers/episode_version_source_hydration_test.go` - new `TestEpisodeVersionSourceHydrationSecondConnectedFolder`
- `backend/internal/handlers/admin_content_episode_version_editor_context_test.go` - new `TestEpisodeVersionEditorContextSelectedFileFromAdditionalConnectedFolder`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportApplyErrorAlert.tsx` - new role="alert" apply-error card with scroll/focus-on-change
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportApplyErrorAlert.test.tsx` - 3 new tests (null-renders-nothing, alert+scroll/focus on mount, re-scroll/focus on message change)
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` - new `applyErrorMessage` state, used exclusively by `applyMappings`
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.test.tsx` - 2 new tests (applyErrorMessage set on failure, cleared on next preview load)
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` - renders the new alert under the apply button, adds `role="alert"` to the existing top-level error state
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` - new `.applyErrorAlert` rule
- `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md` - GAP-11/GAP-12 closed as `status: resolved`

## Decisions Made

- Kept `applyRow` (single-row apply) on the existing `errorMessage` state, per the plan's explicit scope note that the Live-UAT report was specifically about the "Mapping anwenden" bulk button, not the per-row apply action.
- Created an isolated Postgres test database (`team4s_phase117_test_i0a`) for this session's real-Postgres handler tests, following the exact naming/isolation pattern already used by prior quick tasks (`team4s_phase117_test_156`, `_164`, etc.) -- never touches `team4s_v2`.

## Deviations from Plan

None in the sense of unplanned scope changes -- plan executed as written. One test-construction adjustment was needed to make the plan's own Task 2 behavior spec pass cleanly:

**1. [Rule 1 - Bug, test-only] Second-folder editor-preview test needed a matching stored-binding path update**
- **Found during:** Task 2, `TestEpisodeVersionEditorContextSelectedFileFromAdditionalConnectedFolder`
- **Issue:** The fixture's pre-existing stored `jellyfin_source` binding for `item-a`/`source-a` still points at the main folder's path. Returning "live" Jellyfin data with the same `media_source_id` but a different (second-folder) path correctly trips an unrelated, pre-existing data-integrity guard in `resolveJellyfinMediaSourceSelection` ("stored source path changed") that has nothing to do with GAP-11's ownership widening -- it was masking whether the ownership check itself passed.
- **Fix:** The "second folder" subtest now also updates the stored binding's `source_path` to the second-folder path before issuing the request, so the test isolates GAP-11's ownership widening from that unrelated guard.
- **Files modified:** `backend/internal/handlers/admin_content_episode_version_editor_context_test.go` (test-only, no production code change)
- **Verification:** Both subtests (second folder succeeds, foreign folder degrades fail-open) pass; all pre-existing tests in the same file remain green and unchanged.
- **Committed in:** `9cdef2b4` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (test-construction correction, Rule 1)
**Impact on plan:** No production-code or scope impact; the fix only corrected how the new test isolated the behavior under test.

## Issues Encountered

- The plan's Task 4 verify command referenced `http://192.168.235.196:8092/health`, but the live `.env`/`docker-compose.yml` map the backend's external port to `18092` (internal container port stays `8092`). Used the correct external port (`18092`) for the post-rebuild health check; both return `200`.
- Full `go test ./...` and `npm run test`/`lint` surfaced a large set of pre-existing, unrelated failures (see "Deferred Issues" below) -- none of these were touched or introduced by this plan's changes; each was isolated and re-run individually to confirm they fail identically without any of this session's commits applied.

### Deferred Issues (pre-existing, out of scope for GAP-11/GAP-12)

**Backend `go test ./...` (38s in the scratch container, `TEAM4S_PHASE117_TEST_DSN` pointed at a fresh isolated database):**
- `internal/handlers`: `TestPreviewEpisodeImport_ExplicitAdditionalFolderReturnsThatFoldersEpisodes`, `TestPreviewEpisodeImport_MainFolderRegressionStaysUnchanged`, `TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard` -- these 3 tests (written in an older phase-165 commit, `84a92c14`, 2026-09-22) assumed `loadEpisodeImportContext` makes zero extra `/Items` calls for a two-folder anime; today's earlier, unrelated quick task `260924-b7s` (commit `d40f9cd4`) added an eager batched folder-display-name hydration call that now always fires when `len(folders) > 1`, breaking these older tests' exact-request-count assertions. Confirmed by running them in isolation with none of this session's commits touching the affected files (`loadEpisodeImportContext`, `hydrateJellyfinFolderDisplayNames`) -- a regression from an earlier, separate quick task, not from GAP-11/GAP-12.
- `internal/migrations`: `TestPhase134MigrationFreshUpDownProof`, `TestPhase128MigrationNonEmptyMembersFailsBeforeMutation`, `TestPhase128MigrationLiveUpDownUp`, `TestPhase128SlugImmutableAndNicknameStable`, `TestPhase128StoredIdentityConstraints`, `TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible` -- all `t.Fatalf` with "`TEAM4S_PHASE128_TEST_DSN`/`TEAM4S_PHASE134_MIGRATION_DSN` is required", a documented pre-existing DSN-gated pattern (same as prior quick-task SUMMARYs, e.g. `260924-b7s-SUMMARY.md`).
- `internal/repository`: dozens of `TestPhase128*`/`TestPhase134*`/member-profile/badge tests requiring `TEAM4S_PHASE128_TEST_DSN`/`TEAM4S_PHASE134_TEST_DSN` or a live server on `192.168.235.196:18093` (same documented pre-existing pattern), plus one unrelated fixture gap: `TestEpisodeVersionDateEditorContextBothSurfacesAndFailure/admin=true` fails with `column e.filler_source does not exist` -- that test builds its own local schema separate from the `internal/handlers` package's `openEVECFixture` and is missing a column addition unrelated to episode-import/Jellyfin ownership.
- `internal/services`: `TestFFmpegExecutableAuthenticatedInputRejectsCrossOriginRedirect` fails with "installed FFmpeg is required for redirect proof" -- the scratch Alpine container has no FFmpeg binary; environment gap, not a code issue.

**Frontend `npm run test` (350 files, 3131 tests, 115s):**
- `src/lib/cssCustomProperties.guard.test.ts` -- 2 pre-existing failures about a `--surface-muted` dead custom-property reference and an allow-list size drift, unrelated to episode-import files (same documented pre-existing pair as prior quick-task SUMMARYs).
- `src/app/admin/fansubs/[id]/edit/DefaultCrewManager.test.tsx` -- 1 failure under full-suite load; re-ran in isolation and it passed (6/6), confirming container-load-induced flakiness (same pattern STATE.md documents for `cssCustomProperties.guard.test.ts`'s "third, per-run varying failure").

**Frontend `npm run typecheck` (3s):** 0 errors.

**Frontend `npm run lint` (40s):** 3 pre-existing errors (`capture-responsive.cjs` require-style imports x2, `CapabilityDetailRow.tsx` unescaped entity), all outside files touched by this plan -- same 3 errors documented in `260924-b7s-SUMMARY.md`. Remaining findings are pre-existing warnings (native `<input>`/`<select>`/`<textarea>` usages predating this plan, `no-img-element`, unused vars), none on lines this plan added or modified.

## User Setup Required

None - no external service configuration required.

## Container Rebuild/Restart Timestamps

- **Backend** (`docker compose up -d --build team4sv30-backend`): before `2026-09-24T11:44:11.936566355Z`, after `2026-09-24T13:37:11.144941068Z`; rebuild command itself took ~6s; `curl http://192.168.235.196:18092/health` → `200` (note: external port is `18092` per `.env` `BACKEND_PORT`, not the `8092` in the plan's illustrative verify command).
- **Frontend** (`docker restart team4sv30-frontend`): before `2026-09-24T11:44:31.469131253Z`, after `2026-09-24T13:37:29.90743924Z`; restart command itself took ~1s; `curl http://192.168.235.196:3000/` → `200`.

## Next Phase Readiness

- GAP-11 and GAP-12 are both code-complete, tested against real Postgres/httptest fixtures, and live in the rebuilt/restarted containers -- ready for the Auftraggeber's next Live-UAT pass on Anime #7's two-connected-folder scenario.
- No blockers. The deferred pre-existing failures above are all environment/DSN-gated or caused by an earlier, unrelated quick task (`260924-b7s`) and are out of this plan's scope; they remain visible here for whoever picks up `internal/handlers`' `TestPreviewEpisodeImport_*` folder-filter tests next.

---
*Phase: quick-260924-i0a*
*Completed: 2026-09-24*

## Self-Check: PASSED

All 15 claimed created/modified files and all 4 claimed commit hashes (`a7b3c59e`, `9cdef2b4`, `7c265c98`, `80a47973`) were independently verified to exist on disk / in `git log`.
