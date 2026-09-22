---
phase: quick-260922-min
plan: 01
subsystem: ui
tags: [react, nextjs, eslint, confirm-dialog, admin, anime-types, go, backend]

requires:
  - phase: 165-library-discovery-assisted-anime-creation
    provides: Admin anime-creation/library workflows this quick task's GAP-20/GAP-21 fixes were found against during Live-UAT (2026-09-22)
provides:
  - "ConfirmDialog primitive (useConfirmDialog hook) under @/components/ui, Promise-based, built on Modal, no new global context"
  - "ESLint ban (no-restricted-properties + no-restricted-globals, severity error, no legacy exceptions) on window.confirm/bare confirm()"
  - "All 23 window.confirm call sites across 17 admin files migrated to useConfirmDialog()"
  - "mapAnimeTypeNameToAPI case \"film\": return \"film\" fix (backend/internal/repository/anime_v2.go)"
  - "AdminAnimeOverviewClient.tsx: correct Typ-Label map (TV/Film/OVA/ONA/Special/Bonus/Web) and singular/plural episode count formatting"
affects: [admin-anime-overview, admin-episode-versions, admin-fansubs, frontend-ui-primitives, eslint-config]

tech-stack:
  added: []
  patterns:
    - "useConfirmDialog() hook pattern: local confirm()/confirmDialog pair per call site, no shared provider; hooks that need it (useEpisodeVersionEditor, useSegmentAssetHandlers) expose confirmDialog in their return object for the consuming component to render"

key-files:
  created:
    - frontend/src/components/ui/ConfirmDialog.tsx
    - frontend/src/components/ui/ConfirmDialog.test.tsx
    - frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.test.tsx
    - backend/internal/repository/anime_v2_test.go
  modified:
    - frontend/eslint.config.mjs
    - frontend/src/components/ui/index.ts
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx"
    - "frontend/src/app/admin/anime/[id]/episodes/[episodeId]/edit/page.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentAssetHandlers.ts"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx"
    - "frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx"
    - "frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx"
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx
    - frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx
    - frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx
    - frontend/src/app/admin/fansubs/create/page.tsx
    - frontend/src/app/admin/fansubs/page.tsx
    - "frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.tsx"
    - "frontend/src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx"
    - frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx
    - backend/internal/repository/anime_v2.go
    - .planning/phases/165-library-discovery-assisted-anime-creation/165-UAT.md

key-decisions:
  - "EpisodeVersionEditorPage.tsx was not listed in the plan's files_modified but had to be edited to render editor.confirmDialog — otherwise the migrated useEpisodeVersionEditor.ts delete confirmation would never appear (Rule 2, missing critical functionality)."
  - "Backend health-check port in the plan's verification (8092) does not match this environment's actual host mapping — .env sets BACKEND_PORT=18092, so http://192.168.235.196:18092/health was used instead."
  - "The single remaining grep hit for 'window.confirm' in frontend/src is an inert test-title string in AnimeJellyfinFolderList.test.tsx ('...and no window.confirm usage') proving that component never called it; not a functional violation."

requirements-completed: [GAP-20, GAP-21]

duration: ~75min
completed: 2026-09-22
---

# Phase quick-260922-min Plan 01: Gemeinsamer Bestätigungsdialog (GAP-20) + Anime-Typ/Episoden-Anzeige (GAP-21) Summary

**Replaced all 23 native `window.confirm()` popups across 17 admin files with a new Promise-based `useConfirmDialog()` primitive built on the existing `Modal`, added an ESLint ban to prevent regressions, and fixed the backend anime-type mapping bug that showed "TV" instead of "Film" for movie-type anime.**

## Performance

- **Duration:** ~75 min
- **Completed:** 2026-09-22
- **Tasks:** 6/6 completed
- **Files modified:** 27 (4 created, 23 modified) + 1 docs file (165-UAT.md)

## Accomplishments

- New `ConfirmDialog.tsx` primitive (`useConfirmDialog()` hook) under `@/components/ui`, Promise-based (`confirm(options): Promise<boolean>`), built on `Modal`, with 5 passing unit tests covering title/description rendering, cancel, confirm, Escape, and initial focus on the Abbrechen button.
- New ESLint rules (`no-restricted-properties` for `window.confirm`, `no-restricted-globals` for bare `confirm()`), severity `error`, with no legacy exceptions — added as independent rule keys so the existing `no-restricted-syntax` UI-primitive ratchet logic is untouched.
- All 23 `window.confirm(...)` call sites across 17 production files migrated to `useConfirmDialog()`/`confirm(...)`, preserving the exact German confirmation text (split onto `title`/`description` at the existing `\n\n`) and exact post-confirm behavior.
- Backend `mapAnimeTypeNameToAPI` (`backend/internal/repository/anime_v2.go`) gained `case "film": return "film"`, fixing the GAP-21 bug where the `anime_types` DB row `"film"` fell through to the `"tv"` default fallback — affects all four read paths (list, detail, update response, themes response) since they all call the same function.
- `AdminAnimeOverviewClient.tsx` now shows a dedicated Typ-Label-Map (TV/Film/OVA/ONA/Special/Bonus/Web) instead of `anime.type.toUpperCase()`, and correct singular/plural episode-count formatting ("1 Episode" vs. "N Episoden").
- `165-UAT.md` updated with `status: resolved` entries for both GAP-20 and GAP-21, LF-only preserved.

## Task Commits

1. **Task 1: ConfirmDialog primitive + ESLint ban** - `e789fb7b` (feat)
2. **Task 2: window.confirm migration Batch A — episode versions & episodes (9 files, 8 sites)** - `b296cc12` (feat)
3. **Task 3: window.confirm migration Batch B — anime admin components (4 files, 6 sites)** - `31765c48` (feat)
4. **Task 4: window.confirm migration Batch C — fansubs (4 files, 8 sites)** - `aa7c9f7a` (feat)
5. **Task 5: GAP-21 backend fix + AdminAnimeOverviewClient (GAP-20 delete dialog + GAP-21 type/episode display)** - `9c5083d0` (fix)
6. **Task 6: 165-UAT.md entries, full verification, backend rebuild, frontend restart** - `b0100659` (docs)

**Plan metadata:** committed by orchestrator separately (SUMMARY.md, STATE.md, ROADMAP.md not included in the commits above per execution constraints)

## Files Created/Modified

- `frontend/src/components/ui/ConfirmDialog.tsx` - New `useConfirmDialog()` hook; Promise-based confirm dialog built on `Modal`
- `frontend/src/components/ui/ConfirmDialog.test.tsx` - 5 tests: title/description, cancel→false, confirm→true, Escape→false, initial focus on Abbrechen
- `frontend/src/components/ui/index.ts` - Barrel export for `ConfirmDialog`
- `frontend/eslint.config.mjs` - New `no-restricted-properties`/`no-restricted-globals` rules banning `window.confirm`/`confirm()`
- 8 files in `episode-versions/[versionId]/edit/` + 1 anime episode edit page + 1 anime episode versions page - Batch A migration (8 call sites)
- `EpisodeVersionEditorPage.tsx` - Renders `editor.confirmDialog` (Rule 2 addition, not in original files_modified)
- `AnimeThemesSection.tsx`, `AnimeRelationsSection.tsx`, `EpisodeManager.tsx`, `AnimeContextFansubManager.tsx` - Batch B migration (6 call sites), removed obsolete `typeof window` guards
- `fansubs/create/page.tsx`, `fansubs/page.tsx`, `NotesTab.tsx`, `ClaimManagementPanel.tsx` (+ test) - Batch C migration (8 call sites)
- `backend/internal/repository/anime_v2.go` - `case "film": return "film"` fix
- `backend/internal/repository/anime_v2_test.go` - `TestMapAnimeTypeNameToAPI` table test (film/tv/unknown/nil/uppercase)
- `AdminAnimeOverviewClient.tsx` (+ test) - Typ-label map, episode-count pluralization, delete flow via `useConfirmDialog()`
- `165-UAT.md` - GAP-20 and GAP-21 `status: resolved` entries

## Decisions Made

- `EpisodeVersionEditorPage.tsx` was edited even though it wasn't in the plan's `files_modified` list, because `useEpisodeVersionEditor.ts`'s migrated delete-confirmation dialog would never render otherwise (Rule 2: auto-add missing critical functionality — the plan's own action text says "die aufrufende Komponente rendert es").
- Health-check verification used port `18092` instead of the plan's `8092`, since this environment's `.env` sets `BACKEND_PORT=18092` (the plan's assumed default port does not match this deployment's actual host mapping).
- `SegmenteTab.tsx` and `ClaimManagementPanel.tsx` stayed within the 450-line CLAUDE.md budget via import-line consolidation and single-line `confirm()` calls respectively, per the plan's explicit compactness instructions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] EpisodeVersionEditorPage.tsx must render editor.confirmDialog**
- **Found during:** Task 2 (useEpisodeVersionEditor.ts migration)
- **Issue:** The plan's frontmatter `files_modified` list omitted `EpisodeVersionEditorPage.tsx`, but the plan's own Task 2 action text requires the hook's consuming component to render the returned `confirmDialog` — without this edit the delete-confirmation Modal for episode-version deletion would never mount, silently breaking the migrated flow.
- **Fix:** Added `{editor.confirmDialog}` to the component's JSX return, just before the closing `</main>`.
- **Files modified:** `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
- **Verification:** File is part of the same legacy-exempt file set (`LEGACY_NO_RESTRICTED_SYNTAX_FILES`); no new lint/typecheck errors introduced; manual trace of the JSX confirms the dialog now mounts when `pending` state is set.
- **Commit:** `b296cc12`

**2. [Rule 3 - Blocking issue] Plan's assumed backend health-check port (8092) does not match this environment**
- **Found during:** Task 5/6 verification (`curl` against `/health`)
- **Issue:** The plan's `<verify>`/`<verification>` steps use `http://192.168.235.196:8092/health`, but `curl` against port 8092 returned connection-refused (exit code 7) in this environment.
- **Fix:** Checked `.env` and found `BACKEND_PORT=18092`; re-ran the health check against `http://192.168.235.196:18092/health`, which returned `200`.
- **Files modified:** None (verification-only correction, no code change).
- **Verification:** `curl -sf http://192.168.235.196:18092/health -o /dev/null -w "%{http_code}\n"` → `200`.

## Known Stubs

None.

## Threat Flags

None — all changes stay within the plan's documented `<threat_model>` trust boundaries (client-side presentation swap for `window.confirm`, and a pure value-mapping fix on an already-admin-protected read path). No new network endpoints, auth paths, or schema changes were introduced.

## Deferred Issues (pre-existing, out of scope)

Found during Task 6's full `npm run test` verification run, confirmed via `git diff --stat` against the pre-session baseline commit that neither file was touched by this plan. Logged to
`.planning/quick/260922-min-gap-20-gap-21-gemeinsamer-bestaetigungsd/deferred-items.md`:

1. `src/lib/cssCustomProperties.guard.test.ts` — 2 failing assertions about an unfallbacked `--surface-muted` reference in `lib/roleCatalog.accessibility.test.ts:268`. Reproducible in isolation; pre-existing, unrelated to GAP-20/GAP-21.
2. `src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx` — one test times out under full-suite load but passes cleanly in isolation (358ms, 4/4 tests green). Pre-existing flake, unrelated to this plan.

Also note: `grep -rn "window\.confirm" frontend/src` returns `1` hit, not `0` — this is an inert test-title string in `AnimeJellyfinFolderList.test.tsx` ("...and no window.confirm usage"), not an actual `window.confirm` call; confirmed no `no-restricted-properties`/`no-restricted-globals` lint violations exist anywhere in the repo.

## Issues Encountered

None beyond the two deviations documented above.

## Verification Evidence

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/ui/ConfirmDialog.test.tsx"` → 5/5 passed
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx'"` → 38/38 passed
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/components/EpisodeManager/"` → 1/1 passed
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/fansubs/[id]/edit/ClaimManagementPanel.test.tsx'"` → 4/4 passed
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin/anime/components/AdminAnimeOverviewClient.test.tsx"` → 3/3 passed
- `docker exec team4sv30-backend sh -c "cd /app && go build ./... && go vet ./... && go test ./internal/repository/... -run TestMapAnimeTypeNameToAPI -v"` → build clean, vet clean, 5/5 sub-tests passed
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run test"` → 344 files / 3058 tests passed, 3 pre-existing/unrelated failures (see Deferred Issues), 3 todo
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck"` → clean, no errors
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint"` → 3 pre-existing errors in untouched files (`capture-responsive.cjs`, `CapabilityDetailRow.tsx`), zero `no-restricted-properties`/`no-restricted-globals` violations
- `docker compose up -d --build team4sv30-backend` → built and healthy, `/health` → `200` (port 18092)
- `docker restart team4sv30-frontend` → container running
- `git diff --stat` against the pre-session baseline commit (`354df5ee`, the parent of this plan's first commit) shows exactly the plan's `files_modified` set plus the one Rule-2 addition (`EpisodeVersionEditorPage.tsx`) and the `165-UAT.md` docs entry — no stray files, no `git add -A`, no push.

## Self-Check: PASSED

All created files verified present on disk (`ConfirmDialog.tsx`, `ConfirmDialog.test.tsx`, `AdminAnimeOverviewClient.test.tsx`, `anime_v2_test.go`, `165-UAT.md`, this `SUMMARY.md`, `deferred-items.md`). All 6 task commit hashes (`e789fb7b`, `b296cc12`, `31765c48`, `aa7c9f7a`, `9c5083d0`, `b0100659`) verified present in `git log --all`.
