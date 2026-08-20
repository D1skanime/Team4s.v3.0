---
phase: 136-capability-policy-catalog-schema-contract
plan: 08
subsystem: frontend-role-catalog
tags: [react, role-catalog, badges, points, postgres]
requires:
  - phase: 136-11
    provides: root-loaded role catalog provider
  - phase: 136-12
    provides: catalog-driven contribution presentation
provides:
  - catalog-ordered role badge and role-volume presentation
  - generic karaoke_fx entry and volume badge proof
  - removal of the last frontend runtime role catalog
affects: [137-effective-rights-resolver, 138-rights-administration, 139-user-admin-projections]
tech-stack:
  added: []
  patterns: [root-provider consumption, neutral unknown-role fallback, fail-closed catalog selectors]
key-files:
  created: [frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx]
  modified:
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/memberBadgeLabels.ts
    - frontend/src/components/profile/badgeArtwork.ts
    - frontend/src/app/me/dashboard/components/CategoryProgressTable.tsx
    - frontend/src/types/fansub.ts
key-decisions:
  - "Role badge and dashboard ordering comes from the anime_contribution catalog; unknown stored codes remain readable and neutral."
  - "Artwork availability is a bounded asset inventory, never a valid-role whitelist."
  - "Catalog-backed selectors fail closed rather than restoring a static role fallback."
requirements-completed: [CAP-11, CAP-13, QUAL-01]
duration: 24min
completed: 2026-08-20
---

# Phase 136 Plan 08: Role Badge, Points and Inventory Gate Summary

**Badges, role-volume progress, labels, ordering, selectors, and filters now consume the canonical role catalog, while `karaoke_fx` and future role codes propagate without a client whitelist.**

## Performance

- **Duration:** 24 min
- **Completed:** 2026-08-20
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments

- Replaced `MemberBadgeChain` and `CategoryProgressTable` role whitelists with the root-loaded `anime_contribution` catalog.
- Proved generic backend generation of `role_entry_karaoke_fx` and `role_volume_karaoke_fx_bronze` without a Karaoke-specific branch.
- Added catalog-order coverage for Typesetting, Karaoke-FX, and an unknown role while retaining the established thresholds.
- Removed the deprecated `FANSUB_GROUP_ROLE_OPTIONS` runtime catalog and migrated its remaining consumers to shared catalog adapters or fail-closed server rows.
- Kept the general badge UI and all badge thresholds unchanged; the excluded legacy release route was not touched.

## Task Commits

1. **Task 1 RED: Specify catalog-backed role badge propagation** — `c7c26bd8`
2. **Task 1 GREEN: Drive role badges and progress from catalog** — `25f1f7b1`
3. **Task 2: Remove residual runtime role catalogs** — `fa98ce8d`

## Files Created/Modified

- `MemberBadgeChain.tsx` — catalog membership, ordering, and labels for role cards.
- `memberBadgeLabels.ts` — generic unknown `role_entry_*` parsing.
- `badgeArtwork.ts` — neutral fallback when no approved role artwork exists.
- `CategoryProgressTable.tsx` — catalog-ordered role-volume rows and labels.
- `CategoryProgressTable.test.tsx` — Karaoke-FX, Typesetting, unknown-role, order, and threshold proof.
- Backend member-profile repository tests — generic Karaoke-FX entry/volume code proof.
- Admin group role consumers and `types/fansub.ts` — removal of the final static frontend role authority.

## Decisions Made

- Existing artwork filenames remain an explicit asset inventory; absence of artwork produces the existing neutral icon instead of a broken image request.
- Stored codes absent from the current catalog remain visible through `readableCodeLabel` and are ordered after catalog rows.
- Protected/scoped catalog load failures disable role choices instead of silently installing stale role truth.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed hidden residual runtime catalogs**
- **Found during:** Task 2 inventory gate
- **Issue:** Five admin consumers and `types/fansub.ts` still depended on the deprecated static role list.
- **Fix:** Reused `RoleCatalogProvider`, `labelForRole`, `presentationForRole`, and protected scoped catalog results; unmounted claim UI now fails closed.
- **Files modified:** `ClaimManagementPanel.tsx`, `DefaultCrewManager.tsx`, `FansubAppMembersOverview.tsx`, `GroupMembersTab.tsx`, `useGroupMembersTab.ts`, `types/fansub.ts`.
- **Committed in:** `fa98ce8d`

**2. [Rule 3 - Blocking] Provisioned the dedicated disposable Phase-128 test database**
- **Found during:** Task 1 verification
- **Issue:** PostgreSQL-backed member-profile tests reject a missing dedicated DSN/database.
- **Fix:** Created only `team4s_phase128_test` and passed its explicit guarded DSN; live application data was not reset or modified.

**3. [Rule 3 - Blocking] Freed generated cache space after the build filled the host**
- **Found during:** Task 2 commit
- **Issue:** Git could not write an object because the root filesystem reached 100%.
- **Fix:** Removed only generated Next build output and the exact root-owned `/home/d1sk/.cache/go-phase129` cache through container ownership; no Docker volume, media, asset, or user `tmp` data was removed.

## Verification

- Focused Phase-136 Go repository/handler/migration tests: passed.
- Generic Karaoke-FX repository tests with guarded PostgreSQL DSN: passed.
- Role catalog/provider/root layout, badge label/artwork, and CategoryProgressTable suites: 106/106 passed.
- TypeScript typecheck: passed.
- `git diff --check`: passed.
- Static inventory: no production `FANSUB_GROUP_ROLE_OPTIONS` or `ANIME_CONTRIBUTION_ROLES` consumer remains.
- Auth boundary scan: no direct fetch, bearer, or token handling added to protected consumers.
- Production build compiled and typechecked, then hit the known unchanged `/_not-found` prerender `useEffect` null-dispatcher failure under the container's non-standard `NODE_ENV`.
- Full lint remains blocked by four pre-existing errors in `capture-responsive.cjs`, `GroupMemberFormModals.tsx`, and unrelated files; focused changed code typechecks cleanly.
- The historical `MemberBadgeChain` mega-suite still has four pre-existing collection-card expectation failures unrelated to role catalogs; the new Karaoke-FX/Future-Role test passes.

## Known Stubs

None.

## Threat Review

- Badge derivation remains generic over awarded contribution lifecycle rows.
- Unknown roles use a neutral fallback and cannot select missing artwork.
- No endpoint, auth path, bearer handling, capability authority, or schema trust boundary was added.

## Next Phase Readiness

- Phase 137 can build effective-right resolution on one canonical role/catalog contract.
- General badge UI unification remains deferred to Finding #34.

## Self-Check: PASSED

- All plan-owned implementation/test files exist.
- Commits `c7c26bd8`, `25f1f7b1`, and `fa98ce8d` exist in Git history.
- No tracked file deletion was introduced by the three plan commits.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*
