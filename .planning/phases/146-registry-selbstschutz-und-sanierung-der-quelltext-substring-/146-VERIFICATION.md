---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
verified: 2026-09-04T21:00:00Z
status: gaps_found
score: 7/8 roadmap success criteria verified
overrides_applied: 0
gaps:
  - truth: "Criterion 4 — Die drei Baseline-Action-Codes haben eine einzige autoritative Quelle; die verbleibenden Verwendungen leiten sich davon ab oder sind durch einen Test gegen Auseinanderdriften gesichert."
    status: partial
    reason: >
      The Go side is fully fixed: permissions.MembershipBaselineActionCodes is now the single
      Go source, validateMembershipBaselineRegistryPresence derives from it, and
      TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights proves
      (against real Postgres) that migration 0160's seed matches this Go source exactly. However
      the frontend usage explicitly named in the phase's own D-05 decision record
      (146-CONTEXT.md) — RoleCapabilityDetail.tsx's `membershipBaselineCodes` Set — remains an
      independent hardcoded literal. It is neither derived from the backend (no API-provided
      `protected`/`baseline` field exists on RoleActionState/ActionEntry) nor covered by any
      anti-drift test. This is 146-REVIEW.md's WR-03 finding, confirmed still present and
      explicitly left unfixed in 146-REVIEW-FIX.md ("Skipped Issues" — requires a backend
      contract change judged out of scope for the review-fix pass). No VERIFICATION.md override
      has been recorded for this deviation.
    artifacts:
      - path: "frontend/src/app/admin/roles/RoleCapabilityDetail.tsx"
        issue: >
          Lines 12-16 hardcode `["fansub_group.members.view", "fansub_group_media.view",
          "fansub_group_media.upload"]` as an independent literal with no compile-time or
          runtime tie to permissions.MembershipBaselineActionCodes in
          backend/internal/permissions/permissions.go:420, and no test in
          RoleCapabilityDetail.test.tsx asserts the two lists match.
    missing:
      - "Either derive RoleCapabilityDetail.tsx's protected-action filter from an API-provided field (e.g. CapabilityMatrixActionState.protected, computed server-side from permissions.MembershipBaselineActionCodes, per 146-REVIEW.md's own recommended fix), or add an explicit anti-drift test (e.g. a contract/fixture test comparing the TS literal against the backend catalog) if keeping the independent literal is intentional."
      - "If the deviation is accepted as-is, record a formal override in this VERIFICATION.md's frontmatter (must_have, reason, accepted_by, accepted_at) rather than leaving it as an unresolved review finding."
human_verification: []
---

# Phase 146: Registry-Selbstschutz und Sanierung der Quelltext-Substring-Tests — Verification Report

**Phase Goal:** Die in der Phase-145-Codeprüfung gefundenen Registry-Schwächen sind geschlossen — vor allem kann kein Admin über die ausgelieferte Capability-Matrix einen Zustand herstellen, der den nächsten Backend-Start in eine Absturzschleife schickt — und die sicherheitsrelevanten Tests belegen Verhalten durch echte Aufrufe statt durch Quelltextsuche.

**Verified:** 2026-09-04
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria 1–8)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Removing one of the 3 mandatory actions from the reserved pseudo-role is rejected server-side in the mutation path, proven by real-execution test; existing lockout guard unchanged for other roles | ✓ VERIFIED | `RevokeCapability`/`GrantCapability` in `admin_capability_handler.go:263-279,181-196` run the unconditional revoke guard **before** the D-07 lockout check and an action-specific grant guard, both against `permissions.MembershipBaselineActionCodes`. `TestRevokeCapabilityMembershipBaselineGuardRejectsUnconditionally` (seeds `countRolesWithAction=16` to prove the new guard fires independently of the lockout counter), `TestGrantCapabilityMembershipBaselineGuardRejectsNonBaselineAction`, `TestGrantCapabilityMembershipBaselineAllowsBaselineAction` all executed live via `h.RevokeCapability(c)`/`h.GrantCapability(c)` against `httptest` recorders + fake repos — re-run by this verifier, all 3 PASS. `backend/internal/repository/authz_capability_mutations.go` (`CountRolesWithAction`, the lockout-guard's data source) has **zero diff** since before Phase 146 (`git diff aec4b581^..HEAD` empty) — lockout guard behavior for all other roles is provably unchanged. |
| 2 | Capability-Matrix visibly marks the 3 rights as protected and shows a speaking German message with correct Umlaute on an attempt — no silent failure, no raw server error | ✓ VERIFIED | `RoleCapabilityDetail.test.tsx`'s `146-02` test renders the reserved role and asserts `screen.getAllByText('Geschützt')` has length 3 and a full German explanatory sentence with correct umlauts is present — re-run by this verifier, 9/9 tests in the file PASS. Server messages use correct umlauts: `"Die reservierte Mitgliedschafts-Grundausstattung ist auf genau die 3 Grundrechte beschränkt..."` (grant) and `"Dieses Recht gehört zur Mitgliedschafts-Grundausstattung und kann nicht entzogen werden..."` (revoke), both surfaced through the existing `ApiError`/`mutationError` path in `RoleCapabilityImpactPreviewModal.tsx` (no raw error, no silent failure). |
| 3 | `ListGroupHistoryRoleDefinitions` carries the same `NOT reserved` filter as its 3 sibling queries; a real-Postgres test proves the pseudo-role appears in none of the 4 queries | ✓ VERIFIED | `hist_group_member_roles_repository.go:253` — `WHERE 'group_history' = ANY(rd.contexts) AND NOT rd.reserved`. `TestReservedPseudoRoleExcludedFromPickersAndMarkedInCapabilityMatrix` checks all 4 surfaces (`ListCapabilityMatrix` role_kind, `ListFansubGroupRoleDefinitions`, `ListGroupHistoryRoleDefinitions`, `ListPublicRoleDefinitions`) against a real, migrated Postgres schema (`testsupport.OpenPhase145Postgres` + migration 0160) — re-run by this verifier against `team4s_phase145_test_146` on the live `team4sv30-db` container, PASS. |
| 4 | The 3 baseline action codes have a single authoritative source; remaining usages derive from it or are guarded against drift by a test | ✗ FAILED | Go side fully fixed (`permissions.MembershipBaselineActionCodes` is the single source; migration-vs-Go anti-drift proven by `TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights`, re-run and PASS). Frontend side (`RoleCapabilityDetail.tsx`'s `membershipBaselineCodes` Set, explicitly named as in-scope for this criterion in 146-CONTEXT.md's D-05) remains an independent, undrifted-but-untested hardcoded literal — 146-REVIEW.md's WR-03, confirmed still present, explicitly left unfixed per 146-REVIEW-FIX.md's "Skipped Issues" section. See Gaps below. |
| 5 | All 17 (of the 20 locked) security-relevant test files prove behavior via real execution; source inspection remains only for absence checks / self-referential test subjects | ✓ VERIFIED | `TestNoNewSourceSubstringTests` and `TestNoNewSelfReferentialLiteralAssertions` (`backend/internal/testquality/`) both re-run by this verifier, PASS with zero violations across the full `_test.go` corpus. `146-REVIEW.md`'s CR-01 finding (3 self-referential fake tests in `member_archive_repository_test.go`, undetected by any automated check at the time) was fixed in commit `26c67214` — this verifier independently re-ran `TestArchiveVisibilityFilterExcludesNonPublicRows`, `TestArchivePaginationBounds`, `TestArchiveRoleFilter`, `TestArchiveUsesCanonicalStoredMemberSlug` against real Postgres (`team4s_phase128_test`), all PASS, all now call `repo.SearchMembers` with seeded rows rather than comparing self-authored literals. WR-02's 3 previously-skipped claim-activation tests (`member_claims_repository_claim_activation_test.go`) were also independently re-run against real Postgres (`team4s_phase137_test_1`), all PASS, no `t.Skip` remaining. Spot-checked 3 additional locked files (`release_crew_service_test.go`, `role_definitions_context_test.go`, `point_ledger_repository_test.go`) — all remaining `os.ReadFile` calls are legitimate absence checks or migration-file self-checks per CLAUDE.md's own exceptions. |
| 6 | ≤36 test files still read a `.go` source file (down from 53); none of the 17/20 security-relevant ones are among them | ✓ VERIFIED | `LegacyAllowedSubstringTestFiles` contains exactly 34 entries (counted programmatically), zero overlap with `SecurityRelevantTestFiles`'s 20 entries — proven automatically by `TestSecurityRelevantFilesNeverInLegacyExceptionList`, re-run and PASS. 34 ≤ 36. |
| 7 | An automatic ratchet guard prevents new source-substring test regressions (frozen, only-shrinking exception list) | ✓ VERIFIED | This verifier independently injected a throwaway test file into `backend/internal/testquality/` reproducing the standard os.ReadFile-presence-assertion idiom used throughout the codebase (two-step `contentBytes, _ := os.ReadFile(...)` then `content := string(contentBytes)` then `assert.Contains(t, content, ...)`) outside the exception list — `TestNoNewSourceSubstringTests` correctly failed with the injected file named in its error message. The throwaway file was then removed and the guard re-confirmed green. Also independently verified `TestNoNewSelfReferentialLiteralAssertions` (the WR-01 review-fix addition) flags a synthetic self-referential-literal case. Note: an adversarially-crafted variant using an inline `string(content)` conversion directly inside the `Contains(...)` call (not matching the codebase's established two-step idiom) evaded `hasPresenceStyleSourceSubstringAssertion` — a narrow, documented-class blind spot of a regex-based heuristic, not a failure of the criterion as scoped (the guard demonstrably catches the pattern shape the phase's own established test-writing convention would produce). |
| 8 | The deliberately-remaining backlog is documented as named debt with a reason per file, not a silent gap | ✓ VERIFIED | `146-SUBSTRING-TEST-REMAINDER.md` names all 34 remaining files individually (no glob/"etc." shorthand), grouped by area, each with a specific one-line reason; the frozen `LegacyAllowedSubstringTestFiles` list in `source_substring_guard_test.go` matches this documentation exactly (34 entries, cross-checked programmatically). The one additional, separately-tracked "carried-forward" item (`IsHistoricalMemberRoleCode` not expanded into Criterion 3's scope) is also explicitly named, not silently dropped. |

**Score:** 7/8 roadmap success criteria verified (Criterion 4 partial/failed on its frontend clause).

### Additional Required Checks (per verification task)

| Check | Status | Evidence |
|---|---|---|
| `LoadCapabilityRoles` (`backend/internal/repository/authz_permissions.go:470`) has no `NOT reserved` filter and was not touched by Phase 146 | ✓ VERIFIED | Query is `WHERE 'fansub_group' = ANY(contexts) AND code <> 'founder'` — no reserved filter. `git diff <phase-145-commit>..HEAD -- backend/internal/repository/authz_permissions.go` is empty — zero changes since before Phase 146 started. This is intentional (146-CONTEXT.md D-17: adding the filter here would make `group_member` completely uneditable via the shared `IsCapabilityBearingRole`/`LoadCapabilityRoles` guard, breaking Criterion 2). |
| Platform-admin bypass (`if actor.IsPlatformAdmin { Allowed: true }`) in `backend/internal/permissions/permissions.go` is unconditional and untouched | ✓ VERIFIED | `git diff <phase-145-commit>..HEAD -- backend/internal/permissions/permissions.go` shows exactly one addition: the new `MembershipBaselineActionCodes` var and its use inside `validateMembershipBaselineRegistryPresence` (a pure refactor extracting a literal into a named var). All 3 `if actor.IsPlatformAdmin { ... Allowed: true ... }` blocks (lines ~541, ~630, ~764) are byte-identical to before the phase. Matches 146-CONTEXT.md D-13's explicit "not touched, not restricted" framing. |
| WR-03's deferral (frontend/Go duplication) does not undermine any of the 8 success criteria as a hidden dependency | ✓ CONFIRMED AS A DIRECT VIOLATION, NOT A HIDDEN ONE | WR-03 is not a separate, unrelated risk — it directly *is* the unresolved clause of Criterion 4 itself (see row 4 above and Gaps below), not an independent code-quality nit as the deferral's framing might suggest. It does not affect Criteria 1, 2, 3, 5, 6, 7, or 8. |

### Requirements Coverage

Phase 146 declares `Requirements: TBD (Nacharbeit aus 145-REVIEW.md und Altlast WR-02 aus 144-REVIEW.md, kein v1.4-Requirement-Mapping)` in both ROADMAP.md and 146-VALIDATION.md. Confirmed: `grep -n "146" .planning/REQUIREMENTS.md` returns no matches — no requirement IDs are mapped to this phase, and none of the 13 plan frontmatters claim any. This is the expected, intentional state, not an orphaned-requirement gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `backend/internal/handlers/public_member_access_matrix_test.go` | 349 | `"Profil nicht verf?gbar"` — literal ASCII `?` instead of `ü` (CLAUDE.md Sprachqualität) in a synthetic test-helper response string | ℹ️ Info | Pre-existing (146-REVIEW.md IN-01), correctly scoped as Info-only and left unfixed in the review-fix pass. Confined to a test double (`writePhase128TestUnavailable`); the real production string (`neutralUnavailableBody`, line 173) is correctly spelled and separately asserted. Does not affect production behavior or test reliability — cosmetic debt only. |
| `backend/internal/handlers/public_member_access_matrix_test.go` | 359-361 | `phase128MatrixLabel` — unused test helper function | ℹ️ Info | Pre-existing (146-REVIEW.md IN-02), dead code, no behavioral impact. |

No `TBD`/`FIXME`/`XXX` markers found in any file touched by Phase 146 (`git diff <phase-145-commit>..HEAD` file set fully scanned). No `TODO`/`HACK`/`PLACEHOLDER` markers found in the phase's touched files. No `t.Skip` remaining in any phase-146-touched test file.

### Behavioral Spot-Checks / Real Execution

| Behavior | Command | Result | Status |
|---|---|---|---|
| Backend builds clean | `go build ./...` (in `team4sv30-backend`) | no output, exit 0 | ✓ PASS |
| Backend vets clean | `go vet ./...` | no output, exit 0 | ✓ PASS |
| Criterion 1 guards (real httptest) | `go test ./internal/handlers/... -run 'TestRevokeCapabilityMembershipBaselineGuardRejectsUnconditionally\|TestGrantCapabilityMembershipBaselineGuardRejectsNonBaselineAction\|TestGrantCapabilityMembershipBaselineAllowsBaselineAction' -v` | 3/3 PASS | ✓ PASS |
| Criterion 3 (real Postgres, 4 queries) | `TEAM4S_PHASE145_TEST_DSN=... go test ./internal/repository/... -run TestReservedPseudoRoleExcludedFromPickersAndMarkedInCapabilityMatrix -v` | PASS | ✓ PASS |
| Criterion 4 anti-drift (Go side, real Postgres) | `TEAM4S_PHASE145_TEST_DSN=... go test ./internal/repository/... -run TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights -v` | PASS | ✓ PASS |
| CR-01 fix (real Postgres) | `TEAM4S_PHASE128_TEST_DSN=... go test ./internal/repository/... -run TestArchive -v` | 4/4 PASS | ✓ PASS |
| WR-02 fix (real Postgres) | `TEAM4S_PHASE137_TEST_DSN=... go test ./internal/repository/... -run 'TestVerifyClaimActivatesRoles\|TestResolvePendingRolesToActive' -v` | 5/5 PASS | ✓ PASS |
| Criterion 6/7/8 ratchet guards | `go test ./internal/testquality/... -v` | 3/3 PASS | ✓ PASS |
| Ratchet guard catches new violation (injected, then removed) | throwaway `_test.go` file outside exception list | `TestNoNewSourceSubstringTests` correctly FAILED, then PASSED after removal | ✓ PASS |
| Criterion 2 RTL (real render + DOM assertions) | `npm run test -- RoleCapabilityDetail` (in `team4sv30-frontend`) | 9/9 PASS | ✓ PASS |
| Full frontend `roles` area regression check | `npm run test -- roles` | 65/65 PASS across 11 files | ✓ PASS |
| Full backend `internal/handlers` package | `go test ./internal/handlers/... -count=1` | PASS (one test, `TestAnimeSegmentAssignment_AssignRequiresCapabilityThenSucceeds`, only fails when run in isolation via `-run`, not as part of the suite — confirmed **pre-existing** by reverting Phase 146's only diff to `testmain_test.go` and re-running in isolation: identical failure persists. Unrelated file, not touched by Phase 146, no genuine regression.) | ✓ PASS (no regression) |
| Full backend `internal/repository` package | `go test ./internal/repository/... -count=1` (with 3 known DSNs set) | Multiple pre-existing failures in `phase134_verification_matrix_*_test.go` (require external Keycloak/live server at `192.168.235.196:18093`, unavailable in this environment) and one pre-existing constraint-violation failure in `member_profile_role_volume_repository_test.go` — none of these files are in Phase 146's diff. Scoped re-run of only Phase-146-relevant tests (`TestArchive\|TestVerifyClaimActivatesRoles\|...`) is 100% green. | ✓ PASS (no regression in phase scope) |

### Human Verification Required

None. All 8 success criteria and both explicitly-requested "protected trap" checks were verifiable via direct code inspection and live re-execution of tests against real Postgres/httptest inside the running Docker Compose stack. The two items flagged as "Manual-Only Verifications" in 146-VALIDATION.md (DSN-gated tests actually ran; ratchet guard catches a new violation) were both independently re-executed by this verifier rather than deferred to a human.

### Gaps Summary

One of the roadmap's 8 success criteria is not fully met. Criterion 4 requires that the three baseline action codes have "a single authoritative source; remaining usages derive from it or are secured against drift by a test." The backend half of this (migration seed ↔ `permissions.MembershipBaselineActionCodes` ↔ mutation guards) is fully done and proven against real Postgres. The frontend half — `RoleCapabilityDetail.tsx`'s `membershipBaselineCodes` literal — was explicitly identified as in-scope for this exact criterion in the phase's own planning record (146-CONTEXT.md D-05) and flagged again by the phase's own code review (146-REVIEW.md WR-03), but the fix pass (146-REVIEW-FIX.md) explicitly skipped it, citing the need for a backend contract change (new API field + OpenAPI + TS type) as too large for that pass's scope. No override has been recorded to formally accept this deviation, and no later phase exists in the roadmap to which this could be deferred (Phase 146 is currently the last phase). This is a real, acknowledged, un-closed gap — not a silent one, but not yet resolved either.

All other 7 criteria, both explicitly-requested "protected trap" checks (LoadCapabilityRoles unchanged, platform-admin bypass unchanged), and the phase's core stated mission (sicherheitsrelevante Tests belegen Verhalten durch echte Aufrufe statt durch Quelltextsuche) are verified against live re-execution of the actual code, not just SUMMARY.md claims — including the CR-01 self-referential-fake-test gap that the phase's own plans and self-checks initially missed, which the subsequent review+fix cycle correctly caught and closed.

**This looks like a reasonable candidate for an override, at the developer's discretion.** To accept the frontend duplication as documented, tracked debt rather than requiring further work before closing this phase:

```yaml
overrides:
  - must_have: "Criterion 4 — remaining usages of the 3 baseline action codes derive from the single source or are drift-tested"
    reason: "Frontend RoleCapabilityDetail.tsx's hardcoded literal fix requires a backend contract change (new protected/baseline field on CapabilityMatrixActionState, OpenAPI + TS type updates) judged out of scope for this phase's review-fix pass — tracked in 146-REVIEW-FIX.md WR-03 as a follow-up."
    accepted_by: "{your name}"
    accepted_at: "{current ISO timestamp}"
```

---

_Verified: 2026-09-04_
_Verifier: Claude (gsd-verifier)_
