---
phase: 138-effective-rights-administration-impact-ux
plan: 03
subsystem: ui
tags: [go, pgx, nextjs, react, admin-users, contributions-tab]

# Dependency graph
requires:
  - phase: 138-effective-rights-administration-impact-ux
    provides: no direct dependency (wave 1, depends_on empty) — narrowly scoped display bugfix isolated from the other 138 plans
provides:
  - "ListUserContributions returns the real business version label (release_versions.version) and episode number (episodes.episode_number) alongside the existing internal release_version_id"
  - "UserContributionsTab renders '{Anime-Titel} · Episode {N} · Version {V}' instead of a raw release_versions.id, with a safe raw-ID fallback for incomplete join data"
affects: [139-*]  # Phase 139 owns the full Beiträge grouping/range-collapse/pagination redesign this plan explicitly does not touch (D-29)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "episodes.episode_number is TEXT in the database (migration 0002), never int — mirrored as *string in Go and string | null in TypeScript, matching the existing GroupReleaseVersionOption.EpisodeNumber convention in anime_contributions_release_lookup_repository.go"

key-files:
  created:
    - backend/internal/repository/admin_users_tab_repository_test.go
    - .planning/phases/138-effective-rights-administration-impact-ux/deferred-items.md
  modified:
    - backend/internal/repository/admin_users_tab_repository.go
    - backend/internal/models/admin_users.go
    - frontend/src/types/admin-users.ts
    - frontend/src/app/admin/users/tabs/UserContributionsTab.tsx
    - frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx

key-decisions:
  - "EpisodeNumber is *string / string | null (not *int / number), because episodes.episode_number is a TEXT column in production (migration 0002), not an integer — the plan's interfaces block assumed int, which was factually wrong against the real schema."
  - "The new repository test (TestListUserContributions) is a source-inspection test (os.ReadFile + strings.Contains), matching this exact file's own established convention (TestAdminUsersRepository_MemberIDAnchor_CanonicalFirst) rather than introducing a brand-new real-Postgres harness for admin_users tests, none of which currently exists."
  - "2 pre-existing UserContributionsTab.test.tsx failures (data-role-icon undefined) are caused by Phase 136's hex-only color_key normalization making the test fixture's semantic color_key values ('creative'/'technical') resolve to neutral — confirmed present at HEAD before this plan's changes, left unfixed per scope boundary (D-29 forbids scope creep beyond the display bug)."

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-08-23
---

# Phase 138 Plan 03: Fix D-29 Beiträge-Tab raw release_version_id display bug Summary

**`ListUserContributions` now joins `release_versions`/`fansub_releases`/`episodes` to return the real business version label and episode number, and `UserContributionsTab.tsx` renders "{Anime-Titel} · Episode {N} · Version {V}" instead of the raw internal `release_versions.id`.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-23T16:51Z (session resumed after 138-02)
- **Completed:** 2026-08-23T16:57Z
- **Tasks:** 2 completed
- **Files modified:** 6 (4 modified, 2 created)

## Accomplishments
- Backend: `ListUserContributions`'s SQL extended with two additive `LEFT JOIN`s (`release_versions`, `fansub_releases`, `episodes`), selecting `rv.version` and `ep.episode_number`, both nullable and both added to `GROUP BY` to keep the existing `ARRAY_AGG` aggregation correct.
- `AdminContributionItem` gained `ReleaseVersionLabel *string` / `EpisodeNumber *string` (Go) and `release_version_label` / `episode_number` (TypeScript), both nullable.
- `UserContributionsTab.tsx` no longer ever renders `Version {release_version_id}` as the primary path — it renders the real label when complete, and falls back to the raw-ID badge only when the join legitimately can't resolve a label (never renders "Episode null · Version null").
- Closed the one D-29-scoped Beiträge-surface defect Phase 138 was authorized to touch, without pulling any of Phase 139's grouping/range-collapse/pagination redesign forward.

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend — extend ListUserContributions with the real version label + episode number** - `3c769645` (feat)
2. **Task 2: Frontend — render the real label, fix the display bug** - `01c9afa3` (fix)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `backend/internal/repository/admin_users_tab_repository.go` - `ListUserContributions` query extended with `release_versions`/`fansub_releases`/`episodes` LEFT JOINs and two new scan targets
- `backend/internal/models/admin_users.go` - `AdminContributionItem.ReleaseVersionLabel`/`.EpisodeNumber` (*string, nullable)
- `backend/internal/repository/admin_users_tab_repository_test.go` - new source-inspection regression test (`TestListUserContributions`) proving the SQL/scan wiring, plus a model-field-type regression test
- `frontend/src/types/admin-users.ts` - `AdminContributionItem.release_version_label`/`.episode_number` (string | null)
- `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` - replaced the raw `Version {item.release_version_id}` render with the real-label render + safe fallback
- `frontend/src/app/admin/users/tabs/UserContributionsTab.test.tsx` - fixture updated with the two new nullable fields; added two new tests (real-label render, incomplete-data fallback)
- `.planning/phases/138-effective-rights-administration-impact-ux/deferred-items.md` - new file logging the 2 pre-existing, out-of-scope test failures found during Task 2 verification

## Decisions Made
- `EpisodeNumber` is `*string`/`string | null`, not `*int`/`number` as the plan's interfaces block assumed — `episodes.episode_number` is a `TEXT` column in the real schema (migration 0002), confirmed by reading the migration directly and cross-checked against the existing `GroupReleaseVersionOption.EpisodeNumber string` convention already used elsewhere in the same package (`anime_contributions_release_lookup_repository.go`).
- The new repository test follows this exact file's own pre-existing convention (source-inspection via `os.ReadFile`/`strings.Contains`) rather than building a new real-Postgres harness — no such harness exists today for `admin_users` tests, and building one from scratch (migrations for `anime`, `anime_contributions`, `member_claims`, `release_versions`, `fansub_releases`, `episodes`, etc.) would itself be a scope expansion the plan's own D-29 narrowness explicitly disallows for this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `EpisodeNumber` type corrected from the plan's assumed `int`/`number` to the real `*string`/`string | null`**
- **Found during:** Task 1 (reading `episodes` table schema before writing the query)
- **Issue:** The plan's interfaces block specified `EpisodeNumber *int \`json:"episode_number"\`` (Go) and `episode_number: number | null` (TypeScript), but `episodes.episode_number` is a `TEXT` column in production (migration `0002_init_episodes.up.sql`), not an integer.
- **Fix:** Used `*string`/`string | null` throughout (Go model, repository scan, TypeScript type, and the tab's render logic), matching the codebase's own existing convention for this exact column (`GroupReleaseVersionOption.EpisodeNumber string`).
- **Files modified:** `backend/internal/models/admin_users.go`, `backend/internal/repository/admin_users_tab_repository.go`, `frontend/src/types/admin-users.ts`, `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx`
- **Verification:** `go build ./...` and the targeted repository test pass; `tsc --noEmit` reports zero errors in any touched file.
- **Committed in:** `3c769645` (Task 1), `01c9afa3` (Task 2)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type correction against real schema)
**Impact on plan:** Necessary for correctness; the plan's `int` assumption would have caused a runtime scan error against the real `TEXT` column on the very first request. No scope creep — the fix stays entirely within the two files the plan already scoped.

## Issues Encountered

`docker compose exec team4sv30-frontend npm test -- --run "UserContributionsTab"` does not exit 0: 2 of the 6 tests in `UserContributionsTab.test.tsx` fail (`data-role-icon` attribute missing/`undefined`) for reasons entirely unrelated to this plan's change. Root-caused and confirmed pre-existing by temporarily restoring the file to its pre-Plan-03 `HEAD` state and re-running the suite — identical 2 failures reproduced. Root cause: Phase 136's catalog `color_key` normalization now resolves any `color_key` value outside the exact migration-0149 hex allowlist to `neutral` (a documented Phase-136 decision, see `STATE.md`); this test file's fixture still uses pre-Phase-136 semantic `color_key` values (`'creative'`, `'technical'`) that were never updated, so `presentationForRole` now returns `neutral` for both, and the test's `[data-role-code="creative"]`/`[data-role-code="technical"]` selectors match nothing. Per the executor's scope-boundary rule ("only auto-fix issues directly caused by the current task's changes"), this was left unfixed and logged to `deferred-items.md` rather than patched — D-29 explicitly scopes this plan to the display bug only. The 4 remaining tests in the file, including both new Task-2 regression tests, pass.

`docker compose exec team4sv30-frontend npx tsc --noEmit` also does not exit 0 project-wide, but zero of its 5 errors touch any file this plan modified — all 5 are pre-existing `.next/dev/types/app/**` Next.js App Router `PageProps` generated-type errors, matching the same "pre-existing unrelated Next.js route-type errors elsewhere ignored" precedent already recorded multiple times in `STATE.md` for prior phases/plans.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

The one D-29-scoped Beiträge-tab defect Phase 138 was authorized to touch is closed. Phase 139 remains the owner of the full Beiträge grouping/range-collapse/pagination redesign (explicitly out of scope here, per D-29/`138-CONTEXT.md`). No blockers for the remaining Phase 138 plans.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED

All 8 claimed files found on disk; both task commits (`3c769645`, `01c9afa3`) found in `git log --oneline --all`.
