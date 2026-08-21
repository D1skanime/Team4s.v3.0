# Phase 137 — Closing Validation Evidence

Plan: 137-08 (final, closing verification plan)
Date: 2026-08-21
Scope: cross-layer security, concurrency, compatibility and performance-shape
verification for Phase 137 (central effective-rights resolver + per-user
overrides), backend/API boundary only (no Phase-138 UI).

---

## 1. Commands run and results

All backend commands ran inside the canonical Docker Compose environment
(`team4sv30-backend`), against real PostgreSQL where a Phase-137 real-DB test
required it. A disposable database (`team4s_phase137_test_08`, matching
`testsupport.OpenPhase137Postgres`'s required naming pattern) was created via
`docker compose exec -T team4sv30-db psql ... CREATE DATABASE
team4s_phase137_test_08 OWNER team4s;` and exported as
`TEAM4S_PHASE137_TEST_DSN` for every run below, so every Phase-137 real-Postgres
test (repository, service, concurrency) executed against a real schema instead
of skipping.

### 1a. Task 1 — focused cross-layer suite

```
docker compose exec -T -e TEAM4S_PHASE137_TEST_DSN=... team4sv30-backend \
  go test ./internal/permissions ./internal/repository ./internal/services \
  ./internal/handlers ./internal/migrations -count=1
```

Result:

```
ok    team4s.v3/backend/internal/permissions   0.003s
FAIL  team4s.v3/backend/internal/repository    0.903s
ok    team4s.v3/backend/internal/services      0.492s
FAIL  team4s.v3/backend/internal/handlers      0.481s
FAIL  team4s.v3/backend/internal/migrations    0.012s
```

`internal/permissions` and `internal/services` — the two packages that own
every Phase-137 resolver/mutation-service file — are **fully green**,
including every real-Postgres Phase-137 test (no skips, real DSN supplied).
All 65 failures across `internal/repository`, `internal/handlers`,
`internal/migrations` are pre-existing and unrelated to Phase 137; see
Section 3 for the full triage.

### 1b. Task 2 — full backend suite

```
docker compose exec -T -e TEAM4S_PHASE137_TEST_DSN=... team4sv30-backend \
  go test ./... -count=1
```

Result:

```
ok    team4s.v3/backend/cmd/server            0.022s
ok    team4s.v3/backend/internal/auth         0.003s
ok    team4s.v3/backend/internal/config       0.009s
FAIL  team4s.v3/backend/internal/handlers     0.784s
ok    team4s.v3/backend/internal/middleware   0.010s
FAIL  team4s.v3/backend/internal/migrations   0.016s
ok    team4s.v3/backend/internal/models       0.003s
ok    team4s.v3/backend/internal/observability 0.002s
ok    team4s.v3/backend/internal/permissions  0.003s
FAIL  team4s.v3/backend/internal/repository   0.810s
ok    team4s.v3/backend/internal/services     0.486s
ok    team4s.v3/backend/internal/testsupport  0.016s
```

Identical failing-test set (65 tests, same names) as the Task 1 run — proven
by diffing the two runs' `--- FAIL` lines (only timing values differ). No new
failures were introduced between the focused matrix and the full suite.

`go build ./...` — clean. `go vet ./...` — clean.

### 1c. `git diff --check`

Clean (exit 0) for every commit in this plan.

### 1d. Frontend contract check

```
docker compose exec -T team4sv30-frontend npm test -- --run src/types
```

Result: `1 failed | 1 passed (2)` test **files**; `1 failed | 6 passed (7)`
tests. The single failure is
`v12-projection-contract.test.ts`'s `PublicMemberBadge` tier-enum assertion
(`entry, bronze, silver, gold, platinum` vs. an expected substring
`bronze, silver, gold`) — a badge-catalog contract file Phase 137 never
touches. Confirmed byte-identical to the pre-Phase-137 baseline via
`git show 7163a2d5:frontend/src/types/__tests__/v12-projection-contract.test.ts`
diffed against the working tree (zero diff). Not caused by this phase.

`docker compose exec -T team4sv30-frontend npx tsc --noEmit` — the only
errors are pre-existing Next.js generated route-type errors under
`.next/dev/types/app/**` (a well-documented, unrelated pattern across prior
phase summaries). Grepping the full `tsc` output for `admin-capability` or
`EffectiveRight` returns zero matches — the Phase-137 frontend contract type
(`frontend/src/types/admin-capability.ts`) compiles cleanly.

---

## 2. D01–D10 negative security matrix traceability

Every row of `137-CONTEXT.md` Section 7's matrix is proven at the lowest
meaningful layer, with at least one end-to-end path per security-critical
rule. Two genuine coverage holes were found and closed in this plan's Task 1
commit (`test(137-08): close self-mutation and platform-admin mutation matrix
gaps`); every other row was already covered by Plans 01–07.

| Matrix row | Expected | Proof (layer / test) |
|---|---|---|
| one role grants capability | ALLOW | resolver: `TestResolveGroupRightsNegativeSecurityMatrix/one_role_grants_capability` |
| multiple roles, one grants | ALLOW | resolver: `TestResolveGroupRightsMultipleRoleGrantsAreORCombinedAndVisible` + matrix subtest |
| role grant + User Allow | ALLOW | resolver: matrix subtest `role_grant_+_user_allow` |
| role grant + User Deny | DENY | resolver: matrix subtest `role_grant_+_user_deny`; HTTP-adjacent: `TestIntegrationCanForFansubGroupUserDenyOverridesRoleGrant` |
| no role grant + User Allow | ALLOW | resolver: `TestResolveGroupRightsUserAllowGrantsWithoutRoleWithActiveMembership` + matrix subtest |
| ambiguous Allow+Deny → deterministic | deterministic / DENY | resolver: `TestResolveGroupRightsAmbiguousUserAllowAndDenyResolvesDenyDeterministically` |
| Platform Admin + User Deny | ALLOW | resolver: `TestResolveGroupRightsPlatformAdminAlwaysAllowsNonDeniable` + matrix subtest; service: `TestPhase137EffectiveRightsOverrideMutationAuthorization/platform_admin_bypasses_group_management_capability` (**new, this plan**) |
| disabled user + role grant | DENY | resolver: `TestResolveGroupRightsDisabledActorDenies` + matrix subtest |
| inactive membership + stored User Allow | DENY | resolver: `TestResolveGroupRightsNoActiveMembershipDeniesDespiteDormantAllow` + matrix subtest |
| reactivated membership + retained override | effective again | resolver: `TestResolveGroupRightsReactivatedMembershipRestoresRetainedOverride`; service (real Postgres): `TestPhase137EffectiveRightsOverrideRetainedDormantWhenMembershipBecomesInactive` |
| Review Delegation + User Deny | DENY | resolver: `TestReviewGrantProviderUserDenyOverridesDelegatedGrant`; existing entry point: `TestIntegrationCanReviewForFansubGroupUserDenyOverridesDelegatedGrant` (`CanReviewForFansubGroup`) |
| override intended for another group | no effect | repository (real Postgres, Plan 03): group-scoped override/history isolation tests in `authz_user_overrides_test.go`; service: `TestPhase137EffectiveRightsOverrideMutationRejectsInactiveOrMissingTarget/foreign_group_membership_not_scoped_here` |
| mutate foreign group's user/membership | blocked | service: `TestPhase137EffectiveRightsOverrideMutationAuthorization/management_capability_does_not_cross_groups` |
| inspect foreign group's rights | blocked | HTTP: `TestGetEffectiveRightsRejectsActorNotAuthorizedForTargetGroup`, `TestGetEffectiveRightsForeignTargetIsNeutralNotFound` |
| read foreign group's override history | blocked | HTTP: `TestListOverrideHistoryRejectsActorNotAuthorizedForTargetGroup`, `TestListOverrideHistoryForeignPairReturnsEmptyNotError` |
| unknown capability | rejected | service: `TestPhase137EffectiveRightsOverrideMutationCatalogValidation/unknown_action_rejected`; HTTP: `TestMutateOverrideMapsUnknownActionAndNotOverridableTo422` |
| `user_overridable=false` | rejected | service: `.../non_overridable_action_rejected`; HTTP: same as above |
| mutation against inactive/non-member target | rejected | service: `TestPhase137EffectiveRightsOverrideMutationRejectsInactiveOrMissingTarget` (disabled/missing/foreign-group cases); HTTP: `TestMutateOverrideMapsTargetNotActiveMemberTo422` |
| manipulated target IDs | BOLA/IDOR blocked | HTTP: `TestMutateOverrideRejectsBodyPathMismatchBeforeDomainMutation` + the foreign-target tests above |
| audit/history insert fails | override mutation rolled back | service (real Postgres): `TestPhase137EffectiveRightsOverrideMutationRollsBackOnHistoryFailure` |
| exact repeat of existing state | NO-OP, no new audit | service: `TestPhase137EffectiveRightsOverrideMutationTransitions/{allow_to_allow,deny_to_deny,none_to_none}_noop` |
| concurrent conflicting mutations | one consistent committed state/history | service (real Postgres, row-locking): `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes` |
| self-modification without management capability | blocked | service: `TestPhase137EffectiveRightsOverrideMutationAuthorization/self_mutation_denied_without_capability` (**new, this plan**) |
| self-modification with legitimate management capability | allowed, audited | service: `.../self_mutation_allowed_via_capability_not_special_casing` (extended this plan with an explicit history-row assertion) |
| Platform-Admin path | separately verified | resolver matrix row above + the new mutation-boundary test above |

Both new subtests were added to
`backend/internal/services/effective_rights_service_test.go` and proven
against real Postgres (`TEAM4S_PHASE137_TEST_DSN`), committed in
`d497329e`.

---

## 3. Pre-existing / deferred failure triage (not Phase-137 regressions)

All 65 failures across `internal/repository`, `internal/handlers`, and
`internal/migrations` were cross-checked against `git diff --stat` for the
complete Phase-137 commit range (`d5773460~1..HEAD`, 31 files touched — see
Section 4) and against `.planning/phases/137-central-effective-rights-resolver-overrides/deferred-items.md`.
None of the failing tests live in a file Phase 137 modified, and the same 65
tests fail identically whether or not `TEAM4S_PHASE137_TEST_DSN` is supplied
(proven by running the exact same matrix once without and once with the DSN
— zero difference in the failing-test set beyond assertion timing).

| Bucket | Count | Root cause | Representative tests |
|---|---:|---|---|
| A | 30 | Missing `TEAM4S_PHASE128_TEST_DSN` env var (test harness fails fast via `t.Fatal`, not `t.Skip` — a documented, locked pre-Phase-137 convention: STATE.md "[Phase 128]: Phase-128 PostgreSQL tests require TEAM4S_PHASE128_TEST_DSN and never fall back to DATABASE_URL.") | `TestMemberPointTotalsPostgres*` (5), `TestLoadContributionBadges*` (4), `TestGetOwnDashboardPostgres*` (5), `TestGetPublicMemberProfilePostgresIncludesTotalPoints` (1), `TestLoadPublicBadgesPostgres*` (5), `TestLoadRoleVolume*Postgres*` (4), `TestPhase128VisibilityFirstReferenceMatrix`, `TestPhase128MemberSlugConcurrentAllocationScenarios` (2, in `internal/repository`), `TestPhase128MigrationLiveUpDownUp`, `TestPhase128MigrationNonEmptyMembersFailsBeforeMutation`, `TestPhase128SlugImmutableAndNicknameStable`, `TestPhase128StoredIdentityConstraints` (4, in `internal/migrations`) |
| B | 9 | `internal/repository`'s Phase-134 live-verification-matrix tests dial a live backend on `192.168.235.196:18093` (a dedicated UAT-matrix port, not this environment's `team4sv30-backend:8092`) — `connect: connection refused` | `TestPhase134Matrix{AnonymousPublicProfile,MissingProfile,HiddenProfileIsIndistinguishableFromMissing,OwnerPreviewOfHiddenProfile,RefreshOnlyOwnerAccess,SparseProfileMatchesManifest,DenseProfileMatchesManifest,ErrorMalformedSlugDoesNotPanic,PaginationHonestAcrossPages}` |
| C | 1 | Missing `TEAM4S_PHASE134_MIGRATION_DSN` env var (same fail-fast convention as bucket A) | `TestPhase134MigrationFreshUpDownProof` (in `internal/migrations`) |
| D | 1 | Pre-existing assertion failure in a file Phase 137 never touched (`fansub_group_app_members_repository_test.go` / `evaluateMemberMutationConflict`, neither of which appears anywhere in the 31-file Phase-137 diff) | `TestEvaluateMemberMutationConflictBlocksLastActiveManager` |
| E | 23 | The documented `internal/handlers` `permissions.loadedCache` nil-cache test-ordering gap (roughly 20 tests across ~10 files never call `Service.LoadCache`, so `roleAllows`/`RoleAllowsAction` always observes a nil cache and denies regardless of real `role_capabilities` data). First flagged pre-existing (not Phase-137-caused) in `137-06-SUMMARY.md` and `deferred-items.md`, re-confirmed unrelated in `137-07-SUMMARY.md` after Plan 07's own handler additions | `TestAdminFansubReleases_*` (4), `TestAnimeProjectNote*` (3), `TestAnimeSegmentAssignment_*` (4), `TestCreateAnimeSegment_RangeAutoAssign*` (3), `TestUpdateAnimeSegment_RangeAutoAssignUsesEffectivePatchedValues`, `TestCreateAnimeThemeAllows/RejectsSegmentManager*` (2), `TestCreateFansubGroupAppMember*` (3), `TestGetEffectiveContributionsForVersion`, `TestListFansubGroupAppMembersAllowsOwnGroupLead`, `TestReleaseVersionMedia_CapabilitiesExposeOwnDelete` |
| F | 1 | Pre-existing source-inspection naming-drift failure, first flagged unrelated in `137-07-SUMMARY.md`'s Issues Encountered | `TestPhase128PublicMemberAccessMatrix` |

**30 + 9 + 1 + 1 + 23 + 1 = 65** — every failing test accounted for.

None of these 65 failures involve any file in Phase 137's own
`files_modified` across all 8 plans (migrations 0150, `permissions` package,
`services/effective_rights_*`, `handlers/admin_effective_rights_*`,
`repository/authz_*`, `testsupport/phase137_postgres.go`, the two shared
OpenAPI contracts, `frontend/src/types/admin-capability.ts`). Buckets A/C/B
are missing local test-environment secrets/servers this executor session
does not have (and is not in scope to provision — they are pre-existing
Phase 128/134 environmental requirements, not Phase 137 deliverables).
Buckets D/E/F are pre-existing code/test-infrastructure gaps predating
Phase 137, already flagged in the phase's own prior summaries.

**Deferred to a future quick-task/plan (not Phase 137 or Phase 138 scope):**
a package-level `TestMain` for `internal/handlers` (mirroring
`internal/repository/testmain_test.go`'s existing precedent) that loads one
canonical, complete role-capability stub once for the whole package, closing
bucket E for good. Recorded in `deferred-items.md` since Plan 137-06.

---

## 4. Non-functional / scope invariant checks

| Invariant | Check | Result |
|---|---|---|
| No SQL query per capability | `evaluateGroupRights` (`effective_rights.go`) iterates `allKnownActions` purely in memory over already-batch-loaded `sources.Roles`/`sources.Overrides`/`sources.SpecializedGrants`; the only `for range action` loop in the resolver/repository files is this one in-memory loop | Confirmed by source read; membership/roles/overrides/specialized-grants are each loaded at most once per `ResolveGroupRights` call |
| No inspector N+1 | `GetEffectiveRights` handler calls `ResolveGroupRights` exactly once per request and projects the full map | Confirmed by source read (`admin_effective_rights_handler.go`) |
| No repeated membership/role/override load in one resolution | `ResolveGroupRights` loads each source category at most once before the evaluation loop | Confirmed by source read |
| No second review-decision engine | `review_grant_provider.go`'s `reviewGrantProvider` only wraps the existing Phase-107 `ResolveActorReviewGrantContext`; no independent allow/deny logic | Confirmed by source read |
| No process-wide/Redis effective-rights cache | `grep -rn "redis\|Redis"` across all Phase-137 source files (`effective_rights.go`, `effective_rights_service.go`, `admin_effective_rights_handler.go`, `authz_user_overrides.go`, `authz_permissions.go`) | Zero matches |
| No new package-level mutable cache var | `grep` for `^var ` / `sync.Map` in the same files | Only sentinel `error` vars in `effective_rights_service.go` (`ErrEffectiveRights*`) — not a cache |
| No Phase-138 UI introduced | Full Phase-137 diff-stat (`d5773460~1..HEAD`) touches only `backend/`, `database/migrations/`, `shared/contracts/`, and one contract-types file `frontend/src/types/admin-capability.ts` | Zero `frontend/src/app/`, `frontend/src/components/` changes |
| No edits to migration 0146 | `git log --oneline -- database/migrations/0146_capability_policy_catalog.{up,down}.sql` | Last touched by Phase-136 commits only (`da121b00`, `4d3409d8`, `ca3af29b`, `51d14e3a`); zero Phase-137 commits |
| No unrelated scope creep | Full 31-file diff-stat reviewed line-by-line (Section 1) | Every file is either a Phase-137 source/test file, the OpenAPI contract mirror pair, or a pre-existing test-fixture file this phase's own D-10 catalog-completeness fixes required to update (documented deviations in Plans 05/06/07) |

---

## 5. Conclusion

Phase 137 is implementation-complete at the backend/API boundary:

- One central, provenance-capable resolver (`permissions.ResolveGroupRights`)
  is the sole decision engine for enforcement (`CanForFansubGroup`,
  `CanForRelease`, `CanForReleaseVersion`, `CanForReleaseVersionMedia`,
  `CanReviewForFansubGroup`) and inspection (`AdminEffectiveRightsHandler.
  GetEffectiveRights`) alike — no second engine exists anywhere in the diff.
- Per-user Allow/Deny overrides are enforced end-to-end against real
  PostgreSQL (`AuthzRepository` wired into both optional resolver
  interfaces since Plan 05), atomically audited (Plan 06), and exposed
  through a group-scoped, BOLA/IDOR-hardened HTTP boundary (Plan 07).
- The complete D01–D10 negative security matrix from `137-CONTEXT.md`
  Section 7 passes through the resolver, service, and HTTP layers, with the
  two remaining coverage holes (self-modification without capability;
  platform-admin bypass at the mutation boundary) closed in this plan.
- `internal/permissions` and `internal/services` — every package Phase 137
  owns — are 100% green, including real-Postgres integration and
  concurrency tests. The full `go test ./...` sweep shows the exact same
  65 pre-existing, environment- or scope-unrelated failures whether or not
  Phase 137's own code is exercised with a live database, fully triaged in
  Section 3.
- `git diff --check`, `go build ./...`, and `go vet ./...` are clean. The
  frontend `admin-capability.ts` contract type compiles cleanly and has no
  `tsc`/`vitest` failures of its own.
- No Redis/process-wide cache, no second review engine, no per-capability
  SQL, no Phase-138 UI, and no edit to migration 0146 were introduced.

**Result: GREEN.** Phase 137 is ready to be marked complete.
