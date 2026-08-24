---
phase: 138-effective-rights-administration-impact-ux
verified: 2026-08-24T08:57:12Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 4/4
  gaps_closed:
    - "WR-01 non_deniable=true && user_deny=true combination in GuidedRevokeFlow — was the sole human_needed item; now closed by an automated regression test (GuidedRevokeFlow.test.tsx, 7th test, GAP-03) rather than a live DB fixture. Deliberate, documented closure route (138-HUMAN-UAT.md's own gap-closure block), not a silent carry-forward."
    - "fansubEditAccess.test.ts stale assertion regression (previously flagged as a non-blocking anti-pattern warning) — fixed by commit f73b608b, re-run confirms 15/15 passing."
    - "UserGroupRightsTab.tsx 450-line modularity violation (was 716 lines, previously flagged as a warning) — resolved by a subsequent refactor (commit 7039195b, extracting GroupRolesSection.tsx/GroupSection.tsx); file is now 269 lines."
    - "UAT-138-A horizontal page overflow at 394px — fixed (minmax(0, 1fr) on .card/.accordionRoot) and live-remeasured (document.scrollWidth === clientWidth)."
    - "UAT-138-C raw role/capability codes and missing actor_display_name in /admin/changes — fixed (commit 66164839, quick-260823-w9y)."
    - "GAP-01 negative relative-time ('vor -1 Tagen') in the admin user list — fixed and live-remeasured (commit 30800135)."
    - "GAP-02 RoleCapabilityImpactPreviewModal unusable at 394px (clipped metric, horizontally-scrolling detail table, dialog using only the top quarter of viewport height) — fixed across three tasks (commits dc46628f, 791dcb4a, 062d578f/6b8b0a0c) and live-remeasured."
  gaps_remaining: []
  regressions: []
---

# Phase 138: Effective-Rights Administration & Impact UX Verification Report

**Phase Goal:** Admins can understand and change a user's effective group rights from the existing canonical surfaces without guessing which role grants access or receiving false mutation success.
**Verified:** 2026-08-24T08:57:12Z
**Status:** passed
**Re-verification:** Yes — full goal-backward re-verification, superseding the prior report (`status: human_needed`, score 4/4, dated 2026-08-23T20:01:48Z). This is not a rubber-stamp of ROADMAP.md/STATE.md's "Complete" marker — every truth below was independently re-checked against the current codebase, not against SUMMARY.md or HUMAN-UAT.md claims alone.

## What Changed Since the Prior Verification

Since 2026-08-23T20:01:48Z, three things happened, all independently confirmed in this session:

1. **Live human UAT ran** (`138-HUMAN-UAT.md`, now `status: complete`, 11/11 passed, 0 blocked/pending/issues). It found UAT-138-A (horizontal overflow, major — fixed and re-measured), UAT-138-C (raw technical codes, minor — fixed), and withdrew UAT-138-B (tester's own measurement error, not a real defect — the active-tab pill's `linear-gradient` background was mis-sampled mid-transition).
2. **Two gap-closure plans executed:** 138-17 (GAP-01 negative relative-time clamp + GAP-03 WR-01 regression test) and 138-18 (GAP-02 narrow-viewport impact-preview modal fix — metrics visibility, per-user card layout, content-driven dialog height).
3. **Phase 138 now totals 18 plans** (138-01..138-18), all with SUMMARY.md files, all commits present in `git log`.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The existing user-detail group-rights tab shows the complete effective capability set and its provenance, and is the canonical place for scoped user allow/deny changes. | ✓ VERIFIED | `UserGroupRightsTab.tsx` (now 269 lines, refactored down from 716 via commit `7039195b` extracting `GroupRolesSection.tsx`/`GroupSection.tsx`, both well under the 450-line cap) still calls `getEffectiveRights`/`listRoleCapabilities` against the real routed backend (`GET /admin/fansubs/:id/app-members/:appUserId/effective-rights`, confirmed present at `backend/cmd/server/admin_routes.go:298`), renders category-grouped `EffectiveRightState` rows with role labels resolved via `roleLabelFor` (not raw codes — UAT-138-C fix), and hosts `GuidedGrantFlow`/`GuidedRevokeFlow`/`RoleAssignmentImpactModal` as the only mutation entry points. 9/9 `UserGroupRightsTab.test.tsx` tests re-run and pass. Live UAT (`138-HUMAN-UAT.md` Test 5) independently confirmed this structure end-to-end. |
| 2 | A guided "user must not do this" flow lists every granting source and recommends a scoped user deny before offering broader membership or role-matrix changes. | ✓ VERIFIED | `GuidedRevokeFlow.tsx`'s `isNonDeniable && !isRemoveMode` guard (WR-01 fix) confirmed unchanged and correct via `grep -c` (exactly 1 occurrence). The previously sole `human_needed` gap — no automated test for the exact `non_deniable=true && user_deny=true` combination — is now closed: `GuidedRevokeFlow.test.tsx` re-run shows 7/7 tests passing, including the new WR-01 regression test (renders that exact combination, asserts no dead-end text, asserts the "Abweichung entfernen" button is present/functional, asserts `mutateCapabilityOverride` is called with `effect: null`, asserts the real activation status resolves). The pre-existing counter-test (`non_deniable=true` without `user_deny` → button absent, explanation shown) is unmodified and still passes. |
| 3 | Before changing a role-capability mapping, an admin sees affected role holders and which users actually gain, lose, or retain the capability through another source. | ✓ VERIFIED | `RoleCapabilityImpactPreviewModal.tsx` (418 lines, under the cap) re-verified as the sole mutation entry point (no direct `handleGrant`/`handleRevoke` in `RoleCapabilityClient.tsx`). Backend `PreviewGroupRightsCapabilityChange`/`GET .../impact-preview` re-run: 12/12 targeted backend handler tests pass (`TestAdminCapabilityImpactHandler*` + siblings). GAP-02's three narrow-viewport defects (clipped metric, horizontally-scrolling before/after columns, dialog using only the top quarter of viewport height) are closed: `.metricsRow` column-stacks below 759px (all 5 metrics guaranteed visible), a mobile `Card`-list branch renders vorher/nachher/Grund without horizontal scroll, and a new opt-in `Modal.panelClassName` prop gives this one dialog content-driven height at ≤767px without touching the shared `.modalPanel`/`.modalBody` rule (`git diff --stat ui.module.css` empty; `grep -c "grid-template-columns: minmax(0, 1fr)"` still `5`; 29 other `<Modal>` call sites confirmed not passing `panelClassName`). `RoleCapabilityImpactPreviewModal.test.tsx` re-run: 8/8 passing (6 desktop + 1 narrow-width metrics/card + 1 `narrowHeightFix` structural test). Live UAT (`138-HUMAN-UAT.md`, "Gap-Block Ergebnis") independently re-measured all three fixes at 394px in a real browser after the gap-closure plans landed. |
| 4 | After a role-matrix mutation, the UI distinguishes persisted, cache-active, pending, and failed activation states and never reports stale enforcement as final success. | ✓ VERIFIED | `RoleCapabilityMutationResult.cache_reload_succeeded` / `CapabilityOverrideMutationResult.activation_status` still flow into the shared `ActivationStatusIndicator`. `TestAdminCapabilityHandlerCacheReloadSucceededField` re-run: 4/4 subtests pass. Live UAT Test 8 independently confirmed "Gespeichert und aktiv." renders and the dialog stays open through confirmation rather than fabricating an immediate success message. |

**Score:** 4/4 truths verified (unchanged from prior verification's score, but now with the prior single open gap fully closed and independently re-confirmed, not just carried forward)

### Merged Must-Haves from Gap-Closure Plans (138-17, 138-18)

These plan-level `must_haves` add detail under Truths 2 and 3 above; none reduce ROADMAP scope.

| Must-have (from 138-17/138-18 frontmatter) | Status | Evidence |
|---|---|---|
| Admin user list never renders "vor -N Tagen" for a timestamp at/after now | ✓ VERIFIED | `formatRelativeDate` exported, clamps `Math.max(0, diff)` before `Math.floor`; `AdminUsersClient.test.tsx` re-run 5/5 pass (2 pre-existing D-06 URL round-trip + 3 new). Live-remeasured in `138-HUMAN-UAT.md`'s gap-block: "Heute"/"Gestern"/"vor 2 Tagen" — zero negative values on the real `/admin/users` page. |
| non_deniable=true + user_deny=true reaches the confirm step (WR-01) | ✓ VERIFIED | See Truth 2 above. |
| Counter-test (non_deniable=true, no user_deny) still blocks | ✓ VERIFIED | Confirmed unmodified and passing (first test in the file). |
| All 5 D-19 metrics visible at 394px | ✓ VERIFIED | `.metricsRow` column-stacks; live-remeasured (all five metrics fully inside dialog bounds, 19px–292px of a 394px viewport). |
| Per-user impact readable without horizontal scroll at 394px | ✓ VERIFIED | Mobile `Card` branch renders vorher/nachher/Grund inline; live-remeasured (zero horizontally-scrolling containers). |
| Dialog height content-driven at ≤767px, other modals unaffected | ✓ VERIFIED | `panelClassName` opt-in prop, `ui.module.css` untouched, 29 other `<Modal>` call sites grep-confirmed unaffected. Live-remeasured: panel 604px tall at 900px viewport, centered, no dead space. |
| Desktop table/metrics unchanged | ✓ VERIFIED | `git diff` on `categorizeImpact`/`impactReasonText`/`resolveHolder`/`buildImpactSummary` shows no changes; desktop Table JSX block textually unchanged. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` | Canonical resolver-backed rights tab | ✓ VERIFIED | 269 lines (was 716 at prior verification — 450-line-cap warning from the prior report is now resolved via commit `7039195b`), real fetches, all mutation flows anchored here |
| `frontend/src/app/admin/users/tabs/GroupRolesSection.tsx`, `GroupSection.tsx` | Extraction targets from the UserGroupRightsTab refactor | ✓ VERIFIED | 96 and 105 lines respectively, both wired into `UserGroupRightsTab.tsx`, both well under the cap |
| `frontend/src/app/admin/users/tabs/GuidedRevokeFlow.tsx` / `.test.tsx` | WR-01 fix + regression test | ✓ VERIFIED | Branch order unchanged and correct; 7/7 tests pass including new WR-01 test |
| `frontend/src/app/admin/users/AdminUsersClient.tsx` / `.test.tsx` | Exported, clamped `formatRelativeDate` | ✓ VERIFIED | `export function formatRelativeDate` present, `Math.max(0, ...)` clamp present, 5/5 tests pass |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.tsx` | Sole CAP-09 mutation-gating modal, responsive at ≤767px | ✓ VERIFIED | 418 lines, `useIsMobile()` hook, `Card`-based mobile branch, `panelClassName={styles.narrowHeightFix}` wired, 8/8 tests pass |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.module.css` | Responsive CSS module (new in 138-18) | ✓ VERIFIED | `.metricsRow`/`.metricItem`/`.detailCards`/`.narrowHeightFix` all present, design tokens only, no local custom properties |
| `frontend/src/components/ui/Modal.tsx` | Opt-in `panelClassName` prop, additive only | ✓ VERIFIED | Present; `[styles.modalPanel, size==='lg'?styles.modalPanelLg:null, panelClassName].filter(Boolean).join(' ')`; grep confirms 29 other call sites never pass it; `Modal.test.tsx` still 3/3 |
| `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts` | Regression from Plan 138-16 (previously flagged) | ✓ VERIFIED (fixed) | Commit `f73b608b` updated the stale assertion to include the new `"changes"` tab; re-run confirms 15/15 passing |
| `backend/internal/repository/audit_logs_query.go` | CR-01 fix (`ActorAppUserID` distinct field) | ✓ VERIFIED | Present at lines 35/48/59/104-105/191 |
| `shared/contracts/admin-capabilities.yaml` | `actor_display_name`/`target_display_name` on `ChangeListRow` (UAT-138-C) | ✓ VERIFIED | Confirmed via `frontend/src/types/admin-users.ts` (lines 294-295) and `ChangesClient.tsx` consumption (lines 274/284), traced back to commit `66164839` |
| `backend/cmd/server/admin_routes.go` | All 9+ Phase-138 handler routes registered | ✓ VERIFIED | `role-holders`, `effective-rights`, `impact-preview`, `/admin/claims`, `/admin/changes` all present and routed |

All artifacts previously marked VERIFIED in the prior report were spot-re-checked and remain accurate; none regressed.

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `UserGroupRightsTab.tsx` | `GET /admin/.../effective-rights` | `getEffectiveRights` fetch | WIRED |
| `GuidedRevokeFlow.tsx` | `PUT/DELETE /admin/.../capability-overrides` | `mutateCapabilityOverride` (regression-tested for the WR-01 combination) | WIRED |
| `RoleCapabilityClient.tsx` → `RoleCapabilityImpactPreviewModal.tsx` | `GET .../impact-preview` + `PUT`/`DELETE` | `onRequestChange` → self-fetch → confirm | WIRED |
| `RoleCapabilityImpactPreviewModal.tsx` → `Modal.tsx` | `panelClassName` prop passthrough | `panelClassName={styles.narrowHeightFix}` | WIRED (additive, non-breaking for 29 other call sites) |
| `AdminUsersClient.tsx` → `AdminUsersClient.test.tsx` | direct import | `import { formatRelativeDate } from './AdminUsersClient'` | WIRED |
| `admin_routes.go` | all Phase-138 handlers | direct route registration | WIRED (grep-confirmed) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `UserGroupRightsTab.tsx` | `rights` (EffectiveRightState[]) | `getEffectiveRights` → `AdminEffectiveRightsHandler.GetEffectiveRights` → real Postgres-backed `evaluateGroupRights` | Yes | ✓ FLOWING |
| `RoleCapabilityImpactPreviewModal.tsx` | `summary`/`pageRows` (mobile Card + desktop Table both render the same source) | `getRoleCapabilityImpactPreview` + `listRoleHolders` → real join queries | Yes | ✓ FLOWING |
| `AdminUsersClient.tsx` | `formatRelativeDate(user.last_activity_at)` | Clamped local computation over a real fetched timestamp | Yes | ✓ FLOWING (bug-fixed, not hollow) |
| `ChangesClient.tsx` | `entry.actor_display_name`/`entry.target_display_name` | `listChanges` → `AuditLogRepository.ListChanges` with two additive LEFT JOINs against `app_users` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks / Full Test-Suite Re-Run

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend builds/vets clean | `go build ./...` / `go vet ./...` (in `team4sv30-backend`) | No output, exit 0 | ✓ PASS |
| Core precedence + service packages | `go test ./internal/permissions/... ./internal/services/...` | `ok` both | ✓ PASS |
| All Phase-138 handler tests (targeted) | `go test -run 'TestAdmin(CapabilityImpact\|RoleAssignmentImpact\|ClaimActivationImpact\|Changes\|Capability\|RoleHolders)Handler.*' ./internal/handlers/...` | 100% pass (18 subtests) | ✓ PASS |
| Full `internal/handlers` package | `go test ./internal/handlers/...` | 29 failing tests, all in `admin_content_anime_project_notes_test.go`, `admin_content_anime_theme_segment_assignments_test.go`, `admin_content_fansub_releases_test.go`, contributions/fansub-app-member tests, `TestPhase128PublicMemberAccessMatrix`, `TestReleaseVersionMedia_CapabilitiesExposeOwnDelete` — **none in a Phase-138-touched file** | ⚠️ Pre-existing, unrelated (see below) |
| CAP-08/09/10/UADM-01 frontend suites (targeted) | `npx vitest run` (`AdminUsersClient`, `GuidedRevokeFlow`, `RoleCapabilityImpactPreviewModal`, `UserGroupRightsTab`, `Modal`) | 32/32 pass across 5 files | ✓ PASS |
| `fansubEditAccess.test.ts` (prior report's flagged regression) | `npx vitest run .../fansubEditAccess.test.ts` | 15/15 pass | ✓ PASS (regression closed) |
| Full `src/app/admin` sweep | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/app/admin --reporter=basic"` | 760/784 tests pass, 92/96 files pass; 24 failures across exactly 4 files | ⚠️ Pre-existing, unrelated (see below) |
| `ResponsiveImage.config.test.ts` (outside `src/app/admin`) | `npx vitest run src/components/ui/ResponsiveImage.config.test.ts` | 11/12 pass, 1 pre-existing failure (`hasLocalMatch` media-path allowlist) | ⚠️ Pre-existing, unrelated |

**Pre-existing/unrelated debt, independently re-confirmed in this session (NOT counted against Phase 138):**

- Backend: `internal/handlers` package's nil-`permissions.Service.LoadCache` issue in `testmain_test.go` denies all `roleAllows` checks project-wide; documented in `.planning/STATE.md` "Blockers/Concerns" (traced back to Phase 137, not Phase 138) and `.planning/phases/138-.../deferred-items.md`. None of the ~29 failing tests touch any Phase-138 file (`effective_rights_*.go`, `admin_capability_*_handler.go`, `admin_role_*_handler.go`, `admin_changes_handler.go`, `audit_logs_query.go`, `admin_routes.go`).
- Frontend: `FansubAppMembersSection.test.tsx` (8 tests) and `fansubs/[id]/edit/page.test.tsx` (12 tests) both fail on a pre-existing `useRoleCatalog must be used within RoleCatalogProvider` crash, root-caused to Phase 136's `FansubAppMembersOverview.tsx`/`AnimeReleasesCockpit.tsx` call sites, confirmed via `git stash` comparison in `deferred-items.md` (identical failure count before/after Plan 138-16).
- `useGroupMembersTab.test.ts` (2 tests) — same `useRoleCatalog` root cause.
- `UserContributionsTab.test.tsx` (2 tests) — pre-existing Phase-136 hex-only `color_key` normalization vs. a stale fixture, confirmed present before Plan 03's own change via a `git stash` comparison documented in `deferred-items.md`.
- `ResponsiveImage.config.test.ts` (1 test, outside `src/app/admin`) — a media-path allowlist assertion unrelated to any Phase-138 file.

This session's re-run count (24 failures / 4 files inside `src/app/admin`, plus 1 outside) exactly matches the counts documented in `138-17-SUMMARY.md` ("758/782... 4 failing files") and `138-HUMAN-UAT.md`'s gap-block ("25 Fehler in denselben fünf vorbelasteten Dateien... 836 bestanden") — the 2-test delta (758→760, 782→784) is explained by the two new AdminUsersClient/GuidedRevokeFlow tests plus a small collection-count fluctuation, not a new regression. No new failing files appeared in this independent re-run.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| CAP-08 | 138-08, 138-17 | Guided revoke flow lists granting sources, recommends scoped deny before broader changes | ✓ SATISFIED | `GuidedRevokeFlow.tsx`, WR-01 fix now regression-tested (138-17) |
| CAP-09 | 138-04, 07, 09, 13, 18 | Role→capability change impact preview: affected holders + actual gain/lose/retain, usable at all supported viewport widths | ✓ SATISFIED | `PreviewGroupRightsCapabilityChange`, `RoleCapabilityImpactPreviewModal.tsx`, narrow-viewport defects closed (138-18) |
| CAP-10 | 138-02, 08, 13 | Honest activation-status vocabulary (persisted/cache-active/pending/failed) | ✓ SATISFIED | `cache_reload_succeeded`, `ActivationStatusIndicator`, re-confirmed via `TestAdminCapabilityHandlerCacheReloadSucceededField` |
| UADM-01 | 138-06, 08, 15 | Existing group-rights tab is the canonical inspection/edit surface | ✓ SATISFIED | `UserGroupRightsTab.tsx` (now refactored, still resolver-backed, all mutation flows anchored there) |

No orphaned requirements — `REQUIREMENTS.md` maps exactly CAP-08, CAP-09, CAP-10, UADM-01 to Phase 138, and all four appear in at least one plan's `requirements:` frontmatter (including the two gap-closure plans).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| — | — | Prior report's `fansubEditAccess.test.ts` stale-assertion regression | — | **CLOSED.** Commit `f73b608b` fixed the assertion; re-run confirms 15/15 passing. No longer an open finding. |
| — | — | Prior report's `UserGroupRightsTab.tsx` 716-line modularity-cap violation | — | **CLOSED.** Commit `7039195b` (quick-s7v) extracted `GroupRolesSection.tsx`/`GroupSection.tsx`; the file is now 269 lines, well under the 450-line cap. |
| — | — | Debt markers (`TBD`/`FIXME`/`XXX`) in any file touched by Plans 138-17/138-18 | — | None found. |
| — | — | Cleanup markers (`TODO`/`HACK`/`PLACEHOLDER`) or "not yet implemented" copy in Plans 138-17/138-18's files | — | None found. |
| — | — | Native `<select>`/`<input>`/`<textarea>`/`<button>` in the new/modified 138-17/138-18 files | — | None found — all UI uses `@/components/ui` primitives (`Card`, `Badge`, `Button`, `Modal`, `Table`, `Pagination`). |
| — | — | ASCII umlaut substitutes in user-facing strings in the new/modified files | — | None found — `über`, `persönliche`, `Änderung` etc. render with correct umlauts throughout. |

No new anti-patterns introduced by Plans 138-17/138-18; both previously-flagged warnings from the prior verification are now closed (not by this verifier's judgment call, but by subsequent, independently-confirmed commits).

### Human Verification Required

**None.** The prior report's sole `human_needed` item — a live click-through proving `GuidedRevokeFlow` lets an admin remove a dormant personal deny-override on a non-deniable actor (the WR-01 `non_deniable=true && user_deny=true` scenario) — is now closed.

This closure is deliberate and explicitly documented, not silently dropped: `138-HUMAN-UAT.md`'s own live UAT session (2026-08-23T20:10:00Z–21:35:00Z) attempted this exact test first and found it technically `[blocked]` — the running database has only four users (admin, D1sk, founder, coleader) and none carries a stored `user_deny` on a `non_deniable` capability, and the UI has no way to construct that combination (a non-deniable right cannot be personally denied in the first place, by design). Rather than fabricate a one-off DB fixture, the phase's own gap-closure plan (138-17) chose to pin the scenario with a permanent automated regression test in `GuidedRevokeFlow.test.tsx` instead — a stronger, durable guarantee than a single live click-through. This verifier confirms: (1) the new test renders the exact `non_deniable: true, user_deny: true` state combination, (2) asserts the confirm step is reached with no dead-end explanation text, (3) asserts the mutation call carries removal semantics (`effect: null`, not a new deny), (4) asserts the real (mocked) activation status resolves afterward, and (5) the pre-existing counter-test proving the opposite scenario (`non_deniable: true` alone) still blocks, unmodified. Given the branch condition (`isNonDeniable && !isRemoveMode`) is provably unchanged since the original WR-01 fix and manual code trace, and is now pinned by a passing automated test exercising the precise combination the finding described, this verifier does not consider a live DB-fixture click-through necessary to close this item. If a future live UAT session encounters a real user with this exact combination, a quick spot-check remains prudent but is not blocking.

No other item in this phase requires human/visual verification: `138-HUMAN-UAT.md` is `status: complete` with 11/11 passed, and the two remaining gap-closure plans (138-17, 138-18) were each independently re-measured live in a real browser per their own `138-HUMAN-UAT.md` "Gap-Block Ergebnis" entries (394px viewport, real DOM measurements of `document.scrollWidth`, dialog panel height, and metric positions) rather than only unit-tested.

## Gaps Summary

**No gaps.** All four ROADMAP success criteria for Phase 138 are independently re-verified against real, current code — not against SUMMARY.md, HUMAN-UAT.md, or ROADMAP.md's "Complete" marker. Both items flagged as non-blocking warnings in the prior verification (`fansubEditAccess.test.ts` regression, `UserGroupRightsTab.tsx` over the 450-line cap) are now closed by subsequent, independently-confirmed commits (`f73b608b`, `7039195b`) — not silently dropped, but actually re-checked and found fixed. The prior report's sole `human_needed` item (WR-01 live click-through) is closed via a deliberate, documented automated-test route rather than carried forward unconditionally.

All 5 code-review findings from `138-REVIEW.md` (CR-01, WR-01..WR-04) remain fixed in real commits. All three live-UAT findings from `138-HUMAN-UAT.md` (UAT-138-A major, UAT-138-C minor; UAT-138-B was a tester measurement error, withdrawn) are fixed and live-remeasured. All three post-hoc gaps (GAP-01, GAP-02, GAP-03) from the gap-closure round are fixed, tested, and (for GAP-01/GAP-02) live-remeasured at 394px in a real browser.

**Pre-existing, unrelated test debt** (backend `internal/handlers` nil-cache issue rooted in Phase 137's `testmain_test.go`; `FansubAppMembersSection.test.tsx`, `fansubs/[id]/edit/page.test.tsx`, `useGroupMembersTab.test.ts` — all three rooted in Phase 136's `useRoleCatalog` call sites; `UserContributionsTab.test.tsx` — rooted in a Phase-136 fixture/normalization mismatch; `ResponsiveImage.config.test.ts` — an unrelated media-path allowlist gap) was independently re-run and re-confirmed present in this session, with identical scope to what `deferred-items.md` and `.planning/STATE.md` already document. This is real project debt worth a dedicated follow-up phase, but it predates Phase 138, is untouched by any Phase-138 file, and does not count against this phase's own pass/fail determination.

---

_Verified: 2026-08-24T08:57:12Z_
_Verifier: Claude (gsd-verifier), re-verification pass_
_Supersedes: 138-VERIFICATION.md dated 2026-08-23T20:01:48Z (status: human_needed, score 4/4)_
