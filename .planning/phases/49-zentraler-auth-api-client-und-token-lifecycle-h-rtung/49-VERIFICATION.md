# Phase 49 Verification

**Date:** 2026-05-20  
**Scope:** Phase 49 final verification and docs for the central frontend Auth/API client.  
**Result:** PASS with unrelated lint failures documented.

## Summary

Phase 49 now has a static no-token boundary test, expanded lifecycle/upload/session tests, frontend developer docs, and a streaming handoff note. Normal browser app/component surfaces are token-free under the final static gate. SSR pages and streaming routes remain explicitly documented server-side boundaries.

## Commands Run

### Focused Lifecycle, Upload, Static, Auth Page, Guard, And Stream Tests

```powershell
cd C:/Users/admin/Documents/Team4s/frontend
npm run test -- api.auth-refresh.test.ts api.session-switch.test.ts api.admin-anime.test.ts api.no-token-boundary.test.ts components/auth/AuthSessionSwitchGuard.test.tsx app/auth/page.test.tsx lib/server/streamRelayAuth.test.ts
```

Output summary:

```text
Test Files  7 passed (7)
Tests       49 passed (49)
```

Covered evidence:

- proactive refresh before protected fetch requests
- no unnecessary refresh for valid sessions
- shared concurrent proactive refresh
- exactly-one auth-related `401` retry
- second `401` surfacing
- refresh failure clearing local session
- upload preflight refresh before XHR opens
- upload progress preservation/reset sequence
- unsafe upload `401` no-replay behavior
- refresh failure rejection before unsafe upload XHR starts
- token-free session hook resync on storage, custom event, focus, and visibility events
- BroadcastChannel session-switch logout guard
- auth page compatibility
- stream relay auth compatibility
- final static no-token boundary allowlists

### Typecheck

```powershell
cd C:/Users/admin/Documents/Team4s/frontend
npm run typecheck
```

Output summary:

```text
tsc --noEmit
PASS
```

### Lint

```powershell
cd C:/Users/admin/Documents/Team4s/frontend
npm run lint
```

Result: FAIL due unrelated existing lint errors outside the 49-04 implementation.

Unrelated existing error files:

- `src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx` - `react-hooks/globals` reassignment of `patchItemRef` during render.
- `src/app/dev/ui-system/page.tsx` - `react-hooks/set-state-in-effect`.
- `tmp-live-full-flow*.js` - `@typescript-eslint/no-require-imports` in temporary scripts.

Targeted lint for 49-04 files passed:

```powershell
cd C:/Users/admin/Documents/Team4s/frontend
npx eslint src/lib/api.ts src/lib/api.auth-refresh.test.ts src/lib/api.session-switch.test.ts src/lib/api.admin-anime.test.ts src/lib/api.no-token-boundary.test.ts src/components/auth/AuthSessionSwitchGuard.test.tsx
```

### Build

```powershell
cd C:/Users/admin/Documents/Team4s/frontend
npm run build
```

Output summary:

```text
Next.js 16.1.6 (Turbopack)
Compiled successfully
Running TypeScript
Generating static pages (19/19)
PASS
```

### Scoped Diff Check

```powershell
cd C:/Users/admin/Documents/Team4s
git diff --check -- frontend/src/lib/api.auth-refresh.test.ts frontend/src/lib/api.session-switch.test.ts frontend/src/lib/api.admin-anime.test.ts frontend/src/lib/api.no-token-boundary.test.ts frontend/src/components/auth/AuthSessionSwitchGuard.test.tsx docs/frontend/auth-api-client.md docs/frontend/streaming-auth-handoff.md .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-VERIFICATION.md
```

Result: PASS. Git emitted only line-ending warnings for touched frontend files.

## Static RG Gates

### Runtime Token / Cookie Access

Command:

```powershell
rg -n "getRuntimeAuthToken|getRuntimeRefreshToken|document\.cookie|team4s_access_token|team4s_refresh_token|AUTH_TOKEN_COOKIE_NAME|AUTH_REFRESH_COOKIE_NAME" frontend/src --glob "!frontend/src/lib/api.ts" --glob "!**/*.test.ts*"
```

Output summary: allowed boundary hits only.

- `frontend/src/lib/server/streamRelayAuth.ts` - server streaming boundary.
- `frontend/src/app/api/episodes/[id]/play/route.ts` - server streaming boundary.
- `frontend/src/app/api/releases/[id]/stream/route.ts` - server streaming boundary.
- `frontend/src/app/watchlist/page.tsx` - SSR server page boundary.
- `frontend/src/app/anime/[id]/page.tsx` - SSR server page boundary.

### Browser Auth Storage

Command:

```powershell
rg -n "localStorage\.(getItem|setItem|removeItem).*auth|sessionStorage\.(getItem|setItem|removeItem).*auth|team4s\.auth\." frontend/src --glob "!frontend/src/lib/api.ts" --glob "!frontend/src/lib/keycloakAuth.ts" --glob "!**/*.test.ts*"
```

Output summary: zero hits.

### Bearer Construction

Command:

```powershell
rg -n "Authorization.*Bearer|Bearer \$\{|setRequestHeader\('Authorization'|headers\.set\('Authorization'" frontend/src --glob "!frontend/src/lib/api.ts" --glob "!**/*.test.ts*"
```

Output summary: server streaming boundary hits only.

- `frontend/src/lib/server/streamRelayAuth.ts`
- `frontend/src/app/api/episodes/[id]/play/route.ts`
- `frontend/src/app/api/releases/[id]/stream/route.ts`

### Token Props / Params In App And Components

Command:

```powershell
rg -n "\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken" frontend/src/app frontend/src/components --glob "!**/*.test.ts*"
```

Output summary: SSR server page boundary hits only.

- `frontend/src/app/watchlist/page.tsx`
- `frontend/src/app/anime/[id]/page.tsx`

### API Helper Token Threading

Command:

```powershell
rg -n "authToken\?: string|authToken,\s*$|authToken \|\| undefined|withAuthHeader\(\{\}, authToken\)|apiClientFetch\([^)]*\{\s*[^}]*authToken" frontend/src/lib frontend/src/app --glob "!**/*.test.ts*"
```

Output summary: remaining hits are inside `frontend/src/lib/api.ts`, the central client compatibility surface. Final no-token boundary tests allow `api.ts` as the central owner but fail normal pages/components.

### Direct Fetch Outside Central Helper

Command:

```powershell
rg -n "fetch\(" frontend/src/app frontend/src/components frontend/src/lib --glob "!frontend/src/lib/api.ts" --glob "!frontend/src/lib/keycloakAuth.ts" --glob "!frontend/src/app/api/**" --glob "!**/*.test.ts*"
```

Output summary: public/no-auth fetches only.

- `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx`
- `frontend/src/components/admin/MediaUpload.tsx`

### XHR Upload Duplication

Command:

```powershell
rg -n "new XMLHttpRequest|setRequestHeader\('Authorization'|upload\.onprogress" frontend/src --glob "!**/*.test.ts*"
```

Output summary: one central upload wrapper in `frontend/src/lib/api.ts`.

## Upload Retry Evidence

| Helper | Evidence | Decision |
|---|---|---|
| `uploadFansubMedia` | 49-02 found auth middleware runs before multipart read, file write, `media_assets`, and `fansub_group_media` assignment. | Preflight refresh only; no automatic replay after upload `401`. |
| `uploadAdminAnimeMedia` | 49-02 found `/admin/upload` authenticates first, then provisions folders, writes files, and creates media rows. 49-04 tests verify preflight refresh and no unsafe replay. | Preflight refresh only; no automatic replay after upload `401`. |
| `uploadAdminReleaseThemeAsset` | 49-02 found admin/auth checks run before release/theme checks, file save, `media_assets`, `media_files`, and release-theme link creation. | Preflight refresh only; no automatic replay after upload `401`. |
| `uploadAdminReleaseThemeAssetForRelease` | 49-02 found auth/admin check runs before file save, `media_assets`, `media_files`, and release-theme link creation. | Preflight refresh only; no automatic replay after upload `401`. |
| `uploadReleaseVersionMedia` | 49-02 found auth and permission checks run before multipart processing, with file and DB writes after authorization. | Preflight refresh only; no automatic replay after upload `401`. |
| `uploadSegmentAsset` | 49-02 classified this FormData upload as auth-before-handler but persistence binds a segment asset. | `apiClientFetch`/fetch preflight with auth retry disabled. |
| `uploadOwnProfileAvatar` | 49-02 classified this FormData upload as auth-before-handler but persistence writes and attaches avatar media. | `apiClientFetch`/fetch preflight with auth retry disabled. |

## Streaming Boundary Decision

Streaming/Jellyfin routes remain server-side boundaries for Phase 49:

- `frontend/src/app/api/episodes/[id]/play/route.ts`
- `frontend/src/app/api/releases/[id]/stream/route.ts`
- `frontend/src/lib/server/streamRelayAuth.ts`

They were not redesigned or migrated to the browser API client. Future per-user playback work should be planned as a dedicated stream-grant/relay phase.

## Residual Risks

- `frontend/src/lib/api.ts` still contains central-client compatibility `authToken?: string` helper parameters. The final static gate accepts this only in the central client and fails normal app/component token ownership.
- Full `npm run lint` remains blocked by unrelated existing lint errors listed above.
- The workspace remains dirty with unrelated user/agent work outside Phase 49 Plan 04.
- ROADMAP/STATE tracking was already stale before Phase 49 final verification; this plan records final evidence without broad unrelated metadata repair.
