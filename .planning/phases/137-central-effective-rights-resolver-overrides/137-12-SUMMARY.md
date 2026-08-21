---
phase: 137-central-effective-rights-resolver-overrides
plan: 12
subsystem: auth
tags: [go, permissions, authorization, gap-closure, review-delegation]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides (Plans 137-01..137-11)
    provides: ResolveGroupRights central resolver, group-scoped Can* entry points, effective-rights inspector/mutation/history HTTP boundary
provides:
  - GAP-06's contribution-role-vs-user_deny precedence ambiguity explicitly investigated and dispositioned (Fall C)
  - A regression test that actually exercises the Step2-user_deny/Step3-would-grant conflict (the pre-existing test never did)
  - A corrected code comment that cites real evidence instead of an unsupported "override-blind by design" claim
  - An unresolved human decision, explicitly flagged, for a future phase/plan to close
affects: [138-effective-rights-inspector-ux, future-phase-permission-work]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/permissions/effective_rights_integration_test.go

key-decisions:
  - "GAP-06 investigated and dispositioned as Fall C: 137-CONTEXT.md's D01 precedence list and Section 2 never mention contribution roles as a resolver source category at all; the prior 'override-blind by design' framing is not a CONTEXT.md decision, so no runtime change was made and the ambiguity is explicitly flagged as DECISION REQUIRED for a human."

patterns-established: []

requirements-completed: [CAP-03, QUAL-03]

# Metrics
duration: ~10min
completed: 2026-08-21
---

# Phase 137 Plan 12: GAP-06 Contribution-Role-vs-User-Deny Investigation Summary

**Investigated GAP-06's contribution-role-vs-user_deny precedence question against 137-CONTEXT.md and dispositioned it as Fall C (unresolved design question) — no runtime change, an evidence-based comment correction, a new locking regression test, and an explicit human-decision flag.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2 completed
- **Files modified:** 2 (`permissions.go`, `effective_rights_integration_test.go`)

## Accomplishments

- Re-investigated GAP-06 strictly per 137-UAT.md's investigate-first Fall A/B/C protocol, using the actual `137-CONTEXT.md` text (not the plan's own framing) as the deciding evidence.
- Confirmed via direct grep that `137-CONTEXT.md` contains zero occurrences of the string "contribution" anywhere — D01's precedence list (Platform Admin → disabled → no membership → user_deny → user_allow → role grant → specialized grant → no grant) and Section 2's nine binding Phase-136 rules never name "contribution role" as a resolver source category, neither requiring nor exempting it from user_deny precedence.
- Confirmed via direct read of `137-05-SUMMARY.md` that the existing "override-blind by design" framing for `CanForReleaseVersion`'s Step 3 traces only to that plan's own text: "matching the plan's minimal-edit scope of leaving contribution roles as their own domain" — an executor's scope choice, not a cited `137-CONTEXT.md` decision ID. The existing test's own doc comment repeats the identical "per the plan's minimal-edit scope" framing, with no CONTEXT.md citation either.
- Determined this is **Fall C**: the ambiguity is genuinely unaddressed by `137-CONTEXT.md`, not resolved (Fall A) or confirmed-exempt (Fall B) by it.
- Left `CanForReleaseVersion`'s and `canForReleaseVersionGroupRole`'s control flow **completely unchanged** (no enforcement fix — Fall A does not apply, no confirmed exception documented — Fall B does not apply).
- Rewrote the code comment directly above Step 3 in `CanForReleaseVersion` to state plainly that `137-CONTEXT.md`'s D01 does not address contribution-role precedence, that this is an unresolved design question rather than a confirmed exception, and that current behavior (a contribution role can still grant despite a stored `user_deny`) is preserved pending a human decision.
- Added `TestIntegrationCanForReleaseVersionContributionRoleFallbackNotBlockedByUserDeny`, a new regression test in `effective_rights_integration_test.go` that populates `integrationFakeResolver.contributionRoles` with `RoleProjectLead` (a role code that independently satisfies `roleAllows(RoleProjectLead, ActionFansubGroupMediaUpload)` per the test package's `roleMatrixStubData()`) while the same fake resolver's group-role step is denied by a stored `user_deny` for that exact action (mirroring the pre-existing `TestIntegrationCanForReleaseVersionGroupRoleStepUserDenyOverridesRoleGrant`'s setup exactly). This is the first test that actually reaches the conflict scenario the pre-existing test's empty `contributionRoles` never exercised.
- Proved and locked today's real, unchanged behavior: `CanForReleaseVersion` returns `Allowed=true`, `ReasonCode=ReasonAllowed`, `MatchedRole=RoleProjectLead` — the contribution-role fallback is **not** currently blocked by Step 2's stored `user_deny`.
- Confirmed the pre-existing `TestIntegrationCanForReleaseVersionGroupRoleStepUserDenyOverridesRoleGrant` test continues to pass unchanged (it never populates `contributionRoles`, so Step 3 never runs in that scenario).
- Ran the full `internal/permissions` package suite: 54/54 tests pass (up from 137-VERIFICATION.md's recorded 34-test baseline, reflecting accumulated coverage from Plans 137-09/10/11/12), zero regressions. `go vet ./internal/permissions/...` reports no issues.
- Confirmed `git diff backend/internal/permissions/permissions.go` is comment-only (zero control-flow/logic diff anywhere in the file), matching Fall B/C's acceptance criteria exactly.
- Confirmed `gofmt -l` reports no issues for either touched file — the pre-existing `gofmt -l` findings elsewhere in `permissions.go` (single-line `if { return ... }` blocks at lines ~416-417, ~439, ~874, from commits `2207c082b` 2026-08-20 and `0240f5472` 2026-06-18) are pre-existing, untouched by this plan's diff, and out of this plan's scope per the deviation-rules scope boundary.

## Task Commits

Each task was committed atomically:

1. **Task 1: Investigate GAP-06, determine Fall A/B/C, implement the chosen disposition** - `175cda8a` (fix)
2. **Task 2: Full permissions-package regression sweep and disposition documentation** - documentation-only task, folded into this SUMMARY and the plan-metadata commit; no additional source changes were required since Fall C makes no runtime change.

**Plan metadata:** (recorded in the next commit — `docs(137-12): complete plan`)

## Files Created/Modified

- `backend/internal/permissions/permissions.go` - `CanForReleaseVersion`'s Step-3 comment rewritten to state the Fall C disposition and cite the actual evidence (137-CONTEXT.md's silence on contribution roles); zero control-flow change.
- `backend/internal/permissions/effective_rights_integration_test.go` - New regression test `TestIntegrationCanForReleaseVersionContributionRoleFallbackNotBlockedByUserDeny` proving and locking today's actual behavior.

## Decisions Made

- **GAP-06 dispositioned as Fall C.** Evidence: (1) `137-CONTEXT.md`'s D01 precedence list and Section 2's nine binding Phase-136 rules never mention "contribution role" anywhere (confirmed by direct grep — zero matches); (2) `137-05-SUMMARY.md`'s "override-blind by design" framing is explicitly self-attributed to "the plan's minimal-edit scope," not to any `137-CONTEXT.md` decision ID; (3) the pre-existing regression test's own doc comment repeats the identical unsupported framing. Since neither Fall A's "unambiguously requires" nor Fall B's "unambiguously confirms... an explicit, named exception documented in CONTEXT.md itself" condition is met, Fall C is the only evidence-supported outcome. No runtime behavior was changed; the ambiguity is surfaced below for a human decision rather than resolved unilaterally, per 137-UAT.md's explicit instruction.

## DECISION REQUIRED — Contribution Role vs User Deny

`CanForReleaseVersion`'s Step 3 (the independent contribution-role fallback, `ListActorContributionRolesForVersion` + `roleAllows`) can currently grant access to a release-version-scoped action even when Step 2 (`canForReleaseVersionGroupRole`, the central `ResolveGroupRights`-backed group-context path) has already produced a decisive `user_deny` for that same actor/action. This is a real, reachable enforcement path today (proven by this plan's new test, `TestIntegrationCanForReleaseVersionContributionRoleFallbackNotBlockedByUserDeny`).

`137-CONTEXT.md`'s D01 precedence list and its Section 2 binding Phase-136 rules never mention "contribution role" as a resolver source category at all — neither requiring a stored `user_deny` to defeat it (which would mandate Fall A's enforcement fix) nor confirming it as an intentional, named exception (which would confirm Fall B). The only prior justification for the current "override-blind" behavior was an executor's own minimal-edit-scope note in `137-05-SUMMARY.md`, not a product decision.

A human must decide whether:
- (a) a stored `user_deny` should also defeat this contribution-role fallback (would require a future plan to move the `groupRoleResult.ReasonCode == ReasonCodeUserDeny` short-circuit before Step 3's loop), or
- (b) contribution roles should remain an intentionally separate, override-blind domain (would require this decision to be recorded as an explicit, named exception in a CONTEXT.md-equivalent document so future audits do not re-flag it as unresolved).

No implementation decision was made here per 137-UAT.md's explicit instruction not to resolve this unilaterally.

## Deviations from Plan

None - plan executed exactly as written. The plan itself anticipated and explicitly permitted the Fall C outcome ("the most likely outcome per 137-PATTERNS.md's own analysis, but this plan's execution must independently confirm it rather than assume it") — this plan's own investigation independently confirmed that outcome using the required evidence sources (137-CONTEXT.md full text, 137-05-SUMMARY.md's own text, the existing test's doc comment).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GAP-06 is closed as "decision-required" per 137-UAT.md's own disposition vocabulary (fixed / verified-no-change / decision-required / blocked) — this is the last of the six gaps (GAP-01 through GAP-06) tracked by 137-UAT.md, closing this gap-closure run (Plans 137-09 through 137-12).
- The open "DECISION REQUIRED — Contribution Role vs User Deny" question above should be surfaced to the user before any future phase touches `CanForReleaseVersion`'s contribution-role fallback, and is not a blocker for Phase 138 (the effective-rights inspector/UX phase), which does not touch this code path.
- Full `internal/permissions` suite: 54/54 tests pass, `go vet` clean, `gofmt -l` clean for both touched files.

---
*Phase: 137-central-effective-rights-resolver-overrides*
*Completed: 2026-08-21*

## Self-Check: PASSED

- FOUND: backend/internal/permissions/permissions.go
- FOUND: backend/internal/permissions/effective_rights_integration_test.go
- FOUND: .planning/phases/137-central-effective-rights-resolver-overrides/137-12-SUMMARY.md
- FOUND commit: 175cda8a (Task 1)
- FOUND commit: 35a50f84 (Task 2 / SUMMARY)
