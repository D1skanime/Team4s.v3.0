---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
plan: 07
subsystem: ui
tags: [typescript, react, nextjs, fansub-groups, removal, openapi-adjacent-contract]

# Dependency graph
requires:
  - phase: 189-05
    provides: "Backend/contract half of the merge removal (handler, repository transaction, routes, openapi.yaml schemas) -- confirmed gone so this plan's frontend removal never calls a now-404 endpoint"
  - phase: 189-06
    provides: "The mandatory fansub.ts split (764->415 lines via barrel re-export), landed before this plan edits the same file to delete the Merge type block"
provides:
  - "Zero frontend route, component, API-client function, or type for fansub-group merging anywhere in the codebase (D-11, frontend half -- completes the removal started in 189-05)"
  - "Zero dead /admin/fansubs/merge links in the admin UI"
  - "Zero Merge-feature references left in shared/contracts/fansubs.yaml (a sibling human-readable contract doc not covered by 189-05's openapi.yaml-only scope, found and closed in this plan)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Grep-first removal verification: re-run the full-repo grep inventory after each deletion step, not just once at plan start, to catch sibling artifacts (shared/contracts/fansubs.yaml) the original research inventory missed"

key-files:
  created: []
  modified:
    - frontend/src/lib/api/fansubs-groups.ts
    - frontend/src/types/fansub.ts
    - frontend/src/app/admin/fansubs/page.tsx
    - frontend/src/app/admin/fansubs/direct-access-gate.test.tsx
    - shared/contracts/fansubs.yaml
  deleted:
    - frontend/src/app/admin/fansubs/merge/page.tsx
    - frontend/src/app/admin/fansubs/merge/MergeWizardCards.tsx
    - frontend/src/app/admin/fansubs/merge/MergeWizardPreviewStep.tsx
    - frontend/src/app/admin/fansubs/merge/MergeWizardProgress.tsx
    - frontend/src/app/admin/fansubs/merge/useMergeFansubsWizard.ts
    - frontend/src/app/admin/fansubs/merge/fansubMergeScoring.ts
    - frontend/src/app/admin/fansubs/merge/fansubMergeScoring.test.ts
    - frontend/src/app/admin/fansubs/merge/MergeWizard.module.css

key-decisions:
  - "Executed Task 1 and Task 2's test-file fix together before the first commit, even though the plan splits them into two tasks: direct-access-gate.test.tsx still imported ./merge/page after Task 1's directory deletion, so npx tsc --noEmit could not pass Task 1's own verification gate until Task 2's test edit landed. Commits were still split exactly along the plan's two task file lists (Task 1's commit touches only fansubs-groups.ts/fansub.ts/merge-dir; Task 2's commit touches only page.tsx/direct-access-gate.test.tsx) -- the sequencing gap was an artifact of the plan's task boundary, not a reason to merge the commits."
  - "Removed the now-unused mockPlatformAdmin() test helper in direct-access-gate.test.tsx (Rule 1 -- would have been a dead/unused-function the moment its only caller, the WR-05 merge test block, was deleted; TS/lint would have flagged it)."
  - "Found and removed a Merge-feature contract duplicate in shared/contracts/fansubs.yaml (2 endpoint blocks + 6 type definitions) that neither 189-RESEARCH.md's inventory nor 189-05's scope covered -- that plan/summary only touched shared/contracts/openapi.yaml. fansubs.yaml is a parallel, human-readable per-feature contract doc (confirmed via git history as a long-standing sibling convention, not a generated artifact, not consumed by any Go/TS parity test found via grep) that still fully documented the deleted merge-preview/merge endpoints and all 6 MergeFansubs* types. Removed per D-11's explicit 'kein deaktiviert aber vorhanden lassen -- echtes Loeschen' mandate and the Operational Constraints' 'letzter Teil der VOLLSTAENDIGEN Entfernung' framing (Rule 2 -- completing a scope gap the plan's own file list missed, same class of fix 189-05 already made once for dangling Go model types)."

requirements-completed: [D-11]

# Metrics
duration: ~50min
completed: 2026-10-20
---

# Phase 189 Plan 07: Fansub-Gruppen-Merge Frontend-Entfernung Summary

**Completed the full-stack removal of the fansub-group-merge feature (D-11) by deleting its entire frontend surface -- wizard directory, API-client functions, 6 Merge-only types, both admin-UI entry links, and the merge-specific test blocks -- plus a sibling contract-doc duplicate in `shared/contracts/fansubs.yaml` that the phase's own research inventory had missed.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 2
- **Files modified:** 5 (+8 deleted as one directory)

## Accomplishments
- `frontend/src/app/admin/fansubs/merge/` (whole directory: `page.tsx`, `MergeWizardCards.tsx`, `MergeWizardPreviewStep.tsx`, `MergeWizardProgress.tsx`, `useMergeFansubsWizard.ts`, `fansubMergeScoring.ts`, `fansubMergeScoring.test.ts`, `MergeWizard.module.css`) deleted entirely via `git rm -r`.
- `mergeFansubsPreview`/`mergeFansubs` and their `MergeFansubsPreviewResponse`/`MergeFansubsRequest`/`MergeFansubsResponse` type imports removed from `fansubs-groups.ts`; every other export (createFansubGroup, updateFansubGroup, deleteFansubGroup, getGroupDetail, getGroupReleases, etc.) untouched.
- All 6 Merge-only interfaces (`MergeFansubsRequest`/`Result`/`Response`/`PreviewConflicts`/`PreviewResult`/`PreviewResponse`) removed from `frontend/src/types/fansub.ts` (415 -> 369 lines, well under the 450-line limit, no further split needed).
- Both dead `/admin/fansubs/merge` entry links removed from `frontend/src/app/admin/fansubs/page.tsx` ("Gruppen zusammenfuehren" top-action-bar link, "Zusammenfuehren" bulk-selection-bar link) -- "+ Neue Fansubgruppe" and "Status aendern"/"Löschen" buttons untouched.
- `direct-access-gate.test.tsx` trimmed to only its remaining, still-passing `/admin/fansubs/create` direct-access gate test (`mergeFansubs`/`mergeFansubsPreview` mocks, the `MergeFansubsPage` import, both merge-specific `it`/`describe` blocks, and the now-orphaned `mockPlatformAdmin` helper all removed) -- file stays, not deleted.
- **Scope-necessary extra fix (Rule 2):** `shared/contracts/fansubs.yaml` -- a parallel, human-readable per-feature contract document not covered by 189-05's openapi.yaml-only removal -- still fully documented the `fansub-merge-preview`/`fansub-merge` endpoints and all 6 `MergeFansubs*` types. Removed both endpoint blocks and all 6 type definitions so no contract surface anywhere still describes the deleted feature.
- Live-verified after `docker restart team4sv30-frontend`: `GET /admin/fansubs` → 200 (page renders, no dead links), `GET /admin/fansubs/merge` → genuine 404 (route no longer exists on either tier).
- Full-repo grep sweep (`MergeFansubs|mergeFansubs|fansub_merge|fansub-merge|MergeGroups|/admin/fansubs/merge` across `*.go`/`*.ts`/`*.tsx`/`*.yaml`/`*.css`/`*.sql`, excluding `.planning/`) returns **zero matches** anywhere in the active codebase.

## Task Commits

1. **Task 1: Delete merge directory + API-client functions + Merge types** - `59dfa393a` (feat) -- also includes the `shared/contracts/fansubs.yaml` fix (same removal theme, found during this task's verification sweep)
2. **Task 2: Remove admin-UI entry-point links + fix direct-access-gate.test.tsx** - `02d2eb95e` (fix)

## Files Created/Modified/Deleted
- `frontend/src/app/admin/fansubs/merge/*` (8 files, deleted) - entire merge wizard UI
- `frontend/src/lib/api/fansubs-groups.ts` - removed `mergeFansubsPreview`/`mergeFansubs` + type imports
- `frontend/src/types/fansub.ts` - removed 6 Merge-only interfaces
- `shared/contracts/fansubs.yaml` - removed 2 merge endpoint blocks + 6 Merge type definitions (scope-necessary extra fix, not in the original plan's file list)
- `frontend/src/app/admin/fansubs/page.tsx` - removed both merge entry links
- `frontend/src/app/admin/fansubs/direct-access-gate.test.tsx` - removed merge-specific mocks/import/tests + orphaned helper

## Decisions Made
- **Task sequencing gap (execution-time, not a plan error needing escalation):** the plan's own `<objective>` states "the merge page imports the very types/functions this plan deletes; they must go together" for Task 1's internal deletions, but Task 1's `<verify>` command (`npx tsc --noEmit`) could not actually pass until Task 2's `direct-access-gate.test.tsx` fix removed its `import MergeFansubsPage from "./merge/page"` line (test files are included in the project's `tsc --noEmit` scope). Resolved by performing both tasks' code edits before the first `tsc` verification run, then committing strictly along the plan's declared per-task file boundaries (not merging the commits). Both commits are individually coherent and buildable in sequence.
- **shared/contracts/fansubs.yaml (Rule 2, scope-completion):** confirmed via `git log` that this file is a long-standing sibling convention alongside `openapi.yaml` (present since early project history, independently maintained, not a generated artifact -- `yaml.safe_load` fails on both the original and edited version identically, confirming it is a documentation-style pseudo-YAML dialect, not strictly-parsed config). Grepped for any Go/TS consumer (contract-parity test files, generator scripts) referencing `fansubs.yaml` by name -- found none, so editing it carries zero runtime/test risk. Removed the Merge endpoints/types to close the gap 189-RESEARCH.md's otherwise-thorough inventory missed (it only names `shared/contracts/openapi.yaml`).
- Followed the plan's exact removal inventory otherwise (file:line precise, RESEARCH.md-verified): merge directory, API-client functions, 6 types, 2 admin-UI links, test file trim -- no other production file touched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Orphaned `mockPlatformAdmin()` test helper**
- **Found during:** Task 2, immediately after removing the merge-specific test blocks
- **Issue:** `mockPlatformAdmin()` in `direct-access-gate.test.tsx` was only ever called by the `describe("MergeFansubsPage — Abrufgrenze-Hinweis (WR-05)"...)` block this task removes. Left in place, it would be a dead/unused function.
- **Fix:** Removed the helper function entirely.
- **Files modified:** `frontend/src/app/admin/fansubs/direct-access-gate.test.tsx`
- **Verification:** `npx tsc --noEmit` clean; `docker exec team4sv30-frontend npm test -- direct-access-gate` → 1/1 pass.
- **Committed in:** `02d2eb95e`

**2. [Rule 2 - Missing critical completeness] Merge contract duplicate in `shared/contracts/fansubs.yaml`**
- **Found during:** Task 1, final grep sweep before commit
- **Issue:** A full-repo grep for `MergeFansubs|mergeFansubs|admin/fansubs/merge` (broader than the plan's frontend-source-only scope) surfaced `shared/contracts/fansubs.yaml` still containing both merge endpoint blocks and all 6 `MergeFansubs*` type definitions -- a sibling, human-readable contract doc that 189-05's `openapi.yaml`-scoped removal and 189-RESEARCH.md's file inventory both missed. Left in place, this would be exactly the "dead doc describing a deleted feature" shape D-11 explicitly forbids ("kein 'deaktiviert aber vorhanden lassen' — echtes Löschen").
- **Fix:** Removed both endpoint blocks (`fansub-merge-preview`, `fansub-merge`) and all 6 type definitions (`MergeFansubsResponse`, `MergeFansubsPreviewResponse`, `MergeFansubsRequest`, `MergeFansubsResult`, `MergeFansubsPreviewResult`, `MergeFansubsPreviewConflicts`) from `shared/contracts/fansubs.yaml`.
- **Files modified:** `shared/contracts/fansubs.yaml`
- **Verification:** Confirmed via grep that no Go/TS test or generator script consumes this file by name (zero risk of breaking a parity check); confirmed the file was never strict-YAML-parseable before or after the edit (pre-existing documentation-style dialect, not a regression); full-repo grep sweep afterward returns zero `Merge*`/`merge` matches anywhere outside `.planning/`.
- **Committed in:** `59dfa393a`

---

**Total deviations:** 2 auto-fixed (1 Rule 1 dead-code cleanup, 1 Rule 2 scope-completion gap) -- both necessary to satisfy this plan's own stated must-have ("grep-verified absence... anywhere in the codebase") and the phase's explicit "complete removal, no dangling surface" mandate (D-11).

## Issues Encountered
None beyond the two auto-fixed deviations above and the expected Task 1/Task 2 sequencing note (not a deviation -- a plan task-boundary artifact, resolved without changing scope).

## User Setup Required
None. `docker restart team4sv30-frontend` was run as required by the operational constraints before live verification.

## Verification
- `npx tsc --noEmit` clean (run after each code edit).
- `docker exec team4sv30-frontend npm test -- direct-access-gate page.test` → 34 test files, 382 tests, all pass.
- `docker exec team4sv30-frontend npm test --` (full suite, post-restart) → 395 test files passed, 1 skipped (pre-existing, unrelated `VerifiedBadge.test.tsx`), 3625 tests passed.
- Live: `GET /admin/fansubs` → 200; `GET /admin/fansubs/merge` → 404 (both tiers confirmed dead).
- Full-repo grep: `MergeFansubs|mergeFansubs|fansub_merge|fansub-merge|MergeGroups|/admin/fansubs/merge` across all source/contract file types, excluding `.planning/` → zero matches.

## D-11 Full-Removal Confirmation (backend 189-05 + frontend this plan)
- Backend: `fansub_merge.go`, `fansub_merge_test.go`, `fansub_repository_merge_core.go`, `fansub_repository_merge_duplicates.go` deleted (189-05); both routes removed from `admin_routes.go` (189-05); `openapi.yaml` merge paths/schemas removed (189-05); no permission-catalog migration was ever needed (merge was `requireAdmin`-only).
- Frontend: merge wizard directory, API-client functions, 6 types, both admin-UI entry links, merge-specific test blocks all removed (this plan).
- Contract: `openapi.yaml` (189-05) and `shared/contracts/fansubs.yaml` (this plan, scope-completion fix) both now merge-free.
- Full-repo grep confirms zero remaining references in any `.go`/`.ts`/`.tsx`/`.yaml`/`.css`/`.sql` file outside `.planning/`'s own historical phase documents.
- **Conclusion: D-11's removal is complete across backend, frontend, and both contract documents.** The pending-todo move specified in the operational constraints is authorized.

## Next Phase Readiness
This is the final plan of Phase 189. No further plans depend on this one. The pending todo `.planning/todos/pending/2026-10-19-fansub-gruppen-merge-ungeschuetzter-pfad.md` is moved to `.planning/todos/completed/` as a dedicated final commit per the operational constraints, now that full removal is confirmed.

## Self-Check: PASSED

- MISSING: frontend/src/app/admin/fansubs/merge/page.tsx (expected -- deleted by design)
- MISSING: frontend/src/app/admin/fansubs/merge/MergeWizardCards.tsx (expected -- deleted by design)
- MISSING: frontend/src/app/admin/fansubs/merge/useMergeFansubsWizard.ts (expected -- deleted by design)
- FOUND: frontend/src/lib/api/fansubs-groups.ts
- FOUND: frontend/src/types/fansub.ts
- FOUND: frontend/src/app/admin/fansubs/page.tsx
- FOUND: frontend/src/app/admin/fansubs/direct-access-gate.test.tsx
- FOUND: shared/contracts/fansubs.yaml
- FOUND commit: 59dfa393a (feat, Task 1)
- FOUND commit: 02d2eb95e (fix, Task 2)

---
*Phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg*
*Completed: 2026-10-20*
