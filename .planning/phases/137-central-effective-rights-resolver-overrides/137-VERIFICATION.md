---
phase: 137-central-effective-rights-resolver-overrides
verified: 2026-08-21T21:50:48Z
status: passed
score: 11/11 must-haves verified (5 ROADMAP success criteria + 6 UAT gaps GAP-01..GAP-06)
overrides_applied: 0
re_verification:
  previous_status: passed (original 8-plan implementation, 137-VERIFICATION.md dated before gap-closure round)
  previous_score: 5/5 roadmap success criteria
  gaps_closed:
    - "GAP-01: post-commit-only failure could turn an already-committed successful override write into a 404/500 response"
    - "GAP-02: 4 of 5 mapped reject branches plus the body/path-mismatch BOLA/IDOR guard wrote zero generic audit entries; success-path audit could be silently lost on a downstream read failure"
    - "GAP-03: GET effective-rights and GET override-history endpoints did not document their real, reachable 400 response in either contract file"
    - "GAP-04: effective_rights.go's file-level doc comment falsely claimed per-user override production wiring was not yet live"
    - "GAP-05: effective_rights_service.go's error-sentinel var block had gofmt-misaligned formatting"
  gaps_remaining: []
  regressions: []
human_verification: []
---

# Phase 137: Central Effective-Rights Resolver & Overrides Verification Report

**Phase Goal:** Authorized decisions and administrative explanations use one central resolver that safely applies group-scoped user denies/allows and exposes complete provenance.
**Verified:** 2026-08-21T21:50:48Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plans 137-09..137-12 closing GAP-01 through GAP-06 from 137-UAT.md)

## Scope of This Verification Pass

This is a fresh, complete re-verification of Phase 137 covering all 12 plans (the original
8-plan implementation plus the 4-plan gap-closure round). The original 8-plan implementation
was already verified `passed` (5/5 ROADMAP success criteria) in a prior `137-VERIFICATION.md`
dated before the gap-closure round; that file has been fully superseded by this report. The
focus of this pass is: (1) confirm the 6 gaps in `137-UAT.md` are genuinely closed by reading
the actual current code (not SUMMARY.md claims), and (2) re-confirm the 5 ROADMAP success
criteria still hold after the gap-closure edits.

## Goal Achievement

### ROADMAP Success Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | An authorized caller can inspect every effective capability for a real user/group pair and see all granting roles, direct allows, direct denies, and the decisive reason. | VERIFIED | `GetEffectiveRights` (admin_effective_rights_handler.go:190-218) calls `ResolveGroupRights` once and projects `EffectiveRightState` (GrantingRoles, UserAllow, UserDeny, SpecializedGrants, DecisiveSource, ReasonCode) unchanged since original implementation; `TestGetEffectiveRightsReturnsCompleteProvenanceForAuthorizedActor` passes. |
| 2 | Runtime authorization and the inspector produce the same answer for role OR, deny-over-allow precedence, scoped overrides, disabled actors, and platform-admin bypass. | VERIFIED | `internal/permissions` full suite (54/54 tests per 137-12-SUMMARY.md, re-confirmed 100% pass in this verification pass) still routes every group-scoped `Can*` entry point through the same `ResolveGroupRights`; GAP-06's investigation confirmed (Fall C, comment-only, zero control-flow diff) that this precedence engine itself was not touched by the gap-closure round. |
| 3 | An authorized admin can idempotently grant or deny one allowed capability for an active member in exactly one group, while foreign memberships, invalid scopes, and unknown actions fail neutrally. | VERIFIED | `MutateOverride`'s D08 body/path-mismatch guard, target-membership validation, and action-catalog validation are unchanged by the gap-closure round (GAP-01/02 only touch the tail of the function, strictly after `mutationSvc.MutateOverride` returns); confirmed via direct diff read against commit `aed884e8` (137-07). |
| 4 | Every override mutation commits atomically with an immutable actor/target/context/before/after audit record, and forced audit or concurrency failures cannot leave partial authorization state. | VERIFIED | `EffectiveRightsService.MutateOverride`'s transactional commit boundary (lines ~279-304) is byte-identical except for whitespace (`git diff` since 137-07 is whitespace-only in `effective_rights_service.go`, confirmed directly). GAP-01's fix operates strictly downstream of this commit; it cannot and does not touch it. |
| 5 | Automated negative coverage proves deny precedence, cross-group BOLA/IDOR resistance, invalid capability rejection, and protected direct-access enforcement. | VERIFIED | `go test ./internal/handlers -run 'EffectiveRights\|Override\|BOLA\|IDOR'` passes for every Phase-137-owned test (23 subtests observed); `go test ./internal/permissions/... -count=1` passes in full. The only failures in the handlers package (`TestAnimeSegmentAssignment_*`, 3 tests) are a documented, pre-existing, unrelated `permissions.loadedCache` test-ordering gap (confirmed independently reproducible in isolation, unrelated to any file this phase touches — see Anti-Patterns/Deferred section below). |

**Score:** 5/5 ROADMAP success criteria verified.

### UAT Gap-Closure Truths (137-09..137-12)

| # | Gap | Status | Evidence |
|---|-----|--------|----------|
| 1 | GAP-01 — a successful override commit can no longer surface as an HTTP error | VERIFIED | Read `admin_effective_rights_handler.go:290-345` directly: response is built entirely from the already-returned `result`/`req` before any further read; `loadTargetActorState`/`ResolveGroupRights` enrichment failures only set `ActivationStatus = Pending`, never call `c.JSON` with an error status. `TestMutateOverridePostCommitTargetLookupFailureDegradesToPending` and `TestMutateOverridePostCommitResolveFailureDegradesToPending` both pass (ran live, not just SUMMARY-claimed). |
| 2 | GAP-02 — every mutation attempt (success + 5 reject types incl. BOLA/IDOR guard) is now audited | VERIFIED | Read the handler directly: unconditional `h.auditLogRepo.Write` call sits immediately after the domain commit, before enrichment (line 318); `auditMutationRejected` is called from all 4 previously-silent `writeMutationError` branches and from the body/path-mismatch guard (lines 246-256, 393-422). `TestMutateOverrideWritesUnconditionalSuccessAudit`, `TestMutateOverrideAuditsBodyPathMismatchReject`, `TestMutateOverrideAuditsRejectBranches` (4 subtests) all pass live. |
| 3 | GAP-03 — 400 responses documented on both GET effective-rights endpoints | VERIFIED | Confirmed directly in both `shared/contracts/admin-capabilities.yaml` (lines 294-298, 427-431) and `shared/contracts/openapi.yaml` (lines 4199-4203 and equivalent history block) via direct grep/read — not just SUMMARY claim. `TestPhase136ContractParity` and related contract tests pass live. |
| 4 | GAP-04 — stale "production wiring not live" comment corrected | VERIFIED | Read `effective_rights.go:1-41` directly: the file now states "Production wiring closed (Plan 137-05)" and "closed in Plan 137-02/137-07," matching real code state (`authz_permissions.go`'s `AuthzRepository` does implement both resolver interfaces, confirmed by grep). No forbidden phrases ("does not yet implement", "not yet live end-to-end", etc.) remain. |
| 5 | GAP-05 — gofmt misalignment fixed in effective_rights_service.go | VERIFIED | `docker compose exec team4sv30-backend gofmt -l internal/services/effective_rights_service.go` printed nothing (clean), run live in this verification pass. `git diff` for this file since 137-07 is whitespace-only. |
| 6 | GAP-06 — contribution-role vs user_deny precedence investigated and dispositioned | VERIFIED (Fall C, correctly executed per 137-UAT.md's own protocol) | Read `permissions.go:608-651` directly: `git diff` since 137-08 on this function is comment-only (Step 3's unconditional loop still runs before the `ReasonCodeUserDeny` check at line 644 — zero control-flow change). New test `TestIntegrationCanForReleaseVersionContributionRoleFallbackNotBlockedByUserDeny` (read directly, ran live, passes) actually exercises the conflict scenario and asserts `Allowed=true` — locking today's real behavior. `137-12-SUMMARY.md` contains the literal required line "DECISION REQUIRED — Contribution Role vs User Deny" with a clear two-option framing for a human decision. This is correctly treated as an intentional, protocol-compliant open item — not a phase execution failure — per 137-UAT.md's own explicit instruction not to resolve Fall C unilaterally. |

**Score:** 6/6 UAT gaps verified closed (5 fixed + 1 correctly dispositioned as decision-required).

### Deviation Note

None of the gap-closure plans' documented deviations (137-09's commit-granularity split, gofmt drift fix; 137-11's host/container gofmt sync workaround) represent scope creep or unverified claims — all are cosmetic/commit-mechanics notes confirmed consistent with the actual diffs read during this verification.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/handlers/admin_effective_rights_handler.go` | GAP-01 response safety + GAP-02 audit coverage | VERIFIED | Read in full; matches plan/summary claims exactly. 612 lines (see Anti-Patterns note below re: CLAUDE.md's 450-line guidance). |
| `backend/internal/handlers/admin_effective_rights_handler_test.go` | New regression tests for both gaps | VERIFIED | 10 new tests confirmed present and passing live. |
| `backend/internal/handlers/admin_capability_contract_test.go` | Updated pending-status contract assertion | VERIFIED | Regex assertion requires "137"+"pending"+"active"; passes live. |
| `shared/contracts/admin-capabilities.yaml` / `openapi.yaml` | 400 docs + CapabilityActivationStatus pending description | VERIFIED | Confirmed via direct read/grep in both files. |
| `frontend/src/types/admin-capability.ts` | Mirrored TS doc comment | VERIFIED | Confirmed via direct read. |
| `backend/internal/permissions/effective_rights.go` | Corrected doc comment (GAP-04) | VERIFIED | Confirmed via direct read; comment-only diff since 137-08. |
| `backend/internal/services/effective_rights_service.go` | gofmt-clean (GAP-05) | VERIFIED | `gofmt -l` clean, confirmed live. |
| `backend/internal/permissions/permissions.go` | GAP-06 Fall C comment | VERIFIED | Comment-only diff confirmed; `gofmt -l` flags 3 pre-existing single-line-if issues at unrelated lines (413-439, 866), confirmed via `git blame` to predate Phase 137 (commit `2207c082b`, 2026-08-20) — correctly out of this phase's scope, matching 137-REVIEW.md's own finding. |
| `backend/internal/permissions/effective_rights_integration_test.go` | New GAP-06 regression test | VERIFIED | `TestIntegrationCanForReleaseVersionContributionRoleFallbackNotBlockedByUserDeny` confirmed present, passes live, actually exercises the conflict (populates `contributionRoles`, unlike the pre-existing test). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `MutateOverride` (success path) | `h.auditLogRepo.Write` | unconditional call before enrichment | WIRED | Confirmed at line 318, before the enrichment block at line 334. |
| `writeMutationError`'s 4 reject branches | `auditMutationRejected` | direct call in each case | WIRED | Confirmed at lines 394-419. |
| Body/path-mismatch guard | `auditMutationRejected` | direct call before `c.JSON` | WIRED | Confirmed at lines 247-251. |
| `admin-capabilities.yaml` 400 blocks | `openapi.yaml` 400 blocks | cross-file parity test | WIRED | `TestPhase136ContractParity` passes; both files independently confirmed to contain the 400 block. |
| `permissions.go` Step-3 comment | `137-12-SUMMARY.md`'s DECISION REQUIRED section | prose cross-reference | WIRED | Comment explicitly cites the SUMMARY section by name; SUMMARY contains the literal required line. |

### Behavioral Spot-Checks / Test Execution (run live in this verification pass, not trusted from SUMMARYs)

| Command | Result | Status |
|---------|--------|--------|
| `go test ./internal/permissions/... -count=1` | `ok` (all tests pass) | PASS |
| `go test ./internal/handlers -run 'EffectiveRights\|Override\|BOLA\|IDOR' -v -count=1` | 23 Phase-137-owned subtests PASS; 3 unrelated `TestAnimeSegmentAssignment_*` tests FAIL (documented pre-existing gap, reproduced independently in isolation) | PASS (Phase-137 scope) |
| `go test ./internal/handlers -run 'TestPhase136ContractParity\|Phase136\|EffectiveRightState\|CapabilityOverrideSchemasUnchanged' -v -count=1` | all PASS | PASS |
| `go test ./internal/services/... -count=1` | `ok` (DSN-gated Phase137 integration tests skip cleanly, no DSN set) | PASS |
| `go test ./internal/repository/... -run 'Phase137\|EffectiveRights\|Override\|AuthzUserOverrides\|GroupRights' -v -count=1` | all PASS or cleanly SKIP (no TEST_DSN) | PASS |
| `go test ./internal/migrations/... -run 'Phase137' -v -count=1` | `TestPhase137MigrationSourceContract` PASS; DSN-gated tests SKIP cleanly | PASS |
| `gofmt -l` on all 6 gap-closure-touched Go files | Clean except `permissions.go` (3 pre-existing, unrelated hits confirmed via git blame to predate Phase 137) | PASS (in-scope files clean) |
| `git diff --check` on all gap-closure-touched files | No whitespace errors | PASS |
| `npx tsc --noEmit` (frontend) | Zero admin-capability/EffectiveRight-related errors | PASS |

Note on DB-integration/DSN-gated tests: this verification pass did not spin up a throwaway Postgres with `TEST_DSN` set, so the Phase-137 Postgres-backed integration subtests (repository/services/migrations) skip cleanly rather than executing against real data, matching the original 137-VERIFICATION.md's own recorded pattern for these suites at the time of the original phase (services), though the original verification did additionally run `migrations -run 'Phase137' -count=1` against a fresh DB. None of the gap-closure plans (137-09..12) touch migration SQL, repository queries, or the transactional service commit boundary — every gap-closure change is either response-construction/audit logic strictly downstream of the existing commit (GAP-01/02), documentation-only (GAP-03/04), whitespace-only (GAP-05), or comment-only with a new in-memory-fake-backed test (GAP-06) — so re-running the full DB-integration suite was not necessary to validate this round's changes, but is noted here for completeness rather than silently assumed equivalent.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|--------------|----------------|--------------|--------|----------|
| CAP-01 | 137-02/03/04/07/08/10 | Full effective-capability list visible to admin | SATISFIED | `GetEffectiveRights` handler + REQUIREMENTS.md marked Complete/Phase 137. |
| CAP-02 | 137-02/03/07/08/10 | Granting roles/allows/denies/decisive reason visible | SATISFIED | `EffectiveRightState` provenance fields; REQUIREMENTS.md Complete. |
| CAP-03 | 137-04/05/08/12 | Same server-side precedence for display and enforcement | SATISFIED | `ResolveGroupRights` central resolver; GAP-06 investigation confirms this precedence engine's group-scoped logic is unchanged and untouched by the gap-closure round. |
| CAP-05 | 137-01/02/03/06/07/08/09 | Admin can allow/deny one capability in one group for an active member | SATISFIED | `MutateOverride`; REQUIREMENTS.md Complete. |
| CAP-06 | 137-01/03/06/07/08/09 | Serverside validation of target membership/scope/action, neutral rejection | SATISFIED | `writeMutationError`'s validation branches, now also fully audited (GAP-02). |
| CAP-07 | 137-01/02/03/06/07/08/09 | Idempotent, atomic, audited grant/revoke | SATISFIED | Transactional commit boundary unchanged; GAP-01/02 close the response-safety and audit-completeness gaps around this same guarantee. |
| QUAL-03 | 137-04/05/08/09/11/12 | Automated negative coverage: deny precedence, BOLA/IDOR, invalid capability, self-review, direct access | SATISFIED | `internal/permissions` + `internal/handlers` negative-matrix and BOLA/IDOR tests pass; GAP-06's new test extends this coverage to the previously-unexercised contribution-role conflict scenario. |

No orphaned requirements: cross-referencing `.planning/REQUIREMENTS.md`'s "Phase 137" mapping (CAP-01, CAP-02, CAP-03, CAP-05, CAP-06, CAP-07, QUAL-03) against the union of every plan's `requirements:` frontmatter field shows a complete, one-to-one match — every ID mapped to Phase 137 appears in at least one plan, and every plan's declared requirement appears in REQUIREMENTS.md's Phase 137 mapping. (CAP-04 is correctly mapped to Phase 136, not 137, and is out of this phase's scope.)

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/internal/handlers/admin_effective_rights_handler.go` | whole file, 612 lines | Exceeds CLAUDE.md's "Production code files should stay at or below 450 lines" guidance | WARNING | This file was already over the limit before the gap-closure round (505 lines as of Plan 137-07); the gap-closure round's GAP-01/GAP-02 fixes added ~107 more lines (audit helper, enrichment refactor, tests-adjacent logic), pushing it further past the threshold. Not flagged in either the original 137-VERIFICATION.md or the fresh 137-REVIEW.md. Does not block the phase goal (all behavior is correct and tested), but is a real, currently-unaddressed project convention violation that a future phase/plan should split (e.g. extracting the audit-helper functions or the projection helpers into a sibling file). |
| `shared/contracts/openapi.yaml` / `admin-capabilities.yaml` | `CapabilityOverrideMutationRequest` description (openapi.yaml:9086-9091, admin-capabilities.yaml:736-742) | Contract text says platform admins "may omit" the override-mutation reason; `validateOverrideMutationReason` (effective_rights_service.go:324-343) requires a reason from every actor unconditionally, with zero test coverage of a platform admin omitting it in either direction | WARNING (advisory, per task instructions) | This is `137-REVIEW.md`'s new WR-06 finding, confirmed still present in the current codebase by direct read. It predates the gap-closure round (introduced in Plan 137-06) and was not addressed by 137-09..12 (correctly out of their scope — GAP-01 through GAP-06 do not name this issue). Not a security regression (the code fails toward the stricter behavior). Not phase-blocking on its own, but should be tracked as a follow-up: either relax the contract text to match the stricter server behavior, or relax the server to match the contract, plus add the missing test either way. |
| `backend/internal/testsupport/phase137_postgres.go:39-51` | Dead, untested validator functions (WR-04) | INFO | Carried over from the prior review, untouched by this round, correctly out of scope for GAP-01..06. |
| `backend/internal/handlers/capability_policy_contract.go` / `admin_effective_rights_handler.go:522-534` | `CapabilityOverrideEffect` lacks the same decode-time `UnmarshalJSON` validation `Reason` has (WR-05) | INFO | Carried over from the prior review, untouched by this round, not exploitable (rejected later via `badRequest`), correctly out of scope. |

### Deferred / Pre-Existing, Out-of-Scope Items (not gaps of this verification)

- `TestAnimeSegmentAssignment_UpsertOverrideRejectsEndBeforeStart`, `TestAnimeSegmentAssignment_UpsertOverrideRejectsUnassignedReleaseVersion`, `TestAnimeSegmentAssignment_DeleteOverrideNotFoundWhenNoOverrideExists` fail in the `internal/handlers` package due to a documented, pre-existing `permissions.loadedCache` test-ordering gap (`deferred-items.md`, from Plan 137-06). Independently reproduced in this verification pass: each fails identically when run in isolation (`go test ./internal/handlers -run '<name>'`), confirming it is a structural test-infrastructure gap unrelated to any file touched by Phase 137 or its gap-closure round.
- `internal/repository`'s full-package run shows unrelated `TestPhase134Matrix*` failures caused by a missing live HTTP dependency on port 18093 (an external service not running in this environment) — confirmed unrelated to Phase 137 (different feature area, different phase, network-dependent test).
- `permissions.go`'s remaining `gofmt -l` hits (3 single-line `if { ... }` blocks) predate Phase 137 (commit `2207c082b`, 2026-08-20), confirmed via `git blame` in this verification pass, matching 137-REVIEW.md's own claim.

### GAP-06 Disposition — Explicitly Not a Verification Failure

GAP-06 was dispositioned by Plan 137-12 as **Fall C** ("Unterlagen widersprechen sich" /
genuinely unaddressed by `137-CONTEXT.md`), exactly per `137-UAT.md`'s own investigate-first
protocol, which explicitly states that Fall C requires: no unilateral fix, preservation of
current runtime behavior, and a clearly flagged `DECISION REQUIRED` line in the closing report.
All three requirements are met:
1. No runtime change — confirmed via direct `git diff` (comment-only in `permissions.go`).
2. Current behavior preserved and now regression-tested (new test proves and locks `Allowed=true`
   for the fallback-vs-user_deny conflict).
3. `137-12-SUMMARY.md` contains the exact literal line "DECISION REQUIRED — Contribution Role vs
   User Deny" in its own clearly-labeled section, with a two-option framing for a human decision-maker.

This verifier treats GAP-06 as **correctly and completely executed per its own governing
protocol** — it is not counted as a phase failure or an open gap of this verification. It is,
however, a genuine unresolved product/security decision that should be surfaced to the user:
whether a stored `user_deny` should also defeat `CanForReleaseVersion`'s independent
contribution-role fallback, or whether that fallback should be formally documented as an
intentional, named exception.

## Human Verification Required

None. All success criteria and all six UAT gaps are verifiable directly from source code and
automated test execution; no UI/UX/real-time/external-service behavior specific to this
gap-closure round requires human testing beyond the existing GAP-06 product decision (which is
a decision request, not a verification gap).

## Gaps Summary

No gaps. All 6 items from `137-UAT.md` are closed exactly as claimed by their SUMMARYs, verified
by direct source reading and live test execution rather than by trusting the SUMMARY text. GAP-06
was correctly left as an explicit, protocol-compliant human decision rather than a defect. Two
pre-existing quality findings (WR-04, WR-05) remain untouched and out of scope, as they were
before this round. One new advisory-level finding (WR-06, contract/implementation reason-required
mismatch for platform admins) surfaced by the fresh code review is confirmed present in the
current codebase but is judged non-blocking (no security regression, code fails toward the
stricter/safer behavior) — recommended as a near-term follow-up, not a phase re-open. The
`admin_effective_rights_handler.go` 450-line guidance overage (pre-existing, worsened by this
round) is flagged as a WARNING for a future split, not a blocker to this phase's goal.

---

*Verified: 2026-08-21T21:50:48Z*
*Verifier: Claude (gsd-verifier)*
