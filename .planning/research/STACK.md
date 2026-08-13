# Stack Research

**Domain:** Brownfield public member-profile hardening
**Project:** Team4s v1.3 Public Member Profile Hardening
**Researched:** 2026-08-13
**Confidence:** HIGH

## Decision

Do not add a new runtime framework, ORM, query builder, state library, cache product, image service, CSS framework, component library, or end-to-end test runner for v1.3. Every required capability already exists in the validated Team4s stack. The milestone should improve how the existing seams are used: persist a stable member slug in PostgreSQL, gate visibility before loading detail, consolidate the Go/pgx projection, keep the OpenAPI/backend/frontend shapes aligned, use the existing Next.js image and server-rendering facilities correctly, and exercise the existing Vitest/Testing Library/Playwright suite with deterministic fixtures.

The only immediately justified stack-level changes are configuration/schema changes with no new dependency:

1. Add a stored, unique public member slug in a new migration and stop deriving it from mutable nicknames at read time.
2. Add only query-specific indexes proven by `EXPLAIN (ANALYZE, BUFFERS)` against the `sheppert` and `csubs-leader` fixtures.
3. Add `images.qualities: [75]` to the existing Next.js image configuration, and scope `dangerouslyAllowLocalIP: true` to the local/private-network test profile rather than treating it as a production default.
4. Keep viewer-dependent/owner-preview responses `no-store`; cache only a separately defined anonymous public projection if measurement later justifies it.

## Recommended Stack

### Core Technologies

| Technology | Current constraint / observed version | v1.3 purpose | Recommendation and rationale |
|------------|---------------------------------------|--------------|------------------------------|
| PostgreSQL | Compose major `16`; running `16.14` | Stable slug, visibility-first lookup, set-based projections, indexes, pagination | Keep. Store the slug as ordinary data with a unique constraint. A unique B-tree index is created by the constraint and makes collision handling a database invariant. Do not use a generated slug because nickname changes must not change the public URL. |
| Go | `go 1.25.0`; container currently `go1.25.12` | Privacy gate, repository projection, DTOs, pagination and cache invalidation | Keep the 1.25 line for this milestone. Go 1.25 remains supported under the official two-newer-major-releases policy, and the running patch already includes the current 1.25 security fixes. A Go 1.26 upgrade is maintenance work, not a profile-hardening prerequisite. |
| Gin | `v1.10.0` | Existing HTTP handlers and backend-owned access decisions | Keep. The required change is handler/repository ordering, not a router replacement: resolve minimal identity/visibility first, authorize owner preview through backend identity, then load public detail. |
| pgx/v5 | `v5.7.1` | PostgreSQL access, transactions and query execution | Keep. Eliminate N+1 behavior with set-based SQL first. `pgx.Batch` is available if measured latency is dominated by several truly independent queries, but it is not a substitute for fixing per-row reads and its results must be closed before reusing the connection. |
| Next.js App Router | `16.1.6` | Existing `/members/[slug]` SSR route, metadata, image optimization | Keep. Node `20.20.2` exceeds the Next.js 16 minimum of 20.9. Preserve React `cache()` only for request-scoped deduplication; it is invalidated between server requests and is not a cross-request profile cache. |
| React / React DOM | `18.3.1` | Existing server/client component composition | Keep the installed pair during v1.3. The working tree resolves it successfully with Next.js 16; a React major-version migration would mix unrelated rendering risk into the hardening milestone. |
| CSS Modules + platform CSS | Existing | Mobile-first layout, container queries, focus, reflow, density | Keep. Use the project responsive standard and native container queries; no Tailwind, CSS-in-JS, or new breakpoint library is needed. |
| OpenAPI | Existing `shared/contracts/openapi.yaml` | Canonical public profile response, visibility variants, pagination | Keep the existing contract source. Update it in the same phase as Go models, handler status/response variants, TypeScript DTOs, and `api.ts`; do not add code generation merely to compensate for drift in this narrow surface. |

### Existing Supporting Libraries and Services

| Library / service | Version | Purpose | When to use in v1.3 |
|-------------------|---------|---------|---------------------|
| Redis + go-redis/v9 | Redis running `7.4.10`; client `v9.7.0` | Optional shared cache already in Compose | Do not put it on the critical path initially. Use only after query and payload work is measured and still misses the target. If used, cache anonymous public DTOs by stable member ID plus projection version, attach a TTL, and invalidate exact keys after profile/contribution/membership/badge/media writes. Never cache owner preview or a `visible:false` decision under a public key. |
| `next/image` | Included in Next `16.1.6` | Responsive avatar, hero, group, project and badge images | Continue using exact `remotePatterns`, intrinsic dimensions, and truthful `sizes`. Add the Next.js 16 quality allowlist. Keep local-IP optimization limited to the private development/test runtime. |
| `golang.org/x/image` and existing imaging pipeline | `v0.37.0` plus existing project media code | Existing image preparation/variants | Reuse existing member/media ownership paths. Do not add Sharp directly, a CDN SDK, or a second thumbnail service for this milestone. |
| Vitest + Testing Library + jsdom | `3.2.4`, `16.3.0`, `26.1.0` | Component, API helper, contract and responsive-state tests | Keep. Prefer role/name queries and focused tests around empty/large projections, hidden profiles, owner preview, and derived display state. |
| Playwright | Pinned `1.55.0` | Reproducible browser/UAT flows | Keep the pinned version for v1.3. Add deterministic desktop/mobile viewport cases for `sheppert` and `csubs-leader`, keyboard traversal, focus visibility, no horizontal page overflow, image request sizing, and request-count assertions. Upgrade Playwright separately rather than coupling browser churn to feature work. |
| Testify | `v1.9.0` | Backend handler/repository assertions | Keep for visibility matrix, payload shape, query-count invariants, and pagination tests. |

### Development and Diagnostic Tools

| Tool | Purpose | v1.3 guidance |
|------|---------|---------------|
| PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` | Validate query plans and index usefulness | Capture plans for both named fixtures before and after each index/query change. Do not add speculative indexes; multicolumn order must match real predicates and sort order. |
| Existing Go repository/handler tests | Enforce privacy and projection behavior | Assert that hidden non-owner requests do not invoke detail loaders. Test anonymous, other-member, owner-with-access-token, and owner-with-refresh-session flows at their owning boundaries. |
| Existing contract tests | Detect backend/OpenAPI/TypeScript drift | Keep the public profile schema, visibility response, pagination metadata, and removed-field assertions synchronized. |
| Existing Playwright installation in the frontend image | Live and automated UAT | Reuse the installed Chromium and current scripts. No Cypress or second browser harness. |
| Docker Compose | Reproducible application/runtime topology | Continue running all services on Linux. No direct host installs and no new service container are needed. |

## Required Integration Patterns

### 1. Stable slug is persisted identity, not a display-name function

- Add one canonical column such as `members.public_slug` (final name must match the migration/contract decision), `NOT NULL` for seeded canonical rows, with a unique constraint.
- Assign/change it only through the backend-owned member identity workflow. Nickname edits must not mutate it.
- Resolve `/members/:slug` by direct equality. Remove normalized-nickname scans and numeric-ID fallback once disposable test data is reset/reseeded.
- Do not add a slug npm package. The database owns uniqueness; the backend owns the one normalization/allocation policy. `golang.org/x/text` is already present if a later explicitly documented transliteration policy needs it.

### 2. Visibility gate precedes projection loading

- First query only the canonical member ID, owner app-user ID, stable slug, visibility, and minimal status needed to decide access.
- Return the documented hidden/not-found behavior before memberships, badges, contributions, projects, or media are queried.
- Use middleware/backend identity for owner-preview authorization. Do not infer ownership from Keycloak roles, JWT claims in UI code, or a client-provided member ID.
- Preserve the central auth/API boundary. Protected owner flows must treat `hasAccessToken || hasRefreshToken` as an active session and allow central refresh to proceed.

### 3. Set-based public projection before caching

- Replace per-project release-version reads with a set-based query/CTE or a bounded second query keyed by all page project IDs, then assemble in Go.
- Separate summary payloads from paged detail. The first profile response should contain only fields rendered above the initial interaction boundary; the existing projects endpoint should not call the full profile loader just to recover identity/count/visibility.
- Use stable cursor/keyset pagination if the ordering can change or data volume warrants it. If offset pagination remains, make `total`, `limit`, `offset`, and ordering truthful and deterministic.
- Index only predicates and joins shown to dominate fixture plans. Expression indexes can accelerate normalized expressions, but once a stored slug exists the slug lookup should use the simple unique index instead.

### 4. Cache by privacy class

- Viewer-dependent owner preview remains `no-store` and must never share a response across viewers.
- React `cache()` may continue deduplicating `generateMetadata` and page work within one server request; it does not provide cross-request caching.
- If an anonymous-only public DTO is introduced, it may be cached after correctness/query work is complete. Prefer the already-running Redis when multiple backend consumers/instances need the same cache. Use exact invalidation and a safety TTL.
- Do not key shared caches by bearer token. Do not enable Next.js Cache Components across the milestone solely for this page; doing so would broaden the rendering model and cookie/cache audit surface.

### 5. Image optimization stays inside the existing seam

- Continue `next/image` and the project `ResponsiveImage` wrapper with correct intrinsic dimensions and a `sizes` expression that reflects actual component geometry.
- Add `images.qualities: [75]`; Next.js 16 documents the allowlist as required and it bounds optimizer variants.
- Keep `remotePatterns` path-specific. Do not widen host/path wildcards.
- `dangerouslyAllowLocalIP: true` is appropriate only for the private-network/local probe that currently needs it. Make it runtime-profile-specific or otherwise prove it cannot be enabled in an Internet-facing deployment; Next.js warns it can expose internal-network content.
- Do not add an image CDN until measured traffic, cache hit rate, or origin bandwidth shows the self-hosted optimizer is insufficient.

### 6. Accessibility and responsive verification use current tools

- Implement WCAG 2.2 AA-relevant semantics, keyboard focus, target sizing, and 320-CSS-pixel reflow in components/CSS, not through a UI framework switch.
- Use Testing Library and Playwright accessible-role/name assertions plus real keyboard and viewport checks. Automated assertions do not replace the required live in-app-browser UAT.
- `@axe-core/playwright` is optional follow-up tooling, not a v1.3 prerequisite. Add it only if the roadmap explicitly creates a maintained automated accessibility gate and assigns false-positive triage ownership.

## Installation

No new package installation is recommended.

```bash
# Existing reproducible dependency paths only; run inside the canonical Docker workflow.
npm ci
go mod download
```

Do not run these directly on Ubuntu outside the project Docker/GSD wrappers. No `npm install`, `go get`, or new Compose service is required for v1.3.

## Alternatives Considered

| Recommended | Alternative | Why the alternative is not justified now |
|-------------|-------------|-------------------------------------------|
| Stored PostgreSQL slug + unique constraint | Runtime slugify library / derived nickname slug | Derived slugs change with display names, cannot provide database-enforced collision safety, and currently force fallback scanning. |
| Set-based SQL with pgx | ORM, GraphQL, DataLoader | The performance issue is query shape in one existing projection. A new abstraction would add mapping and contract layers without removing the underlying joins. |
| Existing Redis only after measurement | New cache service or broad Next shared cache | Adds invalidation and privacy risk before query/payload correctness is known. Viewer-specific responses are unsafe to share. |
| Existing Next server components and focused client islands | TanStack Query, SWR, Redux/Zustand | The public page is SSR-first and already receives one projection. New client state would duplicate server data and request ownership. |
| `next/image` + existing media variants | Cloudinary/Imgix/new CDN SDK | Current requirements are responsive delivery and tighter configuration, not a new media owner or external operational dependency. |
| CSS Modules + container queries | Tailwind, styled-components, new design system | Team4s already has global UI components and a responsive standard; framework migration would be unrelated redesign. |
| Vitest/Testing Library/Playwright | Jest/Cypress/Storybook | Existing tools cover unit, contract, browser, visual and responsive flows. A second runner increases maintenance without closing a required gap. |
| Hand-maintained aligned contract plus current contract tests | OpenAPI code generation introduced in v1.3 | Generation can be valuable platform-wide, but introducing it for one brownfield endpoint changes ownership and generated-file workflow. Plan separately if desired. |

## What NOT to Add

| Avoid | Why | Use instead |
|-------|-----|-------------|
| New member/profile/badge/media tables | Duplicates canonical ownership and risks attaching data to the wrong entity | Existing members, claims, memberships, contributions, badges and media projection tables |
| Production-data compatibility/backfill layer | Test rows are explicitly disposable and compatibility code would preserve known-bad synthetic shapes | New reversible schema migration, reset and deterministic reseed |
| A second auth client, BFF, or token-aware profile hook | Violates the central browser auth/API boundary and can break refresh-session behavior | Existing central `api.ts` client plus backend permission identity |
| Public cache containing owner preview/private fields | Cache-key mistakes become privacy incidents | Minimal anonymous DTO only, or no shared cache |
| `SELECT *` or one giant universal profile DTO | Oversized payloads and accidental disclosure | Explicit public projection schemas and paged subresources |
| Per-row repository calls | Creates N+1 latency and connection pressure | Set-based query/bounded batch keyed by all parent IDs |
| Speculative indexes | Adds write/storage cost and may not be used | Fixture-backed `EXPLAIN (ANALYZE, BUFFERS)` evidence |
| New image optimizer/CDN | Duplicates an existing tested seam and adds cost/operations | `next/image`, exact patterns, correct `sizes`, existing media variants |
| Global `overflow-x: hidden` or wrapping escape hatches | Hides layout defects and can clip focus/content | Fix component containment, `min-width: 0`, intrinsic media sizing and container queries |

## Version Compatibility and Upgrade Boundaries

| Component | Compatibility note | Decision |
|-----------|--------------------|----------|
| Next.js `16.1.6` + Node `20.20.2` | Next.js 16 requires Node 20.9 or newer. Current runtime satisfies this. | No Node/Next upgrade in v1.3. Add the image quality allowlist and production-safe local-IP policy. |
| Next.js `16.1.6` + TypeScript `^5.7.2` | Next.js 16 requires TypeScript 5.1 or newer. | Compatible; keep lockfile resolution. |
| Go module `1.25.0` + container `go1.25.12` | Official Go policy supports a major until two newer majors exist; only 1.26 is newer as researched. | Supported. Keep current patch line; schedule Go 1.26 separately. |
| PostgreSQL `16.14` | All proposed unique/expression/partial/multicolumn index features are documented in PostgreSQL 16. | Compatible. Do not upgrade database major for this milestone. |
| Playwright `1.55.0` + installed Chromium | Pin supplies deterministic current project behavior, though it is not the newest browser bundle. | Keep for milestone reproducibility; create a separate dependency-refresh task. |
| Floating Compose image tags (`postgres:16`, `redis:7`, language minor tags) | Tags can resolve to newer patch images on rebuild. | No blocker for v1.3; if bit-for-bit UAT reproducibility is required, pin digests in a separate operational change and document the update procedure. |

## Operational Impact

- Required schema work is narrow and reversible: one stored slug plus constraint/index, and only plan-proven supporting indexes. Because rows are disposable, reset/reseed rather than write compatibility or backfill paths.
- Query consolidation reduces database round trips and payload work without introducing another service. Capture query count, response bytes, p50/p95 latency, and image bytes for both fixtures so caching is an evidence-based follow-up.
- Redis caching, if activated later, adds invalidation ownership to every mutation that changes the public projection. That cost is why it is conditional, not a phase foundation.
- Image configuration changes affect the self-hosted Next optimizer cache. Validate local/private-network image sources in Compose and confirm production cannot use unrestricted local-IP fetching.
- No new credentials, external SaaS, host installation, Docker service, or production-data migration is required.

## Evidence from the Current Repository

- `frontend/package.json`: Next 16.1.6, React 18.3.1, Vitest 3.2.4, Playwright 1.55.0, Testing Library, CSS-module application.
- `backend/go.mod`: Go 1.25.0, Gin 1.10.0, pgx/v5 5.7.1, go-redis/v9 9.7.0, Testify 1.9.0.
- `frontend/src/app/members/[slug]/page.tsx`: server-rendered route, request-local React cache, viewer token read and `no-store` profile fetch.
- `backend/internal/handlers/app_public_profile.go`: backend owner-preview decision currently occurs after repository detail loading.
- `backend/internal/repository/member_profile_repository.go`: nickname-derived slug/fallback scan and sequential detail loaders; project pagination currently re-enters the full profile loader.
- `frontend/next.config.mjs`: `next/image` is already configured with formats, sizes and patterns; quality allowlist is implicit and local-IP optimization is globally enabled.
- `docker-compose.yml` and live Compose inspection: PostgreSQL, Redis, backend, frontend, Keycloak and Mailpit are already healthy; no service gap exists.

## Sources

- [Next.js 16 installation and runtime requirements](https://nextjs.org/docs/app/getting-started/installation) - Node 20.9+ and TypeScript 5.1+ requirements; HIGH confidence.
- [Next.js Image component](https://nextjs.org/docs/app/api-reference/components/image) - `sizes`, `remotePatterns`, `qualities`, intrinsic dimensions, and the local-IP security warning; HIGH confidence.
- [Next.js 16 caching without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components) - explicit fetch caching and on-demand invalidation model; HIGH confidence.
- [React `cache`](https://react.dev/reference/react/cache) - Server Component memoization is invalidated per server request; HIGH confidence.
- [PostgreSQL 16 unique indexes](https://www.postgresql.org/docs/16/indexes-unique.html) - uniqueness enforcement; HIGH confidence.
- [PostgreSQL 16 expression indexes](https://www.postgresql.org/docs/16/indexes-expressional.html) - expression lookup capability and maintenance cost; HIGH confidence.
- [PostgreSQL 16 multicolumn indexes](https://www.postgresql.org/docs/16/indexes-multicolumn.html) - leading-column behavior and advice to use multicolumn indexes sparingly; HIGH confidence.
- [PostgreSQL 16 `EXPLAIN`](https://www.postgresql.org/docs/16/sql-explain.html) - plan, scan, join and buffer analysis; HIGH confidence.
- [pgx/v5 API documentation](https://pkg.go.dev/github.com/jackc/pgx/v5) - `QueryRow` and `SendBatch` behavior; HIGH confidence.
- [Go release history and support policy](https://go.dev/doc/devel/release) - current Go 1.25 patch history and two-release support policy; HIGH confidence.
- [Redis key expiration guidance](https://redis.io/docs/latest/develop/using-commands/keyspace/) - TTL behavior and key namespace conventions; HIGH confidence.
- [Playwright assertions](https://playwright.dev/docs/test-assertions) and [emulation](https://playwright.dev/docs/emulation) - accessible assertions and deterministic viewport/device coverage; HIGH confidence.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) - reflow, focus and target-size criteria; HIGH confidence.

---
*Stack research for Team4s v1.3 Public Member Profile Hardening*
*No application code or dependency changes were made by this research task.*
