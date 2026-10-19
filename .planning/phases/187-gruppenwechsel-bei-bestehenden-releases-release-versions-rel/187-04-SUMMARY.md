---
phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel
plan: 04
subsystem: api
tags: [go, gin, postgres, pgx, openapi, typescript, episode-versions, fansub-groups, dependents-guard]

# Dependency graph
requires:
  - phase: 187-01
    provides: "repository.EpisodeVersionRepository.GetReleaseVersionGroupDependents (DependencySummary{Credits,Media,Notes}), reused verbatim with no new SQL"
provides:
  - "models.FansubGroupDependents + EpisodeVersionEditorContext.SelectedGroupDependents (map[int64]FansubGroupDependents), admin-editor-path only"
  - "resolveEpisodeVersionSelectedGroupDependents handler helper, wired into loadEpisodeVersionEditorContext only"
  - "shared/contracts/openapi.yaml FansubGroupDependents schema + EpisodeVersionEditorContext.selected_group_dependents"
  - "frontend/src/types/episodeVersion.ts FansubGroupDependents interface + EpisodeVersionEditorContext.selected_group_dependents"
affects: [187-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-selected-group dependents breakdown computed via N calls to the existing single-pair guard function, no new batched SQL — N is bounded by the small number of fansub groups a release version can realistically have"

key-files:
  created:
    - backend/internal/handlers/admin_content_episode_version_editor_context_dependents_test.go
  modified:
    - backend/internal/models/episode_version.go
    - backend/internal/handlers/admin_content_episode_version_editor_helpers.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/episodeVersion.ts

key-decisions:
  - "A zero-dependents selected group is always included in the response map with all-zero counts, never omitted — the explicit D-10 must-have distinguishing 'checked, removable' from 'not yet checked'"
  - "loadEpisodeVersionContributorContext is deliberately left untouched — contributors cannot edit the group field at all, so computing this breakdown for them would be wasted guard calls with no UI consumer"
  - "Test fixture adds trimmed, hand-rolled point_rules/point_ledger_entries stand-in tables (id-only / minimal columns) purely so migration 0137's FK targets resolve — no real award/reversal point-ledger rows are ever inserted, since the guard's SQL counts release_role_credit_lifecycles rows regardless of lifecycle_status, so a single 'pending' row is sufficient to prove a dependent"

requirements-completed: [D-10]

# Metrics
duration: ~25min
completed: 2026-10-19
---

# Phase 187 Plan 04: Editor-Context-Dependents-Anreicherung Summary

**GET .../editor-context now returns a per-selected-group dependents breakdown (selected_group_dependents, keyed by fansub_group_id) for the admin editor path, reusing Plan 01's guard with zero new SQL, proven by a real-Postgres handler test and kept in parity across Go/OpenAPI/TypeScript.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-19 (session start)
- **Completed:** 2026-10-19T12:05:33Z
- **Tasks:** 2/2 completed
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- `models.FansubGroupDependents` + `EpisodeVersionEditorContext.SelectedGroupDependents` (`map[int64]FansubGroupDependents`, `omitempty`) give the frontend (Plan 06) a real backend-computed data source for D-10's "chip disabled with visible reason" affordance.
- `resolveEpisodeVersionSelectedGroupDependents` loops the already-resolved `selectedGroups` and calls Plan 01's `GetReleaseVersionGroupDependents` once per group — no new SQL, no new guard logic — and is wired into `loadEpisodeVersionEditorContext` only; `loadEpisodeVersionContributorContext` is untouched since contributors cannot edit the group field (D-11).
- A new real-Postgres handler test (`TestEpisodeVersionEditorContextDependents`) additively extends the shared `openEVECFixture` (Phase-117 base) with `anime_fansub_groups`, trimmed `point_rules`/`point_ledger_entries` stand-ins, the real migration 0137 (`release_crew_snapshots`/`release_role_credit_lifecycles`), and a trimmed `release_version_media` stand-in — then seeds two selected groups (one with a `release_role_credit_lifecycles` row, one without) and proves both appear in the response, the zero-dependents one with all-zero counts (not omitted).
- A second test (`TestEpisodeVersionContributorContextOmitsGroupDependents`) proves the narrow contributor context never sets the field at all.
- `shared/contracts/openapi.yaml` gained a `FansubGroupDependents` schema plus `EpisodeVersionEditorContext.selected_group_dependents`, and `frontend/src/types/episodeVersion.ts` gained the matching `FansubGroupDependents` interface and optional `selected_group_dependents` field — contract/type parity preserved per CLAUDE.md's Data Boundaries convention.
- `go build ./...`, `go vet ./...` clean; full `internal/handlers` package re-run around the touched tests (previously-existing `TestEpisodeVersionEditorContext*` cluster) stayed green — no regression from the new helper call added to the admin editor load path.

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend — selected_group_dependents field + resolver** - `d7783013d` (feat)
2. **Task 2: Handler test + contract/type parity** - `fe64a5953` (test)

**Plan metadata:** (this commit) `docs(187-04): complete plan`

## Files Created/Modified
- `backend/internal/models/episode_version.go` - new `FansubGroupDependents` struct + `EpisodeVersionEditorContext.SelectedGroupDependents` field
- `backend/internal/handlers/admin_content_episode_version_editor_helpers.go` - `resolveEpisodeVersionSelectedGroupDependents` helper, wired into `loadEpisodeVersionEditorContext` only
- `backend/internal/handlers/admin_content_episode_version_editor_context_dependents_test.go` (new) - real-Postgres handler test proving the per-group breakdown and the contributor-context omission
- `shared/contracts/openapi.yaml` - new `FansubGroupDependents` schema + `EpisodeVersionEditorContext.selected_group_dependents`
- `frontend/src/types/episodeVersion.ts` - matching `FansubGroupDependents` interface + optional `selected_group_dependents` field

## Decisions Made
- See `key-decisions` in frontmatter above (zero-dependents inclusion, contributor-context exclusion, trimmed test-fixture stand-ins).

## Deviations from Plan

None — plan executed exactly as written. The test fixture additions (anime_fansub_groups table, trimmed point_rules/point_ledger_entries stand-ins, hand-rolled release_version_media stand-in) were explicitly specified by the plan's Task 2 `<action>` block, not discovered mid-execution deviations.

## TDD Gate Compliance

Task 2 was marked `tdd="true"`. A true RED phase was not possible here in the literal sense: Task 1 (the implementation) was committed first per the plan's own task ordering, so by the time Task 2's test was written, `selected_group_dependents` already existed and the new test passed on its first run (verified: `go test ./internal/handlers/... -run TestEpisodeVersionEditorContextDependents -v` → PASS, 0.16s). This mirrors Plan 01's own documented precedent (187-01-SUMMARY.md's "TDD Gate Compliance" section) — the plan's task split (backend field+resolver in Task 1, test+contract/type parity in Task 2) is itself a deliberate decoupling, not a violation to be worked around by artificially breaking the test. No separate `test(...)`-before-`feat(...)` RED commit exists for this plan; `feat(187-04)` (`d7783013d`) landed before `test(187-04)` (`fe64a5953`) by plan design.

## Issues Encountered
- Migration `0137_phase108_contribution_sources.up.sql` requires `point_rules`/`point_ledger_entries` as FK targets (for `release_role_credit_lifecycles.award_entry_id`/`reversal_entry_id` and the migration's own `point_rules` seed INSERT), but the Phase-117 base fixture (`openEVECFixture`) does not include the real Phase-106/107 point-foundation migrations. Resolved per the plan's own instruction to hand-roll trimmed stand-ins (not the real schema) — the guard's `countReleaseVersionGroupDependents` SQL counts `release_role_credit_lifecycles` rows unconditionally regardless of `lifecycle_status`, so a single `'pending'`-status row (no `award_entry_id`/`reversal_entry_id` required) was sufficient to prove a real dependent without needing actual point-ledger data.
- The narrow contributor-context test (`TestEpisodeVersionContributorContextOmitsGroupDependents`) needed `h.permissionSvc` wired with the existing `contributionsPermissionResolverAllowed` test double (same pattern `TestEpisodeVersionEditorContextSelectedFileAndContributor` already uses) — without it, the contributor branch's `CanForReleaseVersion` call would nil-pointer-dereference. Not a deviation from the plan (the plan's `<read_first>` pointed at this exact fixture file), just a build-out detail.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 06 (frontend chip-disable wiring) can now read `EpisodeVersionEditorContext.selected_group_dependents` directly from the existing editor-context fetch — no new endpoint, no new frontend data-fetching plumbing needed.
- No blockers identified for the remaining plans in this phase.

---
*Phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel*
*Completed: 2026-10-19*

## Self-Check: PASSED

All 6 claimed files found on disk; both claimed commit hashes (`d7783013d`, `fe64a5953`) found in git log.
