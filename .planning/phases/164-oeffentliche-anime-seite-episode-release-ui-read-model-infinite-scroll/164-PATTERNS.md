# Phase 164: Öffentliche Anime-Seite: Episode-/Release-UI, Read-Model, Infinite Scroll - Pattern Map

**Mapped:** 2026-09-17
**Files analyzed:** 14 (backend: 5 modify/extend + 1 new; frontend: 4 modify + 2-3 new; contracts: 1)
**Analogs found:** 14 / 14 (all files have a strong same-repo analog; this is a pure extension phase, no greenfield subsystem)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/repository/episode_version_public_query.go` (extend) | repository (SQL query builder) | CRUD (read, batched aggregate) | itself (Phase 163 baseline) — extend additively | exact (self) |
| `backend/internal/repository/episode_version_public_flags.go` (NEW) | repository (batched flag resolver) | CRUD (read, batched EXISTS) | `backend/internal/repository/release_detail_public_repository_helpers.go` (`countImagesByCategory`, `imagesQuery`, `countNotes`) | exact (same visibility-gate literals, same table pair) |
| `backend/internal/repository/episode_version_public_query.go` — group/logo JOIN (extend, D-25 anti-pattern fix) | repository (batched aggregate JOIN) | CRUD (read) | `backend/internal/repository/release_detail_public_repository_helpers.go` (`loadReleaseGroups`) | role-match (same aggregation concern, currently divergent SELECT list) |
| `backend/internal/repository/episode_version_public_query.go` — filler/episode-type JOIN (extend) | repository (SQL JOIN shape) | CRUD (read) | `backend/internal/repository/episode_classification.go` (`episodeClassificationSelectSQL`) | exact (identical JOIN shape, admin-scoped sibling) |
| `backend/internal/handlers/episode_version_reads.go` (no/minimal change expected) | handler (strict-query allowlist, projection dispatch) | request-response | itself (`ListGroupedEpisodes`) | exact (self, unchanged unless a new query param is added) |
| `backend/internal/models/episode_version.go` (extend `PublicEpisodeVersion`/`PublicGroupedEpisode`) | model (public DTO) | transform (SQL row → JSON) | itself (Phase 163 `PublicEpisodeVersion`) | exact (self) |
| `backend/internal/repository/episode_version_public_integration_test.go` (extend budget assertions) | test (Go integration, fixture DB) | batch (query-count/row-count assertions) | itself (`assertPublicBudget`, `episodePublicTracer`) | exact (self) |
| `shared/contracts/openapi.yaml` (extend public episode schema) | config (API contract) | transform | existing public episode schema block | exact (additive fields only) |
| `frontend/src/types/episodeVersion.ts` (extend `PublicEpisodeVersion`/`PublicGroupedEpisode`) | model (TS type) | transform | itself | exact (self) |
| `frontend/src/components/fansubs/FansubVersionBrowser.tsx` (rework: windowing, sentinels, glass markup) | component (client, stateful list) | streaming (paginated fetch + bounded window) | itself (Phase 163 baseline: `requestRef`/`switchTo`/`loadMore`/`mergeEpisodes`) | exact (self) — combined with `OlderReleasesList.tsx`'s sentinel pattern for the *new* bidirectional part |
| `EpisodeGlassCard.tsx` (NEW, if split out) | component (presentational, episode card) | request-response (renders already-fetched data) | `FansubVersionBrowser.tsx`'s current inline `<li className={styles.episodeCard}>` block (lines 345-410) | role-match (extraction of existing JSX, not a new pattern) |
| `ReleasePreviewRow.tsx` (NEW, if split out) | component (presentational, release row) | request-response | `FansubVersionBrowser.tsx`'s current inline `.versionRow` block (lines 363-406) + `OlderReleasesList.rows.tsx` (`DesktopReleaseRow`/`MobileDirectReleaseRow`) for the two-column desktop / stacked-mobile layout split | role-match |
| `frontend/src/components/fansubs/FansubVersionBrowser.module.css` (rework: glass tokens, remove badge/pill CSS) | config (CSS module) | — | itself (Phase 163 baseline) + `frontend/src/app/anime/[id]/page.module.css` (`@supports (backdrop-filter: blur(20px))` fallback pattern, `.emptyEpisodes`/`.episodesSection` dark-background context) + `OlderReleasesList.module.css` line 223 (`blur(9px) saturate(1.65)` literal for release sub-elements) | exact (glass technique already established in this exact codebase) |
| `FansubVersionBrowser.windowing.test.tsx` (NEW) | test (Vitest/RTL component test) | batch (windowing/eviction/restoration assertions) | no direct analog exists (RESEARCH.md confirms) — closest structural sibling is any existing `FansubVersionBrowser`-adjacent test file for setup/mock conventions (verify actual file name in Wave 0) | no analog (new pattern, see "No Analog Found") |
| `frontend/src/components/ui/LoadingState.tsx` (additive `compact?: boolean` prop) | component (shared UI primitive) | — | itself, following the exact precedent already set by `EmptyState.tsx`'s `variant === 'compact'` → `styles.stateCompact` branch | exact (same primitive family, same additive technique) |

---

## Pattern Assignments

### `backend/internal/repository/episode_version_public_flags.go` (NEW — repository, batched EXISTS)

**Analog:** `backend/internal/repository/release_detail_public_repository_helpers.go` (`countImagesByCategory`, `imagesQuery`, `countNotes`)

**Visibility-gate literals to reuse verbatim** (lines 108-112, 352-379, 429-443):
```go
// Images/karaoke share one table + one gate, split only by category:
func (r *ReleaseDetailPublicRepository) countImagesByCategory(ctx context.Context, releaseVersionID int64) (PublicReleaseImageCategoryTotals, error) {
	var out PublicReleaseImageCategoryTotals
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FILTER(WHERE rvm.category='screenshot'), COUNT(*) FILTER(WHERE rvm.category='typesetting_karaoke'), COUNT(*) FILTER(WHERE rvm.category='fun_outtake'), COUNT(*) FILTER(WHERE rvm.category='other') FROM release_version_media rvm JOIN media_assets ma ON ma.id=rvm.media_asset_id JOIN visibilities v ON v.id=ma.visibility_id JOIN review_statuses rs ON rs.id=ma.review_status_id WHERE rvm.release_version_id=$1 AND rvm.deleted_at IS NULL AND ma.status='ready' AND v.name='public' AND rs.code='approved'`, releaseVersionID).Scan(&out.Screenshot, &out.TypesettingKaraoke, &out.FunOuttake, &out.Other)
	return out, err
}

// Notes: separate table, own gate literals
func (r *ReleaseDetailPublicRepository) countNotes(ctx context.Context, releaseVersionID int64) (int64, error) {
	var count int64
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM release_version_notes rvn
		WHERE rvn.release_version_id = $1
		  AND rvn.deleted_at IS NULL
		  AND rvn.visibility = 'public'
		  AND rvn.status = 'published'
	`, releaseVersionID).Scan(&count)
	return count, err
}
```

**Core batched-EXISTS pattern to write (from RESEARCH.md Pattern 1, live-measured 0.23ms/5 rows, verified against the exact gate literals above)** — the new function must key on `= ANY($1)` over the page's already-visibility-gated `release_version_id`s (never a client-supplied ID list — this is the V4/IDOR note in RESEARCH.md's Security Domain):
```sql
SELECT rv.id,
 EXISTS ( SELECT 1 FROM release_version_media rvm JOIN media_assets ma ON ma.id=rvm.media_asset_id
   JOIN visibilities v ON v.id=ma.visibility_id JOIN review_statuses rs ON rs.id=ma.review_status_id
   WHERE rvm.release_version_id=rv.id AND rvm.deleted_at IS NULL AND rvm.category <> 'typesetting_karaoke'
     AND ma.status='ready' AND v.name='public' AND rs.code='approved' ) AS has_images,
 EXISTS ( ... same JOIN chain, rvm.category = 'typesetting_karaoke' ... ) AS has_karaoke,
 EXISTS ( SELECT 1 FROM release_version_notes rvn WHERE rvn.release_version_id=rv.id AND rvn.deleted_at IS NULL
   AND rvn.visibility='public' AND rvn.status='published' ) AS has_notes
FROM release_versions rv WHERE rv.id = ANY($1);
```

**Constructor/file-size convention analog:** `release_detail_public_repository_helpers.go`'s own file header comment documents *why* it was split out ("ausgelagert ... wegen des 450-Zeilen-Limits") — copy this documentation convention for `episode_version_public_flags.go` if it stays a small sibling file to `episode_version_public_query.go`, same package (`repository`), no new struct — a plain function taking `*pgxpool.Pool`/`pgx.Tx` and `[]int64`, called once from `ListPublicGroupedByAnimeID` after the main query returns.

**Anti-pattern flagged in RESEARCH.md, do not repeat:** karaoke must never be sourced from `theme_segments`/`theme_segment_assignments` — only `release_version_media.category='typesetting_karaoke'` (same table as images, different category filter).

---

### `backend/internal/repository/episode_version_public_query.go` — extend `publicEpisodeQuery` (filler/episode type + container/video_codec)

**Analog for the classification JOIN shape:** `backend/internal/repository/episode_classification.go` lines 21-25:
```go
const episodeClassificationSelectSQL = `
	SELECT e.id, e.episode_number, eft.name, e.filler_source, et.name, e.episode_type_source
	FROM episodes e
	LEFT JOIN episode_filler_types eft ON eft.id = e.filler_type_id
	LEFT JOIN episode_types et ON et.id = e.episode_type_id`
```
Reuse the **join shape** (`LEFT JOIN episode_filler_types eft ON eft.id = e.filler_type_id`, `LEFT JOIN episode_types et ON et.id = e.episode_type_id`), not the whole query — that one is admin-scoped (`AdminContentRepository`), this one must live inside the `inventory` CTE's `episodes e` scope in `publicEpisodeQuery` (lines 78-101 of `episode_version_public_query.go`), selecting `eft.name AS filler_type, et.name AS episode_type` once per episode row (not per variant row — window function partitioning already exists via `COUNT(v.id) OVER (PARTITION BY e.id)`, follow that pattern to keep the value constant across an episode's variant rows).

**Current baseline to extend (verbatim, lines 77-121), do not replace:**
```go
const publicEpisodeQuery = `
WITH inventory AS (
 SELECT e.id AS episode_id, e.episode_number::INTEGER AS episode_number, e.title AS episode_title,
  v.id AS variant_id, v.release_version_id, v.title, v.release_version,
  v.video_quality, v.subtitle_type, v.release_date,
  COUNT(v.id) OVER (PARTITION BY e.id)::INTEGER AS version_count,
  MIN(v.id) OVER (PARTITION BY e.id) AS default_version_id
 FROM episodes e
 JOIN LATERAL ( ... ) v ON TRUE
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
`container`/`video_codec` are already-selected-implicitly-by-`v.*` columns on `release_variants` inside the LATERAL — add `rv.container, rv.video_codec` next to the existing `COALESCE(rv.video_quality,rv.resolution) AS video_quality, rv.subtitle_type` line inside the LATERAL's inner `SELECT`.

**Group/logo JOIN — anti-pattern to resolve (D-25), analog is the sibling function's more-complete field:**
```go
// loadReleaseGroups (release_detail_public_repository_helpers.go line 40) — the "correct", COALESCE-based sibling:
`SELECT fg.id, fg.slug, fg.name, NULLIF(TRIM(COALESCE(logo.file_path, fg.logo_url)), '')
 FROM release_version_groups rvg JOIN fansub_groups fg ON fg.id=rvg.fansub_group_id
 LEFT JOIN media_assets logo ON logo.id=fg.logo_id
 WHERE rvg.release_version_id=$1 ORDER BY fg.name, fg.id`
```
vs. `publicEpisodeQuery`'s current, narrower `json_build_object('id',fg.id,'slug',fg.slug,'name',fg.name,'logo_url',fg.logo_url)` (no `media_assets`/`logo_id` fallback). The plan must explicitly decide (RESEARCH.md Pitfall 3) whether to align the `json_agg` expression to the same `COALESCE(logo.file_path, fg.logo_url)` — recommended, to avoid a second, independently-maintained logo-read path.

**Test analog for the query-count/row-budget assertion to extend:** `backend/internal/repository/episode_version_public_integration_test.go` lines 157-165:
```go
func assertPublicBudget(t *testing.T, tr *episodePublicTracer, limit int) {
	t.Helper()
	require.Len(t, tr.queries, 2, "existence plus one bounded query, including any metadata SQL")
	require.EqualValues(t, 1, tr.queries[0].Rows)
	require.LessOrEqual(t, tr.queries[1].Rows, int64(limit+1))
	require.NotContains(t, tr.queries[1].SQL, "theme_segment")
	require.NotContains(t, tr.queries[1].SQL, "release_streams")
}
```
This literal `require.Len(t, tr.queries, 2, ...)` must become `3` (or `4` with an active group filter) once the new flags query is added — do not silently loosen this assertion to `LessOrEqual`; keep it an exact, named count per RESEARCH.md's Plan-Checker Inputs (D-23 budget: 2-6 acceptable, but the test should assert the *exact* number this phase produces, not a wide range). The tracer/fixture pattern itself (`episodePublicTracer.TraceQueryStart/End`, `openEpisodeVersionPublicFixture`'s guarded, schema-isolated Postgres fixture via `testsupport.OpenPhase117Postgres(t)`) is the mandatory analog for any new integration test in this phase — never touch `DATABASE_URL`/`team4s_v2` from a Go test.

---

### `backend/internal/models/episode_version.go` — extend `PublicEpisodeVersion`/`PublicGroupedEpisode`

**Analog:** itself, lines 213-235 — additive fields only, same `omitempty` convention already used (`Title *string `json:"title,omitempty"``, etc.):
```go
type PublicEpisodeVersion struct {
	ID               int64                `json:"id"`
	VariantID        int64                `json:"variant_id"`
	ReleaseVersionID int64                `json:"release_version_id"`
	AnimeID          int64                `json:"anime_id"`
	EpisodeNumber    int32                `json:"episode_number"`
	Title            *string              `json:"title,omitempty"`
	ReleaseVersion   *string              `json:"release_version,omitempty"`
	FansubGroups     []FansubGroupSummary `json:"fansub_groups"`
	VideoQuality     *string              `json:"video_quality,omitempty"`
	SubtitleType     *string              `json:"subtitle_type,omitempty"`
	ReleaseDate      *time.Time           `json:"release_date,omitempty"`
}
```
Add `Container *string `json:"container,omitempty"``, `VideoCodec *string `json:"video_codec,omitempty"``, `HasImages bool `json:"has_images"``, `HasNotes bool `json:"has_notes"``, `HasKaraoke bool `json:"has_karaoke"`` (booleans without `omitempty`, matching the existing non-pointer boolean convention seen on `PublicEpisodePagination.HasMore` and `EpisodeVersion.HasSegmentAsset`). Add `FillerType *string`/`EpisodeType *string` (or non-pointer if always resolvable via `LEFT JOIN`... COALESCE to `"unknown"`, matching D-03's fixed enum) to `PublicGroupedEpisode` (episode-level, not per-variant, per D-04's "two independent dimensions" and the classification JOIN living in the episode scope).

---

### `frontend/src/components/fansubs/FansubVersionBrowser.tsx` (rework — component, streaming/bounded-window)

**Analog for everything to KEEP unchanged (abort/race-guard coordination, D-40/gate 12):** itself, lines 161-271 — `requestRef`, `switchTo`, `loadMore`, `mergeEpisodes`. This is explicitly called out in RESEARCH.md's "Don't Hand-Roll" table as the correct precedent to *extend*, not replace:
```tsx
const requestRef = useRef<AbortController | null>(null)

async function switchTo(targetSlug: string | null) {
  requestRef.current?.abort()
  const controller = new AbortController()
  requestRef.current = controller
  // ... fetch, then: if (controller.signal.aborted || requestRef.current !== controller) return
}

async function loadMore() {
  if (!dataState.pagination?.has_more || !dataState.pagination.next_cursor || requestRef.current) return
  const controller = new AbortController()
  requestRef.current = controller
  // ...
}
```
The new `loadNext()`/`loadPrevious()` bidirectional functions must follow this exact same "single in-flight `requestRef`, abort-and-replace, check `requestRef.current === controller` before committing state" shape — this is the mechanism that already solves D-40's "abort/ignore on filter change" requirement; a filter-change (`switchTo`) already aborts any in-flight `loadMore`-style request today, so the windowing code just needs to plug into the same ref, not invent a second one.

**Analog for the bottom-sentinel trigger mechanics to extend (D-35):** `frontend/src/app/anime/[id]/group/[groupId]/sections/OlderReleasesList.tsx` lines 55-63:
```tsx
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
Missing from this precedent, must be newly designed (per RESEARCH.md): a **second**, symmetric top-sentinel `IntersectionObserver` for `loadPrevious()`, plus bounded-window eviction (replace evicted pages with a measured-height spacer `<div>`, per RESEARCH.md Pattern 2) — no existing code precedent for the spacer/eviction technique itself.

**Analog for "activate lazily, don't eagerly render/observe":** `frontend/src/hooks/useNearViewportActivation.ts` (generic, reusable as-is per RESEARCH.md) — useful if a given page's DOM/blur cost should only mount once near-viewport, distinct from the fetch-trigger sentinel above (this hook is about *rendering* activation, not data fetching).

**Analog for expanded-state key stability (D-39), already correct, keep as-is:** line 134, `expandedEpisodes: Record<number, true>` keyed by `episode.episode_id` (not array index) — RESEARCH.md Pitfall 4 confirms this is already safe and must not be changed to index-based keying, and must never be pruned on page eviction (only the rendered page content is pruned).

**Analog for glass card JSX structure to restyle (not restructure) — episode header stays a single `<button>`:** lines 345-359 (unchanged `aria-expanded`/`aria-controls` contract), only the countBadge (line 358, `formatVersionCount` pill) becomes plain text + `DisclosureIndicator` per UI-SPEC decision 8.

**Analog for the version-row → release-preview-row restyle:** lines 363-406 (`.versionRow`, `.versionIdentity`, `.versionLogoFallback`, `.metaBadge` `Play` button) — same data (`resolveLogoUrl`, fallback-circle-with-initials pattern at line 379) survives; the `.metaBadge` chips (lines 388-392) and `.playButton` `<a>` (lines 394-402) are replaced per UI-SPEC D-12/D-17/D-19 with a `·`-joined text line and a `Button` `href`-variant pointing at the release-detail route.

---

### `frontend/src/components/fansubs/FansubVersionBrowser.module.css` (rework — glass tokens)

**Analog for the `@supports` blur-fallback technique (mandatory reuse, not reinvention):** `frontend/src/app/anime/[id]/page.module.css` lines 119-124:
```css
@supports (backdrop-filter: blur(20px)) {
  .heroContainer {
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(20px);
  }
}
```
And the unconditional dual-prefix form used elsewhere on the same page (lines 139-140, 342-343):
```css
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
```

**Analog for the exact blur/saturate literal to copy verbatim for release sub-elements (UI-SPEC decision 14):** `OlderReleasesList.module.css` line 223: `backdrop-filter: blur(9px) saturate(1.65);`

**Analog for the dark-section context these new tokens sit inside:** `page.module.css` lines 555-573 (`.episodesSection` background `rgba(255,255,255,0.04)`, `.emptyEpisodes` text `rgba(255, 255, 255, 0.6)` — UI-SPEC's `--glass-text-muted` value is this exact literal, reused not invented) and lines 562-566 (`.episodesSection h2` white heading text, unchanged parent context).

**Analog for a locally-scoped (non-global) CSS custom property, matching UI-SPEC decision 1's "feature-local tokens, not globals.css" precedent:** `page.module.css` line 301's `.genreChip` block declares its own visual constants inline rather than in `globals.css` (cited directly in UI-SPEC as the precedent for `--role-chip-accent`-style local tokens — same file, same page, same "one-page-only value" reasoning).

**Analog for the `·`-separated dezenter Fließtext technique (D-12), exact existing precedent cited in UI-SPEC decision 9:** `ThemeTimeline.tsx` line 237 (`<span>{label} · {clock(...)}–{clock(...)}</span>`) and `GroupLeaderTimeline.module.css`'s dedicated `.separator { color: var(--text-secondary) }` class — copy this pattern (plain `<span>`/`<p>` joined by literal `" · "`, no per-segment container/border/radius/padding) for the new tech-line and extras-line markup instead of the current `.metaBadge` pill (`FansubVersionBrowser.module.css` lines 142-150, to be deleted).

---

### `frontend/src/components/ui/LoadingState.tsx` (additive `compact?: boolean` prop)

**Analog:** `EmptyState.tsx`'s existing `variant === 'compact'` branch (same file family, `ui.module.css`):
```tsx
// EmptyState.tsx (existing precedent to mirror)
className={classNames(
  styles.stateCard,
  styles.stateNeutral,
  variant === 'compact' && styles.stateCompact,
  className,
)}
```
`LoadingState.tsx` currently has no such branch (verbatim, full file):
```tsx
export function LoadingState({
  title = 'Inhalt wird vorbereitet',
  description = 'Die Datenstruktur und die zugehörigen Oberflächen werden geladen.',
}: LoadingStateProps) {
  return (
    <div className={`${styles.stateCard} ${styles.stateInfo}`}>
      <div className={styles.stateIcon} aria-hidden="true"><span className={styles.stateSpinner} /></div>
      <h3 className={styles.stateTitle}>{title}</h3>
      <p className={styles.stateDescription}>{description}</p>
    </div>
  )
}
```
Add `compact?: boolean` and apply the already-generic `styles.stateCompact` class (defined once in `ui.module.css` lines 1181-1184, already shared by `EmptyState`) — no new CSS class, no new component, per UI-SPEC decision 6.

**Analog for the D-36/D-37/D-38 state-primitive usage itself (no new component needed at all):**
- Forward/backward loading → `<LoadingState compact title="Weitere Episoden werden geladen …" />` / `"Frühere Episoden werden geladen …"`.
- Nachlade-Fehler → same `<ErrorState>` block already used for `switchState.error` (`FansubVersionBrowser.tsx` lines 301-313), wrapped in `<div role="alert">` — reuse this exact JSX shape, do not invent a second error visual:
```tsx
<div role="alert">
  <ErrorState
    title="Weitere Episoden konnten nicht geladen werden."
    description="Die bereits geladenen Episoden bleiben sichtbar."
    action={<Button variant="secondary" onClick={() => void retry()}>Erneut versuchen</Button>}
  />
</div>
```
- Ende der Liste → `<EmptyState variant="inline" title="Das waren alle Episoden." />` (the `variant === 'inline'` branch already renders a bare `<p className={styles.stateInline}>`, no card/icon — exact fit for D-38's "dezenter Text" requirement, zero new markup needed).

---

### `frontend/src/types/episodeVersion.ts` / `shared/contracts/openapi.yaml` (extend)

**Analog:** itself, `PublicEpisodeVersion` (`Pick<EpisodeVersion, ...> & { fansub_groups: FansubGroupSummary[] }`, lines 154-157) — add the same fields as the Go DTO extension (`container?`, `video_codec?`, `has_images`, `has_notes`, `has_karaoke`), and extend `PublicGroupedEpisode` (lines 159-168) with `filler_type`/`episode_type`. Keep the existing `Pick<...> &` composition style rather than duplicating fields already on `EpisodeVersion`.

---

## Shared Patterns

### Query-budget / no-N+1 discipline
**Source:** `episode_version_public_integration_test.go`'s `assertPublicBudget` + `episodePublicTracer` (pgx `QueryTracer` interface, counts statements and rows per request).
**Apply to:** Every backend plan in this phase that touches `ListPublicGroupedByAnimeID` — any new batched query (flags, extended group JOIN) must be exercised through this same tracer and asserted with an exact `require.Len(t, tr.queries, N, ...)`, not a loose upper bound.

### Public-projection cursor/scope validation (unchanged, do not fork)
**Source:** `episode_version_public_query.go`'s `PublicEpisodeOptions.Validate`/`normalized` (base64+JSON canonical-form cursor, `Fansub` raw-slug identity check before any DB round trip) and `episode_version_reads.go`'s `parseStrictNamedQuery` allowlist.
**Apply to:** Any new query parameter this phase might need (RESEARCH.md found none required) must be added to the explicit allowlist array (`"projection", "limit", "cursor", "includeVersions", "includeFansubs", "fansub"`), following the same fail-closed 400-response pattern — never a permissive default.

### Public visibility gate literals (images/notes/karaoke)
**Source:** `release_detail_public_repository_helpers.go` — `v.name='public'`, `rs.code='approved'`, `ma.status='ready'`, `rvm.deleted_at IS NULL` (images/karaoke); `rvn.visibility='public'`, `rvn.status='published'`, `rvn.deleted_at IS NULL` (notes).
**Apply to:** The new `episode_version_public_flags.go` batched query — these literals must be copied verbatim, not re-derived, to guarantee the preview flag and the release-detail page's own counters (`PublicReleaseImageCategoryTotals`) never disagree (RESEARCH.md Pitfall 2/3).

### Abort/race-guard coordination for in-flight client requests
**Source:** `FansubVersionBrowser.tsx`'s `requestRef useRef<AbortController | null>`, single-flight abort-and-replace pattern (lines 161-271).
**Apply to:** All new frontend fetch logic in this phase (`loadNext`, `loadPrevious`) — must share the same ref/coordination discipline that already correctly handles D-40/gate 12 (filter switch aborts any pending page load), not introduce a second independent abort mechanism.

### Glass/`backdrop-filter` + `@supports` fallback
**Source:** `frontend/src/app/anime/[id]/page.module.css` (`.heroContainer`, `@supports (backdrop-filter: blur(20px))` block; `.posterColumn`/`.infoCard` unconditional dual-prefix form) + `OlderReleasesList.module.css` line 223 (`blur(9px) saturate(1.65)` literal).
**Apply to:** `EpisodeGlassCard`/`ReleasePreviewRow`'s new CSS module — no new CSS technique, only new (locally-scoped) color tokens layered on the existing blur mechanism.

### Shared UI-state primitives (Loading/Error/Empty), no new components
**Source:** `frontend/src/components/ui/{LoadingState,ErrorState,EmptyState}.tsx` + `ui.module.css`'s `.stateCard`/`.stateCompact`/`.stateInline` classes.
**Apply to:** All D-36/D-37/D-38 infinite-scroll UI states — additive `compact` prop on `LoadingState` only; `ErrorState`/`EmptyState` already support what's needed.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `FansubVersionBrowser.windowing.test.tsx` (or equivalent, exact name TBD by planner) | test (Vitest/RTL) | batch (bounded-window eviction/restoration/scroll-stability assertions) | RESEARCH.md confirms no existing test exercises bounded-window eviction or backward-restoration anywhere in the codebase; this is a genuinely new test shape. Recommend structuring it around the existing `FansubVersionBrowser`/`OlderReleasesList` component-test conventions for mocking `getGroupedEpisodes`/`IntersectionObserver` (verify actual sibling test file name and its `IntersectionObserver` mock setup in Wave 0 before writing this file, per RESEARCH.md's Validation Architecture note that the exact existing test file name is unverified). |
| Bounded page-window + spacer-`<div>` eviction/restoration mechanism itself | component (client state machine) | streaming (windowed pagination) | RESEARCH.md Pattern 2 explicitly states: "No direct code precedent for the spacer technique in this codebase (new pattern)." Closest related-but-distinct precedent is `useNearViewportActivation`'s "activate once, never deactivate" model — cited as a partial conceptual analog only, not a copyable implementation. |
| Fixture anime seeding (≥50 episodes-with-releases, mixed classifications/types, Coop, images/notes/karaoke) for scale/windowing tests | migration/fixture (SQL, isolated test DB) | batch | No existing fixture at this scale exists; closest structural analog is `openEpisodeVersionPublicGroupFilterFixture` (`episode_version_public_group_filter_test.go`, Phase 163's anime 7/8 fixture pattern) which the new fixture should extend in shape (same `testsupport.OpenPhase117Postgres(t)` isolation convention) but not in scale — this is a genuinely larger, more varied dataset than any prior phase built. |

---

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`, `backend/internal/models/`, `frontend/src/components/fansubs/`, `frontend/src/components/ui/`, `frontend/src/app/anime/[id]/`, `frontend/src/app/anime/[id]/group/[groupId]/sections/`, `frontend/src/hooks/`, `frontend/src/types/`.
**Files scanned:** 15 read in full or targeted excerpt (`episode_version_public_query.go`, `episode_version_public_integration_test.go`, `episode_version_public_group_filter_test.go`, `episode_version_reads.go`, `episode_classification.go`, `episode_version.go` (models), `release_detail_public_repository_helpers.go`, `fansub_repository.go` (`ResolveFansubGroupIDForAnime`), `FansubVersionBrowser.tsx` + `.module.css`, `useNearViewportActivation.ts`, `OlderReleasesList.tsx`, `page.module.css` (excerpts), `api.ts` (`getGroupedEpisodes`), `types/episodeVersion.ts`, `LoadingState.tsx`/`ErrorState.tsx`/`EmptyState.tsx`/`DisclosureIndicator.tsx`/`ui.module.css` (excerpts)).
**Pattern extraction date:** 2026-09-17
