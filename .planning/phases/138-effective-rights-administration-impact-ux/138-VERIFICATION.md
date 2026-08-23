---
phase: 138-effective-rights-administration-impact-ux
verified: 2026-08-23T20:01:48Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open a capability row for a user who is a platform admin (non_deniable=true) and already has a stale personal user_deny override on that same action. Click 'Abweichung entfernen' and confirm the removal actually completes (does not dead-end on the 'cannot be revoked' explanation)."
    expected: "GuidedRevokeFlow proceeds to the confirm step and lets the admin remove the dormant override (via the WR-01 branch-order fix: isNonDeniable is now checked only when !isRemoveMode)."
    why_human: "No automated test exercises the exact non_deniable=true && user_deny=true combination the WR-01 finding described. 138-REVIEW-FIX.md itself flags this fix as 'requires human verification' since it is a conditional-logic branch-order change with no regression test pinning the fixed behavior. Manual code trace in this verification confirms the logic is correct, but a live click-through was not performed by this verifier."
---

# Phase 138: Effective-Rights Administration & Impact UX Verification Report

**Phase Goal:** Admins can understand and change a user's effective group rights from the existing canonical surfaces without guessing which role grants access or receiving false mutation success.
**Verified:** 2026-08-23T20:01:48Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The existing user-detail group-rights tab shows the complete effective capability set and its provenance, and is the canonical place for scoped user allow/deny changes. | ✓ VERIFIED | `UserGroupRightsTab.tsx` calls `getEffectiveRights`/`listRoleCapabilities` (real fetches to `GET /admin/fansubs/:id/app-members/:appUserId/effective-rights`, routed in `admin_routes.go:298`), renders per-group, category-grouped (`categoryDisplayLabel`, 7 real registry categories) `EffectiveRightState` rows with `GrantingRoles`/`SpecializedGrants`/`UserAllow`/`UserDeny` provenance, and hosts `GuidedGrantFlow`/`GuidedRevokeFlow`/`RoleAssignmentImpactModal` as the only mutation entry points. 9/9 `UserGroupRightsTab.test.tsx` tests pass. Zero new client-side precedence logic (D-14) — component only renders resolver output. |
| 2 | A guided "user must not do this" flow lists every granting source and recommends a scoped user deny before offering broader membership or role-matrix changes. | ✓ VERIFIED | `GuidedRevokeFlow.tsx` renders `state.granting_roles` with a "kann durch eine persönliche Abweichung nicht entzogen werden" flag for non-fansub-group-catalog roles, states "Empfohlen: Persönliche Abweichung … setzen", and blocks confirmation for non-deniable rights with an explanation (no disabled button, D-17). WR-01 fix (`isNonDeniable && !isRemoveMode`) verified present in code and in commit `66a43e91`; all 6 `GuidedRevokeFlow.test.tsx` tests pass. See Human Verification below for the one untested edge combination. |
| 3 | Before changing a role-capability mapping, an admin sees affected role holders and which users actually gain, lose, or retain the capability through another source. | ✓ VERIFIED | Backend `PreviewGroupRightsCapabilityChange` (`effective_rights_capability_impact_preview.go`) batch-computes before/after `CapabilityRightState` per real role holder via the unmodified `evaluateGroupRights`/`evaluateGroupRightsWithHypotheticalGrant` precedence path (D-20, zero second decision engine); `GET /admin/role-capabilities/:roleCode/:actionCode/impact-preview` is routed (`admin_routes.go:276`) and gated platform-admin-only. `RoleCapabilityClient.tsx` no longer has direct `handleGrant`/`handleRevoke` — every toggle routes through `RoleCapabilityImpactPreviewModal`, which self-fetches the preview + holder list and blocks mutation on preview failure. 8/8 backend impact-preview tests and 6/6 `RoleCapabilityImpactPreviewModal.test.tsx` pass. WR-02 (missing OpenAPI path) fixed and present in `shared/contracts/admin-capabilities.yaml` (commit `8e3c92fc`). |
| 4 | After a role-matrix mutation, the UI distinguishes persisted, cache-active, pending, and failed activation states and never reports stale enforcement as final success. | ✓ VERIFIED | `RoleCapabilityMutationResult.cache_reload_succeeded` (Go DTO → OpenAPI → TS → `api.ts`) and `CapabilityOverrideMutationResult.activation_status` both flow into the shared `ActivationStatusIndicator` component, which renders distinct, honest copy per path ("Gespeichert und aktiv" / "Gespeichert, aber nicht aktiv…" for role-matrix; "Gespeichert und sofort aktiv" / "Status wird geprüft…" for override) — never a fabricated always-success message. `TestAdminCapabilityHandlerCacheReloadSucceededField` (backend) and `ActivationStatusIndicator.test.tsx` (6/6) pass. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/repository/authz_role_holders_repository.go` | `ListRoleHolders` non-N+1 join | ✓ VERIFIED | Exists, substantive, wired into handler/route |
| `backend/internal/handlers/admin_role_holders_handler.go` | Platform-admin-gated role-holder endpoint | ✓ VERIFIED | Routed `GET /admin/role-holders/:roleCode` |
| `backend/internal/handlers/admin_capability_handler.go` | `cache_reload_succeeded` field | ✓ VERIFIED | Field present, contract-closed to TS |
| `frontend/src/components/ui/ActivationStatusIndicator.tsx` | Shared honest activation-status primitive | ✓ VERIFIED | Discriminated `path` prop, used by 3 consumers |
| `backend/internal/repository/admin_users_tab_repository.go` | Real version label/episode join | ✓ VERIFIED (grep false-negative on exact string `release_versions.version`; actual column is aliased `rv.version` via `LEFT JOIN release_versions rv` — confirmed present and correct) |
| `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx` | D-29 display-bug fix | ✓ VERIFIED | Renders real label/episode, falls back safely |
| `backend/internal/permissions/effective_rights_role_assignment_preview.go` | `PreviewGroupRightsWithRoleChange` | ✓ VERIFIED | D-20-compliant thin wrapper |
| `backend/internal/handlers/admin_role_assignment_impact_handler.go` | Role-assignment impact endpoint | ✓ VERIFIED | Routed, tested (5/5) |
| `backend/internal/repository/member_claims_list_repository.go` / `audit_logs_query.go` | Cross-group Claims/Änderungen list queries | ✓ VERIFIED | Both routed, CR-01 fix present (`ActorAppUserID` distinct field) |
| `frontend/src/lib/api.ts` (`getEffectiveRights`/`mutateCapabilityOverride`/`listOverrideHistory`/`listRoleHolders`/`getRoleCapabilityImpactPreview`/`getRoleAssignmentImpactPreview`/`getClaimActivationImpactPreview`/`listClaims`/`listChanges`) | Full contract chain wiring | ✓ VERIFIED | All real fetches to routed backend endpoints, no stubs |
| `backend/internal/permissions/effective_rights_capability_impact_preview.go` | `PreviewGroupRightsCapabilityChange` | ✓ VERIFIED | D-20-compliant, table-driven tests |
| `backend/internal/handlers/admin_capability_impact_handler.go` | CAP-09 batch preview endpoint | ✓ VERIFIED | Routed, tested, WR-02 contract gap fixed |
| `frontend/src/app/admin/users/tabs/GuidedRevokeFlow.tsx` / `GuidedGrantFlow.tsx` / `CapabilityHistoryPanel.tsx` | CAP-08 guided flows + inline history | ✓ VERIFIED | WR-01 fixed, all tests pass |
| `frontend/src/app/admin/users/tabs/RoleAssignmentImpactModal.tsx` | D-22 impact-gated role assignment UI | ✓ VERIFIED | Reuses existing mutation endpoint, tested |
| `frontend/src/app/admin/claims/*`, `frontend/src/app/admin/changes/*`, `frontend/src/app/admin/roles/*` | New top-level workspaces | ✓ VERIFIED | Real routes, filters, navigation; tests pass |
| `frontend/src/app/admin/role-capabilities/RoleCapabilityImpactPreviewModal.tsx` | CAP-09 mutation-gating modal | ✓ VERIFIED | Sole mutation path, direct handlers deleted |
| `backend/internal/permissions/effective_rights_claim_activation_preview.go` | D-24 claim-activation impact preview | ✓ VERIFIED | Reuses `ResolveGroupRights`, zero-write |
| `frontend/src/components/admin/AdminMainNav.tsx`, `UserDetailPageClient.tsx` Tabs rewrite, `AdminUsersClient.tsx`, `UserOverviewTab.tsx` | D-01/D-02/D-03/D-04/D-05 IA glue | ✓ VERIFIED | Persistent nav, 6-tab detail page, locked columns |
| `frontend/src/app/admin/fansubs/[id]/edit/GroupRolesTab.tsx` / `GroupChangesTab.tsx` | D-06 group view perspectives | ✓ VERIFIED | Reuse existing endpoints, tests pass — see anti-pattern note on a related test regression below |
| `frontend/src/app/admin/roles/RoleHoldersTable.tsx` | Role-holder table | ✓ VERIFIED (grep false-negative: `listRoleHolders` is called by the parent `RolesClient.tsx`, which passes `holders` as a prop into this presentational component — confirmed wired) |

### Key Link Verification

All 16 plans' `verify.key-links` checks passed (`gsd-sdk query verify.key-links`), including:

| From | To | Via | Status |
|------|-----|-----|--------|
| `UserGroupRightsTab.tsx` | `GET /admin/.../effective-rights` | `getEffectiveRights` fetch | WIRED |
| `GuidedRevokeFlow.tsx`/`GuidedGrantFlow.tsx` | `PUT /admin/.../capability-overrides` | `mutateCapabilityOverride` | WIRED |
| `RoleCapabilityClient.tsx` → `RoleCapabilityImpactPreviewModal.tsx` | `GET .../impact-preview` + `PUT`/`DELETE` | `onRequestChange` → self-fetch → confirm | WIRED |
| `RoleAssignmentImpactModal.tsx` | `GET .../role-assignment-impact` + existing role-PUT | `getRoleAssignmentImpactPreview` | WIRED |
| `ClaimDecisionImpactPanel.tsx` | `GET .../claim-activation-impact` | `getClaimActivationImpactPreview` | WIRED |
| `ClaimsClient.tsx`/`ChangesClient.tsx`/`RolesClient.tsx` | `GET /admin/claims`/`/admin/changes`/`/admin/role-holders/:code` | `listClaims`/`listChanges`/`listRoleHolders` | WIRED |
| `admin_routes.go` | all 9 new/extended handlers | direct route registration | WIRED (confirmed via grep of `admin_routes.go`) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `UserGroupRightsTab.tsx` | `rights` (EffectiveRightState[]) | `getEffectiveRights` → `AdminEffectiveRightsHandler.GetEffectiveRights` → `ResolveGroupRights`/`evaluateGroupRights` (real Postgres-backed precedence engine) | Yes | ✓ FLOWING |
| `RoleCapabilityImpactPreviewModal.tsx` | `preview`/`holders` | `getRoleCapabilityImpactPreview` + `listRoleHolders` → `PreviewGroupRightsCapabilityChange`/`ListRoleHolders` (real join queries) | Yes | ✓ FLOWING |
| `ClaimsClient.tsx` | `claims` | `listClaims` → `MemberClaimsRepository.ListClaims` (real, paginated, `COUNT(*) OVER()`) | Yes | ✓ FLOWING |
| `ChangesClient.tsx` | `changes` | `listChanges` → `AuditLogRepository.ListChanges` (real `audit_logs` query, CR-01 fix applied) | Yes | ✓ FLOWING |
| `RolesClient.tsx`/`RoleHoldersTable.tsx` | `holders` | `listRoleHolders` → `AuthzRepository.ListRoleHolders` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend builds/vets clean | `go build ./...` / `go vet ./...` (inside `team4sv30-backend`) | No output, exit 0 | ✓ PASS |
| Core precedence + service packages pass | `go test ./internal/permissions/... ./internal/services/...` | `ok` both packages | ✓ PASS |
| All new Phase-138 handler tests pass | `go test -run 'TestAdmin(CapabilityImpact\|RoleAssignmentImpact\|ClaimActivationImpact\|Changes\|Capability\|RoleHolders)Handler.*' ./internal/handlers/...` | 100% pass (18 subtests) | ✓ PASS |
| CR-01 fix present in code | `grep ActorAppUserID audit_logs_query.go` | Distinct field + strict clause found | ✓ PASS |
| All 5 review fixes are real commits | `git show <hash> --stat` for all 5 hashes in 138-REVIEW-FIX.md | All 5 commits exist with matching diffs | ✓ PASS |
| Frontend routes registered end-to-end | `grep -n "role-holders\|effective-rights\|impact-preview\|/admin/claims\|/admin/changes" admin_routes.go` | All 9 routes present | ✓ PASS |
| Core CAP-08/09/10/UADM-01 frontend test suites | `npx vitest run` (GuidedRevokeFlow, GuidedGrantFlow, RoleCapabilityImpactPreviewModal, RoleAssignmentImpactModal, UserGroupRightsTab, CapabilityHistoryPanel, ClaimsClient, ChangesClient, AdminMainNav, ActivationStatusIndicator) | 60/60 tests pass | ✓ PASS |
| Full frontend `npx vitest run` | project-wide | 254 files / 1999 tests pass; 18 files / 47 tests fail | ⚠️ See below |
| Full backend `go test ./internal/handlers/...` | project-wide | ~20+ pre-existing failures, all in files phase 138 never touched | ⚠️ See below (matches `deferred-items.md`) |

### Full Test-Suite Triage (independent re-verification of `deferred-items.md` claims)

This verifier independently re-ran the full backend `internal/handlers` package and the full frontend `vitest run`, then traced every failing file's git history to confirm none are phase-138 regressions, **with one exception found**:

| Failing file | Root cause | Touched by Phase 138? | Verdict |
|---|---|---|---|
| `internal/handlers` (~20 tests, `admin_content_*`, `app_auth_test.go`) | `testmain_test.go`'s `handlerTestCatalogLoader` never calls `permissions.Service.LoadCache`, nil-cache denies all `roleAllows` checks | No (none of the failing files are in phase 138's diff) | Pre-existing, matches `STATE.md` Blockers/Concerns and `deferred-items.md` |
| `TestPhase128PublicMemberAccessMatrix`, `TestReleaseVersionMedia_CapabilitiesExposeOwnDelete` | Unrelated pre-existing bugs | No | Pre-existing, matches `deferred-items.md` |
| `UserContributionsTab.test.tsx` (2 tests) | Phase-136 hex-only `color_key` normalization vs. stale fixture | No (verified via diff of commit `01c9afa3`: only touches release-version-label rendering, not role-icon logic) | Pre-existing, matches `deferred-items.md` |
| `FansubAppMembersSection.test.tsx` (8), `edit/page.test.tsx` (12) | `useRoleCatalog must be used within RoleCatalogProvider` — pre-existing call sites in `FansubAppMembersOverview.tsx`/`AnimeReleasesCockpit.tsx`, both introduced in Phase 136 (`fa98ce8d`) | No | Pre-existing, matches `deferred-items.md` |
| `useGroupMembersTab.test.ts` (2), `ReleaseGallery.test.tsx`, `MemberBadgeChain.test.tsx`, `PublicNoteCard.test.tsx`, `ResponsiveImage.config.test.ts`, `v12-projection-contract.test.ts`, `ContributionCard.test.tsx`, `ProjectMemberReleasesSection.test.tsx`, `MemberProfilePage`/`MyProjectDetailPage`/`ProjectMemberPage` page tests, `MemberCurrentProjectsSection.test.tsx`, `MembershipsSection.test.tsx` | Unrelated pre-existing issues (badge/member-profile domain, PublicMemberBadge OpenAPI schema drift, role-label i18n) | No — none of these source files appear anywhere in Phase 138's file diff | Pre-existing, unrelated to this phase |
| `api.no-token-boundary.test.ts` (1) | Hardcoded docs-allowlist references 3 files that don't exist on disk (`docs/frontend/streaming-auth-handoff.md` and 2 Phase-49 planning docs) | No | Pre-existing, unrelated |
| **`fansubEditAccess.test.ts` (1) — "keeps Basic first for general edit combined with another narrow right"** | **Plan 138-16 added a new `"changes"` case to `canUseMainTab` gated on `can_edit_group_general` (among others). This is now also true for the test's fixture, so `visibleMainTabs` now legitimately includes `"changes"`, but the pre-existing test still asserts the exact array `["basic", "notes"]` and was never updated.** | **Yes — `fansubEditAccess.ts` was modified by commit `a801730e` (Plan 138-16)** | **⚠️ Real regression: an existing, previously-passing test now fails and was not caught, fixed, or logged in `deferred-items.md`/`138-16-SUMMARY.md`, despite the plan's own diligence pattern of running `git stash` comparisons for other affected files.** |

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| CAP-08 | 138-08 | Guided revoke flow lists granting sources, recommends scoped deny before broader changes | ✓ SATISFIED | `GuidedRevokeFlow.tsx`, WR-01 fix, D-16/D-17 honored |
| CAP-09 | 138-04, 07, 09, 13 | Role→capability change impact preview: affected holders + actual gain/lose/retain | ✓ SATISFIED | `PreviewGroupRightsCapabilityChange`, `RoleCapabilityImpactPreviewModal.tsx`, direct-mutate handlers removed |
| CAP-10 | 138-02, 08, 13 | Honest activation-status vocabulary (persisted/cache-active/pending/failed) | ✓ SATISFIED | `cache_reload_succeeded`, `ActivationStatusIndicator` |
| UADM-01 | 138-06, 08, 15 | Existing group-rights tab is the canonical inspection/edit surface | ✓ SATISFIED | `UserGroupRightsTab.tsx` rewritten on real resolver, all mutation flows anchored there |

No orphaned requirements — `REQUIREMENTS.md` maps exactly CAP-08, CAP-09, CAP-10, UADM-01 to Phase 138, and all four appear in at least one plan's `requirements:` frontmatter.

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts` | 65 | Stale test assertion after Plan 138-16 added a new `"changes"` tab case | ⚠️ Warning | An existing, previously-green test now fails at HEAD; not caught by the executor, code reviewer, or `deferred-items.md`. Does not affect real user-facing behavior (the new tab visibility is the intended D-06 behavior) but leaves the test suite red for a file this phase touched, undermining confidence in the phase's own regression-safety claims. |
| `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` | — (716 lines) | Exceeds CLAUDE.md's "Production code files should stay at or below 450 lines" modularity constraint | ⚠️ Warning (info) | File grew from 186 to 716 lines across this phase's plans (138-06/08/09/13-adjacent wiring). Not flagged in `138-REVIEW.md`. Does not block functionality (all tests pass, well-organized), but is a real, measurable violation of the project's own stated modularity guideline and a candidate for a follow-up split. |
| No `TBD`/`FIXME`/`XXX` debt markers | — | — | — | None found in any of the 103 phase-touched production/test files. |
| No `TODO`/`HACK`/`PLACEHOLDER`/"not yet implemented" markers | — | — | — | None found (only benign SQL/UI "placeholder" attribute uses, unrelated to stubs). |

## Human Verification Required

### 1. GuidedRevokeFlow — removing a dormant deny-override on a non-deniable actor

**Test:** Find (or create) a user who is a platform admin (or otherwise `non_deniable`) for some group capability, and who also has a stale personal `user_deny` override on that same capability recorded against them. Open their `UserGroupRightsTab`, click "Abweichung entfernen" on that row, and confirm the flow lets you actually remove the override (rather than dead-ending on a "cannot be revoked" message).

**Expected:** The modal proceeds straight to the confirm step ("Die persönliche Abweichung … wird entfernt") and, after confirming, shows the honest override-path activation status. It must NOT show only "Dieses Recht kann für … nicht persönlich entzogen werden."

**Why human:** This is exactly the WR-01 code-review finding's scenario. The fix (checking `isRemoveMode` before `isNonDeniable`) is present in the code and was manually traced as correct in this verification, but no automated test exercises the exact `non_deniable=true && user_deny=true` combination — `138-REVIEW-FIX.md` itself explicitly flags this fix as "requires human verification" pending such a test or a live click-through.

## Gaps Summary

No blocking gaps. All four ROADMAP success criteria for Phase 138 are independently verified against real code (not SUMMARY.md claims): the canonical group-rights tab is resolver-backed and provenance-complete (UADM-01), the guided revoke flow lists sources and recommends scoped deny before broader changes (CAP-08), role→capability changes are always preceded by a real batch impact preview (CAP-09), and role-matrix/override mutations render an honest, non-fabricated activation-status vocabulary (CAP-10). All 5 code-review findings (1 critical, 4 warning) from `138-REVIEW.md` are confirmed fixed in real commits, re-verified independently in this session.

Two non-blocking items are flagged for follow-up: (1) a genuine, previously-uncaught test regression in `fansubEditAccess.test.ts` caused by Plan 138-16's new `"changes"` tab visibility rule (the underlying behavior is correct per D-06; only the stale assertion needs updating), and (2) `UserGroupRightsTab.tsx` has grown to 716 lines, exceeding the project's 450-line modularity guideline and worth a follow-up split. One item needs a human click-through: the WR-01 dormant-override-removal fix has no automated regression test for its exact target scenario.

All pre-existing, unrelated test failures documented in `deferred-items.md` were independently re-verified in this session (via git history tracing and diff inspection) and confirmed accurate — none are Phase 138 regressions.

---

_Verified: 2026-08-23T20:01:48Z_
_Verifier: Claude (gsd-verifier)_
