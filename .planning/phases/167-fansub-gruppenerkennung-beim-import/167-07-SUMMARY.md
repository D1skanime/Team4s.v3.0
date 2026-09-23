---
phase: 167-fansub-gruppenerkennung-beim-import
plan: 07
subsystem: frontend
tags: [react, typescript, ui, episode-import, fansub-alias, ui-primitives]

# Dependency graph
requires:
  - phase: 167 (Plan 04, frontend contract)
    provides: EpisodeImportMappingRow TS fields (fansub_group_match_origin, fansub_group_suggestions, release_version_source) and reassignFansubAlias(fansubID, aliasID, payload, authToken?)
  - phase: 167 (Plan 05, backend)
    provides: server-populated fansub_group_match_origin/fansub_group_suggestions/release_version_source in the real PreviewEpisodeImport response
provides:
  - "FansubGroupOriginHint component rendering all 4 UI-SPEC Zustände (A origin hint / B suggestion chips / C conflict warning+reassign / D nothing)"
  - "setMappingReleaseMeta now permanently flips release_version_source to 'manual' on any admin version edit"
affects: [167-08 (alias management UI, shares the same reassign copy contract)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New self-contained component file absorbs all new UI logic so EpisodeImportMappingRow.tsx/page.tsx stay near their file-size ceiling (D-11)"
    - "useConfirmDialog danger-tone confirm before any state-changing action (mirrors ClaimManagementPanel.tsx's pattern)"

key-files:
  created:
    - frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.module.css
    - frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.test.tsx
  modified:
    - frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/page.module.css

key-decisions:
  - "This repo does not have jest-dom installed, so `toBeInTheDocument()` is not a valid Vitest/Chai matcher here (confirmed by the existing EpisodeImportFolderSelector.test.tsx precedent using `.not.toBeNull()`). Rewrote all presence assertions in the new test file to `.not.toBeNull()` / `.toBeNull()` instead, after the RED run itself passed with an import-resolution failure (component file did not exist yet) rather than a matcher error - the matcher issue only surfaced during the GREEN run and was fixed before the feat commit, so the committed test file was never broken."
  - "currentGroupID is derived only from selectedFansubGroups[0] per the plan's explicit instruction (single-primary-group conflict-detection model); multi-group selection in one row is an existing, unrelated feature this plan does not touch."
  - "After a successful reassign, the component shows a local 'Umgehängt.' neutral state instead of re-fetching the whole preview, per the plan's explicit no-refetch guidance (origin was computed once at preview time)."

requirements-completed: [REQ-167-08, REQ-167-09, REQ-167-11, REQ-167-12, REQ-167-15, REQ-167-18, REQ-167-22]

# Metrics
duration: ~11min
completed: 2026-09-23
---

# Phase 167 Plan 07: Import-Mapping-Zeile Herkunftshinweis Summary

**A new, self-contained `FansubGroupOriginHint` component renders all 4 UI-SPEC states (exact-match origin hint, up-to-3 fuzzy suggestion chips, conflict warning with confirmed "Trotzdem umhängen" reassign, or nothing) below the existing group-chip block, wired into `EpisodeImportMappingRow.tsx` with only 3 added lines so page.tsx stays untouched and the row file stays near its ceiling.**

## Performance

- **Duration:** ~11 min (commits span 2026-09-23T14:45:54Z-14:47:55Z; context loading preceded this)
- **Tasks:** 2/2 completed
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- `FansubGroupOriginHint.tsx` (new, 122 lines) implements all 4 states from `167-UI-SPEC.md`'s Screen 1:
  - **Zustand A** (exact match, no conflict): a non-interactive `<span>` with an `aria-hidden` `Sparkles` icon and `Erkannt aus Dateiname: {raw} → {group_name} ({Alias|Name|Slug})`.
  - **Zustand B** (no match, suggestions present): up to 3 `Button variant="subtle" size="sm"` chips reading `Meinten Sie: {Gruppenname}?`, each adding the suggestion as a selected group via `onAddSelectedFansubGroup` — never auto-applied.
  - **Zustand C** (conflict): `Badge variant="warning"` reading `Kürzel „{raw}" gehört bereits zu {origin.group_name}.`, plus — only when `matched_via === 'alias'` and `alias_id` is present — a `Button variant="danger" size="sm"` reading `Trotzdem zu {currentGroupName} umhängen` that opens a `useConfirmDialog` danger-tone confirmation (exact UI-SPEC copy) before calling `reassignFansubAlias(origin.group_id, origin.alias_id, { target_fansub_group_id: currentGroupID })`; on success shows a local `Umgehängt.` state instead of re-fetching the preview.
  - **Zustand D** (nothing): returns `null` when there is no origin and no suggestions.
  - Zero native `<button>`/`<input>`/`<select>` in the file (verified via `grep -c`, result 0).
- `FansubGroupOriginHint.test.tsx` (new, 7 tests, table-driven per Zustand) covers A (both alias- and slug-tier label mapping), B (click-to-add plus the 3-item cap), C both with and without the reassign button (alias-tier vs. name-tier), and D.
- `EpisodeImportMappingRow.tsx` renders `<FansubGroupOriginHint .../>` immediately after the group-chip block's closing `</div>` and a `{row.release_version_source === 'detected' ? <span>Aus Dateiname übernommen</span> : null}` hint after the version `<input>` — **+3 lines total** (326 → 329: one import line, one JSX insertion line, one hint-span line). `page.tsx` is completely untouched (597 → 597).
- `setMappingReleaseMeta` in `episodeImportMapping.ts` now sets `release_version_source: 'manual'` whenever `meta.releaseVersion !== undefined` (the only call site is the version `<input>`'s `onChange`), so the "Aus Dateiname übernommen" hint permanently disappears the moment an admin edits the field — matching the UI-SPEC's explicit "kein erneutes Erscheinen" rule even if the admin later types the original detected value back in.
- `.releaseMetaHint` class added to `page.module.css` (12px/400/`var(--text-muted)`, per UI-SPEC).
- Two new `episodeImportMapping.test.ts` cases: one asserting the manual flip when `releaseVersion` is provided, one asserting `release_version_source` stays untouched when only `fansubGroupName` is set.

## Task Commits

Each task was committed atomically, with the TDD-tagged Task 1 following the RED-then-GREEN gate order:

1. **Task 1 RED:** `c013cad5` (test) — `FansubGroupOriginHint.test.tsx` added; verified failing before implementation existed (import-resolution error, component file temporarily moved aside to prove RED).
2. **Task 1 GREEN:** `6a909538` (feat) — `FansubGroupOriginHint.tsx` + `FansubGroupOriginHint.module.css` implemented; all 7 tests pass. Also fixed the test file's assertions from `toBeInTheDocument()` (not available — `jest-dom` is not installed in this repo) to `.not.toBeNull()`/`.toBeNull()`, matching the existing `EpisodeImportFolderSelector.test.tsx` convention.
3. **Task 2:** `5b16ea52` (feat) — `EpisodeImportMappingRow.tsx` wiring, `episodeImportMapping.ts`'s manual-flip logic, `page.module.css`'s new hint class, and two new `episodeImportMapping.test.ts` cases.

**Plan metadata:** commit pending (this SUMMARY + STATE.md + ROADMAP.md).

## Files Created/Modified

- `frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx` (122 lines, new)
- `frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.module.css` (19 lines, new)
- `frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.test.tsx` (179 lines, new)
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx` (329 lines, was 326 — +3)
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` (+1 line: `release_version_source` override in `setMappingReleaseMeta`)
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts` (+2 new test cases)
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` (+6 lines: `.releaseMetaHint`)
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` — **untouched** (verified 597 → 597 lines)

## Verification Commands Run

```bash
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"                                        # clean, exit 0
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run 'src/app/admin/anime/[id]/episodes/import/'"  # 5 files, 66 tests, all pass
grep -c "<button\|<input\|<select" "frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.tsx"     # 0
wc -l "frontend/src/app/admin/anime/[id]/episodes/import/page.tsx"                                                     # 597 (unchanged)
wc -l "frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx"                                  # 329 (326 + 3)
```

## Decisions Made

See `key-decisions` in the frontmatter above (jest-dom matcher substitution, single-primary-group conflict model, no-refetch-after-reassign local state).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `toBeInTheDocument()` matcher not available**
- **Found during:** Task 1 GREEN run (first `vitest run` after restoring the implementation file).
- **Issue:** The plan's test scaffolding implicitly assumed jest-dom-style matchers, but this repo does not have `@testing-library/jest-dom` installed or registered in `vitest.config.ts`'s `setupFiles` (only `jest-axe`'s `toHaveNoViolations` is registered). `toBeInTheDocument()` failed with `Invalid Chai property` on all 5 tests using it.
- **Fix:** Replaced every `toBeInTheDocument()`/`not.toBeInTheDocument()` assertion with `.not.toBeNull()`/`.toBeNull()`, matching the existing `EpisodeImportFolderSelector.test.tsx` precedent in the same directory (`expect(screen.getByText(...)).not.toBeNull()`).
- **Files modified:** `frontend/src/app/admin/anime/[id]/episodes/import/FansubGroupOriginHint.test.tsx`.
- **Commit:** `6a909538` (folded into the GREEN commit — the RED commit's failure was an import-resolution error, not a matcher error, so RED was still valid before this fix).

## Issues Encountered

None beyond the auto-fixed matcher issue above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

`FansubGroupOriginHint` is live in the actual import mapping row and consumes Plan 04/05's fields directly. Plan 08 (alias management UI in the group-editing surface) can reuse the same `useConfirmDialog`/`reassignFansubAlias` copy contract already proven here. No blockers.

---
*Phase: 167-fansub-gruppenerkennung-beim-import*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 7 created/modified files verified present on disk; all 3 task commit hashes
(`c013cad5`, `6a909538`, `5b16ea52`) verified present in `git log`.
