---
phase: 128-canonical-public-identity-visibility-foundation
plan: 09
subsystem: backend-repository-authorization
tags: [postgresql, public-identity, visibility, verified-claims, privacy]
requires:
  - phase: 128-02
    provides: Guarded public-member access matrix and zero-loader denial contracts
  - phase: 128-04
    provides: Immutable stored member slugs and closed public/private visibility vocabulary
provides:
  - Shared deny-first public member access resolver on MemberProfileRepository
  - Member-ID based public profile and project detail loaders
  - Stored-slug mapping for public and own member DTOs
affects: [128-10, 128-11, 128-13, 128-VALIDATION]
tech-stack:
  added: []
  patterns:
    - Exact stored-slug and verified-claim access before detail projection
    - Resolved member IDs as the only profile/project detail lookup key
key-files:
  created:
    - backend/internal/repository/member_public_access_repository.go
  modified:
    - backend/internal/repository/member_public_access_repository_test.go
    - backend/internal/repository/member_profile_repository.go
    - backend/internal/repository/member_profile_repository_test.go
key-decisions:
  - "Verified member_claims equality is the only private-profile grant; missing and denied identities share ErrNotFound."
  - "Temporary slug-shaped compatibility methods delegate to the shared resolver and ID loaders until Plan 128-11 rewires handlers."
  - "Recent release-version media maps uploaders to members through verified claims so detail loading remains member-ID based."
patterns-established:
  - "Deny first: exact canonical identity and visibility are resolved before any profile fan-out."
  - "Detail by ID: profile and project projections never derive or normalize inbound member identity."
requirements-completed: [PMID-02, PMID-03, PMPR-01, PMPR-02]
metrics:
  duration: 20m
  completed: 2026-08-13
---

# Phase 128 Plan 09: Deny-First Public Member Repository Summary

**Exact stored-slug access with verified-claim owner preview now gates member-ID-only profile and project detail loading.**

## Performance

- **Duration:** 20m
- **Started:** 2026-08-13T14:52:57Z
- **Completed:** 2026-08-13T15:13:18Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added one minimal resolver on the existing MemberProfileRepository that rejects unsafe and numeric slugs before SQL, selects only stored identity/visibility plus verified ownership, and returns one ErrNotFound denial.
- Replaced nickname-derived, numeric, and O(n) profile resolution with member-ID detail loading and direct members.public_slug projection.
- Added a direct member-ID projects loader that loads/counts projects without invoking the full profile fan-out.
- Mapped own-profile slugs from immutable storage and kept all profile update SQL free of public_slug writes.
- Converted recent profile media ownership from app-user input to verified member-claim mapping so both own and public detail paths remain member-ID based.

## Task Commits

1. **Task 1: Implement ResolvePublicMemberAccess** - `c08f65b6` (feat; inherited RED contract `027ef57e`)
2. **Task 2 RED: Require ID-only detail and stored slug mapping** - `107a3238` (test)
3. **Task 2 GREEN: Split profile and projects behind member IDs** - `8a0fb1e8` (feat)

## Files Created/Modified

- `backend/internal/repository/member_public_access_repository.go` - Minimal exact-slug visibility and verified-owner decision.
- `backend/internal/repository/member_public_access_repository_test.go` - Guarded matrix now executes the production resolver instead of duplicate reference logic.
- `backend/internal/repository/member_profile_repository.go` - ID loaders, stored slug projections, direct projects pagination, and verified member media mapping.
- `backend/internal/repository/member_profile_repository_test.go` - RED/GREEN source invariants for the ID and immutability contract.

## Decisions Made

- Kept short-lived compatibility methods with existing handler-facing signatures, but made them delegate immediately to the one shared resolver and ID loaders. This preserves whole-backend compilation until Plan 128-11 updates handler injection without retaining nickname, numeric, or duplicate access behavior.
- Used an EXISTS verified-claim predicate for release-version media ownership by member ID, avoiding an app-user identity field in the public profile projection.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Preserved whole-backend compilation through resolver-delegating compatibility methods**
- **Found during:** Task 2
- **Issue:** Removing the old slug-shaped repository methods immediately would break the existing handler interfaces and server wiring owned by Plan 128-11.
- **Fix:** Retained thin public-only entry points that call ResolvePublicMemberAccess once and then invoke the new ID loaders; no nickname, numeric, legacy-user, or duplicate authorization logic remains.
- **Files modified:** `backend/internal/repository/member_profile_repository.go`
- **Verification:** Full backend compile and vet passed; source tests prove the detail methods are member-ID only.
- **Committed in:** `8a0fb1e8`

**2. [Rule 3 - Blocking] Verified canonical source through disposable Compose containers**
- **Found during:** Tasks 1 and 2 verification
- **Issue:** The long-running backend container predates the current canonical source and reported no matching tests.
- **Fix:** Ran formatting, tests, compile, and vet in disposable Compose backend containers with `/home/d1sk/team4s/backend` bind-mounted at `/app`.
- **Files modified:** None
- **Verification:** Both exact plan regex suites, whole-backend compile, and vet passed against canonical source.
- **Committed in:** No code change required

**3. [Rule 1 - Bug] Restored milestone and activity metadata after GSD state advancement**
- **Found during:** Final tracking updates
- **Issue:** The repository-local GSD wrapper changed milestone_name to milestone and reduced last-activity fields to a bare date.
- **Fix:** Restored Public Member Profile Hardening and recorded Plan 128-09 as the completed activity without altering progress, decisions, or metrics.
- **Files modified:** `.planning/STATE.md`
- **Verification:** STATE frontmatter, current position, decisions, metrics, and session continuity were reread after correction.
- **Committed in:** Final metadata commit

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking).
**Impact on plan:** All adjustments preserve the planned security and ownership model without adding a parallel repository, API, auth, or domain seam.

## Issues Encountered

- A first Task 1 commit included two pre-existing staged frontend files. The commit was immediately rebuilt, and the exact original staged/unstaged user state was restored before execution continued.
- PowerShell quoting interpreted regex alternation during early SSH commands; exact combined test commands were rerun through a Linux-decoded command payload.

## Verification

- Guarded production resolver matrix (`PublicMemberAccess|VisibilityFirst`): passed.
- Guarded profile/project suite (`MemberProfile|PublicMemberProjects|SlugImmutable|VisibilityFirst`): passed.
- Whole backend compile with no test execution: passed.
- `go vet ./internal/repository ./internal/handlers ./cmd/server`: passed.
- Source invariants: one definition-only deriveMemberSlug, one definition-only normalizeMemberProfileSlug, no O(n) fallback, no public_slug update, and member-ID loader signatures present.
- Stub scan across all four plan files: no goal-blocking TODO, FIXME, placeholder, empty-render, or mock-data stubs.
- Repository `git diff --check`: passed with unrelated user changes preserved.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 128-10 can remove the now definition-only normalizers and remaining package consumers.
- Plan 128-11 can inject the resolver and ID loaders into optional-auth handlers, apply owner facts, and delete the temporary compatibility entry points.
- No blocker remains for subsequent Phase-128 plans.

## Self-Check: PASSED

All four plan files exist, task commits `c08f65b6`, `107a3238`, and `8a0fb1e8` exist in Git, and all plan-level verification gates passed.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
