# Architecture Research: v1.3 Public Member Profile Hardening

**Domain:** Brownfield public member identity/profile read surface
**Researched:** 2026-08-13
**Confidence:** HIGH for current integration points and failure modes; MEDIUM for final cache TTLs and public achievement-count policy

## Executive Recommendation

Harden the existing `/members/[slug]` vertical slice rather than creating a second profile domain. Persist one immutable, indexed `members.slug`; route every public member lookup through one visibility-first read policy; and only then execute minimal, set-based projections over the existing member, historical membership, contribution, badge, point, media, and release-native tables.

The privacy gate must move in front of aggregation. Today `MemberProfileRepository.GetPublicMemberProfile` executes the full profile graph and `AppPublicProfileHandler` checks `members_only` afterwards. The code path is roughly 20 fixed SQL round trips plus one release-version query per returned project; the `/projects` endpoint calls that whole aggregate and then loads the project page again. A hidden profile therefore incurs and transiently materializes private detail before it is rejected, while a six-project visible profile can require about 26 repository round trips.

Keep the Next.js route server-rendered for public data, but stop reading access-token cookies in the page. `cookies()` is a Dynamic API in the installed Next.js 16 line and opts the route into dynamic rendering. The public SSR request should be anonymous; only a hidden-profile client boundary should retry the same public endpoint through the central authenticated API client. The same profile composition must render public and owner-preview data.

## Existing Architecture and Target Flow

### Current Flow

```text
Next /members/[slug] server page
  -> reads access-token cookie
  -> api.ts getMemberProfile(cache: no-store)
  -> GET /api/v1/members/:slug (optional auth)
  -> MemberProfileRepository.GetPublicMemberProfile(slug)
     -> derived nickname slug / numeric fallback / full-table fallback
     -> memberships, badges, progress, media, contributions, projects
     -> per-project release-version query (N+1)
  -> handler checks members_only after every detail query
  -> page composes profile components

GET /api/v1/members/:slug/projects
  -> GetPublicMemberProfile (all profile loaders)
  -> loadCurrentProjects again
```

### Recommended Flow

```text
Anonymous SSR or session-aware browser request
  -> existing api.ts public-member helper
  -> optional-auth handler
  -> PublicMemberReadService
       1. Resolve members.slug through indexed equality
       2. Decide NOT_FOUND / HIDDEN / VISIBLE_PUBLIC / VISIBLE_OWNER
       3. If visible, load only the requested public projection
       4. Reconfirm access before serialization
  -> public DTO envelope or unchanged hidden envelope
  -> one reusable PublicMemberProfileView composition

PostgreSQL sources remain canonical:
members + verified member_claims
  -> public hist_fansub_group_members
  -> confirmed/public anime_contributions + roles
  -> member_badges + member_point_totals + canonical lifecycle aggregates
  -> public/published release_version_notes
  -> public/approved/ready release_version_media -> media_assets -> media_files
  -> anime -> episodes -> fansub_releases -> release_versions -> release_version_groups
```

The service is a narrowly justified new seam. It centralizes read policy now duplicated or absent across profile, projects, and contributions handlers; it does not introduce a new entity, permission system, or persistence model.

## Modified vs New Components

| Status | Component / path | Responsibility after hardening |
|---|---|---|
| **New schema seam** | New migration after the current chain | Add persisted `members.slug`, case-insensitive uniqueness, non-empty validation, and index. Reset/reseed disposable rows rather than preserving nickname aliases. |
| **New focused helper** | `backend/internal/repository/member_slug.go` | Normalize candidate slugs and allocate collision-safe persisted values. The DB unique constraint remains the race authority; nickname edits do not rewrite slugs. |
| **Modify** | `member_requests_repository.go`, `fansub_group_app_members_repository.go`, `hist_group_members_repository.go` | Supply stable slugs for every member creation path. |
| **Modify** | `anime_contributions_public_repository.go`, `domain_projection_repository.go`, `group_contributors_repository.go`, `member_archive_repository.go`, `member_point_totals_repository.go`, `project_member_public_repository.go` | Replace `memberSlugExpr`/nickname-derived links with `members.slug`; remove numeric and full-scan fallbacks. |
| **New policy seam** | `backend/internal/services/public_member_read_service.go` | Own access decisions and orchestrate requested public projections. Accept viewer app-user identity from optional auth; never frontend-derived roles. |
| **Modify/split** | `backend/internal/repository/member_profile_repository.go` | Keep own-profile paths; move public reads into focused files in the same repository/package. Eliminate the 1,931-line mixed seam and project N+1. |
| **New file, same model** | `backend/internal/models/public_member_profile.go` | Hold minimal public-only DTOs. Do not reuse own-profile membership/background DTOs that advertise private fields. |
| **Modify** | `backend/internal/handlers/app_public_profile.go` | Map service outcomes to 404, hidden 200, or data 200. No late visibility check against a fully loaded DTO. |
| **Modify** | `backend/internal/handlers/contributions_public_handler.go` | Use the same access resolver for `/members/:slug/contributions`, which currently lacks a profile-visibility gate. |
| **Modify** | `backend/cmd/server/main.go` | Wire one public-member read service into member profile/projects/contributions handlers. |
| **Modify** | `shared/contracts/openapi.yaml` | Define explicit public DTOs and actual fields (`is_verified`, `noindex`, stable `slug`); remove unused arrays and private membership properties. |
| **Modify** | `frontend/src/types/profile.ts`, `frontend/src/lib/api.ts` | Mirror OpenAPI and preserve the central auth/refresh boundary for anonymous SSR plus session-aware browser calls. |
| **New composition seam** | `frontend/src/components/profile/PublicMemberProfileView.tsx` | Pure hero/story/membership/project/award/contribution composition shared by SSR and owner preview. |
| **Modify** | `frontend/src/app/members/[slug]/page.tsx` | Anonymous SSR data/state owner only; no cookie reads and no duplicated layout. |
| **Modify/remove duplication** | `OwnHiddenProfilePreview.tsx`, `OwnProfileEditLink.tsx` | Retry `getMemberProfile(slug)` through central refresh, remove local slugification and own-to-public conversion, and consolidate redundant ownership calls. |
| **Modify/split** | `MemberBadgeChain.tsx` and `.module.css` | Split the 928-line component and 2,282-line stylesheet into bounded family/stage components; retain existing `FocalCarousel` and UI primitives. |
| **Modify** | Profile page/component CSS modules | Page owns viewport composition; reusable cards/stages own container queries. |
| **New test fixture seam** | Project-owned v1.3 UAT fixture command/SQL | Idempotently create `sheppert` and `csubs-leader`; never put fixture behavior in runtime repositories. |

## Identity and Privacy Boundaries

### Stable Slug Contract

Use `members.slug` as the only public member route key.

- Persist it once and keep it stable when nickname/display name changes.
- Enforce non-empty, normalized, case-insensitive uniqueness in PostgreSQL.
- Allocate collisions centrally (for example `name`, `name-2`, `name-3`) and retry on unique conflict.
- Return `slug` in every public link projection: profile, archive, ranking, anime contributors, group/domain projections, project-member summary.
- Delete numeric-ID lookup and `findPublicMemberProfileByNormalizedSlug` after reset/reseed. Compatibility is out of scope.
- Direct test inserts must supply slugs or use one fixture factory; do not weaken the production constraint for tests.

### Visibility-First Access Decision

The minimal resolver may read only `members.id`, `members.slug`, `profile_visibility`, `noindex`, and the verified owner `app_user_id` through the canonical claim/legacy bridge.

| Target | Anonymous/other viewer | Verified owner |
|---|---|---|
| Missing slug | 404 | 404 |
| `public` | public projection | same public projection |
| `members_only` | `{visible:false, reason:"members_only"}` | same public projection as owner preview |

`app_user_id` remains internal. The service returns a typed decision, not `(nil, nil)` ambiguity. All member subroutes use it, including projects and contributions.

To fail closed during concurrent visibility changes, perform a final lightweight visibility check before serialization, or use an explicitly lock-consistent read transaction. Hidden/missing decisions must never call detail loaders. Each collection still applies its own public predicates; profile visibility is not a substitute for row-level visibility.

### Public Join Rules

- **Memberships:** start from `hist_fansub_group_members` with public visibility and agreed publishable statuses. Do not expose membership merely because permission-bearing `fansub_group_members` exists; never serialize `app_member_status` or `app_member_roles` publicly.
- **Projects:** keep `anime_contributions` as the member/group/anime fact. Require `status='confirmed'` and `is_public_on_member_profile=true`.
- **Release context:** preserve `anime -> episodes -> fansub_releases -> release_versions -> release_version_groups.fansub_group_id`. Never attach release media to episodes or substitute `release_media` for `release_version_media`.
- **Latest text:** require public, published, non-deleted `release_version_notes`.
- **Latest media:** require non-deleted `release_version_media`, ready assets/files, public visibility, approved review, and a real `release_version_id`.
- **Badges:** persisted badges remain active/public; live role/contribution projections remain read-only. Exact progress derived from non-public facts needs explicit public policy and should otherwise be omitted.

## Projection and Query Strategy

### Minimal Response Shape

Return only what the initial page renders:

- stable slug, public identity/bio/story/activity/status, `noindex`, `is_verified`
- public avatar/background display URLs
- public membership cards
- final public earned-badge presentation inputs and total points
- first project page plus total/continuation metadata
- newest three public contribution summaries
- previous-contribution count, not collapsed rows

Remove from the public core DTO unless a live consumer is proven:

- `recent_media` and `recent_contributions` (the page uses `latest_contributions`)
- `PublicMemberCurrentProject.release_versions` (the card does not render it; it causes N+1)
- constant `contribution_status` and unused current-project periods
- `latest_contributions.body_html` and full `image_url` when only preview text/thumbnail renders
- own-profile membership fields and background source-original metadata

Do not remove fields from the own-profile DTO merely because public UI does not use them. Backend, OpenAPI, frontend types, and helper tests move together.

### Bounded Query Plan

Prefer a small number of set-based queries over one Cartesian mega-query:

1. Indexed slug/access resolver.
2. Core identity/media projection.
3. Public memberships.
4. Achievement projection: persisted badges, totals, volumes, and counters without repeating counts.
5. Current projects page with matching total.
6. Latest contribution union ordered then limited.
7. Optional history page only when expanded.

The query count must be O(1) with respect to project count. If release versions later prove necessary, batch all page keys in one query and group rows in Go.

`GetPublicMemberProjects` resolves/gates and loads only projects; it must not call `GetPublicMemberProfile`. Prefer keyset pagination on `(last_updated_at, anime_id, fansub_group_id)` with `limit+1`. If offset remains, define stable ordering and total semantics and test mutation between pages. Load previous history by cursor on expansion, potentially by extending the existing member-contributions seam rather than inventing a third history model.

Candidate indexes follow verified predicates: unique lower-cased slug; public membership by member/group visibility/status; public current/previous contributions by member/public/status/end-year/anime/group; public notes; and public media ownership/status. Confirm with `EXPLAIN (ANALYZE, BUFFERS)` on both fixtures before adding indexes.

## Server/Client Rendering and Cache Boundaries

### Rendering

- `page.tsx` performs an anonymous public read and renders `PublicMemberProfileView` on the server.
- `generateMetadata` reuses the request-local read and defaults hidden/not-found/error to noindex.
- The page does not call `cookies()`.
- On a hidden response, a client boundary waits for `useAuthSession`, treats access **or refresh** token as active, and calls session-aware `getMemberProfile(slug)`. The central client refreshes as needed.
- Owner preview renders the same public DTO/view; do not convert `MemberProfileData` with zero/empty fallbacks.
- Project pagination, story/history expansion, and carousel state remain local to owning components; no global profile store.

### Caching

Privacy dominates hit rate.

- Use React request memoization for metadata/page dedupe.
- Session-aware and owner-preview requests are `private, no-store` and vary by authorization/session.
- Do not shared-cache the complete profile until every visibility-changing source has synchronous invalidation. Stale visibility is disclosure, not normal staleness.
- A later backend cache may store post-gate projections only if the uncached gate runs first and member, membership, contribution, note, media, badge, and point writes invalidate the member key.
- Image derivatives remain independently cacheable. Continue `ResponsiveImage`/Next optimization, truthful `sizes`, reserved geometry, eager hero/avatar only, lazy project/group/badge art, and animated-GIF fallback.

Next.js 16 documents `cookies()` as dynamic and server `fetch` caching as opt-in. Do not add `force-cache` merely to make this route static without privacy-safe invalidation.

## Frontend Composition and Responsive Boundaries

```text
MemberProfilePage (server state: visible/hidden/not-found/error)
  -> PublicMemberProfileView
       -> MemberProfileHero
       -> MemberStorySection + MembershipsSection
       -> MemberCurrentProjectsSection
       -> MemberAchievementsSection
            -> focused badge family/stage components
            -> existing FocalCarousel
       -> LatestContributionsSection
       -> PreviousContributionsSection (load on expansion)
  -> PublicProfileViewerActions (single client ownership/session lookup)
```

The composition owns no fetching/auth. The page owns initial server state; client boundaries own session upgrade/actions. Domain components keep consuming shared UI primitives; `src/components/ui` must not learn member permissions or routes.

Replace render-time state synchronization in `MemberCurrentProjectsSection` with state keyed by canonical slug and an effect/reducer. Dedupe appended pages by `(anime_id,fansub_group_id)`, ignore stale requests, and scope load/errors locally.

CSS ownership:

- `page.module.css`: page width, toolbar, rhythm, viewport-based page composition.
- Reusable profile cards/stages: `container-type:inline-size`, minimum viable geometry, container queries.
- Reduce shared `profile.module.css` as touched; badge family styles live beside extracted components.
- Preserve reduced motion, keyboard/focus behavior, `min-width:0`, and constrained media. Fix overflow at its owner instead of global `overflow-wrap:anywhere`.

Verification covers narrow, intermediate, transition below/above, wide, nested container, high zoom, long German labels, correct umlauts, and no document-level horizontal overflow.

## Testing and Verification Seams

| Boundary | Required evidence |
|---|---|
| Migration/slug | Up/down; non-empty/case-insensitive uniqueness; collision retry; rename stability; every creation path supplies slug. |
| Access policy | Anonymous public/hidden, other-user hidden, owner preview, missing slug, disabled identity; hidden proves zero detail-loader calls. |
| Cross-route privacy | Same matrix for profile, projects, contributions; no permission fields or internal media/note rows in payload/counts. |
| Repository joins | PostgreSQL integration tests against canonical release/version/group/media ownership and public predicates. Prefer real queries over source-string tests. |
| Query budget | Fixture with >6 projects; fixed upper bound and no per-project growth; `/projects` proves it does not load badges/story/media/history. |
| Contract | Validate OpenAPI; backend JSON and frontend DTO/helper fixtures agree; removed fields are absent. |
| Auth client | Missing/expired access + valid refresh: owner preview/action proceeds via central refresh without logged-out UI. |
| SSR states | Public, hidden, owner-upgraded, 404, 500; metadata noindex; request dedupe. |
| Components | Pure composition, pagination race/dedupe, story overflow, carousel keyboard/focus/reduced motion, heading hierarchy. |
| Responsive/live | Boundary widths, zoom, no overflow, image delivery, and user-visible navigation in shared browser. |
| Fixtures | `sheppert` and `csubs-leader`: sparse/high-volume badges/projects, long story, memberships, approved media, overflow, public/hidden/owner states. |

Keep and extend `frontend/scripts/verify-profile-image-delivery.mjs`; it already verifies URL classes, WebP dimensions, alpha, repeat-request cache evidence, and exactly-once original fallback. The fixture command must be idempotent and run through existing Compose/test tooling.

## Dependency-Aware Build Order

1. **Lock privacy and contract decisions** — stable slug, hidden envelope, membership source, achievement-count policy, minimal DTOs; add failing contract/access tests.
2. **Establish stable identity** — migration, allocator, all creation/link/query consumers, reset/reseed; gate on fresh chain, down/up, uniqueness/immutability.
3. **Move gate ahead of detail** — shared read service across every member subroute; gate on visibility matrix and zero hidden detail calls.
4. **Correct/minimize projections** — public DTO split, joins, unused/private fields removed; gate on integration fixtures and contract parity.
5. **Set-based queries/pagination** — remove N+1/full-profile projects call, aggregate counters once, lazy history, EXPLAIN-backed indexes; gate on query/payload budget.
6. **SSR/auth/composition** — extend helper, remove cookie read, same endpoint/view for owner preview; gate on refresh regression, SSR states, no-token boundary, typecheck.
7. **Responsive component refactor** — split badge/CSS, container boundaries, preserve UI primitives; gate on focused a11y/responsive evidence.
8. **Live UAT/performance sign-off** — seed both profiles; anonymous/owner shared-browser flows; capture query budget, payload, image delivery, overflow and states.

This order prevents frontend work from targeting a drifting DTO and performance work from cementing the late privacy gate.

## Anti-Patterns to Reject

- **Late visibility:** loading full aggregate then hiding in handler. Resolve access first, project second, final fail-closed check.
- **Derived slugs:** regex SQL, numeric fallback, client slugify, full scans. Use one persisted indexed slug.
- **Own DTO as preview:** `/me/profile` conversion with empty badges. Use the same public projection and composition.
- **Nested request fan-out:** one release query per project. Remove unused nesting or batch all keys.
- **Unowned shared cache:** TTL-only caching of visibility-sensitive DTOs. Require an invalidation matrix.
- **UI domain leakage:** member policy/API/threshold logic in `src/components/ui`. Keep primitives generic and composition domain-owned.

## Scalability Considerations

| Concern | Milestone target | Later trigger |
|---|---|---|
| Lookup | Indexed stable slug | No search service for exact routes. |
| Aggregate reads | Fixed small query budget | Materialized read model only after measured pressure and invalidation design. |
| Pagination | Stable cursor or explicit offset semantics | Cursor every unbounded collection as data grows. |
| Caching | Request dedupe + image cache | Shared DTO cache only with synchronous invalidation. |
| Images | Existing optimizer, correct variants/sizes | More generated variants only if metrics justify. |
| Hydration | Server composition, client interaction islands | Lazy-load badge interaction if bundle profiling identifies it. |

## Sources

### Live repository evidence (HIGH confidence)

- `.planning/PROJECT.md`; `AGENTS.md`; domain, implementation, API, auth, and UI docs required by the task.
- `backend/internal/handlers/app_public_profile.go` — optional auth and late visibility check.
- `backend/internal/repository/member_profile_repository.go` — derived/fallback slug, sequential aggregate, N+1, and full-profile pagination reuse.
- `anime_contributions_public_repository.go` + `contributions_public_handler.go` — separate nickname lookup and missing profile gate.
- `backend/internal/models/member_profile.go`, `shared/contracts/openapi.yaml`, `frontend/src/types/profile.ts` — public/own DTO overlap and drift (`is_verified`/`noindex` runtime/frontend fields absent from public OpenAPI schema).
- `frontend/src/app/members/[slug]/page.tsx`, `OwnHiddenProfilePreview.tsx`, `OwnProfileEditLink.tsx` — cookie-driven SSR, partial conversion, alternate layout, repeated ownership reads.
- `MemberCurrentProjectsSection.tsx`, `MemberBadgeChain.tsx` and CSS — local pagination state and over-limit files.
- `ResponsiveImage.tsx`, `next.config.mjs`, `verify-profile-image-delivery.mjs` — existing optimization/fallback/verifier.
- Live anonymous API sample 2026-08-13: `sheppert` 9,046 bytes; `csubs-leader` 17,099 bytes. Both include unused `recent_media`/`recent_contributions`; `csubs-leader` returns 46 badge rows and six first-page projects.

### Official framework documentation (HIGH confidence)

- [Next.js `cookies`](https://nextjs.org/docs/app/api-reference/functions/cookies) — dynamic rendering behavior.
- [Next.js server `fetch`](https://nextjs.org/docs/app/api-reference/functions/fetch) — explicit persistent cache/revalidation options.
- [Next.js Image](https://nextjs.org/docs/app/api-reference/components/image) — responsive `sizes`/`srcset`, optimization, fallback.

## Open Decisions / Research Flags

- Decide whether exact badge progress derived from otherwise non-public facts is intentionally public; omit until explicit.
- Decide whether `/members/:slug/contributions` becomes lazy history or gets a profile filter/cursor; do not create an overlapping third model.
- Verify indexes with `EXPLAIN (ANALYZE, BUFFERS)` on both fixtures.
- Shared full-projection caching requires phase-specific invalidation research.

---
*Architecture research for Team4s v1.3 Public Member Profile Hardening.*
