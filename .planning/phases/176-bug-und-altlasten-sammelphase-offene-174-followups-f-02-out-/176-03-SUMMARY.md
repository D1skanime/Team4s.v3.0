---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 03
subsystem: database
tags: [postgres, go, anime_contributions, release_crew_snapshots, root-cause-analysis]

requires:
  - phase: 176-02
    provides: prior wave's fixes in the same collection phase
provides:
  - "Evidence-backed root-cause finding for F-05 ('9/14 doppelte anime_contributions-Einträge für timer/Anime1/Gruppe1'): confirmed as a release_version_id-grouping miscount, not a duplication bug"
  - "Documented, regression-tested idempotency proof for replaceReleaseCrewInTx's DELETE-then-INSERT replace semantics"
  - "A scoped-out, explicitly-flagged open question for 176-04: should 'project_lead' (a project-leadership role) continue to be mirrored into every release version's inherited crew snapshot?"
affects: [176-04]

tech-stack:
  added: []
  patterns:
    - "Doc-comment-as-regression-contract: replaceReleaseCrewInTx's new doc comment names the exact test that proves its idempotency claim, so future readers don't have to re-derive it."

key-files:
  created: []
  modified:
    - backend/internal/repository/release_crew_snapshot_repository.go
    - backend/internal/repository/release_crew_snapshot_repository_test.go

key-decisions:
  - "Concluded (A): the 174-FOLLOWUPS.md F-05 finding was a miscount, not a duplication bug -- no code defect exists in the row-count mechanism, so Task 2 added hardening (doc comment + idempotency regression test) instead of fabricating an unneeded fix."
  - "Left Create/CreateOrUpdate (anime_contributions_write_repository.go / anime_contributions_upsert_repository.go) untouched -- reconfirmed zero production callers, dead code is not 'fixed'."
  - "Did NOT decide whether 'project_lead' should be excluded from release-version crew-snapshot inheritance -- flagged explicitly as an open product question for 176-04's checkpoint (Rule 4 boundary: this is a behavior/architecture question, not a duplication bug this plan was scoped to fix)."

patterns-established:
  - "Real-Postgres regression tests for release_crew_snapshot_repository.go now use testsupport.OpenPhase117Postgres with local ALTER TABLE/CREATE TABLE fixups (not OpenPhase139Postgres's full migration chain), to avoid an unrelated isolated-schema-vs-public-extension-schema gap in unaccent/pg_trgm resolution that affects fresh disposable DBs under the full migration chain."

requirements-completed: []

duration: 95min
completed: 2026-10-07
---

# Phase 176 Plan 03: anime_contributions Duplication Root-Cause Diagnosis Summary

**Confirmed via live-DB evidence that the "9/14 doppelte anime_contributions" finding (F-05) is a release_version_id-grouping miscount, not a duplication bug -- replaceReleaseCrewInTx's one-row-per-release-version mirroring is the intended inherited-crew-snapshot architecture, now documented and proven idempotent by a real-Postgres regression test; one open product question (should `project_lead` inherit to release level?) is explicitly flagged, unresolved, for 176-04.**

## Performance

- **Duration:** ~95 min
- **Started:** 2026-10-07T14:20:00Z (approx.)
- **Completed:** 2026-10-07T15:52:45Z
- **Tasks:** 2 (both complete)
- **Files modified:** 2

## Root Cause Finding

**Conclusion: (A)** -- the observed `anime_contributions` row pattern for member `timer` / anime 1 / fansub group 1 is the **intended "inherited release-crew snapshot" architecture working as designed**, not accidental duplication. The 174-FOLLOWUPS.md F-05 entry ("9 doppelte ... gleiche Rollen") was a **miscount**: it counted raw `anime_contributions` rows without grouping by `release_version_id`, so it mistook N legitimate release-version-scoped mirror rows for N duplicates of one logical fact.

### Live-DB evidence (re-run fresh, not copied from the plan)

```sql
-- timer / anime 1 / group 1: 14 rows = 1 anime-wide (id=1) + 13 release-version-scoped
 id  | release_version_id |          created_at           | created_by | updated_by |       roles
-----+--------------------+-------------------------------+------------+------------+--------------------
   1 |                    | 2026-08-29 18:48:38.79237+00  |          2 |          2 | timer,project_lead
 334 |                 41 | 2026-08-31 15:26:19.645643+00 |            |            | timer
 593 |                 27 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
 600 |                 28 | 2026-09-28 15:15:59.142566+00 |            |            | timer,project_lead
 607 |                 29 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
 614 |                 40 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
 621 |                 42 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
 628 |                 43 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
 635 |                 44 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
 642 |                 45 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
 649 |                 46 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
 656 |                 47 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
 663 |                 48 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
 670 |                 49 | 2026-09-28 15:15:59.142566+00 |            |            | project_lead,timer
```

```sql
-- systemic correlation: every anime-wide confirmed row has a matching set of
-- release-scoped confirmed rows across the WHOLE database (not just this one case)
 wide_total | wide_with_scoped_match
------------+------------------------
          7 |                      7

-- anime1/group1 has exactly 13 release_versions; 12 inherited + 1 independent
-- release_crew_snapshots rows == exactly the 13 release-scoped anime_contributions rows
 snapshot_mode | count
---------------+-------
 independent   |     1
 inherited     |    12
```

Row count growth is real and expected: anime1/group1 had 13 `release_versions` at measurement time; the original F-05 inventory (Phase 174) presumably measured against fewer release versions (reported "9") -- the row count tracks 1:1 with how many release versions exist for the project, which grows as the project releases more episodes/versions. This is not an unbounded leak; it is bounded by `release_versions` × `fansub_groups`.

### Mechanism (file:line evidence)

- `backend/internal/repository/release_crew_snapshot_repository.go:206-292` -- `replaceReleaseCrewInTx` (shared by `ReplaceInTx`/`SeedInheritedInTx`/`SyncInheritedForProjectInTx`): `DELETE FROM anime_contributions WHERE release_version_id=$1 AND fansub_group_id=$2 AND status='confirmed'` followed by one `INSERT` per crew member. This is idempotent per `release_version_id` by construction (delete-then-insert, not insert-only).
- `backend/internal/repository/release_crew_snapshot_repository.go:331-356` -- `loadConfirmedProjectCrew` reads the SOURCE: `anime_contributions WHERE anime_id=$1 AND fansub_group_id=$2 AND release_version_id IS NULL AND status='confirmed'` (the anime-wide "project crew" row, e.g. id=1 above).
- `backend/internal/repository/release_crew_snapshot_repository.go:359-426` -- `SyncInheritedForProjectInTx` fans the project crew out to **every `release_crew_snapshots` row currently in `'inherited'` mode** for that anime+group, explicitly `continue`-ing (skipping) any snapshot whose `currentMode != SnapshotModeInherited` (line ~414-416) -- this is why release_version 41 (`independent` mode, row id=334) was correctly **excluded** from the Sep-28 fan-out below, while all 12 `inherited`-mode versions were included.
- `backend/internal/repository/anime_contributions_upsert_repository.go:265-320` (`upsertProjectRosterInTx`) and `:322-379` (`patchProjectRosterInTx`) -- the actual **admin trigger**: an admin edits the project-wide crew roster (e.g. PATCHing `timer`'s project-wide role list to add `project_lead`), which updates the anime-wide row's roles/`updated_at` and, via `backend/internal/services/release_crew_service.go:150-172` (`ApplyProjectRosterMutation`, checking `result.WasConfirmed || result.IsConfirmed`), calls `SyncProjectInTx` -- fanning the change out to every inherited release version **inside the same transaction**.

**New evidence requested by the coordinator (2026-09-28 bulk timestamp), independently verified:**

The identical `created_at`/`updated_at` timestamp `2026-09-28 15:15:59.142566` across the anime-wide row (id=1) AND all 12 inherited-mode release-scoped rows is explained precisely by this mechanism, not a separate backfill script: Postgres's `NOW()` returns the **transaction start time**, constant across every statement in one transaction. `ApplyProjectRosterMutation` runs the roster update and `SyncProjectInTx`'s entire fan-out loop inside **one transaction** (`release_crew_service.go:150-172`), so every row touched in that single admin action shares one `NOW()` value. Confirmed live:

```sql
-- release_crew_snapshots.updated_at for anime1/group1's 13 release versions
 release_version_id | snapshot_mode |          created_at           |          updated_at
--------------------+---------------+-------------------------------+-------------------------------
                 27 | inherited     | 2026-08-27 09:28:08.981605+00 | 2026-09-28 15:15:59.142566+00
                 ...                                                  (11 more inherited rows, same updated_at)
                 41 | independent   | 2026-08-30 13:19:59.210324+00 | 2026-08-31 15:26:19.645643+00   -- untouched: correctly skipped
```

This is airtight confirmation that (1) the 12-row update on 2026-09-28 was ONE admin action (a project-roster mutation that added/confirmed `project_lead` for `timer`), not a backfill script, migration, or recurring job, and (2) the `SnapshotModeIndependent` skip logic worked correctly -- version 41 was deliberately left untouched because an admin had already manually overridden its crew (Aug 31) and independent snapshots are never synced from project changes by design.

### Ruled out (independently re-verified, not trusted from the plan)

- `anime_contributions_write_repository.go`'s `Create` and `anime_contributions_upsert_repository.go`'s `CreateOrUpdate`: re-ran `grep -rln "\.Create(ctx\|\.CreateOrUpdate(" backend/internal/handlers backend/internal/services | grep -v _test.go` -- **zero matches**, confirmed still dead code. Not touched by Task 2 (dead code is not "fixed").
- `fansub_default_crew_repository.go:138-171`: `WHERE NOT EXISTS` idempotent insert, only ever creates `'draft'`-status, `release_version_id IS NULL` rows when an anime has **zero** existing contributions. Cannot produce `'confirmed'` + release-version-scoped rows. Ruled out.
- `anime_contributions_proposal_repository.go:72-100` and `contributions_me_handler.go:343-368`: both set `created_by`/`updated_by` explicitly on INSERT. The observed 13 release-scoped rows all have `created_by`/`updated_by = NULL`, which does not match either path's signature. Ruled out.

## Additional finding requested by the coordinator: does any read path visually duplicate the member's credit?

Checked every surface that reads `anime_contributions` for display, with file:line evidence -- **none of them show the member's credit duplicated**:

| Surface | File:Line | Behavior |
|---|---|---|
| Admin "project crew" modal | `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx:89` | `.filter((contribution) => contribution.release_version_id == null)` -- shows only the anime-wide row |
| Admin releases cockpit | `frontend/src/app/admin/fansubs/[id]/edit/AnimeReleasesCockpit.tsx:221` | same `release_version_id == null` filter |
| Public project/group contributor list | `backend/internal/repository/group_contributors_repository.go:83` | `AND ac.release_version_id IS NULL` -- only the anime-wide row is read |
| Public member profile "previous contributions" | `backend/internal/repository/member_profile_contributions_repository.go:168-184` | `GROUP BY a.id, ..., fg.id, fg.name` -- collapses ALL of a member's rows for one (anime, group) pair into a single card, roles merged via `jsonb_agg(DISTINCT ...)` regardless of how many release-scoped rows exist underneath |

The one admin surface that DOES return every raw row unfiltered is `ListByFansubAndAnimeWithDisplay` (`backend/internal/repository/anime_contributions_repository.go:136-165`, `GET /admin/fansubs/:id/anime/:animeId/contributions`) -- but its only current frontend consumer (`useReleaseContributions.ts`) feeds exactly the two already-filtered components above. No live surface was found that renders the unfiltered list directly to a human. The original F-05 finding reads as a raw-table/SQL audit finding (consistent with Phase 174's "Altlasten-Inventur" methodology), not a reported UI bug.

## Open question for 176-04 (explicitly NOT decided here -- Rule 4 boundary)

The coordinator's hypothesis that `project_lead` (a project-leadership role) should **not** be mirrored into release-version-scoped crew snapshots is a legitimate product question this plan's scope (diagnose the row-COUNT/duplication mechanism) cannot resolve by itself:

- `role_definitions` has no schema-level distinction marking `project_lead` as "project-only, do not inherit" -- all 15 `anime_contribution`-context roles (including `project_lead`) are treated identically by `loadConfirmedProjectCrew`/`replaceReleaseCrewInTx`. There is currently no code path that filters `project_lead` out of the release-level mirror.
- However, `backend/internal/repository/release_version_notes_repository.go:358-404` defines `getProjectLeadRolesForVersion` -- a function that sources `project_lead` **exclusively** from the anime-wide row (`ac.release_version_id IS NULL`) for a given release version, treating it as conceptually project-scoped-only. **This function has zero callers anywhere in the codebase** (verified via `grep -rn "getProjectLeadRolesForVersion" backend/internal`) -- it is dead code, not wired into any active read path, so it does not currently change any behavior. Its existence suggests someone, at some point, intended `project_lead` to be handled specially, but that intent was never completed or was abandoned.

**176-04's checkpoint should present this explicitly to the user**: the 13 release-scoped rows for `timer` are NOT a duplication bug and NOT accidental -- they are legitimate per-release crew snapshots. If the user wants `project_lead` specifically excluded from future release-level mirroring (a product decision this plan does not make), that is a scoped, separate code change (filtering `loadConfirmedProjectCrew`'s role set, or reviving/wiring `getProjectLeadRolesForVersion`), not a "fix the duplicate" bestandsdaten cleanup. 176-04 should NOT delete the 12 inherited release-scoped `timer` rows wholesale -- doing so would destroy legitimate per-release crew-snapshot data for 12 real release versions. If the user confirms `project_lead` should not inherit, the precise, non-destructive remediation is: remove only the `project_lead` **role** from the 12 release-scoped rows' `anime_contribution_roles` (leaving the `timer` role and the rows themselves intact), plus a code change so the role never gets re-mirrored on the next roster sync.

## Task 2: Branch taken

**Hardening-only** (not a defect fix), per Task 1's conclusion (A):

- Added a doc comment at `replaceReleaseCrewInTx` (`backend/internal/repository/release_crew_snapshot_repository.go`) stating explicitly that one row per release version in inherited mode is intentional, citing this plan/172-CONTEXT D-02, and naming the regression test that proves the claim.
- Added `TestReleaseCrewSnapshot_SyncInheritedForProjectInTxIsIdempotentAcrossRepeatedCalls` (`backend/internal/repository/release_crew_snapshot_repository_test.go`) -- a real-Postgres behavior test (not source-text inspection) proving `SyncInheritedForProjectInTx`'s DELETE-then-INSERT replace does not grow the release-version-scoped row count across 3 repeated calls with an unchanged confirmed project crew.
- `Create`/`CreateOrUpdate` (dead code) left untouched, per plan instruction.

## Task Commits

Task 1 (diagnosis) produced no code change -- findings are in this SUMMARY per the plan's own instruction ("No code is modified in this task").

1. **Task 2: Apply the code fix (or hardening) the diagnosis supports** - `34d36ebd` (test)

**Plan metadata:** (this commit, docs)

## Files Created/Modified

- `backend/internal/repository/release_crew_snapshot_repository.go` - Added a doc comment at `replaceReleaseCrewInTx` documenting the intentional one-row-per-release-version mirroring architecture.
- `backend/internal/repository/release_crew_snapshot_repository_test.go` - Added a real-Postgres idempotency regression test plus local seed helpers (`seedReleaseCrew176*`, `prepareReleaseCrew176Schema`) built on `testsupport.OpenPhase117Postgres`.

## Decisions Made

- Concluded (A), not (B): no code defect exists in the row-duplication mechanism. Documented, not "fixed," because there was nothing to fix.
- Chose `testsupport.OpenPhase117Postgres` (minimal hand-assembled schema + local `ALTER TABLE` fixups) over `testsupport.OpenPhase139Postgres` (full real migration chain) for the new regression test, after discovering `OpenPhase139Postgres`'s fresh-disposable-DB path fails migrations 0017/0152 because `unaccent`/`pg_trgm` extension objects created unqualified install into the isolated per-test schema (the only entry in that connection's `search_path`), not `public` -- while migration `0152_f_unaccent_search_path_fix.up.sql` hardcodes `public.unaccent`. This is a pre-existing environment/fixture gap unrelated to this plan's two files, confirmed by reproducing it against two different disposable databases (a stale `team4s_phase139_test_r03` and a freshly `CREATE DATABASE`d `team4s_phase139_test_r176a`, both failing identically); fixing it would require modifying `internal/testsupport/phase139_postgres.go`, which is outside this plan's `files_modified` scope. The disposable `team4s_phase139_test_r176a` database created during this investigation was dropped again after the pivot.
- Left `getProjectLeadRolesForVersion` (dead code) untouched -- reviving/wiring it is a product decision for 176-04, not this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking, test-environment only] `unaccent`/`pg_trgm` extensions missing in reused disposable test DB**
- **Found during:** Task 2 (writing the real-Postgres regression test)
- **Issue:** The pre-existing disposable `team4s_phase139_test_r03` database was missing the `unaccent` extension entirely (a stale/under-provisioned leftover from an earlier session), causing any `OpenPhase139Postgres`-based test to fail before reaching this plan's own code.
- **Fix:** Manually ran `CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS pg_trgm;` against that disposable DB (not `team4s_v2`) to rule out a trivial missing-extension gap before diagnosing the deeper isolated-schema-vs-public-schema issue described above. No code or migration files changed; no production or `team4s_v2` data touched.
- **Files modified:** none (database-only, disposable test fixture)
- **Verification:** Confirmed the DB-level gap was real, then pivoted to `OpenPhase117Postgres` (see Decisions) once the deeper structural gap was understood.
- **Committed in:** n/a (no code change)

---

**Total deviations:** 1 auto-fixed (1 blocking, test-environment only, no code/data impact)
**Impact on plan:** None on production code or data. The real fix (switching test harness) is reflected in the committed test file.

## Issues Encountered

- `testsupport.OpenPhase139Postgres`'s full real-migration-chain approach cannot currently run cleanly against a truly fresh disposable database when `unaccent`/`pg_trgm` are not already pre-seeded into the `public` schema outside the test's isolated-schema `search_path` -- documented above as a decision, not fixed (out of this plan's file scope). Future phases using `OpenPhase139Postgres` from a cold database should budget for this; a durable fix would set `search_path` to `<isolated_schema>, public` in `internal/testsupport/phase139_postgres.go`, or pre-seed both extensions during `createPhase139Prerequisites` before running the migration chain.
- Pre-existing, unrelated test failures confirmed present with or without this plan's changes (verified via `git stash`/`git stash pop` A/B comparison): `TestPhase134Matrix*` (require a live server on port 18093 + working Keycloak test credentials, neither available in this session), `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes` / `TestPhase141Review*` (missing `release_version_media.reorder` action seed in the permission cache fixture), and ~30 other `*Postgres*`/`*Archive*`/`*Claim*` tests requiring unset `TEAM4S_PHASE*_TEST_DSN` env vars (SKIP in a normal run, surfaced as FAIL only because this session's `go test ./internal/repository/... ./internal/services/...` was run without any DSN set). None relate to this plan's two files.

## Next Phase Readiness

- 176-04 has a written, evidence-backed root-cause finding it can quote verbatim to the user, plus the explicit open question about `project_lead` inheritance to raise as a separate decision (not bundled into the duplication finding).
- No bestandsdaten cleanup is justified by "duplication" per se -- 176-04's checkpoint should be scoped to the `project_lead`-inheritance question only, if the user wants to pursue it, not a blanket row deletion.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: 2026-10-07*

## Self-Check: PASSED

- FOUND: `backend/internal/repository/release_crew_snapshot_repository.go`
- FOUND: `backend/internal/repository/release_crew_snapshot_repository_test.go`
- FOUND: `.planning/phases/176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-/176-03-SUMMARY.md`
- FOUND commit: `34d36ebd`
