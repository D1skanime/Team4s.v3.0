# Profile Roadmap Reconciliation Audit

**Date:** 2026-05-27
**Scope:** Phase 47, 48, 51, 52, 53
**Mode:** Audit only. No roadmap/requirements status corrections in this artifact.

## Summary

The profile/contributor/auth line has enough runtime evidence to continue into Phase 53, but the planning truth is uneven:

- Phase 47 and Phase 48 have plans plus runtime evidence, but no `SUMMARY`, `UAT`, or `VERIFICATION` artifacts in their phase folders.
- Phase 51 is consistently complete in roadmap details and verification artifacts, but `REQUIREMENTS.md` still marks `AUTH-RESOURCE-SERVER-01` as `Pending`.
- Phase 52 has implementation summaries and UAT evidence, and `STATE.md` previously treated it as complete, but `ROADMAP.md` still says `0/3 plans executed` and `REQUIREMENTS.md` still marks `AUTH-PROFILE-ACCOUNT-RETURN-01` as `Pending`.
- Phase 53 is now formally planned with two plan artifacts and should not be executed until the Phase 47/48/52 truth gaps are accepted or corrected.

## Phase 47 - Member Profile & Historical Identity

| Field | Finding |
|---|---|
| Roadmap status | Top-level unchecked. Detail says `Plans: 0/4 plans executed`. |
| State status | Not current; no completion entry found in current state excerpt. |
| Plan artifacts | `47-01-PLAN.md` through `47-04-PLAN.md`, plus `47-CONTEXT.md` and `47-RESEARCH.md`. |
| Summary/UAT/Verification | None found in `.planning/phases/47-member-profile-und-historical-identity`. |
| Implementation evidence | `backend/internal/handlers/app_profile.go`, `backend/internal/repository/member_profile_repository.go`, `backend/internal/models/member_profile.go`, `frontend/src/app/admin/profile/page.tsx`, `frontend/src/types/profile.ts`, profile tests in `backend/internal/handlers/app_auth_test.go` and `frontend/src/app/admin/profile/page.test.tsx`. |
| Actual status | Implemented with documentation/closure drift. The own-profile foundation exists, but its primary UI route is still `/admin/profile`, and Phase 53 intentionally supersedes the UX/route target with `/me/profile`. |
| Drift | `MEMBER-PROFILE-01` is referenced in `ROADMAP.md` but is not present in `REQUIREMENTS.md`. Roadmap still says 0/4 plans executed despite runtime evidence. No UAT/verification closure artifact exists. |
| Recommended doc update | After review, classify Phase 47 as `implemented with follow-up drift` or `partially complete`; add requirement traceability or mark the requirement as historical. Note that route/UX completion is carried forward into Phase 53. |
| Decision needed | Whether Phase 47 should be marked complete based on runtime evidence despite missing GSD closure artifacts, or left partially complete until a retroactive verification note is added. |

## Phase 48 - Meine Gruppen & Contributor Dashboard

| Field | Finding |
|---|---|
| Roadmap status | Top-level unchecked. Detail says `Plans: 0/4 plans executed`. |
| State status | Not current; no completion entry found in current state excerpt. |
| Plan artifacts | `48-01-PLAN.md` through `48-04-PLAN.md`, plus `48-CONTEXT.md` and `48-RESEARCH.md`. |
| Summary/UAT/Verification | None found in `.planning/phases/48-meine-gruppen-und-contributor-dashboard`. |
| Implementation evidence | `backend/internal/handlers/app_auth.go` contains `ListMyFansubGroups` and `GetMyFansubGroupDetail`; `backend/internal/repository/contributor_dashboard_repository.go`; `frontend/src/app/admin/my-groups/page.tsx`; `frontend/src/app/manage/groups/page.tsx` re-exports the admin implementation; `frontend/src/types/contributor.ts`; handler tests around contributor groups in `backend/internal/handlers/app_auth_test.go`. |
| Actual status | Partially implemented with route/closure drift. Backend read models and a `Meine Gruppen` UI exist, but the surface still relies on `/admin/my-groups` with `/manage/groups` as a wrapper, and no UAT/verification artifact proves full contributor-scope closure. |
| Drift | `CONTRIBUTOR-DASHBOARD-01` is referenced in `ROADMAP.md` but is not present in `REQUIREMENTS.md`. Roadmap still says 0/4 plans executed despite runtime evidence. Planned navigation/user-menu and safe component reuse are not fully verified in available artifacts. |
| Recommended doc update | After review, classify Phase 48 as `partially implemented`; document `/manage/groups` as the non-admin transition route and carry remaining route/shell/user-menu cleanup forward to Phase 53 or a later contributor-shell phase. |
| Decision needed | Whether to retroactively verify and close Phase 48, or keep it open as a known precursor drift before Phase 53 execution. |

## Phase 51 - Keycloak Access-Token Resource-Server Boundary

| Field | Finding |
|---|---|
| Roadmap status | Top-level checked. Detail says `Plans: 4/4 plans complete`. |
| State status | Historical state entry says Phase 51 was added; current focus has moved to Phase 53. |
| Plan artifacts | `51-01-PLAN.md` through `51-04-PLAN.md`, with matching `SUMMARY` files. |
| Summary/UAT/Verification | `51-UAT.md`, `51-token-boundary-uat.md`, `51-SECURITY.md`, `51-VALIDATION.md`, `51-VERIFICATION.md`. Verification says status complete and open gaps none. |
| Implementation evidence | `frontend/src/lib/api.ts` stores/sends `access_token`; `frontend/src/lib/keycloakAuth.ts`; `backend/internal/auth/oidc.go`; auth/token tests; `docs/operations/keycloak-auth-foundation-phase43.md` updated for access-token expectations. |
| Actual status | Complete. |
| Drift | `REQUIREMENTS.md` traceability still marks `AUTH-RESOURCE-SERVER-01` as `Pending`. |
| Recommended doc update | Mark `AUTH-RESOURCE-SERVER-01` complete in `REQUIREMENTS.md` traceability. No roadmap status change needed. |
| Decision needed | None, unless a separate live environment retest is desired before updating traceability. |

## Phase 52 - Profile Account Return Refresh Flow

| Field | Finding |
|---|---|
| Roadmap status | Detail says `Plans: 0/3 plans executed` and all three plan checkboxes are unchecked. |
| State status | Before Phase 53 planning, `STATE.md` had `status: Phase 52 complete` and `stopped_at: Completed 52-03-PLAN.md`. Current focus is now Phase 53 planned. |
| Plan artifacts | `52-01-PLAN.md` through `52-03-PLAN.md`, with matching `SUMMARY` files. |
| Summary/UAT/Verification | `52-UAT.md` exists. It records automated evidence as PASS for focused profile tests, auth boundary tests, typecheck, focused lint, build, and diff check. Live Keycloak UAT remains pending. |
| Implementation evidence | `frontend/src/app/admin/profile/page.tsx` imports and calls `refreshActiveAuthSession`; `frontend/src/app/admin/profile/page.test.tsx` covers return refresh, changed/unchanged account data, dirty form preservation, and duplicate focus guard; `frontend/src/lib/api.no-token-boundary.test.ts` has a narrow allowlist for this central seam. |
| Actual status | Implemented and automated-verified; live UAT remains pending. Treat as complete only if automated closure was intentionally accepted in the previous session. |
| Drift | `ROADMAP.md` still says 0/3 plans executed. `REQUIREMENTS.md` traceability still marks `AUTH-PROFILE-ACCOUNT-RETURN-01` as `Pending`. Live UAT is pending in `52-UAT.md` despite state having treated Phase 52 as complete. |
| Recommended doc update | After review, either mark Phase 52 complete with a note `live Keycloak UAT pending`, or keep Roadmap partially open until live UAT is run. Align `AUTH-PROFILE-ACCOUNT-RETURN-01` accordingly. |
| Decision needed | Whether automated evidence is enough to mark Phase 52 complete in roadmap/requirements, or whether live Keycloak UAT should be required first. |

## Phase 53 - Rollenuebergreifendes Mein Profil als Member Identity Hub

| Field | Finding |
|---|---|
| Roadmap status | Top-level unchecked. Detail says `Plans: 0/2 plans executed`. |
| State status | Current focus: Phase 53 planned. |
| Plan artifacts | `53-01-PLAN.md` and `53-02-PLAN.md`. |
| Summary/UAT/Verification | None expected yet. |
| Implementation evidence | No Phase 53 implementation expected; existing evidence comes from Phase 47/48/52 runtime. |
| Actual status | Planned, not implemented. |
| Drift | None yet, but Phase 53 depends on unresolved truth decisions for Phase 47/48/52. |
| Recommended doc update | No status correction. Use this audit before executing 53A. |
| Decision needed | Whether to reconcile Phase 47/48/52 docs before 53A starts, or proceed with known drift documented here. |

## Recommended Next Step

Do not edit roadmap statuses blindly. First review these decisions:

1. Mark Phase 51 requirement traceability complete.
2. Decide if Phase 52 is complete-with-live-UAT-pending or still partially open.
3. Decide if Phase 47 and Phase 48 should receive retroactive verification artifacts before their roadmap status changes.
4. Then make one targeted docs patch for `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`.
