---
phase: 137-central-effective-rights-resolver-overrides
reviewed: 2026-08-21T19:41:57Z
depth: standard
files_reviewed: 30
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
  warning: 6
  info: 2
  total: 8
status: issues_found
---

# Phase 137: Code Review Report

**Reviewed:** 2026-08-21T19:41:57Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Phase 137 introduces the central `ResolveGroupRights` precedence engine, wires it into
every existing public `Can*` entry point, adds the transactional
`EffectiveRightsService.MutateOverride` write path, and exposes a thin
inspection/mutation/history HTTP surface (`AdminEffectiveRightsHandler`). The core
precedence logic (`evaluateGroupRights`), the DB-backed resolvers
(`ResolveActorGroupMembership`, `ResolveActorUserOverrides`), and the transactional
mutation service are well tested (unit fixtures, Postgres integration tests, and a real
pessimistic-locking concurrency proof) and the D01–D10 design constraints from
137-CONTEXT.md appear to be honored correctly in the paths I traced by hand (platform-admin
non-deniable bypass, dormant-override visibility, user_deny beating role/specialized
grants, BOLA-safe group/user scoping, atomic history-append-with-rollback).

No BLOCKER-level correctness or security defect was found in the logic paths reviewed.
The findings below are quality/consistency gaps: a stale file-level doc comment that now
contradicts the shipped wiring, inconsistent/incomplete audit logging on the mutation
error paths, an OpenAPI contract gap for an actually-reachable 400 response, dead/untested
test-support code, and a `gofmt` violation.

## Warnings

### WR-01: `effective_rights.go`'s file-level doc comment is now stale and misleading

**File:** `backend/internal/permissions/effective_rights.go:22-38`
**Issue:** The file-level comment states as current fact: *"the concrete resolver backing
production Service instances (`*repository.AuthzRepository`) does not yet implement the
two new optional interfaces this file introduces ... Until a later plan wires them,
`ResolveGroupRights` degrades to the pre-Phase-137 role-only shape ... real per-user
override enforcement is not yet live end-to-end."* This is no longer true in the reviewed
snapshot: `backend/internal/repository/authz_permissions.go:315-391` implements both
`ResolveActorGroupMembership` and `ResolveActorUserOverrides`, carries compile-time
assertions (`var _ permissions.GroupRightsMembershipResolver = (*AuthzRepository)(nil)`,
etc.), and is proven against real Postgres by
`authz_permissions_group_rights_test.go` (including
`TestPhase137AuthzRepositoryImplementsGroupRightsOptionalInterfaces`, which explicitly
"closes the exact gap 137-04-SUMMARY.md flagged"). A future maintainer reading only this
file's header will conclude that per-user overrides are not enforced in production, which
is false and could lead to someone re-introducing the "known gap" workaround or
distrusting a working security control.
**Fix:** Update the doc comment to state that the gap was closed in Plan 137-05 (point to
`authz_permissions.go`'s `ResolveActorGroupMembership`/`ResolveActorUserOverrides`) instead
of describing it as still open.

### WR-02: `MutateOverride` audit logging is inconsistent across error paths and can be lost after a successful, already-committed mutation

**File:** `backend/internal/handlers/admin_effective_rights_handler.go:252-305`, `:340-372`
**Issue:** Two related gaps:
1. In `writeMutationError`, only `services.ErrEffectiveRightsCapabilityDenied` writes an
   `auditPermissionDenied` entry (line 345-351). The other four mapped errors
   (`ErrEffectiveRightsTargetNotActiveMember`, `ErrEffectiveRightsActionUnknown`,
   `ErrEffectiveRightsActionNotOverridable`, `ErrEffectiveRightsReasonRequired`) return an
   HTTP error with no audit trail at all. An actor probing foreign/inactive
   `target_user_id`/`action_code` combinations for a group they *do* manage (BOLA-style
   enumeration) leaves no trace in the generic admin audit log.
2. On the success path, `h.auditLogRepo.Write(...)` (line 292) is the last statement before
   `c.JSON(http.StatusOK, ...)`, executed only after `resolveTargetActor` (line 266) and a
   second `ResolveGroupRights` call (line 270) both succeed. `mutationSvc.MutateOverride`
   has already committed the transaction (including the immutable
   `user_group_capability_override_history` row) by this point. If the post-mutation
   re-resolution fails (transient DB error, or the target's membership row changing between
   commit and re-read), the handler returns a 404/500 to the caller for an operation that
   already succeeded, and the generic audit log entry for that successful mutation is never
   written — even though the domain-level history table row exists. This produces a
   confusing "operation failed" response for a change that is already live, and a silent
   gap in the generic audit trail (`CLAUDE.md` calls out "Admin actions need audit
   attribution by user ID" as a project-level observability requirement).
**Fix:** Write the generic audit-log entry unconditionally right after
`mutationSvc.MutateOverride` returns success (using the command's own before/after data
rather than the re-resolved effective-right), and add an audit entry (with an appropriate
non-"denied" or "rejected" outcome) for the remaining `writeMutationError` branches so BOLA
probing attempts are traceable too.

### WR-03: OpenAPI/admin-capabilities contracts omit the reachable `400` response for the two GET effective-rights endpoints

**File:** `shared/contracts/admin-capabilities.yaml:259-313,381-436`, `shared/contracts/openapi.yaml:4165-4219,4286-4341`
**Issue:** `AdminEffectiveRightsHandler.parseGroupAndTarget`
(`backend/internal/handlers/admin_effective_rights_handler.go:96-108`) calls `badRequest`
(HTTP 400) when `:id` or `:appUserId` fails to parse as a positive integer — this is
reachable for both `GET .../effective-rights` and
`GET .../capability-overrides/history`. Both contract files document only
`401/403/404/500` for the first endpoint and `401/403/500` for the second, omitting `400`
entirely (the `PUT .../capability-overrides` mutation endpoint *does* document `400`
correctly). `phase136_contract_parity_test.go`/`admin_capability_contract_test.go` compare
the two YAML files against each other and against the Go/TS DTOs, so this gap is
consistent across both contract files and would not be caught by the existing parity
tests, since neither test asserts against actual handler status-code behavior.
**Fix:** Add a `400` response entry (malformed `id`/`appUserId` path parameter) to both
GET endpoints in both `shared/contracts/admin-capabilities.yaml` and
`shared/contracts/openapi.yaml`.

### WR-04: Dead, untested `testsupport` validator functions for Phase 137

**File:** `backend/internal/testsupport/phase137_postgres.go:39-51`
**Issue:** `validatePhase137DatabaseName` and `validatePhase137SchemaName` are defined but
never called anywhere in the repository (`openPhasePostgres` in `phase106_postgres.go`
consults the raw `*regexp.Regexp` patterns directly, not these wrapper functions). Every
sibling phase test-support file that defines this same wrapper pair
(`phase106_postgres.go`, `phase107_postgres.go`, `phase117_postgres.go`,
`phase128_postgres.go`, `phase135_postgres.go`) has a companion `_test.go` that exercises
the wrapper's accept/reject boundary cases (e.g. `phase107_postgres_test.go`,
`phase106_postgres_test.go`). No `phase137_postgres_test.go` exists, so
`validatePhase137DatabaseName`/`validatePhase137SchemaName` are both dead code and have
zero direct test coverage of the regex boundaries they claim to enforce, unlike every
other phase in this family.
**Fix:** Either delete the two unused functions, or add
`backend/internal/testsupport/phase137_postgres_test.go` mirroring the sibling phases'
accept/reject test coverage for the database/schema name patterns.

### WR-05: `CapabilityOverrideMutationRequest.Effect` has no custom unmarshal validation, unlike `Reason`

**File:** `backend/internal/handlers/capability_policy_contract.go:154-160`, `backend/internal/handlers/admin_effective_rights_handler.go:415-427`
**Issue:** `CapabilityOverrideReason` has a custom `UnmarshalJSON` that validates its
`Category` at decode time (`capability_policy_contract.go:102-110`), but
`CapabilityOverrideEffect` (a sibling typed string with the same "closed enum from an
external client" shape) has none. An arbitrary string value for `effect` decodes
successfully and is only rejected later in `overrideMutationKindFromRequest`
(`admin_effective_rights_handler.go:415-427`) with a generic `badRequest`. This is not
exploitable (the fallback correctly rejects unknown values before touching the mutation
service), but it is an inconsistency in how the two enum-shaped request fields are
validated within the same DTO, and a copy/paste of the `Reason` pattern would have been
zero-cost consistency.
**Fix:** Either add a matching `UnmarshalJSON` validator to `CapabilityOverrideEffect` for
symmetry, or document why `Reason` gets decode-time validation and `Effect` does not.

### WR-06: `effective_rights_service.go`'s error-variable block is not `gofmt`-aligned

**File:** `backend/internal/services/effective_rights_service.go:80-87`
**Issue:** The `var (...)` block declaring
`ErrEffectiveRightsMutationInvalid`/`ErrEffectiveRightsCapabilityDenied`/`ErrEffectiveRightsActionUnknown`/`ErrEffectiveRightsActionNotOverridable`/`ErrEffectiveRightsTargetNotActiveMember`/`ErrEffectiveRightsReasonRequired`
has inconsistent column alignment: five of the six `=` signs line up at one column, but
`ErrEffectiveRightsTargetNotActiveMember`'s `=` (the longest identifier) breaks the
alignment instead of re-aligning the whole block, which is what `gofmt` produces. This
indicates the file was hand-edited after the last `gofmt` pass and would show up as a
diff under `gofmt -l`/CI formatting checks (this repo's other reviewed files are
consistently `gofmt`-aligned).
**Fix:** Run `gofmt -w backend/internal/services/effective_rights_service.go`.

## Info

### IN-01: Duplicate `ResolveActorReviewGrantContext` DB round-trip per `CanReviewForFansubGroup` call

**File:** `backend/internal/permissions/permissions.go:472-545`
**Issue:** `CanReviewForFansubGroup` calls `reviewResolver.ResolveActorReviewGrantContext`
directly (line 512) to obtain `MembershipID`/`MemberID` for the legacy
`ReviewAuthorizationResult` shape, then calls `s.ResolveGroupRights` (line 528), which
internally re-invokes the same `ResolveActorReviewGrantContext` query a second time via
`review_grant_provider.go`'s `SpecializedGrantProvider`. `permissions_test.go`'s diff for
this phase explicitly documents this ("`resolver.reviewContextCalls` goes from 1 to 2") as
a deliberate, known consequence rather than an oversight. Flagged here only for visibility
since it is a duplicated round-trip per review-authorization check; per the review's
scope, this is a performance/duplication observation and not scored as a correctness
defect.
**Fix:** No action required if the duplication is an accepted, deliberate tradeoff (as the
test comment states); if a follow-up plan revisits this, `MembershipID`/`MemberID` could be
threaded through from a single resolved `ReviewGrantContext` shared between the direct call
and the specialized-grant provider.

### IN-02: `LockTargetMembership`'s `FOR UPDATE OF fgm` clause is a no-op outside a transaction when reused for plain reads

**File:** `backend/internal/handlers/admin_effective_rights_handler.go:144`, `backend/internal/repository/authz_user_overrides.go:135-166`
**Issue:** `AdminEffectiveRightsHandler.resolveTargetActor` calls
`h.targetRepo.LockTargetMembership` (which issues `SELECT ... FOR UPDATE OF fgm`) as a
plain read for both `GetEffectiveRights` and post-mutation re-resolution in
`MutateOverride`, using the repository constructed directly on the pool
(`repository.NewAuthzUserOverridesRepository(dbPool)` in `main.go`), not inside an explicit
transaction. The row lock is real but is released immediately at the end of the implicit
single-statement autocommit transaction, so it has no observable locking effect there — it
is only meaningful when the same method is reused inside `EffectiveRightsService`'s
explicit transaction. This is harmless but reuses a lock-flavored query name for a
plain-read call site, which can be confusing to a future reader who assumes it provides
concurrency protection for the inspection/history paths too.
**Fix:** No functional change needed; consider a comment at the `resolveTargetActor` call
site clarifying that the `FOR UPDATE` clause is inert here and only load-bearing inside the
mutation transaction.

---

_Reviewed: 2026-08-21T19:41:57Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
