---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 04
subsystem: database
tags: [postgres, pg_dump, anime_contributions, data-cleanup-decision]

requires:
  - phase: 176-03
    provides: evidence-backed root-cause finding that F-05's "9/14 doppelte anime_contributions" observation is a release_version_id-grouping miscount, not a duplication bug
provides:
  - "A verified, restorable pg_dump backup of anime_contributions + anime_contribution_roles taken before any destructive action"
  - "A NULL-safe dry-run anomaly report (confirmed-only and all-status variants) proving zero true duplication cleanup candidates exist against the live database"
  - "A blocking checkpoint:decision awaiting explicit user approval between 'no-cleanup-needed' and 'execute-cleanup' for D-23"
affects: [176-04]

tech-stack:
  added: []
  patterns:
    - "Backup-then-verify-then-decide: pg_dump -F c (custom format) taken and its restorability proven via pg_restore -l (table-of-contents listing, not a full restore) before any checkpoint is presented to the user, so the decision is provably reversible regardless of outcome."

key-files:
  created: []
  modified: []

key-decisions:
  - "STATUS: PLAN PAUSED AT CHECKPOINT (Task 2) -- this SUMMARY documents Task 1 only. Task 3 (execute approved outcome) has NOT run and will be appended/finalized by a continuation agent after the user's decision is returned."
  - "Dry-run query confirms zero cleanup candidates under both the plan-specified NULL-safe tuple definition (status='confirmed' only) and a broader all-status variant -- this independently corroborates 176-03's conclusion (A) against the live database, not just against 176-03's point-in-time evidence."

patterns-established: []

requirements-completed: []

duration: 2min (Task 1 only; plan execution paused at Task 2 checkpoint)
completed: 2026-10-07
---

# Phase 176 Plan 04: anime_contributions Bestandsdaten-Bereinigung Decision Gate (Task 1 of 3 complete)

**A verified, restorable backup of `anime_contributions`/`anime_contribution_roles` now exists, and a live-database dry-run confirms zero true duplication-cleanup candidates under both a strict (confirmed-only) and broad (all-status) NULL-safe anomaly definition -- the plan is paused at Task 2's blocking checkpoint for the user's D-23 decision.**

## Performance

- **Duration (Task 1 only):** ~2 min
- **Started:** 2026-10-07T15:56:00Z
- **Completed (Task 1):** 2026-10-07T15:57:40Z
- **Tasks:** 1 of 3 complete (Task 2 is a blocking checkpoint awaiting user input; Task 3 not started)
- **Files modified:** 0 (this plan's Task 1 produces a database backup and a dry-run report, no code changes)

## Accomplishments (Task 1)

- Took a full `pg_dump -F c` (custom format) backup of `anime_contributions` and `anime_contribution_roles` from the live `team4s_v2` database running in the `team4sv30-db` container.
- Verified the backup is restorable by copying it back out of the container and listing its table-of-contents via `pg_restore -l` (46 TOC entries: both tables' schema, data, sequences, indexes, and FK constraints all present) -- without performing a destructive restore against any live database.
- Ran the plan-specified NULL-safe duplicate-detection query (`status='confirmed'` grouped by `(fansub_group_id, anime_id, member_id, release_version_id)`, `HAVING count(*) > 1`) against the live database: **zero rows returned**.
- Ran a broader supplementary check across ALL statuses (not just `confirmed`): **zero rows returned**.
- Independently re-verified 176-03's headline evidence against the live database: `timer` (member_id=11) / anime_id=1 / fansub_group_id=1 has exactly 14 rows in `anime_contributions`, matching 176-03's SUMMARY exactly.
- Baseline total row count recorded for Task 3's before/after verification: `SELECT count(*) FROM anime_contributions` = **97**.

## Backup Details

- **Command:** `docker compose exec -T team4sv30-db pg_dump -U team4s -d team4s_v2 -t anime_contributions -t anime_contribution_roles -F c -f /tmp/anime_contributions_backup_176.dump`
- **Extracted to host path:** `/tmp/team4s-backups/anime_contributions_backup_176_20261007_155627.dump`
- **File size:** 20,384 bytes
- **Verification method:** `docker compose exec -T team4sv30-db pg_restore -l /tmp/verify_backup.dump` -- confirmed 46 TOC entries covering both tables' full schema (columns, sequences, indexes, PK/FK constraints) and data sections, dumped from `team4s_v2` at `2026-10-07 15:56:27 UTC`.
- The in-container temp copy (`/tmp/anime_contributions_backup_176.dump`, `/tmp/verify_backup.dump`) was removed after extraction/verification; the host-side copy at `/tmp/team4s-backups/anime_contributions_backup_176_20261007_155627.dump` is the durable artifact for this plan.
- **Restore command (if ever needed):** `docker compose cp /tmp/team4s-backups/anime_contributions_backup_176_20261007_155627.dump team4sv30-db:/tmp/restore.dump && docker compose exec -T team4sv30-db pg_restore -U team4s -d team4s_v2 --clean --if-exists -t anime_contributions -t anime_contribution_roles /tmp/restore.dump`

## Dry-Run Anomaly Report (quoting 176-03's conclusion)

176-03's conclusion, quoted verbatim from `176-03-SUMMARY.md`:

> **Conclusion: (A)** -- the observed `anime_contributions` row pattern for member `timer` / anime 1 / fansub group 1 is the **intended "inherited release-crew snapshot" architecture working as designed**, not accidental duplication. The 174-FOLLOWUPS.md F-05 entry ("9 doppelte ... gleiche Rollen") was a **miscount**: it counted raw `anime_contributions` rows without grouping by `release_version_id`, so it mistook N legitimate release-version-scoped mirror rows for N duplicates of one logical fact.

This plan's own independently-run dry-run against the live database corroborates (A):

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

**Concrete row count of true cleanup candidates: 0 (zero), under both the strict and broad definitions.**

The `timer`/anime1/group1 case (14 rows total: 1 anime-wide + 13 release-version-scoped) was re-confirmed live and matches 176-03's evidence exactly -- these are 13 distinct `(member_id=11, anime_id=1, fansub_group_id=1, release_version_id=<13 distinct values>)` tuples, not 13 copies of one tuple, so they correctly do not trigger either duplicate query above.

**No DELETE or other destructive statement has been executed.**

## Task Commits

Task 1 produced a database backup (outside git) and this SUMMARY.md documenting its findings -- no production code files were created or modified, so there is no `files_modified` commit for Task 1 itself per the plan's `<files>none</files>` specification. This SUMMARY.md is committed as the durable record of Task 1's work (see commit below).

Task 2 (blocking checkpoint) and Task 3 (execute approved outcome) have not yet run.

## Files Created/Modified

None (database-only backup + dry-run queries; no source files touched).

## Decisions Made

- None yet by the user -- this is the artifact Task 2's checkpoint presents for the user's D-23 decision.
- Executor decision: ran both the plan-specified strict query AND a broader supplementary query to maximize confidence that "no cleanup needed" (if selected) is not an artifact of an overly narrow anomaly definition.

## Deviations from Plan

None - Task 1 executed exactly as specified. The backup command, dry-run query, and verification method all follow the plan's `<action>` and `<acceptance_criteria>` directly.

## Issues Encountered

None. `pg_restore` was not available on the host shell, so TOC verification was performed inside the `team4sv30-db` container (which has `pg_restore` from its own `postgres:16` image) -- functionally equivalent verification, no workaround needed beyond routing through the container.

## Open Item Flagged by 176-03 (informational only -- NOT part of this plan's D-23 decision)

176-03's SUMMARY separately flagged an **unrelated, unresolved product question** that this plan's checkpoint must present distinctly from the two formal D-23 options, per explicit instruction:

> Should the `project_lead` role be excluded from future release-level crew-snapshot inheritance? It currently is not excluded -- all 15 `anime_contribution`-context roles, including `project_lead`, are mirrored identically by `loadConfirmedProjectCrew`/`replaceReleaseCrewInTx`. A dead, unwired function `getProjectLeadRolesForVersion` (`backend/internal/repository/release_version_notes_repository.go:358-404`) sources `project_lead` exclusively from the anime-wide row, suggesting someone once intended special handling that was never completed or was abandoned.

176-03 explicitly recommended this NOT be bundled into this plan's D-23 duplication-cleanup decision, because the 13 release-scoped rows for `timer` (and all equivalent rows for other members) are legitimate per-release data regardless of how that separate question is answered. **This plan's dry-run report does not target any `project_lead` rows for deletion** -- doing so would be destructive and incorrect per 176-03's explicit warning. If the user wants to pursue the `project_lead`-inheritance question, it is a separate, non-blocking follow-up (either a role-filter code change or reviving `getProjectLeadRolesForVersion`), not part of this checkpoint's two options.

## Next Steps

This plan is **paused at Task 2's blocking checkpoint**. See the `CHECKPOINT REACHED` structure returned alongside this SUMMARY for the two formal decision options (`no-cleanup-needed` / `execute-cleanup`) and the separate informational `project_lead` note above. A continuation agent will resume at Task 3 once the user's decision is provided, execute exactly the approved outcome, and finalize this SUMMARY with Task 3's results, STATE.md/ROADMAP.md updates, and the plan-completion commit.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Status: PAUSED AT CHECKPOINT (Task 1 of 3 complete) -- 2026-10-07*
