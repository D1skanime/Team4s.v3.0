---
phase: 118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-
plan: "01"
subsystem: api
tags: [go, openapi, typescript, public-profile, badges]
requires:
  - phase: 112-member-punkt-meilenstein-badges
    provides: Live role-volume projection and badge carriers
provides:
  - Exact public earned-role count and tier metadata
  - Entry-through-platinum boundary and reversal coverage
  - Aligned Go/OpenAPI/TypeScript public badge contract
affects: [118-02, 118-03, public-member-profile]
tech-stack:
  added: []
  patterns: [single-count-seam badge enrichment, optional terminal next-tier]
key-files:
  created: []
  modified:
    - backend/internal/repository/member_profile_role_volume_repository.go
    - backend/internal/repository/member_profile_role_volume_repository_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/profile.ts
    - frontend/src/types/__tests__/v12-projection-contract.test.ts
key-decisions:
  - "The existing role entry and role volume badge carriers share metadata derived from one RoleVolumeCount."
  - "Platinum keeps current_count/current_tier/next_threshold/remaining_count terminal metadata while next_tier is null because no higher tier exists."
patterns-established:
  - "Public role progress is projected live from awarded lifecycle counts without a second query or endpoint."
requirements-completed: [D-01, D-02, D-03, D-04, D-20, D-21, D-22, D-23]
duration: 17min
completed: 2026-08-03
---

# Phase 118 Plan 01: Exact Earned-Role Progress Summary

**Public role badges now carry exact live counts and entry-through-platinum progress metadata from the existing lifecycle-count projection.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-08-03T05:09:00Z
- **Completed:** 2026-08-03T05:26:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Locked all ten boundary values plus independent-role, downward-reversal, and zero-removal behavior.
- Enriched both existing synthetic role badge carriers from the same `loadRoleVolumeCounts` iteration.
- Kept Go runtime, canonical OpenAPI, and TypeScript DTO tier metadata aligned with focused parity coverage.
- Preserved the existing query, public-earned filtering, ID 0, non-nil result slices, and profile pass-through.

## Task Commits

1. **Task 1: Lock exact-count boundary and reversal behavior** - `9271dd32` (test)
2. **Task 2: Enrich the existing projection and align contract surfaces** - `e904180e` (feat)

## Files Created/Modified

- `backend/internal/repository/member_profile_role_volume_repository.go` - Derives exact tier, threshold, remainder, and next-tier metadata and enriches existing carriers.
- `backend/internal/repository/member_profile_role_volume_repository_test.go` - Covers boundaries, independent roles, reversal, and absence at zero.
- `shared/contracts/openapi.yaml` - Adds entry and platinum to the current role-progress tier enum.
- `frontend/src/types/profile.ts` - Mirrors the complete current-tier union.
- `frontend/src/types/__tests__/v12-projection-contract.test.ts` - Checks exact DTO keys and OpenAPI/TypeScript tier parity.

## Decisions Made

- Platinum has no next tier, so `next_tier` remains optional/null while `next_threshold=510` and `remaining_count=0` provide terminal metadata.
- Counts 12+ enrich both entry and highest-volume carriers; counts 1-11 use only the entry carrier.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Contract consumer compatibility] Kept terminal next tier absent**
- **Found during:** Task 2
- **Issue:** Expanding `next_tier` to entry/platinum widened an existing contribution-progress consumer beyond its valid three-tier domain.
- **Fix:** Expanded only `current_tier`; terminal platinum uses a null optional `next_tier`.
- **Files modified:** backend/internal/repository/member_profile_role_volume_repository.go, shared/contracts/openapi.yaml, frontend/src/types/profile.ts
- **Verification:** Frontend production build and typecheck pass.
- **Committed in:** `e904180e`

---

**Total deviations:** 1 auto-fixed (Rule 1)
**Impact on plan:** Terminal metadata remains authoritative without changing unrelated contribution-badge semantics.

## Issues Encountered

- The focused contract test needs the repository `shared/` directory mounted at `/shared` in one-off Compose runs because the frontend image build context does not contain it. Verification used a read-only Compose bind mount.
- Repository-backed PostgreSQL fixtures are environment-gated by the existing test helper; the pure boundary test guarantees the RED/GREEN gate even when integration fixtures skip.

## Verification

- `docker compose run --rm team4sv30-backend go test ./internal/repository -run 'RoleVolume|PublicMember.*Badge' -count=1` - PASS
- `docker compose run --rm --no-deps -v /home/d1sk/team4s/shared:/shared:ro team4sv30-frontend npm test -- --run src/types/__tests__/v12-projection-contract.test.ts` - PASS (5/5)
- `docker compose run --rm --no-deps team4sv30-frontend npm run typecheck` - PASS
- Frontend and backend Docker Compose image builds - PASS
- `git diff --check` - PASS
- Seam inspection confirmed `loadRoleVolumeBadges` contains no `db.Query`; no endpoint, schema, migration, auth, or handler was added.
- ASVS L1 HIGH gates T-118-01 and T-118-03 are resolved by reversal/zero coverage and contract-parity verification.

## Known Stubs

None.

## Threat Flags

None. No new network, auth, file, schema, or trust-boundary surface was introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 118-02 can consume exact role progress directly from existing public badge carriers.
- No blocker or unresolved HIGH security finding remains.

## Self-Check: PASSED

- All five modified implementation/test files exist.
- Commits `9271dd32` and `e904180e` exist in the canonical repository.
- No unrelated untracked planning or badge artwork files were staged.

---
*Phase: 118-rollenfortschritt-als-eigene-card-je-tats-chlich-ausge-bter-*
*Completed: 2026-08-03*

