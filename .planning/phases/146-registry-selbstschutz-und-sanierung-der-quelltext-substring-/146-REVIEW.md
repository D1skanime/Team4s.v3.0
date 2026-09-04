---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
reviewed: 2026-09-04T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - backend/internal/handlers/admin_capability_handler.go
  - backend/internal/handlers/admin_capability_handler_test.go
  - backend/internal/handlers/admin_content_fansub_notes_test.go
  - backend/internal/handlers/admin_content_release_theme_assets_test.go
  - backend/internal/handlers/admin_content_release_version_media_replace_test.go
  - backend/internal/handlers/admin_content_release_version_media_test.go
  - backend/internal/handlers/dashboard_me_handler_test.go
  - backend/internal/handlers/fansub_test.go
  - backend/internal/handlers/member_media_upload_defaults_test.go
  - backend/internal/handlers/public_member_access_matrix_test.go
  - backend/internal/handlers/role_catalog_router_integration_test.go
  - backend/internal/handlers/testmain_test.go
  - backend/internal/permissions/permissions.go
  - backend/internal/repository/hist_group_member_roles_repository.go
  - backend/internal/repository/hist_group_member_roles_whitelist_test.go
  - backend/internal/repository/member_archive_repository_test.go
  - backend/internal/repository/member_claims_repository_claim_activation_test.go
  - backend/internal/repository/member_point_totals_repository_test.go
  - backend/internal/repository/membership_baseline_registry_test.go
  - backend/internal/repository/point_ledger_repository_test.go
  - backend/internal/repository/release_version_media_cross_package_test.go
  - backend/internal/repository/release_version_media_replace_repository_test.go
  - backend/internal/repository/release_version_media_repository_test.go
  - backend/internal/repository/role_catalog_repository_test.go
  - backend/internal/repository/role_definitions_context_test.go
  - backend/internal/testquality/security_relevant_test_files.go
  - backend/internal/testquality/source_substring_guard_test.go
  - frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx
  - frontend/src/app/admin/roles/RoleCapabilityDetail.tsx
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 146: Code Review Report

**Reviewed:** 2026-09-04
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

This phase's core mutation-path code (`admin_capability_handler.go`'s new registry-self-protection
guards, `permissions.go`'s `MembershipBaselineActionCodes`) is correct and well-guarded: the
platform-admin bypass is untouched, `MembershipBaselineActionCodes` is a pure addition, the
Grant/Revoke guards for `group_member` fire in the right order (before D-07 lockout on revoke,
after `IsCapabilityBearingRole` on grant), and the accompanying handler tests exercise both guards
with real `httptest` calls rather than source inspection. `LoadCapabilityRoles`'s absence of a
blanket "NOT reserved" filter is confirmed intentional and untouched, matching this phase's stated
design.

However, the phase's actual mission — eliminating "false assurance" tests that assert behavior
without executing it — is not fully met. `member_archive_repository_test.go`, one of the 20 files
Phase 146 designates as security-relevant and targets for full remediation, still contains three
tests that never call the production repository at all: they assert self-referential, hand-copied
SQL/arithmetic literals against themselves. This is not merely an incomplete remediation of the
original os.ReadFile-substring pattern — it is a distinct, undetected instance of the exact
anti-pattern the whole phase exists to eliminate, and Plan 146-13's own ratchet guard
(`source_substring_guard_test.go`) cannot catch it because that guard only looks for
`os.ReadFile(...".go")` calls. Two further quality issues (a frontend duplicated action-code
literal and a corrupted-German-text test fixture) round out the findings below.

## Critical Issues

### CR-01: `member_archive_repository_test.go` contains self-referential fake tests that never execute production code

**File:** `backend/internal/repository/member_archive_repository_test.go:120-150, 152-184, 186-210`

**Issue:** This file is one of the 20 files frozen into `testquality.SecurityRelevantTestFiles`
(`backend/internal/testquality/security_relevant_test_files.go:35`), i.e. Phase 146's own locked
list of files that must be fully remediated away from "false assurance" test patterns (Criteria
5/6/7). `TestArchiveUsesCanonicalStoredMemberSlug` does this correctly (calls the real
`SearchMembers`, then only uses `os.ReadFile` for a sanctioned absence check). But three other
tests in the same file provide zero assurance about the actual `SearchMembers` implementation:

- `TestArchiveVisibilityFilter` (lines 120-150) never calls `SearchMembers` or reads the real
  source file. It builds `knownMainQueryFragment`/`knownJoinFragment`/`knownContribFragment` as
  **hand-typed literal strings** claimed to mirror the production SQL, concatenates them into
  `allFragments`, then asserts `requiredConditions` are `strings.Contains`-present in
  `allFragments` — i.e. it checks that a string the test itself wrote contains substrings the test
  itself wrote. This passes unconditionally regardless of what `SearchMembers`'s SQL actually
  contains.
- `TestArchiveRoleFilter` (lines 186-210) does the identical thing for the role-filter EXISTS
  subquery: `builtFragment` is a hardcoded literal, and the assertions check `strings.Contains`
  against that same literal.
- `TestArchivePaginationBounds` (lines 152-184) re-implements the page/offset clamping algorithm
  inline in the test (`if p < 1 { p = 1 }; if p > 1000 { p = 1000 }; offset := (p - 1) *
  archivePageSize`) instead of calling any exported repository function, then asserts its own
  reimplementation against itself. A real off-by-one bug in the production clamping logic would
  never be caught by this test.

None of these three tests would fail if `SearchMembers`'s actual SQL predicates, its role filter,
or its pagination clamping were broken, removed, or changed to be wrong — they only prove the test
file is internally consistent with itself. This directly undermines the phase's stated purpose
(CLAUDE.md's Teststil-Regel: assertions "müssen den geprüften Code tatsächlich AUSFÜHREN") and
specifically violates it in a file the phase's own roadmap counts as already covered.

**Fix:** Replace all three tests with real executions against the `openMemberArchivePostgres`
fixture already present in this file, mirroring `TestArchiveUsesCanonicalStoredMemberSlug`'s
pattern, e.g.:
```go
func TestArchiveVisibilityFilterExcludesNonPublicRows(t *testing.T) {
    pool := openMemberArchivePostgres(t)
    ctx := context.Background()
    // seed one row that satisfies every condition, and one row each that violates exactly
    // one of profile_visibility/hfgm.visibility/ac.is_public_on_member_profile/ac.status,
    // then assert repo.SearchMembers only returns the fully-public row.
    repo := NewMemberArchiveRepository(pool)
    result, err := repo.SearchMembers(ctx, ArchiveSearchFilters{}, 1)
    require.NoError(t, err)
    require.Len(t, result.Members, 1)
}
```
and similarly drive `TestArchiveRoleFilter` through `ArchiveSearchFilters{RoleCode: "..."}` against
seeded rows with and without that role, and drive `TestArchivePaginationBounds` through
`repo.SearchMembers` with `page=0`, a negative page, and `page=1001` to prove the real clamping
behavior, not a copy of it.

## Warnings

### WR-01: The Criterion-7 ratchet guard cannot detect the self-referential-literal anti-pattern found in CR-01

**File:** `backend/internal/testquality/source_substring_guard_test.go:200-234`

**Issue:** `hasPresenceStyleSourceSubstringAssertion` (and the whole `TestNoNewSourceSubstringTests`
guard it backs) only flags tests that call `os.ReadFile` on a literal `".go"`-suffixed path and
then assert presence via `Contains` on a variable traced back to that read. It has no detection for
the pattern demonstrated in CR-01: hardcoding a "known fragment" string *inline in the test* (never
touching the real source file at all) and asserting `Contains` against that self-authored literal.
Since this pattern doesn't call `os.ReadFile`, `reSourceReadCall` never matches and the function
returns `false` unconditionally for such tests. This means the exact category of test Phase 146 was
created to eliminate can silently re-enter the codebase (as it already has in
`member_archive_repository_test.go`) without ever tripping the ratchet, defeating the "no new
source-substring tests" guarantee `TestNoNewSourceSubstringTests`'s doc comment claims to provide.

**Fix:** Extend the scope note on `TestNoNewSourceSubstringTests`/`SecurityRelevantTestFiles` to
name this second anti-pattern explicitly, and/or add a heuristic detector for "assert Contains
where both the haystack and needle are string literals declared in the same test function" — a
`Contains(t, hardcodedLiteralVar, hardcodedLiteralOrSlice)` pattern where the haystack variable's
only assignment is a raw string/backtick literal (not a call into the package under test) is a
reasonably specific, low-false-positive signal for this class of fake test.

### WR-02: Three permanently-skipped tests in a "security-relevant" locked file leave a real coverage gap for claim-activation role exclusions

**File:** `backend/internal/repository/member_claims_repository_claim_activation_test.go:128-138`

**Issue:** This is a brand-new file added in this phase and is itself one of the 20 files locked
into `SecurityRelevantTestFiles`. It contains:
```go
func TestVerifyClaimActivatesRoles_FansubLeadExcluded(t *testing.T) {
    t.Skip("RED Wave 0 - wird in Plan 04 durch echte DB-Tests ersetzt: fansub_lead darf nicht automatisch aktiv werden")
}
func TestVerifyClaimActivatesRoles_FounderExcluded(t *testing.T) {
    t.Skip("RED Wave 0 - wird in Plan 04 durch echte DB-Tests ersetzt: founder darf nicht automatisch aktiv werden")
}
func TestVerifyClaimActivatesRoles_NilEnddateRoleActivated(t *testing.T) {
    t.Skip("RED Wave 0 - wird in Plan 04 durch echte DB-Tests ersetzt: Rolle ohne Enddatum wird aktiv uebernommen")
}
```
These three tests assert nothing and always pass via `t.Skip`. The message references a "Plan 04"
that is not part of this phase's plan numbering, strongly suggesting this is stale boilerplate
copied from an earlier phase (137) and never followed up on. The behaviors these stubs describe are
security-relevant: whether `fansub_lead`/`founder` (both non-assignable/historical roles) are
correctly excluded from auto-activation on claim verification, and whether a role with no
`ended_date` correctly activates. `TestResolvePendingRolesToActiveUsesCanonicalCatalog` in the same
file does cover the assignable-vs-non-assignable-context distinction generically (via
`techadmin`/`translator`), but does not specifically prove `fansub_lead`/`founder` (both of which
have a `fansub_group` or `group_history` context and could plausibly slip through a
context-only guard) are excluded, nor does anything in this file prove the nil-`ended_date`
activation path.

**Fix:** Either implement the three skipped tests against the real Postgres fixture already
established in this file (seed `fansub_lead`/`founder` pending historical roles and assert they do
not appear in `fansub_group_member_roles` after `ResolvePendingRolesToActive`; seed a role with
`ended_date IS NULL` and assert it does activate), or remove the stale skipped stubs entirely if the
behavior is already proven adequately elsewhere and document that decision instead of leaving
"RED Wave 0" placeholders in shipped code.

### WR-03: `RoleCapabilityDetail.tsx` duplicates the 3 membership-baseline action codes as an independent frontend literal

**File:** `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx:12-16`

**Issue:**
```ts
const membershipBaselineCodes = new Set([
  "fansub_group.members.view",
  "fansub_group_media.view",
  "fansub_group_media.upload",
])
```
This hardcodes the exact same 3 action codes as `permissions.MembershipBaselineActionCodes` in
`backend/internal/permissions/permissions.go:420`, whose own doc comment explicitly calls out this
precise risk: *"Previously this exact 3-element literal was duplicated across the migration seed,
this validator, and **a TS filter**, risking silent drift."* This file is that TS filter, and the
duplication remains unresolved by Phase 146 — there is no compile-time or runtime check tying this
frontend `Set` to the backend source of truth. If a future change adds/removes a baseline action in
Go (`MembershipBaselineActionCodes`) without a matching edit here, the UI will silently mis-render:
either hiding a newly-baseline action's row for the pseudo-role (so it can never be toggled back on
after being incorrectly shown to non-baseline UI) or leaving a de-baselined action's switch hidden
behind the "protected" filter when it should now be freely editable.

**Fix:** Derive this filtering from the API payload instead of a client-side literal — e.g. have
the backend's `CapabilityMatrixActionState` carry a `protected: bool` (or `baseline: bool`) field
computed server-side from `permissions.MembershipBaselineActionCodes`, and have
`RoleCapabilityDetail.tsx` filter/display on `action.protected` rather than re-declaring the code
list. This removes the drift risk entirely instead of just documenting it.

## Info

### IN-01: Corrupted German text in a test helper violates CLAUDE.md's Sprachqualität rule

**File:** `backend/internal/handlers/public_member_access_matrix_test.go:349`

**Issue:** `writePhase128TestUnavailable` writes:
```go
c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "Profil nicht verf?gbar"}})
```
The `?` is a literal ASCII question mark (byte `0x3F`), not the intended `ü` — confirmed via
hexdump, this is not a UTF-8 mojibake artifact but a flat typo/corruption. CLAUDE.md's
Sprachqualität rule explicitly names "Go-Response-Strings" as in-scope and forbids ASCII
substitutions in user-facing strings; this is arguably worse (an unreadable `?`, not even a
readable `ue` fallback). It is confined to a synthetic reference-test helper — the real production
string (`"Profil nicht verfügbar"`, correctly spelled) is separately defined and correctly asserted
against in `neutralUnavailableBody` at line 173 and in the real-handler test — so this does not
affect test reliability or production behavior, only source-code text quality.

**Fix:** Correct the literal to `"Profil nicht verfügbar"` for consistency with `neutralUnavailableBody`.

### IN-02: Unused test helper function

**File:** `backend/internal/handlers/public_member_access_matrix_test.go:359-361`

**Issue:** `phase128MatrixLabel` is defined but never called anywhere in the repository (verified via
repo-wide grep). It compiles cleanly (Go does not flag unused package-level functions) but is dead
code.

**Fix:** Remove `phase128MatrixLabel`, or use it in place of the inline `route.name+" / "+test.name`
string concatenation already used throughout `TestPhase128PublicMemberAccessMatrixReference` for
consistency.

---

_Reviewed: 2026-09-04_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
