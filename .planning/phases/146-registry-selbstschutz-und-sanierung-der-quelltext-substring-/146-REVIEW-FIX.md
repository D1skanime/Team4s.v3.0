---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
fixed_at: 2026-09-04T20:00:00Z
review_path: .planning/phases/146-registry-selbstschutz-und-sanierung-der-quelltext-substring-/146-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 3
skipped: 1
status: partial
---

# Phase 146: Code Review Fix Report

**Fixed at:** 2026-09-04
**Source review:** .planning/phases/146-registry-selbstschutz-und-sanierung-der-quelltext-substring-/146-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (critical + warning): 4
- Fixed: 3
- Skipped: 1

## Fixed Issues

### CR-01: `member_archive_repository_test.go` contains self-referential fake tests that never execute production code

**Files modified:** `backend/internal/repository/member_archive_repository_test.go`
**Commit:** `26c67214`
**Applied fix:** Replaced all three self-referential fake tests with real executions against
the existing `openMemberArchivePostgres` Postgres fixture, mirroring
`TestArchiveUsesCanonicalStoredMemberSlug`'s established pattern in the same file:

- `TestArchiveVisibilityFilter` → renamed `TestArchiveVisibilityFilterExcludesNonPublicRows`.
  Seeds one row satisfying all four visibility conditions (`m.profile_visibility`,
  `hfgm.visibility`, `ac.is_public_on_member_profile`, `ac.status`) plus four rows each
  violating exactly one condition, then calls the real `repo.SearchMembers` and asserts only
  the fully-public row is returned.
- `TestArchivePaginationBounds` — now seeds 25 real member rows (`archivePageSize + 5`) and
  calls the real `repo.SearchMembers` with `page=1`, `page=2`, `page=0`, a negative page, and
  `page=1001`, asserting the actual returned member counts/offsets/normalization rather than a
  reimplementation of the clamping arithmetic.
- `TestArchiveRoleFilter` — now seeds two members with distinct `anime_contribution_roles`
  entries (`translator` / `editor`) and calls the real `repo.SearchMembers` with
  `ArchiveSearchFilters{RoleCode: "translator"}`, asserting only the matching member is
  returned.

Verified via `go build ./...`, `go vet ./internal/repository/...`, and
`go test ./internal/repository -run 'TestArchive...' -v` against the real Postgres
`team4s_phase128_test` fixture inside the `team4sv30-backend` container — all four
`TestArchive*` tests pass. Note: `pool.Exec` with parameterized multi-statement SQL blocks is
rejected by pgx ("cannot insert multiple commands into a prepared statement"), so the
pagination test's per-row seeding uses three separate `Exec` calls per row instead of one
combined statement.

### WR-01: The Criterion-7 ratchet guard cannot detect the self-referential-literal anti-pattern found in CR-01

**Files modified:** `backend/internal/testquality/source_substring_guard_test.go`
**Commit:** `f05a1715`
**Applied fix:** Two parts, both from the Fix section's "and/or" options:

1. Extended `TestNoNewSourceSubstringTests`'s doc comment with an explicit "SCOPE NOTE"
   naming the self-referential-literal anti-pattern CR-01 found, explaining why
   `reSourceReadCall`-based detection cannot catch it, and pointing to the new guard below.
2. Added a second, independent ratchet guard, `TestNoNewSelfReferentialLiteralAssertions`,
   implementing the heuristic the Fix section proposed: it traces which test-local variables
   are "literal-derived" (built entirely from string/backtick literals, `+` concatenation,
   `[]string{...}` literal slices, and range-loop variables over such slices — via the same
   fixed-point tracing style as the existing `traceSourceDerivedVars`), then flags any
   `strings.Contains`/`assert.Contains`/`require.Contains` call where both the haystack and
   needle are literal-derived (unlike the existing guard, negation is NOT exempted here, since
   a self-authored literal comparison proves nothing about production code regardless of
   negation). Backed by a new, currently-empty
   `LegacyAllowedSelfReferentialLiteralAssertionFiles` ratchet list, following the same
   shrink-only contract as `LegacyAllowedSubstringTestFiles`.

Verified via `go build ./...`, `go vet ./internal/testquality/...`, and
`go test ./internal/testquality/... -v` against the full backend/ corpus inside the
`team4sv30-backend` container: the new guard passes with **zero false positives** across all
existing `_test.go` files (empty exception list, all three `testquality` tests green). Positive
detection was independently sanity-checked with a throwaway test reproducing both original
CR-01 fake-test shapes (multi-fragment concatenation + range-loop needle, and direct two-literal
`Contains`) — both were correctly flagged — while a third throwaway function mimicking a
legitimate real-data `Contains` assertion (literal expected value vs. a value read off a real
`repo.SearchMembers` result) was correctly left unflagged. The throwaway sanity file was removed
before committing; it is not part of the repository.

Known documented limitation (per the new doc comment): the heuristic is line-oriented regex
matching and does not reliably trace multi-line backtick literal assignments or values passed
through intermediate function calls/struct fields/map lookups — it is a targeted ratchet against
CR-01's exact anti-pattern shape, not a general-purpose static prover.

### WR-02: Three permanently-skipped tests in a "security-relevant" locked file leave a real coverage gap for claim-activation role exclusions

**Files modified:** `backend/internal/repository/member_claims_repository_claim_activation_test.go`
**Commit:** `26cb31d0`
**Applied fix:** Implemented all three previously-skipped tests against the real Postgres
`team4s_phase137_test` fixture already established in this file (`testsupport.OpenPhase137Postgres`
+ the same `hist_group_member_roles` column-addition pattern
`TestResolvePendingRolesToActiveUsesCanonicalCatalog` uses), factored through a new shared
`setupClaimActivationFixture` helper to avoid duplicating the member/app-user/fansub-group setup
across all four tests in the file:

- `TestVerifyClaimActivatesRoles_FansubLeadExcluded` — seeds a pending `fansub_lead` historical
  role and asserts it does NOT appear in `fansub_group_member_roles` after
  `ResolvePendingRolesToActive` runs, even though migration 0112 makes `fansub_lead` both
  `assignable=true` and `fansub_group`-context (i.e. it would otherwise pass the generic
  assignable/context guard) — only the production query's explicit
  `role_code NOT IN ('fansub_lead', 'founder')` predicate keeps it excluded.
- `TestVerifyClaimActivatesRoles_FounderExcluded` — the same proof for `founder`.
- `TestVerifyClaimActivatesRoles_NilEnddateRoleActivated` — seeds two otherwise-eligible roles
  (`techadmin` with `ended_date IS NULL`, `gfxler` with a past `ended_date`) and asserts only
  the nil-`ended_date` role activates.

Verified via `go build ./...`, `go vet ./internal/repository/...`, and
`go test ./internal/repository -run 'TestVerifyClaimActivatesRoles|TestResolvePendingRolesToActive' -v`
against the real `team4s_phase137_test_1` fixture — all five tests in the file pass.
Additionally sanity-checked that the two exclusion tests are not vacuous: temporarily removing
the `AND r.role_code NOT IN ('fansub_lead', 'founder')` predicate from the production repository
file inside the running container caused both `FansubLeadExcluded`/`FounderExcluded` tests to
fail as expected, confirming they genuinely exercise the guard rather than passing
unconditionally; the production file was restored immediately after and re-verified green
before committing.

## Skipped Issues

### WR-03: `RoleCapabilityDetail.tsx` duplicates the 3 membership-baseline action codes as an independent frontend literal

**File:** `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx:12-16`
**Reason:** The REVIEW.md's recommended fix — deriving the filter from an API-provided
`protected`/`baseline` field on `CapabilityMatrixActionState` computed server-side from
`permissions.MembershipBaselineActionCodes` — requires a backend contract change (new Go field,
OpenAPI schema update in `shared/contracts/`, and a matching TypeScript type update in
`frontend/src/types/admin-capability.ts`'s `RoleActionState`/`ActionEntry`). Confirmed via
inspection that no such field currently exists on `RoleActionState`/`ActionEntry`. This spans
backend and frontend contract surfaces simultaneously and is not safely reducible to a single,
narrowly-scoped, atomically-committable fix within this review-fix pass — it is a genuine
follow-up feature/contract change, not a local code correction. Recorded here as a tracked
follow-up rather than forced into a risky same-commit backend+frontend contract edit.
**Original issue:** `membershipBaselineCodes` in `RoleCapabilityDetail.tsx` hardcodes the same
3 action codes (`fansub_group.members.view`, `fansub_group_media.view`,
`fansub_group_media.upload`) as `permissions.MembershipBaselineActionCodes` in
`backend/internal/permissions/permissions.go:420`, with no compile-time or runtime check tying
the two together — a future change to the Go source of truth without a matching TS edit would
cause the admin UI to silently mis-render which actions are shown as protected for the
`group_member` pseudo-role.

---

_Fixed: 2026-09-04_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
