---
phase: 112-member-punkt-meilenstein-badges
plan: 02
subsystem: ui
tags: [react, typescript, vitest, lucide-react, member-profile, badges]

# Dependency graph
requires:
  - phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme
    provides: memberBadgeLabels.ts catalog/presentation module, MemberBadgeGroup ('roles' group with roleCode merge), MemberBadgeChain rendering
  - phase: 109-ranglisten-und-punkteprojektionen
    provides: persisted member_point_totals / total_points on PublicMemberProfileData
provides:
  - 6 static point_milestone_* presentations in the 'progress' group (not in PUBLIC_MEMBER_BADGE_CATALOG, so no locked-chip chain)
  - deriveMilestoneBadge(totalPoints) pure function returning the single highest reached milestone or null
  - MemberBadgePalette extended with bronze/silver/platinum
  - resolveRoleVolumePresentation(badgeCode) dynamic parser for role_volume_<roleCode>_<tier> codes, wired into getMemberBadgePresentation ahead of the static map lookup
affects: [112-03-member-punkt-meilenstein-badges]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Highest-reached-step derivation: POINT_MILESTONES sorted descending, .find() on totalPoints >= threshold — mirrors the Go highestRoleVolumeTier shape (RESEARCH Don't-Hand-Roll), reused for a second badge family without inventing a second comparison style"
    - "Tier-suffix-strip parsing instead of naive split('_') for multi-underscore role codes (quality_checker, raw_provider, project_lead) inside role_volume_<roleCode>_<tier>"

key-files:
  created:
    - frontend/src/components/profile/memberBadgeLabels.test.ts
  modified:
    - frontend/src/components/profile/memberBadgeLabels.ts

key-decisions:
  - "point_milestone_* entries live ONLY in MEMBER_BADGE_PRESENTATIONS, never in PUBLIC_MEMBER_BADGE_CATALOG, so no locked Bronze/Silver/Gold chain ever renders for Typ 2 (D-01/D-03)"
  - "resolveRoleVolumePresentation does not import FANSUB_GROUP_ROLE_OPTIONS itself — it only returns the parsed roleCode as the merge key; the German role-name-to-prefix resolution is deferred to Plan 112-03's MemberBadgeChain.tsx row render (per 112-PATTERNS.md), avoiding a second, currently-unused lookup inside this file"

patterns-established:
  - "Pure-function badge derivation stays colocated with the presentation catalog it feeds (memberBadgeLabels.ts), unit-tested without jsdom/RTL via the deriveKnownFor.test.ts analog"

requirements-completed: [GAM-04]

# Metrics
duration: 6min
completed: 2026-07-28
---

# Phase 112 Plan 02: Punkt-Meilenstein- und Rollen-Volumen-Präsentationslogik Summary

**6 statische point_milestone_*-Presentations + deriveMilestoneBadge (D-01/D-03) und ein dynamischer role_volume_-Resolver mit Multi-Underscore-sicherem Tier-Parsing (D-04) in memberBadgeLabels.ts — beide reine, unit-getestete Read-time-Ableitungen ohne Persistenz.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-07-28T08:11:27+02:00
- **Completed:** 2026-07-28T08:17:01+02:00
- **Tasks:** 2 completed
- **Files modified:** 2 (1 modified, 1 created)

## Accomplishments
- Typ 2 (Punkt-Meilensteine): 6 statische Presentations mit korrekten Umlauten, ausschließlich in der statischen Map (kein Locked-Zustand), plus `deriveMilestoneBadge` liefert eindeutig den höchsten erreichten Meilenstein oder `null` unter 1 Punkt.
- Typ 3 (Rollen-Volumen): `MemberBadgePalette` um `bronze`/`silver`/`platinum` erweitert; `resolveRoleVolumePresentation` parst `role_volume_<roleCode>_<tier>` per Suffix-Abschneiden (kein naives `split('_')`), liefert deutsche Tier-Labels (`Bronze · 12+` … `Platin · 510+`) und den geparsten Rollencode als Merge-Schlüssel.
- `getMemberBadgePresentation` routet `role_volume_`-Codes vor dem statischen Fallback zum neuen Resolver; bestehende statische Codes (`founding_member` etc.) bleiben unverändert (kein Regress).
- 15 Vitest-Unit-Tests decken alle Grenzwerte aus dem Plan ab (0/1/49/50/199/200/2500/2501 Punkte, Tier-Parsing, Multi-Underscore-Rollencode, Unknown-Role-Fallback, statischer Nicht-Regress).

## Task Commits

Each task followed the RED → GREEN TDD cycle:

1. **Task 1: Typ-2 statische Meilenstein-Einträge + deriveMilestoneBadge**
   - `13ed2103` (test) — failing boundary tests for `deriveMilestoneBadge`
   - `4b48df85` (feat) — 6 static presentations + `POINT_MILESTONES` + `deriveMilestoneBadge`, all 9 tests green
2. **Task 2: MemberBadgePalette-Erweiterung + dynamischer role_volume_-Resolver**
   - `0832b102` (test) — failing resolver tests (tier parse, multi-underscore roleCode, unknown-role fallback, static non-regression)
   - `a2f235b8` (feat) — palette extension + `resolveRoleVolumePresentation` + parsing branch, all 15 tests green

**Plan metadata:** committed with this summary.

## Files Created/Modified
- `frontend/src/components/profile/memberBadgeLabels.ts` - 6 new `point_milestone_*` presentations, `POINT_MILESTONES` + `deriveMilestoneBadge`, `MemberBadgePalette` extension, `resolveRoleVolumePresentation` + dispatch branch in `getMemberBadgePresentation` (109 → 212 lines, well under the 450-line limit)
- `frontend/src/components/profile/memberBadgeLabels.test.ts` - new Vitest unit test file, 15 tests, pure-function analog to `deriveKnownFor.test.ts`

## Decisions Made
- Kept `point_milestone_*` entries out of `PUBLIC_MEMBER_BADGE_CATALOG` entirely (verified via direct read of the catalog array, not just grep) so the runtime earned-badge path is the only way they surface — matches D-03 "kein Locked-Zustand für Typ 2" exactly.
- Did not wire `FANSUB_GROUP_ROLE_OPTIONS` into `resolveRoleVolumePresentation` itself: the function's tested output (`label: '{Tier} · {Schwelle}+'`, `roleCode: <parsed code>`) never surfaces a German role name, and 112-PATTERNS.md explicitly assigns that lookup to Plan 112-03's `MemberBadgeChain.tsx` row-render prefix. Importing it here without using it would have been an unused import (lint/typecheck failure). Documented as a deviation below since the plan's task-2 action text described the mapping as part of this function.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused FANSUB_GROUP_ROLE_OPTIONS import from resolveRoleVolumePresentation**
- **Found during:** Task 2 implementation
- **Issue:** The plan's action text for Task 2 instructed importing `FANSUB_GROUP_ROLE_OPTIONS` inside `resolveRoleVolumePresentation` and mapping the role code to a German label, but the task's own `<behavior>` assertions and `Rückgabe:` spec only require `label: '{Tier} · {Schwelle}+'` (no role name) and `roleCode` as the raw parsed code. An import that resolves a value never used in the return object would be dead code, flagged by ESLint/`no-unused-vars` and inconsistent with 112-PATTERNS.md, which explicitly assigns the `FANSUB_GROUP_ROLE_OPTIONS` → row-prefix resolution to Plan 112-03's `MemberBadgeChain.tsx`, not this file.
- **Fix:** Kept the import and lookup out of `memberBadgeLabels.ts`; `resolveRoleVolumePresentation` only returns the parsed `roleCode` as the merge key, matching every behavior test verbatim. Added an explanatory comment pointing to where the German-label resolution actually happens (112-03).
- **Files modified:** `frontend/src/components/profile/memberBadgeLabels.ts`
- **Verification:** `npm run test -- memberBadgeLabels` (15/15 green) and `npm run typecheck` (clean) confirm no dead code and no missing behavior.
- **Committed in:** `a2f235b8` (Task 2 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug/dead-code avoidance)
**Impact on plan:** No scope change — all `<behavior>` assertions and acceptance criteria for Task 2 are met exactly. The deviation only concerns an internal implementation detail (where the FANSUB_GROUP_ROLE_OPTIONS lookup lives) that has zero effect on this plan's public output.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `deriveMilestoneBadge` and `resolveRoleVolumePresentation`/`getMemberBadgePresentation` are ready for Plan 112-03 to wire into SSR (`members/[slug]/page.tsx` merging `deriveMilestoneBadge(total_points)` into `earnedBadges`) and into `MemberBadgeChain.tsx` rendering (role-label prefix via `FANSUB_GROUP_ROLE_OPTIONS`, palette CSS rules for bronze/silver/platinum).
- No blockers. `MemberBadgeChain.module.css` still needs the three new `[data-palette]` rules (bronze/silver/platinum) added in 112-03 before the new badges render with correct accent colors — expected, out of scope for this plan.

## Self-Check: PASSED

All created/modified files and all 5 task/summary commits (`13ed2103`, `4b48df85`, `0832b102`, `a2f235b8`, `206fe464`) verified present in the working tree and git log.

---
*Phase: 112-member-punkt-meilenstein-badges*
*Completed: 2026-07-28*
