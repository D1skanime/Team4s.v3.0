# Phase 128: Canonical Public Identity & Visibility Foundation - Research

**Researched:** 2026-08-13
**Domain:** Immutable public member identity, privacy-safe object authorization, canonical routing, and cache isolation
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Canonical slug lifecycle
- **D-01:** The canonical public slug is generated once from the member nickname when the member is created, stored in PostgreSQL, and never changes when the nickname changes.
- **D-02:** Slug collisions use readable, transaktionssicher allocated numeric suffixes: the first member receives `name`, followed by `name-2`, `name-3`, and so on.
- **D-03:** German characters are transliterated into readable ASCII (`ä/ö/ü` to `ae/oe/ue`, `ß` to `ss`); the agreed example is `Müller & Söhne` to `mueller-und-soehne`. Other accents and separators follow one deterministic shared normalizer.
- **D-04:** An empty, unusable, or reserved slug result blocks member creation with a clear validation error. The system must not silently assign a technical, random, numeric, or member-ID fallback.
- **D-05:** Every internal public-profile link reads the stored slug. No component, DTO mapper, repository, or route may regenerate a public identity from the current nickname.

### Visibility and privacy
- **D-06:** The only profile visibility values are `public` and `private`. The misleading `members_only` value is not retained as an internal alias or third access level.
- **D-07:** A private profile is visible only to its verified owner. Login alone, having another verified member profile, or holding an admin role does not grant access through the public route.
- **D-08:** Visibility and verified ownership are resolved before any protected profile detail loader runs. Hidden requests must not load badges, memberships, projects, contributions, media, points, story, or other detail collections.
- **D-09:** Anonymous visitors and authenticated non-owners receive the same neutral HTTP 404 page and response for a private profile as for a missing profile. The public route must not confirm that a private profile exists.
- **D-10:** Profile, projects, contributions, media, metadata, and every retained member subresource use the same central access decision. A subresource must not independently resolve nickname slugs or return an empty HTTP 200 for a missing/private member.
- **D-11:** Administrative inspection does not bypass privacy on the public member route. Any future admin-only inspection belongs to a separate protected admin surface.
- **D-12:** Owner- or viewer-specific results are private and must never enter a shared public cache.

### Verified owner preview
- **D-13:** The verified owner opens a private profile at the same canonical `/members/{slug}` URL and sees the complete real public-profile presentation, not a reduced reconstruction or redirect to the editor.
- **D-14:** A persistent notice immediately above the profile header states that the profile is private and visible only to the owner. It provides clear links to edit the profile and its visibility.
- **D-15:** The route resolves the existing auth/refresh session before deciding the result. With a valid refresh token and no access token, the central auth/API seam refreshes and renders the preview without briefly flashing the neutral 404 state; at most a neutral profile-loading state may appear.
- **D-16:** The preview is read-only. Editing continues in the existing profile editor, and the owner must not be offered a correction report against their own profile.
- **D-17:** The owner preview consumes the authoritative public-profile DTO and access result. The current client-side `OwnHiddenProfilePreview` conversion, nickname slugification, numeric fallback, and duplicate own-profile lookup are not authoritative behavior to preserve.

### Canonical URL behavior
- **D-18:** A request that is technically equivalent to the canonical slug but differs in case, surrounding/encoded whitespace, or equivalent URL encoding is permanently redirected server-side to the single canonical URL.
- **D-19:** A nickname change does not create a new alias. A URL guessed from the new nickname returns the same neutral 404 as any missing profile, while internal links continue to use the original stored slug.
- **D-20:** Numeric member URLs such as `/members/123` always return the neutral 404 and never redirect to or resolve a member.
- **D-21:** Existing disposable test rows receive their canonical starting state through reset/reseed. Do not create slug-history, alias, legacy redirect, compatibility, or old-row preservation mechanisms.

### the agent's Discretion
- Exact schema column/constraint names, allocator placement, transaction/locking strategy, and the complete reserved-word set, provided the user-visible rules above and the existing repository boundaries are preserved.
- Exact permanent redirect status (`301` or `308`) and neutral error envelope wording, provided canonicalization is safe and private/missing outcomes remain indistinguishable.
- Internal shape of the shared access-result type and handler middleware/helper seam, provided it resolves only minimal identity/visibility/ownership facts before detail loading.
- Focused test organization and temporary reuse boundaries needed to deliver Phase 128 without prematurely performing the Phase 129-133 refactors.

### Deferred Ideas (OUT OF SCOPE)
- The pending todo `2026-06-03-member-profil-ui-und-params-bug.md` was reviewed but not folded wholesale into Phase 128. Canonical route behavior touches the route boundary now; its full Next route/API type alignment belongs to Phase 130, while badge/timeline/media visual polish belongs to Phase 133.
- Complete public projection correctness, data deduplication, totals, and joins remain Phase 129.
- Final DTO minimization and full cross-layer response union cleanup remain Phase 130.
- Query-count, payload, pagination, and measurement work remain Phase 131.
- Shared SSR composition and broader race-safe frontend consolidation remain Phase 132 after Phase 128 establishes correct owner access semantics.
- Responsive CSS, accessibility, and image delivery remain Phase 133.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PMID-01 | Jedes öffentliche Memberprofil besitzt einen eindeutigen, in PostgreSQL gespeicherten Slug. | New `members.public_slug` constraints, immutable trigger, shared allocator, and creation-path inventory. [VERIFIED: `.planning/REQUIREMENTS.md`, codebase grep] |
| PMID-02 | Eine Änderung des Nicknames verändert den öffentlichen Slug nicht. | Slug is absent from profile update SQL and protected by a DB update trigger. [VERIFIED: `backend/internal/repository/member_profile_repository.go`; proposed trigger is a recommendation] |
| PMID-03 | Profilverlinkungen verwenden ausschließlich den kanonischen Slug; numerische und dynamisch erzeugte Fallbacks entfallen. | Complete `memberSlugExpr`, `deriveMemberSlug`, and `/members/` consumer inventory identifies every replacement site. [VERIFIED: codebase grep] |
| PMPR-01 | Anonyme Zugriffe können ein verborgenes Profil nicht von einem nicht vorhandenen Profil unterscheiden. | One resolver returns `ErrNotFound` for both and handlers use one neutral 404 writer. [VERIFIED: current handlers differ; recommended design] |
| PMPR-02 | Sichtbarkeit und verifizierter Owner-Zugriff werden geprüft, bevor Profildetails geladen werden. | Minimal resolver query precedes ID-based profile/detail loaders; spy tests prove zero loader calls on denial. [VERIFIED: current load order is reversed in `member_profile_repository.go`; recommended design] |
| PMPR-03 | Profil, Projekte, Contributions, Medien und weitere Member-Unterressourcen verwenden dieselbe zentrale Zugriffsregel. | Route inventory covers profile, projects, contributions, and four project-member detail routes. [VERIFIED: `backend/cmd/server/main.go`] |
| PMPR-04 | Der Owner kann ein verborgenes Profil über die zentrale Auth-Refresh-Seam als Vorschau öffnen. | Browser preview calls `getMemberProfile` through `authorizedFetch`; it no longer calls `getOwnProfile` or constructs a substitute DTO. [VERIFIED: `docs/frontend/auth-api-client.md`; recommended replacement] |
| PMPR-05 | Owner- und viewer-spezifische Antworten werden nicht öffentlich gecacht. | `private, no-store`, `Vary: Authorization`, dynamic/no-store frontend fetches, and cache-header tests. [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching] |
</phase_requirements>

## Summary

The phase should be planned as one identity write seam plus one access read seam. Add a required `members.public_slug`, generate it exactly once in a shared repository helper used by all three production member-creation paths, enforce global uniqueness and immutability in PostgreSQL, and replace every nickname-derived outbound slug with the stored value. The current code derives member identity in at least seven repositories, accepts numeric IDs in two inbound resolvers, and derives the own-profile slug again in Go and React. [VERIFIED: `member_requests_repository.go`, `fansub_group_app_members_repository.go`, `hist_group_members_repository.go`, `anime_contributions_public_repository.go`, `member_profile_repository.go`, codebase grep]

The access seam must resolve only `member_id`, canonical slug, visibility, and verified ownership, and must return the same not-found result for a missing member and a private non-owner. Only an allowed result may be passed to ID-based profile, projects, contributions, notes, media, or releases loaders. The current main profile loader performs all detail fan-out before the handler checks visibility; the projects loader calls that full profile loader; the contributions and project-member repositories independently resolve nickname-derived slugs. [VERIFIED: `backend/internal/repository/member_profile_repository.go`, `anime_contributions_public_repository.go`, `project_member_public_repository.go`]

The frontend keeps anonymous/public SSR and makes the server page call Next `notFound()` for missing, privacy-denied, numeric, and invalid results before protected content is emitted. The route-local `not-found.tsx` initially renders only `Profil wird geladen.` and uses a client access boundary deriving the slug from `usePathname()`; an active access-or-refresh session calls token-free `getMemberProfile(slug)` through the central client. A verified private owner upgrades inside that already-404 document to the same authoritative public DTO/composition plus the persistent notice, while anonymous/non-owner/missing outcomes settle to identical neutral unavailable content. All owner/viewer-specific responses are non-store/private, and both API outcomes and denied HTML documents must carry literal HTTP 404. No second server refresh/BFF seam is introduced. [VERIFIED: `docs/frontend/auth-api-client.md`, `128-CONTEXT.md`; resolved plan architecture]

**Primary recommendation:** Use a globally serialized repository allocator for `members.public_slug`, then make one injected `ResolvePublicMemberAccess` decision the mandatory first call for every member-specific public handler. [CITED: https://www.postgresql.org/docs/current/functions-admin.html] [VERIFIED: `backend/cmd/server/main.go` composition pattern]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Slug normalization/allocation | API / Backend | Database / Storage | Go owns the one readable normalization policy; PostgreSQL owns serialization, uniqueness, format, and immutability. [VERIFIED: existing repository-owned writes; cited PostgreSQL locking/constraint docs] |
| Canonical identity persistence | Database / Storage | API / Backend | `members` is the canonical member identity owner and all creation repositories already write it. [VERIFIED: schema and three repository inserts] |
| Visibility/owner decision | API / Backend | Database / Storage | The backend must check the requested object against a verified `member_claims` owner before any detail loader. [VERIFIED: project auth/domain rules; CITED: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/] |
| Public/owner profile projection | API / Backend | Frontend Server (SSR) | Backend returns the authoritative public DTO only after access; SSR renders anonymous/public data. [VERIFIED: current handler/page architecture] |
| Refresh-only private preview | Browser / Client | API / Backend | The browser central client owns refresh coordination and bearer attachment. [VERIFIED: `docs/frontend/auth-api-client.md`, `frontend/src/lib/api.ts`] |
| Canonical browser URL | Frontend Server (SSR / Proxy) | API / Backend | Next.js can issue a permanent 308 before/while rendering; the access result supplies the stored slug once access is allowed. [CITED: https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/03-api-reference/04-functions/permanentRedirect.mdx] |
| Cache classification | API / Backend | Frontend Server | API headers prevent shared storage and Next request-specific/no-store rendering prevents full-route/data caching. [CITED: https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/02-guides/caching.mdx] |

## Project Constraints (from AGENTS.md)

- All repository work, Git, builds, tests, migrations, and Compose commands run in `/home/d1sk/team4s` on `team4s-linux`; the Windows checkout is reference-only. [VERIFIED: `AGENTS.md`]
- Use Docker Compose services; do not install the application stack directly on Ubuntu, start Windows Docker/WSL, or overwrite `.env`, `media/`, volumes, or database contents during ordinary work. [VERIFIED: `AGENTS.md`]
- Before edits inspect `git status --short` and `docker compose ps`; preserve the existing dirty frontend/badge work and unrelated recovery artifacts. [VERIFIED: `AGENTS.md`, `.planning/STATE.md`, live inspection]
- This is planning-only research; implementation must inspect existing code first, keep changes scoped, fix relevant failures, review its diff, and stop for unclear persisted ownership, destructive schema work, security-sensitive decisions, missing services/credentials, or domain ambiguity. [VERIFIED: `AGENTS.md`]
- Extend existing repositories, handlers, helpers, DTOs, and components; do not duplicate auth, request parsing, response mapping, member lookup, media ownership, or UI controls. [VERIFIED: `AGENTS.md`, `docs/engineering/implementation-contract.md`]
- Keep `shared/contracts/openapi.yaml`, backend behavior, frontend types, and `frontend/src/lib/api.ts` aligned for every changed endpoint/status/auth branch. [VERIFIED: `AGENTS.md`, `docs/api/api-contracts.md`]
- Protected browser work must treat `hasAccessToken || hasRefreshToken` as an active session and must let the central client refresh; components may not read cookies/tokens, construct bearer headers, or call Keycloak refresh directly. [VERIFIED: `AGENTS.md`, `docs/frontend/auth-api-client.md`]
- Existing rows are disposable: add a new reversible migration, reset/reseed rather than backfill/preserve/alias, never edit old migrations, check for untracked migrations, and test up/down where feasible. [VERIFIED: `AGENTS.md`, `128-CONTEXT.md`]
- Preserve canonical member/fansub/release/media ownership; no release media or domain-table change belongs in this phase. [VERIFIED: `AGENTS.md`, `docs/architecture/db-schema-fansub-domain.md`]
- User-facing German strings use real umlauts; keep the existing UI system, semantic controls, scoped states, and no unrelated redesign. [VERIFIED: `AGENTS.md`]
- Validate with focused tests, typecheck, lint, feasible build, migration up/down, and `git diff --check`; report unavailable checks and unrelated failures separately. [VERIFIED: `AGENTS.md`]
- Do not modify or delete tracked badge assets, especially `frontend/public/history-event-badges-transparent/`. [VERIFIED: `AGENTS.md`]

## Standard Stack

### Core

| Library / Runtime | Version | Purpose | Why Standard |
|-------------------|---------|---------|--------------|
| PostgreSQL | 16.14 runtime | Canonical slug constraints, advisory transaction lock, visibility/access query | Existing canonical datastore; unique constraints create a supporting unique B-tree index. [VERIFIED: Compose runtime] [CITED: https://www.postgresql.org/docs/current/ddl-constraints.html] |
| Go | 1.25.12 runtime | Shared normalizer, allocator, access resolver, handlers | Existing backend runtime; no new service/framework is justified. [VERIFIED: backend container and `backend/go.mod`] |
| pgx/v5 | 5.7.1 | Transactions, parameterized queries, PostgreSQL error handling | Existing repository transport and transaction boundary. [VERIFIED: `backend/go.mod`] |
| Gin | 1.10.0 | Optional-auth route middleware and neutral HTTP responses | Existing HTTP framework and composition root. [VERIFIED: `backend/go.mod`, `backend/cmd/server/main.go`] |
| golang.org/x/text | 0.35.0 | Unicode normalization after explicit German transliteration | Already used by the current member slug normalizer; no dependency addition. [VERIFIED: `backend/go.mod`, `member_profile_repository.go`] |
| Next.js | 16.1.6 | App Router SSR, Proxy canonicalization, permanent redirect | Repository-pinned version supports `proxy.ts` and `permanentRedirect` (308 outside Server Actions). [VERIFIED: `frontend/package.json`] [CITED: https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/01-getting-started/16-proxy.mdx] |
| React | 18.3.1 | Existing page/component composition | Repository-pinned; no upgrade belongs in this phase. [VERIFIED: `frontend/package.json`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | ^5.7.2 | Required stored `slug`, `public/private` visibility, response branches | Update cross-layer profile/link contracts. [VERIFIED: `frontend/package.json`] |
| Vitest | ^3.2.4 | Route, central-refresh, link, and preview tests | Existing frontend unit/integration harness. [VERIFIED: `frontend/package.json`] |
| testify | 1.9.0 | Backend assertions | Existing Go test helper. [VERIFIED: `backend/go.mod`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Global transaction-level advisory allocator lock | Unique-violation retry loop | Retries are valid, but every caller must preserve its surrounding transaction and distinguish transient from persistent `23505`; a single low-frequency namespace lock is simpler for member creation. [CITED: https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html] |
| Stored `public_slug` | Derived nickname slug | Derived identity changes on nickname edits, collides silently, and has already diverged between SQL, Go, and React. [VERIFIED: current code inventory] |
| Central access resolver | Per-handler visibility checks | Per-handler checks currently miss contributions/project-member routes and run after protected loads. [VERIFIED: handler/repository inventory] |

**Installation:** None. Do not add or upgrade packages in Phase 128. [VERIFIED: `.planning/ROADMAP.md` forbids additions without repository evidence]

## Architecture Patterns

### System Architecture Diagram

```text
Browser request /members/{raw-slug}
        |
        +--> Next proxy/page canonicalizes URL syntax (case/encoding/edge whitespace)
        |       | numeric or unusable -> neutral 404 path
        |       ` equivalent form -> 308 /members/{canonical-form}
        |
        +--> anonymous/public SSR request OR central browser auth client
                |
                v
        Gin optional-auth middleware
                |
                v
        ResolvePublicMemberAccess(requested slug, viewer app_user_id)
          SELECT only member_id + public_slug + private-owner flag
                |
          +-----+------------------------------+
          | missing/private non-owner          | public OR verified private owner
          v                                    v
    identical neutral 404             ID-based detail repository
    no detail loader call              (profile/projects/contributions/
                                        notes/media/releases)
                                                |
                                                v
                              authoritative public DTO + access context
                                                |
                              +-----------------+------------------+
                              | public                             | owner preview
                              v                                    v
                       existing profile UI               same DTO/presentation +
                                                        private notice; no correction;
                                                        Cache-Control private,no-store
```

The diagram reflects the required data-flow order; it does not prescribe a new service layer. [VERIFIED: `128-CONTEXT.md`; recommended seam fits existing composition root]

### Recommended Project Structure

```text
database/migrations/
├── 0145_member_public_identity_visibility.up.sql
└── 0145_member_public_identity_visibility.down.sql
backend/internal/repository/
├── member_public_slug.go              # normalize + allocate within caller transaction
├── member_public_access_repository.go # methods on existing MemberProfileRepository
├── member_profile_repository.go       # ID-based detail projection; stored slug in own/public DTO
├── anime_contributions_public_repository.go
└── project_member_public_repository.go
backend/internal/handlers/
├── app_public_profile.go
├── contributions_public_handler.go
└── project_member_public_handler.go
frontend/
├── proxy.ts                           # syntax-only canonical public URL redirect
└── src/app/members/[slug]/
    ├── page.tsx
    ├── not-found.tsx                  # route-local 404 client access boundary
    └── OwnHiddenProfilePreview.tsx    # authoritative getMemberProfile owner upgrade
```

These are focused additions/extensions, not parallel stores or DTO families. [VERIFIED: implementation-contract rules; filenames are recommendations]

### Pattern 1: Transaction-Safe Immutable Slug Allocation

**Use:** Normalize once in Go, reject empty/numeric/reserved results, acquire one transaction-scoped advisory lock for the entire member slug namespace, select the first available readable candidate (`base`, `base-2`, ...), and insert `nickname, public_slug` in the same caller transaction. Retain the unique constraint as the final invariant. [CITED: https://www.postgresql.org/docs/current/functions-admin.html] [CITED: https://www.postgresql.org/docs/current/ddl-constraints.html]

**Recommended reserved set:** `admin`, `api`, `edit`, `me`, `members`, `new`, `profile`, `ranking`, `settings`; reject numeric-only slugs separately. `ranking` is already a real static route under `/members`. [VERIFIED: `frontend/src/app/members/ranking/page.tsx`; remaining words are [ASSUMED] future-route protection]

```go
// Proposed shape; source patterns: pgx transactions in the three creation repositories.
func allocatePublicMemberSlugTx(ctx context.Context, tx pgx.Tx, nickname string) (string, error) {
    base, err := normalizePublicMemberSlug(nickname)
    if err != nil { return "", err }

    // One constant namespace lock also serializes base "name" against a literal "name-2".
    if _, err := tx.Exec(ctx,
        `SELECT pg_advisory_xact_lock(hashtextextended('members.public_slug', 0))`); err != nil {
        return "", err
    }
    // Query exact base/base-N candidates, choose first free suffix, then INSERT in this tx.
    return firstAvailableCandidate(ctx, tx, base)
}
```

Explicit `ä/ö/ü/ß` and `& -> und` substitutions must happen before Unicode decomposition; NFKD/NFD mark removal then handles other decomposable accents, and all remaining non-ASCII/non-alphanumeric runs collapse to one hyphen. [VERIFIED: current code already uses `x/text/unicode/norm`; ordering is a recommendation]

### Pattern 2: One Minimal Deny-First Access Query

**Use:** Normalize only URL syntax (trim/lowercase), reject numeric input, query the stored slug, and include the verified owner predicate in the same SQL `WHERE`. Missing and forbidden then both become `pgx.ErrNoRows`/`ErrNotFound`; no hidden row or owner ID is returned to the handler. [CITED: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/]

```sql
-- Proposed minimal resolver query.
SELECT m.id,
       m.public_slug,
       (m.profile_visibility = 'private') AS is_owner_preview
FROM members m
WHERE m.public_slug = $1
  AND (
      m.profile_visibility = 'public'
      OR (
          m.profile_visibility = 'private'
          AND EXISTS (
              SELECT 1
              FROM member_claims mc
              WHERE mc.member_id = m.id
                AND mc.app_user_id = $2
                AND mc.claim_status = 'verified'
          )
      )
  );
```

The resolver must ignore platform-admin flags and legacy `members.user_id` ownership fallbacks; the locked rule grants private access only through a verified claim. [VERIFIED: `128-CONTEXT.md`; current legacy fallback exists in `member_profile_repository.go`]

### Pattern 3: Resolve Once, Load by Member ID

**Use:** Handlers obtain viewer `AppUserID` from the existing optional-auth middleware, call the resolver, then pass only the resolved `memberID` to detail methods. Rename detail methods to `GetPublicMemberProfileByID`, `GetPublicMemberProjectsByID`, and `GetPublicMemberContributionsByID`; make the project-member relation check accept the already-resolved ID. [VERIFIED: existing composition root and middleware; method names are recommendations]

Required consumers are:

- `GET /api/v1/members/:slug`
- `GET /api/v1/members/:slug/projects`
- `GET /api/v1/members/:slug/contributions`
- `GET /api/v1/anime/:id/group/:groupId/members/:memberSlug`
- the same project-member route's `/notes`, `/media`, and `/releases` subresources. [VERIFIED: `backend/cmd/server/main.go`]

Register optional auth on contributions and all four project-member routes; today only profile/projects have it. [VERIFIED: `backend/cmd/server/main.go`]

### Pattern 4: Stored Slug for Every Outbound Link

Replace `memberSlugExpr`, `deriveMemberSlug`, `normalizeMemberProfileSlug`, React `slugifyMemberName`, and every `slug || member_id` link with required stored slug fields. [VERIFIED: codebase grep]

The exact backend projections to audit are `anime_contributions_public_repository.go`, `anime_contributions_public_versions_repository.go`, `group_contributors_repository.go`, `domain_projection_repository.go`, `member_archive_repository.go`, `member_point_totals_repository.go`, `project_member_public_repository.go`, and `member_profile_repository.go`. [VERIFIED: all current `memberSlugExpr`/`deriveMemberSlug` references]

For list projections that expose a public-profile link, emit `public_slug` only when the member profile is public; do not turn a private member into a discoverable link. Ranking and archive already filter to `profile_visibility='public'`, while contributor projections need a focused visibility review. [VERIFIED: ranking/archive SQL and contributor SQL]

### Pattern 5: Literal 404 Document with Authoritative Refresh-Only Owner Upgrade

The server page performs its anonymous no-store `getMemberProfile` resolution and calls Next `notFound()` for missing, privacy-denied, numeric, or invalid results before protected content is emitted. The route-local `not-found.tsx` has no params, so its client boundary derives the canonical member segment from `usePathname()`. Its initial server/client output is only `Profil wird geladen.` while `useAuthSession()` initializes. If `hasAccessToken || hasRefreshToken`, it calls token-free `getMemberProfile(slug)` on `authorizedFetch`/`apiClientFetch` with `cache: 'no-store'`; a verified private owner upgrades inside the already-404 document to the real profile composition plus notice. No session or API 404 settles to the exact neutral unavailable content, while non-404 failures use the approved retry state. This preserves the browser-owned refresh seam without inventing server refresh/BFF logic. [VERIFIED: central client capabilities and locked D-09/D-15; resolved plan architecture]

Remove the `getOwnProfile` request, `toPublicProfile`, numeric match, nickname slugification, and fallback badge/point reconstruction from `OwnHiddenProfilePreview.tsx`. [VERIFIED: current component]

Move `getMemberContributions` and the four `getProjectMember*` helpers from bare `fetch` to the same central `authorizedFetch`/`apiClientFetch` seam while retaining `cache: 'no-store'`. They currently cannot send or refresh viewer identity, so a verified owner could not reach private contributions or project-member subresources even after the backend adopts optional auth. [VERIFIED: `frontend/src/lib/api.ts`, `docs/frontend/auth-api-client.md`]

### Cross-Layer Contract Change Map

| Contract surface | Required Phase 128 change | Evidence |
|------------------|---------------------------|----------|
| Database | Add required immutable unique `members.public_slug`; change visibility check/default vocabulary to exactly `public/private`. | [VERIFIED: migrations 0077/0126 and D-01/D-06] |
| Backend DTOs | Make stored slug required on own/public member DTOs; return `private` only to an authorized owner; remove hidden-success response branches. | [VERIFIED: current DTOs/handlers and D-09/D-10/D-20] |
| Shared OpenAPI | Require stored slug, change `ProfileVisibility` to `public/private`, replace profile/projects hidden `200` unions with neutral `404`, and document authenticated owner-preview behavior. | [VERIFIED: `shared/contracts/openapi.yaml`, `docs/api/api-contracts.md`] |
| Member route contract inventory | Add only the absent `/api/v1/members/{slug}/contributions` operation. Update the four existing project-member operations (`summary`, `notes`, `media`, `releases`) in place for optional auth, neutral 404, cache semantics/headers, and their existing response envelopes; do not duplicate their path keys or operationIds. | [VERIFIED: exact `shared/contracts/openapi.yaml` path/operation inventory] |
| Frontend types/client | Remove `members_only`/hidden unions and numeric fallbacks; send optional viewer auth through the central client for every retained member object helper. | [VERIFIED: frontend types/API/helpers and auth rules] |
| UI presentation | Render the same authoritative public-profile composition for public viewers and private owners, with only the locked private-preview notice/edit affordances differing. | [VERIFIED: D-09/D-10/D-12] |

### Pattern 6: Canonical Redirect and Cache Policy

Use 308 for canonical redirects. Next.js `permanentRedirect` returns 308 outside Server Actions, and `proxy.ts` can redirect before render. [CITED: https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/03-api-reference/04-functions/permanentRedirect.mdx] [CITED: https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/01-getting-started/16-proxy.mdx]

Canonicalize URL syntax without consulting nicknames: decode one path segment, trim Unicode/encoded edge whitespace, lowercase ASCII, re-encode the canonical segment, preserve query parameters, and leave numeric paths unredirected so they reach neutral 404. Once allowed data returns, compare the stored slug as the final authority. [ASSUMED]

Set `Cache-Control: private, no-store` on owner-preview and viewer-specific results and `Vary: Authorization` on every optional-auth member response. Continue `cache: 'no-store'` in frontend member helpers. `private` prevents shared-cache storage and `no-store` prevents storage by caches generally. [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching]

The literal document-status gate is separate from API equality: focused page tests must prove `notFound()` invocation, and live `curl` against missing and private-anonymous `/members/{slug}` HTML routes must return 404. If the pinned Next.js streaming behavior yields 200, execution stops at that acceptance criterion; a 200 response cannot be documented as a limitation or deferred to Phase 132. [VERIFIED: D-09; resolved plan architecture]

### Anti-Patterns to Avoid

- **Allocate with `COUNT(*) + 1` and no lock:** concurrent creators can select the same suffix. Use one transaction lock plus the unique constraint. [CITED: PostgreSQL concurrency docs]
- **Lock per normalized base only:** `name` and literal `name-2` are different bases but can compete for `name-2`; serialize the namespace or add robust `23505` retry handling. [ASSUMED]
- **Generate a slug in a database default/trigger from nickname:** it duplicates the Go normalizer and makes clear validation errors/caller behavior harder to control. Use the trigger only for immutability. [ASSUMED]
- **Keep `members_only` as compatibility input:** D-06 explicitly forbids an alias; update DB constraint, Go constants/validation, OpenAPI, TypeScript, labels, form options, and tests atomically. [VERIFIED: `128-CONTEXT.md`]
- **Return `{visible:false}` or empty 200:** both distinguish private/missing behavior and let callers branch on existence. Use the same 404 envelope. [VERIFIED: current handlers and contributions behavior]
- **Resolve, load, then check visibility:** this already loads badges, points, projects, media, memberships, and contributions before denial. [VERIFIED: `GetPublicMemberProfile` call order]
- **Authorize admin role:** private ownership is a verified `member_claims` relationship, not a role/capability. [VERIFIED: D-07/D-11]
- **Cache by slug only:** the same URL can be anonymous public, neutral 404, or private owner preview. Owner/viewer results must never enter a shared cache. [VERIFIED: D-12; CITED: MDN caching guide]
- **Use `getOwnProfile` to recover private preview:** it creates a second identity/access authority and reconstructs a reduced DTO. [VERIFIED: current `OwnHiddenProfilePreview.tsx`]
- **Expand into Phase 129-133 cleanup:** do not fix projection totals, query fan-out, pagination, final DTO minimization, full SSR composition, or responsive styling here. [VERIFIED: roadmap/context deferred boundaries]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unicode normalization | Per-repository SQL regexes and React slugifiers | One Go normalizer using existing `x/text/unicode/norm` plus explicit German mapping | Current SQL/Go/React implementations already disagree. [VERIFIED: codebase] |
| Concurrency control | Process mutex | PostgreSQL transaction advisory lock + unique constraint | A process mutex does not coordinate multiple backend instances. [CITED: https://www.postgresql.org/docs/current/functions-admin.html] |
| Browser token refresh | Cookie parsing or Keycloak calls in the preview component | Existing `getMemberProfile` central authorized client and `useAuthSession` | Central client already coordinates refresh, bearer attachment, and one retry. [VERIFIED: auth client docs/code] |
| Per-route privacy logic | Repeated `if visibility` blocks | One injected access resolver and neutral 404 writer | Consistency across every object endpoint is the core BOLA mitigation. [CITED: OWASP API1:2023] |
| Alternative profile DTO | `MemberProfileData -> PublicMemberProfileData` mapper | Authoritative public-profile endpoint/DTO | Prevents missing badges, points, project and visibility semantics. [VERIFIED: current reduced mapper] |
| Slug history/aliases | Redirect/history table | Nothing in this phase | Explicitly prohibited for disposable rows. [VERIFIED: D-21] |

**Key insight:** Identity allocation, authorization, and detail projection are separate responsibilities. Persist identity at creation, decide access on minimal facts, and only then project details. [VERIFIED: locked phase boundary]

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Live local PostgreSQL has 5 `members` rows: 3 `members_only`, 2 `public`; migration head is 144 and no `members.slug/public_slug` column exists. [VERIFIED: read-only Compose SQL, 2026-08-13] | No data migration/backfill. Use an explicit local reset/reseed or isolated fresh database before applying 0145; the migration should fail with a clear precondition when member rows exist. [VERIFIED: D-21/AGENTS] |
| Live service config | No Compose/config reference to `members_only`, `PROFILE_VISIBILITY`, or `MEMBER_SLUG` was found; visibility lives in PostgreSQL/application code. [VERIFIED: committed config grep] | No service-console migration. Restart/rebuild backend/frontend after code/schema application. [ASSUMED] |
| OS-registered state | No Task Scheduler/systemd/pm2 identity is being renamed; Compose service names do not include member slug/visibility values. [VERIFIED: phase scope and Compose config] | None. |
| Secrets/env vars | No committed example/config env key references member slug or `members_only`; auth cookie names remain unchanged. [VERIFIED: committed config grep, auth docs] | None; do not inspect or rewrite live `.env`. [VERIFIED: AGENTS.md] |
| Build artifacts | Running backend/frontend images and frontend `.next` output contain the pre-change application bundle. [VERIFIED: services are running; Next uses built/dev artifacts] | Rebuild/restart application services after implementation; do not touch media volumes or tracked badge assets. [VERIFIED: AGENTS.md] |

**Canonical runtime question:** after repo files change, the old values remain only in disposable PostgreSQL rows and running/built application artifacts; there is no alias store, external profile service, or OS registration to migrate. [VERIFIED: runtime/config/code audit]

## Common Pitfalls

### Pitfall 1: Migration Cannot Apply to the Current Live Rows

**What goes wrong:** Adding a non-null slug or replacing the visibility check fails while the five existing rows have no slug and three use `members_only`. [VERIFIED: live SQL]

**Why it happens:** PostgreSQL validates new constraints against existing rows. [CITED: https://www.postgresql.org/docs/current/ddl-constraints.html]

**How to avoid:** Make the migration intentionally fresh/reset-only with a clear precondition; do not add a backfill/default/alias. Prove up/down on a dedicated disposable database and schedule the explicitly authorized reset separately from ordinary migration commands. [VERIFIED: D-21, AGENTS.md]

**Warning signs:** A plan includes `UPDATE members SET public_slug = ...`, nullable compatibility, or `members_only -> private` row rewriting. [VERIFIED: prohibited by user constraints]

### Pitfall 2: Incomplete Creation-Path Coverage

**What goes wrong:** One creation repository inserts without `public_slug`, or invents a second allocator. [VERIFIED: three production `INSERT INTO members` sites]

**How to avoid:** Route `MemberRequestsRepository.ApproveRequest`, `ensureAppUserMemberAnchorTx`, and `HistGroupMembersRepository.CreateWithAutoMember` through the same transaction helper. Update direct test fixtures that insert `members(id)` after the new non-null column. [VERIFIED: codebase grep]

### Pitfall 3: Private Data Loads Before the Handler Denies It

**What goes wrong:** Hidden requests still execute detail queries and can leak via errors, timing, logs, or future cache code. [VERIFIED: current full loader precedes handler check]

**How to avoid:** Resolver first, ID-based loader second, and spy tests asserting every detail method call count stays zero for missing/private non-owner. [CITED: OWASP API1:2023]

### Pitfall 4: One Unguarded Subresource Breaks the Privacy Model

**What goes wrong:** Contributions currently return empty 200 for missing slugs, and project-member summary/notes/media/releases have their own unauthenticated nickname resolver. [VERIFIED: repositories/route registration]

**How to avoid:** Inject the same resolver into all three handler families and register existing optional auth on contributions/project-member routes. [VERIFIED: composition pattern]

### Pitfall 5: Canonical Redirect Becomes an Existence Oracle

**What goes wrong:** A database-aware redirect for a private non-owner confirms that a canonical private slug exists. [ASSUMED]

**How to avoid:** Syntax-only redirects may apply equally to missing paths; stored-slug redirects happen only after the shared resolver allows public/owner access. Hidden/non-owner paths remain neutral 404. [VERIFIED: D-09/D-18]

### Pitfall 6: Refresh-Only Owner Briefly Sees 404

**What goes wrong:** SSR has no access token, performs anonymous lookup, and renders the unavailable state before the browser central client refreshes. [VERIFIED: current server page reads only the access-token cookie; central refresh is browser-owned]

**How to avoid:** Make the anonymous server page call `notFound()` and let route-local `not-found.tsx` render only neutral `Profil wird geladen.` while its client boundary initializes the access-or-refresh session and resolves `getMemberProfile` through the central client. The verified owner upgrades to authoritative content inside the already-404 document; unavailable content is not rendered before the client decision. [VERIFIED: auth docs, D-09/D-15, resolved plan architecture]

### Pitfall 7: Cache Key/Headers Mix Anonymous and Owner Outcomes

**What goes wrong:** The same URL produces viewer-dependent results, so a shared cache can serve a private preview or cached anonymous denial to the wrong viewer. [CITED: MDN caching guide]

**How to avoid:** `private, no-store`, `Vary: Authorization`, no-store helper calls, and tests on API and Next response classification. [CITED: MDN; Next.js caching docs]

### Pitfall 8: Public Link Producers Keep Regenerating Identity

**What goes wrong:** Nickname changes leave ranking/archive/group links pointing at a guessed new URL while the stored slug remains old. [VERIFIED: current `memberSlugExpr` consumers]

**How to avoid:** Remove the shared derived SQL expression entirely and add a source-invariant test rejecting nickname-derived public slug code and numeric fallbacks. [VERIFIED: existing source-invariant test style]

## Code Examples

### Immutable Database Contract

```sql
-- Proposed 0145 shape; exact names are discretionary.
ALTER TABLE members
    ADD COLUMN public_slug TEXT NOT NULL,
    ADD CONSTRAINT uq_members_public_slug UNIQUE (public_slug),
    ADD CONSTRAINT chk_members_public_slug_format
      CHECK (public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
             AND public_slug !~ '^[0-9]+$'
             AND char_length(public_slug) <= 512);

CREATE FUNCTION prevent_member_public_slug_update() RETURNS trigger AS $$
BEGIN
  IF NEW.public_slug IS DISTINCT FROM OLD.public_slug THEN
    RAISE EXCEPTION 'member public slug is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

PostgreSQL unique constraints enforce uniqueness and create their supporting index. [CITED: https://www.postgresql.org/docs/current/ddl-constraints.html]

Because Phase 128 forbids row preservation/backfill, the up migration should fail with a clear precondition if `members` is non-empty and be applied only after the explicitly approved reset/reseed step; the down migration should likewise remove the trigger/function/constraints/column in reverse dependency order and be exercised only in the guarded Phase 128 test database. [VERIFIED: D-21, AGENTS.md migration rules]

### Handler Ordering

```go
// Proposed handler pattern.
access, err := h.accessResolver.ResolvePublicMemberAccess(
    c.Request.Context(), c.Param("slug"), viewerAppUserID(c),
)
if errors.Is(err, repository.ErrNotFound) {
    writePublicMemberUnavailable(c) // same body for missing/private/numeric
    return
}
profile, err := h.profileStore.GetPublicMemberProfileByID(c.Request.Context(), access.MemberID)
```

This ordering is the central security property; handler tests should use separate resolver and loader stubs. [VERIFIED: PMPR-02]

### Private Cache Response

```go
if access.IsOwnerPreview {
    c.Header("Cache-Control", "private, no-store")
}
c.Header("Vary", "Authorization")
```

`private` prevents shared-cache storage; `no-store` prevents storage by caches. [CITED: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching]

### Refresh-Aware Preview Gate

```tsx
const { hasAccessToken, hasRefreshToken, isClientInitialized } = useAuthSession()
const hasSession = hasAccessToken || hasRefreshToken

if (!isClientInitialized || (hasSession && isLoading)) {
  return <p role="status">Profil wird geladen.</p>
}
```

This is the documented Team4s auth gate; `getMemberProfile(slug)` performs refresh and bearer attachment centrally. [VERIFIED: `docs/frontend/auth-api-client.md`, `frontend/src/lib/api.ts`]

## State of the Art

| Old Approach | Current Approach for Phase 128 | When Changed | Impact |
|--------------|--------------------------------|--------------|--------|
| Nickname-derived SQL/Go/React slug | One stored immutable PostgreSQL slug | Phase 128 | Nickname edits cannot change identity; all links agree. [VERIFIED: locked decision] |
| Numeric ID fallback | Numeric paths always neutral 404 | Phase 128 | Removes enumerable technical identity fallback. [VERIFIED: locked decision] |
| `members_only` hidden 200 | `private`; non-owner/missing same 404 | Phase 128 | Login/admin no longer implies visibility and existence is not disclosed. [VERIFIED: locked decision] |
| Full load then visibility branch | Minimal shared access query then ID-based load | Phase 128 | Hidden requests execute no detail loaders. [VERIFIED: phase goal] |
| `getOwnProfile` reduced client reconstruction | Same public endpoint/DTO through central refresh seam | Phase 128 | Owner sees real read-only presentation and authoritative data. [VERIFIED: locked decision] |
| Per-route/nickname resolution | One injected access result for all member-specific subresources | Phase 128 | Prevents route-specific privacy drift. [VERIFIED: PMPR-03] |

**Deprecated/outdated:**

- `memberSlugExpr`, `deriveMemberSlug`, `normalizeMemberProfileSlug`, `slugifyMemberName`, numeric route matching, `slug || member_id`, `ProfileVisibilityMembersOnly`, `{visible:false}`, and the `MemberProfileHidden` response are removal targets, not compatibility seams. [VERIFIED: current code and D-06/D-17/D-20]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The recommended reserved set beyond the verified `ranking` conflict is sufficient for foreseeable `/members/*` static routes. | Architecture Pattern 1 | A future static route could collide and require reserving another word before member creation. |
| A2 | A single namespace advisory lock is acceptable because member creation is low-frequency. | Architecture Pattern 1 | If creation becomes high-volume, allocation throughput is serialized; correctness remains intact. |
| A3 | Syntax-only proxy canonicalization can observe the encoded member path accurately in the deployed Next.js configuration. | Architecture Pattern 6 | If Next normalizes before Proxy, encoded-equivalence may need a route/server-header alternative. |
| A4 | Rebuilding/restarting services is sufficient to clear compiled old visibility/slug behavior. | Runtime State Inventory | An uninspected external cache would require explicit purge; none was found in project config. |

## Open Questions (RESOLVED)

1. **RESOLVED — Which HTTP layer carries the literal 404 during refresh-only owner recovery?**
   - The Next HTML document and the backend API both carry literal 404 for missing and privacy-denied requests. The server page performs anonymous no-store resolution and calls `notFound()` before protected content. Route-local `not-found.tsx` initially emits only `Profil wird geladen.`; its client boundary derives the slug from `usePathname()` and uses the existing token-free central `getMemberProfile` seam. A verified refresh-only owner upgrades inside that already-404 document to `MemberProfileContent` plus the owner notice without an unavailable flash. Anonymous/non-owner/admin non-owner/missing requests settle to identical unavailable output, and non-404 failures use the approved retry state. No server refresh/BFF seam is added. Focused tests assert `notFound()` invocation, and live HTML curl must return 404; if pinned Next streaming produces 200, execution stops rather than deferring D-09. [RESOLVED: D-09/D-15, 2026-08-13]

2. **RESOLVED — What controlled databases and reset commands does execution use?**
   - Wave 0 idempotently provisions the dedicated database named exactly `team4s_phase128_test` through the Compose PostgreSQL service after checking `pg_database`. Every backend-container Phase-128 test command explicitly passes `TEAM4S_PHASE128_TEST_DSN=postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase128_test?sslmode=disable`. The Phase-128 fixture fails when the variable is absent and rejects every parsed database name outside `team4s_phase128_test*`, especially `team4s_v2`. The live local `team4s_v2` reset remains a non-autonomous checkpoint: execution first proves database identity/runtime profile, recursively enumerates affected FK tables and row counts, and presents the exact guarded `TRUNCATE TABLE members RESTART IDENTITY CASCADE` transaction, migration, and two-member reseed. It proceeds only after the exact approval phrase, never deletes volumes, and never runs `docker compose down -v`. [RESOLVED: D-21/AGENTS stop rules, 2026-08-13]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Canonical Linux SSH repo | All work | ✓ | `/home/d1sk/team4s` | None. [VERIFIED: live SSH] |
| Docker Compose backend | Go build/tests/runtime | ✓ | Go 1.25.12 | None. [VERIFIED: `docker compose ps`, container probe] |
| PostgreSQL | Migration, allocator, access tests | ✓ | 16.14 | None. [VERIFIED: container probe] |
| Frontend container | Vitest/typecheck/build | ✓ | Node 20.20.2, npm 10.8.2 | None. [VERIFIED: container probe] |
| Redis | Existing auth token state | ✓ | Redis 7 service, `PONG` | No new Redis logic is required. [VERIFIED: Compose/probe] |
| Keycloak | Optional-auth/refresh UAT | ✓ | Compose service healthy, image 26.0 | Central client tests can mock refresh; live UAT uses service. [VERIFIED: `docker compose ps`] |
| Guarded Phase-128 test DB/DSN | PostgreSQL concurrency and migration proof | Wave-0 provisioned | `team4s_phase128_test` | Idempotently create the exact database through Compose and explicitly pass `TEAM4S_PHASE128_TEST_DSN` to every backend test command; never point tests at `team4s_v2`. [RESOLVED: Wave-0 plan and existing testsupport safety pattern] |

**Missing dependencies with no fallback:** None for implementation; a guarded test DB must be provisioned in Wave 0 before PostgreSQL-backed acceptance tests can genuinely run. [VERIFIED: environment audit]

**Missing dependencies with fallback:** Central refresh behavior can be unit-tested with existing mocks before live Keycloak UAT, but live refresh-only verification remains required. [VERIFIED: existing `api.auth-refresh.test.ts`]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Backend | Go `testing` + testify 1.9.0; source/handler tests plus guarded PostgreSQL integration. [VERIFIED: `backend/go.mod`, existing tests] |
| Frontend | Vitest 3.2.4 + Testing Library/jsdom. [VERIFIED: `frontend/package.json`, existing page tests] |
| Config | No Go test config; `frontend/vitest.config.*`/package test script. [VERIFIED: repository] |
| Quick run | `docker compose exec -T -e TEAM4S_PHASE128_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase128_test?sslmode=disable' team4sv30-backend go test ./internal/repository ./internal/handlers ./internal/migrations -run 'PublicMember|MemberSlug|MemberAccess|ProjectMember|Phase128' -count=1` plus focused frontend member route/auth tests. [RESOLVED: Wave-0 database contract] |
| Full suite | `docker compose exec -T -e TEAM4S_PHASE128_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase128_test?sslmode=disable' team4sv30-backend go test ./... -count=1` and `docker compose exec -T team4sv30-frontend npm test -- --run`, then typecheck/lint/build, literal HTML 404 curl checks, and `git diff --check`. [VERIFIED: project scripts/AGENTS; resolved D-09/D-21 gates] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PMID-01 | Schema requires unique stored slug; normalization/transliteration/reserved/empty cases; `name/name-2/name-3` under concurrency | unit + PostgreSQL integration | `go test ./internal/repository ./internal/migrations -run 'MemberSlug|PublicIdentity' -race -count=1` | ❌ Wave 0 |
| PMID-02 | Update nickname leaves `public_slug` unchanged; direct slug UPDATE rejected | PostgreSQL integration | `go test ./internal/repository ./internal/migrations -run 'SlugImmutable|Nickname' -count=1` | ❌ Wave 0 |
| PMID-03 | All outbound projections use stored slug; no numeric/derived fallbacks | source invariant + frontend component | focused Go repositories + Vitest page/hero/ranking/team tests | ⚠️ Existing analogs; new assertions required |
| PMPR-01 | missing/private anonymous/private non-owner have identical status/body | table-driven handler | `go test ./internal/handlers -run 'PublicMember.*Unavailable' -count=1` | ⚠️ Existing tests assert old hidden 200; rewrite |
| PMPR-02 | denied access invokes zero protected loaders | handler spy + PostgreSQL access query | `go test ./internal/handlers ./internal/repository -run 'VisibilityFirst|NoDetailLoad' -count=1` | ❌ Wave 0 |
| PMPR-03 | profile/projects/contributions/summary/notes/media/releases share resolver matrix | table-driven handler integration | `go test ./internal/handlers -run 'PublicMemberAccessMatrix' -count=1` | ❌ Wave 0 |
| PMPR-04 | access absent/expired + refresh valid -> central refresh -> full private DTO, notice, no correction, no 404 flash | Vitest + mocked central refresh | `npm test -- --run src/lib/api.auth-refresh.test.ts 'src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx' 'src/app/members/[slug]/page.test.tsx'` | ⚠️ Existing tests cover pieces; rewrite/add |
| PMPR-05 | owner/viewer response non-store/private and varies on auth | handler/header + route source test | focused Go handler tests + member page test | ❌ Wave 0 |

### Additional Required Matrices

- Slug matrix: German transliteration, other decomposable accents, ampersand, punctuation collapse, whitespace, empty, numeric, reserved, long input, collisions, concurrent distinct bases including `name` versus literal `name-2`. [VERIFIED: D-02-D-04; concurrency case [ASSUMED]]
- Access matrix per endpoint: anonymous public 200; anonymous private 404; owner private 200; authenticated non-owner private 404; admin non-owner private 404; missing 404; numeric 404; nickname-change guessed URL 404. [VERIFIED: D-07-D-11/D-19-D-20]
- Loader matrix: every denied case records zero calls to memberships, badges, points, projects, contributions, media, story/detail methods. [VERIFIED: D-08]
- Canonical URL matrix: case, surrounding plain/encoded whitespace, equivalent encoding -> 308; numeric -> no redirect + 404; private non-owner normalization must not become an existence oracle. [VERIFIED: D-09/D-18/D-20]
- Cache matrix: public anonymous, private owner, private/missing 404, metadata, projects/contributions/project-member subresources; assert owner never public-cacheable. [VERIFIED: D-12]

### Sampling Rate

- **Per task commit:** Run the narrow Go package/test regex or Vitest files owned by that task plus `git diff --check`. [VERIFIED: AGENTS.md]
- **Per wave merge:** Run backend repository/handler/migration focused suites, frontend member/auth suites, typecheck, and lint. [VERIFIED: AGENTS.md]
- **Phase gate:** Full backend/frontend suites, production build if feasible, migration fresh/up/down on guarded DB, source-invariant grep, `git diff --check`, and live browser refresh-only owner/private-nonowner UAT. [VERIFIED: AGENTS.md, ROADMAP success criteria]

### Wave 0 Gaps

- [ ] `backend/internal/repository/member_public_slug_test.go` — normalization, validation, suffix allocation, concurrency.
- [ ] `backend/internal/repository/member_public_access_repository_test.go` — public/private/verified-owner/admin/non-owner/missing/numeric outcomes.
- [ ] `backend/internal/migrations/phase128_public_identity_test.go` — schema, precondition, unique/immutable constraints, up/down.
- [ ] `backend/internal/handlers/public_member_access_matrix_test.go` — neutral response and zero-loader assertions across all member subresources.
- [ ] Rewrite `backend/internal/handlers/app_public_profile_test.go` old `members_only`/hidden-200 expectations.
- [ ] Extend `frontend/src/lib/api.auth-refresh.test.ts` and rewrite `OwnHiddenProfilePreview.test.tsx` to prove `getMemberProfile`, not `getOwnProfile`.
- [ ] Extend page/link tests for stored slug, owner notice, correction suppression, canonical redirects, and neutral states.
- [ ] Provision exact database `team4s_phase128_test`; add a fail-on-missing guarded `TEAM4S_PHASE128_TEST_DSN` helper and pass the explicit DSN to every Phase-128 PostgreSQL test command. [RESOLVED: testsupport/environment audit]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing optional-auth middleware verifies tokens; central client owns refresh/bearer. [VERIFIED: auth docs/code] |
| V3 Session Management | yes | Refresh-only session remains active; no direct cookie/token logic in components. [VERIFIED: auth docs] |
| V4 Access Control | yes, primary | One deny-first resolver validates verified ownership for every member object endpoint; admin is not an implicit grant. [CITED: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/] |
| V5 Input Validation | yes | One deterministic slug normalizer; reject empty/numeric/reserved; parameterized pgx queries; canonical encoding tests. [VERIFIED: project stack and decisions] |
| V6 Cryptography | no new control | Reuse existing token verification/Keycloak; do not add slug hashing, signed aliases, or custom crypto. [VERIFIED: phase scope/auth docs] |

OWASP lists ASVS 5.0.0 as the current stable standard, while the template's V2-V6 labels correspond to the familiar ASVS category grouping used by this workflow. [CITED: https://owasp.org/www-project-application-security-verification-standard/]

### Known Threat Patterns for Go/PostgreSQL/Next Public Member Access

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| BOLA/IDOR via slug or numeric ID | Information Disclosure / Elevation | Resolve stored slug and verified owner centrally on every endpoint; numeric never resolves. [CITED: OWASP API1:2023] |
| Profile enumeration via status/body/redirect | Information Disclosure | Byte-identical neutral 404 for private non-owner and missing; syntax redirect independent of DB existence. [VERIFIED: D-09/D-18] |
| Post-load privacy check | Information Disclosure | Deny-first minimal query and zero-loader tests. [VERIFIED: D-08] |
| Shared-cache owner leak | Information Disclosure | `private, no-store`, `Vary: Authorization`, no-store fetches, cache tests. [CITED: MDN caching guide] |
| Slug collision race | Spoofing | PostgreSQL transaction lock plus unique constraint; concurrent integration test. [CITED: PostgreSQL docs] |
| Identity drift after nickname edit | Spoofing | Stored slug omitted from update DTO/SQL plus immutable DB trigger. [VERIFIED: D-01/D-02] |
| Admin privacy bypass | Elevation of Privilege | Resolver checks verified claim equality only; ignore role flags. [VERIFIED: D-07/D-11] |
| Encoded-path ambiguity/double decoding | Spoofing / Tampering | Decode exactly once, canonical re-encode, reject separators/control input, test encoded whitespace and `%2F`. [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- `128-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md`, `.planning/STATE.md` — locked scope, requirements, phase boundaries, and dirty-worktree warning. [VERIFIED: codebase]
- `AGENTS.md`, `docs/engineering/implementation-contract.md`, `docs/frontend/auth-api-client.md`, `docs/api/api-contracts.md`, `docs/architecture/db-schema-fansub-domain.md` — mandatory project constraints. [VERIFIED: codebase]
- `database/migrations/0044`, `0077`, `0126`, `0144`; all production `INSERT INTO members` sites — schema and creation seams. [VERIFIED: codebase]
- Public profile, contributions, project-member repositories/handlers, `backend/cmd/server/main.go`, frontend profile route/types/API/components, and OpenAPI — current behavior/integration inventory. [VERIFIED: codebase]
- PostgreSQL current documentation — constraints, transaction advisory locks, and concurrency retry behavior: https://www.postgresql.org/docs/current/ddl-constraints.html, https://www.postgresql.org/docs/current/functions-admin.html, https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html. [CITED]
- Next.js 16.1.6 documentation — Proxy, permanent redirects, dynamic APIs, and no-store caching: https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/01-getting-started/16-proxy.mdx, https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/03-api-reference/04-functions/permanentRedirect.mdx, https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/02-guides/caching.mdx. [CITED]

### Secondary (MEDIUM confidence)

- OWASP API1:2023 Broken Object Level Authorization — per-object authorization on every endpoint: https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/. [CITED]
- OWASP ASVS project — current stable ASVS version: https://owasp.org/www-project-application-security-verification-standard/. [CITED]
- MDN HTTP caching guide — `private`/`no-store` semantics: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching. [CITED]

### Tertiary (LOW confidence)

- None. All LOW-confidence design assumptions are isolated in the Assumptions Log. [VERIFIED: this document]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — versions verified from repository manifests and running Compose containers; no new dependency is recommended. [VERIFIED: runtime/manifests]
- Architecture: HIGH — based on direct handler/repository/route/auth inspection and locked user decisions. [VERIFIED: codebase/context]
- Slug allocator details: MEDIUM — PostgreSQL primitives are verified, while global-lock throughput and reserved words are discretionary assumptions. [CITED: PostgreSQL docs] [ASSUMED]
- Frontend refresh/HTML-status edge: MEDIUM — architecture is resolved as `notFound()` plus a route-local client upgrade inside the 404 document; pinned Next behavior remains an execution-time literal-status acceptance gate and cannot be waived. [VERIFIED: auth docs/code; RESOLVED 2026-08-13]
- Pitfalls/security: HIGH — current ordering and unguarded routes are directly verified and match OWASP object-authorization guidance. [VERIFIED: codebase] [CITED: OWASP]

**Research date:** 2026-08-13
**Valid until:** 2026-09-12 for the stable project architecture; re-check Next.js patch documentation if the pinned version changes. [ASSUMED]
