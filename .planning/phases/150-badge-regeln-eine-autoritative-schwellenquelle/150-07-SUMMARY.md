---
phase: 150-badge-regeln-eine-autoritative-schwellenquelle
plan: 07
subsystem: api
tags: [go, gin, typescript, react, badges, gamification, thresholds, member-profile]

# Dependency graph
requires:
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle (Plan 01)
    provides: "badges.RoleVolume registry (badges/thresholds.go), the sole source of the bronze/silver/gold/platinum threshold numbers this plan's helper scans"
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle (Plan 05)
    provides: "resolveRoleVolumePresentation's bare-label fix (Task 3) -- this plan's Task 2 reconstruction only produces byte-identical output because that fix already landed"
provides:
  - "MemberBadge (GET /me/badges) gains a registry-derived current_threshold field, closing the seventh D-30 threshold-suffix presentation site (AchievementBadgesCard.tsx)"
  - "roleVolumeThresholdForBadgeCode: a reusable suffix-scan helper pattern in badge_repository.go, mirroring the frontend's resolveRoleVolumePresentation and Plan 150-02's dashboard repository helper"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "roleVolumeThresholdForBadgeCode(badgeCode): plain suffix-scan over the already-exported badges.RoleVolume.Tiers slice for role_volume_-prefixed codes, nil otherwise -- third occurrence of this exact pattern in the codebase (frontend resolveRoleVolumePresentation, Plan 150-02's dashboard repository, now here)"

key-files:
  created:
    - backend/internal/repository/badge_repository_test.go
  modified:
    - backend/internal/repository/badge_repository.go
    - backend/internal/handlers/member_badges_handler.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/contributions.ts
    - frontend/src/app/me/profile/components/AchievementBadgesCard.tsx
    - frontend/src/app/me/profile/components/AchievementBadgesCard.test.tsx

key-decisions:
  - "During the pre-write survivor grep (D-27/D-30 obligation), found two additional getMemberBadgePresentation consumers that render presentation.label raw without threshold-suffix reconstruction: MemberBadgeChips.tsx and MemberBadgeHighlights.tsx (both in frontend/src/components/profile/). Confirmed via repo-wide grep that neither is imported by any page, route, or test anywhere in the codebase -- they are orphaned/dead components, never rendered in production. Because they are unreachable, they are not a live 'presentation site' in the sense this phase's D-29/D-30 sites are (a rendered surface an admin/member actually sees); left unmodified and named here rather than silently left out of the record, per this plan's own instruction to name any survivor the grep finds. If either component is ever wired into a page in a future phase, it will need the same current_threshold-based reconstruction as this plan's Task 2."

requirements-completed: [SC-2, SC-8]

# Metrics
duration: ~35min
completed: 2026-09-07
---

# Phase 150 Plan 07: GET /me/badges gains current_threshold, closing the seventh D-30 site

**MemberBadge (GET /me/badges) gained a registry-derived `current_threshold` field via a suffix-scan helper over `badges.RoleVolume.Tiers`, and `AchievementBadgesCard.tsx` now reconstructs its role-volume badge label from that field exactly like the dashboard's `buildRoleVolumeRow`, closing D-30's seventh presentation site with zero remaining frontend threshold literals for role_volume presentation anywhere in the codebase.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-07T00:10:00Z (approximate)
- **Completed:** 2026-09-07T00:46:00Z
- **Tasks:** 2
- **Files modified:** 7 (6 modified + 1 created)

## Accomplishments
- `badge_repository.go`'s new `roleVolumeThresholdForBadgeCode` helper resolves a `role_volume_<roleCode>_<tier>` badge code's own tier threshold via a suffix scan over the already-exported `badges.RoleVolume.Tiers` slice (no new query, no new registry) -- correctly handling underscore-containing role codes (`quality_checker`, `raw_provider`, `project_lead`) by matching a known tier-code suffix rather than naively splitting on the last underscore, mirroring the frontend's own `resolveRoleVolumePresentation` approach.
- `MemberBadgeRow.CurrentThreshold` / `meBadgeResponse.current_threshold` are populated for every row returned by `GetMemberBadges`/`GetMyBadges`; `openapi.yaml`'s `MemberBadge` schema documents the new nullable, always-present field.
- `AchievementBadgesCard.tsx` reconstructs the suffixed role-volume label (`"<Label> · <n>+"`) from `badge.current_threshold`, identical in shape to `CategoryProgressTable.tsx`'s `buildRoleVolumeRow` -- both the visible `<strong>` text and the checkbox's `aria-label` now use the reconstructed `displayLabel` instead of the raw (now bare, per Plan 150-05) `presentation.label`.
- `MemberBadge` (frontend type) gained `current_threshold: number | null`, mirroring the backend contract field-for-field.
- A new real RTL render test proves `"Gold · 320+"` (and its checkbox `aria-label`) renders correctly for a `role_volume_translator_gold` badge with `current_threshold: 320`; a second new test confirms the `null`-current_threshold case (every badge code the live backend can currently emit) renders the bare label unchanged with no `"· null+"`/`"· undefined+"` artifact.

## Grounding Fact (carried forward from the plan, stated explicitly per its own instruction)

As of this plan's completion, **no code path in the backend persists a `role_volume_`-prefixed badge code into `member_badges`.** `services/badge_service.go`'s `ComputeAndStoreBadges` only ever upserts `founding_member`, `historical_leader`, `long_term_member`, `membership_7_years`, `membership_10_years`, `first_contribution`, `productive_bronze/silver/gold`, `all_rounder`, `verified`. Role-volume/role-entry/contribution/progress-family badges remain a live, never-persisted projection used exclusively by the public-profile response path (`loadPublicBadges`/`loadRoleVolumeBadges`), a completely different code path from `GetMyBadges`/`GetMemberBadges`.

This means **`GET /me/badges` cannot currently emit a `role_volume_`-coded row with real production data**, so this plan's fix does not close an observed live rendering bug -- it completes the `MemberBadge` contract per D-30's literal, no-exception instruction, so the field is correct and the component renders correctly the moment (if ever) a future phase persists role-volume badges into `member_badges`. No live-data UAT check was performed for this reason, consistent with the plan's own explicitly stated scope exclusion.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a registry-derived current_threshold field to GET /me/badges (MemberBadge)** - `51f1ec67` (feat)
2. **Task 2: Consume current_threshold in AchievementBadgesCard.tsx** - `195375dd` (feat)

## Files Created/Modified
- `backend/internal/repository/badge_repository.go` - added `roleVolumeThresholdForBadgeCode` helper, `MemberBadgeRow.CurrentThreshold` field, populated in `GetMemberBadges`
- `backend/internal/repository/badge_repository_test.go` (new) - four table-driven unit tests for the helper: gold-tier resolution (320), underscore-containing-role-code bronze resolution (12, `quality_checker`), nil for non-`role_volume_` codes, nil for a malformed/unknown tier suffix
- `backend/internal/handlers/member_badges_handler.go` - `meBadgeResponse.CurrentThreshold *int64 \`json:"current_threshold"\`` added and populated in `GetMyBadges`'s mapping loop, no `omitempty` (always present, null or number)
- `shared/contracts/openapi.yaml` - `MemberBadge` schema gained `current_threshold` in `required` and a documented nullable `integer`/`int64` property
- `frontend/src/types/contributions.ts` - `MemberBadge.current_threshold: number | null` added
- `frontend/src/app/me/profile/components/AchievementBadgesCard.tsx` - `displayLabel` reconstruction added immediately after `presentation`; both the `<strong>` text node and the checkbox `aria-label` now use `displayLabel` instead of raw `presentation.label`
- `frontend/src/app/me/profile/components/AchievementBadgesCard.test.tsx` - `makeBadge`'s default gained `current_threshold: null`; two new tests added (role-volume suffixed-label render, null-safe bare-label render)

## Decisions Made
See `key-decisions` in frontmatter: the survivor grep found two orphaned (never-imported, unreachable) components -- `MemberBadgeChips.tsx` and `MemberBadgeHighlights.tsx` -- that still render `getMemberBadgePresentation(...).label` raw for role_volume-coded badges. Both were confirmed dead code (no import anywhere in the repo, including tests) and left unmodified, but are named here per D-27/D-30's instruction not to silently omit a found survivor.

## Deviations from Plan

None - plan executed exactly as written. The two orphaned components found during the pre-SUMMARY survivor grep are not a deviation from the plan's task scope (the plan named exactly one site, AchievementBadgesCard.tsx, and that site is fixed); they are recorded as a transparency requirement per D-27/D-30, not as unplanned work performed.

## Issues Encountered
None. `go build ./...`, `go vet ./...`, and `go test ./internal/repository/... -run TestRoleVolumeThresholdForBadgeCode -v` all pass cleanly. The frontend `npx tsc --noEmit` run surfaced two pre-existing, out-of-scope errors in gitignored `.next/dev/types/app/.../page.ts` generated files (unrelated Next.js route-param typing issue on `anime/[id]/group/[groupId]/releases` pages) -- confirmed via grep that neither error references any file this plan touched. The full `npx vitest run` suite shows 1 pre-existing failure (`v12-projection-contract.test.ts`'s "Phase 119 additive badge_progress contract" test, confirmed identical to the failure already logged as pre-existing/out-of-scope in Plan 150-05's SUMMARY and `deferred-items.md`, unrelated to any file this plan touched) alongside 2224 passing tests (2226 after this plan's two new tests, including this plan's own `AchievementBadgesCard.test.tsx` 3/3 passing).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The seventh D-30 threshold-suffix presentation site (`AchievementBadgesCard.tsx`) is fixed, not merely documented: `GET /me/badges`'s `MemberBadge` carries a registry-derived `current_threshold`, and the component reconstructs its label from it exactly like `buildRoleVolumeRow`.
- No frontend threshold literal for role_volume presentation survives anywhere in this codebase's REACHABLE (imported/rendered) code. Two unreachable/dead components (`MemberBadgeChips.tsx`, `MemberBadgeHighlights.tsx`) still contain the older raw-`presentation.label` pattern; they are not wired into any page today and are named above for future awareness, not fixed in this plan (no reachable regression, no D-30 violation for dead code).
- Ready for Plan 150-06 (checkpoint/Live-UAT, run externally by the user, not by this executor).

---
*Phase: 150-badge-regeln-eine-autoritative-schwellenquelle*
*Completed: 2026-09-07*

## Self-Check: PASSED

All created/modified files confirmed on disk (see below); both task commits (`51f1ec67`, `195375dd`) found in git history.
