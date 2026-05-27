# Phase 49/50 Reconcile

**Date:** 2026-05-27  
**Mode:** `$gsd-quick retro-verify phases 49-50 auth api client and contributor governance roadmap registration`  
**Scope:** Planning and documentation reconciliation only. No product implementation.

## Why This Reconcile Exists

After the historical 1-46 reconcile, `gsd health` still reported Phase 49 and Phase 50 directories on disk but not in the active `.planning/ROADMAP.md`. This made Phase 49's `AUTH-API-CLIENT-01` look Pending even though Phase 49 has execution summaries and verification artifacts.

## Phase 49 Result

**Classification:** Complete-current  
**Requirement:** `AUTH-API-CLIENT-01`

Evidence:

- 14 plan/summary pairs exist under `.planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/`.
- `49-VERIFICATION.md` reports `PASS_WITH_NOTES`, 12/12 must-haves verified.
- `docs/frontend/auth-api-client.md` defines the central browser API/auth ownership boundary.
- `docs/frontend/streaming-auth-handoff.md` documents streaming routes as a separate server-side boundary.
- `frontend/src/lib/api.ts` owns runtime token resolution, refresh coordination, protected fetches, and XHR upload auth.
- `frontend/src/lib/useAuthSession.ts` exposes token-free session state.
- `frontend/src/lib/api.no-token-boundary.test.ts` statically gates token ownership.

Carry-forward notes:

- Phase 51 supersedes part of the auth-token semantics by moving API bearer behavior to real Keycloak access tokens with a Team4s API audience.
- Central compatibility `authToken` parameters remain inside `frontend/src/lib/api.ts`, but normal pages/components are statically gated from using token values.

## Phase 50 Result

**Classification:** Complete-carry-forward  
**Requirement:** `PLATFORM-ADMIN-BOUNDARY-01`

Evidence:

- `.planning/phases/50-platform-admin-boundaries-und-contributor-scope-governance/50-SUMMARY.md` says implemented with residual follow-up.
- `50-VERIFICATION.md` reports technical verification PASS, human UAT pending.
- `50-SECURITY.md` reports PASS after final security review.
- `50-VALIDATION.md` documents Nyquist checks around platform-admin gating, contributor scoping, backend boundaries, and disabled anime reads.
- Runtime evidence exists for `PlatformAdminGate`, contributor capabilities, sanitized release-version contributor context, permission-checked notes/media/member stories, and contributor dashboard scoping.

Carry-forward notes:

- Human UAT remains pending for a real Keycloak fansub lead/member account.
- `/admin/my-groups` still serves the contributor workspace directly while `/manage/groups` re-exports it; follow-up should turn `/admin/my-groups` into a redirect once the route move is split into a narrow cleanup.
- The broader route/shell polish is already compatible with Phase 53's `/me/*` direction.

## Roadmap/Requirements Actions

- Register Phase 49 and Phase 50 in the active roadmap between Phases 48 and 51.
- Mark `AUTH-API-CLIENT-01` complete.
- Add explicit `PLATFORM-ADMIN-BOUNDARY-01` requirement and mark it complete with live UAT pending.
- Update `.planning/STATE.md` to reflect the new planning truth and quick task.

## Remaining Contract Gaps

- OpenAPI still does not fully describe the central auth client behavior because Phase 49 is mostly frontend/client-ownership architecture.
- Contributor-management/member/invitation OpenAPI gaps remain from the historical reconcile and are not solved here.
- Route naming remains transitional: `/admin/my-groups` exists but should eventually redirect or yield to `/manage/groups` and later `/me/groups`.
