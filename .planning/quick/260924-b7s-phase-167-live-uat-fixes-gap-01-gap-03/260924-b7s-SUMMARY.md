---
phase: quick-260924-b7s
plan: 01
subsystem: admin-episode-import
tags: [go, gin, pgx, jellyfin, nextjs, react, vitest, fansub, episode-import]

# Dependency graph
requires:
  - phase: 167-fansub-gruppenerkennung-beim-import
    provides: fansub group matching/suggestion preview enrichment (enrichEpisodeImportPreviewFansubData), Einteiler placeholder-title detection (isEinteilerAnimeType, GAP-24/165)
  - phase: 165-library-discovery-assisted-anime-creation
    provides: multi-folder Jellyfin connection model (D-05/D-18, collectJellyfinFolderOptions, JellyfinFoldersForOwnershipCheck)
provides:
  - Batched, fail-open Jellyfin folder name/path hydration (hydrateJellyfinFolderDisplayNames) for the episode-import folder selector
  - Readable folder selector labels (display name -> last path segment -> raw ID fallback chain, main-folder marker, full-path tooltip)
  - Visible hint for a detected-but-unmatched fansub abbreviation (FansubGroupOriginHint Zustand E)
  - Preview-time Einteiler suggestion for a single number-less file on single-episode Einteiler anime (applyEinteilerSuggestion)
affects: [episode-import, jellyfin-integration, fansub-matching]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Best-effort external hydration: one batched call, fail-open on error/missing config, never blocks the response"
    - "Pure preview-transform functions (applyEinteilerSuggestion) callable/testable without HTTP or DB"

key-files:
  created:
    - backend/internal/handlers/jellyfin_folder_display_names.go
    - backend/internal/handlers/jellyfin_folder_display_names_test.go
    - backend/internal/handlers/admin_episode_import_einteiler.go
    - backend/internal/handlers/admin_episode_import_einteiler_test.go
    - backend/internal/repository/episode_import_repository_anime_type.go
  modified:
    - backend/internal/models/episode_import.go
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_episode_import_test.go
    - backend/internal/repository/episode_placeholder_title.go
    - backend/internal/repository/episode_placeholder_title_test.go
    - backend/internal/repository/episode_import_repository_apply.go
    - frontend/src/types/episodeImport.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportFolderSelector.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportFolderSelector.test.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.test.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx
    - .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md

key-decisions:
  - "IsEinteilerAnimeType exported (rename, no behavior change) rather than duplicating the switch logic in the handlers package"
  - "hydrateJellyfinFolderDisplayNames treats any getJellyfinSourceItems error as fail-open (log + return folders unchanged) even though that primitive is fail-closed for its existing episode-source-integrity callers"
  - "Main folder's local FolderPath baseline is set before the remote call so it survives a Jellyfin outage, but gets overwritten by the batched response's Path when the call succeeds"

patterns-established:
  - "Best-effort Jellyfin hydration pattern: reuse getJellyfinSourceItems, treat its errors as non-fatal for display-only enrichment"

requirements-completed: [QUICK-260924-B7S-01, QUICK-260924-B7S-02, QUICK-260924-B7S-03]

# Metrics
duration: ~30min
completed: 2026-09-24
---

# Phase quick-260924-b7s: Live-UAT fixes for Phase 167 GAP-01..GAP-03 Summary

**Batched Jellyfin folder-name hydration, an unmatched-fansub-abbreviation hint, and a preview-time Einteiler suggestion for single number-less files, closing all three Live-UAT gaps from Phase 167.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-09-24T08:35:37Z
- **Tasks:** 6/6 completed
- **Files modified:** 20 (5 created, 15 modified), plus 167-UAT.md gap closure

## Accomplishments
- GAP-01: The episode-import folder selector now shows readable folder names/last path segments instead of raw Jellyfin IDs, with the main folder marked "(Haupt-Ordner)" and a full-path tooltip, using exactly one batched Jellyfin `/Items` call per context load (zero calls for the common single-folder case).
- GAP-02: A detected-but-unmatched fansub abbreviation ("GAX" in the reported case) now shows a visible German hint until a group is selected — no automatic group creation or assignment.
- GAP-03: A single number-less file on a single-episode Einteiler anime (film always; ova/ona/special/bonus with exactly one canonical episode) is now proposed (status "suggested", not auto-confirmed) as that episode's match, with a visible "Einziger Kandidat für die einzige Episode" reason; ambiguous (0 or 2+ number-less files) or multi-episode cases are unchanged.
- All three 167-UAT.md gaps flipped to `status: resolved` with resolution notes referencing this plan and the closing files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend — batched Jellyfin folder name/path hydration (GAP-01)** - `d40f9cd4` (feat)
2. **Task 2: Frontend — readable folder selector labels (GAP-01)** - `9c86cc8b` (feat)
3. **Task 3: Frontend — visible hint for a detected-but-unmatched fansub abbreviation (GAP-02)** - `870d5815` (feat)
4. **Task 4: Backend — Einteiler suggestion for a single number-less file (GAP-03)** - `b89178bf` (feat)
5. **Task 5: Frontend — render the Einteiler suggestion reason (GAP-03)** - `3c01f650` (feat)
6. **Task 6: Full verification, container rebuild/restart, and UAT gap closure** - `8b8b6e28` (docs)

_Note: no separate plan-metadata commit — Task 6's commit already covers the docs deliverable (167-UAT.md) per this plan's execution constraints; SUMMARY.md/STATE.md are committed by the orchestrator afterward._

## Files Created/Modified
- `backend/internal/handlers/jellyfin_folder_display_names.go` - hydrateJellyfinFolderDisplayNames: one batched Jellyfin call, fail-open, no-op for <=1 folder
- `backend/internal/handlers/jellyfin_folder_display_names_test.go` - 3 cases: no remote call for 1 folder, exactly 1 batched call for 3 folders, fail-open on Jellyfin 503
- `backend/internal/handlers/admin_episode_import.go` - wires hydrateJellyfinFolderDisplayNames into loadEpisodeImportContext; wires applyEinteilerSuggestion into PreviewEpisodeImport (fail-open on GetAnimeType error)
- `backend/internal/models/episode_import.go` - JellyfinFolderOption.FolderDisplayName/FolderPath; EpisodeImportMappingRow.SuggestionReason
- `backend/internal/handlers/admin_content_handler.go` - adminEpisodeImportRepository interface gains GetAnimeType
- `backend/internal/handlers/admin_episode_import_test.go` - episodeImportSourceRepoSpy gains a GetAnimeType stub
- `backend/internal/repository/episode_placeholder_title.go` - isEinteilerAnimeType renamed to exported IsEinteilerAnimeType (no behavior change)
- `backend/internal/repository/episode_placeholder_title_test.go` - updated to call the exported name
- `backend/internal/repository/episode_import_repository_apply.go` - updated call site for the renamed IsEinteilerAnimeType
- `backend/internal/repository/episode_import_repository_anime_type.go` - EpisodeImportRepository.GetAnimeType(ctx, animeID)
- `backend/internal/handlers/admin_episode_import_einteiler.go` - applyEinteilerSuggestion: pure preview-transform for the single-candidate GAP-03 rule
- `backend/internal/handlers/admin_episode_import_einteiler_test.go` - 5 cases: single-candidate suggestion, film type, two-candidate no-op, multi-episode no-op, film-with-multiple-canonical-episodes no-op
- `frontend/src/types/episodeImport.ts` - JellyfinFolderOption.folder_display_name/folder_path; EpisodeImportMappingRow.suggestion_reason
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportFolderSelector.tsx` - label fallback chain, main-folder suffix, path tooltip
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportFolderSelector.test.tsx` - 5 new cases + updated main-folder-default case (now expects the "(Haupt-Ordner)" suffix)
- `frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx` - new Zustand E hint for detected-but-unmatched abbreviation
- `frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.test.tsx` - 2 new Zustand E cases (renders, suppressed once a group is selected)
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` - renders row.suggestion_reason next to the multi-episode hint
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx` - 1 new case asserting the suggestion_reason renders
- `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md` - all 3 gaps flipped to status: resolved with resolution notes

## Decisions Made
- Exported `IsEinteilerAnimeType` (mechanical rename) instead of duplicating its switch logic in the `handlers` package, per the plan's interface contract — single source of truth for the Einteiler classification rule.
- `hydrateJellyfinFolderDisplayNames` deliberately treats `getJellyfinSourceItems` errors (including its existing "missing item" fail-closed behavior) as non-fatal for this display-only hydration — the episode-import context/preview endpoint must never 5xx because Jellyfin is briefly unreachable or a folder ID went stale.
- The main folder's locally-known path is applied as a baseline *before* the remote call so a Jellyfin outage still shows something useful for the main folder, but the batched response overwrites it with the authoritative Jellyfin path when the call succeeds.
- Existing pre-1-existing test `EpisodeImportFolderSelector.test.tsx`'s "main folder selected by default" assertion was updated (not left byte-identical) because the new main-folder-suffix behavior applies even in the raw-ID fallback case that test exercises — this is a necessary consequence of GAP-01's spec ("the main folder's label includes '(Haupt-Ordner)'"), not a scope deviation.

## Deviations from Plan

None - plan executed exactly as written. The one pre-existing test update noted above (EpisodeImportFolderSelector's main-folder-default assertion) was explicitly anticipated by the plan's own behavior spec (test case c: "the main folder's label includes '(Haupt-Ordner)'") and is not a deviation from the plan's intended behavior, just a necessary adjustment to a strict-equality assertion that predates the new suffix rule.

## Issues Encountered

- **docker compose watch not running:** the backend dev container syncs `./backend` into `/app` via `docker compose watch`'s `sync` action, which is a separate long-running process from `docker compose up`. It was not running for this session, so every edited/created backend file was `docker cp`'d into `team4sv30-backend` before each `go test` run to avoid trusting a stale build-time-baked copy (per this plan's `critical_gotcha` note, consistent with prior sessions' documented gotcha). The final `docker compose up -d --build team4sv30-backend` in Task 6 performed the real, permanent rebuild.
- **Pre-existing, unrelated test/lint failures** (none in files this plan touched, verified via `git diff --stat` cross-check):
  - `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`, `Test11eyesSourceSelection_AllActualItemsAndPermutations`, `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery` (backend/internal/handlers) — fail with `open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/*.json: no such file or directory` because the backend dev container has no `/docs` bind mount (unlike the frontend container, which does). Environment gap, not a code regression.
  - `internal/repository` package: numerous `TestPhase128*`/`TestPhase134*`/member-profile/badge tests fail requiring `TEAM4S_PHASE128_TEST_DSN` or live Keycloak/API connectivity on `192.168.235.196:18093` — documented pre-existing DSN-gated/live-service-gated failures (same pattern as `260923-ed4-SUMMARY.md`'s handling of `TestPhase128*`).
  - Frontend: `src/lib/cssCustomProperties.guard.test.ts` — 2 pre-existing failures about a `--surface-muted` dead custom-property reference and an allow-list size drift, unrelated to episode-import files.
  - Frontend lint: 3 pre-existing errors in `capture-responsive.cjs` (require-style imports) and `src/app/admin/users/tabs/CapabilityDetailRow.tsx` (unescaped entity), plus pre-existing native-`<input>`/`<img>` warnings on lines in `EpisodeImportMappingRow.tsx` this plan did not touch (201/277/290, all predating this plan's 2-line addition at ~175-177).
- Backend health-check port: the plan's verify step literally said `curl http://192.168.235.196:8092/health`, but the container's actual host port mapping is `18092->8092` (confirmed via `docker compose ps`); verified against `18092` instead, which returned `200`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three Live-UAT gaps from Phase 167 are closed and verified against the live admin UI's underlying data contracts (labels, hints, suggestions) with backend/frontend tests.
- Both containers rebuilt/restarted with confirmed newer start times; team4s_v2 database untouched; no git push; no git stash used.
- No outstanding stubs or known gaps introduced by this quick task.

---
*Phase: quick-260924-b7s*
*Completed: 2026-09-24*

## Self-Check: PASSED

All 10 key created/modified files verified present on disk; all 6 task/metadata commit
hashes (d40f9cd4, 9c86cc8b, 870d5815, b89178bf, 3c01f650, 8b8b6e28) verified present in
`git log --oneline --all`.
