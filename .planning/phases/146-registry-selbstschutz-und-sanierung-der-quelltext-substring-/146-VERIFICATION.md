---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
verified: 2026-09-04T21:10:00Z
status: passed
score: 8/8 roadmap success criteria verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 7/8 roadmap success criteria verified
  gaps_closed:
    - "Criterion 4 — Die drei Baseline-Action-Codes haben eine einzige autoritative Quelle; die verbleibenden Verwendungen leiten sich davon ab oder sind durch einen Test gegen Auseinanderdriften gesichert."
  gaps_remaining: []
  regressions: []
human_verification: []
---

# Phase 146: Registry-Selbstschutz und Sanierung der Quelltext-Substring-Tests — Verification Report

**Phase Goal:** Die in der Phase-145-Codeprüfung gefundenen Registry-Schwächen sind geschlossen — vor allem kann kein Admin über die ausgelieferte Capability-Matrix einen Zustand herstellen, der den nächsten Backend-Start in eine Absturzschleife schickt — und die sicherheitsrelevanten Tests belegen Verhalten durch echte Aufrufe statt durch Quelltextsuche.

**Verified:** 2026-09-04
**Status:** passed
**Re-verification:** Yes — after gap closure (previous run: gaps_found, 7/8, 2026-09-04T21:00:00Z)

## Goal Achievement

### Re-Verification Focus: Criterion 4 Gap Closure

The previous verification found exactly one gap: Criterion 4's frontend half (`RoleCapabilityDetail.tsx`'s `membershipBaselineCodes` Set) was an undocumented, drift-unguarded duplicate of `permissions.MembershipBaselineActionCodes`. Commit `19a3c13d` ("fix(146): close Criterion 4 gap with membership-baseline frontend anti-drift test") is the single fix commit that landed since. This re-verification independently re-proves the fix rather than trusting the commit message.

**1. Test file authenticity — not a source-substring/self-referential fake.**
Read `frontend/src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` in full. It:
- Reads `/backend/internal/permissions/permissions.go` via `readFileSync` through the frontend container's pre-existing `./backend:/backend:ro` dev-compose mount (confirmed present in `docker-compose.override.yml:52`).
- Uses two regexes to extract `MembershipBaselineActionCodes`'s referenced identifiers, then resolves each identifier to its Go string constant value from the same source text — this is a genuine two-step parse of an independent, non-test production file, not a copy of the assertion's own expected value.
- Imports `membershipBaselineCodesForTest` (a newly-exported alias of the real production `membershipBaselineCodes` Set used by the component's render logic — not a separate test-only literal) from `RoleCapabilityDetail.tsx`.
- Asserts the two independently-derived lists are equal via `toEqual` after sorting.
This is NOT a self-referential-literal fake (the two sides come from genuinely different files/languages) and NOT a source-substring presence check (it doesn't `assert.Contains` a hardcoded string — it extracts and structurally compares two real values). Satisfies both of `member_archive_repository_test.go`'s CR-01 lesson and the project's own teststil rule (executes/derives real values rather than re-asserting a copy of itself).

**2. Live execution — confirmed passing.**
```
docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run RoleCapabilityDetail.membershipBaselineDrift"
```
Result: `✓ src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts (1 test) 3ms` — 1/1 PASS, re-run by this verifier live in the running container, not read from a log.

**3. Independent drift-detection proof.**
This verifier temporarily mutated `RoleCapabilityDetail.tsx` line 15 from `"fansub_group_media.upload"` to `"fansub_group_media.upload_DRIFT_TEST"`, confirmed `git status --short` was clean beforehand, then re-ran the same command:
- Result: test FAILED with a clear structural diff (`AssertionError: expected [...] to deeply equal [...]` showing `- "fansub_group_media.upload"` / `+ "fansub_group_media.upload_DRIFT_TEST"`).
- Reverted via `git checkout -- frontend/src/app/admin/roles/RoleCapabilityDetail.tsx`.
- Confirmed `git status --short` empty (clean revert) and `git diff --stat` empty.
- Re-ran the test: `✓ ... (1 test) 3ms` — 1/1 PASS again.
This proves the test is load-bearing, not a tautology that would pass regardless of drift.

**4. `permissions.MembershipBaselineActionCodes` untouched by the fix commit.**
`git show 19a3c13d --stat` shows exactly 4 changed files: `.planning/STATE.md`, the new `146-VERIFICATION.md` (an earlier draft, since superseded by this report), the new test file, and `RoleCapabilityDetail.tsx` (+5 lines: the export alias and its explanatory comment). `backend/internal/permissions/permissions.go` does **not** appear in that diff at all. Read `backend/internal/permissions/permissions.go:415-420` directly: `var MembershipBaselineActionCodes = []Action{ActionFansubGroupMembersView, ActionFansubGroupMediaView, ActionFansubGroupMediaUpload}` — byte-identical to what the previous verification cited at the same line. Confirmed unchanged.

**5. Roadmap wording explicitly permits an anti-drift test as a resolution path.**
`ROADMAP.md:894` — Criterion 4's exact German wording: *"Die drei Baseline-Action-Codes haben eine einzige autoritative Quelle; die verbleibenden Verwendungen **leiten sich davon ab oder sind durch einen Test gegen Auseinanderdriften gesichert**."* The "oder... gesichert" (or... secured [by such a test]) clause is an explicit, first-class alternative to derivation, not a workaround being smuggled in. The fix is a genuine, intended resolution path for this exact criterion, not a deviation requiring an override.

**Verdict: Criterion 4 gap CLOSED.** No override needed — the anti-drift-test path is textually authorized by the roadmap itself, and the test has been proven (by live execution, not by trusting the commit message) to genuinely compare two independent representations and to fail on real drift.

### Observable Truths (ROADMAP.md Success Criteria 1–8) — Full Fresh Re-Check

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Removing one of the 3 mandatory actions from the reserved pseudo-role is rejected server-side in the mutation path, proven by real-execution test; existing lockout guard unchanged for other roles | ✓ VERIFIED | Re-run live: `TestRevokeCapabilityMembershipBaselineGuardRejectsUnconditionally`, `TestGrantCapabilityMembershipBaselineGuardRejectsNonBaselineAction`, `TestGrantCapabilityMembershipBaselineAllowsBaselineAction` — 3/3 PASS via `go test ./internal/handlers/...`. No file in this criterion's evidence chain (`admin_capability_handler.go`, `authz_capability_mutations.go`) appears in commit `19a3c13d`'s diff — unchanged since the previous (already-passing) verification pass. |
| 2 | Capability-Matrix visibly marks the 3 rights as protected and shows a speaking German message with correct Umlaute on an attempt — no silent failure, no raw server error | ✓ VERIFIED | Re-run live: `RoleCapabilityDetail.test.tsx` — 9/9 PASS (unaffected by the fix commit's `+5` lines, which only add an exported test alias, not new render logic). Server messages with correct umlauts confirmed unchanged. |
| 3 | `ListGroupHistoryRoleDefinitions` carries the same `NOT reserved` filter as its 3 sibling queries; a real-Postgres test proves the pseudo-role appears in none of the 4 queries | ✓ VERIFIED | Re-run live against real Postgres (`team4s_phase145_test_146` on `team4sv30-db`): `TestReservedPseudoRoleExcludedFromPickersAndMarkedInCapabilityMatrix` — PASS. Query filter unchanged since previous pass (not touched by `19a3c13d`). |
| 4 | The 3 baseline action codes have a single authoritative source; remaining usages derive from it or are guarded against drift by a test | ✓ VERIFIED | **Gap closed this pass.** Go side: `permissions.MembershipBaselineActionCodes` remains the single source; `TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights` re-run live against real Postgres — PASS. Frontend side: `RoleCapabilityDetail.membershipBaselineDrift.test.ts` re-run live, proven load-bearing via injected-mutation drift test (see "Re-Verification Focus" above) — PASS, and reverted cleanly. Both halves of the criterion now hold. |
| 5 | All 17 (of the 20 locked) security-relevant test files prove behavior via real execution; source inspection remains only for absence checks / self-referential test subjects | ✓ VERIFIED | Re-run live: `TestNoNewSourceSubstringTests`, `TestNoNewSelfReferentialLiteralAssertions` — PASS, zero violations. No file in `19a3c13d`'s diff is a security-relevant test file (its only test-file change is the new frontend anti-drift test, which itself reads real production source rather than asserting on its own copy — see point 1 above). |
| 6 | ≤36 test files still read a `.go` source file (down from 53); none of the 17/20 security-relevant ones are among them | ✓ VERIFIED | `LegacyAllowedSubstringTestFiles` unchanged at 34 entries (fix commit touches no backend test files). `TestSecurityRelevantFilesNeverInLegacyExceptionList` re-run — PASS. Note: the new frontend drift test also reads a `.go` file via `readFileSync`, but it is a frontend Vitest test outside the Go-side `LegacyAllowedSubstringTestFiles`/`SecurityRelevantTestFiles` accounting scope (which counts only backend `_test.go` files per Criterion 5/6's own framing) — the count and mechanism this criterion measures are unaffected. |
| 7 | An automatic ratchet guard prevents new source-substring test regressions (frozen, only-shrinking exception list) | ✓ VERIFIED | `TestNoNewSourceSubstringTests` and `TestNoNewSelfReferentialLiteralAssertions` re-run live — PASS. Guard mechanism untouched by the fix commit. |
| 8 | The deliberately-remaining backlog is documented as named debt with a reason per file, not a silent gap | ✓ VERIFIED | `146-SUBSTRING-TEST-REMAINDER.md` unchanged (not in `19a3c13d`'s diff), still matches the frozen 34-entry exception list exactly. |

**Score:** 8/8 roadmap success criteria verified.

### Regression Check Since Previous Verification Pass

`git log --oneline` from the previous verification's implicit baseline to current `HEAD` (`19a3c13d`) shows exactly one new commit landed: `19a3c13d fix(146): close Criterion 4 gap with membership-baseline frontend anti-drift test`. Its full file list (`git show 19a3c13d --stat`): `.planning/STATE.md` (timestamp bump), the phase's own `146-VERIFICATION.md` (an intermediate self-written draft, now superseded by this report), the new test file, and `RoleCapabilityDetail.tsx` (+5 lines, export-only). `git status --short` is clean (no uncommitted changes) both before and after this verifier's own temporary drift-injection experiment (fully reverted). No other files, commits, or unrelated changes landed — nothing regressed in Criteria 1, 2, 3, 5, 6, 7, or 8, all independently re-executed live above rather than assumed carried-forward.

### Additional Required Checks (carried forward, re-confirmed)

| Check | Status | Evidence |
|---|---|---|
| `LoadCapabilityRoles` (`backend/internal/repository/authz_permissions.go:470`) has no `NOT reserved` filter and was not touched by Phase 146 | ✓ VERIFIED | File does not appear in `19a3c13d`'s diff — unchanged since previous (already-passing) verification. |
| Platform-admin bypass in `backend/internal/permissions/permissions.go` is unconditional and untouched | ✓ VERIFIED | `permissions.go` has zero diff in `19a3c13d` (confirmed above, point 4) — all 3 `IsPlatformAdmin` bypass blocks remain byte-identical. |

### Requirements Coverage

Unchanged since previous pass: Phase 146 declares `Requirements: TBD (Nacharbeit aus 145-REVIEW.md und Altlast WR-02 aus 144-REVIEW.md, kein v1.4-Requirement-Mapping)`. `grep -n "146" .planning/REQUIREMENTS.md` returns no matches — no requirement IDs mapped, matching the phase's own declared scope.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx` / `.membershipBaselineDrift.test.ts` | — | none found | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers in either file touched by the fix commit. Both files well under the 450-line modularity cap (251 and 53 lines respectively). |
| `backend/internal/handlers/public_member_access_matrix_test.go` | 349, 359-361 | Pre-existing Info-only findings (ASCII `?` in a test-double string; unused test helper) | ℹ️ Info | Carried forward unchanged from previous verification pass — not touched by the fix commit, still correctly scoped as cosmetic-only debt. |

No new debt markers introduced. No `t.Skip` in any phase-146-touched file.

### Behavioral Spot-Checks / Real Execution (this pass)

| Behavior | Command | Result | Status |
|---|---|---|---|
| Backend builds clean | `go build ./... && go vet ./...` (in `team4sv30-backend`) | no output, exit 0 | ✓ PASS |
| Criterion 1 guards | `go test ./internal/handlers/... -run 'TestRevokeCapabilityMembershipBaselineGuardRejectsUnconditionally\|TestGrantCapabilityMembershipBaselineGuardRejectsNonBaselineAction\|TestGrantCapabilityMembershipBaselineAllowsBaselineAction' -v` | 3/3 PASS | ✓ PASS |
| Criterion 6/7/8 ratchet guards | `go test ./internal/testquality/... -v` | 3/3 PASS | ✓ PASS |
| `internal/handlers` + `internal/testquality` full packages | `go test ./internal/testquality/... ./internal/handlers/... -count=1` | both `ok` | ✓ PASS |
| Criterion 3 (real Postgres) | `TEAM4S_PHASE145_TEST_DSN=postgres://team4s:...@team4sv30-db:5432/team4s_phase145_test_146 go test ./internal/repository/... -run TestReservedPseudoRoleExcludedFromPickersAndMarkedInCapabilityMatrix -v` | PASS | ✓ PASS |
| Criterion 4 Go-side anti-drift (real Postgres) | same DSN, `-run TestMembershipBaselineMigrationSeedsExactlyThreeActionsAndPreservesEffectiveRights -v` | PASS | ✓ PASS |
| CR-01 fix (real Postgres, regression check) | `TEAM4S_PHASE128_TEST_DSN=postgres://team4s:...@team4sv30-db:5432/team4s_phase128_test go test ./internal/repository/... -run TestArchive -v` | 4/4 PASS | ✓ PASS |
| WR-02 fix (real Postgres, regression check) | `TEAM4S_PHASE137_TEST_DSN=postgres://team4s:...@team4sv30-db:5432/team4s_phase137_test_1 go test ./internal/repository/... -run 'TestVerifyClaimActivatesRoles\|TestResolvePendingRolesToActive' -v` | 5/5 PASS | ✓ PASS |
| **Criterion 4 frontend anti-drift test (NEW, this pass's focus)** | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run RoleCapabilityDetail.membershipBaselineDrift"` | 1/1 PASS | ✓ PASS |
| **Drift-detection proof (NEW, this pass's own injected mutation)** | mutate `membershipBaselineCodes`'s 3rd code, re-run same command, then `git checkout --` to revert | FAILED with clear structural diff, then PASSED again after clean revert (`git status --short` empty) | ✓ PASS |
| Criterion 2 RTL regression | `npx vitest run RoleCapabilityDetail` | 2 files, 10/10 PASS (9 existing + 1 new drift test) | ✓ PASS |
| Full frontend `roles` area regression check | `npx vitest run roles` | 12 files, 66/66 PASS (was 11 files/65 tests previously — the new drift test is the only addition) | ✓ PASS (no regression) |

### Human Verification Required

None. All 8 success criteria, both "protected trap" checks, and the Criterion 4 gap-closure fix were independently re-verified via live re-execution inside the running Docker Compose stack (backend Go tests against real Postgres and httptest; frontend Vitest against a real render + a genuine cross-language source comparison), plus a manual drift-injection experiment proving the new test is load-bearing rather than a tautology. Nothing in this pass required visual, real-time, or external-service judgment beyond what was already resolved in the previous pass.

### Gaps Summary

None. The single gap identified in the previous verification pass (Criterion 4's frontend half) is closed: `RoleCapabilityDetail.membershipBaselineDrift.test.ts` is a genuine, independently-verified anti-drift test — confirmed well-formed (reads and structurally parses real production Go source rather than re-asserting a copy of itself), confirmed passing live, and confirmed to actually catch drift via an independent injected-mutation experiment performed by this verifier (not by trusting the commit's own stated verification). `permissions.MembershipBaselineActionCodes` itself is confirmed byte-identical to before this fix commit. ROADMAP.md's own wording for Criterion 4 explicitly names "gesichert durch einen Test gegen Auseinanderdriften" as a first-class resolution path alongside derivation, so no override was needed to close this gap — it is a genuine, textually-authorized resolution, not an accepted deviation. A fresh full re-check of all 8 criteria (not just the previously-failing one) found no regressions: exactly one new commit landed since the previous pass, touching exactly the 4 files its own message describes, and every previously-passing criterion's supporting test evidence was independently re-executed live and still passes.

All 8 of Phase 146's roadmap success criteria are now met. The phase goal — no admin can put the Capability-Matrix into a state that crash-loops the next backend start, and security-relevant tests prove behavior via real execution rather than source search — is achieved and verified against the live codebase, not against SUMMARY.md claims.

---

_Verified: 2026-09-04_
_Verifier: Claude (gsd-verifier)_
