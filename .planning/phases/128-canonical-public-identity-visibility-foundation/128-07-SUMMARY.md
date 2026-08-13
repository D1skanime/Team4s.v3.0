---
phase: 128-canonical-public-identity-visibility-foundation
plan: 07
subsystem: backend-repository
tags: [go, postgresql, public-identity, visibility, projections]
requires:
  - phase: 128-04
    provides: Immutable canonical members.public_slug and closed public/private visibility
  - phase: 128-06
    provides: Visibility-aware stored-slug contribution projection pattern
provides:
  - Stored canonical member links for group contributor projections
  - Stored canonical member links for all three fansub domain projections
  - Source contracts rejecting nickname-derived projection identity
affects: [128-10, public-group-contributors, fansub-domain-projection]
tech-stack:
  added: []
  patterns:
    - Nullable stored-slug projection guarded by profile_visibility
    - Query-block-scoped source invariant tests
key-files:
  created: []
  modified:
    - backend/internal/repository/group_contributors_repository.go
    - backend/internal/repository/group_contributors_repository_test.go
    - backend/internal/repository/domain_projection_repository.go
    - backend/internal/repository/domain_projection_repository_test.go
key-decisions:
  - "Group and domain links select members.public_slug only when profile_visibility is public; private identities remain unlinked."
  - "Historical and contributor aggregates group by the joined member primary key so stored identity projection does not alter ownership or row grouping."
patterns-established:
  - "Canonical nullable identity: CASE WHEN m.profile_visibility = 'public' THEN m.public_slug ELSE NULL END."
requirements-completed: [PMID-03]
metrics:
  duration: 9m
  completed: 2026-08-13
---

# Phase 128 Plan 07: Canonical Group and Domain Identity Projections Summary

**Group contributor and fansub domain links now use immutable stored public slugs while private member identities remain unlinked.**

## Performance

- **Duration:** 9m
- **Started:** 2026-08-13T14:18:16Z
- **Completed:** 2026-08-13T14:27:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced both group-contributor nickname-derived slug selections with visibility-aware reads from `members.public_slug`.
- Replaced member, historical-member, and anime-contributor domain projection selections with stored canonical identity while preserving nullable link behavior.
- Preserved existing anime, fansub-group, membership, release, role, visibility, ordering, and DTO ownership semantics.
- Added TDD source contracts covering all five query blocks and rejecting nickname regex or fallback identity construction.

## Task Commits

Each TDD task was committed through RED then GREEN:

1. **Task 1 RED: Group contributor stored-slug contract** - `c77013bd` (test)
2. **Task 1 GREEN: Canonical group contributor projections** - `9b0659a4` (feat)
3. **Task 2 RED: Domain projection stored-slug contract** - `9739c64a` (test)
4. **Task 2 GREEN: Canonical domain identity projections** - `47e5bd0b` (feat)

## Files Created/Modified

- `backend/internal/repository/group_contributors_repository.go` - Uses stored public identity for external and release-role contributor links.
- `backend/internal/repository/group_contributors_repository_test.go` - Proves both group contributor query blocks cannot derive or fall back to nickname identity.
- `backend/internal/repository/domain_projection_repository.go` - Uses stored public identity across current-member, historical-member, and contributor projections.
- `backend/internal/repository/domain_projection_repository_test.go` - Proves each domain query block uses the canonical visibility-aware slug selection.

## Verification

- Canonical-source repository test `GroupContributors|DomainProjection|MemberSlug`: passed.
- Repository package compile with `go test ./internal/repository -run '^$' -count=1`: passed.
- `go vet ./internal/repository`: passed.
- Source inventory: exactly two group contributor and three domain projection stored-slug selections.
- Source boundaries: no `memberSlugExpr`, `REGEXP_REPLACE`, or `COALESCE(m.public_slug...)` remains in the owned production files.
- Ownership invariants: member-anchored contributions, release-version group joins, historical memberships, DTO fields, and ordering remain intact.
- Repository-wide staged and unstaged `git diff --check`: passed with unrelated user work preserved.

## Decisions Made

- Kept display-name fallback independent from member-link identity; nickname remains presentation text only and cannot determine an outbound URL.
- Kept nullable link DTOs unchanged so a private profile can remain listed where domain visibility allows without exposing its stored slug.
- Added the joined member primary key to grouped historical/contributor projections, preserving the existing one-member-per-row semantics while making PostgreSQL functional dependency explicit for `public_slug`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Verified canonical source through disposable Compose containers**

- **Found during:** Task 1 RED verification
- **Issue:** The long-running backend container predates the current canonical source and could otherwise execute stale tests.
- **Fix:** Reused the established Phase-128 bind-mounted Compose verification pattern for RED, GREEN, compile, and vet commands.
- **Files modified:** None
- **Verification:** Both RED contracts failed for their intended missing stored-slug assertions; all GREEN and plan-wide checks passed against `/home/d1sk/team4s/backend`.
- **Committed in:** No code change required.

**2. [Rule 1 - Bug] Restored milestone and activity metadata after GSD state advancement**

- **Found during:** Final tracking updates
- **Issue:** The repository-local GSD wrapper reset `milestone_name` to `milestone` and reduced last-activity fields to a bare date.
- **Fix:** Restored `Public Member Profile Hardening` and recorded Plan 128-07 as the completed activity without changing progress, decisions, or metrics.
- **Files modified:** `.planning/STATE.md`
- **Verification:** STATE frontmatter, current position, decisions, performance metrics, and session continuity were reread after correction.
- **Committed in:** Final metadata commit.

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking).
**Impact on plan:** Verification exercised canonical source and metadata remained durable without changing runtime data, API behavior, authentication, schema, or domain ownership.

## Issues Encountered

- Two combined PowerShell-to-SSH verification commands had quoting errors before their remote checks executed. They were split into simpler commands; repository contents and verification results were unaffected.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 128-10 can remove the retained shared nickname-derived slug declaration with its remaining inbound/owned consumers.
- Public group and domain surfaces now receive stable stored member links without discovering private member identity.
- No blocker remains for the next Phase-128 plan.

## Self-Check: PASSED

All four modified repository files and task commits `c77013bd`, `9b0659a4`, `9739c64a`, and `47e5bd0b` were verified on disk and in Git in RED-to-GREEN order.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
