---
phase: 66-claiming-verifizierung
plan: 02
subsystem: database
tags: [go, postgres, member-claims, invitations, token-hash]
requires:
  - phase: 66-claiming-verifizierung
    provides: Migration 0092 member_claim_invitations
provides:
  - MemberClaimsRepository for search, submit, verify, reject, pending queue, and own claim lookup
  - MemberClaimInvitationRepository for token generation, invitation creation, accept, cancel, and listing
  - Migration 0093 adding member_claims.note and member_claims.updated_at for planned claim note/update semantics
affects: [member_claims, member_claim_invitations, members.noindex]
tech-stack:
  added: []
  patterns:
    - Claim verification uses transaction plus FOR UPDATE and already-verified guard
    - Invitation tokens store only SHA-256 hashes while raw tokens appear only in invite links
key-files:
  created:
    - backend/internal/repository/member_claims_repository.go
    - backend/internal/repository/member_claim_invitations_repository.go
    - database/migrations/0093_member_claims_note_updated_at.up.sql
    - database/migrations/0093_member_claims_note_updated_at.down.sql
  modified: []
key-decisions:
  - "Added 0093 because Phase 66 plans require member_claims.note and updated_at, but live/source schema only had the 0081 base columns."
  - "The 0093 change is acceptable in this dev/test-data workspace and remains reversible."
patterns-established:
  - "ClaimMutationError is the shared repository mutation error for claim and claim-invitation terminal states."
requirements-completed:
  - P66-SC1
  - P66-SC2
duration: 18 min
completed: 2026-06-02
---

# Phase 66 Plan 02: Claim Repository Layer Summary

**Repository layer for self-service claims and member-bound invitation tokens, backed by live schema repair**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-02T17:24:00+02:00
- **Completed:** 2026-06-02T17:42:00+02:00
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `MemberClaimsRepository` with historical member search, self-service submit, manual verify, reject, pending group queue, and own-claim lookup.
- Added `MemberClaimInvitationRepository` with SHA-256 token hashing, pending invitation creation, transactional accept flow, cancellation, and member invitation listing.
- Added and applied migration 0093 so `member_claims.note` and `member_claims.updated_at` exist in the dev database as required by Phase 66 plans.

## Task Commits

Each task was committed atomically:

1. **Deviation/schema repair: member_claims note/update columns** - `d0e4e7f0` (feat)
2. **Task 1: member_claims_repository.go anlegen** - `82d4afdf` (feat)
3. **Task 2: member_claim_invitations_repository.go anlegen** - `a407bbea` (feat)

## Files Created/Modified

- `backend/internal/repository/member_claims_repository.go` - Claim CRUD and invariant-safe verification.
- `backend/internal/repository/member_claim_invitations_repository.go` - Invitation token creation, terminal-state mapping, and accept lifecycle.
- `database/migrations/0093_member_claims_note_updated_at.up.sql` - Adds `note` and `updated_at` columns required by planned claim writes.
- `database/migrations/0093_member_claims_note_updated_at.down.sql` - Reverses the 0093 column additions.

## Decisions Made

- Added the missing `member_claims.note` and `member_claims.updated_at` columns through migration 0093 after confirming this workspace uses disposable dev/test data.
- Kept raw invitation tokens out of DB writes; only the SHA-256 hash is inserted.
- Kept `members.noindex = false` inside the same transaction as claim verification or invitation acceptance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing member_claims columns**
- **Found during:** Task 1 (member_claims_repository.go anlegen)
- **Issue:** The plan required `member_claims.note` and `member_claims.updated_at`, but migration 0081 and the live DB did not contain those columns.
- **Fix:** Added reversible migration 0093 and applied it to the local dev DB.
- **Files modified:** `database/migrations/0093_member_claims_note_updated_at.up.sql`, `database/migrations/0093_member_claims_note_updated_at.down.sql`
- **Verification:** `go run ./cmd/migrate up -dir ../database/migrations`, `psql \d member_claims`, migration status version 93 applied.
- **Committed in:** `d0e4e7f0`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** The repository code now matches both planned behavior and the live dev schema. No production-data risk in this disposable dev/test workspace.

## Issues Encountered

- Initial plan/schema mismatch on `member_claims.note` and `member_claims.updated_at`; resolved through 0093.

## User Setup Required

None - no external service configuration required.

## Verification

- `go test ./internal/repository/... -run TestMemberClaims` - passed.
- `go test ./internal/repository/... -run TestMemberClaimInvitation` - passed.
- `go test ./internal/repository/... -run "TestMemberClaims|TestMemberClaimInvitation"` - passed.
- `psql \d member_claims` - verified `note` and `updated_at` exist.
- `go run ./cmd/migrate status -dir ../database/migrations` - version 93 applied, pending 0.
- `git diff --check` for new repository and migration files - passed.
- Line counts: `member_claims_repository.go` 334 lines; `member_claim_invitations_repository.go` 309 lines.

## Next Phase Readiness

Wave 3 can wire handlers against the new repositories. Note that `.planning/STATE.md` contains unrelated quick-task edits and was intentionally not included in this metadata commit.

---
*Phase: 66-claiming-verifizierung*
*Completed: 2026-06-02*
