---
phase: 136-capability-policy-catalog-schema-contract
plan: 20
subsystem: frontend
tags: [role-catalog, badges, artwork, security]
requires:
  - phase: 136-16
    provides: supported bounded role presentation semantics
provides:
  - catalog-gated role badge artwork resolution
  - bounded semantic-key raster asset registry
  - safe semantic fallback for Karaoke-FX and future roles without raster assets
affects: [member-profile, role-badges, role-points]
tech-stack:
  added: []
  patterns: [catalog authority with bounded asset behavior registry]
key-files:
  created: []
  modified:
    - frontend/src/components/profile/badgeArtwork.ts
    - frontend/src/components/profile/badgeArtwork.test.ts
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
key-decisions:
  - "The role catalog determines role validity; the icon-key registry only determines availability of shipped raster artwork."
  - "Roles without matching raster artwork retain the established semantic badge fallback."
patterns-established:
  - "Never interpolate catalog metadata into asset URLs; resolve only through bounded semantic keys and exact asset entries."
requirements-completed: [CAP-11, CAP-13]
duration: 12min
completed: 2026-08-20
---

# Phase 136 Plan 20: Catalog-Driven Role Artwork Summary

**Role badges now use the canonical catalog for role validity and a bounded semantic-key registry solely for shipped raster availability.**

## Performance

- **Duration:** 12 min
- **Completed:** 2026-08-20
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- Removed `APPROVED_ROLE_ARTWORK`, the closed source-level role-code authority.
- Passed the matched `anime_contribution` catalog row's normalized `icon_key` into flat and layered role artwork resolution.
- Preserved every established role image and rank-frame behavior while Karaoke-FX and injected future roles safely use the existing semantic fallback when no raster is registered.
- Kept non-role contribution, membership, progress, points, and special artwork mappings unchanged.

## Task Commits

1. **RED: Catalog-driven role artwork tests** - `98c3365e`
2. **GREEN: Bounded semantic artwork registry** - `5733de7b`

## Files Created/Modified

- `frontend/src/components/profile/badgeArtwork.ts` - bounded icon-key registry and flat/layered role artwork resolvers.
- `frontend/src/components/profile/badgeArtwork.test.ts` - exact semantic-key, missing-artwork, and no-key fallback assertions.
- `frontend/src/components/profile/MemberBadgeChain.tsx` - catalog-row lookup and normalized presentation key wiring.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - Karaoke-FX, Typesetting, future-role, and existing artwork coverage.

## Decisions Made

The asset registry enumerates only shipped image behavior. It is not a valid-role list: a catalog role remains renderable without a registry entry and falls back to its semantic badge/icon presentation.

## Deviations from Plan

None - implementation stayed within the four owned frontend files and did not alter badge layout, thresholds, or general badge UI.

## Verification

- RED gate: focused `badgeArtwork.test.ts` failed before implementation because a role raster still resolved without catalog metadata.
- Catalog/Karaoke-FX/future-role and all eleven established role-family artwork tests: passed (7 passed, 102 skipped by focus filter).
- `badgeArtwork.test.ts`: passed.
- `CategoryProgressTable.test.tsx`: 6 passed.
- `npm run typecheck`: passed.
- `git diff --check`: passed.

## Deferred Issues

The plan's full three-file Vitest invocation still reports four pre-existing `MemberBadgeChain.test.tsx` failures in unrelated Phase 119/120 collection-card expectations (contribution copy, founding locked label, legacy Special heading). The same four failures were present before Plan 136-20 changes; focused role-artwork coverage is green. Per the three-attempt limit these unrelated collection-card tests were not modified.

## Known Stubs

None.

## Threat Flags

None. Catalog keys cannot become arbitrary paths; only bounded registry entries produce asset URLs.

## Self-Check: PASSED

Both task commits and all four planned files exist; the catalog-driven role-artwork acceptance tests, typecheck, and diff check pass.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
