---
phase: 66-claiming-verifizierung
plan: 01
subsystem: database
tags: [postgres, migrations, member-claim-invitations, token-hash]
requires:
  - phase: 66-claiming-verifizierung
    provides: Wave-0 test stubs and Phase 66 invitation schema contract
provides:
  - Migration 0092 for member_claim_invitations
  - Live local database schema with member claim invitation token lifecycle table
affects: [member_claim_invitations, member_claims, fansub_groups, app_users]
tech-stack:
  added: []
  patterns:
    - Invitation tokens persist only as SHA-256-length hashes
    - Pending invitation uniqueness is enforced by partial unique index
key-files:
  created:
    - database/migrations/0092_member_claim_invitations.up.sql
    - database/migrations/0092_member_claim_invitations.down.sql
  modified: []
key-decisions:
  - "Migration 0092 is the next migration after tracked 0091; no untracked migration-chain conflict existed before creation."
  - "Member-claim invitations are member-bound and fansub-contextual, with no email, normalized_email, or invited_role_codes fields."
patterns-established:
  - "member_claim_invitations mirrors fansub_group_invitations token lifecycle while preserving historical member ownership."
requirements-completed:
  - P66-SC1
  - P66-SC2
duration: 5 min
completed: 2026-06-02
---

# Phase 66 Plan 01: Member Claim Invitation Migration Summary

**Postgres migration for member-bound claim invitation tokens with live schema verification**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-02T17:17:30+02:00
- **Completed:** 2026-06-02T17:22:00+02:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `0092_member_claim_invitations` up/down migrations.
- Applied migration 0092 to the local `team4s_v2` database via `backend/cmd/migrate`.
- Verified the live schema through `psql`, including all columns, check constraints, unique indexes, and foreign keys.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0092 up/down schreiben** - `1ac0dac9` (feat)
2. **Task 2: Migration 0092 anwenden und Schema verifizieren** - `fba2f3d4` (chore, empty commit for live DB application evidence)

## Files Created/Modified

- `database/migrations/0092_member_claim_invitations.up.sql` - Creates `member_claim_invitations` with member/fansub/app-user FKs, token hash constraints, status lifecycle, and indexes.
- `database/migrations/0092_member_claim_invitations.down.sql` - Drops indexes and the invitation table for rollback.

## Decisions Made

- Used migration number 0092 after confirming 0089, 0090, and 0091 are already tracked and no untracked migration files exist.
- Kept the schema member-bound: no `email`, `normalized_email`, or `invited_role_codes` columns.
- Enforced one pending invitation per historical member with `uq_member_claim_invitations_pending_member`.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `git status --short database/migrations` before creation - no untracked migration files.
- `Select-String` migration pattern count - 12 matching lines for table/token/hash/pending-member index markers.
- `rg` acceptance checks - confirmed table, `VARCHAR(64)`, `char_length(token_hash) = 64`, pending-member unique index, token unique index, FK targets, and down migration.
- `$env:DATABASE_URL='postgres://team4s:team4s_dev_password@127.0.0.1:5433/team4s_v2?sslmode=disable'; go run ./cmd/migrate up -dir ../database/migrations` - applied 1 migration.
- `docker compose exec -T team4sv30-db psql -U team4s -d team4s_v2 -c "\d member_claim_invitations"` - verified live schema.
- `go run ./cmd/migrate status -dir ../database/migrations` - version 92 applied, pending 0.

## Next Phase Readiness

Wave 2 can implement repository methods against the live `member_claim_invitations` table and the existing `member_claims` table.

---
*Phase: 66-claiming-verifizierung*
*Completed: 2026-06-02*
