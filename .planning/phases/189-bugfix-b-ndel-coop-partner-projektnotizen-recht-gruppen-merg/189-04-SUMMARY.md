---
phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg
plan: 04
subsystem: api
tags: [go, gin, permissions, authz, project-roles]

# Dependency graph
requires:
  - phase: 188
    provides: "CanForAnimeProject + AnimeProjectContributionResolver (permissions_anime_project.go), the generic project-scoped permission primitive this plan reuses verbatim; requireAnimeProjectTimelineWriteAccess as the exact structural template to mirror"
provides:
  - "requireAnimeProjectNoteWriteAccess: project-scoped CanForAnimeProject guard for UpsertAnimeFansubProjectNote/DeleteAnimeFansubProjectNote, replacing the group-wide requireFansubGroupNoteWriteAccess"
  - "can_edit_project_notes: new, separate frontend-facing capability field in GetFansubGroupCapabilities, anime_id-aware, computed via CanForAnimeProject/CanForFansubGroup exactly mirroring can_edit_project_timeline"
affects: [frontend fansub-edit capability consumers (AnimeProjectNoteWorkspace / FansubEditClient), any future plan wiring can_edit_project_notes into the UI]

tech-stack:
  added: []
  patterns:
    - "Project-scoped permission guard (CanForAnimeProject) mirroring Phase 188's Timeline guard, applied verbatim to a second action (anime_fansub_project.notes.write) -- zero new permission infrastructure needed"

key-files:
  created: []
  modified:
    - backend/internal/handlers/admin_content_anime_project_notes.go
    - backend/internal/handlers/admin_content_anime_project_notes_test.go
    - backend/internal/handlers/app_auth_capabilities.go
    - backend/internal/handlers/app_auth_test.go

key-decisions:
  - "D-08: separate new can_edit_project_notes capability added; can_edit_notes (tab visibility) left completely untouched"
  - "D-09: the real observed access loss (group-wide founder/encoder only, no overlapping confirmed project role) is accepted, not compensated"
  - "D-10: role_capabilities for anime_fansub_project.notes.write is NOT extended to co_leader/founder -- no migration added in this plan"

patterns-established:
  - "Second project-scoped action wired through the same CanForAnimeProject primitive without touching permissions_anime_project.go itself -- confirms the Phase 188 primitive is genuinely action-generic as designed"

requirements-completed: [D-08, D-09, D-10]

# Metrics
duration: 35min
completed: 2026-10-20
---

# Phase 189 Plan 04: Projektnotizen-Rechteprüfung Summary

**Projektnotizen-Schreibrecht ist jetzt projektbezogen (CanForAnimeProject) statt gruppenweit (CanForFansubGroup) geprüft -- analog zur Phase-188-Projektzeitraum-Korrektur, keine Migration nötig.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-10-20T12:50:36Z (per STATE.md `last_updated` at plan start)
- **Completed:** 2026-10-20T13:03:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `requireAnimeProjectNoteWriteAccess` ersetzt die fälschlich gruppenweite `requireFansubGroupNoteWriteAccess` an den beiden einzigen Aufrufstellen (`UpsertAnimeFansubProjectNote`/`DeleteAnimeFansubProjectNote`) -- bestätigte Projektrollen aus `anime_contribution_roles` zählen jetzt für dieses Recht.
- Neue, separate Capability `can_edit_project_notes` in `GetFansubGroupCapabilities`, anime_id-abhängig berechnet (`CanForAnimeProject` mit `?anime_id=`, sonst `CanForFansubGroup`), exaktes Spiegelbild von `can_edit_project_timeline`. `can_edit_notes` (Notizen-Tab-Sichtbarkeit) bleibt unverändert.
- 5 neue Regressionstests belegen den D-08-Gewinn-Fall (bestätigte `project_lead`-Projektrolle ohne Gruppenrolle, sowohl für Upsert als auch für Delete), den D-09-Verlust-Fall (reiner `founder` ohne Projektrolle wird abgelehnt) und die neue Capability (mit/ohne `anime_id`, inkl. Regressionsschutz für `can_edit_notes`).
- Keine Migration, keine neue Permission-Infrastruktur -- `permissions.ActionAnimeFansubProjectNotesWrite` und seine `role_capabilities`-Zeilen (editor/fansub_lead/project_lead/quality_checker) existierten bereits seit Migration 0108.

## Task Commits

Each task was committed atomically:

1. **Task 1: requireAnimeProjectNoteWriteAccess + handler wiring + regression tests** - `0d7cd0578` (feat)
2. **Task 2: can_edit_project_notes capability field** - `35676725b` (feat)

_Note: Task 1's commit also includes a necessary test-fixture fix to `app_auth_test.go` (see Deviations)._

## Files Created/Modified
- `backend/internal/handlers/admin_content_anime_project_notes.go` - new `requireAnimeProjectNoteWriteAccess` guard; both call sites in `UpsertAnimeFansubProjectNote`/`DeleteAnimeFansubProjectNote` swapped from the group-wide guard
- `backend/internal/handlers/admin_content_anime_project_notes_test.go` - 3 new tests (D-08 gain case Upsert + Delete, D-09 loss case)
- `backend/internal/handlers/app_auth_capabilities.go` - new `CanEditProjectNotes` response field + anime_id-aware computation block mirroring `canEditProjectTimeline`
- `backend/internal/handlers/app_auth_test.go` - 2 new capability tests + a test-fixture fix (`RoleProjectLead`'s action list in `appAuthCapabilityCacheLoader` was missing `ActionAnimeFansubProjectNotesWrite`)

## Decisions Made
No new decisions -- D-08/D-09/D-10 were already locked in `189-CONTEXT.md` prior to this plan. This plan executed the wiring exactly as specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking test-fixture gap] `appAuthCapabilityCacheLoader`'s `RoleProjectLead` entry was missing `ActionAnimeFansubProjectNotesWrite`**
- **Found during:** Task 1 (first run of the new D-08 gain-case tests)
- **Issue:** The package-wide shared test cache loader (`app_auth_test.go`) maps `permissions.RoleProjectLead` to an explicit, narrow action list. That list already included `ActionAnimeFansubProjectTimelineUpdate` (added in Phase 188) but not `ActionAnimeFansubProjectNotesWrite`, even though the real, live `role_capabilities` table (confirmed in `189-CONTEXT.md`'s Ist-Zustand table) grants `project_lead` both actions. Without this fix, the new gain-case tests failed with a 403 (`no_membership`), which would have falsely suggested the new handler guard was broken when the guard itself was correct -- the test fixture just didn't match production's real permission catalog.
- **Fix:** Added `permissions.ActionAnimeFansubProjectNotesWrite` to the `RoleProjectLead` entry's action list in `appAuthCapabilityCacheLoader.LoadRoleCapabilities`.
- **Files modified:** `backend/internal/handlers/app_auth_test.go`
- **Verification:** All 8 `TestAnimeProjectNote*` tests and all 14 `TestGetFansubGroupCapabilities*` tests pass after the fix; re-ran both suites together with no regressions.
- **Committed in:** `0d7cd0578` (part of Task 1's commit)

---

**Total deviations:** 1 auto-fixed (Rule 3)
**Impact on plan:** Necessary for the new tests to actually prove the real production behavior (the test fixture now matches the live `role_capabilities` catalog for `project_lead`). No scope creep -- no production/handler code was touched by this fix, only a test-only fixture.

## Issues Encountered
None beyond the test-fixture gap documented above.

## User Setup Required
None - no external service configuration required.

## Verification

- `go build ./...` and `go vet ./...` clean (run inside `team4sv30-backend` container).
- `go test ./internal/handlers/... -run "TestAnimeProjectNote|TestGetFansubGroupCapabilities" -v`: all 22 tests PASS (1 pre-existing, unrelated test in a different file -- `TestUpdateAnimeFansubProjectTimelineAllowsConfirmedProjectLeadWithoutGroupRole` -- SKIPs for a missing Postgres DSN env var, as it did before this plan).
- Backend rebuilt via `docker compose up -d --build team4sv30-backend` before live verification.
- Full backend suite via `scripts/test-backend.sh`: `GATE: GREEN (0)`, exit code 0, zero `FAIL` lines across the entire run (26 throwaway databases created+dropped, no suite silently skipped for a missing DSN).
- `grep -n "requireFansubGroupNoteWriteAccess" admin_content_anime_project_notes.go` → 0 matches (confirmed fully replaced).
- `grep -n "requireAnimeProjectNoteWriteAccess" admin_content_anime_project_notes.go` → exactly 3 occurrences (1 definition + 2 call sites).
- `grep -n "can_edit_project_notes" app_auth_capabilities.go` → struct field + assignment, both present.
- `grep -c "can_edit_notes" app_auth_capabilities.go` → 2 (unchanged from before this plan).
- No migration file added or modified (confirmed via `git log --name-status` across both task commits -- D-10 satisfied).

## Next Phase Readiness
Backend D-08/D-09/D-10 wiring is complete and tested. `can_edit_project_notes` is available for the frontend to consume. Per `189-RESEARCH.md`, the remaining frontend wiring gap (`FansubEditClient.tsx`'s `canEditProjectNotes` currently conflates tab visibility with write permission, and `AnimeProjectNoteWorkspace.tsx` needs its own project-specific capability fetch) is explicitly out of this plan's scope (frontend task not listed in `189-04-PLAN.md`'s `<tasks>`) and is tracked for a later plan in this phase.

## Self-Check: PASSED

All created/modified files confirmed present on disk; both task commit hashes (`0d7cd0578`, `35676725b`) confirmed present in git history.

---
*Phase: 189-bugfix-b-ndel-coop-partner-projektnotizen-recht-gruppen-merg*
*Completed: 2026-10-20*
