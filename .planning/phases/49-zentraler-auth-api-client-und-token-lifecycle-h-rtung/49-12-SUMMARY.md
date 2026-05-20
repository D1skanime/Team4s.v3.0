---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
plan: "12"
subsystem: frontend-auth-api-client
status: complete
tags:
  - auth
  - api-client
  - episode-admin
  - token-lifecycle
dependency_graph:
  requires:
    - 49-05
    - 49-06
    - 49-09
    - AUTH-API-CLIENT-01
  provides:
    - token-free episode admin pages
    - token-free EpisodeManager UI wiring
    - token-free episode manager mutation hooks
  affects:
    - frontend/src/app/admin/anime/[id]/episodes
    - frontend/src/app/admin/anime/components/EpisodeManager
    - frontend/src/app/admin/anime/hooks/internal/episode-manager
tech_stack:
  added: []
  patterns:
    - useAuthSession boolean gating for episode admin callers
    - central API helper auth ownership
    - compatibility props for dirty parent edit shell callers
key_files:
  created:
    - .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-12-SUMMARY.md
  modified:
    - frontend/src/app/admin/anime/[id]/episodes/page.tsx
    - frontend/src/app/admin/anime/[id]/episodes/[episodeId]/edit/page.tsx
    - frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx
    - frontend/src/app/admin/anime/hooks/internal/useEpisodeManagerImpl.ts
    - frontend/src/app/admin/anime/hooks/internal/episode-manager/useEpisodeManagerEditMutations.ts
    - frontend/src/app/admin/anime/hooks/internal/episode-manager/useEpisodeManagerBulkMutations.ts
key_decisions:
  - Episode admin callers now gate mutations with token-free hasAccessToken state while central API helpers resolve bearer state.
  - EpisodeManager keeps a broad compatibility prop shape so pre-existing dirty parent edit-shell callers can finish migrating later without this slice consuming token values.
  - Episode CRUD and release/version navigation stayed on existing endpoints and payloads; no episode, release, media, backend, or schema ownership changed.
requirements-completed:
  - AUTH-API-CLIENT-01
metrics:
  duration: 5 min
  completed: 2026-05-20T16:30:24Z
---

# Phase 49 Plan 12: Episode Admin Caller Migration Summary

Episode admin pages and EpisodeManager hooks now use token-free auth gating while preserving neutral episode CRUD and release-version navigation.

## Performance

- **Duration:** 5 min implementation and verification window after context loading
- **Started:** 2026-05-20T16:25:21Z
- **Completed:** 2026-05-20T16:30:24Z
- **Tasks:** 3
- **Files modified:** 7 source files plus this summary

## Outcome

Status: COMPLETE

Plan 49-12 stayed inside the seven-file episode-admin budget. The exact scoped static token gate now returns zero hits for the episode pages, EpisodeManager UI, and EpisodeManager mutation hooks.

## Tasks Completed

| Task | Result | Commit | Files |
|---|---|---|---|
| Task 1: Enforce episode admin split scope before edits | PASS | no code commit | Scope search found token ownership only in the seven planned files. |
| Task 2: Remove token threading from episode pages and manager UI | PASS | `fef2fc30` | Episode list/edit/version pages and EpisodeManager UI. |
| Task 3: Remove token threading from episode manager mutation hooks | PASS | `fef2fc30` | EpisodeManager orchestration, edit mutations, and bulk mutations. |

## Files Changed

- `frontend/src/app/admin/anime/[id]/episodes/page.tsx` - Uses `hasAccessToken` only and creates episodes without forwarding a token argument.
- `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/edit/page.tsx` - Saves and deletes neutral episode records through existing helpers without token arguments.
- `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx` - Creates/deletes release versions through existing helpers without token arguments while preserving episode/version navigation.
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx` - Removes consumed token prop and calls the manager hook without token threading.
- `frontend/src/app/admin/anime/hooks/internal/useEpisodeManagerImpl.ts` - Reads token-free session state and passes only access booleans into mutation hooks.
- `frontend/src/app/admin/anime/hooks/internal/episode-manager/useEpisodeManagerEditMutations.ts` - Calls episode create/update helpers without token parameters.
- `frontend/src/app/admin/anime/hooks/internal/episode-manager/useEpisodeManagerBulkMutations.ts` - Calls episode update/delete helpers without token parameters for bulk flows.

## Decisions Made

- Kept existing endpoint URLs, request bodies, conflict/error handling, and refresh-after-mutation behavior.
- Preserved neutral episode ownership: no fansub, release, release-version, segment, or media data was attached directly to episodes.
- Kept backend permission ownership unchanged; frontend still only gates on token-free session presence before protected mutations.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Preserved dirty parent compatibility without consuming tokens**
- **Found during:** Task 2
- **Issue:** Existing dirty anime edit-shell callers outside this plan still pass legacy props into `EpisodeManager`. Removing compatibility entirely would force out-of-scope parent edits.
- **Fix:** `EpisodeManagerProps` accepts extra compatibility props through an index signature while the component no longer declares, destructures, or forwards any token value.
- **Files modified:** `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx`
- **Verification:** Typecheck, targeted lint, scoped static token gate.
- **Committed in:** `fef2fc30`

**Total deviations:** 1 auto-fixed (Rule 3). **Impact:** The plan remains inside the seven-file split. Production target files are token-free; parent edit-shell cleanup remains outside 49-12.

## Known Stubs

None. Stub-pattern scanning returned normal UI attributes, initialized local arrays/objects, optional null payload fields, and the existing stream URL placeholder only; no new unwired data stubs were introduced.

## Threat Flags

None. This plan introduced no new endpoint, auth path, file access behavior, schema change, backend permission behavior, streaming/Jellyfin route change, release media ownership path, group media ownership path, or episode/release-version ownership change.

## Verification

Automated checks run:

- `rg -n "\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken" [49-12 files]` - PASS, zero hits after migration.
- `cd frontend && npm run typecheck` - PASS.
- `cd frontend && npx eslint [49-12 files]` - PASS.
- `git diff --check -- [49-12 files]` - PASS.
- `cd frontend && npm run lint` - FAIL due unrelated existing errors in `ReleaseVersionMediaSection.test.tsx`, `app/dev/ui-system/page.tsx`, and temporary `tmp-live-full-flow*.js` scripts; targeted 49-12 lint passed.

## Residual Risks

- The repo remains heavily dirty with unrelated changes. This plan staged and committed only the seven 49-12 source files plus this summary.
- `.planning/STATE.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md` were already dirty before this plan, so this execution did not mutate or stage them to avoid mixing unrelated planning drift into the 49-12 metadata commit.
- Anime edit-shell parent files outside this plan may still pass legacy compatibility props until their owning split plan removes them.

## Commits

- `fef2fc30` - `feat(49-12): migrate episode admin callers to token-free auth`

## Self-Check: PASSED

- Found all seven modified source files.
- Found `49-12-SUMMARY.md`.
- Found implementation commit `fef2fc30`.
- Scoped typecheck, targeted lint, static token gate, and diff whitespace checks passed.
