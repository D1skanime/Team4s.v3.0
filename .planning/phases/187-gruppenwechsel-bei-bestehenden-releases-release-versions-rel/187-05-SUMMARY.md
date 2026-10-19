---
phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel
plan: 05
subsystem: database
tags: [go, pgx, postgres, release-versions, fansub-groups, episode-import, api-contracts, typescript]

# Dependency graph
requires:
  - phase: 187-03
    provides: "episode_import_repository_release_groups.go: upsertReleaseVersionGroup (guard-wired), returning ErrGroupHasDependents/GroupHasDependentsError and ErrReleaseVersionGroupsEmpty for import-path group writes"
provides:
  - "episode_import_repository_apply.go: per-mapping errors.As(err, &GroupHasDependentsError{})/errors.Is(err, ErrReleaseVersionGroupsEmpty) catch -> Conflicts++/ConflictDetails append/continue; every other error still hard-aborts the whole apply transaction unchanged"
  - "models.EpisodeImportApplyConflict (media_item_id/media_source_id/reason) + EpisodeImportApplyResult.ConflictDetails, mirrored identically in admin-content.yaml, openapi.yaml, and frontend/src/types/episodeImport.ts"
  - "D-12 Pruefauftrag finding: existing-release recognition during import apply is exclusively via an already-linked Jellyfin stream_sources/release_streams row for the exact media_item_id, documented as a code comment and in this SUMMARY's Finding section -- not changed"
affects: [187-06, 187-07, 187-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Apply-loop per-row continuation: a guard sentinel error from a pre-check (SELECT-only, before any DELETE/INSERT for that mapping) is caught per-row and turned into a Conflicts++/continue instead of return nil, err -- no SAVEPOINT needed because nothing was written yet for the rejected row (Pitfall 1/A2)"

key-files:
  created:
    - backend/internal/repository/episode_import_repository_apply_conflict_test.go
  modified:
    - backend/internal/models/episode_import.go
    - backend/internal/repository/episode_import_repository_apply.go
    - backend/internal/repository/episode_import_repository_release_helpers.go
    - shared/contracts/admin-content.yaml
    - shared/contracts/openapi.yaml
    - frontend/src/types/episodeImport.ts

key-decisions:
  - "Used unqualified GroupHasDependentsError/ErrReleaseVersionGroupsEmpty (not repository.-prefixed) in the apply loop's error classification, since episode_import_repository_apply.go is itself package repository -- the plan's own action text used a repository.-qualified form that would not compile in-package."
  - "Reused gap24MediaCandidate/gap24FansubGroup (existing same-package test helpers from episode_import_repository_apply_test.go) for the new conflict test's media candidates instead of hand-rolling new ones."

requirements-completed: [D-12]

# Metrics
duration: ~25min
completed: 2026-10-19
---

# Phase 187 Plan 05: Gruppenwechsel-Import-Apply-Konflikt-Fortsetzung Summary

**Ein von Plan 03s Guard abgelehntes Import-Mapping (Gruppen-Ersatz mit echten Abhängigkeiten, oder eine Leer-Gruppen-Reduktion) bricht nicht mehr den ganzen Apply-Batch ab, sondern wird als `Conflicts++`/`ConflictDetails`-Eintrag markiert, während alle anderen Zeilen normal durchlaufen (D-12).**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-19T12:07:00Z (approx.)
- **Completed:** 2026-10-19T12:18:00Z (approx.)
- **Tasks:** 2/2 completed
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- Restructured `applyReleaseNative`'s per-mapping loop (`episode_import_repository_apply.go`) to catch `errors.As(err, &GroupHasDependentsError{})` and `errors.Is(err, ErrReleaseVersionGroupsEmpty)` per row, incrementing `result.Conflicts` and appending a German `models.EpisodeImportApplyConflict` to `result.ConflictDetails`, then `continue`-ing to the next mapping instead of aborting the whole transaction -- every other error still `return nil, err`s exactly as before.
- Added `models.EpisodeImportApplyConflict` (`media_item_id`/`media_source_id`/`reason`) and `EpisodeImportApplyResult.ConflictDetails` (optional, omitempty), reusing the already-declared-but-previously-unused `Conflicts`/`EpisodeImportMappingStatusConflict` seams per 187-RESEARCH.md Pattern 3 -- no new enum value invented.
- Proved D-12's apply-loop behavior with a new real-Postgres test, `TestApplyEpisodeImportConflict` (two subtests): a 3-mapping batch where one mapping's group-replace is blocked by real dependents returns `(result, nil)` with `Conflicts == 1`, the other two mappings' create/update apply normally, and `VersionsCreated + VersionsUpdated + Skipped + Conflicts == 3`; and a single-mapping empty-group-reduction batch is likewise counted as a conflict, not a hard abort. Both subtests also assert the rejected row's original group survived unchanged in the database (nothing partially written).
- Verified RED-before-GREEN by hand: ran the new test against the pre-fix apply loop first (both subtests failed with the old hard-abort errors `fansub group 1 has dependents...` / `release version groups would become empty`), then applied the loop restructuring and confirmed both subtests pass.
- Confirmed the existing regression guarantee (a non-guard error still hard-aborts the whole batch) via the pre-existing, unmodified `TestEpisodeImportSourceRejectsAndRollsBack` suite (7 scenarios, all still pass) -- no new test needed for this per the plan.
- Mirrored `conflict_details`/`EpisodeImportApplyConflict` identically across `shared/contracts/admin-content.yaml`, `shared/contracts/openapi.yaml` (optional, not added to any `required` list), and `frontend/src/types/episodeImport.ts`; `cd frontend && npx tsc --noEmit` is clean.
- Both touched files (`episode_import_repository_apply.go` 390->418 lines, `episode_import_repository_release_helpers.go` 424->436 lines) stayed under the 450-line CLAUDE.md limit -- no split needed.
- Investigated and documented D-12's Prüfauftrag (see Finding below) as a code comment directly above the match query in `episode_import_repository_release_helpers.go`, without changing the lookup's behavior.

## Finding: D-12 Prüfauftrag (import existing-release recognition)

**Question asked:** does the episode import reliably recognize an existing release (same anime/episode/group/version) instead of creating a duplicate?

**Finding:** No -- recognition of an "existing release" during import apply (`upsertImportReleaseGraph`, `episode_import_repository_release_helpers.go`) happens **exclusively** via an already-linked Jellyfin `stream_sources`/`release_streams` row for the exact resolved `streamSourceID` (itself derived from `media_item_id`/`media_source_id` identity one call up, in `upsertStreamSourceSnapshot`). The query is:

```sql
SELECT rv.id, ep.anime_id
FROM stream_sources ss
JOIN release_streams rs ON rs.stream_source_id = ss.id
JOIN release_variants rv ON rv.id = rs.variant_id
JOIN release_versions rev ON rev.id=rv.release_version_id
JOIN fansub_releases fr ON fr.id=rev.release_id
JOIN episodes ep ON ep.id=fr.episode_id
WHERE ss.id = $1
ORDER BY rv.id ASC
LIMIT 1
```

It never matches on `(anime_id, episode, fansub_group_id, version)` directly -- only on the physical Jellyfin source's row. **Consequence:** a hypothetical future "Release ohne Jellyfin-Datei" (a release created without ever having a linked Jellyfin source) would NOT be recognized as "existing" by this lookup on a later import pass targeting the same anime/episode/group/version combination -- the import would create a **duplicate** release instead of updating the pre-existing one.

This is reported as a finding only, per CONTEXT.md's "Produktverhalten nie ändern, nur um Tests grün zu machen" and D-12's explicit "investigate-and-report, not silently fix" instruction. No behavior change was made to this lookup in this plan. The same finding is documented as a code comment directly above the query in `episode_import_repository_release_helpers.go`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Per-row conflict continuation in the apply loop** - `b0f6781b1` (feat)
2. **Task 2: Contract + frontend-type parity for conflict_details** - `00626a2d2` (feat)

**Plan metadata:** (this commit) `docs(187-05): complete plan`

## Files Created/Modified
- `backend/internal/repository/episode_import_repository_apply.go` - per-mapping error classification (guard sentinel -> conflict/continue; everything else -> hard abort, unchanged)
- `backend/internal/repository/episode_import_repository_release_helpers.go` - D-12 Prüfauftrag finding documented as a code comment above the existing-release match query
- `backend/internal/models/episode_import.go` - `EpisodeImportApplyConflict` struct + `EpisodeImportApplyResult.ConflictDetails` field
- `backend/internal/repository/episode_import_repository_apply_conflict_test.go` - `TestApplyEpisodeImportConflict` (2 subtests: dependents-having replace, zero-groups reduction)
- `shared/contracts/admin-content.yaml` - `conflict_details` field + `EpisodeImportApplyConflict` type block
- `shared/contracts/openapi.yaml` - `EpisodeImportApplyConflict` schema + `conflict_details` property (optional)
- `frontend/src/types/episodeImport.ts` - `EpisodeImportApplyConflict` interface + `EpisodeImportApplyResult.conflict_details?`

## Decisions Made
- Reused `GroupHasDependentsError`/`ErrReleaseVersionGroupsEmpty` unqualified (same-package reference) rather than the plan action text's `repository.`-qualified form, since `episode_import_repository_apply.go` is itself in `package repository`.
- Reused the existing `gap24MediaCandidate`/`gap24FansubGroup` test helpers (already in `episode_import_repository_apply_test.go`, same package) for the new conflict test's media candidates, per the plan's "reuse directly" instruction.

## Deviations from Plan

None - plan executed exactly as written. No file exceeded the 450-line limit, so the optional `episode_import_repository_apply_conflicts.go` split contingency was not needed.

## Issues Encountered

**Full-suite gate (`scripts/test-backend.sh`) reports `GATE: RED (1)`, but the single failure is pre-existing and unrelated to this plan.**

`TestEpisodeVersionDateEditorContextBothSurfacesAndFailure/admin=true` (`backend/internal/repository/episode_version_dates_integration_test.go`) fails with `relation "release_role_credit_lifecycles" does not exist`. This is caused by Plan 187-04's `admin_content_episode_version_editor_helpers.go:78` unconditionally calling `GetReleaseVersionGroupDependents` for every selected group in the editor-context handler, against a pre-existing fixture (`openEpisodeVersionPublicFixture`) that doesn't create that table. Confirmed pre-existing (not introduced by 187-05) by reproducing the identical failure in a throwaway git worktree checked out at `b21506aba` (the last commit before this plan started, the tip of 187-04), with none of this plan's changes applied. Full details, root cause, and a suggested (not applied) fix are in `deferred-items.md` in this phase directory. Every other test in the full suite (2302 PASS, 28 SKIP, 0 other FAIL) is green, including this plan's own two named acceptance-criteria test runs (`TestApplyEpisodeImportConflict`, full `episode_import_*`/`TestUpsertReleaseVersionGroup_GuardBehavior` regression cluster) and `go build ./...`/`go vet ./...`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plans 06/07/08 can proceed; this plan's own acceptance criteria (both named `go test` runs, `tsc --noEmit`, line-count limits) are all green.
- **Blocker flagged for whichever later 187 plan (or follow-up fix task) closes the full backend-suite gate:** `TestEpisodeVersionDateEditorContextBothSurfacesAndFailure` needs a decision (extend the dates-integration fixture with a trimmed `release_role_credit_lifecycles` stand-in, or make the dependents-enrichment call tolerate a missing-relation error) before `scripts/test-backend.sh` can report `GATE: GREEN` again. See `deferred-items.md`.

---
*Phase: 187-gruppenwechsel-bei-bestehenden-releases-release-versions-rel*
*Completed: 2026-10-19*

## Self-Check: PASSED

All 8 claimed files found on disk; both claimed commit hashes (`b0f6781b1`, `00626a2d2`) found in git log.
