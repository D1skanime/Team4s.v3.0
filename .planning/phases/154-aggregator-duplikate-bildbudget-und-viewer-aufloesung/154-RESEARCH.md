# Phase 154: Aggregator-Duplikate, Bildbudget und Viewer-Auflösung - Research

**Researched:** 2026-09-10
**Domain:** Brownfield bug-fix/refactor across a Go/pgx repository aggregator, Next.js 16 image
handling, and a React client-side viewer-resolution hook chain. No new libraries, no schema change,
no rewrite.
**Confidence:** HIGH (every code claim below is a direct read of the current file at the cited line;
the only MEDIUM/LOW items are the Next.js animated-image-optimizer behavior, which is corroborated
by official docs but not re-verified against this exact deployed version, and the two D-workstream
outcomes, which are unknowable until the scripts are re-run).

## Summary

This is a five-workstream, code-localized correction phase, not an exploration. For all three
"fix" workstreams (A, B, C) the exact duplicate call sites, the exact missing gate, and the exact
missing parameter already have file:line-precise evidence in the repo — the planner does not need
to search further, only decide the shape of the fix within the explicit constraints CONTEXT.md
already locked (no monster function, no blind parallelization, no new render variant, DTOs
unchanged). Workstream D is genuinely open-ended (re-run two committed measurement scripts and
report whatever the numbers say). Workstream E is almost entirely "run the already-established
project commands and report."

**Primary recommendation:** For Workstream A, hoist the four already-isolated raw-count loader
calls (`loadRoleVolumeCounts`, `loadContribProjectsCount`, `loadContribChronicleCount`,
`loadContribArchivistCount`) out of `loadRoleVolumeBadges`/`loadContributionBadges`/
`loadBadgeProgress` into the aggregator itself, call each exactly once, and change those three
functions' signatures to accept the already-loaded counts instead of re-querying. This requires
zero SQL changes, keeps the three functions' business separation, and does not touch
`GetOwnDashboard` (`member_profile_dashboard_repository.go`), which calls the same raw-count
loaders independently and must keep working unchanged. For Workstream B1, copy the exact
`{currentCode ? <hero-artwork> : <LockedStageArtwork hero />}` gate already used verbatim by three
sibling components (`ContributionAchievementStage.tsx`, `PointsAchievementStage.tsx`,
`MembershipStage.tsx`) into `AnimeProjectAchievementStage.tsx`, the only sibling missing it. For
Workstream C, the fix is two small, independent, already-scoped edits (thread an optional
`AbortSignal` through `getMemberProfile`; pass it from `useMemberViewer`'s fetcher) plus one
open architecture decision (viewer-only endpoint vs. reusing the existing SSR-resolved viewer),
for which this research found a concrete, low-risk reuse candidate already in the codebase
(`ResolvePublicMemberAccess`).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Aggregator query de-duplication (A) | API/Backend (Go repository) | Database (read-only, no schema change) | Pure repository-layer refactor; no HTTP contract change |
| Query-budget regression test (A4) | API/Backend (Go test, dedicated throwaway Postgres) | — | Existing `queryCounter` pgx tracer is test-support-only, never wired into production |
| Locked hero-artwork gating (B1) | Browser/Client (React component) | — | Pure presentational branch inside an existing `'use client'` component |
| Image fallback/byte-budget (B2/B3) | Browser/Client (`ResponsiveImage`, `next/image` config) | CDN/Static (Next.js built-in image optimizer, same-origin `/_next/image`) | No backend media-derivative service exists for this asset class (static PNGs under `public/`, real-upload avatars); the bound has to be enforced at the Next.js image-config/component layer |
| Viewer/owner resolution (C) | API/Backend (existing `ResolvePublicMemberAccess`, one cheap query) + Browser/Client (hook chain) | — | The access decision is already server-computed and already isolated from the full profile load in `member_public_access_repository.go`; the client-side gap is only that nothing exposes it without the full profile |
| AbortSignal threading (C2) | Browser/Client (`api.ts`, `useMemberViewer.ts`, `useCancellableSlugState.ts`) | — | Pure fetch-plumbing, no server change |
| Re-measurement (D1/D2) | Browser/Client (Playwright/CDP scripts run against the containerized frontend) | — | Investigation only, produces a report, not a behavior change |
| Verification/build gates (E) | API/Backend + Browser/Client + CI-equivalent local Docker | — | `docker compose build` and the ephemeral `golang:1.25-alpine` container are the only sanctioned gates per CONTEXT.md |

## Standard Stack

No new libraries are introduced by this phase. Everything below is already present and pinned in
the repo.

### Core (already in use, unchanged versions)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go | 1.25 (`backend/go.mod`) | Repository/handler layer | Existing project stack |
| `github.com/jackc/pgx/v5` | pinned in `go.mod` | Postgres driver; `pgx.QueryTracer` is the mechanism the existing query-budget test uses | Already the sole DB driver |
| Next.js | `^16.1.6` (`frontend/package.json`) | App Router, `next/image` optimizer | Existing project stack |
| React | `18.3.1` | Client hooks (`useMemberViewer`, `useCancellableSlugState`) | Existing project stack |
| Playwright | `1.55` (per REPORT.md; confirm exact pin via `frontend/package.json` at execution time) | The committed audit scripts (`frontend/scripts/audit-public-member-*.mjs`, `shot.mjs`) | Already the project's browser-automation tool for this exact measurement suite |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hoisting counts to the aggregator (A) | A shared "facts" struct built by one combined SQL query (join) | **Explicitly forbidden by CONTEXT.md A3** — a combined join risks cartesian growth across three independent count subqueries (projects/chronicle/archivist) and one grouped role-volume query; the report's own EXPLAIN evidence found no missing-index/disk-read problem that a join would fix |
| Hoisting counts to the aggregator (A) | `errgroup`-style parallel query execution | **Explicitly forbidden by CONTEXT.md A3** ("blinde Parallelisierung") — also not free: pgxpool connections are limited, and parallelizing 4 queries out of ~16 remaining ones for no measured benefit (HTTP median already 4-6ms) adds concurrency-bug surface for zero locked requirement |
| Extending the existing `LockedStageArtwork` gate pattern (B1) | A new "empty state" component | **Explicitly forbidden by CONTEXT.md B1** ("keine dritte Variante") — three siblings already share one pattern |
| Bounding the optimizer-error fallback via Next's own size ladder (B2) | A new backend thumbnail-generation service | No existing derivative-generation infra exists for this asset class (`backend/internal/services/media_service.go` only saves uploads as-is, no `imaging.Resize` call in the codebase); building one is a disproportionate new subsystem for a fallback-only path and risks becoming exactly the "neue Parallelarchitektur" CONTEXT.md forbids |
| A dedicated slim viewer endpoint (C1) | Passing the SSR-resolved `viewer` prop straight through without a second fetch | **Does not work as-is**: the SSR fetch (`page.tsx`'s `getMemberProfileForRequest`) is anonymous (no browser cookies forwarded), so `response.viewer.is_owner` from SSR is always `false` even for the real owner — a fresh authenticated resolution is unavoidable; the only question is whether that resolution loads the *full* profile or just the access decision |

## Package Legitimacy Audit

Not applicable — this phase installs zero new packages (frontend or backend). All libraries used
are already present, pinned, and in production use elsewhere in the codebase. No `slopcheck`/
registry verification is required.

## Architecture Patterns

### System Architecture Diagram (Workstream A: current vs. recommended query flow)

```
CURRENT (13 sequential top-level calls, 4 hidden duplicate sub-queries):

GetPublicMemberProfileByID(memberID)
  |
  +-- base profile row (1 query)
  +-- loadMemberships                        (N queries)
  +-- loadPublicBadges                       (1 query)
  +-- loadRoleVolumeBadges
  |     +-- loadRoleVolumeCounts             (1 query)   <-- #A, duplicated below
  +-- loadContributionBadges
  |     +-- loadContribProjectsCount         (1 query)   <-- #B, duplicated below
  |     +-- loadContribChronicleCount        (1 query)   <-- #C, duplicated below
  |     +-- loadContribArchivistCount        (1 query)   <-- #D, duplicated below
  +-- loadTotalPoints                        (1 query)
  +-- loadBadgeProgress
  |     +-- (project count, own query)       (1 query)
  |     +-- loadContribProjectsCount         (1 query)   <-- #B AGAIN (duplicate)
  |     +-- loadContribChronicleCount        (1 query)   <-- #C AGAIN (duplicate)
  |     +-- loadContribArchivistCount        (1 query)   <-- #D AGAIN (duplicate)
  |     +-- (membership-years, own query)    (1 query)
  |     +-- loadRoleVolumeCounts             (1 query)   <-- #A AGAIN (duplicate)
  +-- loadCurrentProjects + batch versions   (2 queries, batched since 131-03)
  +-- countCurrentProjects                   (1 query)
  +-- loadKnownFor                           (1 query)
  +-- loadLatestContributions                (1 query)
  +-- loadPreviousContributions              (1 query)
  = 20 queries with >=1 project, 19 without (matches REPORT.md exactly)

RECOMMENDED (facts loaded once, derived twice):

GetPublicMemberProfileByID(memberID)
  |
  +-- base profile row (1 query)
  +-- loadMemberships                        (N queries, unchanged)
  +-- loadPublicBadges                       (1 query, unchanged)
  +-- roleVolumeCounts    := loadRoleVolumeCounts(memberID)        (1 query, ONCE)
  +-- contribCounts       := {projects, chronicle, archivist}      (3 queries, ONCE)
  +-- loadRoleVolumeBadges(roleVolumeCounts)        -- pure derivation, 0 queries
  +-- loadContributionBadges(contribCounts)         -- pure derivation, 0 queries
  +-- loadTotalPoints                        (1 query, unchanged)
  +-- loadBadgeProgress(contribCounts, roleVolumeCounts, totalPoints)
  |     +-- (project count, own query -- distinct metric, NOT a duplicate) (1 query)
  |     +-- (membership-years, own query)                                  (1 query)
  +-- loadCurrentProjects + batch versions   (2 queries, unchanged)
  +-- countCurrentProjects                   (1 query, unchanged)
  +-- loadKnownFor                           (1 query, unchanged)
  +-- loadLatestContributions                (1 query, unchanged)
  +-- loadPreviousContributions              (1 query, unchanged)
  = 16 queries with >=1 project, 15 without (4 fewer; update phase131ConstantQueryBudget 20 -> 16)

GetOwnDashboard (member_profile_dashboard_repository.go) -- SEPARATE request path, UNTOUCHED:
  calls loadContribProjectsCount / loadContribChronicleCount / loadContribArchivistCount /
  loadRoleVolumeCounts directly and independently. These four raw-count functions' SIGNATURES
  must stay (ctx, memberID) -> (int64/[]RoleVolumeCount, error) so this caller keeps compiling
  and behaving identically.
```

**IMPORTANT — do not conflate two different "project count" queries.** `loadBadgeProgress`'s very
first query (`member_profile_progress_repository.go:66-73`, counting `DISTINCT ac.anime_id` from
`anime_contributions` where `is_public_on_member_profile = true`) is **not** one of the four
duplicate pairs. It is a materially different metric (public-profile-visible project count for the
"progress" badge family) from `loadContribProjectsCount`'s "fully-carried project" count (Familie 1
/ "contribution_projects"). Do not merge these two — CONTEXT.md's A5 (DTOs/visibility must stay
identical) depends on keeping them distinct.

### Component Responsibilities (Workstream A)

| File | Function | Current role | Change needed |
|------|----------|---------------|----------------|
| `backend/internal/repository/member_profile_public_repository.go:42-170` | `GetPublicMemberProfileByID` | Issues 13 sequential top-level loader calls, lines 116-159 | Call the 4 raw-count loaders ONCE here; pass results into the 3 consumers |
| `backend/internal/repository/member_profile_role_volume_repository.go:35-61` | `loadRoleVolumeCounts` | Raw per-role count query | **Unchanged signature** — also called directly by `GetOwnDashboard` |
| `backend/internal/repository/member_profile_role_volume_repository.go:117-139` | `loadRoleVolumeBadges` | Calls `loadRoleVolumeCounts` internally, then derives badges | Change to accept `[]RoleVolumeCount` as a parameter instead of calling the loader itself |
| `backend/internal/repository/member_profile_contribution_badges_repository.go:68-105,111-129,134-148` | `loadContribProjectsCount`/`loadContribChronicleCount`/`loadContribArchivistCount` | Three independent raw-count queries | **Unchanged signatures** — also called directly by `GetOwnDashboard` and by `loadBadgeProgress` |
| `backend/internal/repository/member_profile_contribution_badges_repository.go:158-216` | `loadContributionBadges` | Calls all three count functions internally, derives 3 badges | Change to accept the three counts as parameters instead of calling the loaders itself |
| `backend/internal/repository/member_profile_progress_repository.go:64-153` | `loadBadgeProgress` | Calls `loadContribProjectsCount`/Chronicle/Archivist AND `loadRoleVolumeCounts` again, plus 2 genuinely-unique queries (progress project count, membership years) | Change to accept the pre-loaded counts as parameters; keep its own two unique queries |
| `backend/internal/repository/member_profile_dashboard_repository.go:202-215` | `GetOwnDashboard` (uses the same 4 raw-count functions) | Independent caller, separate HTTP endpoint | **Do not touch** — verify with a full-suite run that it still compiles/passes after the raw-count function signatures are confirmed unchanged |

### Pattern: Locked hero-artwork gate (Workstream B1)

**What:** Three of four "achievement stage" sibling components gate their hero artwork behind
`currentCode` (derived from `family.currentStage?.badge_code ?? null`); the fourth
(`AnimeProjectAchievementStage.tsx`) does not, so it falls through to `family.heroStage`, which
resolves to the first *unearned* stage when nothing is earned yet (`heroStage = currentStage ??
nextStage ?? stages[0]` in `memberBadgeFamilies.ts:333`).

**When to use:** Any "achievement stage" hero rendering where zero-progress is a valid state.

**Example (existing pattern, verbatim from `ContributionAchievementStage.tsx:65-81`):**
```tsx
// Source: frontend/src/components/profile/ContributionAchievementStage.tsx
<span data-contribution-art={heroStage.badge_code}>
  {currentCode ? (
    descriptor ? (
      <AchievementArtwork
        descriptor={descriptor}
        badgeCode={heroStage.badge_code}
        alt={heroStage.label}
        size="hero"
        className={...}
      />
    ) : (
      <presentation.Icon size={96} aria-label={heroStage.label} />
    )
  ) : (
    <LockedStageArtwork hero />
  )}
</span>
```

**The bug, verbatim from `AnimeProjectAchievementStage.tsx:24-27,50-62`:**
```tsx
// currentCode IS already computed here but never used to gate the hero:
const currentCode = family.currentStage?.badge_code ?? null
const selectedStage = family.stages.find(...)
const heroStage = selectedStage ?? family.heroStage   // no currentCode check
...
<span data-anime-project-art={heroStage.badge_code}>
  {descriptor ? (
    <AchievementArtwork descriptor={descriptor} badgeCode={heroStage.badge_code} ... />
  ) : (
    <presentation.Icon size={96} aria-label={heroStage.label} />
  )}
</span>
```
The fix is to wrap this exact block in `{currentCode ? (...) : <LockedStageArtwork hero />}`,
mirroring the sibling verbatim. `PointsAchievementStage.tsx:50-67` and `MembershipStage.tsx:44-58`
confirm this is a 3-of-4 established convention, not a one-off.

### Pattern: `ResponsiveImage`'s current fallback (Workstream B2) — exact current code
```tsx
// Source: frontend/src/components/ui/ResponsiveImage.tsx (current, unmodified)
export function ResponsiveImage({ src, alt, onError, ...props }: ResponsiveImageProps) {
  const [failedOptimizedSource, setFailedOptimizedSource] = useState<string | null>(null)
  const usingDisplayOriginal = failedOptimizedSource === src

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      unoptimized={usingDisplayOriginal}   // <-- on ANY optimizer error, bypasses ALL resizing
      onError={(event) => {
        onError?.(event)
        setFailedOptimizedSource((failedSource) => failedSource === src ? failedSource : src)
      }}
    />
  )
}
```
`unoptimized={true}` makes `next/image` render the literal `src` with no `srcset`, no resize, no
format conversion — the full original bytes at native resolution, constrained only by the CSS box
(no layout shift, since `width`/`height` are always fixed at 1254×1254 in `AchievementArtwork.tsx`
regardless of fallback state — the "kein Geometriesprung" requirement is therefore already
structurally satisfied by the existing fixed `width`/`height` attributes; only the *byte budget* of
the fallback path is the open problem).

**No backend-generated size-limited derivative exists for this asset class.** A repo-wide search of
`backend/internal/services/media_service.go` (the only media-processing service) found no
`imaging.Resize`/thumbnail-generation call — uploads are saved as-is
(`SaveUpload`/`SaveUploadSourceOriginal`). Some *other* domains (`release_asset.go`,
`episode_version_image.go`, `group_assets.go`, `fansub.go`, `member_profile.go`) carry a
`ThumbnailURL` field, but these are pre-existing admin-curated release/episode/group media, not the
badge-artwork PNGs under `frontend/public/member-achievement-badges/` (static build assets) nor the
avatar/background uploads this bug concerns. **The most plausible reading of CONTEXT.md's
"vorhandene, größenbegrenzte Medien-Derivate"** is Next.js's own configured size ladder
(`next.config.mjs`'s `images.deviceSizes`/`images.imageSizes`, already `[64, 96, 128, 160, 192, 256,
512]`/`[640, 1080, 1480, 1920]`), reached through the *same-origin* `/_next/image` optimizer
endpoint — i.e., the fix direction is almost certainly "on optimizer failure, do not disable
optimization entirely; keep serving through a small, fixed derivative size" rather than building a
new backend thumbnail pipeline. This is presented as the strongest available reading, not a locked
fact — the planner should confirm this interpretation is workable given `unoptimized` is currently
the *only* documented Next.js escape hatch for an optimizer failure (see Open Questions).

### Pattern: animated-avatar budget (Workstream B3) — root cause and existing precedent

**Root cause [CITED: nextjs.org/docs/app/api-reference/components/image]:** Next.js's built-in
image loader auto-detects animated GIF/APNG/WebP and *bypasses optimization entirely*, serving the
original file as-is regardless of the requested `w=` parameter — this is documented, intentional
Next.js behavior ("best-effort" auto-detection), not a bug in this codebase. It exactly explains the
report's finding: an animated WebP avatar requested at `w=160` returns 412,249 bytes (~equal to the
411,828-byte original) instead of a resized derivative.

**Existing precedent already in this exact component** — `MemberProfileHero.tsx:107,175-184`:
```tsx
// Source: frontend/src/components/profile/MemberProfileHero.tsx (current, unmodified)
const isAnimatedAvatar = /\.gif(?:$|\?)/i.test(avatarURL)
...
{avatarURL && isAnimatedAvatar ? (
  <Image src={avatarURL} alt={...} width={140} height={140}
    sizes="(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px"
    loading="eager" unoptimized />              // <-- explicit escape hatch, GIF only
) : avatarURL ? (
  <ResponsiveImage src={avatarURL} alt={...} width={140} height={140}
    sizes="(max-width: 760px) 100px, (max-width: 1099px) 120px, 140px" loading="eager" />
) : ( ... )}
```
The codebase **already has a working "animated avatar gets special handling" branch** — it just
only detects `.gif` by file extension, not animated `.webp` (which has no reliable extension-based
signal; WebP animation is a container-internal property, not visible in the URL). This is the
concrete precedent the planner should extend or replace, per CONTEXT.md's "welcher Weg gewählt
wird, ist zu begründen" (B3 is Claude's Discretion). Plausible directions, none locked:
1. Broaden `isAnimatedAvatar` detection beyond file extension (requires either a server-reported
   flag alongside the avatar URL, or a client-side WebP RIFF/ANIM-chunk probe).
2. Apply a byte-size cap at upload/serving time regardless of animation status.
3. A format/frame-reduction policy at upload time (convert to a static poster frame plus a
   separate "animated" opt-in).
Each has different cost/complexity; whichever is chosen, the reasoning must be documented (B3
requirement).

### Pattern: viewer resolution without a second full-profile fetch (Workstream C1)

**Exact current data flow, confirmed by reading the files:**
- `page.tsx` (SSR): fetches the full profile **anonymously** (no browser cookies forwarded to the
  server-side fetch), producing an always-`is_owner: false` `viewer` — passed to
  `MemberProfileContent` as `viewer` with **no** `viewerResolved` prop (defaults to `false`).
- `OwnProfileEditLink.tsx`: when `!viewerResolved && hasAuthSession`, calls
  `useMemberViewer(storedSlug, { enabled: ... })`, which always fetches the **full**
  `PublicMemberProfileResponse` via `getMemberProfile(slug)` — even though this caller only ever
  reads `response.viewer.is_owner`.
- `OwnHiddenProfilePreview.tsx`: the **other** consumer of `useMemberViewer`, which genuinely needs
  the full profile (`response.data`) to render `MemberProfileContent` for the owner's own
  private-preview path with `viewerResolved` forced to `true`.

**A concrete, already-existing lightweight access resolver exists and is reused elsewhere:**
`backend/internal/repository/member_public_access_repository.go`'s `ResolvePublicMemberAccess`
(one single query joining `members`+`member_claims`, already gated by `authOptionalMiddleware` via
the handler helper `resolvePublicMemberAccess` in `public_member_access.go`) is the SAME function
`GetPublicMemberProfile`'s public-only compatibility wrapper calls before loading the full profile
(`member_profile_public_repository.go:29`), and is already independently reused by
`AppPublicProfileHandler.GetPublicMemberProfile`/`GetPublicMemberProjects` and
`ProjectMemberPublicHandler`. **No new SQL is required** to expose a viewer-only decision; only a
new thin handler route (e.g. `GET /api/v1/members/:slug/viewer`) reusing the existing resolver
would be needed if the planner chooses "separater schlanker Endpunkt" over "vorhandene Information
weiterreichen." This is presented as evidence for the discretionary decision, not a locked choice —
CONTEXT.md leaves the exact mechanism to the planner.

### Pattern: AbortSignal threading (Workstream C2) — exact current signatures

```ts
// Source: frontend/src/hooks/useCancellableSlugState.ts:14-21 (unchanged, the CONTRACT)
export interface UseCancellableSlugStateOptions<T> {
  requestKey: string
  enabled: boolean
  fetcher: (signal: AbortSignal) => Promise<T>   // hook ALREADY calls fetcher(controller.signal)
}
```
```ts
// Source: frontend/src/lib/useMemberViewer.ts:53-56 (current, unmodified -- the bug)
const fetcher = useCallback(
  () => getMemberProfile(slug as string),   // signal parameter dropped entirely
  [slug],
)
```
```ts
// Source: frontend/src/lib/api.ts:3178-3202 (current, unmodified -- the bug)
export async function getMemberProfile(
  slug: string,
): Promise<PublicMemberProfileResponse> {
  const encodedSlug = encodeURIComponent(slug);
  const response = await apiClientFetch(
    `/api/v1/members/${encodedSlug}`,
    { cache: "no-store" },          // no signal passed through
  );
  ...
}
```
`apiClientFetch`'s options type, `AuthorizedRequestOptions` (`api.ts:446`), already
`extends Omit<RequestInit, "headers">` — `RequestInit.signal` is therefore **already accepted and
already threaded through** to the native `fetch()` call inside `authorizedFetch` (`api.ts:1413-`,
via `...init` spread at line 1430-1433). **No change to `apiClientFetch` or `authorizedFetch` is
needed** — only `getMemberProfile` needs a new optional 2nd parameter, and `useMemberViewer`'s
fetcher needs to accept and forward the signal `useCancellableSlugState` already provides:
```ts
// Minimal fix shape (illustrative, not prescriptive):
export async function getMemberProfile(
  slug: string,
  signal?: AbortSignal,
): Promise<PublicMemberProfileResponse> {
  const response = await apiClientFetch(`/api/v1/members/${encodeURIComponent(slug)}`,
    { cache: "no-store", signal });
  ...
}
```
```ts
const fetcher = useCallback(
  (signal: AbortSignal) => getMemberProfile(slug as string, signal),
  [slug],
)
```
**Three existing callers of `getMemberProfile`** were found via repo-wide grep — verify none
break:
1. `frontend/src/lib/useMemberViewer.ts:54` — gains the signal (this fix's target).
2. `frontend/src/app/members/[slug]/page.tsx:46` — SSR `cache()`-wrapped call, no abort signal
   available/needed there; leaving the 2nd parameter `undefined` is correct and requires no change.
3. `frontend/src/lib/api.auth-refresh.test.ts:325` — existing test calling
   `getMemberProfile('canonical-owner')` with no signal; an **optional** parameter keeps this
   compiling unchanged (this is exactly why C2 specifies "optional").

**PMFE-10 fail-closed invariant, quoted verbatim from the comment already in
`useMemberViewer.ts:64-68`:**
> "PMFE-10 (fail-closed): solange der Request deaktiviert, noch offen (`loading`/`idle`) oder durch
> einen neueren requestKey überholt ist, darf der Status NIEMALS `'resolved'` melden. Owner-only UI
> (Edit-Link, Privat-Vorschau-Banner) darf sich ausschließlich auf ein positives, schlüsselgleiches
> `'resolved'` verlassen — ein hängender oder veralteter Request muss als "noch nicht bekannt" (also
> faktisch: nicht Owner) behandelt werden."

This invariant is enforced structurally by the `if (!canFetch || state.key !== requestKey ||
state.status === 'loading' || state.status === 'idle')` guard at line 69 — adding the signal
parameter does not touch this guard and must not be allowed to weaken it. The fetcher stays
memoized on `slug` alone (line 50-52's comment explains why: a fresh function identity per render
would re-trigger the effect and self-abort forever) — adding a signal parameter to the fetcher's
own signature does not change its memoization dependency array, so the existing anti-infinite-loop
protection is unaffected by this change, but should be explicitly re-verified by the existing test
`useMemberViewer.test.ts` suite (8 existing test cases already cover disabled/null-slug/in-flight/
stale-requestKey/404/error/retry scenarios — extend, do not replace).

### Anti-Patterns to Avoid
- **Do not** change `loadRoleVolumeCounts`/`loadContribProjectsCount`/`loadContribChronicleCount`/
  `loadContribArchivistCount`'s signatures — `GetOwnDashboard` depends on the current
  `(ctx, memberID) -> (value, error)` shape.
- **Do not** merge `loadContributionBadges` and `loadBadgeProgress` into one function — explicitly
  forbidden (A2), and the "Fachliche Trennung" (badges = awarded, progress = ladder-toward-next) is
  a real, tested distinction, not accidental duplication.
- **Do not** treat `loadBadgeProgress`'s own project-count query (`is_public_on_member_profile`
  filter) as a fifth duplicate of `loadContribProjectsCount` — they measure different things.
- **Do not** widen `unoptimized` as the fallback's replacement mechanism (that IS the current bug);
  any bounded-fallback design must still cap bytes, not just avoid a second network round-trip.
- **Do not** let a viewer-only endpoint (if chosen for C1) duplicate `ResolvePublicMemberAccess`'s
  SQL — reuse the existing repository method and handler helper.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Counting SQL round-trips in a test | A new query-logging wrapper | `backend/internal/repository/query_counter.go`'s `queryCounter` (`pgx.QueryTracer`), already wired into `member_profile_query_budget_test.go` via `pgxpool.Config.ConnConfig.Tracer` | Test-support-only, already proven, already the exact mechanism CONTEXT.md's A4 requires ("vorhandene Query-Counter-Infrastruktur") |
| Locked/gated achievement artwork | A new empty-state component | `LockedStageArtwork` (`achievementStageHelpers.tsx:60-106`) | Already the shared pattern for 3 of 4 sibling stage components; CONTEXT.md B1 explicitly forbids a third variant |
| Determining owner/viewer access | A new authorization query | `ResolvePublicMemberAccess` (`member_public_access_repository.go:28`) | Already the single source of truth for this decision, already reused by 3 other handlers |
| Bounded image derivatives | A new backend thumbnail service | Next.js's existing `images.deviceSizes`/`images.imageSizes` config + same-origin `/_next/image` optimizer | No derivative-generation service exists for this asset class; building one is a disproportionate new subsystem for a fallback path |

**Key insight:** Every "fix" in this phase already has a working sibling/precedent elsewhere in the
codebase (a shared counter, a shared locked-artwork component, a shared access resolver, a shared
animated-image special-case). The work is almost entirely "apply the existing pattern to the one
place that's missing it," not "invent something new."

## Runtime State Inventory

Not applicable — this is a bug-fix/refactor phase with no rename, rebrand, or migration of any
identifier, table, key, or external service configuration. No stored data, live service config,
OS-registered state, secret/env-var name, or build artifact references the concepts being changed
(query count, image gating logic, or AbortSignal wiring) by name in a way a rename would affect.

## Common Pitfalls

### Pitfall 1: Breaking `GetOwnDashboard` while de-duplicating the aggregator
**What goes wrong:** Changing the raw-count loader functions' signatures (adding a "context" struct
parameter, for instance) to make the aggregator's job easier silently breaks
`member_profile_dashboard_repository.go`'s three independent call sites.
**Why it happens:** `loadContribProjectsCount`/Chronicle/Archivist/`loadRoleVolumeCounts` are used
by TWO unrelated top-level Go functions (`GetPublicMemberProfileByID` and `GetOwnDashboard`), and
it is easy to see only the aggregator call sites while refactoring.
**How to avoid:** Keep the four raw-count functions' signatures byte-for-byte unchanged; change only
the three *consumer* functions (`loadRoleVolumeBadges`, `loadContributionBadges`,
`loadBadgeProgress`) to accept pre-loaded values as parameters.
**Warning signs:** `go build ./...` failing in `member_profile_dashboard_repository.go`, or a full
backend test run showing failures unrelated to the touched files.

### Pitfall 2: Conflating `loadBadgeProgress`'s own project-count query with `loadContribProjectsCount`
**What goes wrong:** Treating `member_profile_progress_repository.go:66-73`'s
`is_public_on_member_profile`-filtered project count as a fifth duplicate and removing/merging it.
**Why it happens:** Both queries count "projects for this member" and sit right next to the three
genuine duplicates in the same function.
**How to avoid:** Confirm the WHERE clause and table before touching any query — `anime_contributions
WHERE status='confirmed' AND is_public_on_member_profile=true` (progress family) is structurally
different from the "fully carried project" CTE join in `loadContribProjectsCount`.
**Warning signs:** The "progress" badge family's `current_count` changing value after the refactor
for a member with both "some public contributions" and "some fully-carried projects" that differ in
count.

### Pitfall 3: Assuming `unoptimized` is the only Next.js fallback lever
**What goes wrong:** Spending effort trying to make `ResponsiveImage` retry through a different
Next.js prop that doesn't exist, instead of controlling the *requested width* or *quality* on
fallback.
**Why it happens:** The Next.js `<Image>` API surface for "optimizer failed, now what" is narrow;
`unoptimized` is the only documented escape hatch for bypassing the optimizer, and there is no
built-in "retry at smaller size" prop.
**How to avoid:** Any bounded-fallback design likely needs to construct a new, smaller `src`
manually (e.g., request the optimizer's own endpoint with an explicit small `w=`/`q=` before
falling back further, or serve a known-small static placeholder for badge artwork specifically) —
verify feasibility against the *reason* the optimizer failed in the report's test (deliberately
blocked network request), not against a real production failure mode that hasn't been observed.
**Warning signs:** A fallback design that still transfers >1MB in the worst case, or one that
retries indefinitely (explicitly forbidden by B2).

### Pitfall 4: Weakening the PMFE-10 fail-closed guard while adding the signal parameter
**What goes wrong:** Refactoring `useMemberViewer`'s fetcher/memoization touches the same function
body as the fail-closed status guard three lines below it; an incautious edit could accidentally
loosen the `state.key !== requestKey` check.
**Why it happens:** Both concerns (signal threading, fail-closed gating) live in the same ~40-line
file and are easy to touch together.
**How to avoid:** Change only the `fetcher` `useCallback` body (add the signal parameter and forward
it); do not touch the `if (!canFetch || state.key !== requestKey || ...)` block at all. Run the
existing 8-case `useMemberViewer.test.ts` suite unchanged first (should stay green with zero source
changes needed to the tests themselves, since none of them inspect signal-forwarding) then add new
signal-specific assertions.
**Warning signs:** Any existing `useMemberViewer.test.ts` case (especially "never reports resolved
while the request is still in flight" / "never reports resolved for a stale (superseded)
requestKey") failing after the change.

### Pitfall 5: Retry-loop interaction between `authorizedFetch`'s network retry and AbortSignal
**What goes wrong:** `authorizedFetch` (`api.ts:1413-1451`) has its own idempotent-request retry
loop on network errors (`NETWORK_RETRY_DELAYS_MS`); an aborted request throws an `AbortError`,
which may or may not be classified as `isFetchNetworkError` and therefore may or may not be
(incorrectly) retried after cancellation.
**Why it happens:** The retry loop and the new signal-forwarding path are independent pre-existing
mechanisms that have never previously interacted for this call site (since `getMemberProfile` never
passed a signal before).
**How to avoid:** Verify (via a new or existing test) that an aborted `getMemberProfile` call does
not trigger a spurious retry inside `authorizedFetch`, and that `useCancellableSlugState`'s own
`isAbortError` check (which already correctly ignores `AbortError` at the hook level) is not
fighting a lower-level retry.
**Warning signs:** A superseded request's network traffic continuing after the component unmounts
or the slug changes, visible via the network panel in a Playwright audit run.

## Code Examples

### The four duplicate pairs, cited exactly (Workstream A / P154-01)
```
Pair 1 (Rollen-Volumen): loadRoleVolumeCounts called at
  member_profile_role_volume_repository.go:118 (inside loadRoleVolumeBadges)
  AND member_profile_progress_repository.go:114 (inside loadBadgeProgress)

Pair 2 (Contribution-Projekte): loadContribProjectsCount called at
  member_profile_contribution_badges_repository.go:161 (inside loadContributionBadges)
  AND member_profile_progress_repository.go:74 (inside loadBadgeProgress)

Pair 3 (Chronik): loadContribChronicleCount called at
  member_profile_contribution_badges_repository.go:179 (inside loadContributionBadges)
  AND member_profile_progress_repository.go:78 (inside loadBadgeProgress)

Pair 4 (Archivist): loadContribArchivistCount called at
  member_profile_contribution_badges_repository.go:197 (inside loadContributionBadges)
  AND member_profile_progress_repository.go:82 (inside loadBadgeProgress)
```

### Query-budget test to update (Workstream A / P154-03)
```go
// Source: backend/internal/repository/member_profile_query_budget_test.go:158-168 (current)
// phase131ConstantQueryBudget is the enforced constant number of SQL queries a single
// public-profile load issues, INDEPENDENT of the member's current-project count. ...
const phase131ConstantQueryBudget = 20
```
After removing the 4 duplicate queries, both the few-project and many-project measured counts drop
by 4 (the removed queries are fixed-base loaders, not per-project), so
`TestPhase131PublicProfileQueryBudgetIsConstant`'s `require.Equalf(fewCount, manyCount, ...)`
assertion continues to hold, and `phase131ConstantQueryBudget` should become **16**. This must be
run against the dedicated fixture DB (env `TEAM4S_PHASE131_TEST_DSN`, database name must match
`^team4s_phase131_test(?:_[a-z0-9]+)?$` — the test fails closed otherwise) — it is currently
`t.Skip()`-guarded when that env var is unset, so a plain `go build`/`go vet` will not exercise it.

### Backend Go test invocation (Workstream E, exact working pattern from prior phases)
```bash
# Source: .planning/phases/143-.../143-VALIDATION.md "Backend DSN-gated run" (documented, reused
# pattern also seen in 129-VERIFICATION.md, 130-02-PLAN.md, 142-UAT.md, 144-02-SUMMARY.md).
# DSN database name is swapped from the backend container's own DATABASE_URL
# (postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_v2?sslmode=disable)
# to the dedicated phase-131 throwaway fixture DB used by the query-budget test.
docker run --rm --network team4s_default \
  -v /home/d1sk/team4s:/workspace \
  -v team4s-phase154-go-mod:/go/pkg/mod \
  -v team4s-phase154-go-build:/root/.cache/go-build \
  -w /workspace/backend \
  -e TEAM4S_PHASE131_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase131_test?sslmode=disable' \
  golang:1.25-alpine go test ./internal/repository/... -run 'Phase131' -count=1
```
Do not trust `.env`'s `POSTGRES_PASSWORD` value directly (CONTEXT.md E3 explicitly flags it as
wrong) — derive the password from the already-running backend container's own `DATABASE_URL`
(`docker compose exec team4sv30-backend printenv DATABASE_URL` or equivalent), consistent with the
password shown in the four prior-phase docs above.

### Frontend test/build gates (exact scripts, confirmed in `frontend/package.json`)
```bash
# Full suite (Vitest)
docker compose exec -T team4sv30-frontend sh -c "cd /app && npm test"      # "vitest run"
# Typecheck
docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run typecheck"   # "tsc --noEmit"
# Lint
docker compose exec -T team4sv30-frontend sh -c "cd /app && npm run lint"        # "eslint ."
# Production build gate -- MUST be docker compose build, NOT npm run build directly
# (CONTEXT.md E2: exec ... npm run build reports false prerender errors from a dirty .next volume)
docker compose build
```

### Measurement scripts (Workstream D/E, reuse verbatim — do not rewrite)
```bash
# RCA-07 re-measurement (D1): reuses audit-public-member-performance.mjs's React-DevTools-hook
# commit counter (window.__rca.commits, populated by onCommitFiberRoot) under the SAME production
# throttling profile the original report used ("production-slow4g-cpu4" naming convention implies
# AUDIT_SLOW=1 AUDIT_CPU=4 against a production build container, not DEV).
AUDIT_LABEL=154-d1-after AUDIT_SLOW=1 AUDIT_CPU=4 AUDIT_ROUTES=members/timer,members/kara \
  node scripts/audit-public-member-performance.mjs
# Inspect the written /tmp/public-member-rca/<id>.json's evidence.commits array: count leading
# entries with changed===0 (no named component changed) before the first entry with names!={}.

# D2 (listener remainder): reuses audit-public-member-navigation-retention.mjs, identical
# invocation to 153-07's own after-measurement (see 153-AFTER.md's RCA-01 section for the exact
# command and env vars already used: AUDIT_LABEL, AUDIT_CYCLES=12|50).
docker compose exec -T -e AUDIT_LABEL=154-d2-cycles50 -e AUDIT_CYCLES=50 team4sv30-frontend \
  node scripts/audit-public-member-navigation-retention.mjs

# Visual proof (E7): shot.mjs, Playwright-in-container only -- the embedded browser panel's
# post-scroll white screenshots are a documented tool artifact, NOT valid evidence either way.
docker compose exec -T team4sv30-frontend node scripts/shot.mjs
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Per-project-card N+1 query in `loadCurrentProjects` | Single batched read | Phase 131-03 | Query budget went from `~base+N` to a flat constant (20) — this phase further reduces that constant to 16 by removing the 4 duplicate pairs, using the exact same "hoist and reuse the existing test" pattern |
| `role_entry_*` badges computed by an independent `release_role_credit_lifecycles` scan inside `loadPublicBadges` | Computed once inside `loadRoleVolumeBadges` alongside the tier badge | Phase 150, Plan 04 (D-10) | Precedent for "compute once, derive multiple representations" already exists in this exact file family |
| Threshold numbers hardcoded per-repository-file | Centralized in `backend/internal/badges` registry | Phase 150 | The count/derivation split this phase performs does not touch threshold values at all — `badges.RoleVolume`/`ContributionProjects`/etc. remain the single source, unaffected by hoisting the count queries |

**Deprecated/outdated:** None relevant — no dependency version bumps or deprecated API usage is in
scope for this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js's animated-image auto-detection (bypassing optimization for GIF/APNG/WebP) applies to this exact deployed version (`^16.1.6`) and explains the `timer` avatar's unresized `w=160` transfer | Pattern: animated-avatar budget (B3) | If the real cause is something else (e.g., a caching layer, a CDN passthrough, or a config flag), the chosen B3 mechanism could target the wrong layer; verify by testing a `w=160` request against the animated avatar in a fresh browser context before committing to a fix direction |
| A2 | "vorhandene, größenbegrenzte Medien-Derivate" (CONTEXT.md B2) refers to Next.js's own `deviceSizes`/`imageSizes` config reached via `/_next/image`, not a not-yet-found backend thumbnail service | Pattern: `ResponsiveImage`'s fallback (B2) | If a backend derivative service exists elsewhere unfound by this research's targeted greps, the recommended direction would be incomplete; a broader `grep -r "Resize\|thumbnail" backend/` at plan time is cheap insurance |
| A3 | Removing the 4 duplicate queries changes the constant-query-budget test's asserted value from 20 to exactly 16 (not some other number) | Code Examples: query-budget test | If any of the 4 "duplicate" queries is not perfectly identical in WHERE-clause/parameters to its pair (verified by reading both call sites' source, but not by running the test), the actual delta could differ; the test itself (once run against `TEAM4S_PHASE131_TEST_DSN`) is the ground truth, not this document |
| A4 | A new slim `/api/v1/members/:slug/viewer` endpoint reusing `ResolvePublicMemberAccess` is a lower-risk direction than reusing the full-profile fetch for Workstream C1 | Pattern: viewer resolution (C1) | This is explicitly Claude's Discretion per CONTEXT.md — the planner may reasonably choose the alternative (document why the full fetch is acceptable for both callers) instead; presented as one well-evidenced option, not a locked decision |

## Open Questions

1. **What exact byte/behavior budget should the bounded image fallback (B2) enforce?** (RESOLVED — see Plan 154-03)
   - What we know: the current `unoptimized` fallback delivers unbounded original bytes (up to
     2.92MB for the two `first_contribution` PNGs in the reported test); the fixed `width`/`height`
     props already prevent layout shift regardless of fallback state.
   - What's unclear: whether "bounded" means "cap at the smallest configured `imageSizes` entry
     (64px)" or "cap at a specific KB budget" or "retry once through the optimizer's own endpoint at
     a smaller explicit width before falling back to `unoptimized`."
   - Recommendation: the planner should pick one bound and write a regression test asserting the
     worst-case transferred bytes for a deliberately-blocked-optimizer scenario stays under a
     concrete, named ceiling (mirroring the report's own methodology of "blockiertem Optimizer"
     testing via `Network.setBlockedURLs`, already demonstrated in
     `audit-public-member-performance.mjs`'s `AUDIT_FAIL_BADGES` env var).

2. **Does the query-budget test's fixture database (`team4s_phase131_test`) still exist and match
   the current schema, or does it need re-seeding for this phase's re-run?** (RESOLVED — see Plan 154-01)
   - What we know: `TEAM4S_PHASE131_TEST_DSN`-gated tests `t.Skip()` cleanly when unset, and the
     fixture reset (`resetPhase131Fixtures`) runs automatically inside `openPhase131Postgres`.
   - What's unclear: whether the throwaway DB still exists on `team4s-linux` from Phase 131/132/150
     or needs fresh creation (`CREATE DATABASE team4s_phase131_test` + schema-only `pg_dump` restore
     per the file's own header comment).
   - Recommendation: verify DB existence as an early plan-execution step, not an assumption.

3. **Should the D1 (RCA-07) and D2 (listener) re-measurements run against DEV or the isolated
   production-diagnostic build?** (RESOLVED — see Plan 154-05)
   - What we know: REPORT.md's original RCA-07 numbers were captured "unter Produktionsdrosselung"
     (production throttling) using `production-slow4g-cpu4`-labeled runs; 153-AFTER.md's RCA-01
     re-measurement instead used DEV-mode runs and explicitly noted the before/after comparison
     crosses environments (production baseline vs. DEV re-measurement), while separately confirming
     via `153-01-SUMMARY.md` that the DEV numbers independently corroborate the correction.
     REPORT.md's original isolated production-diagnostic container used
     `typescript.ignoreBuildErrors=true` and is explicitly labeled "keine Release-Freigabe."
   - What's unclear: whether Phase 154 should reconstruct an isolated production-diagnostic
     container (matching REPORT.md's original methodology exactly) for D1, or follow 153-AFTER.md's
     precedent of using DEV + `docker compose build` as the production gate without a diagnostic
     container.
   - Recommendation: follow the 153-AFTER.md precedent (DEV re-measurement + `docker compose build`
     as the separate release gate) for consistency with the immediately-preceding phase's own
     documented methodology, and state explicitly which mode was used — this is squarely within
     "Format und Tiefe der D1/D2-Nachmessungsdokumentation" (Claude's Discretion).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Compose | All verification (E1-E3) | Assume ✓ (per CLAUDE.md canonical environment) | — | none — blocking if unavailable |
| `team4s_default` compose network | Backend Go test container | Assume ✓ (used by 4 prior phases' documented commands) | — | none |
| `golang:1.25-alpine` Docker image | Backend query-budget test | Pullable from Docker Hub at execution time | 1.25-alpine | none needed — standard public image |
| `TEAM4S_PHASE131_TEST_DSN` fixture database | Query-budget regression test (A4) | Unverified — see Open Question 2 | — | Create fresh if missing, per the test file's own header-comment instructions |
| Playwright (in `team4sv30-frontend` container) | All D1/D2/E7 measurement scripts | Assume ✓ (already used by 153-07 and REPORT.md) | 1.55 per REPORT.md | none |
| Tunnel `http://127.0.0.1:3300` | P154-15 owner live-checkpoint | Human-operated, outside agent control | — | none — this is the explicit human checkpoint (E6) |

**Missing dependencies with no fallback:** None identified as blocking at research time; the fixture
database (Open Question 2) is the only item needing an early verification step before the A4 test
can run.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (frontend) | Vitest 3 (`vitest run` via `npm test`) |
| Framework (backend) | Go's built-in `testing` package + `testify` |
| Config file (frontend) | `frontend/vitest.config.ts` |
| Config file (backend query-budget) | none — env-var-gated (`TEAM4S_PHASE131_TEST_DSN`), skip-if-unset |
| Quick run command (frontend, touched files) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run <path>"` |
| Quick run command (backend, touched package) | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go test ./internal/repository/... -run 'Phase131|Phase154' -count=1` |
| Full suite command (frontend) | `docker compose exec -T team4sv30-frontend sh -c "cd /app && npm test"` |
| Full suite command (backend) | `docker run ... golang:1.25-alpine go build ./... && go vet ./...` (build/vet; DSN-gated PostgreSQL tests require the dedicated fixture env vars per package) |
| Phase gate | `docker compose build` exits 0 (per CONTEXT.md E2, not `npm run build`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| P154-01 | 4 duplicate query pairs removed | unit (Go) | `go test ./internal/repository/... -run TestPhase131PublicProfileQueryBudgetIsConstant -count=1` (assert new constant, e.g. 16) | ✅ `member_profile_query_budget_test.go` (update constant + assertion) |
| P154-02 | Badges/Progress separation preserved, no forbidden patterns | code review + existing unit tests | existing `go test ./internal/repository/...` badge/progress test files (search `_test.go` siblings of the three touched files) | ✅ (verify exact filenames at plan time) |
| P154-03 | Query-budget test on existing counter infra | unit (Go) | same as P154-01 | ✅ |
| P154-04 | DTOs/visibility unchanged | contract/regression test | existing public/owner DTO contract tests (e.g. `member_profile_public_repository_postgres_test.go`, `phase134_verification_matrix_access_test.go`) | ✅ (confirm at plan time these cover all 3 touched loaders' output) |
| P154-05 | No hero artwork at 0 projects | unit (Vitest) | `npx vitest run src/components/profile/AnimeProjectAchievementStage.test.tsx` (create if absent — check whether this file already exists at plan time; siblings `ContributionAchievementStage`/`PointsAchievementStage`/`MembershipStage` may have their own test files to mirror) | ❌ Wave 0 — verify existence, create mirroring sibling test if missing |
| P154-06 | Bounded fallback, no retry loop, no layout shift | unit (Vitest) + manual/Playwright (`AUDIT_FAIL_BADGES=1`) | `npx vitest run src/components/ui/ResponsiveImage.test.tsx` (exists — extend); `AUDIT_FAIL_BADGES=1 node scripts/audit-public-member-performance.mjs` for byte-budget proof | ✅ test file likely exists (`ResponsiveImage.config.test.ts` referenced in STATE.md history) — verify exact name |
| P154-07 | Animated avatar budget, choice justified | unit (Vitest) + documented rationale | `npx vitest run src/components/profile/MemberProfileHero.test.tsx` (exists — extend) | ✅ |
| P154-08 | No unnecessary full-profile fetch for edit link | unit (Vitest) — assert fetch count/endpoint | `npx vitest run src/lib/useMemberViewer.test.ts src/app/members/\[slug\]/OwnProfileEditLink.test.tsx` | ✅ both exist — extend |
| P154-09 | `getMemberProfile`/`useMemberViewer` thread AbortSignal | unit (Vitest) | new assertion in `useMemberViewer.test.ts` + a new/extended `api.ts` test for signal-forwarding | ✅ (extend existing files) |
| P154-10 | PMFE-10 invariant + auth-refresh unchanged | unit (Vitest), regression | full existing `useMemberViewer.test.ts` (8 cases) + `api.auth-refresh.test.ts` (25 cases) must stay green | ✅ |
| P154-11 | RCA-07 re-measured, documented | manual/scripted (Playwright), no automated assertion | `node scripts/audit-public-member-performance.mjs` (see Code Examples) | ✅ script exists |
| P154-12 | Listener remainder investigated, documented | manual/scripted (Playwright), no automated assertion | `node scripts/audit-public-member-navigation-retention.mjs` | ✅ script exists |
| P154-13 | Before/after audit doc; full suites + build green | full-suite gate | `npm test`, `npm run typecheck`, `npm run lint`, backend `go build`/`go vet`, `docker compose build` | ✅ all commands exist |
| P154-14 | RCA-04 open; pre-existing defects named | documentation only | n/a (narrative verification against named files) | n/a |
| P154-15 | Owner live-check | human checkpoint | n/a — `checkpoint:human-verify`, not automatable | n/a |

### Sampling Rate
- **Per task commit:** the quick run command for the specific touched package/file.
- **Per wave merge:** full frontend suite (`npm test`) + backend `go build`/`go vet` + the
  `TEAM4S_PHASE131_TEST_DSN`-gated query-budget test if the wave touched Workstream A.
- **Phase gate:** full suite green + `docker compose build` exit 0, before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] Confirm whether `AnimeProjectAchievementStage.test.tsx` exists; if not, create it mirroring
      `ContributionAchievementStage`'s or `PointsAchievementStage`'s existing hero-gating test cases
      (search `frontend/src/components/profile/*.test.tsx` for the exact sibling filenames at plan
      time — this research did not exhaustively enumerate every `.test.tsx` in that directory).
- [ ] Confirm `TEAM4S_PHASE131_TEST_DSN` fixture database exists on `team4s-linux`; create via
      schema-only `pg_dump` restore if missing (Open Question 2).
- [ ] Confirm the exact backend badge/progress unit test filenames that must stay green for P154-02
      (this research located the production files but did not exhaustively enumerate every
      `_test.go` sibling).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | yes (Workstream C only) | Existing bearer/refresh-token flow in `api.ts`'s `authorizedFetch`; unchanged by this phase, but must be re-verified after the signal-threading edit (P154-10's "Auth-Refresh korrekt") |
| V3 Session Management | yes (Workstream C only) | Existing `useAuthSession`/refresh-token proactive-refresh logic; unchanged, re-verify via `api.auth-refresh.test.ts`'s 25 existing cases |
| V4 Access Control | yes (Workstream A, C) | `ResolvePublicMemberAccess`'s server-computed `IsOwner`/`IsPrivatePreview` (never client-supplied); the PMFE-10 fail-closed invariant is itself an access-control control, not merely a UX nicety |
| V5 Input Validation | no new surface | No new user input is accepted by this phase |
| V6 Cryptography | n/a | Not touched by this phase (the tunnel/`crypto.subtle` requirement in E6 is a browser platform constraint for the human checkpoint, not a code change) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| A slim viewer-only endpoint (if chosen for C1) accidentally leaking more than `is_owner`/`is_private_preview` | Information Disclosure | Reuse `ResolvePublicMemberAccess`'s existing `PublicMemberAccess` struct verbatim (already deliberately minimal — "exposes no app-user identity" per its own doc comment) rather than defining a new response shape |
| A stale/aborted request racing a fresh one and incorrectly setting `resolved`/`is_owner: true` | Spoofing / Elevation of Privilege | The existing PMFE-10 guard (`state.key !== requestKey`) already prevents this; the AbortSignal change must not weaken it (see Pitfall 4) |
| Widening `unoptimized`/fallback logic in a way that serves an unauthenticated user a private-preview-sized image inadvertently | Information Disclosure | Out of scope for B2 — the fallback only concerns already-public badge-artwork/avatar assets, not access-gated data; confirm no private-preview-only image path shares `ResponsiveImage` in a way that changes this |

## Sources

### Primary (HIGH confidence — direct file reads in this repository)
- `backend/internal/repository/member_profile_public_repository.go` (aggregator, lines 1-257, full read)
- `backend/internal/repository/member_profile_role_volume_repository.go` (full read)
- `backend/internal/repository/member_profile_contribution_badges_repository.go` (full read)
- `backend/internal/repository/member_profile_progress_repository.go` (full read)
- `backend/internal/repository/member_profile_dashboard_repository.go` (targeted grep + line context)
- `backend/internal/repository/query_counter.go` (full read)
- `backend/internal/repository/member_profile_query_budget_test.go` (full read)
- `backend/internal/repository/member_public_access_repository.go` (partial read, lines 1-60)
- `backend/internal/handlers/public_member_access.go` (full read)
- `frontend/src/components/profile/AnimeProjectAchievementStage.tsx` (full read)
- `frontend/src/components/profile/ContributionAchievementStage.tsx` (full read)
- `frontend/src/components/profile/achievementStageHelpers.tsx` (full read)
- `frontend/src/components/profile/memberBadgeFamilies.ts` (targeted grep)
- `frontend/src/components/profile/PointsAchievementStage.tsx`, `MembershipStage.tsx` (targeted grep, confirming pattern)
- `frontend/src/components/ui/ResponsiveImage.tsx` (full read)
- `frontend/src/components/profile/AchievementArtwork.tsx` (full read)
- `frontend/src/components/profile/MemberProfileHero.tsx` (partial read, lines 85-200)
- `frontend/next.config.mjs` (full read)
- `frontend/src/hooks/useCancellableSlugState.ts` (full read)
- `frontend/src/lib/useMemberViewer.ts` (full read)
- `frontend/src/lib/api.ts` (targeted reads: lines 446-452, 1413-1492, 3160-3202)
- `frontend/src/app/members/[slug]/OwnProfileEditLink.tsx`, `OwnHiddenProfilePreview.tsx`,
  `MemberProfileContent.tsx`, `page.tsx` (full reads)
- `frontend/scripts/audit-public-member-*.mjs` (all 9 scripts, headers/bodies read), `shot.mjs` (full read)
- `docs/audits/2026-09-09-public-member-performance/REPORT.md` (full read)
- `docs/audits/2026-09-09-public-member-performance/153-AFTER.md` (full read)
- `.planning/phases/154-.../154-CONTEXT.md`, `154-USER-REQUEST.md` (full reads)
- `.planning/STATE.md`, `.planning/ROADMAP.md` (Phase 153/154 sections)
- `.planning/phases/143-.../143-VALIDATION.md`, `129-VERIFICATION.md`, `130-02-PLAN.md`,
  `142-UAT.md`, `144-02-SUMMARY.md`, `153-07-PLAN.md`, `153-07-SUMMARY.md` (targeted greps for
  exact working command precedents)

### Secondary (MEDIUM confidence)
- [Next.js Image component docs](https://nextjs.org/docs/app/api-reference/components/image) — via
  WebSearch, corroborates the animated-GIF/APNG/WebP auto-detection-and-bypass behavior cited for
  Workstream B3's root cause. Not re-verified against the exact `^16.1.6` changelog for this repo.

### Tertiary (LOW confidence)
- None — all other findings trace to a direct file read in this repository.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; every library cited is already pinned and in use.
- Architecture (Workstreams A, B1, C): HIGH — every claim traces to an exact file:line read of the
  current, unmodified source.
- Architecture (Workstream B2/B3 mechanism choice): MEDIUM — the *problem* is HIGH confidence
  (exact root cause found and cited), but the *recommended mechanism* is explicitly a discretionary
  reading of CONTEXT.md's intent, not a verified fact.
- Pitfalls: HIGH — each pitfall is grounded in a specific, cited cross-reference (e.g.,
  `GetOwnDashboard`'s independent use of the same functions).
- Workstream D outcomes: N/A — genuinely unknowable until the scripts are re-run; this research
  only confirms the tooling exists and documents exact invocation.

**Research date:** 2026-09-10
**Valid until:** Effectively pinned to the current commit — this is a code-state snapshot, not a
library/ecosystem recommendation with a natural staleness window. Re-verify file:line citations if
significant time passes between this research and plan execution, or if another phase touches any
of the cited files first.
