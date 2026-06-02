# Frontend Auth/API Client

Phase 49 makes `frontend/src/lib/api.ts` the central owner for normal browser API authentication. Pages, components, hooks, and feature helpers must consume token-free auth state and call central API helpers; they must not read, store, pass, or construct bearer tokens.

## Ownership

`frontend/src/lib/api.ts` owns:

- auth cookies and runtime auth metadata
- Keycloak refresh orchestration through `refreshKeycloakToken`
- proactive access-token freshness checks before protected requests
- shared refresh coordination through one in-flight refresh promise
- central bearer attachment for fetch requests
- exactly-one retry for auth-related `401` responses when retry is enabled
- upload preflight refresh and XHR bearer attachment
- auth-state broadcasts and local session cleanup

Normal UI code owns only:

- whether the client has initialized auth state
- whether an access or refresh session is present
- current-user and capability data returned by the backend
- local loading, error, and disabled states

## Token-Free UI Usage

Use `useAuthSession()` for UI gating:

```tsx
const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
const hasAuthSession = hasAccessToken || hasRefreshToken

if (!isClientInitialized) {
  return null
}

if (!hasAuthSession) {
  return <p>Anmeldung erforderlich.</p>
}

const response = await getMyFansubGroups()
```

Do not gate protected UI on `hasAccessToken` alone. Keycloak access tokens are intentionally short-lived; a valid refresh session must still be treated as an active app session so the central API client can refresh before the protected request is sent. Any phase that touches protected UI or upload flows must include a regression check for: access token expired or absent, refresh token valid, protected view/action still proceeds through the central refresh seam without showing logged-out UI.

Do not read `authToken`, do not add token props, and do not pass token-shaped values into helper calls. The central client resolves and refreshes the active runtime session when the request is sent.

## API Helper Pattern

Protected helper functions should call `apiClientFetch`:

```ts
const response = await apiClientFetch(`/api/v1/admin/anime/${animeId}`, {
  cache: 'no-store',
})

if (!response.ok) {
  const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
  throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
}
```

Helper functions should not accept `authToken?: string` for normal browser callers. Existing compatibility parameters may only remain inside the central client during staged cleanup and must not be consumed by pages or components.

## Upload/XHR Rules

Uploads that need progress events may use XHR only through the central upload wrapper in `api.ts`.

Required behavior:

- refresh before opening XHR when the access token is near expiry
- attach the bearer header inside the wrapper only
- preserve progress callbacks, including retry/reset semantics when applicable
- reject unsafe upload `401` cases with a re-auth error instead of blindly replaying FormData
- keep existing media ownership and endpoint payloads unchanged

Current unsafe upload endpoints use preflight refresh only and do not automatically replay after upload `401`:

- `uploadFansubMedia`
- `uploadAdminAnimeMedia`
- `uploadAdminReleaseThemeAsset`
- `uploadAdminReleaseThemeAssetForRelease`
- `uploadReleaseVersionMedia`
- FormData upload helpers such as `uploadSegmentAsset` and `uploadOwnProfileAvatar`

## Forbidden Patterns

Normal app/component code must not introduce:

- `getRuntimeAuthToken` or `getRuntimeRefreshToken`
- `AUTH_TOKEN_COOKIE_NAME`, `AUTH_REFRESH_COOKIE_NAME`, `document.cookie`, or direct auth cookie reads
- `localStorage` or `sessionStorage` auth-token reads
- `Authorization: Bearer` construction
- `authToken` props, parameters, locals, or `runtimeAuthToken`
- direct Keycloak refresh/logout helpers
- duplicate XHR `setRequestHeader('Authorization', ...)` blocks

`frontend/src/lib/api.no-token-boundary.test.ts` enforces these rules with separate allowlists for central client code, Keycloak PKCE/auth helpers, `/login`, SSR server pages, server streaming routes, tests/docs, and public no-auth fetches.

## Keycloak Boundary

Keycloak is identity and token lifecycle only. It owns login, OIDC tokens, session end, and local development realm/client setup.

Team4s owns domain authorization through backend app-user, global-role, fansub-membership, release/media, and capability decisions. Frontend code must not derive Team4s domain permissions from Keycloak roles or JWT claims.

## Backend Permission Ownership

The frontend can use backend capability booleans to show, hide, or disable UI actions. The backend Permission Engine remains authoritative for protected mutations and read scopes.

Do not add frontend-only role checks as a replacement for backend permission checks.

## Boundaries

Phase 49 separates these from normal browser API calls:

- `/login` may start login and call central auth lifecycle helpers.
- `/watchlist` and `/anime/[id]` are SSR server page boundaries for render-time cookie reads.
- Jellyfin/streaming routes are server-side stream relay boundaries and are documented separately in `docs/frontend/streaming-auth-handoff.md`.
- Public image and remote-source fetches that send no auth remain classified as public no-auth fetches.
