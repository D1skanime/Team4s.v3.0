---
phase: quick-260924-fec
plan: 01
subsystem: ui
tags: [react, nextjs, go, admin, episode-import, fansub, design-system]

requires:
  - phase: 167-fansub-gruppenerkennung-beim-import
    provides: episode import mapping row, fansub group match origin, Einteiler suggestion logic
provides:
  - Frontend-only fansub group chip name resolution (never shows a bare numeric id)
  - Three-column @/components/ui-only mapping row layout with a full stack at <=980px
  - Preview-time Einteiler placeholder title prefill via EpisodeImportPreviewResult.IsEinteiler
affects: [167-fansub-gruppenerkennung-beim-import, admin-episode-import]

tech-stack:
  added: []
  patterns:
    - "Chip/label resolution helper (resolveFansubGroupChipDisplay) that prefers already-present
      name/slug, falls back to a same-response match-origin lookup, and only ever uses the raw id
      as a title tooltip, never as visible text."
    - "Extracting a self-contained @/components/ui-only sub-field component
      (EpisodeImportMappingRowGroupField.tsx) to keep a parent row component under the file-size
      budget while migrating away from native form elements."
    - "Preview-only state prefill (applyEinteilerTitlePrefill) applied inside
      normalizePreviewResult before the preview state is set, keeping Apply's payload untouched."

key-files:
  created:
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/page.layout.test.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.test.ts
  modified:
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css
    - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
    - frontend/src/types/episodeImport.ts
    - backend/internal/models/episode_import.go
    - backend/internal/handlers/admin_episode_import_einteiler.go
    - .planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md

key-decisions:
  - "Kept the exported component name EpisodeImportMappingRowCard unchanged (matches existing
    call sites in page.tsx and the pre-existing test file) even though the plan's prose refers to
    it loosely as 'EpisodeImportMappingRow' -- renaming would have been an unrequested breaking
    change with zero benefit."
  - "Retired the dead .releaseMeta*/.releaseScopeButton/.mappingRowFile CSS classes entirely
    (including nested selectors like .groupInputRow .releaseMetaInput) instead of leaving orphaned
    rules behind; introduced .groupSearchInput/.groupScopeActions as their minimal replacements so
    no CSS selector still names a removed class."
  - "Used the live BACKEND_PORT (18092, from .env) for the Task 3 health check instead of the
    plan's literal 8092 -- 8092 is the in-container port, unreachable from the host; confirmed via
    a failing curl against 8092 (000) vs. a succeeding one against 18092 (200)."

requirements-completed: [GAP-08, GAP-09, GAP-10]

duration: 14min
completed: 2026-09-24
---

# Quick Task 260924-fec: GAP-08/GAP-09/GAP-10 (Phase 167) Summary

**Fansub group chips now resolve to real names instead of raw IDs, the mapping row splits into a
three-column @/components/ui layout that fully stacks below 980px, and Einteiler previews prefill
placeholder episode titles with the anime title without touching the database.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-09-24T11:31:00Z (approx.)
- **Completed:** 2026-09-24T11:44:51Z
- **Tasks:** 3 completed
- **Files modified:** 15 (7 created, 8 modified)

## Accomplishments

- `resolveFansubGroupChipDisplay` (episodeImportMapping.ts) resolves auto-detected fansub group
  chips to their real name via `row.fansub_group_match_origin.group_name`, purely on the frontend
  -- no backend change needed since the name was already present in the same response payload.
- Extracted `EpisodeImportMappingRowGroupField.tsx` (277 lines) from `EpisodeImportMappingRow.tsx`
  (now 139 lines), rebuilt entirely on `@/components/ui` (`FormField`/`Input`/`Button`), zero
  native `<input>`/`<button>` elements remaining in either file.
- `page.module.css`'s `.mappingRow` now uses a named 3-column grid
  (`minmax(0, 1.3fr) minmax(260px, 1fr) auto`) that fully collapses to a single column at
  `<=980px` (previously a two-step 980px/640px transition); dead `.releaseMeta*`/
  `.releaseScopeButton`/`.mappingRowFile` CSS was removed.
- `EpisodeImportPreviewResult.IsEinteiler` (backend, always sent) is now set on every preview
  call, not just the 1-episode suggestion special case; `applyEinteilerTitlePrefill` (frontend,
  pure preview-state transform) prefills a placeholder episode title with the anime title only
  when the anime is an Einteiler and the current title matches the placeholder pattern.
- `167-UAT.md` documents GAP-08/GAP-09/GAP-10 as `status: resolved`, LF-only preserved.
- Backend container rebuilt (`docker compose up -d --build team4sv30-backend`), frontend
  restarted (`docker restart team4sv30-frontend`); both confirmed healthy with newer start times.

## Task Commits

Each task was committed atomically:

1. **Task 1: GAP-08 + GAP-09 -- Gruppen-Chip-Namensauflösung + Drei-Spalten-Zeilenlayout** -
   `24c01dbe` (feat)
2. **Task 2: GAP-10 -- Einteiler-Platzhaltertitel-Vorbefüllung in der Vorschau** - `3d085e4f`
   (feat)
3. **Task 3: Vollverifikation, 167-UAT.md-Einträge, Container-Rebuild/Restart** - `00b5fff7`
   (docs, 167-UAT.md only -- no code changes in Task 3)

**Plan metadata:** none yet -- this SUMMARY.md/STATE.md/ROADMAP.md docs commit is created by the
orchestrator after this report.

## Files Created/Modified

- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` - added
  `resolveFansubGroupChipDisplay` (name/slug/match-origin/`#id` fallback chain, id as tooltip
  only)
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts` - 3 new tests
  for `resolveFansubGroupChipDisplay`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` - rebuilt as a
  139-line three-region shell (`mappingRowInfo`/`mappingRowFields`/`mappingRowActions`) delegating
  the group field to the new component
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx` (new,
  277 lines) - extracted chips/search/suggestions/scope-actions, `@/components/ui`-only
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx` - 2 new
  tests (GAP-08 chip name, GAP-09 three regions)
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` - 3-column `.mappingRow`
  grid, new `.mappingRowInfo`/`.mappingRowFields`/`.mappingRowActions`/`.groupSearchInput`/
  `.groupScopeActions`; removed dead `.releaseMeta*`/`.releaseScopeButton`/`.mappingRowFile`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.layout.test.ts` (new) - CSS-as-text
  assertions for the 3 regions and the `<=980px` full-stack breakpoint
- `frontend/src/types/episodeImport.ts` - added `EpisodeImportPreviewResult.is_einteiler?`
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.ts` (new) -
  `isPlaceholderEpisodeTitle` (mirrors the Go regex) + `applyEinteilerTitlePrefill` (pure preview
  transform)
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportEinteilerTitle.test.ts` (new) -
  7 tests covering placeholder detection and prefill gating
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` -
  `normalizePreviewResult` now runs `applyEinteilerTitlePrefill` on `canonical_episodes` before
  the preview state is set
- `backend/internal/models/episode_import.go` - added `EpisodeImportPreviewResult.IsEinteiler
  bool` (no `omitempty`)
- `backend/internal/handlers/admin_episode_import_einteiler.go` - `applyEinteilerSuggestion` now
  sets `preview.IsEinteiler` as its first statement, before the existing 1-episode-only guard
- `backend/internal/handlers/admin_episode_import_einteiler_test.go` - 4 new
  `TestApplyEinteilerSuggestion_IsEinteiler*` tests
- `.planning/phases/167-fansub-gruppenerkennung-beim-import/167-UAT.md` - GAP-08/GAP-09/GAP-10
  appended as `status: resolved`

## Decisions Made

- Kept `EpisodeImportMappingRowCard` as the exported component name (unchanged call sites in
  `page.tsx` and the pre-existing test file).
- Removed the dead `.releaseMeta*`/`.releaseScopeButton`/`.mappingRowFile` CSS classes completely,
  including the nested `.groupInputRow .releaseMetaInput` selector, replacing it with a minimal
  `.groupSearchInput`/`.groupScopeActions` pair so no selector in the file still names a removed
  class (verified via `grep`, 0 hits in both `.tsx` files).
- Used the live host-mapped `BACKEND_PORT` (18092, from `.env`) instead of the plan's literal
  `8092` for the Task 3 health check -- `8092` is the container-internal port and is unreachable
  from the host network (`curl` against it returned `000`); `18092` returned `200`. This is a
  Rule 3 auto-fix (blocking issue in the plan's verification command, not a code change).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 3 health-check port corrected from 8092 to 18092**
- **Found during:** Task 3 (backend container rebuild verification)
- **Issue:** The plan's verify command curls `http://192.168.235.196:8092/health`, but the
  compose file publishes the backend on the host as `18092:8092` (per `.env`'s `BACKEND_PORT`
  and `docker compose ps` output); `curl` against `8092` returned `000` (connection failed).
- **Fix:** Used `http://192.168.235.196:18092/health` for the post-rebuild health check, which
  returned `200`.
- **Files modified:** none (verification-command-only fix, no code changed).
- **Verification:** `curl -sf http://192.168.235.196:18092/health -o /dev/null -w '%{http_code}\n'`
  returned `200` after the rebuild.
- **Committed in:** n/a (no file change; documented here for traceability).

---

**Total deviations:** 1 auto-fixed (1 blocking, verification command only)
**Impact on plan:** No scope creep; this only corrected which host port the health check curled
against. No source files were changed as a result.

## Issues Encountered

- The backend's full `go test ./...` run inside the plan-mandated scratch container (which mounts
  only `backend/`, not the sibling `database/` directory, per the plan's own `<critical_gotcha>`)
  produces a large number of pre-existing, environment-dependent failures unrelated to this
  plan's changes: `TEAM4S_PHASE128_TEST_DSN is required` (Phase-128 Postgres integration tests
  needing a live DSN not exported into the scratch container), migration-source-contract tests
  reading `../../../database/migrations/*.sql` (path resolves outside the mounted `/app`, since
  `database/` is a sibling of `backend/`, not mounted), `Phase134Matrix*` tests requiring a live
  server on port `18093` (`connection refused`) and valid Keycloak test credentials, and one
  FFmpeg-installed-on-host test. None of these touch `episode_import.go`,
  `admin_episode_import_einteiler.go`, or any other file this plan modified; the targeted
  `-run TestApplyEinteilerSuggestion` run (Task 2) and the full `go build ./... && go vet ./...`
  (Task 3) are both clean. Documented per the plan's own success criterion ("vollständig grün
  oder nennen nur vorbestehende, unabhängige Fehler").
- The frontend's full `npm run test` run (350 test files, 3121 tests) has exactly the same 2
  pre-existing `cssCustomProperties.guard.test.ts` failures already documented in
  `.planning/STATE.md` (Phase 164 completion entry, dated 2026-09-18) -- unrelated to this plan.
  `npm run typecheck` is 0 errors; `npm run lint` has the same 3 pre-existing errors (none in
  files touched by this plan: `capture-responsive.cjs`, `CapabilityDetailRow.tsx`) plus the
  same pre-existing native-`<input>`/`<select>` design-system migration warnings in unrelated
  files.

### Command durations (Task 3 full verification + rebuild/restart)

- `go build ./... && go vet ./... && go test ./...` (scratch container): ~15s
- `npm run test` (full frontend suite, 3126 tests): ~113s (1m 53s)
- `npm run typecheck`: ~3.3s
- `npm run lint`: ~41.5s
- `docker compose up -d --build team4sv30-backend`: ~6s
- `docker restart team4sv30-frontend`: ~1s

### Container start timestamps (Task 3)

| Container | Before | After |
|---|---|---|
| `team4sv30-backend` | 2026-09-24T10:34:53.127031224Z | 2026-09-24T11:44:11.936566355Z |
| `team4sv30-frontend` | 2026-09-24T10:35:04.567565220Z | 2026-09-24T11:44:31.469131253Z |

Both containers confirmed newer start times; `curl http://192.168.235.196:18092/health` returned
`200` after the backend rebuild; `curl http://192.168.235.196:3000/` returned `200` after the
frontend restart.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GAP-08/GAP-09/GAP-10 are code-complete and containers are live with the fixes; live UAT by the
  Auftraggeber against `/admin/anime/7/episodes/import` (Anime #7, the same file referenced in
  the UAT report) is the natural next verification step, consistent with how GAP-05..GAP-07 were
  closed in the preceding `quick-260924-dso` task.
- No blockers. No data changes to `team4s_v2`; no `git push`; no `git stash` used at any point.

---
*Phase: quick-260924-fec*
*Completed: 2026-09-24*

## Self-Check: PASSED

All 14 referenced files confirmed present on disk (`FOUND`); all 3 task commit hashes
(`24c01dbe`, `3d085e4f`, `00b5fff7`) confirmed present in `git log --oneline --all`.
