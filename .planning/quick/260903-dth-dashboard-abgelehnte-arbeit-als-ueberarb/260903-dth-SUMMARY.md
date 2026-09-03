---
phase: quick-260903-dth
plan: 01
subsystem: api
tags: [postgres, pgx, gin, nextjs, react, vitest, dashboard]

# Dependency graph
requires:
  - phase: quick-260903-czh
    provides: has_own_release_work CASE expression excluding rejected note/media rows (this plan's SQL sits directly beside it)
provides:
  - has_own_rejected_notes/has_own_rejected_media columns on ListByMemberIDWithProposalFields
  - MeAnimeContribution TS type carrying the two new optional flags
  - filterAttentionContributions keeping rejected-own-work contributions visible
  - AttentionProjectGroup.hasOwnRejectedWork
  - "Überarbeitung nötig" Badge in AttentionSection.tsx, prioritized over "Neu"
affects: [dashboard, member-contributions, release-review]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-row rejected-work EXISTS subqueries wrapped in CASE WHEN ac.release_version_id IS NULL THEN false ELSE (...) END, mirroring has_own_release_work's existing guard"

key-files:
  created:
    - backend/internal/repository/anime_contributions_proposal_member_repository_has_own_rejected_test.go
  modified:
    - backend/internal/repository/anime_contributions_proposal_member_repository.go
    - frontend/src/types/contributions.ts
    - frontend/src/app/me/dashboard/components/attentionHelpers.ts
    - frontend/src/app/me/dashboard/components/attentionHelpers.test.ts
    - frontend/src/app/me/dashboard/components/AttentionSection.tsx
    - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx

key-decisions:
  - "shared/contracts/openapi.yaml re-checked and confirmed to still have no schema for MeAnimeContribution or GET /api/v1/me/anime-contributions -- left untouched, matching quick task 260903-czh's prior finding on the same struct"

patterns-established:
  - "Rejected-own-work visibility signal is independent of has_own_release_work: a contribution can be both 'has own release work' (true) and 'has own rejected work needing revision' (true) at the same time -- the dashboard filter now keeps such items visible instead of treating has_own_release_work as an exclusive done/not-done flag"

requirements-completed: [QUICK-260903-DTH-01]

# Metrics
duration: 5min
completed: 2026-09-03
---

# Quick Task 260903-dth: Dashboard "Abgelehnte Arbeit" als "Überarbeitung nötig" Summary

**Two new server-computed rejected-work flags (has_own_rejected_notes/has_own_rejected_media) on the member proposal listing, wired into a frontend filter and an "Überarbeitung nötig" Badge, so a rejected note or media upload stays visible in the dashboard even when other own work on the same release version is already confirmed.**

## Performance

- **Duration:** ~5 min (wall-clock across the 3-task sequence; timestamps below are commit-to-commit)
- **Started:** 2026-09-03T10:07:48Z (first commit)
- **Completed:** 2026-09-03T10:10:28Z (live measurement)
- **Tasks:** 3/3 completed
- **Files modified:** 6 (1 new test file, 5 modified)

## Accomplishments
- `ListByMemberIDWithProposalFields` now exposes `has_own_rejected_notes`/`has_own_rejected_media`, computed per release-scoped contribution row via the same EXISTS pattern already shipped in the sibling `listMemberProjectReleaseVersions` query
- 6 new real-Postgres regression tests prove both flags independently across rejected/confirmed/pending states, plus the exact combined confirmed-note + rejected-media scenario that previously hid the item
- `filterAttentionContributions` no longer unconditionally drops a contribution with `has_own_release_work=true` -- it keeps it visible when rejected own work exists
- `AttentionSection.tsx` renders a `Badge variant="danger"` reading "Überarbeitung nötig" (real umlaut) for such groups, taking priority over the "Neu" badge, using only `@/components/ui` primitives
- Live-measured on the redeployed backend: for app_user 4 / member 5 / release_version 48, `has_own_release_work=true` AND `has_own_rejected_media=true` simultaneously -- the exact combination that previously made the item vanish entirely

## Task Commits

Each task was committed atomically (RED/GREEN TDD pairs):

1. **Task 1: Add has_own_rejected_notes/has_own_rejected_media to ListByMemberIDWithProposalFields**
   - `e291067d` (test): failing regression tests, confirmed RED (compile failure)
   - `8c910c67` (feat): SQL/struct/scan changes + TS type, all 6 new tests GREEN
2. **Task 2: Stop hiding rejected-own-work contributions and label them "Überarbeitung nötig"**
   - `b69d254c` (test): failing frontend tests, confirmed RED (6 failures)
   - `3f4ca6b1` (feat): filter/group/badge changes, all 27 tests GREEN
3. **Task 3: Redeploy and measure the live fix** -- verification-only, no code changes, no commit (backend rebuilt via `docker compose up -d --build team4sv30-backend`, frontend restarted via `docker restart team4sv30-frontend`)

**Plan metadata:** committed separately by the orchestrator (this SUMMARY.md + STATE.md + ROADMAP.md not committed by the executor per constraints)

## Files Created/Modified
- `backend/internal/repository/anime_contributions_proposal_member_repository.go` - Two new CASE/EXISTS columns (has_own_rejected_notes, has_own_rejected_media) added to `ListByMemberIDWithProposalFields`'s SQL, `MemberContributionWithProposalRow` struct, and `rows.Scan(...)` call
- `backend/internal/repository/anime_contributions_proposal_member_repository_has_own_rejected_test.go` - New file, 6 real-Postgres regression tests (rejected note, confirmed note, pending note, rejected media, confirmed media, combined confirmed-note+rejected-media)
- `frontend/src/types/contributions.ts` - `has_own_rejected_notes?`/`has_own_rejected_media?: boolean` added to `MeAnimeContribution`
- `frontend/src/app/me/dashboard/components/attentionHelpers.ts` - `filterAttentionContributions` keeps rejected-own-work contributions; `AttentionProjectGroup.hasOwnRejectedWork` added and computed in `groupAttentionContributions`
- `frontend/src/app/me/dashboard/components/attentionHelpers.test.ts` - New `filterAttentionContributions` describe block (3 cases) + 2 new `groupAttentionContributions` cases for `hasOwnRejectedWork`
- `frontend/src/app/me/dashboard/components/AttentionSection.tsx` - Badge selection: `hasOwnRejectedWork` renders "Überarbeitung nötig" (danger variant) with priority over the "Neu" badge
- `frontend/src/app/me/dashboard/components/AttentionSection.test.tsx` - 2 new cases: badge renders and stays clickable via `resolveWorkspaceHref`; badge precedence over "Neu"

## Decisions Made
- `shared/contracts/openapi.yaml` was re-checked (grep for `MeAnimeContribution` and `/api/v1/me/anime-contributions`) at execution time as instructed by the plan. Confirmed absent -- no schema exists for this struct or endpoint, matching quick task 260903-czh's prior finding on the exact same struct. No new schema was invented; left untouched.

## Deviations from Plan

None - plan executed exactly as written. All SQL/struct/scan changes, frontend filter/group/badge changes, and the Task 3 live measurement match the plan's `<action>`/`<done>` blocks verbatim.

## Issues Encountered

None.

## Live Verification (Task 3) - Measured Proof

**Pre-check (before rebuild), read-only SELECT against `release_version_media_review_lifecycle` for `release_version_media_id = 11`:**

```
 id | release_version_media_id | review_state | source_revision
----+---------------------------+---------------+-----------------
 11 |                        11 | rejected      |               4
```

**Backend rebuilt and restarted:** `docker compose up -d --build team4sv30-backend` (container recreated, `/health` returned `{"status":"ok"}`, route table logged including `GET /api/v1/me/anime-contributions`). **Frontend restarted:** `docker restart team4sv30-frontend` (container back up within 8s).

**Source data confirmed for app_user 4 / member 5 / release_version 48 (anime_contributions.id = 319):**
- `release_version_notes`: note 23, `release_version_id=48`, `member_id=5`, lifecycle `review_state='confirmed'`
- `release_version_media`: media 11, `release_version_id=48`, `uploaded_by_user_id=4`, lifecycle `review_state='rejected'`
- `member_claims`: `member_id=5` / `app_user_id=4`, `claim_status='verified'`

**Measured result** (read-only SELECT reproducing the exact, now-shipped CASE expressions from the rebuilt query, run against `team4sv30-db` for `anime_contributions.id = 319`):

```
 contribution_id | has_own_release_work | has_own_rejected_notes | has_own_rejected_media
------------------+-----------------------+-------------------------+-------------------------
              319 | t                     | f                       | t
```

`has_own_release_work=true` AND `has_own_rejected_media=true` simultaneously, as required -- this is the exact combination that previously hid the item entirely (has_own_release_work=true unconditionally dropped it) and now surfaces it as "Überarbeitung nötig".

**Post-check (after rebuild), read-only SELECT against `release_version_media_review_lifecycle` for `release_version_media_id = 11`:**

```
 id | release_version_media_id | review_state | source_revision
----+---------------------------+---------------+-----------------
 11 |                        11 | rejected      |               4
```

Identical to the pre-check. No `UPDATE`/`DELETE`/`INSERT` was ever issued against `release_version_media` id 11, its lifecycle row, or any `release_version_id=48` row throughout this task -- every database interaction in Task 3 was a read-only `SELECT`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The dashboard "Achtung" section now correctly distinguishes "confirmed and done" from "confirmed alongside still-rejected work needing revision" for release-scoped contributions.
- `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` (the project-list "Erledigt" view) was explicitly untouched per plan scope -- confirmed via `git status` (not in the modified-files list) and not referenced by any code change in this plan.
- No known stubs or threat-surface additions beyond what's already covered by this plan's own threat model (all four STRIDE entries dispositioned `mitigate`/`accept` in the plan itself).

---
*Quick task: 260903-dth*
*Completed: 2026-09-03*

## Self-Check: PASSED

All 8 created/modified files confirmed present on disk; all 4 task commit hashes (e291067d, 8c910c67, b69d254c, 3f4ca6b1) confirmed present in `git log`. `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx` confirmed untouched (not in `git diff --name-only` for that path).
