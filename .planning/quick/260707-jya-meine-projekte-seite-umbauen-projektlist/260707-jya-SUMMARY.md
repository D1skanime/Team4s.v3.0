---
phase: quick-260707-jya
plan: 01
subsystem: contributions
tags: [me-contributions, gamification, layout, progress-bar]
dependency-graph:
  requires:
    - member_profile_repository.go loadRecentContributions (SQL/model pattern reused, not modified)
  provides:
    - ListByMemberIDWithProposalFields worked/total release version counts per contribution row
    - MeAnimeContribution.worked_release_version_count / total_release_version_count
    - AnimeGroupCard per-project progress bar
  affects:
    - /me/contributions page layout order
tech-stack:
  added: []
  patterns:
    - Correlated SQL subqueries on ac.anime_id/ac.fansub_group_id mirroring the existing
      member_profile_repository.go loadRecentContributions pattern
    - Source-inspection tests (readProposalRepositorySource + strings.Contains) instead of live-DB tests
key-files:
  created: []
  modified:
    - backend/internal/repository/anime_contributions_proposal_repository.go
    - backend/internal/repository/anime_contributions_proposal_repository_test.go
    - frontend/src/types/contributions.ts
    - frontend/src/components/contributions/AnimeGroupCard.tsx
    - frontend/src/components/contributions/contributions.module.css
    - frontend/src/app/me/contributions/page.tsx
    - frontend/src/components/contributions/MyContributionsSection.tsx
decisions:
  - "Progress bar uses plain div/span with CSS (no @/components/ui primitive), matching the
    already-shipped RecentContributionsSection.tsx pattern which likewise has no progress-bar primitive."
  - "contributions.module.css introduces its own --accent-primary/--accent-success fallback
    convention instead of reusing profile.module.css's --color-primary/--color-success, to avoid
    a cross-module CSS import."
  - "worked/total values are taken from the FIRST contribution of each fansub group (not summed),
    since they are already identical for every role row of the same anime+group."
metrics:
  duration: ~25min
  completed: 2026-07-07
---

# Phase quick-260707-jya Plan 01: Meine Projekte Seite umbauen (Projektliste primär + Fortschritt) Summary

Backend now correlates worked/total release-version counts per anime+group contribution row (mirroring the proven `/me/profile` gamification query), the frontend type and `AnimeGroupCard` render a per-project progress bar, and `/me/contributions` now shows "Meine Projekte" first in both DOM order and the desktop two-column grid layout.

## What Was Built

**Task 1 (TDD, backend):** `MemberContributionWithProposalRow` gained `WorkedReleaseVersionCount int32` / `TotalReleaseVersionCount int32` (JSON: `worked_release_version_count` / `total_release_version_count`). `ListByMemberIDWithProposalFields` now selects two correlated subqueries scoped to `ac.anime_id` + `ac.fansub_group_id` of each row — exact logic copy of `member_profile_repository.go`'s `loadRecentContributions` (release_versions → release_version_groups → fansub_releases → episodes, worked = notes by member OR media uploaded by member's verified claim). RED tests written first (struct-field test + source-inspection test for required SQL fragments), confirmed failing (compile error), then implementation added to turn them GREEN.

**Task 2 (frontend types + UI):** `MeAnimeContribution` gained two optional fields `worked_release_version_count?` / `total_release_version_count?`. `AnimeGroupCard`'s `ProjectGroupEntry` gained `workedCount`/`totalCount`, populated from the first contribution of each group (not summed, since values are identical per anime+group). Added module-level `progressPercent()` / `progressLabel()` helpers (0% / "Noch keine Release-Versionen vorhanden" when total<=0, else `Math.round((worked/total)*100)` / "{worked} von {total} Release-Versionen bearbeitet"). Rendered a progress bar under the card header for single-group cards, and one bar per group under each "Projekt öffnen: {group}" button for multi-group cards. New CSS classes `.projectProgressBar` / `.projectProgressBar span` added to `contributions.module.css`, styled analogous to `profile.module.css`'s `.projectProgress` but using this file's own `--accent-primary`/`--accent-success` fallback convention (no cross-module import).

**Task 3 (layout reorder):** In `page.tsx`, `MyContributionsSection` now renders before `ContributionInbox` and `MyProposalsSection` in the `contributionsStack` div (DOM order). The desktop two-column grid CSS (`>=980px`) was updated so the projection list (now first child) keeps the wide/prominent column (`1.14fr`, spans both rows) while `ContributionInbox`/`MyProposalsSection` (now 2nd/3rd children) move to the narrower `0.86fr` secondary column. `MyContributionsSection`'s `SectionHeader` title changed from "Bestätigte Projektrollen (N Animes)" to "Meine Projekte (N)".

## Verification Results

**Backend:**
- `go build ./...` — clean
- `go test ./internal/repository/... -run "TestMemberContributionWithProposalRow_HasWorkedTotalFields|TestListByMemberIDWithProposalFields_SelectsWorkedTotalSubqueries"` — PASS
- `go test ./internal/repository/... -run "MemberContributionWithProposalRow|ListByMemberIDWithProposalFields"` — PASS (includes pre-existing episode-fields test)
- Full `go test ./internal/repository/...` — all green, no regressions
- File size: `anime_contributions_proposal_repository.go` is 430 lines (limit 450)

**Frontend:**
- `npx tsc --noEmit -p tsconfig.json` — clean, no errors
- `npx vitest run src/app/me/contributions src/components/contributions` — 9 files / 32 tests, all PASS (no test file existed for `page.tsx`/`MyContributionsSection.tsx` directly; no test needed updating since none asserted DOM order or the old section title)
- File sizes: `AnimeGroupCard.tsx` 332 lines, `page.tsx` 200 lines, `MyContributionsSection.tsx` 71 lines — all well under 450

**Not run by this executor (per constraints):** Docker rebuild/restart and live browser smoke test at `:3000` — deferred to the orchestrator per plan's `<verification>` live-smoke-test note.

## TDD Gate Compliance

Task 1 followed the RED/GREEN cycle:
- RED commit: `e374e026 test(quick-260707-jya): add failing test for worked/total release version fields` — confirmed failing via compile error before implementation
- GREEN commit: `1b06b016 feat(quick-260707-jya): worked/total release version counts per project contribution` — both new tests pass, full repository suite green

No REFACTOR commit was needed (implementation was clean on first pass).

## Deviations from Plan

None — plan executed exactly as written. Minor implementation note: the two correlated subqueries in `ListByMemberIDWithProposalFields` both alias their inner joins as `fr2`/`ep`; since each subquery is its own scope, reusing `ep` across both subqueries (while the outer query separately uses its own `ep` alias) is valid PostgreSQL and does not collide — verified by passing tests and a clean `go build`.

## Known Stubs

None. All three tasks are fully wired: backend query returns real correlated counts, frontend type carries them, and `AnimeGroupCard` renders live percentages/aria-labels sourced directly from API data (no hardcoded/mock values).

## Threat Flags

None. This plan strictly follows the `<threat_model>` already documented in the PLAN.md (T-jya-01/02/03, all `accept` disposition, no new surface introduced beyond what's already registered).

## Self-Check: PASSED

All 7 modified files verified present on disk; all 4 task commits (`e374e026`, `1b06b016`, `714117d5`, `815e1d6d`) verified present in git log.
