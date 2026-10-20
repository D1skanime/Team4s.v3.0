---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
plan: 05
subsystem: api
tags: [go, gin, openapi, fansub-groups, removal]

# Dependency graph
requires: [189-01]
provides:
  - "Zero backend route/handler/repository surface for fansub-group merging (D-11, backend+contract half)"
  - "normalizeAliasKey preserved in fansub_repository_aliases.go for other call sites (episode import, group create, search)"
affects: [189-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Relocate-before-delete for shared helpers: when a to-be-deleted file defines a function with call sites outside it, move the function to the nearest domain-appropriate sibling file first, then delete"

key-files:
  created: []
  modified:
    - backend/cmd/server/admin_routes.go
    - backend/internal/repository/fansub_repository_aliases.go
    - backend/internal/models/fansub.go
    - backend/internal/repository/release_version_group_guard_test.go
    - shared/contracts/openapi.yaml
  deleted:
    - backend/internal/handlers/fansub_merge.go
    - backend/internal/handlers/fansub_merge_test.go
    - backend/internal/repository/fansub_repository_merge_core.go
    - backend/internal/repository/fansub_repository_merge_duplicates.go

key-decisions:
  - "normalizeAliasKey, defined inside fansub_repository_merge_core.go, is used by 4 other call sites (episode_import_repository_release_helpers.go, fansub_repository_groups.go x2, search_fansub.go) outside the merge code -- RESEARCH.md/PATTERNS.md did not flag this. Moved the function (unchanged) into fansub_repository_aliases.go, the closest alias-domain sibling, before deleting the merge-core file. No production behavior changed."
  - "Removed the now-dangling Merge-only Go model types (MergeGroupsResult, MergeGroupsPreview, MergePreviewConflicts) from internal/models/fansub.go even though RESEARCH.md/the plan's <files> list did not explicitly name this file -- they had zero remaining references after the handler/repository deletion and leaving them would be exactly the 'disabled but present' shape D-11 forbids."
  - "No permission-catalog migration added -- confirmed merge was gated only by h.requireAdmin(c), never by an Action/role_capabilities row (matches RESEARCH.md)."

requirements-completed: [D-11]

# Metrics
duration: ~25min
completed: 2026-10-20
---

# Phase 189 Plan 05: Fansub-Gruppen-Merge Backend/Contract-Entfernung Summary

**Completely deleted the fansub-group-merge handler, repository transaction, both routes, and all 6 related OpenAPI schemas/paths, preserving a shared alias-normalization helper that RESEARCH.md had not flagged as cross-used.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 8 (4 deleted, 4 modified) + 1 contract file

## Accomplishments
- `backend/internal/handlers/fansub_merge.go`/`fansub_merge_test.go` (MergeFansubs, MergeFansubsPreview, normalizeMergeSourceIDs) deleted entirely.
- `backend/internal/repository/fansub_repository_merge_core.go` (the merge transaction, `MergeGroups`/`GetMergePreview`) and `fansub_repository_merge_duplicates.go` (all 6 duplicate-detection helpers, grep-reconfirmed as called only from merge-core) deleted entirely.
- Both route registrations (`/admin/fansubs/merge`, `/admin/fansubs/merge/preview`) removed from `admin_routes.go`.
- `TestFansubRepositoryMergeCoreHasNoGuardReferences` (the self-reading absence test that `os.ReadFile`s `fansub_repository_merge_core.go` by filename) removed from `release_version_group_guard_test.go` in the SAME commit as the file deletion -- build stayed green throughout.
- All 2 merge paths and all 6 `MergeFansubs*` schemas removed from `shared/contracts/openapi.yaml`; `GroupReleaseListCursorResponse`'s `coop_groups`/`other_groups` fields (Plan 189-01) verified intact and untouched.
- No permission-catalog migration added -- the merge feature was never gated by an `Action`/`role_capabilities` row, only `h.requireAdmin(c)`.
- Live-verified after `docker compose up -d --build team4sv30-backend`: `POST /api/v1/admin/fansubs/merge` now returns a genuine `404 page not found` (route gone, not a disabled 403/501), `GET /health` still returns 200.

## Task Commits

1. **Task 1: delete merge backend files + routes + absence-test** - `498169f38` (feat)
2. **Task 2: remove merge paths/schemas from OpenAPI contract** - `97e09b86e` (docs)

_No plan-metadata commit yet -- STATE.md/ROADMAP.md updates follow this SUMMARY._

## Files Created/Modified/Deleted
- `backend/internal/handlers/fansub_merge.go` (deleted) - MergeFansubs/MergeFansubsPreview handlers
- `backend/internal/handlers/fansub_merge_test.go` (deleted) - normalizeMergeSourceIDs unit tests
- `backend/internal/repository/fansub_repository_merge_core.go` (deleted) - MergeGroups/GetMergePreview transaction
- `backend/internal/repository/fansub_repository_merge_duplicates.go` (deleted) - 6 merge-preview duplicate-detection helpers
- `backend/cmd/server/admin_routes.go` - removed 2 route registration lines
- `backend/internal/repository/release_version_group_guard_test.go` - removed the merge-core self-reading absence test (19 lines)
- `backend/internal/repository/fansub_repository_aliases.go` - gained `normalizeAliasKey` (relocated, unchanged body) so its 4 other call sites keep compiling
- `backend/internal/models/fansub.go` - removed `MergeGroupsResult`/`MergeGroupsPreview`/`MergePreviewConflicts` (dangling after handler/repo deletion)
- `shared/contracts/openapi.yaml` - removed both merge paths (248 lines total) and all 6 `MergeFansubs*` schemas

## Decisions Made
- **normalizeAliasKey relocation (blocking-issue auto-fix, Rule 3):** `fansub_repository_merge_core.go` defined `normalizeAliasKey`, but a pre-execution grep (mandated by D-11's "zuerst per grep alle Verwendungen vollstaendig auflisten" instruction, re-run at Task 1 start) showed it is also called from `episode_import_repository_release_helpers.go:325`, `fansub_repository_groups.go:83,325`, and `search_fansub.go:34`, plus exercised directly by `search_repository_test.go`. Deleting the file outright would have broken the build. Moved the function body verbatim into `fansub_repository_aliases.go` (the closest alias-domain sibling, same package) before deleting the merge files. No behavior change -- same inputs/outputs, same package, same visibility.
- **Dangling model removal (Rule 2, scope-necessary):** `internal/models/fansub.go`'s `MergeGroupsResult`/`MergeGroupsPreview`/`MergePreviewConflicts` types were not explicitly listed in the plan's `<files>`/RESEARCH.md inventory, but after the handler+repository deletion they had zero remaining references anywhere in the Go source tree (verified by grep). Per D-11's "kein 'deaktiviert aber vorhanden lassen'" rule, these were removed in the same commit rather than left as unused dead types.
- Followed the plan's exact removal inventory otherwise: 6 files/locations deleted or trimmed exactly as specified, OpenAPI paths/schemas removed exactly as the line-range inventory described (actual line numbers had drifted slightly from the plan's `~` estimates due to Plan 189-01's earlier edit to the same file, located via live grep instead of trusting the stale estimate).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `normalizeAliasKey` has call sites outside the file being deleted**
- **Found during:** Task 1, pre-deletion grep gate
- **Issue:** `fansub_repository_merge_core.go:147` defines `normalizeAliasKey`, used by 4 call sites in other files (episode import, group creation x2, search). Deleting the file as planned would have broken the build (`undefined: normalizeAliasKey`).
- **Fix:** Moved the function (unchanged) into `backend/internal/repository/fansub_repository_aliases.go`, added the now-needed `strings` import there.
- **Files modified:** `backend/internal/repository/fansub_repository_aliases.go`
- **Verification:** `go build ./...` clean, full backend suite green (`GATE: GREEN (0)`).
- **Committed in:** `498169f38`

**2. [Rule 2 - Missing critical completeness] Dangling merge-only model types**
- **Found during:** Task 1, post-deletion grep sweep
- **Issue:** `internal/models/fansub.go` still defined `MergeGroupsResult`/`MergeGroupsPreview`/`MergePreviewConflicts` after the handler/repository code that used them was deleted -- unused Go types that are exactly the "disabled but present" shape D-11 explicitly forbids.
- **Fix:** Removed all 3 types (34 lines) from `internal/models/fansub.go`.
- **Files modified:** `backend/internal/models/fansub.go`
- **Verification:** grep confirms zero remaining references anywhere in `backend/`; `go build ./...` clean.
- **Committed in:** `498169f38`

---

**Total deviations:** 2 auto-fixed (1 Rule 3 blocking-issue, 1 Rule 2 completeness) -- both necessary to execute the plan's own "complete removal, no dangling surface" objective, no product behavior changed beyond the planned removal itself.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required
None.

## Next Phase Readiness
- Plan 189-07 (frontend half of D-11: merge page/wizard, API client functions, `fansub.ts` Merge types, admin entry-point links, `direct-access-gate.test.tsx`) can now proceed -- the backend route/contract surface it would otherwise call is gone, and `GET /admin/fansubs/merge*` from the frontend will correctly 404 until 189-07 removes the frontend surface too.
- No blockers.

## Self-Check: PASSED

- MISSING: backend/internal/handlers/fansub_merge.go (expected -- deleted by design)
- MISSING: backend/internal/repository/fansub_repository_merge_core.go (expected -- deleted by design)
- MISSING: backend/internal/repository/fansub_repository_merge_duplicates.go (expected -- deleted by design)
- FOUND: backend/internal/repository/fansub_repository_aliases.go
- FOUND: backend/internal/models/fansub.go
- FOUND: backend/cmd/server/admin_routes.go
- FOUND: shared/contracts/openapi.yaml
- FOUND commit: 498169f38 (feat, Task 1)
- FOUND commit: 97e09b86e (docs, Task 2)

---
*Phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg*
*Completed: 2026-10-20*
