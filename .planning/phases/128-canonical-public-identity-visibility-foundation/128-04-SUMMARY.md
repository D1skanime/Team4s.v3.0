---
phase: 128-canonical-public-identity-visibility-foundation
plan: 04
subsystem: database-backend-contract
tags: [postgresql, migrations, public-identity, visibility, privacy]
requires:
  - phase: 128-01
    provides: Fail-closed Phase-128 PostgreSQL fixture and migration RED contracts
  - phase: 128-02
    provides: Server-computed public-member access vocabulary and privacy matrix
provides:
  - Reversible migration 0145 with immutable unique canonical member slugs
  - Closed public/private visibility schema and Go vocabulary
  - Required public-profile slug with non-serialized owner/private-preview facts
affects: [128-05, 128-09, 128-11, 128-13, 128-VALIDATION]
tech-stack:
  added: []
  patterns:
    - Fail-closed migration precondition before schema mutation
    - Database-enforced immutable canonical public identity
    - Internal access facts without public app-user identity exposure
key-files:
  created:
    - database/migrations/0145_member_public_identity_visibility.up.sql
    - database/migrations/0145_member_public_identity_visibility.down.sql
  modified:
    - backend/internal/models/member_profile.go
    - backend/internal/handlers/app_public_profile.go
    - backend/internal/handlers/app_auth_test.go
    - backend/internal/repository/member_profile_repository.go
key-decisions:
  - "Migration 0145 refuses non-empty members before ALTER and never mutates rows; disposable data must be reset and reseeded."
  - "Canonical public slugs are unique, constrained, and immutable in PostgreSQL."
  - "Public DTOs carry no app-user ownership identifier; interim owner/private-preview facts remain server-internal."
patterns-established:
  - "Schema-first identity: PostgreSQL owns slug uniqueness, canonical syntax, reserved names, and immutability."
  - "Closed visibility vocabulary: backend runtime accepts only public or private."
requirements-completed: [PMID-01, PMID-02, PMPR-01]
metrics:
  duration: 14m
  completed: 2026-08-13
---

# Phase 128 Plan 04: Canonical Member Identity and Visibility Schema Summary

**A fail-closed reversible PostgreSQL migration now enforces immutable canonical member slugs while Go uses the matching public/private visibility and non-leaking public identity vocabulary.**

## Performance

- **Duration:** 14m
- **Started:** 2026-08-13T13:17:50Z
- **Completed:** 2026-08-13T13:31:49Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added migration 0145 as the sole migration-chain head, with an actionable non-empty-members refusal before any ALTER and no row mutation or compatibility behavior.
- Enforced `public_slug` as required, unique, canonical lowercase ASCII-hyphen syntax, non-numeric, non-reserved, and immutable after insertion.
- Added dependency-ordered rollback restoring the 0126 public default and prior `public|members_only` constraint.
- Replaced the Go visibility constant and own-profile fixtures with `public|private`, required `slug` on `PublicMemberProfile`, and removed public app-user identity from public profile/project DTOs.
- Added internal `IsOwner` and `IsPrivatePreview` access facts and verified they do not serialize.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement migration 0145 with fail-closed preconditions** - `5a59be41` (feat)
2. **Task 2: Replace runtime visibility and public identity fields** - `cfd76dad` (feat)

## Files Created/Modified

- `database/migrations/0145_member_public_identity_visibility.up.sql` - Empty-table guard, canonical slug constraints, public/private constraint, and immutable trigger.
- `database/migrations/0145_member_public_identity_visibility.down.sql` - Reverse-order rollback and restoration of the prior visibility schema.
- `backend/internal/models/member_profile.go` - Closed visibility constants, required public slug, and internal access facts.
- `backend/internal/handlers/app_public_profile.go` - Interim private visibility comparisons without app-user-ID authorization.
- `backend/internal/handlers/app_auth_test.go` - Private own-profile fixtures and DTO serialization coverage.
- `backend/internal/repository/member_profile_repository.go` - Closed runtime validation and compilation bridge for the public DTO fields.

## Verification

- Guarded migration up/down/up, non-empty refusal, constraints, and immutability: passed against `team4s_phase128_test` with explicit `TEAM4S_PHASE128_TEST_DSN`.
- Missing `TEAM4S_PHASE128_TEST_DSN`: failed closed; PostgreSQL tests did not skip.
- `go test ./internal/handlers -run 'OwnProfile|ProfileVisibility' -count=1`: passed.
- `go test ./internal/models ./internal/repository -run 'OwnProfile|ProfileVisibility' -count=1`: packages compiled successfully.
- `go vet ./internal/models ./internal/migrations ./internal/handlers ./internal/repository`: passed.
- Migration-chain inventory: exactly one 0145 up/down pair follows 0144.
- Source contract checks: no row mutation in 0145 up, no `ProfileVisibilityMembersOnly`, no `members_only` response literal, and no public DTO app-user ownership identifier.
- Repository-wide `git diff --check`: passed with pre-existing user changes preserved.

## Decisions Made

- Used one named unique constraint plus separate named canonical, non-numeric, and reserved-name checks so failures remain diagnosable and rollback order is explicit.
- Used a `BEFORE UPDATE OF public_slug` trigger with `IS DISTINCT FROM` so nickname and other profile edits remain legal while identity drift is rejected.
- Kept `IsOwner` and `IsPrivatePreview` server-internal (`json:"-"`) rather than exposing an ownership identifier or introducing a second public contract before the shared resolver lands.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated repository validation with the closed visibility constant**

- **Found during:** Task 2 package compilation
- **Issue:** Removing `ProfileVisibilityMembersOnly` made `MemberProfileRepository.UpdateOwnProfile` fail to compile, although that repository file was listed as a required analog rather than in the plan-level modified-file list.
- **Fix:** Replaced the single validator reference with `ProfileVisibilityPrivate` and updated the current public DTO construction bridge without changing query ownership or implementing the later Plan-09 resolver refactor.
- **Files modified:** `backend/internal/repository/member_profile_repository.go`
- **Verification:** Focused handler/model/repository compilation tests and `go vet` passed.
- **Committed in:** `cfd76dad`

**2. [Rule 3 - Blocking] Verified canonical source through disposable Compose containers**

- **Found during:** Task 1 verification
- **Issue:** The long-running backend container predates the Plan-128 source and reported no matching migration tests.
- **Fix:** Bind-mounted canonical `/home/d1sk/team4s/backend` and the read-only migration directory into disposable Compose backend containers while keeping the guarded database DSN explicit.
- **Files modified:** None
- **Verification:** The named migration suite executed five live contracts and passed.
- **Committed in:** No code change required


**3. [Rule 1 - Bug] Restored milestone and activity metadata after GSD state advancement**

- **Found during:** Final tracking updates
- **Issue:** The repository-local GSD wrapper changed `milestone_name` to `milestone` and reduced last-activity fields to a bare date while advancing Plan 04.
- **Fix:** Restored `Public Member Profile Hardening` and recorded Plan 128-04 as the completed activity without altering progress, decisions, or metrics.
- **Files modified:** `.planning/STATE.md`
- **Verification:** STATE frontmatter, current position, performance metrics, decisions, and session continuity were reread after correction.
- **Committed in:** Final metadata commit

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking).
**Impact on plan:** The implementation fixes were required to compile or verify the exact planned behavior; no new API, table, compatibility seam, or domain owner was introduced.

## Issues Encountered

- PowerShell-to-SSH line endings affected two post-command shell checks after their preceding Git commits/checks had already succeeded. The checks were rerun as standalone Linux commands; repository contents were unaffected.

## Known Stubs

- `backend/internal/handlers/app_public_profile.go` intentionally retains the plan-specified interim HTTP 200 hidden branch using reason `private`; Plan 128-11 replaces it with the shared resolver and neutral 404 behavior.
- `backend/internal/repository/member_profile_repository.go` temporarily populates the newly required DTO slug from the normalized request path; Plan 128-09 switches profile loading to the stored `members.public_slug` after the shared resolver allows access.
- `shared/contracts/openapi.yaml` retains the pre-Phase-128 public-profile contract until the dedicated synchronized OpenAPI/TypeScript/API-helper Plan 128-13; no parallel contract was introduced here.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 128-05 can implement the transactional allocator against enforced canonical slug invariants.
- Plan 128-09 can consume stored slugs and return verified server-computed access facts without schema ambiguity.
- Plans 128-11 and 128-13 can remove the explicit interim runtime/contract seams identified above.

## Self-Check: PASSED

Both created migration files, this summary, and task commits 5a59be41 and cfd76dad were verified on disk/in Git after all plan-level gates passed.

---
*Phase: 128-canonical-public-identity-visibility-foundation*
*Completed: 2026-08-13*
