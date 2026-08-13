# Phase 128: Canonical Public Identity & Visibility Foundation - Pattern Map

**Mapped:** 2026-08-13
**Files analyzed:** 47 likely new/modified files or tightly coupled file groups
**Analogs found:** 44 / 47

## Scope Guardrails

- Extend the existing `members` ownership seam and `MemberProfileRepository`; do not create a parallel member/profile store.
- The justified shared additions are:
  - one transaction-scoped slug allocator used by all three production `INSERT INTO members` paths, removing three potential allocation implementations;
  - one minimal `ResolvePublicMemberAccess` seam on the existing member-profile repository, injected into the three handler families, removing three nickname/numeric/visibility decisions;
  - one neutral-unavailable response helper used by every member handler, removing status/body drift.
- Keep the public profile DTO/composition authoritative. `OwnHiddenProfilePreview` may remain the client auth boundary, but its own-profile request, nickname slugifier, numeric match, and reduced `toPublicProfile` reconstruction are removal targets.
- Historical migrations `0044`, `0077`, `0126`, and `0144` are read-only. Add `0145` up/down files.
- Existing rows are disposable. The up migration should fail closed if `members` is non-empty; do not backfill, alias, preserve, or rewrite `members_only` rows.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/0145_member_public_identity_visibility.up.sql` | migration | batch/schema | `database/migrations/0144_drop_theme_segment_playback_sources_legacy_unique.up.sql`; immutable trigger contract in Phase 106 tests | role-match |
| `database/migrations/0145_member_public_identity_visibility.down.sql` | migration | batch/schema | `database/migrations/0144_drop_theme_segment_playback_sources_legacy_unique.down.sql` | role-match |
| `backend/internal/testsupport/phase128_postgres.go` | test utility | database fixture | `backend/internal/testsupport/phase117_postgres.go` | exact |
| `backend/internal/testsupport/phase128_postgres_test.go` | test | database safety | `backend/internal/testsupport/phase117_postgres_test.go` | exact |
| `backend/internal/migrations/phase128_public_identity_test.go` | test | migration up/down | `backend/internal/migrations/phase106_member_points_test.go` | exact |
| `backend/internal/repository/member_public_slug.go` | utility/repository seam | transactional write | `member_profile_repository.go` normalizer plus the three creation transactions | role-match |
| `backend/internal/repository/member_public_slug_test.go` | test | transform + concurrent CRUD | Phase 106/117 guarded PostgreSQL tests | role-match |
| `backend/internal/repository/member_requests_repository.go` | repository | transactional CRUD | its existing `ApproveRequest` transaction | exact |
| `backend/internal/repository/fansub_group_app_members_repository.go` | repository | transactional CRUD | existing `ensureAppUserMemberAnchorTx` | exact |
| `backend/internal/repository/hist_group_members_repository.go` | repository | transactional CRUD | existing `CreateWithAutoMember` transaction | exact |
| `backend/internal/repository/member_public_access_repository.go` | repository method file | deny-first request-response | `member_profile_repository.go` base lookup and verified-claim predicate | partial; new shared seam justified |
| `backend/internal/repository/member_public_access_repository_test.go` | test | access matrix | guarded Phase 117 repository fixture pattern | role-match |
| `backend/internal/repository/member_profile_repository.go` | repository | request-response projection | existing `GetPublicMemberProfile` and ID-based loaders | exact extension |
| `backend/internal/repository/anime_contributions_public_repository.go` | repository | request-response projection | existing timeline query after member ID resolution | exact extension |
| `backend/internal/repository/project_member_public_repository.go` | repository | request-response projection | existing relation gate after member ID resolution | exact extension |
| `backend/internal/handlers/public_member_access.go` (recommended shared helper/interfaces) | handler utility | request-response | `app_public_profile.go` private store interfaces + `group_handler.go:notFound` | role-match |
| `backend/internal/handlers/app_public_profile.go` | handler | request-response | current handler; reorder resolver before loader | exact extension |
| `backend/internal/handlers/contributions_public_handler.go` | handler | request-response | `app_public_profile.go` injected store pattern | role-match |
| `backend/internal/handlers/project_member_public_handler.go` | handler | request-response | existing shared `resolve` method | exact extension |
| `backend/internal/handlers/public_member_access_matrix_test.go` | test | request-response spy matrix | `member_memorial_handler_test.go` recording stub; `app_public_profile_test.go` Gin harness | exact composition |
| `backend/internal/handlers/app_public_profile_test.go` | test | request-response | existing table/Gin setup, assertions rewritten | exact |
| `backend/internal/handlers/project_member_public_handler_test.go` | test | route/source + handler | existing route/source assertions; add behavioral resolver stubs | role-match |
| `backend/cmd/server/main.go` | config/composition root | dependency injection + routing | current explicit constructors and `authOptionalMiddleware` registration | exact |
| `backend/internal/models/member_profile.go` | model/DTO | transform | existing visibility constants and member DTOs | exact |
| `shared/contracts/openapi.yaml` | API contract | request-response | existing member profile/projects operations and schemas | exact |
| `backend/internal/repository/{anime_contributions_public_versions,group_contributors,domain_projection,member_archive,member_point_totals}_repository.go` | repository projections | request-response | their existing `memberSlugExpr` selections | exact replacement |
| corresponding repository tests for the five projections | test | source invariant / projection | existing source-fragment tests beside each repository | exact |
| `frontend/src/types/profile.ts` | model/DTO | transform | current own/public profile types and response unions | exact |
| `frontend/src/lib/api.ts` | API client | request-response | `apiClientFetch`/`authorizedFetch` profile helpers | exact |
| `frontend/src/lib/api.auth-refresh.test.ts` | test | refresh request-response | existing refresh-and-retry tests | exact |
| `frontend/proxy.ts` | middleware | request-response redirect | no local proxy/middleware analog | none; use `128-RESEARCH.md` Pattern 6 |
| `frontend/proxy.test.ts` | test | redirect matrix | no local redirect test analog; Vitest source/runtime style is available | none |
| `frontend/src/app/members/[slug]/page.tsx` | server component | SSR request-response | current full public composition | exact extension |
| `frontend/src/app/members/[slug]/not-found.tsx` | route-local 404 component | request-response state | current `OwnHiddenProfilePreview`; global `Card`/state components | partial; required by resolved D-09/D-15 architecture |
| `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.tsx` | client auth boundary | event-driven request-response | own profile page's `useAuthSession` gate + `getMemberProfile` | role-match |
| `frontend/src/app/members/[slug]/page.module.css` | component styles | transform/layout | existing route-owned page styles | exact extension |
| `frontend/src/app/members/[slug]/page.test.tsx` | test | SSR/metadata/cache | existing route cache and visibility tests | exact rewrite |
| `frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx` | test | client refresh/state | existing component test plus own-profile refresh-session test style | exact rewrite |
| `frontend/src/app/me/profile/page.tsx` | component | event-driven form/navigation | current `getPublicProfileHref` and tab state | exact extension |
| `frontend/src/app/me/profile/components/MemberProfileHero.tsx` | component | transform/navigation | current stored-slug-or-ID link | exact replacement |
| `frontend/src/app/me/profile/components/VisibilityCard.tsx` | component | event-driven form | existing semantic radio-card control | exact vocabulary update |
| `frontend/src/lib/profileLabels.ts` | utility | transform | existing visibility label map | exact update |
| `frontend/src/app/me/profile/page.test.tsx` and relevant visibility/label tests | test | event-driven UI | existing refresh-only and stored-link assertions | exact extension |
| `frontend/src/components/profile/MemberProfileHero.tsx` | component | transform/navigation | current shared public/own hero | exact replacement |
| `frontend/src/components/profile/MemberProfileHero.test.tsx` | test | component | existing hero fixture/source assertions | exact extension |

## Pattern Assignments

### Migration and guarded PostgreSQL test files

**Primary analogs:** `backend/internal/testsupport/phase117_postgres.go:14-47`, `backend/internal/testsupport/phase106_postgres.go:41-126`, `backend/internal/migrations/phase106_member_points_test.go:102-120,149-200`.

Copy the dedicated environment-variable and database/schema isolation pattern, changing every phase identifier to 128, but do not copy the skip-on-missing behavior:

```go
const phase117DSNEnv = "TEAM4S_PHASE117_TEST_DSN"

var (
    phase117DatabasePattern = regexp.MustCompile(`^team4s_phase117_test_[a-z0-9]+$`)
    phase117SchemaPattern   = regexp.MustCompile(`^phase117_[a-z0-9_]+$`)
)
```

Wave 0 first idempotently provisions exactly `team4s_phase128_test` through the Compose PostgreSQL service by checking `pg_database` before `createdb`. Phase 128 accepts `^team4s_phase128_test(?:_[a-z0-9]+)?$`, so the exact provisioned database is valid while unsafe names remain rejected. Every backend-container Phase-128 test command passes `TEAM4S_PHASE128_TEST_DSN=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase128_test?sslmode=disable` explicitly.

The shared analog skips when the environment variable is absent, but Phase 128 must strengthen that boundary: `OpenPhase128Postgres` calls `t.Fatalf` before connection when the DSN is blank. Preserve the remaining parse/runtime identity checks (`phase106_postgres.go:50-76`):

```go
dsn := os.Getenv(dsnEnv)
if strings.TrimSpace(dsn) == "" {
    t.Fatalf("%s is required for Phase-128 PostgreSQL tests", dsnEnv)
}
config, err := pgxpool.ParseConfig(dsn)
databaseName := config.ConnConfig.Database
if !databasePattern.MatchString(databaseName) {
    t.Fatalf("unsafe %s: database name %q must match %s", dsnEnv, databaseName, databasePattern)
}
// Open, SELECT current_database(), require it equals the guarded DSN database,
// then create a random phase-prefixed schema and SET search_path to only that schema.
```

Also preserve the cleanup guard (`phase106_postgres.go:99-126`): cleanup only a schema matching the Phase-128 pattern, never `public`, and never consult `DATABASE_URL`. The direct safety test must explicitly reject `team4s_v2`, `postgres`, templates, empty suffixes, uppercase, and hyphenated names, following `phase117_postgres_test.go:10-60`.

Migration tests should copy the live `up -> down -> up` proof (`phase106_member_points_test.go:113-120`):

```go
pool := testsupport.OpenPhase106Postgres(t)
testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106DownFile))
testsupport.ApplySQLFile(t, pool, phase106MigrationPath(t, phase106UpFile))
```

For the non-empty-members precondition, copy the fail-closed testing shape from `phase106_member_points_test.go:149-200`: seed the prohibited historical state, execute the migration SQL directly, require an error with actionable text, issue `ROLLBACK`, then assert the schema/data are unchanged. Do not translate `members_only` rows or synthesize slugs.

The down migration must remove trigger, function, constraints/index, then column in reverse dependency order, matching the ordering assertions at `phase106_member_points_test.go:102-110`. Migration `0144` shows current naming/comment/reversibility style; it is the chain head and must remain untouched.

### `member_public_slug.go` and all three production member-creation repositories

**Closest transform analog:** `backend/internal/repository/member_profile_repository.go:1801-1821`.

```go
func deriveMemberSlug(nickname string) string {
    lowered := strings.ToLower(strings.TrimSpace(nickname))
    return strings.Trim(memberSlugNonAlphanumeric.ReplaceAllString(lowered, "-"), "-")
}

func normalizeMemberProfileSlug(value string) string {
    normalized := norm.NFD.String(strings.ToLower(strings.TrimSpace(value)))
    // drop unicode.Mn and collapse non-[a-z0-9] runs
}
```

Do not copy these semantics unchanged: this is the duplication being replaced. Retain the existing `x/text/unicode/norm` import convention, but put the single Phase-128 normalizer in `member_public_slug.go`, apply explicit `ä/ö/ü/ß -> ae/oe/ue/ss` and `& -> und` before Unicode decomposition, collapse separators, then reject empty, numeric-only, reserved, or overlong results.

All production insert seams already own transactions and must call the same `allocatePublicMemberSlugTx(ctx, tx, nickname)` before inserting:

- `member_requests_repository.go:94-149` locks the request with `FOR UPDATE`, inserts the member, verifies the claim, and commits. Extend the insert at lines 124-130 with `public_slug`; keep allocation inside this transaction.
- `fansub_group_app_members_repository.go:675-736` accepts an existing `pgx.Tx`. Resolve the nickname first, allocate through the shared helper, then insert `nickname, public_slug, profile_visibility, ...`; do not add another transaction.
- `hist_group_members_repository.go:430-508` begins one transaction, creates the member, creates `hist_fansub_group_members`, and commits. Add allocation before the member insert at lines 440-448.

Transaction/error convention to copy (`member_requests_repository.go:100-104,146-148`):

```go
tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
if err != nil { return fmt.Errorf("... begin tx: %w", err) }
defer tx.Rollback(ctx)
// allocate + insert + dependent writes
if err := tx.Commit(ctx); err != nil { return fmt.Errorf("... commit: %w", err) }
```

The allocator itself has no exact local analog. Use `128-RESEARCH.md` Pattern 1: one transaction advisory lock for the whole `members.public_slug` namespace, query candidate availability, and rely on the unique constraint as the final invariant. A per-base lock is insufficient because literal `name-2` can race the suffix generated for `name`.

### `member_public_access_repository.go` and ID-based detail loaders

**Closest ownership:** add methods on the existing `MemberProfileRepository` (`member_profile_repository.go:43-52`) instead of constructing a new repository/store:

```go
type MemberProfileRepository struct {
    db            *pgxpool.Pool
    publicBaseURL string
}

func NewMemberProfileRepository(db *pgxpool.Pool, publicBaseURL string) *MemberProfileRepository
```

The current verified-claim predicate worth preserving is at `member_profile_repository.go:417-435`:

```sql
EXISTS (
  SELECT 1
  FROM member_claims mc
  WHERE mc.member_id = m.id
    AND mc.claim_status = 'verified'
)
```

The current resolver at `member_profile_repository.go:391-487` is the anti-pattern to replace: it derives `db_slug`, accepts numeric IDs, falls back to an O(n) normalized scan, exposes `AppUserID`, and only then loads details. Implement one minimal stored-slug query from Research Pattern 2 that returns only `member_id`, stored `public_slug`, and `is_owner_preview`; its private branch must require `member_claims.app_user_id = viewerAppUserID AND claim_status='verified'`. Do not authorize `members.user_id`, legacy user linkage, login presence, or platform-admin flags.

After access succeeds, keep the existing detail fan-out (`member_profile_repository.go:527-582`) but move it behind an ID-based method such as:

```go
GetPublicMemberProfileByID(ctx context.Context, memberID int64) (*models.PublicMemberProfile, error)
GetPublicMemberProjectsByID(ctx context.Context, memberID int64, limit, offset int) (*models.PublicMemberProjectsPage, error)
```

`GetPublicMemberProjects` currently calls the full profile loader before loading projects (`member_profile_repository.go:1297-1309`); the new ID method must not do that. Likewise:

- change `AnimeContributionsRepository.GetPublicMemberContributions` to accept a resolved member ID and retain only its timeline query (`anime_contributions_public_repository.go:315-435`); delete its nickname/numeric query at lines 297-310 and its missing-as-empty behavior;
- change `ProjectMemberPublicRepository.ResolveMemberRelation` to accept the already resolved member ID and retain its `(anime, group)` `EXISTS` query (`project_member_public_repository.go:101-121`); delete the nickname-derived lookup at lines 89-99.

### Shared handler access and neutral unavailable response

**Interface/injection analog:** `backend/internal/handlers/app_public_profile.go:17-31`.

```go
type publicMemberProfileStore interface {
    GetPublicMemberProfile(ctx context.Context, slug string) (*models.PublicMemberProfile, error)
}

type AppPublicProfileHandler struct { profileRepo publicMemberProfileStore }
func NewAppPublicProfileHandler(profileRepo publicMemberProfileStore) *AppPublicProfileHandler
```

Define a narrow shared resolver interface and inject it alongside narrow loader interfaces into profile, contributions, and project-member handlers. This also makes loader-spy tests possible; avoid concrete `*repository.AnimeContributionsRepository` and `*repository.ProjectMemberPublicRepository` fields for Phase-128 handler contracts.

Every handler must follow this order (Research Pattern 3): extract `identity.AppUserID` from the established optional-auth context, resolve access, map `ErrNotFound` to one helper, then call the ID-based loader. The current optional-auth identity read is `middleware.CommentAuthIdentityFromContext(c)` (`comment_auth.go:307-335`). Ignore `identity.IsPlatformAdmin`.

Use one helper so missing/private/numeric have the same bytes:

```go
func writePublicMemberUnavailable(c *gin.Context) {
    c.JSON(http.StatusNotFound, gin.H{
        "error": gin.H{"message": "profil nicht verfügbar"},
    })
}
```

This follows the repository's response envelope (`group_handler.go:178-184`) while removing route-specific messages such as `mitglied nicht gefunden` and `mitwirkende person nicht gefunden`.

The handler constructor/root pattern is explicit in `backend/cmd/server/main.go:111,301-302,355-357,542-557`. Construct one shared resolver (the existing `memberProfileRepo` can implement it), inject it into all three handlers, and add `authOptionalMiddleware` to contributions plus all four project-member routes. Preserve the current middleware initialization (`main.go:175-190`): Keycloak uses `CurrentUserOptionalMiddleware`; local mode uses `CommentAuthOptionalMiddlewareWithState`.

Optional-auth semantics to preserve (`current_user_auth.go:126-147`): no Authorization header continues anonymously; a supplied token is verified/resolved before an `AuthIdentity` is set. The access resolver, not claims embedded in a token, proves object ownership through `member_claims`.

### Handler loader-spy and cache-header tests

**Spy analog:** `backend/internal/handlers/member_memorial_handler_test.go:133-188`.

```go
type recordingMemberMemorialRepo struct {
    getStatusCalls   int
    setMemorialCalls int
}

func (r *recordingMemberMemorialRepo) GetMemberProfileStatus(...) (...) {
    r.getStatusCalls++
    return "active", nil
}
```

Build separate recording resolver and loader stubs. For missing, numeric, private anonymous, private non-owner, and admin non-owner, assert resolver called once and every detail loader called zero times. For public and verified private owner, assert the appropriate loader is called once. Run the same matrix across profile, projects, contributions, summary, notes, media, and releases.

Use the existing Gin harness at `app_public_profile_test.go:28-37` and header assertion style at `media_proxy_test.go:132-157`. Cache behavior should be asserted from the recorder:

```go
if got := recorder.Header().Get("Cache-Control"); got != "private, no-store" { ... }
if got := recorder.Header().Get("Vary"); got != "Authorization" { ... }
```

The runtime header analog is `release_playback_access.go:31-33` (`c.Header("Cache-Control", "private, no-store")`). Apply `Vary: Authorization` to every optional-auth member response. Owner/viewer-specific data must be `private, no-store`; do not introduce public caching in this phase.

### Stored-slug projections and outbound links

Replace the shared derived expression, do not add another formatter. The current source is `anime_contributions_public_repository.go:11-18`:

```go
const memberSlugExpr = `NULLIF(LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(TRIM(%s), '[^a-z0-9]+', '-', 'gi'))), '')`
```

Projection rule:

```sql
CASE WHEN m.profile_visibility = 'public' THEN m.public_slug ELSE NULL END AS member_slug
```

For already-public-only queries (`member_archive_repository.go:157-185`, `member_point_totals_repository.go:50-70`), select `m.public_slug` directly. For contributor/domain projections, keep nullable link semantics so private profiles are not made discoverable. Apply this to:

- `anime_contributions_public_repository.go` and `anime_contributions_public_versions_repository.go:36-54`;
- `group_contributors_repository.go:52-85`;
- `domain_projection_repository.go:99-114,168-184,243-255`;
- `member_archive_repository.go:157-185`;
- `member_point_totals_repository.go:50-70`;
- `project_member_public_repository.go:126-143`;
- the own/public DTO rows in `member_profile_repository.go`.

The five adjacent repository test files already use source-fragment assertions. Update them to require `m.public_slug` and reject `memberSlugExpr`/nickname-regex construction. A single new source-invariant test may cover all seven files if it removes repeated assertions without crossing package ownership.

Frontend links already consuming nullable stored `member_slug` are the positive analog: `FansubContributorsSection.tsx:14-15`, `FansubTeamActiveGroup.tsx:42-45`, and `ProjectMemberRows.tsx:93-103`. Keep their null/no-link behavior.

Remove numeric fallback at all three direct profile-link producers:

```tsx
// app/me/profile/page.tsx:52-54
return `/members/${profile.slug || profile.member_id}`

// app/me/profile/components/MemberProfileHero.tsx:19
const publicProfileHref = `/members/${profile.slug || profile.member_id}`

// components/profile/MemberProfileHero.tsx:33-36
const slug = 'slug' in profile ? profile.slug : ''
return `/members/${slug || profile.member_id}`
```

Make `slug` required on both own and public profile DTOs, then use only `profile.slug`. The own-profile repository currently sets `Slug` by `deriveMemberSlug` at `member_profile_repository.go:981-989`; select and map `m.public_slug` instead.

### Backend models, OpenAPI, frontend DTOs

Move the contract together:

- `backend/internal/models/member_profile.go:8-11`: replace `ProfileVisibilityMembersOnly` with `ProfileVisibilityPrivate`.
- Add required `Slug string json:"slug"` to `PublicMemberProfile` near `MemberID` (`member_profile.go:266-279`); own `MemberProfile.Slug` already exists at line 83.
- `frontend/src/types/profile.ts:1,62-100,216-265`: change visibility to `'public' | 'private'`, require `slug` on `PublicMemberProfileData`, and delete the `{visible:false}` response unions.
- `shared/contracts/openapi.yaml:516-612`: profile/projects `200` responses become data envelopes only; missing/private non-owner share the same `404` `ErrorResponse`; document optional bearer owner preview.
- `shared/contracts/openapi.yaml:10485-10487,11235-11250,11406-11457`: change enum vocabulary, delete `MemberProfileHidden`, and require `slug` in the public DTO.
- Add only the currently absent `/api/v1/members/{slug}/contributions` operation. The four project-member operations already exist at `/api/v1/anime/{animeId}/group/{groupId}/members/{memberSlug}` and its `/notes`, `/media`, and `/releases` children; update those path items in place for optional auth, neutral 404, cache semantics/headers, and their existing response envelopes without duplicating path keys or operationIds.

Do not expose `AppUserID` in the public DTO. Owner-preview state should be a server-computed access result or explicit non-sensitive response flag; the current Go-only `json:"-"` field must not remain the authorization mechanism.

### Central frontend API/refresh seam

**Canonical transport:** `frontend/src/lib/api.ts:1404-1483`.

```ts
export async function apiClientFetch(pathOrUrl: string, options = {}): Promise<Response> {
  const input = pathOrUrl.startsWith('http') ? pathOrUrl : `${getApiBaseUrl()}${...}`
  return authorizedFetch(input, options)
}
```

`authorizedFetch` performs preflight refresh, bearer attachment, one auth-related 401 refresh/retry, and network retry for idempotent requests (`api.ts:1404-1470`). Keep `cache: 'no-store'` on every member helper.

`getMemberProfile` and `getMemberProjects` already use this seam (`api.ts:3168-3217`). Remove the normal UI token parameter from `getMemberProfile`; server-only exceptional use must stay at an explicit SSR boundary rather than leaking token props into client components.

Convert these bare fetches to `apiClientFetch`/`authorizedFetch`:

- `getMemberContributions` (`api.ts:9403-9427`);
- `getProjectMemberSummary`, `getProjectMemberNotes`, `getProjectMemberMedia`, `getProjectMemberReleases` (`api.ts:10134-10191`).

Copy refresh regression assertions from `api.auth-refresh.test.ts:512-528`: stale request receives auth-related 401, refresh succeeds, current-user resolution completes, retry carries `Authorization: Bearer new-access-token`, and request retains `cache: 'no-store'`. Add this exact coverage for `getMemberProfile` and at least one shared project-member helper path; source-boundary tests should prove no bare protected `fetch` remains.

### Public member page, owner preview, states, and notice

Preserve the real public composition in `frontend/src/app/members/[slug]/page.tsx:113-180`: toolbar, `MemberProfileHero`, memberships, current projects, badge chain, and contributions. The private owner must reach this same composition with the authoritative `PublicMemberProfileData`; do not preserve the reduced grid at `OwnHiddenProfilePreview.tsx:120-138`.

The auth gate analog is the own profile page/test:

```tsx
const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
const hasAuthSession = hasAccessToken || hasRefreshToken
```

`frontend/src/app/me/profile/page.test.tsx:342-369` proves both unauthenticated no-load and refresh-only load. The server page calls Next `notFound()` for anonymous missing/private-denied/numeric/invalid results. Route-local `not-found.tsx` receives no params, so rewrite `OwnHiddenProfilePreview` to derive the segment from `usePathname()`, then use `useAuthSession()` plus token-free `getMemberProfile(slug)`, with an active/unmounted/path-change guard like its current effect (`OwnHiddenProfilePreview.tsx:72-94`). Its initial output is only `Profil wird geladen.`; an allowed owner renders the authoritative composition inside the already-404 document, while no-session/404 settles to the neutral unavailable content. Remove `getOwnProfile`, slug props, `slugifyMemberName`, numeric matching, and `toPublicProfile`.

State primitives:

```tsx
// LoadingState.tsx:8-20
<div className={`${styles.stateCard} ${styles.stateInfo}`}>
  <div className={styles.stateIcon} aria-hidden="true"><span className={styles.stateSpinner} /></div>
  <h3 className={styles.stateTitle}>{title}</h3>
  <p className={styles.stateDescription}>{description}</p>
</div>

// ErrorState.tsx:61-70
<div className={`${styles.stateCard} ${styles.stateDanger}`}>...</div>
```

Use `LoadingState` for the neutral auth/refresh gate. For the privacy-neutral 404, use a neutral `Card`/route-owned state, not the danger `ErrorState` visual. Use `ErrorState` only for non-404 transport/server failures.

The owner notice belongs directly above `MemberProfileHero`; it is a route-owned `<aside aria-label="Privater Vorschaumodus">`, not a new global banner primitive. Reuse `Button` link variants (`Button.tsx:75-100`) for `/me/profile?tab=visibility` and `/me/profile`. Update `app/me/profile/page.tsx` so the existing tab state honors `?tab=visibility`; keep `VisibilityCard`'s semantic radio-card pattern and only change its two values/copy.

Extend `page.module.css` locally. Reuse `.page`, `.profileToolbar`, `.toolbarActions`, and `.section` geometry (`page.module.css:1-46,89-102`), but delete the preview-only `.profileGrid` legacy block (`151-175,211-213`) once unused. New notice styling must be container-owned at the 36rem threshold, use `min-width:0`, and must not copy `.editProfileLink`'s prohibited `overflow-wrap:anywhere`.

Owner toolbar behavior belongs in the route composition: owner sees edit actions and no `CorrectionReportModal`; non-owner public viewer sees correction and no owner-only notice; unavailable states show neither.

### Canonical redirect and 404 route

There is no existing `frontend/proxy.ts`, middleware, `permanentRedirect`, or redirect test in this repository. Do not infer a local implementation pattern from unrelated Next routes. Follow `128-RESEARCH.md` Pattern 6:

- syntax-only normalize/decode one member path segment, trim edge whitespace, lowercase, re-encode, preserve query, and return a permanent 308;
- never consult nickname or database visibility in the proxy;
- numeric paths are not redirected and proceed to the neutral 404;
- private/missing equality must include page copy, metadata (`noindex`), actions, and absence of profile data.

Add route-local `not-found.tsx` and compose it from the existing client gate plus `Card`/`Button` state treatment and exact UI-SPEC copy. Keep the refresh-only owner gate in the client boundary so a valid refresh session shows only neutral loading until the central client decides; do not flash unavailable content. Focused page tests mock `notFound()`. Live curl must prove missing and private-anonymous HTML documents return literal 404; if the pinned Next streaming behavior returns 200, execution stops rather than deferring D-09.

## Shared Patterns

### Authentication and verified ownership

**Source:** `backend/internal/middleware/current_user_auth.go:122-147`, `comment_auth.go:307-335`
**Apply to:** all seven member endpoints.

- Optional middleware verifies supplied tokens and attaches `AuthIdentity`.
- Handler passes only `identity.AppUserID` (or zero anonymously) to the repository resolver.
- Resolver proves owner access with a verified `member_claims(member_id, app_user_id)` row.
- Admin/global roles and legacy member/user links are not owner grants.

### Error handling

**Source:** `repository.ErrNotFound`, `group_handler.go:178-193`, existing wrapped repository errors.
**Apply to:** resolver and all member handlers.

- Invalid/empty/numeric/missing/private non-owner resolve to the same not-found outcome.
- Repository errors retain operation context via `fmt.Errorf("...: %w", err)`.
- Handler logs/internal-errors unexpected failures without exposing backend details.
- Do not return hidden `200`, empty `200`, `403`, or login prompts for privacy-denied reads.

### Cache isolation

**Source:** `release_playback_access.go:31-33`, `api.ts` no-store helper calls.
**Apply to:** profile, metadata, projects, contributions, project-member summary/notes/media/releases.

- `Vary: Authorization` for optional-auth responses.
- `private, no-store` for owner/viewer-specific results.
- `cache: 'no-store'` in central frontend helpers.
- No shared cache key based only on slug.

### Source-invariant tests

**Source:** `project_member_public_repository_test.go:20-41,44-65`, `project_member_public_handler_test.go:13-29,83-94`.
**Apply to:** stored-slug projection and route/middleware coverage.

Read source relative to the test file, normalize whitespace/case, assert required fragments, and explicitly reject `memberSlugExpr`, `deriveMemberSlug`, `normalizeMemberProfileSlug`, `slugifyMemberName`, numeric URL fallback, hidden response unions, and bare protected member fetches.

## No Analog Found

| File / Seam | Role | Data Flow | Reason / Planner Direction |
|---|---|---|---|
| `frontend/proxy.ts` | middleware | redirect | No proxy/middleware/permanent redirect exists locally. Use Research Pattern 6 and pinned Next 16.1.6 APIs. |
| `frontend/proxy.test.ts` | test | redirect matrix | No redirect-test harness exists. Use the repository's Vitest mocking/source-test conventions and cover encoding/case/whitespace/query/numeric/privacy-oracle cases. |
| minimal shared public-member access resolver | repository seam | deny-first request-response | No current resolver combines stored slug, visibility, and verified claim before detail loading. Implement it as methods on the existing `MemberProfileRepository`; do not copy any current nickname-derived resolver. |

## Dirty Worktree Safety

Before editing, executors must re-run `git status --short` and preserve the current unrelated work. As mapped on 2026-08-13, dirty files include:

- modified badge artwork under `frontend/public/member-achievement-badges/`;
- staged/modified `frontend/src/components/profile/MemberBadgeChain.module.css` and `MemberBadgeChain.test.tsx`;
- modified `frontend/src/components/profile/MemberStorySection.test.tsx` and `memberBadgeLabels.ts`;
- modified `frontend/src/components/ui/FocalCarousel.tsx`, its CSS, and test;
- multiple unrelated `.planning/` recovery/debug artifacts plus `frontend/capture-responsive.cjs`.

The Phase-128 page imports or source-reads several of these files. Do not format, restore, stage, or rewrite them. In particular, Phase 128 does not need to modify `MemberBadgeChain*`, `MemberStorySection.test.tsx`, `memberBadgeLabels.ts`, or `FocalCarousel*`; keep the authoritative composition intact around them.

No untracked migration was present at mapping time. Recheck immediately before creating `0145`; stop if another untracked migration appears.

## Metadata

**Analog search scope:** `database/migrations`, `backend/internal/{migrations,testsupport,models,middleware,repository,handlers}`, `backend/cmd/server`, `frontend/src`, `frontend/proxy.ts`, `shared/contracts`

**Tracked files in scope:** 1,750

**Strong analogs read:** migration/test guard, all three production member inserts, public profile/contributions/project-member repositories and handlers, optional auth/composition root, central API refresh client, member page/preview/hero/states, DTO/OpenAPI, and adjacent tests
**Pattern extraction date:** 2026-08-13
