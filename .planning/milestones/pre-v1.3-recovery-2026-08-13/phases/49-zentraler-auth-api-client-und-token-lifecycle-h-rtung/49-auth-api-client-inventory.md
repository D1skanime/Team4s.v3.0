# Phase 49 Auth/API Client Inventory

**Plan:** 49-01
**Captured:** 2026-05-20
**Scope:** Read-only inventory and boundary preparation. No application code changes.

## Phase 48 Readiness

### Evidence

| Source | Evidence | Conclusion |
|---|---|---|
| `.planning/ROADMAP.md` Phase 48 | Phase 48 still shows `Plans: 0/4 plans executed` and unchecked plan rows. | Tracking is stale. Do not use the roadmap counter alone as readiness proof. |
| `.planning/STATE.md` | Current position still says Phase 48a Plan 3 of 5, stopped at `Completed 48A-02-PLAN.md`. | State tracking is stale relative to the Phase 48 artifacts on disk. |
| `.planning/phases/48-meine-gruppen-und-contributor-dashboard/48-SUMMARY.md` | Frontmatter says `status: complete`, date `2026-05-20`. It lists `GET /api/v1/me/fansub-groups`, contributor-safe group detail, permission-engine capabilities, `/admin/my-groups`, `/admin/my-groups/[id]`, navigation to `Meine Gruppen`, regression tests, and `docs/frontend/contributor-dashboard-phase48.md`. | Practical Phase 48 baseline exists for Phase 49 assumptions. |
| `.planning/phases/48-meine-gruppen-und-contributor-dashboard/48-UAT.md` | Tests 1-8 are `PASS`, including own-group visibility, historical read-only behavior, disabled-user rejection, foreign-group URL blocking, Phase-47 credits not granting rights, UI-system alignment, and two live Keycloak UAT accounts. | Auth/navigation/contributor assumptions are sufficiently proven for Phase 49 inventory. |
| `.planning/phases/48-meine-gruppen-und-contributor-dashboard/` | `48-SUMMARY.md`, `48-UAT.md`, `48-VALIDATION.md`, `48-UI-REVIEW.md`, and `48-REVIEW.md` are present; `48-VERIFICATION.md` is missing. | Complete-enough evidence exists, but verification is split across UAT/validation/review rather than a standalone verification file. |
| `git status --short` | Workspace is heavily dirty with unrelated application, planning, GSD tooling, migration, and untracked Phase 43-49 artifacts. | Do not stage, revert, or restage unrelated changes. Inventory captures current dirty state only. |

### Concrete Baseline Features Phase 49 Depends On

- Keycloak-backed auth entrypoint and runtime session state exist.
- Contributor pages consume app-user/group membership and capability concepts from Phase 43-48 work.
- `/admin/my-groups` and `/admin/my-groups/[id]` exist as normal frontend surfaces that must participate in the central client lifecycle.
- Navigation already links authenticated users into contributor areas.
- Permission decisions remain backend/domain-owned; frontend capability booleans drive action visibility.

### Readiness Conclusion

**PASS with tracking drift.** Phase 48 readiness is practically satisfied enough for Phase 49 assumptions because the Phase 48 summary and UAT artifacts prove the contributor auth/navigation baseline. The roadmap/state counters are stale and should be treated as planning metadata drift, not as a blocker for 49-01. This plan does not update roadmap/state because the requested scope is limited to 49-01 inventory, boundaries, and summary artifacts.

## Static Search Summary

All searches were run from `C:/Users/admin/Documents/Team4s` on 2026-05-20.

| Gate | Command Pattern | Lines | Files | Result |
|---|---:|---:|---:|---|
| Runtime token access outside central client/app API tests | `getRuntimeAuthToken|getRuntimeRefreshToken|document\.cookie|team4s_access_token|team4s_refresh_token|AUTH_TOKEN_COOKIE_NAME|AUTH_REFRESH_COOKIE_NAME` | 7 | 3 | SSR pages and server stream helper only. |
| Browser storage auth access outside central client/keycloak helper/tests | `localStorage\.(getItem|setItem|removeItem).*auth|sessionStorage\.(getItem|setItem|removeItem).*auth|team4s\.auth\.` | 0 | 0 | No extra browser storage token access found. |
| Bearer construction outside central client/server stream allowlist/tests | `Authorization.*Bearer|Bearer \$\{|setRequestHeader\('Authorization'|headers\.set\('Authorization'` | 4 | 2 | Only documented Next streaming routes. |
| `authToken` props/parameters in pages/components | `\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken` | 380 | 43 | Broad normal UI token-threading migration queue. |
| API helper token threading | `authToken\?: string|authToken,\s*$|authToken \|\| undefined|apiClientFetch\([^)]*\{\s*[^}]*authToken` | 293 | 36 | Broad helper signature and forwarding cleanup queue. |
| XHR upload duplication | `new XMLHttpRequest|setRequestHeader\('Authorization'|upload\.onprogress` | 15 | 1 | Five upload helpers duplicate auth header/progress XHR logic in `api.ts`. |
| Direct fetch outside central helper | `fetch\(` with central/keycloak/app-api/tests excluded | 2 | 2 | Public image fetch and remote media source fetch only. |

## Seam Inventory

Classifications:

- `centralize`: migrate to the central auth/API client or central upload wrapper.
- `allow-auth-entrypoint`: auth page/helper entrypoint can keep auth lifecycle calls.
- `allow-ssr-server-boundary`: server-rendered page boundary for Phase 49; separate from normal browser pages/components.
- `allow-server-streaming-boundary`: documented Next/Jellyfin stream relay boundary; do not migrate in Phase 49.
- `public-no-auth`: unauthenticated fetch that should stay outside auth lifecycle.
- `test-only`: test coverage, not production ownership.
- `follow-up`: document for later phase rather than Phase 49 normal-client migration.

| File | Seam | Current Behavior | Classification | Owner Plan | Notes |
|---|---|---|---|---|---|
| `frontend/src/lib/api.ts` | Central token storage, token resolution, request gatekeeper | Owns auth cookie/storage reads, `resolveAuthToken`, `withAuthHeader`, `authorizedFetch`, `apiClientFetch`, refresh promise, and many helper signatures that still accept `authToken`. | centralize | 49-02, 49-03 | Keep as central owner; add proactive refresh and remove normal-helper token threading. |
| `frontend/src/lib/api.ts` | XHR uploads | Five `XMLHttpRequest` paths resolve token and set `Authorization` directly while preserving progress. | centralize | 49-02, 49-03 | Add central `authorizedUploadXhr`-style wrapper; classify retry safety before enabling upload retry. |
| `frontend/src/lib/api/admin-anime-intake.ts` | API helper token forwarding | Calls `apiClientFetch` with `authToken` option. | centralize | 49-03 | Remove token parameter for normal browser use. |
| `frontend/src/lib/useAuthSession.ts` | Token-free session hook with compatibility sentinel | Returns `authToken` sentinel plus `hasAccessToken` and resyncs on focus/storage/custom/visibility events. | centralize | 49-02, 49-03 | Keep booleans and events; remove token-shaped UI contract. |
| `frontend/src/components/auth/AuthSessionSwitchGuard.tsx` | Session switch guard | Clears runtime session and redirects/reloads on cross-tab app-user switch. | centralize | 49-02 | Keep as global resync guard; expand tests if event semantics change. |
| `frontend/src/app/auth/page.tsx` | Login, callback, refresh, logout entrypoint | Calls central auth lifecycle helpers and `beginKeycloakLogin`; shows token presence as booleans. | allow-auth-entrypoint | 49-02, 49-04 | Allowed auth UI entrypoint; must not become a copied pattern for normal pages. |
| `frontend/src/lib/keycloakAuth.ts` | Keycloak identity lifecycle helper | Owns PKCE transient sessionStorage and Keycloak exchange/refresh/logout helpers. | allow-auth-entrypoint | 49-02, 49-04 | Identity-only helper behind central client, except `/auth` login start. |
| `frontend/src/app/watchlist/page.tsx` | SSR page cookie read | Reads `AUTH_TOKEN_COOKIE_NAME` via `cookies()` and calls `getWatchlist` during server render. | allow-ssr-server-boundary | 49-04 | Separate SSR allowlist from browser pages/components and streaming. |
| `frontend/src/app/anime/[id]/page.tsx` | SSR page cookie read | Reads `AUTH_TOKEN_COOKIE_NAME` via `cookies()` and uses token for watchlist state while rendering anime page. | allow-ssr-server-boundary | 49-04 | SSR boundary unless later converted to normal browser API calls. |
| `frontend/src/lib/server/streamRelayAuth.ts` | Server stream auth helper | Reads central cookie constants, resolves stream grants, can refresh cookies. | allow-server-streaming-boundary | 49-04 | Streaming/Jellyfin relay boundary, not normal browser API migration. |
| `frontend/src/app/api/episodes/[id]/play/route.ts` | Next streaming route | Reads access/refresh cookies server-side, resolves relay target, sets upstream bearer, applies refreshed cookies. | allow-server-streaming-boundary | 49-04 | Do not migrate silently; later stream-grant/relay phase if needed. |
| `frontend/src/app/api/releases/[id]/stream/route.ts` | Next streaming route | Same server-side stream relay behavior for release streams. | allow-server-streaming-boundary | 49-04 | Do not migrate with normal frontend client cleanup. |
| `frontend/src/app/episodes/[id]/components/ScreenshotGallery/ScreenshotGallery.tsx` | Direct fetch | Fetches public release images. | public-no-auth | 49-04 | Keep classified as public/no-auth unless endpoint becomes protected. |
| `frontend/src/components/admin/MediaUpload.tsx` | Direct fetch and authToken prop | Fetches remote source URL without auth; also passes `authToken` to fansub media upload/delete helpers. | centralize | 49-03 | Split public remote fetch from upload auth cleanup. |
| `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` | Browser page/controller token ownership | Reads `authToken` from `useAuthSession`, builds `runtimeAuthToken`, passes token to many helpers. | centralize | 49-03 | High-priority normal browser cleanup. |
| `frontend/src/app/admin/anime/create/createAssetUploadPlan.ts` | Post-create upload/link token threading | Accepts token and forwards to upload/link helpers. | centralize | 49-03 | Preserve existing asset ownership and additive/singular slot semantics. |
| `frontend/src/app/admin/anime/create/createPageHelpers.ts` | Create helper token parameters | Static search found token helper usage. | centralize | 49-03 | Remove token-shaped helper contracts for browser flow. |
| `frontend/src/app/admin/anime/[id]/edit/page.tsx` | Edit page token prop/argument threading | Static search found normal page token ownership. | centralize | 49-03 | Migrate to `hasAccessToken` gating and token-free helper calls. |
| `frontend/src/app/admin/anime/[id]/episodes/page.tsx` | Episode admin page token threading | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/edit/page.tsx` | Episode edit token threading | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx` | Episode versions token threading | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx` | Admin anime client token props | Static search found token ownership. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx` | Anime context helper token prop | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` | Anime/fansub context token prop | Static search found token forwarding. | centralize | 49-03 | Preserve anime/fansub ownership; only remove token threading. |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx` | Edit client token prop | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx` | Edit workspace token props | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx` | Upload/control token prop | Static search found token forwarding. | centralize | 49-03 | Keep Jellyfin intake behavior; only centralize auth. |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx` | Metadata section token prop | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx` | Relations token prop | Static search found token forwarding. | centralize | 49-03 | Preserve relation model; only auth cleanup. |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx` | Theme token prop | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/components/AnimePatchForm/AnimePatchForm.tsx` | Patch form token prop | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx` | Episode manager token prop | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts` | Hook token parameters | Static search found token forwarding. | centralize | 49-03 | Remove token from hook API. |
| `frontend/src/app/admin/anime/hooks/internal/episode-manager/useEpisodeManagerBulkMutations.ts` | Hook token parameters | Static search found token forwarding. | centralize | 49-03 | Remove token from hook API. |
| `frontend/src/app/admin/anime/hooks/internal/episode-manager/useEpisodeManagerEditMutations.ts` | Hook token parameters | Static search found token forwarding. | centralize | 49-03 | Remove token from hook API. |
| `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts` | Hook token parameters | Static search found token forwarding. | centralize | 49-03 | Remove token from hook API. |
| `frontend/src/app/admin/anime/hooks/internal/useEpisodeManagerImpl.ts` | Hook token parameters | Static search found token forwarding. | centralize | 49-03 | Remove token from hook API. |
| `frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts` | Hook token parameters | Static search found token forwarding. | centralize | 49-03 | Keep Jellyfin intake boundary; do not redesign streaming. |
| `frontend/src/app/admin/anime/hooks/internal/useJellyfinSyncImpl.ts` | Hook token parameters | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/hooks/useAdminAnimeRelations.ts` | Hook token parameters | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/hooks/useAdminAnimeThemes.ts` | Hook token parameters | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts` | Hook token parameters | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx` | Segment tab token forwarding | Static search found token forwarding. | centralize | 49-03 | Preserve release-version segment ownership. |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` | Editor hook token forwarding | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts` | Segment hook token forwarding | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` | Fansub edit token ownership and upload token props | Reads token from session hook, passes to release-theme upload, group save, links, media, members, notes. | centralize | 49-03 | Preserve release/group media ownership; only remove token threading. |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` | Member section token prop | Requires `authToken` prop for capability/member/invitation calls. | centralize | 49-03 | Convert to token-free helper calls and capability state. |
| `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` | Notes section token prop | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx` | OP/ED section token prop | Static search found token forwarding. | centralize | 49-03 | Preserve release-theme asset boundary. |
| `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx` | Notes tab token ownership | Reads `authToken` from session hook and forwards `authToken || undefined` to note/story helpers. | centralize | 49-03 | Token-free notes calls; keep scoped loading/error state. |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx` | Release-theme asset token forwarding | Static search found token forwarding. | centralize | 49-03 | Keep release-native asset attachment. |
| `frontend/src/app/admin/fansubs/create/page.tsx` | Create fansub token forwarding | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/fansubs/merge/page.tsx` | Merge token forwarding | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |
| `frontend/src/app/admin/fansubs/page.tsx` | Fansub list token forwarding | Static search found token forwarding. | centralize | 49-03 | Normal browser API cleanup. |

## Migration Queue By Owner Plan

| Order | Owner Plan | Work |
|---:|---|---|
| 1 | 49-02 | Harden `authorizedFetch`: pre-request expiry check, shared refresh promise, exactly-once auth 401 retry, refresh failure cleanup, session-change events. |
| 2 | 49-02 | Add central upload/XHR wrapper with preflight refresh and endpoint-specific retry eligibility classification. |
| 3 | 49-03 | Remove `authToken` from `useAuthSession` public UI contract or deprecate it behind compatibility while migrating callers. |
| 4 | 49-03 | Remove normal-helper `authToken?: string` signatures and `authToken` forwarding from API helper modules and app/component hooks. |
| 5 | 49-03 | Migrate normal pages/components to `hasAccessToken`, current-user, capabilities, or token-free snapshots only. |
| 6 | 49-03 | Move upload helpers to central upload wrapper without changing media ownership, release linkage, or group media tables. |
| 7 | 49-04 | Add static no-token gates with separate allowlists for auth entrypoint, SSR pages, server streaming, tests, and public/no-auth fetches. |
| 8 | 49-04 | Document streaming/Jellyfin handoff as separate stream-grant/relay work, not a normal browser API migration. |

## Residual Risks

- The current inventory is based on a dirty workspace. If unrelated auth files change before 49-02/49-03 execution, rerun the static gates before implementation.
- `48-SUMMARY.md` and other Phase 48 artifacts are untracked while roadmap/state remain stale. This plan treats the runtime baseline as ready but does not repair planning metadata drift.
- The `authToken` surface is broad enough that 49-03 must honor its split rule if the actual migration would exceed the listed file budget.
