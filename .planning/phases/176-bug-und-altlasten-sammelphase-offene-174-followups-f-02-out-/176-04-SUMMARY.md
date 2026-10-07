---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 04
subsystem: database
tags: [postgres, pg_dump, go, anime_contributions, release_crew_snapshots, data-cleanup-decision, project-lead]

requires:
  - phase: 176-03
    provides: evidence-backed root-cause finding that F-05's "9/14 doppelte anime_contributions" observation is a release_version_id-grouping miscount, not a duplication bug; explicitly flagged open question about project_lead inheritance to release-scoped snapshots
provides:
  - "D-23 closed as 'no-cleanup-needed' -- verified-not-a-bug, backed by a zero-candidate dry-run against the live database under both a strict (confirmed-only) and broad (all-status) NULL-safe anomaly definition"
  - "A restorable pg_dump backup of anime_contributions + anime_contribution_roles taken before any destructive action"
  - "projectScopeOnlyRoleCodes (release_crew_snapshot_repository.go): project_lead no longer mirrored from the anime-wide project crew row into any release-version-scoped snapshot row (user-approved scope expansion, Option 1 'Projektleiter nur aufs Projekt', 2026-10-07)"
  - "Dead getProjectLeadRolesForVersion helper removed (no real caller existed; wiring it in would have violated the existing release-override-replaces-project-roles test invariant)"
  - "Bestandsdaten role-row cleanup: 12 project_lead entries removed from anime_contribution_roles on the 12 release-scoped rows for timer/anime1/group1 -- rows and the timer role themselves untouched"
affects: [176-04]

tech-stack:
  added: []
  patterns:
    - "Backup-then-verify-then-decide: pg_dump -F c (custom format) taken and its restorability proven via pg_restore -l (table-of-contents listing, not a full restore) before any checkpoint is presented to the user, so the decision is provably reversible regardless of outcome."
    - "Central role-exclusion set instead of scattered string checks: projectScopeOnlyRoleCodes is the single place that decides which anime_contribution_roles.role_code values are project-wide-only and must never be mirrored into a release-version-scoped snapshot row."

key-files:
  created: []
  modified:
    - backend/internal/repository/release_crew_snapshot_repository.go
    - backend/internal/repository/release_crew_snapshot_repository_test.go
    - backend/internal/repository/release_version_notes_repository.go

key-decisions:
  - "D-23 CLOSED as no-cleanup-needed: the dry-run (Task 1) found zero cleanup candidates under both the strict (confirmed-only) and broad (all-status) NULL-safe duplicate definitions. 176-03's 'miscount, not a bug' conclusion stands fully confirmed against the live database. No DELETE against anime_contributions rows was executed for the duplication question; anime_contributions total row count is unchanged (97, matching Task 1's baseline)."
  - "USER-APPROVED SCOPE EXPANSION (2026-10-07, explicit user_response quoted in resume_instructions): implemented Option 1 'Projektleiter nur aufs Projekt' from 176-03's separately flagged, NOT-decided-by-176-03 open question, as an additional item inside this plan's Task 3 -- not a separate follow-up phase, per the user's explicit instruction ('kein separater Follow-up nötig')."
  - "Chose a central Go constant (projectScopeOnlyRoleCodes map) over a new role_definitions schema column: role_definitions has no existing column suitable for a 'project-scope-only, do not inherit' marker (confirmed by reading database/migrations/0085_role_definitions_seed.up.sql and 0160's later ADD COLUMN precedent for a similar single-role special case, 'reserved'). Adding a migration for exactly one role would be a schema change disproportionate to the single-role scope the user approved; a single, clearly-named constant satisfies the task instruction's explicit 'otherwise' branch."
  - "Removed getProjectLeadRolesForVersion (dead code, zero callers, confirmed by 176-03 and re-confirmed here) instead of wiring it into GetMemberRolesForVersion: wiring it in would require merging project-wide roles back into a release's override set, which TestGetMemberRolesForVersion_ReleaseAssignmentsOverrideProjectRoles explicitly forbids ('a release assignment must fully replace, not merge with, the project-wide set'). This existing test invariant takes precedence over reviving the dead helper."
  - "No additional read-path fix was needed beyond the mirroring change itself: ListReleaseVersionMemberRoleGroupIDs already falls back to the anime-wide row (release_version_id IS NULL) for any role_code via its existing OR clause, so project_lead resolution for release-version note-contributor validation keeps working correctly once the release-scoped mirror no longer carries project_lead."
  - "Bestandsdaten role-cleanup stop condition was checked and did NOT trigger: the dry-run returned exactly 12 rows (matching the ≤12-rows expectation exactly), and all 12 target anime_contribution_roles rows belonged to anime_contributions rows that also carry the 'timer' role -- none would have been left role-less. The scoped DELETE (by exact id list, not a broad WHERE) was therefore executed."

patterns-established: []

requirements-completed: []

duration: 4h51min (Task 1: 2026-10-07T15:56:00Z; Task 3 scope-expanded close: 2026-10-07T20:47:33Z -- includes user decision wait time between Task 1 and the continuation agent's start, not continuous active execution)
completed: 2026-10-07
---

# Phase 176 Plan 04: anime_contributions Bestandsdaten-Bereinigung Decision Gate + "Projektleiter nur aufs Projekt" Summary

**D-23 closed as verified-not-a-bug (zero duplication cleanup candidates against the live database); as an explicit, user-approved scope expansion of this same plan's Task 3, `project_lead` no longer mirrors from the project-wide crew row into release-version-scoped `anime_contributions` snapshots, the dead `getProjectLeadRolesForVersion` helper was removed, and the 12 existing release-scoped `project_lead` role rows for `timer`/anime1/group1 were cleanly deleted (role entries only, leaving the `timer` role and the 12 `anime_contributions` rows themselves fully intact).**

## Performance

- **Duration:** Task 1 ~2 min (2026-10-07T15:56:00Z - 15:57:40Z); checkpoint pause for user decision; continuation agent (this summary) ~50 min active (backend code change, new real-Postgres tests, bestandsdaten cleanup, rebuild/verify, state updates)
- **Started:** 2026-10-07T15:56:00Z
- **Completed:** 2026-10-07T20:47:33Z
- **Tasks:** 3 of 3 complete (Task 2 was a blocking checkpoint, resolved by explicit user decision; Task 3 scope-expanded per explicit user authorization)
- **Files modified:** 3 (backend Go source + test files; the bestandsdaten role-row cleanup is a one-off SQL operation against the live database, not a tracked migration, per the plan's own `<files>` specification)

## Part A: D-23 Decision -- CLOSED as no-cleanup-needed

**User decision (verbatim from resume_instructions):** "no-cleanup-needed — D-23 Duplikat-Bereinigung als 'geprüft, kein Bug (Zählfehler)' schließen."

- Task 1's dry-run against the live database found **zero** cleanup candidates under both the plan-specified strict (confirmed-only) NULL-safe tuple definition and a broader all-status variant (see Task 1's original report, preserved below).
- 176-03's "miscount, not a bug" conclusion (A) is now independently corroborated twice over: once by 176-03's own investigation, once by this plan's live-database dry-run.
- **No DELETE was executed against any `anime_contributions` row for the duplication question.** `SELECT count(*) FROM anime_contributions` remains **97** -- unchanged from Task 1's baseline, confirmed again after Part B's role-only cleanup below (Part B deletes `anime_contribution_roles` rows only, never touching `anime_contributions` row count).
- The backup taken in Task 1 (`/tmp/team4s-backups/anime_contributions_backup_176_20261007_155627.dump`) remains available and was not needed for recovery, since no `anime_contributions` row was ever deleted.

### Task 1's original dry-run report (preserved verbatim for the record)

176-03's conclusion, quoted verbatim from `176-03-SUMMARY.md`:

> **Conclusion: (A)** -- the observed `anime_contributions` row pattern for member `timer` / anime 1 / fansub group 1 is the **intended "inherited release-crew snapshot" architecture working as designed**, not accidental duplication. The 174-FOLLOWUPS.md F-05 entry ("9 doppelte ... gleiche Rollen") was a **miscount**: it counted raw `anime_contributions` rows without grouping by `release_version_id`, so it mistook N legitimate release-version-scoped mirror rows for N duplicates of one logical fact.

**Query 1 (plan-specified, confirmed-only, NULL-safe tuple):**
```sql
SELECT fansub_group_id, anime_id, member_id, release_version_id,
       count(*) AS dup_count, array_agg(id ORDER BY id) AS row_ids
FROM anime_contributions
WHERE status = 'confirmed'
GROUP BY fansub_group_id, anime_id, member_id, release_version_id
HAVING count(*) > 1;
```
Result: **0 rows.**

**Query 2 (supplementary, all statuses):**
```sql
SELECT fansub_group_id, anime_id, member_id, release_version_id, status,
       count(*) AS dup_count, array_agg(id ORDER BY id) AS row_ids
FROM anime_contributions
GROUP BY fansub_group_id, anime_id, member_id, release_version_id, status
HAVING count(*) > 1;
```
Result: **0 rows.**

**Backup details (Task 1):**
- Command: `docker compose exec -T team4sv30-db pg_dump -U team4s -d team4s_v2 -t anime_contributions -t anime_contribution_roles -F c -f /tmp/anime_contributions_backup_176.dump`
- Durable host path: `/tmp/team4s-backups/anime_contributions_backup_176_20261007_155627.dump` (20,384 bytes)
- Restorability verified via `pg_restore -l` (46 TOC entries, both tables' full schema + data), without performing a destructive restore.

## Part B: "Projektleiter nur aufs Projekt" -- User-Approved Scope Expansion of Task 3

**This entire Part B is a scope addition to 176-04's Task 3, explicitly authorized by the user on 2026-10-07** (quoted from the resume_instructions `<user_response>`): *"ZUSÄTZLICH Nutzerentscheidung 2026-10-07 zur project_lead-Frage: Option 1 — 'Projektleiter nur aufs Projekt'. Bitte in Phase 176 umsetzen (als vom Nutzer freigegebene Scope-Erweiterung von 176-04 Task 3, in SUMMARY dokumentieren; kein separater Follow-up nötig)."*

This resolves the open question 176-03 explicitly flagged and declined to decide itself (176-03-SUMMARY.md, "Open question for 176-04"): *should the `project_lead` role be excluded from future release-level crew-snapshot inheritance?* The user's answer is yes, under Option 1: `project_lead` applies to the whole project only, never to one specific release/episode.

### B.1 Code change -- stop mirroring `project_lead` into release-scoped snapshots

**File:** `backend/internal/repository/release_crew_snapshot_repository.go`

- Added `projectScopeOnlyRoleCodes` -- a single, centrally-named `map[string]struct{}` constant listing anime_contribution role codes that are project-wide-only (currently: `project_lead`). Chose a Go constant over a new `role_definitions` schema column: `role_definitions` (per `database/migrations/0085_role_definitions_seed.up.sql`) has no existing column suitable for this distinction, and adding a migration for exactly one role's special case would be a disproportionate schema change for the narrow scope the user approved. This follows the task instruction's explicit fallback ("otherwise, use a single, clearly-named central constant/list").
- Added `filterOutProjectScopeOnlyRoles(roleCodes []string) []string`, a small helper that strips any excluded role_code from a role list.
- Modified `loadConfirmedProjectCrew` (the function `SeedInheritedInTx` and `SyncInheritedForProjectInTx` both call to read the mirror SOURCE -- the anime-wide confirmed project crew row, `release_version_id IS NULL`) to call `filterOutProjectScopeOnlyRoles` on each scanned row's `RoleCodes`, and to `continue` (skip) any member whose confirmed roles become empty after filtering (a member whose ONLY confirmed project role was `project_lead` is no longer mirrored into any release-scoped row at all, matching `normalizeReleaseCrewRows`'s existing zero-role-drop behavior).
- This is the ONLY code path that mirrors project-wide crew into release-scoped `anime_contributions` rows (`replaceReleaseCrewInTx`, called from `ReplaceInTx`/`SeedInheritedInTx`/`SyncInheritedForProjectInTx`) -- confirmed via `grep -rn "loadConfirmedProjectCrew("`, exactly 2 call sites, both already covered above. The anime-wide project row itself (the SOURCE, read directly via a separate query in `GetMemberRolesForVersion`'s fallback step and elsewhere) is untouched by this filter and keeps `project_lead` exactly as before.

### B.2 Dead function resolved -- removed, not wired in

**File:** `backend/internal/repository/release_version_notes_repository.go`

- `getProjectLeadRolesForVersion` (lines 358-404 before this change) had zero callers anywhere in the codebase (confirmed by 176-03 and re-confirmed here via `grep -rn "getProjectLeadRolesForVersion"`). **Removed entirely** rather than wired in, because:
  - `GetMemberRolesForVersion`'s two-step resolution (release-specific override, else anime-wide fallback) is governed by `TestGetMemberRolesForVersion_ReleaseAssignmentsOverrideProjectRoles`, which explicitly asserts `mergeMemberRolesForVersion(items, projectRoles)` must NOT appear in the source -- "a release assignment must fully replace the project-wide set", never merge. Wiring the dead helper into `GetMemberRolesForVersion` to re-inject `project_lead` would have violated this existing, deliberately-tested invariant.
  - Since B.1's mirroring fix already means release-scoped rows never carry `project_lead` going forward, `GetMemberRolesForVersion`'s step 1 (release-specific) naturally stops returning `project_lead` for a release once that release has its own crew set -- which is exactly the intended "project_lead only at project level" outcome, achieved by the data-mirroring fix alone, with no merge logic needed.
  - Added a doc comment on `GetMemberRolesForVersion` explaining this reasoning for future readers.
- `mergeMemberRolesForVersion` itself was left in place (it is pre-existing, independently dead code with no callers besides the absence-test above, and removing it was not part of this plan's authorized scope -- out-of-scope per the Deviation Rules' scope boundary).

### B.3 Read-path check -- no additional fix needed

Checked every surface that reads `project_lead` from `anime_contributions`/`anime_contribution_roles`:

- **`ListReleaseVersionMemberRoleGroupIDs`** (`release_version_notes_repository.go`): its `WHERE` clause already has `(ac.release_version_id = $1 OR (ac.release_version_id IS NULL AND ac.anime_id = ep.anime_id))` -- an OR that falls back to the anime-wide row for ANY `role_code`, including `project_lead`. Once the release-scoped branch stops matching `project_lead` (because B.1 stops mirroring it), this function automatically and correctly falls through to the anime-wide branch. **No change needed.**
- **`GetMemberRolesForVersion`** / its step-1/step-2 resolution: covered in B.2 above -- the architecture's existing "release override fully replaces project set" design means a release that defines its own crew (even one with `timer` but not `project_lead`) correctly shows no `project_lead` for that release, which is the intended behavior under Option 1.
- **Admin UI surfaces** (`AnimeContributionModal.tsx`, `AnimeReleasesCockpit.tsx`, public contributor lists) identified by 176-03 as filtering to `release_version_id IS NULL` (the anime-wide row) are unaffected -- they never read the release-scoped mirror for `project_lead` display in the first place.
- **`permissions.go`'s `RoleProjectLead`** (D-05, access-bypass role check) is a completely separate concept sourced from `fansub_group_member_roles`, not `anime_contribution_roles` -- confirmed unrelated and untouched.

No read path required a code fix beyond B.1's mirroring change itself.

### B.4 Bestandsdaten cleanup -- role rows only, stop condition checked and NOT triggered

**Dry-run (executed first, against live `team4s_v2`):**
```sql
SELECT acr.id AS role_row_id, ac.id AS contribution_id, ac.anime_id, ac.fansub_group_id, ac.member_id, ac.release_version_id
FROM anime_contribution_roles acr
JOIN anime_contributions ac ON ac.id = acr.anime_contribution_id
WHERE acr.role_code = 'project_lead'
  AND ac.release_version_id IS NOT NULL
ORDER BY ac.id;
```
Result: **exactly 12 rows** -- `acr.id` ∈ {677, 688, 699, 710, 721, 732, 743, 754, 765, 776, 787, 798}, all belonging to `timer` (`member_id=11`), `anime_id=1`, `fansub_group_id=1`, across `release_version_id` ∈ {27, 28, 29, 40, 42, 43, 44, 45, 46, 47, 48, 49}.

**Stop condition check:** verified that every one of the 12 target `anime_contributions` rows also carries the `timer` role (not just `project_lead`):
```sql
SELECT ac.id AS contribution_id, array_agg(acr.role_code ORDER BY acr.role_code) AS all_roles
FROM anime_contributions ac
JOIN anime_contribution_roles acr ON acr.anime_contribution_id = ac.id
WHERE ac.id IN (593,600,607,614,621,628,635,642,649,656,663,670)
GROUP BY ac.id ORDER BY ac.id;
```
Result: all 12 rows show `{project_lead,timer}` -- **none would be left role-less.** Row count (12) exactly matches the expected ≤12-row bound. **Stop condition did NOT trigger.** Proceeded to execute the cleanup.

**Executed DELETE (verbatim, by exact id list, not a broad WHERE):**
```sql
DELETE FROM anime_contribution_roles
WHERE id IN (677,688,699,710,721,732,743,754,765,776,787,798)
RETURNING id, anime_contribution_id, role_code;
```
Result: **DELETE 12** -- all 12 returned rows confirmed `role_code = 'project_lead'` against the exact `anime_contribution_id`s identified in the dry-run.

**Before/after verification:**
- `anime_contribution_roles` rows with `role_code='project_lead' AND anime_contributions.release_version_id IS NOT NULL`: **12 → 0**.
- `anime_contributions` total row count: **97 → 97** (unchanged -- this was a role-row deletion only, never an `anime_contributions` row deletion).
- `timer`/anime1/group1 full row set (re-queried after cleanup):

  | id  | release_version_id | roles |
  |-----|---------------------|-------|
  | 1   | NULL (project-wide) | `{project_lead,timer}` -- **unchanged, project_lead retained on the project-wide row** |
  | 334 | 41 (independent)    | `{timer}` -- unchanged (was never touched by this plan) |
  | 593, 600, 607, 614, 621, 628, 635, 642, 649, 656, 663, 670 | 27, 28, 29, 40, 42, 43, 44, 45, 46, 47, 48, 49 | `{timer}` each -- **project_lead removed, timer retained, row itself intact** |

This matches the task's exact acceptance criteria: the 12 release-scoped rows lost only their `project_lead` role entry; the rows themselves and their `timer` role are fully intact; the anime-wide project row keeps `project_lead` untouched.

### B.5 Tests (real Postgres, `backend/internal/repository/release_crew_snapshot_repository_test.go`)

Three new tests added, run against a disposable `team4s_phase117_test_*` database (via `testsupport.OpenPhase117Postgres`, the same real-Postgres convention 176-03's idempotency test already established in this file -- not source-text inspection, per CLAUDE.md's Teststil rule):

1. **`TestReleaseCrewSnapshot_ProjectLeadDoesNotMirrorToReleaseScopedRows`** -- seeds a project roster with `project_lead` + `timer`, syncs to an inherited release version, asserts the release-scoped row ends up with only `{timer}`.
2. **`TestReleaseCrewSnapshot_ProjectLeadRetainedOnProjectWideRow`** -- same seed/sync, asserts the anime-wide/project row (`release_version_id IS NULL`) retains `{project_lead, timer}` -- proving only the mirror drops it, not the source.
3. **`TestReleaseCrewSnapshot_ProjectLeadExclusionIsIdempotentAcrossRepeatedSyncs`** -- re-runs `SyncInheritedForProjectInTx` 3 times with an unchanged confirmed project crew, asserting the release-scoped row count stays at exactly 1 and its role list stays `{timer}` (no re-addition of `project_lead`, no duplication) across every repeat.

**Test run (against disposable `team4s_phase117_test_r17604`, created and dropped for this verification run):**
```
=== RUN   TestReleaseCrewSnapshot_SyncInheritedForProjectInTxIsIdempotentAcrossRepeatedCalls
--- PASS (0.11s)
=== RUN   TestReleaseCrewSnapshot_ProjectLeadDoesNotMirrorToReleaseScopedRows
--- PASS (0.10s)
=== RUN   TestReleaseCrewSnapshot_ProjectLeadRetainedOnProjectWideRow
--- PASS (0.10s)
=== RUN   TestReleaseCrewSnapshot_ProjectLeadExclusionIsIdempotentAcrossRepeatedSyncs
--- PASS (0.11s)
PASS
```
(176-03's pre-existing idempotency test continues to pass unchanged, confirming no regression.)

### B.6 Rebuild and verify

- `docker compose exec -T team4sv30-backend go build ./...` -- clean, no errors.
- `docker compose exec -T team4sv30-backend go vet ./...` -- clean, no errors.
- `docker compose exec -T team4sv30-backend go test ./internal/repository/... ./internal/handlers/... ./internal/services/...` -- the 3 new tests plus all `TestReleaseCrewSnapshot*`/`TestReleaseVersionNotes*`/`TestGetMemberRolesForVersion*` tests pass. All other failures in this run (`TestPhase134Matrix*` needing a live server on port 18093, `TestPhase137*`/`TestPhase141*` needing an unseeded `release_version_media.reorder` permission-cache action, `TestPhase136ContractParity`/public-member-profile-contract tests failing on a pre-existing duplicate YAML key at `shared/contracts/openapi.yaml:2205`, and several Jellyfin/11eyes tests needing missing fixture files under `docs/audits/2026-09-15-jellyfin12/fixtures/`) are pre-existing, unrelated to this plan's two files, and were independently reconfirmed present by 176-03's prior A/B `git stash` comparison -- not caused by this change.
- `docker compose up -d --build team4sv30-backend` -- rebuilt and restarted; `curl http://127.0.0.1:18092/health` returned `{"status":"ok"}`.

## Task Commits

Task 1 (backup + dry-run report) produced a database backup (outside git) documented in this SUMMARY -- no production code files were created or modified in Task 1 itself.

1. **Task 3 (scope-expanded, Part B code change): "Projektleiter nur aufs Projekt"** -- `6891a9e0` (feat) -- `backend/internal/repository/release_crew_snapshot_repository.go`, `backend/internal/repository/release_crew_snapshot_repository_test.go`, `backend/internal/repository/release_version_notes_repository.go`

Part A (D-23 closure, no code change) and Part B.4 (the bestandsdaten role-row cleanup, a one-off live SQL `DELETE` by exact id list, not a tracked migration per this plan's own `<files>` specification) are documented in this SUMMARY with no corresponding file commit, matching the plan's instruction that data cleanup is not a tracked migration.

**Plan metadata:** (this commit, docs -- SUMMARY.md + STATE.md + ROADMAP.md)

## Files Created/Modified

- `backend/internal/repository/release_crew_snapshot_repository.go` -- Added `projectScopeOnlyRoleCodes` + `filterOutProjectScopeOnlyRoles`; `loadConfirmedProjectCrew` now filters `project_lead` out of every row before it is mirrored into any release-version-scoped snapshot, and drops any member left with zero roles.
- `backend/internal/repository/release_crew_snapshot_repository_test.go` -- Added 3 new real-Postgres tests proving the project_lead exclusion, its idempotency, and that the project-wide row is unaffected.
- `backend/internal/repository/release_version_notes_repository.go` -- Removed the dead `getProjectLeadRolesForVersion` function; added a doc comment on `GetMemberRolesForVersion` explaining why it was removed instead of wired in.

## Decisions Made

See `key-decisions` in the frontmatter above for the full list. Summary:
- D-23 closed as no-cleanup-needed (user decision).
- Option 1 "Projektleiter nur aufs Projekt" implemented as a user-approved scope expansion of Task 3 (user decision, 2026-10-07).
- Central Go constant chosen over a new `role_definitions` schema column (executor decision, scoped to avoid a disproportionate migration for a single role).
- Dead `getProjectLeadRolesForVersion` removed rather than revived, to respect the existing release-override-replaces-project-roles test invariant (executor decision, consistent with 176-03's architecture finding).

## Deviations from Plan

### Auto-fixed Issues

None beyond the explicitly user-authorized scope expansion itself (Part B), which is not a deviation under the Deviation Rules (Rules 1-3 require no permission; this was explicit user authorization quoted verbatim in the resume instructions, not an executor-initiated scope change).

---

**Total deviations:** 0 unauthorized; 1 explicitly user-approved scope expansion (Part B, documented in full above).
**Impact on plan:** Part B closes 176-03's one remaining open question within this same collection phase instead of deferring it to a separate follow-up phase, per the user's explicit instruction.

## Issues Encountered

- The disposable `team4s_phase117_test_*` Postgres database required for the new real-Postgres tests needed creating and dropping manually (`CREATE DATABASE team4s_phase117_test_r17604` / `DROP DATABASE ...` against `team4sv30-db`), since no pre-existing disposable DB was reserved for this plan. Resolved without touching `team4s_v2` or any other live database; the disposable DB was dropped immediately after the verification test run completed.
- The DSN password in `TEAM4S_PHASE117_TEST_DSN` initially used the wrong credential (`team4s:team4s`) -- corrected to the real `DATABASE_URL` credential (`team4s:team4s_dev_password`, read from the running backend container's environment) on the second attempt. No impact on test correctness, both test runs skipped cleanly up to that point rather than running against the wrong assumption.

## Next Phase Readiness

- 176-04 is fully closed: D-23 resolved, and 176-03's flagged open `project_lead` question resolved within the same plan per explicit user authorization. No further follow-up phase is needed for either item.
- The backup at `/tmp/team4s-backups/anime_contributions_backup_176_20261007_155627.dump` remains available for reference but was not needed for any rollback in this plan.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: 2026-10-07*

## Self-Check: PASSED

- FOUND: `backend/internal/repository/release_crew_snapshot_repository.go`
- FOUND: `backend/internal/repository/release_crew_snapshot_repository_test.go`
- FOUND: `backend/internal/repository/release_version_notes_repository.go`
- FOUND commit: `6891a9e0`
- FOUND: `/tmp/team4s-backups/anime_contributions_backup_176_20261007_155627.dump`
