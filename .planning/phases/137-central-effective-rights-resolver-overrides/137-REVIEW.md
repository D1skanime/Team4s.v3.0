---
phase: 137-central-effective-rights-resolver-overrides
reviewed: 2026-08-21T22:10:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - backend/cmd/server/admin_routes.go
  - backend/cmd/server/main.go
  - backend/internal/handlers/admin_capability_contract_test.go
  - backend/internal/handlers/admin_effective_rights_handler.go
  - backend/internal/handlers/admin_effective_rights_handler_test.go
  - backend/internal/handlers/app_auth_test.go
  - backend/internal/handlers/capability_policy_contract.go
  - backend/internal/handlers/phase136_contract_parity_test.go
  - backend/internal/handlers/phase136_policy_yaml_ts_contract_test.go
  - backend/internal/migrations/phase137_effective_rights_overrides_test.go
  - backend/internal/permissions/capability_registry_test.go
  - backend/internal/permissions/effective_rights.go
  - backend/internal/permissions/effective_rights_integration_test.go
  - backend/internal/permissions/effective_rights_test.go
  - backend/internal/permissions/permissions.go
  - backend/internal/permissions/permissions_reload_test.go
  - backend/internal/permissions/permissions_test.go
  - backend/internal/permissions/review_grant_provider.go
  - backend/internal/repository/authz_permissions.go
  - backend/internal/repository/authz_permissions_group_rights_test.go
  - backend/internal/repository/authz_user_overrides.go
  - backend/internal/repository/authz_user_overrides_test.go
  - backend/internal/services/effective_rights_concurrency_test.go
  - backend/internal/services/effective_rights_service.go
  - backend/internal/services/effective_rights_service_test.go
  - backend/internal/testsupport/phase137_postgres.go
  - database/migrations/0150_effective_rights_overrides.down.sql
  - database/migrations/0150_effective_rights_overrides.up.sql
  - frontend/src/types/admin-capability.ts
  - shared/contracts/admin-capabilities.yaml
  - shared/contracts/openapi.yaml
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 137: Code Review Report

**Reviewed:** 2026-08-21T22:10:00Z
**Depth:** standard
**Files Reviewed:** 31
**Status:** issues_found

## Summary

This is a fresh review of the full Phase 137 file set, including the four gap-closure
plans (137-09..137-12) executed on top of the original eight plans. I re-verified every
finding from the prior `137-REVIEW.md` (dated before the gap-closure round) against the
current code and confirmed the gap-closure plans genuinely fixed what they claimed:

- **WR-01** (stale "production wiring not yet live" doc comment on `effective_rights.go`)
  — fixed by Plan 137-11 (`c710c4c8`). The header now accurately cites Plan 137-05.
- **WR-02** (inconsistent/lossy audit logging around `MutateOverride`'s post-commit path)
  — fixed by Plan 137-09 (`0ce156d6`). Verified by direct diff read: the generic success
  audit now writes unconditionally before the best-effort enrichment, all four previously
  silent reject branches plus the body/path-mismatch BOLA guard now call the new
  `auditMutationRejected` helper, and a post-commit enrichment failure now degrades
  `ActivationStatus` to `"pending"` instead of returning a non-2xx response for an
  already-committed write.
- **WR-03** (missing `400` response docs for the two GET effective-rights endpoints) —
  fixed by Plan 137-10 (`c4c6cf9a`). Confirmed present in both `openapi.yaml` (lines
  4200-4204, 4332-4336) and `admin-capabilities.yaml`.
- **WR-06** (gofmt misalignment in `effective_rights_service.go`'s error-sentinel block)
  — fixed by Plan 137-11 (`7d804f11`). Confirmed via `gofmt -l` inside the backend
  container: clean for every Phase-137 file except `permissions.go`, whose remaining
  `gofmt -l` hits are pre-existing single-line `if { ... }` blocks at unrelated lines
  (`LoadFansubGroupCatalog`/`AllowedActionsForRole`/`roleAllows`, from commits predating
  Phase 137), exactly as 137-12-SUMMARY.md's own investigation documented — not a new
  defect and correctly out of this phase's scope.
- **GAP-06** (contribution-role fallback vs. `user_deny`) was correctly left open as a
  human decision by Plan 137-12; per the task instructions this is not re-flagged here.

`gofmt -l` and `go vet` were re-run directly against the running backend container for
every file in scope and are clean (aside from the pre-existing, out-of-scope
`permissions.go` lines noted above). The core precedence engine
(`evaluateGroupRights`/`ResolveGroupRights`), the transactional `MutateOverride` write
path (authorize → lock membership → validate policy → mutate → append history → commit,
with `defer Rollback`), and the BOLA/IDOR-safe scoping in
`AuthzUserOverridesRepository`/`AdminEffectiveRightsHandler` all still hold up under
manual tracing and are backed by real fixture/integration/concurrency tests.

Two carried-over quality findings from the prior review were **not** touched by any of
the four gap-closure plans and remain open (WR-04, WR-05 below, renumbered). I also found
one new, previously unflagged contract/implementation mismatch introduced in Plan 137-06
and never reconciled with the shared OpenAPI contracts (WR-06 below). No BLOCKER-level
correctness or security defect was found.

## Warnings

### WR-04: Dead, untested `testsupport` validator functions for Phase 137

**File:** `backend/internal/testsupport/phase137_postgres.go:39-51`
**Issue:** `validatePhase137DatabaseName` and `validatePhase137SchemaName` are defined but
never called anywhere in the repository (confirmed via `grep -rn` across `backend/`: the
only two occurrences are their own definitions). `openPhasePostgres` consults the raw
`*regexp.Regexp` patterns (`phase137DatabasePattern`/`phase137SchemaPattern`) directly,
not these wrapper functions. Every sibling phase test-support file that defines this same
wrapper pair (`phase106_postgres.go`, `phase107_postgres.go`, `phase117_postgres.go`,
`phase128_postgres.go`, `phase135_postgres.go`) has a companion `_test.go` exercising the
wrapper's accept/reject boundary; no `phase137_postgres_test.go` exists, so these two
functions are both dead code and have zero direct test coverage of the regex boundaries
they claim to enforce. This finding is unchanged from the prior review and was not in
scope for any of Plans 137-09 through 137-12.
**Fix:** Either delete the two unused functions, or add
`backend/internal/testsupport/phase137_postgres_test.go` mirroring the sibling phases'
accept/reject test coverage for the database/schema name patterns.

### WR-05: `CapabilityOverrideMutationRequest.Effect` has no custom unmarshal validation, unlike `Reason`

**File:** `backend/internal/handlers/capability_policy_contract.go:28-33,154-160`, `backend/internal/handlers/admin_effective_rights_handler.go:522-534`
**Issue:** `CapabilityOverrideReason` has a custom `UnmarshalJSON` that validates its
`Category` at decode time (`capability_policy_contract.go:102-110`), but
`CapabilityOverrideEffect` (a sibling typed string with the same "closed enum from an
external client" shape) has none. An arbitrary string value for `effect` decodes
successfully and is only rejected later in `overrideMutationKindFromRequest`
(`admin_effective_rights_handler.go:522-534`) with a generic `badRequest`. Not
exploitable (the fallback correctly rejects unknown values before touching the mutation
service), but it remains an inconsistency between two enum-shaped request fields in the
same DTO. Unchanged from the prior review; not addressed by any gap-closure plan.
**Fix:** Either add a matching `UnmarshalJSON` validator to `CapabilityOverrideEffect` for
symmetry, or document why `Reason` gets decode-time validation and `Effect` does not.

### WR-06 (new): Shared OpenAPI contract still documents a platform-admin reason exemption that `MutateOverride` deliberately does not implement

**File:** `shared/contracts/openapi.yaml:9086-9091`, `shared/contracts/admin-capabilities.yaml:736-742`, `backend/internal/services/effective_rights_service.go:324-346`
**Issue:** Both shared contract files describe `CapabilityOverrideMutationRequest` as: *"The
server requires reason for non-platform administrators; authenticated platform
administrators may omit it."* This description text predates Plan 137-06 (confirmed via
`git log -p`) and was never updated when Plan 137-06 introduced
`validateOverrideMutationReason`, which enforces the reason requirement **uniformly for
every actor, including platform admins** — a deliberate, documented choice
(`effective_rights_service.go:324-329`'s own comment, and 137-06-SUMMARY.md's
`key-decisions` block, state this explicitly: "D06's reason requirement is enforced
uniformly for every actor (including platform admins), even though migration 0146's own
CHECK constraint ... only requires it for non-platform-admin actors"). Migration 0146's DB
constraint (`chk_user_group_capability_override_history_reason_required`) does allow a
platform-admin actor to omit the reason at the schema level, matching the contract text —
but the Go service layer is stricter than both the DB and the published contract. No
existing test (`effective_rights_service_test.go`'s
`platform_admin_bypasses_group_management_capability` subtest, line ~475-493) exercises a
platform admin *omitting* the reason; every platform-admin test case in the suite still
supplies a `ReasonCategory`, so this contract/implementation gap has zero test coverage in
either direction. A Phase 138 (or external API consumer) implementation built strictly
against the published OpenAPI/admin-capabilities contract — which explicitly says platform
admins may omit the reason — will predictably receive a `422 reason_required` rejection
for every real platform-admin override mutation that omits it, contradicting the
documented API contract. This is a functional/contract-accuracy defect, not a security
regression (the code fails toward the *stricter* behavior, so there is no permission
bypass), but it is a genuine mismatch between the single source of truth the review is
asked to check consistency against and the actual, intentionally-hardened server
behavior.
**Fix:** Either (a) update both `shared/contracts/openapi.yaml` and
`shared/contracts/admin-capabilities.yaml`'s `CapabilityOverrideMutationRequest`
description (and any mirrored TS/doc text) to state that Phase 137 requires a reason for
every actor including platform admins, or (b) if the platform-admin exemption is actually
desired product behavior, relax `validateOverrideMutationReason` to match migration
0146's own CHECK constraint and add a regression test proving a platform admin can omit
the reason. Either way, add a test that actually exercises "platform admin omits reason"
so the chosen behavior has direct coverage.

## Info

### IN-01: Duplicate `ResolveActorReviewGrantContext` DB round-trip per `CanReviewForFansubGroup` call

**File:** `backend/internal/permissions/permissions.go:508-532`
**Issue:** `CanReviewForFansubGroup` calls `reviewResolver.ResolveActorReviewGrantContext`
directly (line 512) to obtain `MembershipID`/`MemberID` for the legacy
`ReviewAuthorizationResult` shape, then calls `s.ResolveGroupRights` (line 528), which
internally re-invokes the same query a second time via `review_grant_provider.go`'s
`SpecializedGrantProvider`. `permissions_test.go`'s diff for this phase explicitly
documents this as a deliberate, known consequence rather than an oversight. Unchanged
since the prior review; flagged again only for visibility.
**Fix:** No action required if the duplication is an accepted, deliberate tradeoff; if a
future plan revisits this, `MembershipID`/`MemberID` could be threaded through from a
single resolved `ReviewGrantContext` shared between the direct call and the
specialized-grant provider.

### IN-02: `LockTargetMembership`'s `FOR UPDATE OF fgm` clause is a no-op outside a transaction when reused for plain reads

**File:** `backend/internal/handlers/admin_effective_rights_handler.go:166-184`, `backend/internal/repository/authz_user_overrides.go:135-166`
**Issue:** `AdminEffectiveRightsHandler.loadTargetActorState` (used by both
`GetEffectiveRights` and `MutateOverride`'s post-commit enrichment) calls
`h.targetRepo.LockTargetMembership` (which issues `SELECT ... FOR UPDATE OF fgm`) as a
plain read, using the repository constructed directly on the pool
(`repository.NewAuthzUserOverridesRepository(dbPool)` in `main.go`), not inside an
explicit transaction. The row lock is real but is released immediately at the end of the
implicit single-statement autocommit transaction, so it has no observable locking effect
there — it is only meaningful when the same method is reused inside
`EffectiveRightsService`'s explicit transaction. Harmless, but reuses a lock-flavored
query name for a plain-read call site, which can confuse a future reader who assumes it
provides concurrency protection for the inspection/enrichment paths too. Unchanged since
the prior review.
**Fix:** No functional change needed; consider a comment at the `loadTargetActorState`
call sites clarifying that the `FOR UPDATE` clause is inert here and only load-bearing
inside the mutation transaction.

---

_Reviewed: 2026-08-21T22:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
