---
phase: 103
uat_test: 4
status: root_cause_found
investigated: 2026-07-16
scope: diagnosis_only
---

# Phase 103 UAT 4 — Karaoke disappears after login

## Symptom

The same public release shows its Karaoke section to a guest. After login as Sheppert, the entire section is absent, so no segment can be selected or played. The required behavior is that public segment information is session-independent; an active or refresh-only session may only add playback affordances.

## Root cause

The implementation combines a correct token-free playback gate with an incorrect **all-or-nothing visibility gate tied to a one-time server payload**:

- `ThemeTimeline.tsx:38` returns `null` whenever its `segments` prop is empty.
- Those segments are not loaded by the client component. They are supplied once by the server page at `page.tsx:111-115` from `detail.segments`.
- `ThemeTimeline` reacts to authentication only through `useAuthSession()` (`ThemeTimeline.tsx:27-28`). Session changes can enable controls at lines `63`, `71`, and `92`, but cannot reload or restore public segment data.

Therefore, any authenticated navigation/render that produces an empty `detail.segments` snapshot removes the **entire public section**, despite the public data having existed in the guest render. The component has no separation between “public section data unavailable/empty in this render” and “playback session unavailable.”

The upstream request path makes this failure auth-coupled unnecessarily:

- The public release page calls `getGroupReleaseDetail` in a server component (`page.tsx:58-60`).
- That public helper uses `authorizedFetch` (`frontend/src/lib/api.ts:6235-6245`) rather than a session-neutral public fetch.
- `authorizedFetch` performs auth preflight and retry/refresh behavior (`api.ts:1272-1338`) even though the backend release-detail handler is fully public and never evaluates an actor (`backend/internal/handlers/group_contributors_handler.go:166-202`).
- On the server, `getApiBaseUrl` chooses the internal API (`api.ts:290-294`) while `resolveAuthToken` only reads browser cookies when `window` exists (`api.ts:822-843`). Browser access/refresh cookies are not explicitly forwarded by the release page. Thus the RSC public aggregate and the client session state are two disconnected auth contexts.

This split explains the observed class of failure: after an auth-state transition/navigation, the public aggregate is recomputed through an auth-aware helper that does not actually share the browser session, while the client component receives only the resulting segment array. If that render yields an empty segment projection, line 38 hides everything; successful client session initialization cannot correct it.

## What is not the cause

- `ThemeTimeline` does **not** intentionally hide the section for authenticated users. `hasSession` is used only to enable selection/buttons (`ThemeTimeline.tsx:43-52`, `63-72`, `92`).
- Refresh-only gating itself is correctly expressed as `hasAccessToken || hasRefreshToken` at lines `27-28`, matching `AGENTS.md:83-90` and `docs/frontend/auth-api-client.md:25-46`.
- The public repository query is not actor-dependent. `loadReleaseSegments` queries by the concrete `release_version_id` only (`backend/internal/repository/release_detail_public_repository_helpers.go:82-104`).
- A grant/stream authorization failure cannot explain disappearance before clicking: the player URL is only mounted after selection (`ThemeTimeline.tsx:97-109`).

## Evidence chain

1. Public backend handler: no actor or permission condition — `group_contributors_handler.go:166-202`.
2. Public segment SQL: release-version-owned and auth-independent — `release_detail_public_repository_helpers.go:82-104`.
3. Server-only aggregate ownership: `page.tsx:58-60`, passed at `111-115`.
4. Public endpoint nevertheless uses auth-aware client helper: `api.ts:6235-6245`.
5. Server/browser auth contexts are not bridged in this call: `api.ts:290-294`, `822-843`.
6. Empty snapshot removes the whole section: `ThemeTimeline.tsx:38`.
7. Client auth changes only control affordances and never reload public data: `ThemeTimeline.tsx:27-29`, `43-52`, `63-72`, `92`.

## Test coverage gap

`ThemeTimeline.test.tsx` mocks `useAuthSession` directly. It verifies guest and authenticated rendering against a pre-supplied, non-empty segment array, but does not cover:

- an actual login/refresh-only transition through the central auth client;
- RSC navigation/re-render of the public aggregate after authentication;
- preservation of the public section when playback/session capability resolution fails;
- the integrated public-detail request path and its server/browser cookie boundary.

The unit tests could pass while the live navigation path remained broken.

## Suggested fix direction

- Make public release-detail/segment projection explicitly session-neutral. Do not route its availability through auth refresh/preflight behavior; use the established public-fetch seam or a dedicated server helper.
- Keep public segment data and playback capability as separate states/contracts. The public section must be derived only from public release data; auth/session state may add `Abspielen` but must never remove the section.
- If personalization is required, fetch a small authenticated playback capability/grant separately through the central client after `isClientInitialized` and `hasAccessToken || hasRefreshToken` resolve.
- Add an integrated regression test covering guest → refresh-only/authenticated transition on the same release, asserting that the same segment titles remain visible and only play affordances change.
- Instrument/verify the authenticated RSC aggregate response for the UAT release before implementation; if `detail.segments` is empty only in the authenticated navigation, capture that response and backend request identity to confirm the exact boundary failure rather than changing the public SQL.

## Files implicated

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx`
- `frontend/src/lib/api.ts`
- `frontend/src/lib/useAuthSession.ts`
- `backend/internal/handlers/group_contributors_handler.go`
- `backend/internal/repository/release_detail_public_repository_helpers.go`

No product implementation was changed during this diagnosis.
