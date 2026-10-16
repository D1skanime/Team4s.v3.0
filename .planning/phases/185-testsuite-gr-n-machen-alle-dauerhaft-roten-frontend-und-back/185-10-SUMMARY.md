---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 10
subsystem: testing
tags: [postgres, pgx, repository, member-claims, teststil, ratchet-guard]

requires:
  - phase: 185-06
    provides: "Shared Phase-137 fixture-provisioning precedent (schema-isolated pgxpool via testsupport.OpenPhase137Postgres), reused here against a dedicated throwaway team4s_phase137_test_18510 database"
provides:
  - "member_claims_repository_test.go's two os.ReadFile(.go)+strings.Contains tests converted to real-Postgres behavior tests calling SubmitClaim/SearchHistoricalMembers/VerifyClaim directly"
  - "ensureMemberClaimsBehaviorColumns local test helper that adds members.profile_status/user_id/noindex/profile_visibility/updated_at and app_users.legacy_user_id to the Phase-137 fixture, since these production columns do not exist in the shared stand-in schema"
  - "member_claims_repository_test.go removed from LegacyAllowedSubstringTestFiles (33 entries remain, D-06 untouched)"
affects: [185-repository-member-claims, testquality-ratchet-guard]

tech-stack:
  added: []
  patterns:
    - "When a repository method under test reads/writes production columns the shared Phase-137 fixture never created (profile_status, user_id, noindex, profile_visibility, updated_at, legacy_user_id), add them via a local, FK-free, nullable/defaulted ALTER TABLE ... ADD COLUMN IF NOT EXISTS helper scoped to the specific test file, mirroring the fixture's own additive-ALTER precedent, instead of touching the shared testsupport fixture."
    - "ResolvePendingRolesToActive errors after VerifyClaim's commit are intentionally non-fatal (logged only) -- a real-behavior VerifyClaim test does not need to also stand up the full hist_group_member_roles role-activation schema to pass."

key-files:
  created: []
  modified:
    - backend/internal/repository/member_claims_repository_test.go
    - backend/internal/testquality/source_substring_guard_test.go

key-decisions:
  - "TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers and TestMemberClaimsRepositoryVerifyLinksUserID each open their own openPhase138ClaimsListPool(t) (fresh isolated schema per test, per testsupport's existing isolation model) rather than sharing a pool, so fixture IDs (631/731/831/931, 632/732/831/0 for Task 1; 6410/641/831/941, 6420/642/831/941/942 for Task 2) only need to be unique within their own test, not across the whole file."
  - "SubmitClaim's query selects m.profile_status and m.user_id, and SearchHistoricalMembers filters on m.user_id IS NULL -- neither column exists in the Phase-137 fixture's bare members(id) stand-in, so Task 1 already needed the same ensureMemberClaimsBehaviorColumns additions the plan's interfaces section described for Task 2 (user_id, profile_status); extended with noindex/profile_visibility/updated_at once VerifyClaim's own members UPDATE in Task 2 also failed against the bare stand-in."
  - "Provisioned a new throwaway database team4s_phase137_test_18510 for this plan's verification runs (CREATE DATABASE ... OWNER team4s via docker compose exec into team4sv30-db) instead of reusing the pre-existing team4s_phase137_test_1, to avoid any cross-plan interference; dropped it again after the plan's full verify command passed. Never touched team4s_v2."

requirements-completed: [D-02, D-06]

duration: ~20min
completed: 2026-10-16T21:20:00Z
---

# Phase 185 Plan 10: member_claims_repository_test.go's two source-substring tests converted to real Postgres behavior tests Summary

**Closed the one Klasse-A red test that was also a Teststil-Regel violation by rewriting both of member_claims_repository_test.go's os.ReadFile+strings.Contains tests to real httptest-free, real-Postgres behavior tests, then removing the file from the ratchet allow-list.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-10-16T21:20:00Z
- **Tasks:** 3/3 completed
- **Files modified:** 2

## Accomplishments

- `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers` no longer searches `member_claims_repository.go`'s source text for a function that moved to `member_claims_submit_repository.go` (the cause of its red status). It now opens a real Phase-137 Postgres pool, seeds a member with a verified claim and a member with only a pending claim, and asserts `SearchHistoricalMembers` excludes the former/includes the latter while `SubmitClaim` returns a 409 `member_already_assigned` `*ClaimMutationError` for the former and succeeds (status `pending`) for the latter.
- `TestMemberClaimsRepositoryVerifyLinksUserID` — the file's second, previously-green-via-source-inspection test — is now a real behavior test calling `VerifyClaim` directly: it proves `members.user_id` is set from the claiming app user's `legacy_user_id` after verification, and that an already-linked member's `user_id` is never overwritten.
- Added a local `ensureMemberClaimsBehaviorColumns(t, pool)` helper (this file only) that adds `members.profile_status`/`user_id`/`noindex`/`profile_visibility`/`updated_at` and (separately, Task 2) `app_users.legacy_user_id` — production columns `SubmitClaim`, `SearchHistoricalMembers`, and `VerifyClaim` all read or write, none of which the shared Phase-137 fixture's bare `members(id)` stand-in creates by default.
- `member_claims_repository_test.go` removed from `LegacyAllowedSubstringTestFiles` (34 → 33 entries); `TestNoNewSourceSubstringTests` and `TestSecurityRelevantFilesNeverInLegacyExceptionList` both stay green; the other 33 files (D-06) are byte-for-byte untouched.
- Full plan verification command (`go build ./...` + `go test ./internal/repository/... -run TestMemberClaimsRepository -v -count=1` + `go test ./internal/testquality/... -run TestNoNewSourceSubstringTests -v -count=1`) passes against a dedicated throwaway database (`team4s_phase137_test_18510`, dropped after verification).

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers to a real behavior test** - `30abdfcb4` (fix)
2. **Task 2: Rewrite TestMemberClaimsRepositoryVerifyLinksUserID to a real behavior test** - `8a3c4ab09` (fix)
3. **Task 3: Remove this file from LegacyAllowedSubstringTestFiles and confirm the ratchet guard stays green** - `8836adc6a` (fix)

**Plan metadata:** (this commit, created after this SUMMARY)

## Files Created/Modified

- `backend/internal/repository/member_claims_repository_test.go` - both `os.ReadFile(.go)+strings.Contains` tests rewritten to real-Postgres behavior tests; added `ensureMemberClaimsBehaviorColumns` local fixture-column helper; removed now-unused `os`/`strings` imports, added `database/sql`/`github.com/jackc/pgx/v5/pgxpool`.
- `backend/internal/testquality/source_substring_guard_test.go` - removed `"internal/repository/member_claims_repository_test.go"` from `LegacyAllowedSubstringTestFiles`; updated the doc comment's "34 files"/"34 <= 36" references to 33.

## Decisions Made

- Each rewritten test opens its own isolated Phase-137 Postgres schema (via `openPhase138ClaimsListPool(t)`), so seeded fixture IDs only need to be collision-free within that single test function, not across the whole file.
- Both `profile_status`/`user_id` (needed by Task 1's `SubmitClaim`/`SearchHistoricalMembers` calls) and `noindex`/`profile_visibility`/`updated_at` (needed by Task 2's `VerifyClaim` call, discovered via `go test` failures after Task 1's initial columns weren't sufficient) were added as FK-free, nullable/defaulted `ALTER TABLE` statements local to this test file, rather than touching the shared `testsupport` fixture used by other test files in the package.
- Provisioned a fresh throwaway `team4s_phase137_test_18510` database for this plan's verification (dropped afterward) instead of reusing the already-existing `team4s_phase137_test_1`, to keep this plan's verification runs isolated from any other in-flight work. `team4s_v2` was never touched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Task 1's test additionally needed members.profile_status/user_id columns the plan's interfaces section only described for Task 2's VerifyClaim test**
- **Found during:** Task 1 (writing TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers)
- **Issue:** `SubmitClaim` selects `COALESCE(m.profile_status, 'active')` and `m.user_id`, and `SearchHistoricalMembers` filters on `m.user_id IS NULL` — neither column exists in the Phase-137 fixture's bare `members(id)` stand-in, so the test would fail with `column "profile_status"/"user_id" does not exist` before any assertion ran.
- **Fix:** Added the `ensureMemberClaimsBehaviorColumns` helper (introduced in Task 1's commit) adding both columns as FK-free, defaulted `ALTER TABLE` statements, called at the start of the test.
- **Files modified:** backend/internal/repository/member_claims_repository_test.go
- **Verification:** `go test ./internal/repository/... -run TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers -v -count=1` passes.
- **Committed in:** 30abdfcb4 (Task 1 commit)

**2. [Rule 1 - Bug] VerifyClaim's members UPDATE also needed noindex/profile_visibility/updated_at columns not in the original plan text**
- **Found during:** Task 2 (writing TestMemberClaimsRepositoryVerifyLinksUserID)
- **Issue:** `VerifyClaim`'s `UPDATE members SET noindex = false, profile_visibility = 'public', updated_at = NOW() ...` step (which runs before the user_id-linking UPDATE) failed with `column "noindex"/"updated_at" does not exist` against the Phase-137 fixture.
- **Fix:** Extended `ensureMemberClaimsBehaviorColumns` with `noindex BOOLEAN NOT NULL DEFAULT true`, `profile_visibility VARCHAR(20) NOT NULL DEFAULT 'private'`, and `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **Files modified:** backend/internal/repository/member_claims_repository_test.go
- **Verification:** `go test ./internal/repository/... -run TestMemberClaimsRepositoryVerifyLinksUserID -v -count=1` passes; `ResolvePendingRolesToActive`'s own post-commit `hist_group_member_roles` error is logged only (non-fatal by production design) and does not fail the test.
- **Committed in:** 8a3c4ab09 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - fixture columns missing from the shared Phase-137 stand-in that the plan's interfaces section did not fully enumerate).
**Impact on plan:** Both auto-fixes were required for the named tests to execute the real production SQL at all; no scope creep beyond this plan's own two target tests.

## Issues Encountered

None beyond the two auto-fixed fixture-column gaps documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `LegacyAllowedSubstringTestFiles` now has 33 entries (down from 34); the next file in that ratchet list (if targeted by a future plan) can be converted independently without affecting this plan's work.
- `member_claims_repository_test.go` still has 4 `t.Skip("stub")` tests (`TestMemberClaimsRepositorySearchHistoricalMembers`, `TestMemberClaimsRepositorySubmitClaimUniqueInvariant`, `TestMemberClaimsRepositoryVerifyClaimOneVerifiedInvariant`, `TestMemberClaimsRepositoryRejectClaim`) — out of scope for this plan (not Klasse-A red, not source-substring violations), left untouched.

---
*Phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back*
*Completed: 2026-10-16*

## Self-Check: PASSED

- FOUND: backend/internal/repository/member_claims_repository_test.go
- FOUND: backend/internal/testquality/source_substring_guard_test.go
- FOUND: .planning/phases/185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back/185-10-SUMMARY.md
- FOUND commit: 30abdfcb4 (Task 1)
- FOUND commit: 8a3c4ab09 (Task 2)
- FOUND commit: 8836adc6a (Task 3)
- FOUND commit: 6e9daadc7 (SUMMARY)
