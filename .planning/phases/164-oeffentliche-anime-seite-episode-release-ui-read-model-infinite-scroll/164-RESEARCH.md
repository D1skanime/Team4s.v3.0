# Phase 164: Öffentliche Anime-Seite: Episode-/Release-UI, performantes Public Read-Model und Infinite Scroll - Research

**Researched:** 2026-09-17
**Domain:** Go/pgx public read-model query design, Next.js App Router client-side infinite scroll/windowing, CSS glassmorphism on a design-token system
**Confidence:** HIGH (code/DB findings, all live-measured) / MEDIUM (byte-size projections, extrapolated) / LOW (UAT-scale reachability — see Open Questions)

## Summary

This phase is planning-only; the goal of this research is to give the planner exact, live-measured
facts instead of assumptions. The single most important finding is structural, not visual: **most of
what §22–§27 (Public Read Projection / no N+1) asks for already exists**, but scattered across two
different repositories that must be reconciled rather than re-invented. `publicEpisodeQuery`
(`episode_version_public_query.go`, Phase 163) already resolves fansub groups + logos per release
version in a single batched `LEFT JOIN LATERAL … json_agg(...)` — zero N+1 today. What it does **not**
resolve is `filler_type`/`episode_type` (columns exist on `episodes`, unused in this query),
`container`/`video_codec` (columns exist on `release_variants`, unused), or `has_images`/`has_notes`/
`has_karaoke` (no resolver exists in the public-episode-list code path at all). Crucially, a **second,
independent** repository — `ReleaseDetailPublicRepository` (`release_detail_public_repository*.go`,
serving the already-built release detail page at `/anime/:id/group/:groupId/releases/:releaseVersionId`)
— already defines the exact visibility gates for images (`release_version_media`: `v.name='public'`,
`rs.code='approved'`, `ma.status='ready'`, `deleted_at IS NULL`) and notes (`release_version_notes`:
`visibility='public'`, `status='published'`, `deleted_at IS NULL`), including the fact that **"karaoke"
is not a separate table** — it is `release_version_media.category = 'typesetting_karaoke'`, a sibling of
`category = 'screenshot'`. The plan should batch-resolve all three flags with one additional
`EXISTS(...) AS has_images/has_karaoke/has_notes` query keyed on `release_version_id = ANY($1)` over the
page's release-version IDs — measured live at 0.23ms for 5 rows (see Plan-Checker Inputs). The release
detail page **already exists end-to-end** (list, gallery, notes, segments, contributors), so "Zum Release
→" is a pure `<Link href="/anime/{animeID}/group/{groupID}/releases/{releaseVersionID}">` using IDs
already present in the current response — no new field is needed for D-21's "stable public identifier".

The second major finding is that **no anime in the live database has ≥24 episodes with at least one
public release** (max is 13, for anime_id 1; Naruto has only 5). Because Phase 163 made "≥1 public
release" the visibility gate, Naruto's headline "220 episodes" scale (repeatedly cited in the mandate as
the primary UAT case, §1/§24/§31/§48) is **not reachable through the public API today** — the endpoint
returns `episode_count: 5` for Naruto, one page, `has_more: false`. This means the bounded-window,
backward-lazy-load, and second-page/pagination gates (D-30–D-35, D-46 gates 3/6/7/8) cannot be exercised
against live Naruto data at all; they require a seeded fixture (Phase-163-style, isolated test DB), and
the human-UAT plan needs to explicitly decide what "scale" verification against **real** Naruto means
(functional/visual correctness only) versus what needs a fixture (windowing mechanics). This is flagged
prominently in Open Questions because it changes what the Wave/plan structure must contain (a fixture
plan is not optional, it is required to exercise D-46 gates 3/6/7/8 at all).

Third, on the frontend: there is **no virtualization or infinite-scroll library installed** anywhere in
`package.json` (checked exhaustively) — this satisfies §33's "prove before adding a library" gate by
default; the plan should proceed with hand-rolled `IntersectionObserver` + bounded array state. Two
directly reusable precedents already exist in this codebase: `useNearViewportActivation` (a generic
IntersectionObserver-based hook, `frontend/src/hooks/useNearViewportActivation.ts`) and
`OlderReleasesList.tsx` (`frontend/src/app/anime/[id]/group/[groupId]/sections/`), which already
implements a bottom-sentinel `IntersectionObserver` + cursor pagination pattern (forward-only, no
eviction) against a **different but structurally identical** cursor-paginated release endpoint. Neither
implements backward eviction/bounded windowing — that part must be newly designed — but the forward-load
trigger mechanics (D-35) should be extended from `OlderReleasesList.tsx`'s pattern, not invented from
scratch. `backdrop-filter: blur(...)` is already used extensively across the codebase, including on this
exact page (`page.module.css`, hero container, `blur(20px)`, with `@supports` feature-detection and
`-webkit-backdrop-filter` fallback already established) — so "glass" is not a new CSS technique for this
codebase, but the existing design-token set (`--surface-card: #ffffff`, fully opaque) was built for
**opaque** light cards (Phase 160/162) and cannot satisfy D-05's translucent-tint requirement as-is; new
translucent surface tokens (rgba/color-mix based) will be needed specifically for this phase's episode
cards, layered on the existing dark `.episodesSection` background (`rgba(255,255,255,0.04)`).

**Primary recommendation:** Extend `publicEpisodeQuery` additively (episode-level `filler_type`/
`episode_type` via a `LEFT JOIN` on `episode_filler_types`/`episode_types`; variant-level `container`/
`video_codec` via two extra `SELECT` columns already on `release_variants`; a single follow-up batched
`EXISTS` query for `has_images`/`has_notes`/`has_karaoke` keyed on the page's `release_version_id`s,
reusing the exact visibility-gate literals from `release_detail_public_repository_helpers.go`). Do not
add a `route`/`release_url` field — construct the link client-side from `anime_id` (known) + first
`fansub_groups[].id` + `release_version_id` (already present). Build infinite scroll as a hand-rolled
bounded page-window (array of loaded pages in React state, spacer divs for evicted pages, bottom+top
`IntersectionObserver` sentinels) extending the existing `useNearViewportActivation`/`OlderReleasesList`
patterns — no new dependency. Build a fixture anime (≥50 episodes with releases, mixed classifications/
types/logos/dates/images/notes/karaoke/coop) for automated performance/windowing tests, since live data
cannot exercise D-46 gates 3/6/7/8 and D-48's required visual variety at all.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Episode classification (filler/canon, episode type) resolution | Database / Storage (`episode_filler_types`, `episode_types` lookup tables) | API / Backend (`publicEpisodeQuery` JOIN) | Values are fixed lookup rows; backend must resolve id→name once, batched, not per-row in the app layer |
| Groups + logos aggregation (incl. Coop) | API / Backend (`publicEpisodeQuery`'s `LEFT JOIN LATERAL json_agg`) | Database (indexes on `release_version_groups`) | Already implemented batched in SQL; must be extended (logo fallback), not replaced |
| `has_images`/`has_notes`/`has_karaoke` flags | API / Backend (new batched `EXISTS` query keyed on visible `release_version_id`s) | Database (`idx_rvm_public`, `idx_release_version_notes_version_id` partial indexes already exist) | Same visibility-gate pattern as the existing release-detail repository; must not become per-release queries |
| "Zum Release →" navigation target | Browser / Client (constructs `/anime/{id}/group/{groupId}/releases/{releaseVersionId}` from already-present IDs) | API / Backend (route + `ReleaseDetailPublicRepository` already exist, out of this phase's build scope) | No new backend work needed for the link target itself; only need to decide which `groupId` to use for Coop |
| Infinite scroll trigger + bounded window | Browser / Client (`IntersectionObserver`, bounded array state, spacer divs) | Frontend Server (SSR delivers page 1 only, unchanged) | No backend involvement beyond existing cursor pagination (Phase 163); this is a pure client state-machine problem |
| Cursor-scoped pagination (per active filter) | API / Backend (`publicEpisodeQuery`'s cursor v2, unchanged) | Browser / Client (must reset window/cache on filter change) | Already built in Phase 163; this phase must not fork or duplicate it |
| Glass visual styling (tint, blur) | Browser / Client (CSS: new translucent surface tokens + existing `backdrop-filter` pattern) | — | Pure presentation concern; no data implication |

## Standard Stack

### Core
No new runtime dependencies. This phase extends existing Go/pgx repository code and existing Next.js/
React client components.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `github.com/jackc/pgx/v5` | (unchanged, already in `backend/go.mod`) | SQL access for the extended `publicEpisodeQuery` and the new batched flags query | Already the project's sole DB driver |
| `react` / `next` | 18.3.1 / ^16.1.6 (unchanged) | Client-side infinite scroll/windowing state | Already the project's frontend stack; native `IntersectionObserver` (browser API, no package) is sufficient |

### Supporting
None required — see "Don't Hand-Roll" below for what NOT to build, and "Existing dependency audit" for
what NOT to add.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled bounded window (spacer divs + `IntersectionObserver`) | `@tanstack/react-virtual` or `react-window` | §33 explicitly forbids adding a virtualization library "without proof it's needed"; DOM-node counts measured for this page are in the low hundreds even for a synthetic 220-episode fixture with several expanded episodes (see Plan-Checker Inputs) — well below the threshold where virtualization becomes necessary. Not proven necessary; do not add. |
| Batched `EXISTS` flags query | Denormalized boolean columns on `release_versions` (`has_images`, `has_notes`, `has_karaoke`) | Would need a migration + trigger/backfill maintenance burden for a read-time-cheap flag; the measured live query cost (0.23ms for 5 rows) does not justify the write-path complexity. Reconsider only if a future anime has thousands of releases per page and the `EXISTS` query becomes measurably slow — no such anime exists today. |

**Installation:** None — no new packages.

**Version verification:** N/A — no version-pinned dependency additions in this phase.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero new external packages (backend: uses existing `pgx`
patterns; frontend: uses native `IntersectionObserver`, no library). No `slopcheck`/registry
verification is required. If a future plan proposes adding any package (e.g., a virtualization library),
it must first satisfy the "existing dependency audit" finding below (none currently installed, none
proven necessary) and only then run the full Package Legitimacy Gate.

**Packages removed due to slopcheck [SLOP] verdict:** none (no packages proposed).
**Packages flagged as suspicious [SUS]:** none.

## Existing Dependency Audit (gates §33)

Full `package.json` dependency+devDependency list was inspected (`frontend/package.json`, 2026-09-17).
Result: **zero** virtualization or infinite-scroll libraries present (checked for `react-window`,
`react-virtual`, `@tanstack/react-virtual`, `react-infinite-scroll-component`, any `virtual*`/
`infinite*`/`intersection*` package name — none found). `IntersectionObserver` is used natively (no
polyfill) in 9 existing files, most relevantly:
- `frontend/src/hooks/useNearViewportActivation.ts` — generic "activate when near viewport"
  hook (`rootMargin: '600px 0px'`), reusable as-is for deferred-render optimization of far-off pages.
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx` — bottom-sentinel
  `IntersectionObserver` (`rootMargin: '200px'`) triggering `getGroupReleaseListCursor` cursor pagination,
  append-only (`setItems(prev => [...prev, ...page.items])`), no backward eviction, own loading/error
  state per page. This is the closest structural analog to what D-27/D-35 need; it is missing bounded
  windowing (D-30/D-31/D-33) and race-guard/abort handling (`FansubVersionBrowser.tsx` has the latter,
  `OlderReleasesList.tsx` does not).

**Conclusion for §33:** the "kleinstmögliche robuste Lösung" is a hand-rolled bounded-window array of
loaded pages, built by combining `FansubVersionBrowser.tsx`'s existing `AbortController`/race-guard
pattern with `OlderReleasesList.tsx`'s bottom-sentinel trigger pattern and a new top-sentinel + eviction
mechanism. No new dependency is justified by any measurement in this research.

## Architecture Patterns

### System Architecture Diagram

```
Browser (windowed episode list)
  │
  │ 1. Initial render: SSR page.tsx already fetched page 1 (limit=24, current filter)
  │    → FansubVersionBrowser receives episodes[], pagination, episodeCount as props
  │
  ├─ 2. User scrolls near bottom of last loaded page
  │    → bottom IntersectionObserver sentinel fires
  │    → loadNext(): AbortController (reuse existing requestRef pattern)
  │       → GET /api/v1/anime/{id}/episodes?projection=public&limit=24&cursor=...&fansub=...
  │       → append new page to `loadedPages` array (bounded: evict oldest page if window > N)
  │
  ├─ 3. User scrolls back up past the evicted boundary
  │    → top IntersectionObserver sentinel fires
  │    → loadPrevious(): re-fetch the evicted page's cursor range (or restore from small LRU cache)
  │       → prepend to `loadedPages`, adjust scrollTop to prevent visual jump (scroll anchoring)
  │
  ├─ 4. User clicks a fansub filter chip (Phase 162/163 mechanism, unchanged)
  │    → abort in-flight loads, clear loadedPages window entirely, reset cursor,
  │      fetch page 1 of new filter, reset scroll to list top (D-40)
  │
  └─ 5. User expands an episode (already loaded)
       → 0 additional requests: groups/logos/technical fields/has_images/has_notes/has_karaoke
         already present in the page response (D-43) — pure client-side state toggle

Backend (single Gin handler, unchanged routing)
  GET /api/v1/anime/:id/episodes?projection=public
    → ListGroupedEpisodes (episode_version_reads.go, strict query allowlist, unchanged)
       → PublicEpisodeOptions.Validate (cursor-scope check, unchanged, 0 DB round trips on mismatch)
       → ExistsVisible (anime.go, 1 query)
       → [optional] ResolveFansubGroupIDForAnime (fansub_repository.go, 1 query, only if ?fansub= set)
       → ListPublicGroupedByAnimeID (episode_version_public_query.go)
          → publicEpisodeQuery (1 query, EXTEND: + filler_type/episode_type JOIN, + container/video_codec columns)
          → NEW: batched flags query, EXISTS(...) has_images/has_notes/has_karaoke
               keyed on release_version_id = ANY($1) over this page's IDs (1 query)
       Total: 2-4 queries per request (within D-23's 2-6 budget)

"Zum Release →" (out of this phase's build scope, already live)
  Browser constructs /anime/{animeID}/group/{groupID}/releases/{releaseVersionID}
    → existing route, existing ReleaseDetailPublicRepository, existing full gallery/notes/segments UI
```

### Recommended Project Structure
No new top-level files/folders are required; this is an extension of existing files. Likely touched
files (not exhaustive — actual plan/wave split is Claude's discretion per CONTEXT.md):
```
backend/internal/repository/
├── episode_version_public_query.go       # extend SELECT list, add JOINs, extend PublicGroupedEpisode scan
├── episode_version_public_flags.go       # NEW (small, <450 lines): batched has_images/has_notes/has_karaoke EXISTS query
├── episode_version_public_group_filter_test.go / episode_version_public_integration_test.go  # extend budget assertions
backend/internal/models/episode_version.go  # extend PublicGroupedEpisode / PublicEpisodeVersion DTOs
shared/contracts/openapi.yaml               # additive fields on existing public episode schema
frontend/src/types/episodeVersion.ts        # extend PublicGroupedEpisode / PublicEpisodeVersion types
frontend/src/components/fansubs/
├── FansubVersionBrowser.tsx               # bounded window state, top/bottom sentinels, replace Play button
├── FansubVersionBrowser.module.css        # glass tokens, remove badge/pill technical-data styling
├── EpisodeGlassCard.tsx (or similar)      # NEW, split out if FansubVersionBrowser would exceed 450 lines
├── ReleasePreviewRow.tsx (or similar)     # NEW, D-08..D-19 release preview rendering
frontend/src/app/anime/[id]/page.tsx       # unchanged fetch shape, still limit=24 (verify, see D-29 note)
```

### Pattern 1: Batched flag resolution via `= ANY($1)` EXISTS query
**What:** One additional SQL statement per page request, keyed on the array of `release_version_id`s
already returned by the main query, resolving three boolean flags per row without any per-row round trip.
**When to use:** Whenever a page of parent rows (episodes/releases) needs cheap presence flags from
child tables that must not multiply the row count (avoiding the `json_agg` pattern's row-fanout risk for
simple booleans).
**Example (live-verified, see Plan-Checker Inputs for EXPLAIN):**
```sql
-- Source: adapted from release_detail_public_repository_helpers.go's imagesQuery()/countNotes()
-- gate literals (v.name='public', rs.code='approved', ma.status='ready', deleted_at IS NULL,
-- visibility='public', status='published'), re-verified live against team4s_v2 2026-09-17.
SELECT rv.id,
 EXISTS (
   SELECT 1 FROM release_version_media rvm
   JOIN media_assets ma ON ma.id = rvm.media_asset_id
   JOIN visibilities v ON v.id = ma.visibility_id
   JOIN review_statuses rs ON rs.id = ma.review_status_id
   WHERE rvm.release_version_id = rv.id AND rvm.deleted_at IS NULL
     AND rvm.category <> 'typesetting_karaoke'
     AND ma.status = 'ready' AND v.name = 'public' AND rs.code = 'approved'
 ) AS has_images,
 EXISTS (
   SELECT 1 FROM release_version_media rvm
   JOIN media_assets ma ON ma.id = rvm.media_asset_id
   JOIN visibilities v ON v.id = ma.visibility_id
   JOIN review_statuses rs ON rs.id = ma.review_status_id
   WHERE rvm.release_version_id = rv.id AND rvm.deleted_at IS NULL
     AND rvm.category = 'typesetting_karaoke'
     AND ma.status = 'ready' AND v.name = 'public' AND rs.code = 'approved'
 ) AS has_karaoke,
 EXISTS (
   SELECT 1 FROM release_version_notes rvn
   WHERE rvn.release_version_id = rv.id AND rvn.deleted_at IS NULL
     AND rvn.visibility = 'public' AND rvn.status = 'published'
 ) AS has_notes
FROM release_versions rv
WHERE rv.id = ANY($1);
```

### Pattern 2: Bounded page window with spacer-preserved scroll (client)
**What:** Keep an array of `{cursorRange, episodes[], measuredHeightPx}` page objects in React state.
When the window exceeds N pages (Claude's discretion, D-33 — reason about a small constant like 3–5
pages given ~24 episodes/page), replace the evicted page's rendered `<li>` elements with a single
`<div style={{height: measuredHeightPx}} />` spacer of the same total height, keeping scroll math stable
without re-fetching until the user scrolls back near it.
**When to use:** For D-30/D-31/D-34 — this avoids both "keep all 220 in the DOM" and "need a
virtualization library" by only ever fully rendering the active window, while preserving scroll position
via `ResizeObserver`-measured heights (no third-party lib — `ResizeObserver` is also a native browser
API, already implicitly compatible with the project's browser support since `backdrop-filter` and
`IntersectionObserver` are already used unconditionally).
**Example:** No direct code precedent for the spacer technique in this codebase (new pattern) — the
closest existing precedent for "avoid unmounting while allowing content changes" is
`useNearViewportActivation`'s "activate once, never deactivate" model, which is a related but distinct
concern (progressive activation, not eviction/restoration).

### Anti-Patterns to Avoid
- **Denormalizing has_images/has_notes/has_karaoke onto `release_versions` via migration+trigger:**
  unnecessary write-path complexity given the measured 0.23ms read cost; do not add without a measured
  need at production scale (none exists today — see Alternatives Considered).
- **Reintroducing a second, diverging group/logo resolver:** `publicEpisodeQuery`'s group JSON
  aggregation currently reads only `fg.logo_url` (no `media_assets` fallback via `logo_id`), while
  `release_detail_public_repository_helpers.go`'s `loadReleaseGroups` reads
  `COALESCE(logo.file_path, fg.logo_url)` (joins `media_assets`). Today these agree by data coincidence
  (all 6 live groups have both `logo_id` and `logo_url` populated identically) but are two independently
  maintained code paths. D-25 says "keine neue parallele Struktur" — the plan should either align
  `publicEpisodeQuery`'s group JSON to the same `COALESCE` expression, or explicitly document why the
  simpler `fg.logo_url`-only read is intentionally kept (Claude's discretion, but must be a stated
  decision, not silence).
- **A `route`/`release_url` field in the API response:** unnecessary payload growth; the frontend already
  has `anime_id` (page-level), `fansub_groups[].id` (per version), and `release_version_id` (per version)
  — sufficient to construct the existing, already-live release-detail route client-side.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Release detail page (gallery, notes, segments, contributors, technical metadata) | A new "release page" for the "Zum Release →" target | The already-live route `GET/anime/:id/group/:groupId/releases/:releaseVersionId` + `ReleaseDetailPublicRepository` | Fully built, tested, and in production use (theme timeline, contributors, images, notes, adjacent-release nav) — explicitly out of scope per CONTEXT.md deferred items anyway |
| Image/note/karaoke visibility gating logic | A new set of visibility predicates for the episode-preview flags | The exact literal gates already established in `release_detail_public_repository_helpers.go` (`imagesQuery`, `countNotes`, category constant `typesetting_karaoke`) | Two independently-invented visibility rules for the same underlying tables is a correctness/drift risk; D-24 explicitly says reuse existing resolvers where practical |
| Mobile breakpoint detection in JS (if needed beyond CSS) | A new `useMediaQuery`/`matchMedia` hook | `useIsMobileReleasesList` pattern (`OlderReleasesList.helpers.ts`, `useSyncExternalStore` + `matchMedia`, cites `ProjectStats.tsx` as its own precedent) | Established, tested pattern already in the same route subtree |
| Abort/race-condition handling for in-flight requests on filter change | New AbortController wiring from scratch | `FansubVersionBrowser.tsx`'s existing `requestRef`/`switchTo`/`loadMore` abort-coordination pattern (Phase 163, already handles "only last request wins") | Already correctly handles the exact race identified in D-40/D-46 gate 12; must be extended (add top/bottom sentinel triggers into the same `requestRef` coordination), not replaced |

**Key insight:** This phase's biggest risk is not missing functionality but **duplicated, drifting
implementations** of things that already exist once (release detail page, image/note visibility gates,
abort coordination, mobile detection, glass/blur CSS technique). The plan should be graded on how much it
reuses versus reinvents.

## Common Pitfalls

### Pitfall 1: Assuming Naruto's "220 episodes" is reachable through the public API
**What goes wrong:** A plan or test writes "load all 220 Naruto episodes via infinite scroll" as a live
UAT step and it silently only ever shows 5, because Phase 163's visibility gate (`≥1 public release`)
already filters 215 of them out before pagination ever begins.
**Why it happens:** The mandate's own framing ("Referenzfall Naruto, 220 Episoden") predates awareness
that Phase 163 changed the visible set to release-having episodes only; 163-VERIFICATION.md confirms
`episode_count: 5` for Naruto today.
**How to avoid:** Split the UAT plan into (a) functional/visual correctness against real Naruto (5
episodes — coop, groups, logos, filter correctness, D-01–D-19 visual contract) and (b) scale/windowing
gates (D-46 #3/6/7/8, D-31 restoration) against a fixture anime seeded in an isolated test DB
(Phase-163-style `team4s_phase117_test_...`), never against `team4s_v2`.
**Warning signs:** Any plan step that says "scroll through all of Naruto's episodes" without first
checking `episode_count` for the active filter.

### Pitfall 2: Treating `release_version_media.category='typesetting_karaoke'` as unrelated to "♪ Karaoke"
**What goes wrong:** A plan invents a new "karaoke" concept sourced from `theme_segments`/
`theme_segment_assignments` (the OP/ED timing-segment system used by the release detail page's "Themes"
timeline), producing a second, semantically different "has karaoke" signal that disagrees with the
existing `PublicReleaseImageCategoryTotals.TypesettingKaraoke` counter already shown elsewhere.
**Why it happens:** Both `theme_segments` and `release_version_media` have karaoke-flavored content, and
the mandate's icon list ("📷 Bilder, 📝 Notizen, ♪ Karaoke") does not specify which table.
**How to avoid:** Use `release_version_media.category = 'typesetting_karaoke'` (same table/gate as images,
just a different category filter) — this is the literal source already aggregated into
`ImageCategoryTotals.TypesettingKaraoke` on the release detail page, so the preview flag and the detail
page's own counter will always agree.
**Warning signs:** A plan referencing `theme_segment_assignments`/`theme_segments` for the "has_karaoke"
preview flag.

### Pitfall 3: Assuming the existing group/logo aggregation already covers D-25's Coop requirement correctly
**What goes wrong:** Believing no backend change is needed for groups/logos because `publicEpisodeQuery`
already does batched `json_agg`.
**Why it happens:** It's true for the aggregation mechanism, but the `fg.logo_url`-only read (see Anti-
Patterns) is a narrower field selection than the sibling `loadReleaseGroups` function; a plan that
doesn't notice this could silently ship a display regression the moment a group has a `logo_id` without a
mirrored `logo_url` (not true today, but not guaranteed to stay true — it's two separately maintained
admin write paths, `group_repository.go`'s `input.LogoID`/`input.LogoURL` are independently settable).
**How to avoid:** Explicitly decide (and document) whether to align the two logo-read expressions.
**Warning signs:** A plan that copies the current `fg.logo_url` literal without reading
`loadReleaseGroups`'s `COALESCE(logo.file_path, fg.logo_url)` first.

### Pitfall 4: Building the bounded window without accounting for `expandedEpisodes` state surviving eviction
**What goes wrong:** A user expands episode from page 2, scrolls far down (page 2 gets evicted from the
active window), scrolls back up — the episode is restored but its expanded/open state is lost (or worse,
a different episode at the same list index appears "open" if state is keyed by array index instead of
`episode_id`).
**Why it happens:** `FansubVersionBrowser.tsx`'s current `expandedEpisodes: Record<number, true>` is
already keyed by `episode.episode_id` (not index) — this is actually already correct and safe to keep
across windowing changes — but if evicted-page episodes are literally removed from the `episodes` array
(rather than just their DOM/rendering), the record would retain stale ids that briefly don't correspond
to any rendered `<li>`. D-39 requires the plan to explicitly state whether expanded state is retained
during eviction (recommended: yes, since the state is keyed by stable id, cheap to keep, and avoids
surprising the user).
**How to avoid:** Keep `expandedEpisodes` keyed by `episode_id` (already true) and never prune it on
eviction — only prune the rendered page content, not derived id-keyed state.
**Warning signs:** Any plan that proposes clearing `expandedEpisodes` on page eviction, or keying it by
array index.

## Runtime State Inventory

Not applicable — this phase is additive (new endpoint fields, new frontend behavior), not a rename/
refactor/migration. No existing stored data, live service config, OS-registered state, secrets, or build
artifacts reference names that this phase changes.

## Code Examples

### Current, unmodified `publicEpisodeQuery` (Phase 163 baseline — extend, don't replace)
```go
// Source: backend/internal/repository/episode_version_public_query.go lines 77-121 (read in full 2026-09-17)
const publicEpisodeQuery = `
WITH inventory AS (
 SELECT e.id AS episode_id, e.episode_number::INTEGER AS episode_number, e.title AS episode_title,
  v.id AS variant_id, v.release_version_id, v.title, v.release_version,
  v.video_quality, v.subtitle_type, v.release_date,
  COUNT(v.id) OVER (PARTITION BY e.id)::INTEGER AS version_count,
  MIN(v.id) OVER (PARTITION BY e.id) AS default_version_id
 FROM episodes e
 JOIN LATERAL ( ... release_variants/release_versions/fansub_releases join, EXISTS group-filter ... ) v ON TRUE
 WHERE e.anime_id=$1 AND CASE WHEN e.episode_number ~ '^[0-9]+$' THEN ... ELSE FALSE END
), total AS ( SELECT COUNT(DISTINCT episode_id) AS n FROM inventory
), page AS ( SELECT * FROM inventory WHERE (episode_number,episode_id,COALESCE(variant_id,0)) > ($2,$3,$4)
 ORDER BY episode_number,episode_id,COALESCE(variant_id,0) LIMIT $5
)
SELECT p.episode_id, ..., COALESCE(g.groups,'[]'::json), total.n
FROM page p
LEFT JOIN LATERAL ( SELECT json_agg(json_build_object('id',fg.id,'slug',fg.slug,'name',fg.name,'logo_url',fg.logo_url)
  ORDER BY fg.name,fg.id) AS groups
 FROM release_version_groups rvg JOIN fansub_groups fg ON fg.id=rvg.fansub_group_id
 WHERE rvg.release_version_id=p.release_version_id ) g ON TRUE
CROSS JOIN total ORDER BY p.episode_number,p.episode_id,COALESCE(p.variant_id,0)`
```
Additive extension points (verified column existence live, 2026-09-17):
- `episodes.filler_type_id → episode_filler_types.name` (values: `unknown`, `canon`, `filler`, `mixed`,
  `recap`), `episodes.episode_type_id → episode_types.name` (values: `episode`, `special`, `ova`, `ona`,
  `movie`, `recap`, `preview`, `prologue`, `epilogue`, `bonus`) — add two `LEFT JOIN`s inside the
  `inventory` CTE's outer `episodes e` scope, select both names once per episode row (existing pattern:
  `episode_classification.go`'s `episodeClassificationSelectSQL` does exactly this join shape already —
  reuse the join, not the whole query, since that one is admin-scoped).
- `release_variants.container`, `release_variants.video_codec` — already selected implicitly by `v.*` in
  the LATERAL; just add `rv.container, rv.video_codec` to the inner `SELECT` list and thread through the
  Go scan/DTO.

### Existing reusable visibility gate for images/notes (verbatim from live code)
```go
// Source: backend/internal/repository/release_detail_public_repository_helpers.go lines 108-112, 429-443
func (r *ReleaseDetailPublicRepository) countImagesByCategory(ctx context.Context, releaseVersionID int64) (PublicReleaseImageCategoryTotals, error) {
	var out PublicReleaseImageCategoryTotals
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FILTER(WHERE rvm.category='screenshot'), COUNT(*) FILTER(WHERE rvm.category='typesetting_karaoke'), COUNT(*) FILTER(WHERE rvm.category='fun_outtake'), COUNT(*) FILTER(WHERE rvm.category='other') FROM release_version_media rvm JOIN media_assets ma ON ma.id=rvm.media_asset_id JOIN visibilities v ON v.id=ma.visibility_id JOIN review_statuses rs ON rs.id=ma.review_status_id WHERE rvm.release_version_id=$1 AND rvm.deleted_at IS NULL AND ma.status='ready' AND v.name='public' AND rs.code='approved'`, releaseVersionID).Scan(&out.Screenshot, &out.TypesettingKaraoke, &out.FunOuttake, &out.Other)
	return out, err
}
```

### Existing forward-only IntersectionObserver pagination pattern to extend
```tsx
// Source: frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx lines 55-63
useEffect(() => {
  if (!hasMore || loading || !cursor) return
  const callback: IntersectionObserverCallback = ([entry]) => {
    if (entry.isIntersecting) void loadPage(cursor)
  }
  observerRef.current = new IntersectionObserver(callback, { rootMargin: '200px' })
  if (loadTriggerRef.current) observerRef.current.observe(loadTriggerRef.current)
  return () => observerRef.current?.disconnect()
}, [cursor, hasMore, loading, loadPage])
```
Missing from this precedent (must be newly designed for Phase 164): bounded window/eviction, a top
sentinel for backward loading, and abort-on-filter-change coordination (which `FansubVersionBrowser.tsx`
already has via `requestRef` — combine both patterns).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| "Weitere Episoden und Versionen laden" button (`FansubVersionBrowser.tsx` line 415-417) | Infinite scroll via IntersectionObserver sentinel | This phase (§28) | Removes an explicit user action; must preserve the exact same abort/race-guard semantics currently attached to the button's `onClick` |
| Play-button-per-version (`styles.playButton`, streams via `/api/releases/{id}/stream`) | "Zum Release →" navigation button to the existing release detail page | This phase (§18/§19) | Changes the primary CTA target entirely — from playback API to a content page; the stream link is not deleted from the backend, just no longer the primary UI affordance here |
| Technical metadata as pill/badge chips (`styles.metaBadge`, bordered rounded pills) | Dezenter Fließtext mit `·`-Trennung | This phase (§13) | Pure CSS/markup change, same underlying data fields (`video_quality`, `subtitle_type`) plus 2 new ones (`container`, `video_codec`) |

**Deprecated/outdated:**
- `styles.playButton`/its direct stream link as the primary release-preview CTA on this page (still valid
  as a mechanism elsewhere; just not the button this phase should render).
- The dead, unused `.episodeList`/`.episodeItem`/`.episodeNumber`/`.episodeTitle`/`.episodeMeta`/
  `.episodeActions` classes in `page.module.css` (lines 575-620) — confirmed via grep that `page.tsx`
  never references `styles.episodeList` etc.; these are pre-`FansubVersionBrowser` leftovers. Not in this
  phase's required scope, but worth flagging to the planner as an easy adjacent cleanup if a touched file
  already needs editing nearby (Rule-3-style opportunistic cleanup, not a new task).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `has_images` should include all non-karaoke categories (`screenshot`, `fun_outtake`, `other`) rather than only `screenshot` | Pattern 1, Pitfall 2 | If the intended semantics is "has_images = has screenshots only", the query predicate needs `category='screenshot'` instead of `<> 'typesetting_karaoke'`; low risk since the mandate's own field name (§16, `has_images`) plausibly encompasses all non-karaoke image-like categories, but this is an interpretation, not a directly-stated rule, and should be confirmed in the UI-SPEC/plan step |
| A2 | Coop release "Zum Release →" link should use the alphabetically-first group's `id` (matching the existing `ORDER BY fg.name, fg.id` in the groups JSON aggregation) as the `:groupId` route segment | Architectural Responsibility Map, Anti-Patterns | If a different selection rule is intended (e.g., the group the visiting user is most associated with, or requiring the route to accept any valid member group), the link-construction logic differs; low risk since the backend route's ownership check accepts any of the release's actual groups, so the alphabetical choice is always valid, only "which one is displayed first" is a UX nuance |
| A3 | Missing `subtitle_type` (NULL, e.g. all 5 Naruto releases today) should render as "Unbekannt" (current frontend behavior) rather than being omitted like a missing release date (D-14 pattern) | Pitfall/Code Examples, D-08 | The mandate does not specify fallback behavior for missing subtitle_type the way it explicitly does for release_date (D-14); if the intended behavior is "omit if unknown" instead of "show Unbekannt", the UI-SPEC/plan needs an explicit decision — current live data (Naruto) exercises exactly this gap |

**If this table is empty:** N/A — see above.

## Open Questions

1. **Can the D-46 gates 3/6/7/8 (bounded window growth, backward restoration, scroll stability at scale)
   be verified against real Naruto data at all?**
   - What we know: Naruto's public episode endpoint returns `episode_count: 5`, one page,
     `has_more: false` — confirmed live, 2026-09-17. No anime in `team4s_v2` has ≥24 episodes with public
     releases (max is 13, anime_id=1).
   - What's unclear: Whether the human-UAT plan is allowed to use a fixture anime (created via the
     existing admin write paths, which is not a `team4s_v2` "read-only measurement" violation, just a
     content-creation step) for the live browser session, or whether the UAT must exercise the automated
     Postgres-fixture pattern only (Phase 163's approach), leaving live-browser UAT scoped to functional/
     visual correctness on the real, small Naruto dataset.
   - Recommendation: Plan for both — automated fixture-DB tests for the scale/windowing gates (mandatory,
     cannot be skipped), and a separate, explicit decision (deferred to the plan/discuss step, not this
     research) on whether a large fixture anime should also exist in `team4s_v2` for live browser UAT, or
     whether Naruto-scale UAT is accepted as "functional-only, scale gates covered by automated tests".

2. **Does `has_images` include `fun_outtake`/`other` categories, or only `screenshot`?**
   - What we know: `release_version_media.category` has 4 values (`screenshot`, `typesetting_karaoke`,
     `fun_outtake`, `other`); the mandate's icon list is exactly 3 icons (📷/📝/♪), implying karaoke is
     split out but images/notes are not further subdivided.
   - What's unclear: Whether `fun_outtake`/`other` count toward "📷 Bilder" or should be silently ignored
     (they are, after all, still images per the DB check constraint, just categorized differently for
     admin/gallery purposes).
   - Recommendation: Treat `has_images` as "any category except typesetting_karaoke" (Assumption A1);
     confirm in the UI-SPEC step since it's a one-line SQL predicate change if wrong.

3. **Bounded window size (D-33) and eviction distance (D-30) exact constants.**
   - What we know: page size is currently `limit: 24` (verified live in `page.tsx`, `api.ts` calls, and
     matches D-29's expected range); no anime currently produces more than 1 page, so no live signal
     exists for "how many pages feel right to keep active".
   - What's unclear: The exact number of pages to keep mounted (e.g. 2 vs. 3) before evicting, and whether
     eviction distance should be measured in pages or in pixels/viewport-heights.
   - Recommendation: Claude's discretion per CONTEXT.md; recommend starting with "current + 1 before +
     1 after" (3 pages ~72 episodes max mounted) as a conservative default, tunable without an API change
     since it's pure client state.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (`team4sv30-db`) | All SQL measurements, EXISTS query design | ✓ | 16 (postgres:16 image), read-only access confirmed | — |
| Go backend (`team4sv30-backend`) | Repository/handler code, `go test` | ✓ | Go 1.25.0 (`backend/go.mod`), container healthy on :18092 | — |
| Next.js frontend (`team4sv30-frontend`) | Component/CSS measurements, `vitest`/`tsc`/`eslint` | ✓ | Next.js ^16.1.6, React 18.3.1, container healthy on :3000 | — |
| Browser `IntersectionObserver`/`ResizeObserver` | Infinite scroll trigger + scroll-anchoring | ✓ (already used unconditionally elsewhere in this codebase, no polyfill) | Native browser API | — |
| `backdrop-filter` CSS | Glass card styling (D-05) | ✓ (already used with `@supports`/`-webkit-` fallback pattern in `page.module.css`) | Native CSS | Existing `@supports (backdrop-filter: blur(20px))` pattern already provides a fallback path |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — all required capabilities are already present and in use
elsewhere in this exact codebase.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend framework | Go `testing` + `testify` (`github.com/stretchr/testify`), pgx-based integration tests against an isolated fixture DB via `testsupport.OpenPhase117Postgres(t)` |
| Backend config file | none (table-driven Go tests, no separate config) |
| Backend quick run command | `cd backend && go test ./internal/repository/... -run TestEpisodeVersionPublic -v -count=1` |
| Backend full suite command | `cd backend && go test ./...` |
| Frontend framework | Vitest ^3.2.4 (`frontend/vitest.config.ts`), React Testing Library |
| Frontend quick run command | `cd frontend && npx vitest run src/components/fansubs/FansubVersionBrowser.test.tsx` (file does not yet exist under this exact name — verify actual test file name in Wave 0; component itself already has adjacent test coverage per 163-VERIFICATION.md) |
| Frontend full suite command | `cd frontend && npm run test` (`vitest run`) |

### Phase Requirement → Test Map (illustrative; REQ IDs not yet assigned by this research)
| Capability | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| Extended `publicEpisodeQuery` (filler/episode type, container/codec) | New fields present, correct values, no N+1 | integration (Go, real fixture DB) | `go test ./internal/repository/... -run TestEpisodeVersionPublic -v` | ✅ extend `episode_version_public_integration_test.go` |
| Batched `has_images`/`has_notes`/`has_karaoke` | Correct flags per release, single extra query, no per-row query | integration (Go) + budget assertion | reuse `assertPublicBudget`/`episodePublicTracer` pattern (`episode_version_public_integration_test.go` lines 28-60, 157-165) | ✅ pattern exists, needs new assertions for the new query |
| Bounded window eviction/restoration | Old pages removed from DOM, restored on scroll-up, scroll position stable | component test (Vitest/RTL) + manual/Playwright scroll simulation | new test file, e.g. `FansubVersionBrowser.windowing.test.tsx` | ❌ Wave 0 |
| Glass card visual contract (tint per classification) | Correct tint/opacity per filler_type, no solid color | visual/manual UAT (per 162-05 precedent: automated Playwright screenshots at defined breakpoints) | none automatable for color-perception; snapshot/manual | ❌ Wave 0 (UI-SPEC-driven) |
| "Zum Release →" navigation correctness (incl. Coop group choice) | Correct `groupId` selected, link resolves to existing, working release detail page | component test + live curl smoke check | new assertions in extended `FansubVersionBrowser` test file | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted Go/Vitest run for touched files.
- **Per wave merge:** full backend (`go test ./...`) + full frontend (`npm run test`) + `npm run typecheck` + `npm run lint`.
- **Phase gate:** Full suite green + live curl/EXPLAIN re-verification against `team4s_v2` (read-only) +
  the fixture-DB scale tests (Open Question 1) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] A seeded fixture anime (isolated test DB, Phase-163-style) with ≥50 episodes-with-releases, mixed
      `filler_type`/`episode_type` values (including `mixed`, and non-`episode` types like `special`/
      `ova`/`movie`, none of which exist anywhere in `team4s_v2` today), releases with/without logos,
      with/without dates, with/without images/notes/karaoke, at least one multi-group Coop — required to
      cover D-48's visual test matrix and D-46's scale gates at all.
- [ ] `FansubVersionBrowser.windowing.test.tsx` (or equivalent) — covers bounded window/eviction/
      restoration/scroll-stability assertions; no such file exists today.
- [ ] Extended budget-assertion helper for the new batched flags query (extend
      `episodePublicTracer`/`assertPublicBudget` in `episode_version_public_integration_test.go`).

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | no | This is a public, unauthenticated read endpoint (unchanged) |
| V3 Session Management | no | No session state involved |
| V4 Access Control | yes | The existing `ExistsVisible`/anime-status gate and the release-detail route's `animeID+groupID` ownership check (`rvg.fansub_group_id = $3`) already IDOR-scope every read; this phase's new batched flags query must be scoped to the same page's already-visibility-gated `release_version_id`s (it must never accept an arbitrary client-supplied ID list) |
| V5 Input Validation | yes | Existing `parseStrictNamedQuery` allowlist pattern (`episode_version_reads.go`) — any new query parameter (unlikely needed for this phase, no new params identified) must be added to the allowlist explicitly, following the exact fail-closed pattern already used for `fansub` in Phase 163 |
| V6 Cryptography | no | Not applicable |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| IDOR via the new batched flags query accepting a client-influenced release_version_id array | Tampering / Information Disclosure | The flags query must only ever run against the `release_version_id`s that the same-request's already-gated `publicEpisodeQuery` returned — never accept a separate, client-supplied list of IDs for this query |
| Over-fetching heavy data via the extended DTO (accidentally including full note bodies/segment details) | Information Disclosure | D-26/D-27 explicitly forbid this; the new SELECT additions (filler_type, episode_type, container, video_codec, 3 booleans) are all cheap scalar fields — verify no accidental `SELECT *`-style over-fetch is introduced on `release_version_notes`/`release_version_media` (only `EXISTS`, never row content, for this phase's response) |

## Sources

### Primary (HIGH confidence — live code/DB reads and live measurements, 2026-09-17)
- `backend/internal/repository/episode_version_public_query.go` — read in full
- `backend/internal/handlers/episode_version_reads.go` — read in full
- `backend/internal/models/episode_version.go` — read in full
- `backend/internal/repository/release_detail_public_repository.go` — read in full
- `backend/internal/repository/release_detail_public_repository_helpers.go` — read in full
- `backend/internal/handlers/group_contributors_handler.go` (routing excerpt) — read
- `backend/internal/repository/episode_classification.go` — read in full
- `backend/cmd/server/main.go` (route registration excerpt) — grepped/read
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` (+ `.module.css`) — read in full
- `frontend/src/app/anime/[id]/page.tsx` (+ `.module.css` excerpts) — read in full / relevant sections
- `frontend/src/hooks/useNearViewportActivation.ts` — read in full
- `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx` (+ `.helpers.ts`) — read in full
- `frontend/src/types/episodeVersion.ts`, `frontend/src/lib/api.ts` (`getGroupedEpisodes`) — read
- `frontend/package.json` — full dependency list enumerated
- Live DB (`team4s_v2`, read-only `psql`): `\d episodes`, `\d episode_filler_types`, `\d episode_types`,
  `\d release_version_media`, `\d release_version_notes`, `\d theme_segments`, `\d theme_segment_assignments`,
  `\d release_variants`, `\d fansub_groups`; live data queries for Naruto (anime_id=4) episodes/releases/
  groups/logos/dates; DB-wide filler/episode-type distribution; DB-wide releases-per-episode ratio;
  per-anime episodes-with-releases counts.
- Live backend (`http://127.0.0.1:18092`): `curl` against `GET /api/v1/anime/4/episodes?projection=public`
  (unfiltered and `fansub=animeownage`), full response bodies and byte sizes captured.
- Live `EXPLAIN (ANALYZE, BUFFERS)` runs against `team4s_v2` for both the existing `publicEpisodeQuery`
  (unfiltered) and the proposed batched flags query.
- `.planning/phases/163-.../163-CONTEXT.md`, `163-VERIFICATION.md`, `.planning/phases/162-.../162-UI-SPEC.md`
  — read in full, cited rather than re-measured where still current (cursor v2 format, dimming CSS,
  design tokens), re-measured where this phase's new requirements make prior measurements stale (response
  shape/size, since Phase 163's response lacked groups/logos in the earlier baseline that 163-VERIFICATION
  documents — the version read in this research already includes them, confirming Phase 163 shipped that
  part).

### Secondary (MEDIUM confidence)
- Response-size projection for a hypothetical 24-episode page (Plan-Checker Inputs below) — extrapolated
  from the real 5-episode Naruto measurement plus DB-wide average releases-per-episode ratio (1.10),
  since no live anime has ≥24 episodes with releases to measure directly.

### Tertiary (LOW confidence)
- None — every claim in this document is either a direct code/DB/live-endpoint read or an explicitly
  labeled extrapolation (Assumptions Log, response-size projection).

## Plan-Checker Inputs (exact measured figures for §52 checks)

- **Query count today (unfiltered, Naruto):** 2 statements (`ExistsVisible` + `publicEpisodeQuery`),
  confirmed by code path inspection and 163-VERIFICATION.md's independently-reproduced budget assertions.
  **Query count today (group filter active):** 3 statements (+ `ResolveFansubGroupIDForAnime`).
  **Projected query count after this phase's additions:** 3-4 statements (+1 for the batched
  `has_images`/`has_notes`/`has_karaoke` query; the filler_type/episode_type/container/video_codec fields
  are free — added columns to the existing `publicEpisodeQuery`, not new statements). This stays within
  D-23's "2-6 queries" budget and does not grow with episode/release count (still one flags-query per
  page request, using `= ANY($1)` over that page's IDs, regardless of page size).
- **Live EXPLAIN (unfiltered, Naruto, current query):** `Execution Time: 1.174 ms`, `Planning Time: 2.065 ms`,
  `shared hit=910` buffers (all cache hits, zero disk reads) — Incremental Sort over a WindowAgg CTE that
  internally nested-loops the LATERAL join once per one of the anime's 220 raw episode rows (this is
  normal single-statement SQL execution, not an app-level N+1; it completes in ~1ms at this data scale and
  is expected to scale linearly with the anime's total raw episode count within one query, which is
  acceptable per D-23's actual concern being app-level round trips, not SQL internal loop counts).
- **Live measurement of the proposed batched flags query:** `Execution Time: 0.230 ms` for 5
  `release_version_id`s (Naruto); correctly resolved `has_images: true/false`, `has_karaoke: true/false`,
  `has_notes: true` for a broader 13-ID sample from anime_id=1's real image/note fixtures.
- **Response size today (measured, live):** unfiltered Naruto page (5 episodes, 5 versions, includes
  groups+logos): **2489 bytes**. Filtered (`fansub=animeownage`, 3 episodes, 3 versions incl. the Coop
  episode with 2 groups): **1576 bytes**.
- **Response size projection for a full 24-episode/~26-version page (MEDIUM confidence, extrapolated):**
  current baseline extrapolated linearly (`2489 * 24/5 ≈ 11.9 KB`) + this phase's additions
  (`filler_type`+`episode_type` ≈ 50 bytes × 24 episodes ≈ 1.2 KB; `container`+`video_codec`+3 booleans
  ≈ 106 bytes × ~26 versions ≈ 2.8 KB) → **projected ≈ 15.9 KB per full page**, a ~33% size increase over
  the (extrapolated) current baseline, still well within normal JSON API payload sizes. No `route`/
  `release_url` field is added (constructed client-side, see Anti-Patterns), keeping this projection as
  low as it reasonably can be. **This has not been directly measured against a real 24-episode page
  because none exists in `team4s_v2` today** — Wave 0's fixture anime should re-measure this directly once
  it exists, and the plan-checker should treat this figure as a sanity bound, not a guarantee.
- **DOM-node order-of-magnitude (for D-46 gate 6/11, mobile/GPU cost):** with a bounded window of ~3 pages
  (72 episodes) fully mounted, ~5-10 DOM nodes per collapsed episode card (header, number, title, badge)
  plus ~15-20 per expanded release row (logo/fallback, group name, tech line, extras line, date, button) —
  order of magnitude a few hundred to ~1500 DOM nodes even with several episodes expanded simultaneously,
  not the "hundreds of permanently-rendered GPU blur surfaces" D-45 warns against, provided
  `backdrop-filter` is applied per-card (not per-row) and evicted pages are replaced by plain spacer
  `<div>`s (zero blur surfaces for off-window content). This is a reasoned estimate from the current
  component's actual JSX structure (`FansubVersionBrowser.tsx` lines 345-410), not a live-measured
  browser profile — the plan should include an actual Chrome DevTools Performance/Layers measurement
  against the fixture anime as a Wave 0/UAT step, not rely on this estimate alone.
