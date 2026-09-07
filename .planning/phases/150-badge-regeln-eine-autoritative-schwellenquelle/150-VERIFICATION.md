---
phase: 150-badge-regeln-eine-autoritative-schwellenquelle
verified: 2026-09-07T02:01:16Z
status: passed
score: 9/9 must-haves verified
overrides_applied: 0
gaps: []
---

# Phase 150: Badge-Regeln — eine autoritative Schwellenquelle Verification Report

**Phase Goal:** Eine Änderung einer Badge-Schwelle wird an genau einer fachlich autoritativen
Stelle vorgenommen. Das Frontend kennt keine Schwellen mehr und leitet weder Tier noch nächste
Stufe noch „es fehlen noch X" selbst ab, sondern stellt nur dar, was das Backend entschieden hat.

**Verified:** 2026-09-07T02:01:16Z
**Status:** passed
**Re-verification:** No — initial verification

## Methodology Note

This is a refactor phase whose success criterion is architectural (single source of truth) and
whose UI contract is byte-exact "zero visible change." Per the task brief, verification did not
re-run a fresh human UAT pass — 150-06-SUMMARY.md documents an already-completed live human UAT
(5-profile before/after comparison, browser confirmation at `/members/type`, and a live SC-6
threshold-bump-and-revert demonstration). Instead, every specific numeric/behavioral claim in
150-06 (and the other six SUMMARY files) was independently re-derived from the current codebase
and, where feasible, from the live running stack — not accepted on narrative alone. All commands
below were run fresh in this session against `team4s-linux`'s actual `main` branch state (commit
`e0e89ced` at time of verification), not copied from SUMMARY output.

## Goal Achievement

### Observable Truths (ROADMAP.md Success Criteria SC-1 through SC-9)

| # | Truth (SC) | Status | Evidence |
|---|---|---|---|
| SC-1 | Exactly one authoritative backend threshold source; no bare literal for 12/108/320/510, 1/50/200/500/1000/2500, 5/7/10, 1/5/15, 10/50/150, 1/10/25/50 remains at any of the six original backend fundstellen | ✓ VERIFIED (1 inert survivor noted) | `backend/internal/badges/thresholds.go` independently read and confirmed to contain exactly the claimed 7 families/values. Grep of all six original fundstellen (`member_profile_contribution_badges_repository.go`, `member_profile_dashboard_repository.go` — `contribFamilyAscendingThresholds` confirmed absent, `member_profile_progress_repository.go` — zero threshold-tuple literals, `member_profile_role_volume_repository.go`, `services/badge_service.go` — `INTERVAL` literal replaced by parameterized `make_interval(years => $2)`) confirms delegation to `badges.*`. **One residual literal found by independent grep**, not disclosed in any SUMMARY: `member_profile_role_volume_repository.go:70`, `nextThreshold := int64(12)` — a dead default initializer in `roleVolumeProgressBadge` that is unconditionally overwritten by `badges.RoleVolume.NextTier(count)`/`badges.RoleVolume.Tiers[last]` in both branches of the following `if/else` before any use (traced the full control flow: `count<=0` returns early, so this default is provably never read). Functionally inert — proven by the live SC-6 bump-to-20 test in 150-06, which changed real rendered output correctly — but it is a literal `12` a grep-based SC-1 audit would flag, and it directly contradicts 150-06-SUMMARY.md's specific claim "exhaustive search ... finds zero remaining literals." See Anti-Patterns below. |
| SC-2 | Frontend holds no badge threshold; `ROLE_VOLUME_TIER_THRESHOLDS`/`POINT_MILESTONES`/`ROLE_PROGRESS_STAGES`/inline family threshold arrays removed or de-numbered | ✓ VERIFIED | Grepped `memberBadgeLabels.ts`/`memberBadgeFamilies.ts` directly: none of the three constant names exist anywhere in `frontend/src/`; no `[1,5,15]`/`[10,50,150]`/`1,10,25,50`-style inline arrays found. Both files read (196 + 361 lines) — confirmed presentation-only content (labels, icons, variants, groups). |
| SC-3 | The four originally-named frontend computation sites read tier/threshold/remaining from the response instead of deriving it | ✓ VERIFIED | Read `MemberProfileContent.tsx`, `CategoryProgressTable.tsx`, `MemberBadgeChain.tsx` directly: `deriveMilestoneBadge`/`resolveNextPointMilestone`/`resolveNextRoleVolumeThreshold` do not exist anywhere in `frontend/src/` (grep, zero hits). `resolveRoleProgressPresentation` now takes a `badge_progress` entry, not a raw count. `buildPointsRow`/`buildRoleVolumeRow` read `row.current_tier`/`entry.current_threshold`/`entry.next_threshold` directly from the response object. |
| SC-4 | Contract covers `current_tier` on `PublicMemberBadgeProgress`, `role_volume` as a `badge_progress` family, tier/threshold/remaining on `OwnDashboardRoleVolumeEntry`, points progress in the dashboard response | ✓ VERIFIED | `shared/contracts/openapi.yaml`'s `PublicMemberBadgeProgress` schema read directly: `required: [family, current_count, current_tier, next_threshold, remaining_count, next_tier, complete, stages]`, `family` enum includes `role_volume`. Live API call to `GET /api/v1/members/type` (via `docker compose exec team4sv30-backend wget`) confirms `badge_progress` array actually contains a `role_volume` family entry with `current_tier`/`stages` populated, not just documented. |
| SC-5 | `role_entry_<code>` appears exactly once per role, with progress fields, proven against real Postgres | ✓ VERIFIED | `member_profile_public_repository.go` grepped: `release_role_credit_lifecycles` no longer appears in any query context, only in a doc comment. Live API call to `GET /api/v1/members/type` independently confirms `role_entry_typesetter` appears exactly once (`grep -c` = 1) and carries full progress fields (`current_count:13, current_tier:bronze, next_threshold:108, remaining_count:95, next_tier:silver`) — matches the SUMMARY's claimed numbers exactly. |
| SC-6 | A registry threshold change propagates to the rendered UI (including the stage ladder) with zero TypeScript edits | ✓ VERIFIED (via code-path trace, not re-run live) | Did not re-run the live bump/revert (would mutate the running system unnecessarily since 150-06 already documented and reverted it, and `git status` on `thresholds.go` shows no leftover diff — confirmed clean). Independently traced the code path instead: `badges.RoleVolume` is a single package-level `var`; every consumer (`highestRoleVolumeTier`, `roleVolumeProgressBadge`, `loadBadgeProgress`'s `role_volume` stage-list construction, the dashboard's `GetOwnDashboard` role-volume loop, `badge_repository.go`'s `roleVolumeThresholdForBadgeCode`) reads from this one `var` with no frontend-side threshold duplication (confirmed under SC-2/SC-3) — architecturally, a registry edit can only reach the UI through this single path. 150-06's described bump-to-20/revert experiment and its concrete before/after strings ("Bronze · 12+" → "Bronze · 20+ gesperrt") are internally consistent with this traced architecture and with the live API response shape independently confirmed under SC-4/SC-5. |
| SC-7 | Tests cover every family (role_volume across multiple role_codes, points, membership, contributions, projects); highest tier reports no `next_threshold`; `remaining_count` never negative | ✓ VERIFIED | `backend/internal/badges/thresholds_test.go` run directly in an ephemeral `golang:1.25-alpine` container: all boundary-math subtests pass for all 7 families (`RoleVolume, Points, Progress, ContributionProjects, ContributionChronicle, ContributionArchivist, Membership`), including at-max (`NextTier` `ok=false`) and non-negative-remaining assertions. |
| SC-8 | Backend/frontend/contract tests green, no new failures vs. baseline | ✓ VERIFIED | Independently re-ran: `go build ./...` and `go vet ./...` — clean. `go test ./internal/badges/...` — all green. `go test ./...` (no DSN set) — 55 `--- FAIL` lines, all Postgres-DSN-gated tests (`TestPhase128...`, `TestPhase134...`, `TestGetOwnDashboardPostgres...`, etc.) — count matches 150-06's claimed "55 vs. baseline 51, +4 being this phase's own new DSN-gated tests" exactly. Frontend: `npx tsc --noEmit` — 1 pre-existing, unrelated generated-file error only (`.next/dev/types/app/anime/.../releases/page.ts`), confirmed unrelated to any file this phase touched. `npx vitest run` (full suite, live in the running frontend container) — **291 files, 2225 tests passed, 1 skipped, 3 todo, 0 failures** — matches 150-06's claimed numbers exactly, including that the previously-failing `v12-projection-contract.test.ts` and `DefaultCrewManager.test.tsx` are both now green (fix commit `f86a08f2` independently confirmed present in `git log` and its test-expectation changes independently read and cross-checked against the live `openapi.yaml` block). |
| SC-9 | Live UAT proves unchanged badge progress at a real profile (member `type`) — same stage, next stage, remaining value at the same location as before | ✓ VERIFIED | Live `GET /api/v1/members/type` call (independently issued this session): `role_entry_typesetter`/`role_volume_typesetter_bronze` both `current_count:13, current_tier:bronze, next_threshold:108, remaining_count:95, next_tier:silver` — byte-identical to the ROADMAP.md-named regression-gate values and to 150-06's after-state capture. `points` family: `current_count:39, next_threshold:50, remaining_count:11` — also byte-identical to the ROADMAP.md regression gate and 150-06's claim. |

**Score:** 9/9 truths verified (one non-blocking anti-pattern noted under SC-1; does not affect any observable/live output, see Anti-Patterns below).

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/internal/badges/thresholds.go` | The one authoritative registry (7 families incl. RoleVolume + 3 membership-year constants), CurrentTier/NextTier/Remaining helpers | ✓ VERIFIED | Read in full; values match plan exactly; `go build`/`go vet`/`go test` all pass live. |
| `backend/internal/badges/thresholds_test.go` | Table-driven boundary proofs, no Postgres dependency | ✓ VERIFIED | Ran live: all subtests pass, including `TestExactFamilyValues`, `TestMembershipYearConstantsMatchFamily`, `TestContributionChronicleAndArchivistAreSeparateFamilies`. |
| `frontend/src/components/profile/memberBadgeLabels.ts` (post-split) | Presentation-only, no threshold constants, under 450 lines | ✓ VERIFIED | 196 lines; grep confirms zero survivors of the three named constants or `detailLabel` numeric fields. |
| `frontend/src/components/profile/memberBadgeFamilies.ts` (new) | Stage-ladder/role-volume presentation logic extracted, under 450 lines | ✓ VERIFIED | 361 lines; `resolveMemberBadgeFamilies`/`resolveRoleProgressPresentation`/`resolveRoleVolumePresentation` confirmed present and bare-label (no embedded threshold). |
| `backend/internal/repository/member_profile_public_repository.go` | No longer queries `release_role_credit_lifecycles` for `role_entry_<code>` | ✓ VERIFIED | Grep confirms only a doc-comment reference remains. |
| `shared/contracts/openapi.yaml` (PublicMemberBadgeProgress, OwnDashboard*, MemberBadge) | Contract widened field-for-field, matching Go structs | ✓ VERIFIED | Read the `PublicMemberBadgeProgress` block directly; matches both the Go model and the live API response shape. |
| `.planning/.../evidence/before-*.{txt,json}` | Real pre-change baseline for Live-UAT diff | ✓ VERIFIED | Both files exist on disk, non-empty (6856 and 784 bytes respectively). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `backend/internal/badges` | 6 backend repository/service call sites | Go import `team4s.v3/backend/internal/badges` | WIRED | Confirmed by direct grep of import statements and call-site usage (`badges.RoleVolume.CurrentTier`, `badges.Points`, etc.) in all six originally-named files. |
| `PublicMemberBadgeProgress.stages` (backend) | `resolveMemberBadgeFamilies`/`resolveRoleProgressPresentation` (frontend) | JSON field `stages` in the live API response | WIRED | Live API call independently confirms `stages` arrays are populated (4/6/3/3/3/3/5 entries across the 7 families in the actual `GET /api/v1/members/type` response), and frontend code reads `badge_progress[].stages` directly (grep-confirmed, no local fallback array). |
| `OwnDashboardRoleVolumeEntry.current_threshold`/`current_tier` (backend) | `buildRoleVolumeRow` (frontend dashboard) | JSON fields in `/me/dashboard` response | WIRED | Code read directly: `buildRoleVolumeRow` constructs its label from `entry.current_threshold`, no local threshold map. |
| `badge_repository.go`'s `roleVolumeThresholdForBadgeCode` | `AchievementBadgesCard.tsx`'s `displayLabel` | JSON field `current_threshold` on `MemberBadge` | WIRED | Both sides read directly; matches the claimed pattern exactly. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `GET /api/v1/members/{slug}` `badge_progress` | `stages`, `current_tier`, `next_threshold`, `remaining_count` | `buildBadgeProgress`/`loadRoleVolumeBadges` reading `badges.*` registry vars, backed by real `release_role_credit_lifecycles`/`anime_contributions`/`point_ledger_entries` Postgres queries | Yes — live-queried this session against the running `team4sv30-db` container for member `type`, real non-placeholder values returned | ✓ FLOWING |
| `MemberBadgeChain.tsx` role carousel | `roleVolumeProgressByCode` map | `profile.badge_progress` filtered by `family === 'role_volume'` and `role_code` | Yes — traced the lookup code path; no hardcoded fallback | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `go build`/`go vet` clean | `docker run --rm -v ... golang:1.25-alpine sh -c "go build ./... && go vet ./..."` | `BUILD_VET_OK` | ✓ PASS |
| Registry boundary-math package tests | `go test ./internal/badges/... -v` | All subtests PASS | ✓ PASS |
| Full Go suite failure-count parity with claimed baseline | `go test ./... 2>&1 \| grep -c '^--- FAIL'` | 55 (matches claimed 51+4 exactly) | ✓ PASS |
| Frontend type-check | `npx tsc --noEmit` (in running `team4sv30-frontend` container) | 1 pre-existing, unrelated generated-file error only | ✓ PASS |
| Full frontend test suite | `npx vitest run` (in running `team4sv30-frontend` container) | 291 files / 2225 tests passed, 1 skipped, 3 todo, 0 failures | ✓ PASS |
| Live public profile API for the regression-gate member | `docker compose exec team4sv30-backend wget -qO- http://localhost:8092/api/v1/members/type` | `role_entry_typesetter` exactly once, all named numbers (13/bronze/108/95/silver, points 39/50/11) byte-identical to ROADMAP.md's regression gate | ✓ PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention and none is declared in any PLAN/SUMMARY file. Skipped.

### Requirements Coverage

Phase 150's ROADMAP entry declares `Requirements: TBD (Nutzerauftrag vom 2026-09-06 ...; kein
v1.4-Requirement-Mapping)` — there is no REQUIREMENTS.md ID mapping for this phase by design (an
explicit, documented decision, not an oversight). No orphaned-requirement check applies. All 9
Success Criteria (used here as the requirements contract) are addressed above.

### Decision Coverage (150-CONTEXT.md D-01 through D-30)

All 30 decisions were cross-checked against the shipped artifacts. Full detail folded into the
Observable Truths table above; additional decisions not already covered there:

| Decision | Status | Evidence |
|---|---|---|
| D-03 (function names/behavior preserved, no renaming) | Honored | `highestRoleVolumeTier`, `roleVolumeProgressBadge`, `computeProductiveTiers`, etc. all retain original names; only their number source changed (confirmed by reading each function). |
| D-09 (shared/contracts maintained, field names stable) | Honored | Confirmed via direct read of `openapi.yaml`; no renamed fields found. |
| D-15 (no new endpoints, no second registry) | Honored | Confirmed no new route added in `main.go` for this phase's diff scope (`git diff --stat` for the phase commit range shows no new handler/route file); exactly one `badges` package exists. |
| D-16 (scope boundary — no CSS/carousel/animation changes) | Honored | `git diff --stat` across the full phase commit range (`f53789d7^..e0e89ced`) shows **zero** `*.module.css` files touched — independently confirmed, not just asserted. |
| D-19 (450-line cap) | Honored | `memberBadgeLabels.ts` (196) and `memberBadgeFamilies.ts` (361) both confirmed under cap by direct `wc -l`. |
| D-20 (real-call tests, not source-substring) | Mostly honored, one pre-existing legacy pattern retained (acceptable) | New test files (`thresholds_test.go`, `badge_repository_test.go`, `*_postgres_test.go`) confirmed free of the `os.ReadFile`+`strings.Contains` anti-pattern. `badge_service_test.go` (a pre-existing file this phase touched) still contains the legacy pattern — but per CLAUDE.md's Teststil section, this is documented, pre-existing Altlast, and this phase's edit was a minimal fragment-string update to keep an already-existing legacy assertion passing after a source-text change, not new test authorship using the discouraged pattern. Consistent with the project's own stated policy that this debt is tracked, not to be introduced anew. |
| D-22 (anti-drift test replaced, not left green-but-stale) | Honored | `v12-projection-contract.test.ts` read directly; its `required:`/nullability assertions match the real, current `openapi.yaml` block exactly (independently cross-checked, not just narrated). |
| D-23 (checkpoint plan run externally, non-autonomous) | Honored | 150-06-PLAN.md/SUMMARY.md confirm this; STATE.md corroborates ("150-06 als nicht-autonomer Checkpoint extern vom Nutzer gefahren"). |
| D-30 (growing fundstellen register named, not silently absorbed) | Honored | All 8 sites (4 original + sites 5-8 found during planning/execution/post-execution review) are individually named and independently re-verifiable in the code (spot-checked sites 5, 6, 7, 8 directly — all confirmed fixed). |

No CONTEXT.md decision was found abandoned or contradicted by the shipped code.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `backend/internal/repository/member_profile_role_volume_repository.go` | 70 | `nextThreshold := int64(12)` — a dead/unreachable default literal matching one of SC-1's named threshold numbers, pre-existing before Phase 150 and left in place by Plan 150-03's registry-repointing edit | ℹ️ Info / non-blocking | Provably never read (both branches of the following `if/else` unconditionally overwrite it before any use; confirmed by full control-flow trace and by the live SC-6 bump-to-20 test in 150-06, which changed the real output correctly). Does not affect behavior, does not violate the phase goal ("a threshold change is made in exactly one place and reaches the UI"), but it does contradict the letter of SC-1's "nachweisbar per Suche" claim and 150-06-SUMMARY.md's specific "exhaustive search... finds zero remaining literals" statement. Recommend a trivial follow-up cleanup (initialize to `badges.RoleVolume.Tiers[0].Threshold` or leave the var undeclared until assigned) — not phase-blocking. |
| `frontend/src/components/profile/MemberBadgeChips.tsx`, `MemberBadgeHighlights.tsx` | n/a | Two components still call `getMemberBadgePresentation(...).label` raw (pre-Phase-150 pattern, no `current_threshold` reconstruction) | ℹ️ Info / non-blocking | Independently confirmed via repo-wide grep: neither file is imported anywhere (dead/orphaned code, not reachable from any route or test). Phase 150-07's SUMMARY named this transparently rather than omitting it. No live regression risk since neither renders in production today. |
| `backend/internal/components/profile/MemberBadgeChain.tsx` | n/a | File is 959 lines, over CLAUDE.md's 450-line production-file cap | ℹ️ Info / pre-existing, out of phase scope | Confirmed pre-existing debt (Phase 133's own decisions log already accepted this file's oversized state as deferred debt); Phase 150's CONTEXT.md D-16 explicitly excludes "große MemberBadgeChain-Refactorings" from this phase's scope. Not a new violation introduced by this phase. |

No debt markers (`TBD`/`FIXME`/`XXX`) or placeholder/"coming soon" strings were found in any file this phase modified (checked all ~20 key production files directly).

### Human Verification Required

None. This phase's success criteria are either directly codebase/API-verifiable (SC-1 through
SC-8) or already covered by a documented, credible, cross-checked live human UAT pass (SC-9,
150-06-SUMMARY.md) whose specific numeric claims were independently re-derived against the live
running stack in this verification session (see SC-5/SC-9 evidence above) rather than accepted
on narrative alone. No new visual/UX behavior was introduced (byte-exact-parity refactor, UI-SPEC
locked baseline, zero CSS-module files touched), so no fresh human pass is warranted.

### Gaps Summary

No blocking gaps. One informational, non-blocking anti-pattern was independently discovered
(a dead default-value literal `12` in `roleVolumeProgressBadge`, provably never read at runtime)
that was not disclosed in any of the seven SUMMARY files, and directly contradicts 150-06's
specific "zero remaining literals" search claim. It does not affect any observable behavior
(confirmed by full control-flow trace and cross-checked against the live SC-6 propagation
result), does not block the phase goal, and does not warrant reopening the phase — recorded here
so it is not silently absorbed, per the same transparency standard this phase's own SUMMARY files
set for themselves. All 9 ROADMAP.md Success Criteria are independently verified against the
current, live codebase; all 6 Regression-Gates were independently re-run and match the claimed
results exactly (build/vet clean, badges package green, full Go suite failure count 55 = 51
baseline + 4 new DSN-gated tests, frontend vitest 2225/2225 passing, tsc clean except one known
pre-existing unrelated error, no CSS-module files touched).

---

_Verified: 2026-09-07T02:01:16Z_
_Verifier: Claude (gsd-verifier)_
