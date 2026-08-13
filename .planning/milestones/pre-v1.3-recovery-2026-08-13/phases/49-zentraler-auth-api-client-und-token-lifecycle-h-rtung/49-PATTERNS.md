# Phase 49: Zentraler Auth-/API-Client und Token-Lifecycle-Haertung - Pattern Map

**Mapped:** 2026-05-20
**Files analyzed:** 18 primary files plus auth-token search surfaces
**Analogs found:** 16 / 18
**Scope:** Read-only source inspection. No application code edits.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/lib/api.ts` | service/utility | request-response, event-driven, file-I/O | same file, central auth/client seam | exact |
| `frontend/src/lib/keycloakAuth.ts` | service | request-response | same file, Keycloak lifecycle helper | exact |
| `frontend/src/lib/useAuthSession.ts` | hook | event-driven | same file plus `admin/profile/page.tsx` usage | exact |
| `frontend/src/app/auth/page.tsx` | component/page | request-response, event-driven | same file, auth entrypoint | exact |
| `frontend/src/components/auth/AuthSessionSwitchGuard.tsx` | component/guard | event-driven | same file | exact |
| `frontend/src/lib/api.auth-refresh.test.ts` | test | request-response | same file | exact |
| `frontend/src/lib/api.session-switch.test.ts` | test | event-driven | same file | exact |
| `frontend/src/components/auth/AuthSessionSwitchGuard.test.tsx` | test | event-driven | same file | exact |
| `frontend/src/lib/api/admin-anime-intake.ts` | API helper module | request-response | same file, `apiClientFetch` helper style | role-match |
| `frontend/src/components/admin/MediaUpload.tsx` | component | file-I/O, request-response | `frontend/src/app/admin/profile/page.tsx` token-free upload usage | partial |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` | hook | CRUD, file-I/O | same file, token-free release media hook | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` | page/component | CRUD, file-I/O, event-driven | `admin/profile/page.tsx`, `admin/my-groups/page.tsx` | role-match |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` | component | CRUD, request-response | `admin/my-groups/page.tsx` token-free capability usage | role-match |
| `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx` | component | CRUD, request-response | `admin/profile/page.tsx` token-free mutation usage | role-match |
| `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` | hook/controller | CRUD, file-I/O | `admin/profile/page.tsx`, `useReleaseVersionMedia.ts` | role-match |
| `frontend/src/app/admin/anime/create/createAssetUploadPlan.ts` | utility | file-I/O transform | `useReleaseVersionMedia.ts` upload wrapper usage | partial |
| `frontend/src/app/api/episodes/[id]/play/route.ts` | route | streaming, request-response | `frontend/src/lib/server/streamRelayAuth.ts` | exact boundary |
| `frontend/src/app/api/releases/[id]/stream/route.ts` | route | streaming, request-response | `frontend/src/lib/server/streamRelayAuth.ts` | exact boundary |

## Subplan Ownership

| Subplan | Likely Owned Files/Surfaces | Notes |
|---|---|---|
| `49-01` inventory | no app edits expected; inspect `frontend/src/lib/api.ts`, `frontend/src/lib/keycloakAuth.ts`, all `authToken` props/calls, upload helpers, Next API stream routes | Produce exact inventory and verification gates before changing runtime behavior. |
| `49-02` central client hardening | `frontend/src/lib/api.ts`, `frontend/src/lib/useAuthSession.ts`, `frontend/src/lib/keycloakAuth.ts`, `frontend/src/lib/api.auth-refresh.test.ts`, `frontend/src/lib/api.session-switch.test.ts`, `frontend/src/components/auth/AuthSessionSwitchGuard.tsx`, guard tests | Add proactive expiry checks, keep one refresh promise, preserve 401 retry once, expand auth events/resync. |
| `49-03` caller migration | API helpers under `frontend/src/lib/api*.ts`, `frontend/src/lib/api/*.ts`, admin pages/components/hooks, upload components | Remove token props/arguments from normal API callers; preserve `hasAccessToken` gating only. |
| `49-04` verification/docs | auth tests, upload tests, static source-inspection tests, streaming handoff docs | Do not silently migrate Jellyfin/stream relay. Add anti-pattern gates below. |

## Pattern Assignments

### `frontend/src/lib/api.ts` (central service, request-response/event-driven/file-I/O)

**Preserve imports and central ownership** (lines 158, 230-240):
```typescript
import { exchangeKeycloakCode, isKeycloakEnabled, logoutFromKeycloak, refreshKeycloakToken, type KeycloakTokenBundle } from '@/lib/keycloakAuth'

export const AUTH_TOKEN_COOKIE_NAME = 'team4s_access_token'
export const AUTH_REFRESH_COOKIE_NAME = 'team4s_refresh_token'
const AUTH_TOKEN_STORAGE_KEY = 'team4s.auth.access_token'
const AUTH_REFRESH_STORAGE_KEY = 'team4s.auth.refresh_token'
const AUTH_SESSION_META_STORAGE_KEY = 'team4s.auth.session_meta'
export const AUTH_SESSION_EVENT_STORAGE_KEY = 'team4s.auth.session_event'
export const AUTH_SESSION_CHANGED_EVENT = 'team4s:auth-session-changed'
export const AUTH_SESSION_SWITCH_EVENT = 'team4s:auth-session-switch'
export const AUTH_SESSION_SWITCH_CHANNEL_NAME = 'team4s.auth.session_switch'
```

**Storage/cookie reads stay private to central client** (lines 375-445):
```typescript
function readBrowserCookie(name: string): string {
  if (typeof document === 'undefined') {
    return ''
  }
  const prefix = `${name}=`
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
  // ...
}

function readBrowserStorage(name: string): string {
  if (typeof window === 'undefined') {
    return ''
  }
  try {
    return (window.localStorage.getItem(name) || '').trim()
  } catch {
    return ''
  }
}
```

**Current token resolution exists but is incomplete for Phase 49** (lines 575-608):
```typescript
function resolveAuthToken(authToken?: string): string {
  if (typeof window !== 'undefined') {
    const runtimeToken = readBrowserCookie(AUTH_TOKEN_COOKIE_NAME).trim()
    if (runtimeToken) {
      return runtimeToken
    }

    clearLegacyTokenStorage()
  }

  const explicitToken = (authToken || '').trim()
  if (explicitToken) {
    return explicitToken === API_AUTH_SESSION_TOKEN ? '' : explicitToken
  }
  // ...
}

function withAuthHeader(headers: Record<string, string>, authToken?: string): Record<string, string> {
  const token = resolveAuthToken(authToken)
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
```

Planner note: this is the compatibility shim to preserve while migrating callers. Phase 49 should make normal callers stop passing `authToken`; only central code should resolve and attach the actual token.

**Refresh coordination and 401 retry** (lines 871-975):
```typescript
let runtimeSessionRefreshPromise: Promise<string> | null = null

async function refreshRuntimeSession(): Promise<string> {
  if (runtimeSessionRefreshPromise) {
    return runtimeSessionRefreshPromise
  }

  runtimeSessionRefreshPromise = (async () => {
    const refreshToken = getRuntimeRefreshToken()
    if (!refreshToken.trim()) {
      throw new ApiError(401, 'Anmeldung erforderlich. Bitte erneut einloggen.')
    }
    // refresh Keycloak or legacy session, then persistAuthSession(...)
  })()

  return runtimeSessionRefreshPromise
}

async function authorizedFetch(input: string, options: AuthorizedRequestOptions = {}): Promise<Response> {
  const send = (token?: string) =>
    fetch(input, {
      ...init,
      headers: withAuthHeader({ ...headers }, token),
    })

  const initialToken = resolveAuthToken(authToken)
  let response = await send(initialToken)
  if (response.status !== 401) {
    return response
  }

  const parsed = await parseApiErrorPayload(response.clone(), `API request failed: ${response.status}`)
  if (!isAuthRelatedError(parsed) || !getRuntimeRefreshToken().trim()) {
    return response
  }

  const refreshedToken = await refreshRuntimeSession()
  response = await send(refreshedToken)
  return response
}
```

Gap: there is no proactive expiry buffer before the first request. Add it here, using the existing shared refresh promise instead of new per-caller refresh logic.

**Central `apiClientFetch` path** (lines 969-974):
```typescript
export async function apiClientFetch(pathOrUrl: string, options: AuthorizedRequestOptions = {}): Promise<Response> {
  const input = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
    ? pathOrUrl
    : `${getApiBaseUrl()}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`

  return authorizedFetch(input, options)
}
```

Pattern to copy: new helper modules should call `apiClientFetch('/api/v1/...')`, parse errors via `parseApiErrorPayload`, and should not accept or forward page-owned token strings after Phase 49 migration.

**Current XHR anti-pattern to centralize** (lines 1522-1571, 2382-2430, 2560-2668, 3838-3887):
```typescript
const token = resolveAuthToken(options.authToken)
const endpoint = `${API_BASE_URL}/api/v1/admin/upload`

return new Promise<AdminMediaUploadResponse>((resolve, reject) => {
  const xhr = new XMLHttpRequest()
  xhr.open('POST', endpoint, true)
  if (token) {
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
  }
  xhr.upload.onprogress = (event) => {
    if (!options.onProgress || !event.lengthComputable) return
    const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)))
    options.onProgress(percent)
  }
  // parse response/errors, send FormData
})
```

Planner note: preserve progress behavior and FormData payload shapes, but extract a single authorized XHR/upload gate that does preflight refresh and exactly-once auth retry semantics. Do not duplicate this block per upload function.

### `frontend/src/lib/keycloakAuth.ts` (Keycloak lifecycle service)

**Boundary helper only; not for pages/components** (lines 65-75, 111-186, 189-205):
```typescript
function saveTransientAuthState(verifier: string, state: string): void {
  sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier)
  sessionStorage.setItem(PKCE_STATE_STORAGE_KEY, state)
}

export async function exchangeKeycloakCode(code: string, returnedState: string): Promise<KeycloakTokenBundle> {
  const { verifier, state } = consumeTransientAuthState()
  // POST /api/auth/keycloak/token, buildTokenBundle(...)
}

export async function refreshKeycloakToken(refreshToken: string): Promise<KeycloakTokenBundle> {
  const response = await fetch(`${currentRealmBase()}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildBrowserRefreshBody(refreshToken).toString(),
  })
  // ...
}

export async function logoutFromKeycloak(refreshToken?: string): Promise<void> {
  // POST logout endpoint when refresh token exists
}
```

Allowed storage exception: PKCE verifier/state in `sessionStorage` belongs to auth entrypoint flow only. Do not copy `sessionStorage` use into normal pages.

### `frontend/src/lib/useAuthSession.ts` (token-free session hook)

**Existing sentinel pattern** (lines 5-18, 22-40):
```typescript
import { API_AUTH_SESSION_TOKEN, AUTH_SESSION_CHANGED_EVENT, getAuthSessionSnapshot } from '@/lib/api'

export interface AuthSessionState {
  authToken: string
  hasAccessToken: boolean
  isClientInitialized: boolean
}

function readAuthSessionState(isClientInitialized: boolean): AuthSessionState {
  const hasAccessToken = isClientInitialized && getAuthSessionSnapshot().hasAccessToken
  return {
    authToken: hasAccessToken ? API_AUTH_SESSION_TOKEN : '',
    hasAccessToken,
    isClientInitialized,
  }
}

export function useAuthSession(): AuthSessionState {
  // focus, storage, AUTH_SESSION_CHANGED_EVENT, visibilitychange resync
}
```

Planner note: this is halfway to the desired pattern. Keep `hasAccessToken` and `isClientInitialized`. Treat `authToken` as deprecated compatibility sentinel and remove page/component reliance on it where possible.

### `frontend/src/app/auth/page.tsx` (auth entrypoint component)

**Allowed direct auth helper usage** (lines 7-22, 96-142, 167-181, 235-274):
```typescript
import {
  clearAuthSession,
  completeKeycloakAuthCallback,
  getAuthSessionSnapshot,
  logoutActiveAuthSession,
  persistResolvedAuthSession,
  refreshActiveAuthSession,
  resolveCurrentUserFromAuthSession,
} from '@/lib/api'
import { beginKeycloakLogin, isKeycloakEnabled } from '@/lib/keycloakAuth'

const updateRuntimeState = useCallback((nextCurrentUser?: CurrentUserData | null) => {
  const snapshot = getAuthSessionSnapshot()
  setHasAccessToken(snapshot.hasAccessToken)
  setHasRefreshToken(snapshot.hasRefreshToken)
  setActiveDisplayName(nextCurrentUser?.display_name || runtimeDisplayName)
}, [])

const me = await completeKeycloakAuthCallback(code, state)
const me = await refreshActiveAuthSession()
await logoutActiveAuthSession()
```

Planner note: `/auth` is an auth entrypoint and may call central auth lifecycle functions. Normal admin pages should not copy this direct snapshot/refresh/logout behavior except for token-free booleans from `useAuthSession`.

### `frontend/src/components/auth/AuthSessionSwitchGuard.tsx` (cross-tab guard)

**Cross-tab/session switch behavior** (lines 14-64):
```typescript
export function AuthSessionSwitchGuard() {
  useEffect(() => {
    const forceLogout = () => {
      clearAuthSession({ broadcast: false })
      if (window.location.pathname !== '/auth') {
        window.location.replace('/auth')
        return
      }

      window.location.reload()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== AUTH_SESSION_EVENT_STORAGE_KEY || typeof event.newValue !== 'string') {
        return
      }
      handleSwitch(parseRuntimeSessionSwitchEvent(event.newValue))
    }

    window.addEventListener('storage', handleStorage)
    channel = new BroadcastChannel(AUTH_SESSION_SWITCH_CHANNEL_NAME)
    channel.onmessage = (event: MessageEvent<RuntimeSessionSwitchEvent>) => handleSwitch(event.data)
  }, [])
}
```

Preserve this guard and expand tests if auth event semantics change. Do not move session-switch cleanup into individual pages.

### Token-Free Page Pattern: `admin/profile` and `admin/my-groups`

**Good current page pattern** (`frontend/src/app/admin/profile/page.tsx` lines 53-150):
```typescript
const { hasAccessToken, isClientInitialized } = useAuthSession()

useEffect(() => {
  if (!isClientInitialized) return
  if (!hasAccessToken) {
    setError('Anmeldung erforderlich. Bitte zuerst einen gueltigen Login aufbauen.')
    setIsLoading(false)
    return
  }

  const response = await getOwnProfile()
}, [hasAccessToken, isClientInitialized])

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  if (!hasAccessToken) return
  const response = await updateOwnProfile({ ... })
}

const response = await uploadOwnProfileAvatar(file)
```

**Good current dashboard pattern** (`frontend/src/app/admin/my-groups/page.tsx` lines 48-75):
```typescript
const { hasAccessToken, isClientInitialized } = useAuthSession()

const loadGroups = useCallback(async () => {
  if (!isClientInitialized) return
  if (!hasAccessToken) {
    setError('Anmeldung erforderlich. Bitte zuerst einen gueltigen Login aufbauen.')
    setIsLoading(false)
    return
  }

  const response = await getMyFansubGroups()
  setGroups(response.data)
}, [hasAccessToken, isClientInitialized])
```

Copy this pattern into normal pages: gate on `hasAccessToken`, call API helpers without token arguments, let the central client attach/refresh/retry.

### API Helper Modules

**Current helper style to preserve while removing token parameters** (`frontend/src/lib/api/admin-anime-intake.ts` lines 14, 37-47, 54-68, 96-114):
```typescript
import { ApiError, apiClientFetch, parseApiErrorPayload } from '@/lib/api'

const response = await apiClientFetch(`/api/v1/admin/jellyfin/series?${search.toString()}`, {
  authToken,
  cache: 'no-store',
})

if (!response.ok) {
  const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
  throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
}
```

Planned endpoint helper target:
```typescript
const response = await apiClientFetch(`/api/v1/admin/jellyfin/series?${search.toString()}`, {
  cache: 'no-store',
})
```

### Upload Callers

**Token-free upload hook already exists for release-version media** (`useReleaseVersionMedia.ts` lines 151-165, 389-397):
```typescript
const response = await uploadReleaseVersionMedia({
  versionId,
  category: config.category,
  files,
  onProgress: (_fileIndex, percent) => {
    setUploadItems((current) => /* update progress */)
  },
})

Promise.all([
  getReleaseVersionMedia(versionId),
  getReleaseVersionCapabilities(versionId),
])
```

Use this as the target call-site pattern: no page token parameter, progress stays local to the hook.

**Current upload callers still pass token props** (`MediaUpload.tsx` lines 24-33, 287-300, 473-481):
```typescript
interface MediaUploadProps {
  type: FansubMediaKind
  fansubID: number
  groupName: string
  value: EditableMediaValue | null
  authToken?: string
  disabled?: boolean
  onBusyChange?: (isBusy: boolean) => void
  onChange: (nextValue: EditableMediaValue | null) => void
}

const response = await uploadFansubMedia({
  fansubID,
  kind: type,
  file,
  authToken,
  onProgress: setProgress,
})

await deleteFansubMedia(fansubID, type, authToken)
```

Planner note: migrate `MediaUpload` to `hasAccessToken`/`disabled` only, then call `uploadFansubMedia`/`deleteFansubMedia` without token arguments.

### Admin Fansub/Edit and Member Components

**Current anti-pattern in parent page** (`frontend/src/app/admin/fansubs/[id]/edit/page.tsx` lines 621, 722, 1048-1053, 1151-1156, 1474-1514, 1735-1738):
```typescript
const { authToken, hasAccessToken, isClientInitialized } = useAuthSession()

getAdminFansubAnime(fansubID, authToken)

const uploadResponse = await uploadAdminReleaseThemeAssetForRelease({
  releaseID: release.release_id,
  themeID: selectedReleaseSegment.card.theme_id,
  file,
  authToken,
  onProgress: setDrawerProgress,
})

if (!authToken || invalid) return
await updateFansubGroup(fansubID, formToPayload(form, logoMedia, bannerMedia), authToken)
await syncFansubLinks(fansubID, initialLinks, links, authToken)

<MediaUpload ... authToken={authToken} ... />
<FansubAppMembersSection fansubId={fansubID} authToken={authToken} />
<AnimeProjectNotesSection fansubId={fansubID} authToken={authToken} />
```

Target: keep `hasAccessToken` UI gating and scoped loading/error state, remove token props and arguments.

**Component-level anti-pattern** (`FansubAppMembersSection.tsx` lines 31-34, 95-127, 226-310):
```typescript
type FansubAppMembersSectionProps = {
  authToken: string
  fansubId: number
}

if (!authToken.trim() || fansubId <= 0) {
  setCapabilities(null)
  setMembers([])
  setIsLoading(false)
  return
}

const capabilitiesResponse = await getFansubGroupCapabilities(fansubId, authToken)
const membersResponse = await listFansubAppMembers(fansubId, authToken)
const invitationsResponse = await listFansubGroupInvitations(fansubId, authToken)
```

Copy the error formatting and capability-driven UI, not the token prop.

**Mixed pattern in notes tab** (`NotesTab.tsx` lines 121-170, 220-330):
```typescript
const { authToken, isClientInitialized } = useAuthSession()

const notes = await listFansubGroupNotes(fansubId, authToken || undefined)
const [context, list] = await Promise.all([
  getMemberGroupStoryContext(fansubId, authToken || undefined),
  listMemberGroupStories(fansubId, authToken || undefined),
])

const created = await createFansubGroupNote(fansubId, req, authToken || undefined)
```

Target: keep `isClientInitialized`, add `hasAccessToken` if needed, remove `authToken || undefined` forwarding.

### Admin Anime Create/Edit Callers

**Current controller anti-pattern** (`useAdminAnimeCreateController.ts` lines 186-319, 682-759, 997-1141):
```typescript
const { authToken, hasAccessToken: hasAuthToken, isClientInitialized: isAuthStateHydrated } = useAuthSession();

getAdminGenreTokens({ limit: 1000 }, authToken)
getAdminTagTokens({ limit: 1000 }, authToken)

const runtimeAuthToken = hasAuthToken ? authToken : "";
if (!runtimeAuthToken) {
  setErrorMessage("Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.");
  return;
}

const response = await loadAdminAnimeCreateAniSearchDraft(requestPayload, runtimeAuthToken)
```

Target: keep `hasAuthToken` and hydration gates, remove `runtimeAuthToken` local variables and helper token parameters.

**Create upload plan anti-pattern** (`createAssetUploadPlan.ts` lines 244-268, 303-382):
```typescript
async function uploadAndLinkCreatedAnimeAsset(
  animeID: number,
  kind: AdminAnimeAssetKind,
  file: File,
  authToken?: string,
  providerKey?: string,
): Promise<string> {
  const upload = await uploadAdminAnimeMedia({
    animeID,
    assetType: config.assetType,
    file,
    authToken,
  });
  await assignAdminAnimeCoverAsset(animeID, upload.id, authToken);
  // ...
}
```

Target: preserve slot-specific link sequencing and background additive behavior, but remove token parameter threading.

### Streaming Routes Boundary

**Do not migrate silently** (`episodes/[id]/play/route.ts` and `releases/[id]/stream/route.ts` lines 44-67, 83-114, 130-135):
```typescript
const cookieStore = await cookies()
const tokenFromCookie = (cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value || '').trim()
const refreshTokenFromCookie = (cookieStore.get(AUTH_REFRESH_COOKIE_NAME)?.value || '').trim()

let relayTarget = await resolveStreamRelayTarget({
  apiBaseURL,
  streamPath: `/api/v1/episodes/${episodeID}/play`,
  grantPath: `/api/v1/episodes/${episodeID}/play/grant`,
  providedGrant,
  accessToken: tokenFromCookie,
  fallbackAccessToken: AUTH_BEARER_TOKEN,
  refreshToken: refreshTokenFromCookie,
})

if (relayTarget.authorizationToken) {
  headers.set('Authorization', `Bearer ${relayTarget.authorizationToken}`)
}

applyRefreshedAuthCookies(response, refreshedSession)
```

Source helper (`frontend/src/lib/server/streamRelayAuth.ts` lines 226-237):
```typescript
/**
 * Strategie:
 * 1. Wenn ein vorhandenes Grant-Token mitgegeben wird, wird es direkt verwendet.
 * 2. Falls kein Access-Token vorhanden, wird das Fallback-Token oder ein Refresh versucht.
 * 3. Ein Grant-Token wird angefordert; bei 401 wird die Session refresht und nochmals versucht.
 * 4. Schlaegt alles fehl, wird der Stream-URL mit Bearer-Token im Authorization-Header zurueckgegeben.
 */
export async function resolveStreamRelayTarget(
  args: ResolveStreamRelayTargetArgs,
): Promise<ResolveStreamRelayTargetResult> {
```

Planner note: document these as server-side streaming exceptions in `49-04`. Do not include them in normal frontend caller migration unless a tiny compatibility fix is explicitly planned.

## Shared Patterns

### Auth Storage Boundary
**Source:** `frontend/src/lib/api.ts` lines 230-240, 375-445, 708-770
**Apply to:** all normal frontend pages/components/helpers
Only `api.ts` should read/write auth cookies/storage for normal API calls. `keycloakAuth.ts` may use `sessionStorage` only for PKCE verifier/state.

### Request Gatekeeper
**Source:** `frontend/src/lib/api.ts` lines 940-975
**Apply to:** all normal API helpers
Use `apiClientFetch`/`authorizedFetch`; add proactive refresh there, not in pages. Preserve exactly-once retry for auth-related 401.

### Refresh Coordination
**Source:** `frontend/src/lib/api.ts` lines 871-909
**Apply to:** fetch and central XHR/upload wrapper
All concurrent refreshes should share `runtimeSessionRefreshPromise`. Upload preflight must use the same coordination.

### Token-Free Page Consumption
**Source:** `frontend/src/app/admin/profile/page.tsx` lines 53-150 and `frontend/src/app/admin/my-groups/page.tsx` lines 48-75
**Apply to:** all admin pages/components migrated in 49-03
Pages consume `hasAccessToken`/`isClientInitialized` and call API helpers without token strings.

### Session Resync
**Source:** `frontend/src/lib/useAuthSession.ts` lines 22-40, `frontend/src/components/auth/AuthSessionSwitchGuard.tsx` lines 14-64
**Apply to:** long-running admin pages and global app shell
Keep focus/storage/visibility/custom-event sync; force logout on app-user switch.

### Error Handling
**Source:** `frontend/src/lib/api.ts` lines 242-270 and `frontend/src/lib/api/admin-anime-intake.ts` lines 42-47
**Apply to:** API helpers
Throw `ApiError(status, message, retryAfter, code, details)` after `parseApiErrorPayload`. Components may map 401/403/409 to local messages without owning tokens.

## Centralization State

### Already Centralized
- Token cookie/storage reads and writes mostly live in `frontend/src/lib/api.ts`.
- Keycloak exchange/refresh/logout are isolated in `frontend/src/lib/keycloakAuth.ts` and called by `api.ts` and `/auth`.
- `apiClientFetch` exists and resolves relative API paths centrally.
- One in-flight refresh promise already exists.
- Cross-tab session-switch event signaling exists through localStorage, custom events, and BroadcastChannel.
- Some newer pages (`admin/profile`, `admin/my-groups`) already use token-free API helper calls.
- Release-version media upload caller already avoids page-passed auth tokens.

### Incomplete
- `authorizedFetch` only refreshes after auth-related 401; it does not proactively refresh near-expiry tokens before requests.
- `AuthTokenData` expiry values are persisted as cookie max-age but expiry timestamps are not used for preflight gating.
- Many API helpers still accept `authToken?: string` and pass it into `authorizedFetch`.
- Many pages/components still receive or construct `authToken` sentinel/local variables for later calls.
- XHR upload helpers duplicate token resolution and bearer header attachment.
- Upload XHR paths have no central proactive refresh and no shared exactly-once 401 retry behavior.
- Static verification does not yet fail on token reads/props outside allowed files.

## Anti-Pattern Verification Gates

Use these as implementation and `49-04` static-test gates. Expected allowlists should include tests and the central files named below.

### Direct Runtime Token Access Outside Central Client
```powershell
rg -n "getRuntimeAuthToken|getRuntimeRefreshToken|document\.cookie|team4s_access_token|team4s_refresh_token|AUTH_TOKEN_COOKIE_NAME|AUTH_REFRESH_COOKIE_NAME" frontend/src --glob "!frontend/src/lib/api.ts" --glob "!frontend/src/app/api/**" --glob "!**/*.test.ts*"
```

Allowed after Phase 49: none for normal pages/components/helpers. Streaming routes remain documented exceptions under `frontend/src/app/api/**`.

### Browser Storage Token Access Outside Central Client
```powershell
rg -n "localStorage\.(getItem|setItem|removeItem).*auth|sessionStorage\.(getItem|setItem|removeItem).*auth|team4s\.auth\." frontend/src --glob "!frontend/src/lib/api.ts" --glob "!frontend/src/lib/keycloakAuth.ts" --glob "!**/*.test.ts*"
```

Allowed after Phase 49: `keycloakAuth.ts` PKCE transient state only; non-auth UI storage like scroll restoration must not be flagged if pattern is narrowed.

### Bearer Header Construction Outside Central Client Or Streaming Boundary
```powershell
rg -n "Authorization.*Bearer|Bearer \$\{|setRequestHeader\('Authorization'|headers\.set\('Authorization'" frontend/src --glob "!frontend/src/lib/api.ts" --glob "!frontend/src/lib/server/streamRelayAuth.ts" --glob "!frontend/src/app/api/episodes/[id]/play/route.ts" --glob "!frontend/src/app/api/releases/[id]/stream/route.ts" --glob "!**/*.test.ts*"
```

Allowed after Phase 49: central client/upload wrapper and documented server streaming relay only.

### Token Props And Parameters In Pages/Components
```powershell
rg -n "\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken" frontend/src/app frontend/src/components --glob "!**/*.test.ts*"
```

Target after Phase 49: no normal page/component token ownership. Replace with `hasAccessToken`, capabilities, current-user data, or central helper calls.

### API Helper Token Threading
```powershell
rg -n "authToken\?: string|authToken,\s*$|authToken \|\| undefined|withAuthHeader\(\{\}, authToken\)|apiClientFetch\([^)]*\{\s*[^}]*authToken" frontend/src/lib frontend/src/app --glob "!**/*.test.ts*"
```

Target after Phase 49: `authToken` should not be part of normal helper contracts. Any remaining explicit-token path must be documented as server/legacy/streaming-only.

### Direct Fetch Outside Central Helper
```powershell
rg -n "fetch\(" frontend/src/app frontend/src/components frontend/src/lib --glob "!frontend/src/lib/api.ts" --glob "!frontend/src/lib/keycloakAuth.ts" --glob "!frontend/src/app/api/**" --glob "!**/*.test.ts*"
```

Current known normal-client hits: `ScreenshotGallery.tsx` public image fetch and `MediaUpload.tsx` remote source fetch. Classify as public/no-auth or migrate.

### XHR Upload Duplication
```powershell
rg -n "new XMLHttpRequest|setRequestHeader\('Authorization'|upload\.onprogress" frontend/src --glob "!**/*.test.ts*"
```

Target after Phase 49: one central upload/XHR helper owns auth preflight/header/retry; upload functions only provide endpoint, body builder, progress mapping, and response parser.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Proactive expiry-buffer helper in `api.ts` | utility | request-response | No current implementation reads token expiry before request. Planner should add inside central client using existing persisted auth data or a new central metadata shape. |
| Central authorized XHR/upload wrapper | utility | file-I/O | Upload functions duplicate XHR auth logic; no single wrapper exists yet. |

## Metadata

**Analog search scope:** `frontend/src/lib`, `frontend/src/app/auth`, `frontend/src/components/auth`, `frontend/src/components/admin`, `frontend/src/app/admin`, `frontend/src/app/api`, `frontend/src/lib/server`
**Search commands used:** `rg` for token/storage/fetch/XHR/authToken surfaces; targeted line reads for files over 2,000 lines
**Pattern extraction date:** 2026-05-20
