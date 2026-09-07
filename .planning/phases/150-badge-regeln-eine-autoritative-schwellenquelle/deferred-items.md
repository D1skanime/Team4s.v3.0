# Deferred Items — Phase 150

Discovered during Plan 150-02 execution while running the full
`go test ./internal/repository/...` suite (broader than the plan's own
per-task `<verify>` commands, run as a sanity check after touching shared
Postgres fixtures). None of these are in any 150-02 task's `<files>` list and
none are caused by 150-02's changes (registry repointing in the contribution
repository, dashboard repository, and badge_service.go). Logged per the
scope-boundary rule instead of fixed.

## 1. `TestEvaluateMemberMutationConflictBlocksLastActiveManager`
File: `backend/internal/repository/fansub_group_app_members_repository_test.go`
Fails with "expected last active manager conflict" against the shared
`team4s_phase128_test` database. Unrelated to badges/dashboard/thresholds.

## 2. Memorial-profile claim guard tests
File: `backend/internal/repository/member_claims_memorial_guard_test.go`
`TestClaimSubmitBlockedForMemorialProfile`, `TestClaimBlockWritesDeniedAudit`,
`TestClaimBlockDeniedAuditOutcomeColocated` all fail with source-substring
"fragment missing" errors ("profile_status", "member_claim.memorial_blocked")
against `member_claims_repository.go` — a memorial-profile guard that appears
not yet implemented in this checkout. Unrelated to Phase 150.

## 3. `TestMemberClaimsRepositoryBlocksAlreadyAssignedMembers`
File: `backend/internal/repository/member_claims_repository_test.go`
Fails asserting a value "Should not be: -1". Unrelated to Phase 150.

## 4. Role-volume progress boundary tests
File: `backend/internal/repository/member_profile_role_volume_repository_test.go`
`TestLoadRoleVolumeBadgesPostgresProgressBoundaries` (all sub-cases) and
`TestLoadRoleVolumeBadgesPostgresKeepsRolesIndependentAndReversesLive` fail
with `ERROR: new row for relation "release_role_credit_lifecycles" violates
check constraint "chk_release_role_credit_lifecycle_shape"` — a schema/fixture
mismatch in the shared `team4s_phase128_test` database, in a file owned by
`highestRoleVolumeTier`/`roleVolumeProgressBadge` (Phase 150 D-02's fifth/sixth
backend fundstellen, explicitly OUT of 150-02's task list — these belong to a
later plan in this phase, likely 150-03). Not touched by 150-02.

## 5. Phase-134 live-server verification matrix tests
File: `backend/internal/repository/phase134_verification_matrix_access_test.go`,
`phase134_verification_matrix_test.go`
Fail because they require a reachable live backend at
`http://192.168.235.196:18093` and working Keycloak logins for
`sheppert@team4s.local`/`csubs-leader@team4s.local`. Per
`.planning/phases/150-badge-regeln-eine-autoritative-schwellenquelle/150-01-SUMMARY.md`'s
own carried-forward note, these two fixture accounts no longer exist in this
environment's database (12 members total) — a known, already-documented
environmental gap from Plan 150-01, not a 150-02 regression. These tests also
require the backend to be reachable from inside the ephemeral test container's
network path, which it is not in the sandboxed `go test` invocation used to
verify 150-02.

None of the above block Plan 150-02's own `<verify>` commands (all of which
pass); they are pre-existing gaps surfaced only by running the full package
test suite as an extra sanity check beyond what the plan required.

## 6. `Phase 119 additive badge_progress contract` (v12-projection-contract.test.ts)
File: `frontend/src/types/__tests__/v12-projection-contract.test.ts`
`keeps Go, OpenAPI and TypeScript field names and nullability aligned` fails
because it asserts a hardcoded, stale expectation of the
`PublicMemberBadgeProgress` OpenAPI schema block (`required: [family,
current_count, next_threshold, remaining_count, next_tier, complete]`, six
fields, no `current_tier`/`stages`/`role_code`). Plan 150-03 already extended
`shared/contracts/openapi.yaml`'s `PublicMemberBadgeProgress` schema with
`current_tier`, `role_code`, and `stages` (D-05/D-06/D-24) — a real, intentional
contract widening, not a regression. This test's own hardcoded expected
`required` list was not updated when 150-03 landed, so it has been failing
since commit `0497e928` (Plan 150-03), before Plan 150-05 (this plan) started.
Confirmed via `git log`/`git diff` that neither this test file nor
`shared/contracts/openapi.yaml` were touched during 150-05's execution.
Discovered during 150-05's full `npx vitest run` sanity check (broader than
this plan's own per-task `<verify>` commands). Not in 150-05's `<files>` list
for any task; not fixed here per the scope-boundary rule — logged for a
follow-up plan to update this test's hardcoded expectation to match the
current (150-03-landed) schema.
