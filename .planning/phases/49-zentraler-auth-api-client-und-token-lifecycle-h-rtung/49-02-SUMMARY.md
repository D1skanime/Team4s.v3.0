---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
plan: "02"
subsystem: frontend-auth-api-client
tags:
  - auth
  - api-client
  - token-lifecycle
  - upload-auth
dependency_graph:
  requires:
    - 49-01
    - AUTH-API-CLIENT-01
  provides:
    - proactive protected-request refresh
    - shared runtime refresh coordination for fetch and upload preflight
    - central upload XHR auth wrapper
  affects:
    - frontend/src/lib/api.ts
    - frontend/src/lib/useAuthSession.ts
    - frontend/src/components/auth/AuthSessionSwitchGuard.tsx
tech_stack:
  added: []
  patterns:
    - central authorizedFetch gatekeeper
    - private runtime session expiry metadata
    - central authorizedUploadXhr wrapper
key_files:
  created:
    - frontend/src/lib/useAuthSession.ts
    - frontend/src/components/auth/AuthSessionSwitchGuard.tsx
    - frontend/src/lib/api.auth-refresh.test.ts
    - frontend/src/lib/api.session-switch.test.ts
    - frontend/src/components/auth/AuthSessionSwitchGuard.test.tsx
    - frontend/src/app/auth/page.test.tsx
  modified:
    - frontend/src/lib/api.ts
key_decisions:
  - Expiry metadata is stored privately in api.ts-managed runtime metadata and is not exposed through AuthSessionSnapshot.
  - Upload/XHR endpoints use central preflight refresh but current unsafe upload POSTs do not automatically replay after upload 401.
  - useAuthSession keeps an empty compatibility-only authToken field until 49-03 removes existing broad caller threading; it never carries a token value.
requirements-completed:
  - AUTH-API-CLIENT-01
metrics:
  duration: 35 min
  completed: 2026-05-20
---

# Phase 49 Plan 02: Central Auth/API Client Hardening Summary

Central request lifecycle hardening with proactive refresh, shared refresh coordination, and upload preflight auth.

## Outcome

Status: COMPLETE

`frontend/src/lib/api.ts` now keeps private access/refresh expiry metadata, checks protected requests before sending, and reuses the existing `runtimeSessionRefreshPromise` for proactive refresh and auth-related 401 recovery. Normal fetch retry behavior remains exactly one auth-related retry.

Upload XHR auth is centralized through `authorizedUploadXhr`: it refreshes before opening XHR, attaches `Authorization` inside the wrapper, preserves progress callbacks, and does not automatically replay the current unsafe upload endpoints after an upload 401.

## Tasks Completed

| Task | Result | Commit | Files |
|---|---|---|---|
| Task 1: Capture lifecycle characterization and upload-retry eligibility evidence | PASS | `c6ed81d9` | `api.auth-refresh.test.ts`, backend handler inspection |
| Task 2: Implement private expiry metadata and central request gating | PASS | `c6ed81d9` | `frontend/src/lib/api.ts` |
| Task 3: Make UI session snapshots token-free and add central upload wrapper | PASS | `c6ed81d9` | `api.ts`, `useAuthSession.ts`, focused tests |

## Upload Retry Evidence

| Helper | Backend evidence | Retry decision |
|---|---|---|
| `uploadFansubMedia` | Route uses auth middleware before `UploadFansubMedia`, then reads multipart data, writes file, creates `media_assets`, and assigns `fansub_group_media`. | No automatic replay after upload 401. Preflight refresh only. |
| `uploadAdminAnimeMedia` | `/admin/upload` authenticates first, then provisions folders, writes files, and creates media DB rows in image/video processing. | No automatic replay after upload 401. Preflight refresh only. |
| `uploadAdminReleaseThemeAsset` | Auth/admin check runs first, then release/theme checks, file save, `media_assets`, `media_files`, and release-theme link creation. | No automatic replay after upload 401. Preflight refresh only. |
| `uploadAdminReleaseThemeAssetForRelease` | Auth/admin check runs first, then file save, `media_assets`, `media_files`, and release-theme link creation. | No automatic replay after upload 401. Preflight refresh only. |
| `uploadReleaseVersionMedia` | Auth and permission checks run before multipart processing; each file then writes file and DB rows transactionally. | No automatic replay after upload 401. Preflight refresh only. |
| `uploadSegmentAsset` | Auth/admin check runs before handler persistence, but the handler writes a segment asset and binds it to the segment. | Fetch uses preflight refresh with auth retry disabled for the FormData upload. |
| `uploadOwnProfileAvatar` | Auth middleware runs before handler persistence, but the handler writes avatar files and attaches media to the profile. | Fetch uses preflight refresh with auth retry disabled for the FormData upload. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kept a temporary empty compatibility field in `useAuthSession`**
- **Found during:** Task 3
- **Issue:** Removing `authToken` from the hook immediately would force the broad page/component migration assigned to 49-03 and break typecheck in this slice.
- **Fix:** `useAuthSession` now returns `authToken: ''` as an empty compatibility field only. It never carries the runtime token; `hasAccessToken`, `hasRefreshToken`, `displayName`, and `isClientInitialized` are the real UI session state.
- **Files modified:** `frontend/src/lib/useAuthSession.ts`
- **Commit:** `c6ed81d9`

**Total deviations:** 1 auto-fixed. **Impact:** 49-03 still must remove the empty compatibility field and migrate existing callers away from token-shaped props.

## Known Stubs

None found in files created or modified for this plan. The empty `authToken` compatibility field is tracked above as a temporary migration bridge, not a data stub.

## Threat Flags

None. This plan changed frontend auth/request lifecycle code only; it introduced no new backend endpoint, schema, domain ownership path, or streaming/Jellyfin behavior.

## Verification

Automated checks run:

- `npm run test -- api.auth-refresh.test.ts api.session-switch.test.ts components/auth/AuthSessionSwitchGuard.test.tsx app/auth/page.test.tsx` - PASS
- `npm run typecheck` - PASS
- `npx eslint src/lib/api.ts src/lib/useAuthSession.ts src/lib/api.auth-refresh.test.ts src/lib/api.session-switch.test.ts src/components/auth/AuthSessionSwitchGuard.tsx src/components/auth/AuthSessionSwitchGuard.test.tsx src/app/auth/page.tsx src/app/auth/page.test.tsx` - PASS
- `npm run lint` - FAIL due unrelated existing lint errors in `ReleaseVersionMediaSection.test.tsx`, `app/dev/ui-system/page.tsx`, and `tmp-live-full-flow*.js`
- `git diff --check HEAD~1 HEAD -- frontend/src/lib/api.ts frontend/src/lib/useAuthSession.ts frontend/src/components/auth/AuthSessionSwitchGuard.tsx frontend/src/lib/api.auth-refresh.test.ts frontend/src/lib/api.session-switch.test.ts frontend/src/components/auth/AuthSessionSwitchGuard.test.tsx frontend/src/app/auth/page.test.tsx` - PASS

## Residual Risks

- The committed `api.ts` file already contained substantial uncommitted auth cleanup from earlier work; the implementation commit necessarily includes that baseline plus this plan's changes.
- `frontend/src/app/auth/page.tsx` remains modified in the working tree but was not touched or committed for this plan.
- Full lint remains blocked by unrelated existing lint errors outside the 49-02 touched files.
- 49-03 must remove broad `authToken` caller threading and the empty compatibility field from `useAuthSession`.

## Commits

- `c6ed81d9` - `feat(49-02): harden central auth api client`

## Self-Check: PASSED

- Found `frontend/src/lib/api.ts`.
- Found `frontend/src/lib/useAuthSession.ts`.
- Found `frontend/src/lib/api.auth-refresh.test.ts`.
- Found `49-02-SUMMARY.md`.
- Found implementation commit `c6ed81d9`.
- Scoped tests, typecheck, targeted lint, and commit diff-check passed.
