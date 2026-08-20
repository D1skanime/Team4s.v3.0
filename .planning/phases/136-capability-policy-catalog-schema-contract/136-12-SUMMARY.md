---
phase: 136-capability-policy-catalog-schema-contract
plan: 12
subsystem: ui
tags: [react, role-catalog, contributions, badges]

requires:
  - phase: 136-05
    provides: Pure anime-contribution catalog transforms and root role catalog provider
provides:
  - Catalog-driven role labels, ordering, and presentation for active contribution cards
  - Focused proof that karaoke_fx, typer, and unknown role codes remain distinct
affects: [136-13, contribution-cards, release-credits]

tech-stack:
  added: []
  patterns: [root-provider catalog consumption, total neutral unknown-role fallback]

key-files:
  created: []
  modified:
    - frontend/src/components/contributions/ContributionCard.tsx
    - frontend/src/components/contributions/ContributionCard.test.tsx
    - frontend/src/components/contributions/AnimeGroupCard.tsx
    - frontend/src/components/contributions/AnimeGroupCard.test.tsx

key-decisions:
  - "Active contribution cards trust the root-loaded role catalog rather than response labels or local role maps."
  - "Unknown role codes remain readable and receive the shared neutral presentation."

patterns-established:
  - "Leaf cards call useRoleCatalog but never fetch; pure catalog helpers own ordering, labels, and presentation."

requirements-completed: [CAP-11, CAP-13, QUAL-01]

duration: 8min
completed: 2026-08-20
---

# Phase 136 Plan 12: Contribution Card Catalog Migration Summary

**Active contribution and anime-group cards now render ordered role metadata from the shared catalog, with distinct Karaoke-FX/Typesetting semantics and a readable neutral fallback.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-20T18:17:00Z
- **Completed:** 2026-08-20T18:25:00Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Removed both duplicated static role-label maps from the active contribution cards.
- Reused `normalizeRoleCodes`, `labelForRole`, and `presentationForRole` against the root provider catalog.
- Proved catalog ordering and separate `typer`/`karaoke_fx` semantics while unknown codes remain visible and neutral.

## Task Commits

1. **Task 1 RED: specify catalog-backed contribution cards** - `230aed7b` (test)
2. **Task 1 GREEN: drive contribution cards from role catalog** - `eed757e1` (feat)

## Files Created/Modified

- `frontend/src/components/contributions/ContributionCard.tsx` - Catalog-backed role badges without local role authority.
- `frontend/src/components/contributions/ContributionCard.test.tsx` - Ordering, Karaoke-FX, Typesetting, and unknown-role proof.
- `frontend/src/components/contributions/AnimeGroupCard.tsx` - Catalog-backed summary chips and expanded role rows.
- `frontend/src/components/contributions/AnimeGroupCard.test.tsx` - Catalog presentation and existing interaction regression coverage.

## Decisions Made

- API-provided `role_labels` no longer override canonical catalog labels on these cards; unknown codes use the shared readable fallback.
- The existing `data-role-code` convention carries the validated catalog color key without changing card layout or badge shape.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The plan's quoted Vitest filter (`ContributionCard|AnimeGroupCard`) is interpreted as a literal filename filter and finds no tests. Verification used the two exact test paths instead.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- Active contribution-card consumers are migrated and ready for the Phase 136 cross-surface verification plan.
- No blockers remain; the unused legacy `/anime/[id]/group/[groupId]/releases` route was not touched.

## Self-Check: PASSED

- All four planned files exist.
- Commits `230aed7b` and `eed757e1` exist.
- Focused tests, TypeScript typecheck, focused ESLint, and `git diff --check` pass.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
