---
status: diagnosed
trigger: "Phase 103 HUMAN-UAT test 5: Platform Admin sees no full-episode action"
created: 2026-07-16
updated: 2026-07-16
scope: root-cause-only
---

# Phase 103 — missing full-episode Admin action

## Symptom

On release version 1 the logged-in Platform Admin sees no secondary `Episode abspielen` action although a Jellyfin release stream exists and is ready.

## Root cause

The failing boundary is the frontend playback-access auth handoff, before the entitlement resolver or readiness query is reached.

The client component recognizes an active browser session and issues `GET /api/releases/1/playback-access`, but the Next server relay sees neither an access-token cookie nor a refresh-token cookie. `resolveAuthenticatedRelaySession()` therefore returns an empty token, and the relay returns its own 401 at `route.ts:22` without calling the backend. `ReleaseEpisodePlayer` deliberately converts every non-2xx response to `null` (`ReleaseEpisodePlayer.tsx:19-22`) and renders nothing unless both `can_play` and `stream_ready` are true (`ReleaseEpisodePlayer.tsx:32-34`). The authentication failure is therefore indistinguishable in the UI from a legitimate unavailable/unauthorized release.

This is not an entitlement, Platform-Admin assignment, or Jellyfin-source defect:

- Runtime frontend log: `GET /api/releases/1/playback-access 401`.
- The corresponding backend log contains no request to `/api/v1/release-versions/1/playback-access`; only the route-registration line exists. This proves the relay stopped before its upstream fetch at `route.ts:25`.
- Database read confirms release version/variant 1 has a `jellyfin` stream source with external item id `5bb651fbab4c502a5c52a9827c9fc68d` and a concrete stream URL.
- Database read confirms `app_users.id=1` is active and has `app_user_global_roles.role='platform_admin'`.
- The resolver explicitly returns an allow for `actor.IsPlatformAdmin` after resolving a valid release context (`release_playback_entitlement_repository.go:40-55`), without requiring a seeded entitlement row.
- The handler computes readiness from `GetReleaseStreamSource` only after the allow decision (`release_playback_access.go`); neither branch ran for the observed request because auth middleware was never reached.

## Why automated tests missed it

`playback-access/route.test.ts` is a source-text test. It only asserts that the file mentions the refresh helper, cookie name, no-store, `Vary`, and cookie application. It does not execute the route with real Next request cookies, an expired/missing access cookie, and a valid refresh cookie.

`ReleaseEpisodePlayer.test.tsx` mocks `useAuthSession` and `fetch`. Its refresh-only case returns a fabricated `{can_play:true, stream_ready:true}` response, so it proves rendering/cleanup but not the actual browser → Next cookie → refresh → backend identity chain.

The component also suppresses the 401 by design, so UAT presents only “button missing,” with no local evidence that the protected availability read failed.

## Exact boundary mismatch

- Browser-side session gating is owned by `useAuthSession()` and `getAuthSessionSnapshot()`.
- Playback access is not sent through the normal central browser `apiClientFetch` seam. It calls a same-origin Next route with plain `fetch` (`ReleaseEpisodePlayer.tsx:19`).
- That Next route has a separate server-cookie-only view of authentication (`route.ts:16-21`). When the browser session snapshot and request cookies diverge, the UI starts the availability request but the relay cannot restore identity.
- The relay has no authenticated fallback and returns 401 locally. This violates the expected refreshable-session behavior even though the backend resolver and source are correct.

The runtime evidence establishes the divergence (client request occurred; relay had no usable cookie; backend was never contacted). Determining why this particular browser session lacked request cookies—expired cookie lifetime, host/session transition, or session persistence state—requires request-cookie instrumentation or inspecting the live browser storage. It does not change the code root cause: this protected action relies on a second auth view that can silently diverge from the central browser session state.

## Suggested fix direction (do not implement in this debug session)

1. Keep the backend endpoint private/no-store and keep the centralized entitlement/readiness resolver unchanged.
2. Make playback-access use one authoritative refresh seam end to end. Either:
   - add a normal protected API helper using `apiClientFetch` for the JSON availability check, or
   - harden the Next relay so its cookie/session handoff is the authoritative session boundary and ensure the browser session snapshot derives from the same cookie state.
   Do not add role checks or bearer construction in the component.
3. Preserve `hasAccessToken || hasRefreshToken`, but do not silently collapse an auth-handoff failure into ordinary `available=false`; keep errors local and non-disclosing while making the session regression diagnosable.
4. Add an executed relay integration test with real request cookies covering:
   - access cookie present;
   - access absent/expired + valid refresh cookie;
   - rotated cookies returned;
   - Platform Admin backend response `{can_play:true,stream_ready:true}`;
   - no shared caching between two users.
5. Add a browser-level regression from the real public release route that observes the actual `/api/releases/1/playback-access` status and verifies a backend access request occurs.
6. After restoring availability, retain the existing grant and final-stream entitlement recheck; do not bypass the protected relay merely to expose the button.

## Files implicated

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.tsx`
- `frontend/src/app/api/releases/[id]/playback-access/route.ts`
- `frontend/src/lib/server/streamRelayAuth.ts`
- `frontend/src/lib/useAuthSession.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/app/api/releases/[id]/playback-access/route.test.ts`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.test.tsx`
- `backend/internal/handlers/release_playback_access.go`
- `backend/internal/repository/release_playback_entitlement_repository.go`
- `backend/internal/repository/episode_version_repository.go`

## Current focus

- hypothesis: confirmed — Next playback-access relay returns local 401 before backend entitlement/readiness
- next_action: gap-closure plan for a single authoritative protected JSON auth seam plus real refresh-cookie integration coverage
