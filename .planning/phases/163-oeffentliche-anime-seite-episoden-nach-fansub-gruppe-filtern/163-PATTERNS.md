# Phase 163: Öffentliche Anime-Seite – Episoden nach Fansub-Gruppe filtern - Pattern Map

**Mapped:** 2026-09-17
**Files analyzed:** 9 (1 SQL/query file modified, 1 new backend test file, 1 handler modified, 1 model file modified, 1 repository file for a new small lookup, 3 frontend files modified, 1 contract file modified)
**Analogs found:** 9 / 9 — every file has a strong, same-repository analog because this phase is "apply an existing pattern one level deeper" (RESEARCH.md's own framing), not new infrastructure.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/repository/episode_version_public_query.go` | repository (SQL query builder) | CRUD (paginated read) | itself (in-place rewrite; SQL shape verified live in RESEARCH.md) | exact — modify, not replace |
| `backend/internal/repository/episode_version_public_group_filter_test.go` (new) | test (Postgres integration) | request-response | `backend/internal/repository/episode_version_public_integration_test.go` | exact |
| `backend/internal/handlers/episode_version_reads.go` | handler (Gin) | request-response | itself, `ListGroupedEpisodes` (extend in place) | exact |
| `backend/internal/repository/anime.go` / new small method (recommend a sibling file, e.g. `fansub_repository.go`) | repository (scoped existence/lookup) | CRUD (single bounded lookup) | `FansubRepository.ListAnimeAliasCandidates`'s `animeExists` pre-check + `anime_fansub_groups`-scoped join (`fansub_repository.go` lines 1047-1079, 1470) | exact |
| `backend/internal/models/episode_version.go` (`PublicGroupedEpisodesData`) | model (DTO) | transform | itself, `PublicEpisodePagination`/`PublicGroupedEpisodesData` struct (lines 237-247) | exact |
| `frontend/src/components/fansubs/FansubVersionBrowser.tsx` | component (client) | streaming/event-driven (refetch on filter change) | itself, existing `loadMore` AbortController pattern (lines 162-199) | exact |
| `frontend/src/app/anime/[id]/page.tsx` | route (SSR) | request-response | itself, existing `searchParams.fansub` read + `getGroupedEpisodes` SSR call (lines 42, 87-88, 94) | exact |
| `frontend/src/lib/api.ts` (`getGroupedEpisodes`) | service (fetch wrapper) | request-response | itself, existing overload pair (lines 2151-2185) | exact |
| `shared/contracts/openapi.yaml` (episodes path + schemas) | config (API contract) | transform | itself, `/api/v1/anime/{animeId}/episodes` GET + `PublicGroupedEpisode*` schemas (lines 6487-6560, 15385-15490) | exact |

## Pattern Assignments

### `backend/internal/repository/episode_version_public_query.go` (repository, CRUD/paginated read)

**Analog:** itself — this is an in-place SQL/struct rewrite, not a new file. RESEARCH.md already contains the exact verified-live replacement shape; treat it as the canonical diff target.

**Current struct/cursor to extend** (lines 14-25):
```go
// PublicEpisodeOptions belongs to the opt-in public projection only.
type PublicEpisodeOptions struct {
	Limit  int
	Cursor string
}
type publicEpisodeCursor struct {
	Version       int   `json:"v"`
	AnimeID       int64 `json:"a"`
	EpisodeNumber int32 `json:"n"`
	EpisodeID     int64 `json:"e"`
	VariantID     int64 `json:"i"`
}
```
Add `GroupID *int64` to `PublicEpisodeOptions` and a required `GroupID int64` field (`json:"g"`, `0` = "Alle") to `publicEpisodeCursor`, per RESEARCH.md Pattern 2. Bump every literal `Version: 1` / `cursor.Version != 1` to `2`.

**Current `normalized()` strict-decode gate to extend** (lines 31-61, the load-bearing lines are 46-59):
```go
raw, err := base64.RawURLEncoding.Strict().DecodeString(o.Cursor)
if err != nil {
	return 0, cursor, ErrValidation
}
decoder := json.NewDecoder(bytes.NewReader(raw))
decoder.DisallowUnknownFields()
if decoder.Decode(&cursor) != nil || decoder.Decode(new(any)) != io.EOF || cursor.Version != 1 || cursor.AnimeID != animeID || cursor.EpisodeNumber <= 0 || cursor.EpisodeID <= 0 || cursor.VariantID < 0 {
	return 0, cursor, ErrValidation
}
// Canonical serialization also rejects missing/duplicate fields and alternate encodings.
canonical, _ := json.Marshal(cursor)
if !bytes.Equal(raw, canonical) {
	return 0, cursor, ErrValidation
}
```
Add `cursor.Version != 2 || cursor.GroupID != requestGroupID` to the failure disjunction (`requestGroupID` = the resolved group id from the `fansub` param, `0` for "Alle"). No separate "is this an old cursor" branch is needed — the canonical re-marshal check already rejects any 4-field-shaped legacy cursor because it now re-serializes with an extra `"g"` field it didn't have (RESEARCH.md Pattern 2 rationale).

**Core SQL to change** — current buggy `LEFT JOIN LATERAL` (lines 66-102), the load-bearing block is lines 73-90:
```sql
FROM episodes e
LEFT JOIN LATERAL (
 SELECT rv.id, rev.id AS release_version_id, COALESCE(rev.title,e.title) AS title,
  NULLIF(BTRIM(rev.version),'') AS release_version,
  COALESCE(rv.video_quality,rv.resolution) AS video_quality, rv.subtitle_type,
  COALESCE(rev.release_date,fr.release_date) AS release_date
 FROM fansub_releases fr
 JOIN release_versions rev ON rev.release_id=fr.id
 JOIN release_variants rv ON rv.release_version_id=rev.id
 WHERE fr.episode_id=e.id
) v ON TRUE
WHERE e.anime_id=$1 AND CASE WHEN e.episode_number ~ '^[0-9]+$'
 THEN e.episode_number::NUMERIC BETWEEN 1 AND 2147483647 ELSE FALSE END
```
Replace with the verified-live shape from RESEARCH.md Pattern 1 (`JOIN LATERAL` instead of `LEFT JOIN LATERAL`, plus the group-visibility `EXISTS`):
```sql
JOIN LATERAL (
  SELECT rv.id, rev.id AS release_version_id, COALESCE(rev.title,e.title) AS title,
    NULLIF(BTRIM(rev.version),'') AS release_version,
    COALESCE(rv.video_quality,rv.resolution) AS video_quality, rv.subtitle_type,
    COALESCE(rev.release_date,fr.release_date) AS release_date
  FROM fansub_releases fr
  JOIN release_versions rev ON rev.release_id=fr.id
  JOIN release_variants rv ON rv.release_version_id=rev.id
  WHERE fr.episode_id=e.id
    AND EXISTS (
      SELECT 1 FROM release_version_groups rvg
      WHERE rvg.release_version_id = rev.id
        AND ($6::BIGINT IS NULL OR rvg.fansub_group_id = $6::BIGINT)
    )
) v ON TRUE
```
**Pitfall (from RESEARCH.md Pitfall 1):** the `EXISTS` predicate must reference `rev.id` (release_versions), not `rv.id` (release_variants) — copy verbatim, do not retype.

Add a `total` CTE (RESEARCH.md Pattern 3) cross-joined into the final `SELECT` for the D-12 hit count — `COUNT(DISTINCT episode_id)` is a plain aggregate, not valid inside `OVER(...)`:
```sql
, total AS ( SELECT COUNT(DISTINCT episode_id) AS n FROM inventory )
SELECT ... , total.n
FROM page p
LEFT JOIN LATERAL (...) g ON TRUE
CROSS JOIN total
```

**Query call site to extend** (`ListPublicGroupedByAnimeID`, lines 111-169; the bind-args line is 123):
```go
rows, err := r.db.Query(ctx, publicEpisodeQuery, animeID, cursor.EpisodeNumber, cursor.EpisodeID, cursor.VariantID, limit+1)
```
Append `options.GroupID` as `$6` — a nil `*int64` binds as SQL `NULL` directly (RESEARCH.md Code Examples; same pattern as `models.AnimeFilter.FansubGroupID *int64` in `anime.go`'s `buildAnimeListWhere`, see below).

**Cursor-encode call site to extend** (lines 152-156):
```go
page, next, more := trimCursorPage(items, limit, func(item publicEpisodeRow) string {
	c := publicEpisodeCursor{Version: 1, AnimeID: animeID, EpisodeNumber: item.episode.EpisodeNumber, EpisodeID: item.episode.EpisodeID, VariantID: item.variant.ID}
	raw, _ := json.Marshal(c)
	return base64.RawURLEncoding.EncodeToString(raw)
})
```
Set `Version: 2, GroupID: requestGroupID` in the literal.

**Existence gate to keep unchanged** (lines 116-122) — do not touch `ExistsVisible`, it stays the only anime-level public gate:
```go
exists, err := NewAnimeRepository(r.db).ExistsVisible(ctx, animeID)
if err != nil {
	return nil, err
}
if !exists {
	return nil, ErrNotFound
}
```

---

### New small lookup: resolve `fansub` slug → group id, scoped to the anime (D-05)

**Analog:** `backend/internal/repository/fansub_repository.go`, `ListAnimeAliasCandidates` (lines 1047-1079) + `animeExists` (line 1470) + `GetGroupBySlug` (line 215).

**Pre-check + scoped query pattern to copy** (lines 1047-1079):
```go
func (r *FansubRepository) ListAnimeAliasCandidates(
	ctx context.Context,
	animeID int64,
) ([]models.AnimeFansubAliasCandidate, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT fansub_group_id, alias
		FROM (
			SELECT afg.fansub_group_id, fg.slug AS alias, 1 AS priority
			FROM anime_fansub_groups afg
			JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
			WHERE afg.anime_id = $1
			...
```
Model the new method (e.g. `ResolveFansubGroupIDForAnime(ctx, animeID, slug)`, recommended location: a new small method on `FansubRepository` or `EpisodeVersionRepository`, per RESEARCH.md's file-level delta) directly on this shape:
```sql
SELECT fg.id FROM anime_fansub_groups afg
JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
WHERE afg.anime_id = $1 AND fg.slug = $2
```
Return `ErrNotFound` (this repo's sentinel, `errors.go` line 6 sibling — `ErrValidation` is the other sentinel already in scope) when zero rows match, so the handler's `errors.Is(err, repository.ErrNotFound)` branch (already used for the anime-not-found 404 path in `ListGroupedEpisodes`, see below) can be reused/mirrored for the 400 path. **Anime-scoped, not a bare global `fansub_groups` slug lookup** — this is the IDOR mitigation RESEARCH.md's Security Domain calls out explicitly (cross-anime group id must never leak another anime's episodes).

---

### `backend/internal/handlers/episode_version_reads.go` (handler, request-response)

**Analog:** itself, `ListGroupedEpisodes` (lines 16-82) — extend the existing strict-allowlist branch, do not add a parallel code path.

**Strict-allowlist extension point** (lines 31-47):
```go
query, err = parseStrictNamedQuery(c.Request.URL.RawQuery, "projection", "limit", "cursor", "includeVersions", "includeFansubs")
if err != nil {
	badRequest(c, "ungültige Episodenoptionen")
	return
}
for _, key := range []string{"projection", "limit", "cursor", "includeVersions", "includeFansubs"} {
	if len(query[key]) > 1 {
		badRequest(c, "ungültige Episodenoptionen")
		return
	}
}
```
Add `"fansub"` to both the `parseStrictNamedQuery(...)` call and the `>1`-duplicate-rejection loop (D-04: additive allowlist entry, same convention as the other public-only params).

**Options construction + validation call site** (lines 48-61):
```go
options := repository.PublicEpisodeOptions{Cursor: query.Get("cursor")}
if values, ok := query["limit"]; ok {
	raw := values[0]
	options.Limit, err = strconv.Atoi(raw)
	if err != nil || options.Limit <= 0 || strings.IndexFunc(raw, func(r rune) bool { return r < '0' || r > '9' }) >= 0 {
		badRequest(c, "ungültiges Episodenlimit")
		return
	}
}
if err = options.Validate(animeID); err != nil {
	badRequest(c, "ungültige Episodenoptionen")
	return
}
data, err = h.episodeVersionRepo.ListPublicGroupedByAnimeID(c.Request.Context(), animeID, options)
```
Insert the slug resolution (RESEARCH.md Code Examples, `errors.Is`-based 400 branch mirroring the existing 404 branch below) between the limit parse and `options.Validate`:
```go
var groupID *int64
if slug := query.Get("fansub"); slug != "" {
	id, err := h.fansubRepo.ResolveFansubGroupIDForAnime(c.Request.Context(), animeID, slug)
	if errors.Is(err, repository.ErrNotFound) {
		badRequest(c, "unbekannte Fansub-Gruppe für diesen Anime")
		return
	}
	if err != nil { /* existing 500 pattern below */ }
	groupID = &id
}
options.GroupID = groupID
```
`badRequest` signature to reuse (`backend/internal/handlers/anime.go` line 298): `func badRequest(c *gin.Context, message string)`.

**Existing error-mapping tail to keep unchanged** (lines 71-79) — the new 400 branch sits *before* this, the existing 404/500 mapping is untouched:
```go
if errors.Is(err, repository.ErrNotFound) {
	c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
	return
}
if err != nil {
	log.Printf("grouped episodes list: repo error (anime_id=%d): %v", animeID, err)
	c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
	return
}
```

**`parseStrictNamedQuery` signature to reuse unchanged** (`episode_version_grants.go` lines 129-150) — do not reimplement; this is exactly the "strict allowlist" pattern the whole handler already relies on.

---

### `backend/internal/repository/episode_version_public_group_filter_test.go` (new, Postgres integration test)

**Analog:** `backend/internal/repository/episode_version_public_integration_test.go` (all 356 lines) — copy its fixture/tracer/request-helper machinery verbatim into the new file (same package `repository_test`), then add only the new `Test...GroupFilter` function(s) covering Pflichtfälle B, C, D, E, F, I plus the updated J assertion. Per CLAUDE.md's 450-line cap, the existing file is already at 356 lines — do not append to it; this must be a sibling file reusing the same helpers (duplicate the small `openEpisodeVersionPublicFixture`/`episodePublicRequest`/`assertPublicBudget`/tracer block, or factor it into a shared `_test.go` helper file if the planner prefers — RESEARCH.md leaves this to the planner).

**Fixture-construction pattern to copy** (lines 48-120, `openEpisodeVersionPublicFixture`) — the load-bearing convention is the guarded, isolated-schema Postgres fixture, never `DATABASE_URL`:
```go
fixture := testsupport.OpenPhase117Postgres(t)
_, err := fixture.Exec(context.Background(), `
ALTER TABLE anime ADD COLUMN status TEXT NOT NULL DEFAULT 'done';
...
INSERT INTO release_version_groups VALUES (10,1),(10,2),(11,2),(200,1),(40,1),(40,2),(20,2);
...
`)
```
For the new group-filter fixture, add: (a) a Naruto-shaped anime with per-episode-exclusive groups (Pflichtfall E, D-18's real-data regression), (b) a coop version with 2 `release_version_groups` rows on the same `release_version_id` (Pflichtfall D), (c) a pagination fixture where the filtered group's only match is beyond page 1 (Pflichtfall F — reuse the existing anime-4 "Large release" 125-variant shape or a dedicated small one, per RESEARCH.md Wave 0 gaps), (d) a `release_versions` row with a `release_variants` row but **zero** `release_version_groups` rows (Pflichtfall I — currently no such row exists; extend the fixture, do not reuse fixture id 13 which has zero *variants*, a different case).

**Request/response helper pattern to copy** (lines 142-165, `episodePublicRequest` + `assertPublicBudget`):
```go
func episodePublicRequest(t *testing.T, pool *pgxpool.Pool, path string, status int) ([]byte, publicEpisodeEnvelope) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	h := handlers.NewFansubHandler(repository.NewFansubRepository(pool), repository.NewEpisodeVersionRepository(pool), nil, "admin", handlers.FansubProxyConfig{})
	router := gin.New()
	router.GET("/anime/:id/episodes", h.ListGroupedEpisodes)
	...
}
func assertPublicBudget(t *testing.T, tr *episodePublicTracer, limit int) {
	t.Helper()
	require.Len(t, tr.queries, 2, "existence plus one bounded query, including any metadata SQL")
	...
}
```
**Update `assertPublicBudget`'s expected query count** for the `fansub`-set case (RESEARCH.md Pflichtfall J): existence check (1) + slug resolution when `fansub` is present (0 or 1) + main statement (1) = 2 or 3 — the current hardcoded `require.Len(t, tr.queries, 2, ...)` must become conditional/parameterized in the new test file, not silently reused as-is when a `fansub` param is present.

**Foreign-cursor-rejects-before-SQL pattern to reuse for D-06/Pflichtfall G** (lines 250-256):
```go
tr.reset()
_, first := episodePublicRequest(t, pool, "/anime/1/episodes?projection=public&limit=1", 200)
require.NotNil(t, first.Data.Pagination.NextCursor)
cursor := *first.Data.Pagination.NextCursor
tr.reset()
episodePublicRequest(t, pool, "/anime/4/episodes?projection=public&cursor="+url.QueryEscape(cursor), 400)
require.Empty(t, tr.queries, "foreign anime cursor must fail before SQL")
```
Mirror this exact shape for "cursor obtained under filter A must be rejected under filter B/Alle" (D-06) — fetch a cursor with `fansub=<slug-a>`, then request page 2 with `fansub=<slug-b>` or no `fansub` at all, assert 400 and `tr.queries` empty.

**Pitfall 2 (from RESEARCH.md) — must-fix baseline assertions in the *existing* file, not the new one:**
- `TestEpisodeVersionPublicMixedAndIdentity` line 173: `require.Len(t, page.Data.Episodes, 4)` → must become `2` (episodes 11, 14 only; 12 and 13 are neutral rows that must disappear).
- `TestEpisodeVersionPublicAtomicPages` lines 245-246: `require.Len(t, seen, 126)` / `require.True(t, seen["42:0"])` → must become `125` and an assertion that episode 42 is **absent**.
- `TestEpisodeVersionPublicEmptyAndVisibility` line 268: `require.Len(t, neutral.Data.Episodes, 1)` → must become `require.Empty(t, neutral.Data.Episodes)`.
These three corrections belong in the existing `episode_version_public_integration_test.go` (TDD: write as failing RED assertions first, confirm they fail for the documented neutral-row reason, then apply the SQL fix).

---

### `backend/internal/models/episode_version.go` (`PublicGroupedEpisodesData`, model/DTO)

**Analog:** itself, current struct (lines 237-247):
```go
type PublicEpisodePagination struct {
	HasMore    bool    `json:"has_more"`
	NextCursor *string `json:"next_cursor"`
	RowLimit   int     `json:"row_limit"`
}

type PublicGroupedEpisodesData struct {
	AnimeID    int64                   `json:"anime_id"`
	Episodes   []PublicGroupedEpisode  `json:"episodes"`
	Pagination PublicEpisodePagination `json:"pagination"`
}
```
Add a top-level `EpisodeCount int64 `json:"episode_count"`` field, sibling to `Pagination` (RESEARCH.md's recommendation, Open Question 1 — planner's discretion on exact name/placement per CONTEXT.md D-12 discretion note, but top-level-sibling is the cheapest, already-idiomatic shape matching `AnimeID`).

---

### `frontend/src/components/fansubs/FansubVersionBrowser.tsx` (client component, event-driven refetch)

**Analog:** itself — the existing `loadMore` AbortController/state-replacement pattern (lines 162-199) is the exact shape D-07..D-10 need one level up (group switch instead of page append).

**Reusable abortable-request pattern** (lines 162-199):
```tsx
const [inventory, setInventory] = useState({ source: episodes, episodes, pagination })
const [loadState, setLoadState] = useState<{ source: PublicGroupedEpisode[]; loading: boolean; error: string | null }>({
	source: episodes, loading: false, error: null,
})
const requestRef = useRef<AbortController | null>(null)
...
async function loadMore() {
	if (!page?.has_more || !page.next_cursor || requestRef.current) return
	const controller = new AbortController()
	requestRef.current = controller
	setLoadState({ source: episodes, loading: true, error: null })
	try {
		const response = await getGroupedEpisodes(animeID, {
			projection: 'public', limit: 24, cursor: page.next_cursor, signal: controller.signal,
		})
		if (controller.signal.aborted || requestRef.current !== controller) return
		setInventory({
			source: episodes,
			episodes: mergeEpisodes(loadedEpisodes, response.data.episodes),
			pagination: response.data.pagination,
		})
	} catch {
		if (controller.signal.aborted || requestRef.current !== controller) return
		setLoadState({ source: episodes, loading: false, error: 'Weitere Episoden konnten nicht geladen werden.' })
	} finally {
		if (!controller.signal.aborted && requestRef.current === controller) {
			requestRef.current = null
			setLoadState((current) => ({ ...current, loading: false }))
		}
	}
}
```
For the new group-switch handler: **do not call `mergeEpisodes`** — per D-07/RESEARCH.md Pitfall 4, replace `inventory`/`loadState` wholesale (`setInventory({source: episodes, episodes: response.data.episodes, pagination: response.data.pagination})`), because `mergeEpisodes`'s `Map`-based dedup-by-`episode_id`/`variant_id` (lines 97-106) has no group awareness and would silently reintroduce cross-filter data if the switch were routed through `loadMore`'s append semantics.

**`updateFansubSelection`, the single call site to attach the new refetch to** (lines 141-156):
```tsx
function updateFansubSelection(groupID: number | null) {
	if (fansubOptions.length < 2) return
	const slug = groupID === null
		? null
		: fansubOptions.find((relation) => relation.fansub_group?.id === groupID)?.fansub_group?.slug ?? null
	const params = new URLSearchParams(window.location.search)
	if (slug) params.set('fansub', slug)
	else params.delete('fansub')
	const query = params.toString()
	window.history.pushState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
	setSelectedSlug(slug)
}
```
D-07 requires this function to also trigger the abortable first-page refetch for the new slug (in-flight request cancelled via the existing `requestRef` convention) after the `pushState`/`setSelectedSlug` calls.

**Popstate handler to extend for D-09** (lines 132-139):
```tsx
useEffect(() => {
	function handlePopState() {
		const params = new URLSearchParams(window.location.search)
		setSelectedSlug(params.get('fansub'))
	}
	window.addEventListener('popstate', handlePopState)
	return () => window.removeEventListener('popstate', handlePopState)
}, [])
```
D-09 ("Browser Zurück/Vor lädt immer neu") means this handler must also trigger the same refetch-and-replace path as `updateFansubSelection`, not just update `selectedSlug`.

**Code to remove per D-15** (must be deleted, not kept parallel to the new server filter):
- `getSummaryVersion`'s group-preference fallback logic (lines 80-95) simplifies once versions arriving from the server are already filtered — but D-03 says it must still pick the right one from an already-filtered set; keep the function, remove any remaining "all versions, then filter" assumption.
- `groupMatchedVersions`/`hasNoMatchingVersion` local computation (lines 233-236) and the `noVersionHint` block (lines 258-262):
```tsx
const groupMatchedVersions = activeFansubGroupID !== null
	? episode.versions.filter((item) => item.fansub_groups?.some((g) => g.id === activeFansubGroupID))
	: episode.versions
const hasNoMatchingVersion = activeFansubGroupID !== null && groupMatchedVersions.length === 0
...
{hasNoMatchingVersion ? (
	<div className={styles.noVersionHint}>
		<p className={styles.noVersionText}>{page?.has_more ? 'Im geladenen Ausschnitt ist noch keine Version dieser Gruppe vorhanden.' : 'Keine Version dieser Gruppe verfügbar.'}</p>
		<p className={styles.noVersionAction}>{page?.has_more ? 'Laden Sie weitere Episoden und Versionen oder wählen Sie eine andere Gruppe.' : 'Wechseln Sie zu einer anderen Fansub-Gruppe.'}</p>
	</div>
) : (
	groupMatchedVersions.map((version) => { ... })
)}
```
These become dead code once the backend never returns an episode without a matching version (RESEARCH.md Pitfall 3) — delete entirely, render `episode.versions` directly.

**UI primitives constraint (CLAUDE.md):** the existing native `<button type="button" className={styles.episodeHeader} ...>` (line 242) is flagged in CONTEXT.md's Deferred Ideas as pre-existing tech debt — do not fix unless the row is otherwise touched by this phase's changes; new elements added for D-14/D-16/D-17 (empty state, error banner, retry button) MUST use `@/components/ui` primitives (the existing `<Button variant="secondary" loading={isLoading} ...>` at line 317 is the correct analog to copy for any new retry/error button).

---

### `frontend/src/app/anime/[id]/page.tsx` (SSR route, request-response)

**Analog:** itself — `searchParams.fansub` is already read (D-04/162), just not yet forwarded into the episodes fetch.

**Current SSR fetch call to extend** (lines 87-97):
```tsx
const rawFansubParam =
	typeof resolvedSearchParams.fansub === 'string' ? resolvedSearchParams.fansub : undefined

const embySeriesUrl = getEmbySeriesUrlForAnime(anime.id)
const [animeFansubsResult, groupedEpisodesResult, commentsResult, relationsResult] =
	await Promise.allSettled([
		getAnimeFansubs(anime.id),
		getGroupedEpisodes(anime.id, { projection: 'public', limit: 24 }),
		getAnimeComments(animeID, { page: 1, per_page: 10 }),
		getAnimeRelations(anime.id),
	])
```
D-11 requires passing the resolved slug into the same call: `getGroupedEpisodes(anime.id, { projection: 'public', limit: 24, fansub: rawFansubParam })` — mirrors 162 D-04's SSR-determinism pattern already used for `initialActiveSlug`.

**Heading to change for D-12** (line 257):
```tsx
const episodeCount = anime.episodes.length
...
<h2>Episoden ({episodeCount})</h2>
```
Per D-12, `episodeCount` must switch from `anime.episodes.length` (anime's total) to the new `episode_count`/hit-count field, and per D-12's "aktualisiert sich beim Gruppenwechsel ... Quelle ist die Client-Liste" clause, the heading itself must move into `FansubVersionBrowser.tsx`'s client render (the count can no longer live purely server-side in `page.tsx` once the group can change client-side without a page reload) — plan this as a component-boundary move, not a pure prop-value swap.

**Fallback list to remove per D-16** (lines 269-298):
```tsx
) : anime.episodes.length === 0 ? (
	<div className={styles.emptyEpisodes}>Noch keine Episoden vorhanden.</div>
) : (
	<ul className={styles.episodeList}>
		{anime.episodes.map((episode) => (
			<li key={episode.id} className={styles.episodeItem}>
				...
```
This whole branch (rendered when `groupedEpisodesResponse` is null, i.e. the public endpoint call failed) must stop rendering `anime.episodes` (which includes episodes without releases) and instead render a neutral error state using `@/components/ui` primitives (D-16, D-17).

---

### `frontend/src/lib/api.ts` (`getGroupedEpisodes`, service/fetch wrapper)

**Analog:** itself, the existing overload pair + query-building body (lines 2151-2185):
```ts
export function getGroupedEpisodes(
  animeID: number,
  options: PublicGroupedEpisodesOptions,
): Promise<PublicGroupedEpisodesResponse>;
export function getGroupedEpisodes(animeID: number): Promise<GroupedEpisodesResponse>;
export async function getGroupedEpisodes(
  animeID: number,
  options?: PublicGroupedEpisodesOptions,
): Promise<GroupedEpisodesResponse | PublicGroupedEpisodesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const query = new URLSearchParams();
  if (options) {
    query.set("projection", options.projection);
    if (options.limit !== undefined) query.set("limit", String(options.limit));
    if (options.cursor !== undefined) query.set("cursor", options.cursor);
  }
  const suffix = query.size ? `?${query}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${animeID}/episodes${suffix}`,
    {
      cache: "no-store",
      ...(options?.signal ? { signal: options.signal } : {}),
    },
  );
  ...
```
Add one more conditional `query.set` line, symmetric with `limit`/`cursor`:
```ts
if (options.fansub !== undefined) query.set("fansub", options.fansub);
```
No other structural change — the overload signatures, `authorizedFetch`, and error-parsing tail (`parseApiError`/`ApiError`, lines 2176-2184) stay exactly as-is.

**Type to extend** — `frontend/src/types/episodeVersion.ts`, `PublicGroupedEpisodesOptions` (lines 178-183):
```ts
export interface PublicGroupedEpisodesOptions {
  projection: 'public'
  limit?: number
  cursor?: string
  signal?: AbortSignal
}
```
Add `fansub?: string`. Also extend `PublicGroupedEpisodesResponse['data']` (lines 170-176) with `episode_count: number`, sibling to `pagination`, matching the Go DTO change above.

---

### `shared/contracts/openapi.yaml` (episodes path + schemas, config/contract)

**Analog:** itself — the existing `limit`/`cursor` query-parameter entries and `PublicGroupedEpisodesResponse` schema (lines 6487-6560, 15385-15490) are the direct template for the additive `fansub` parameter and `episode_count` field.

**Query parameter block to extend** (lines 6520-6533):
```yaml
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 24
          description: Public only. Maximum atomic variant or neutral-episode rows, not episode groups. No automatic page iteration.
        - name: cursor
          in: query
          schema:
            type: string
            maxLength: 512
          description: Public only. Opaque versioned anime-scoped keyset cursor; invalid format or anime scope returns 400. Omit or empty for the first page.
```
Add a sibling `fansub` entry (`type: string`, public-only, description covering the anime-scoped resolution + fail-closed 400 behavior per D-05).

**Response schema block to extend** (lines 15474-15490):
```yaml
    PublicGroupedEpisodesResponse:
      type: object
      required: [data]
      properties:
        data:
          type: object
          required: [anime_id, episodes, pagination]
          properties:
            anime_id:
              type: integer
              format: int64
            episodes:
              type: array
              items:
                $ref: "#/components/schemas/PublicGroupedEpisode"
            pagination:
              $ref: "#/components/schemas/PublicGroupedEpisodesPagination"
```
Add `episode_count` (`type: integer, format: int64`) to `required` and `properties`, sibling to `pagination`, matching the Go/TS additions above 1:1.

**400-response description to extend** (line 6544) — currently:
```yaml
        "400":
          description: Invalid anime id, projection, limit, cursor, duplicate public options or contradictory include flags. ...
```
Extend the description to mention the new `fansub` slug validation (foreign/unknown slug → 400, per D-05).

## Shared Patterns

### Strict query-parameter allowlisting (backend)
**Source:** `backend/internal/handlers/episode_version_grants.go` lines 129-150 (`parseStrictNamedQuery`), consumed in `episode_version_reads.go` lines 23, 31.
**Apply to:** the `fansub` parameter addition in `episode_version_reads.go` — always add new public-projection query params to *both* the allowlist call and the duplicate-value rejection loop; never accept a parameter outside this mechanism.

### Opaque, strictly-decoded, canonicalized cursor (backend)
**Source:** `episode_version_public_query.go` lines 39-61 (`publicEpisodeCursor` + `normalized()`).
**Apply to:** the `GroupID` cursor-scope field (D-06) — extending the struct and bumping `Version` is sufficient; the existing `DisallowUnknownFields` + canonical-remarshal-equality check automatically invalidates any cursor that doesn't carry the new required field, with no separate migration branch needed.

### Anime-scoped `anime_fansub_groups` existence/lookup (backend)
**Source:** `backend/internal/repository/fansub_repository.go` lines 1047-1079 (`ListAnimeAliasCandidates`), line 1470 (`animeExists`), `backend/internal/repository/anime.go` lines 362-372 (`buildAnimeListWhere`'s `FansubGroupID` EXISTS clause).
**Apply to:** the new slug→group-id resolver (D-05) — always scope by `anime_fansub_groups.anime_id`, never do a bare global `fansub_groups` lookup, to prevent cross-anime IDOR leakage.

### `ErrNotFound`/`ErrValidation` sentinel-based error mapping (backend)
**Source:** `backend/internal/repository/errors.go` line 6; consumed via `errors.Is(err, repository.ErrNotFound)` in `episode_version_reads.go` lines 71-74 and `episode_version_public_integration_test.go` line 275.
**Apply to:** the new slug-resolution 400 path and any group-filter validation error — reuse the existing sentinel + `errors.Is` mapping convention, do not introduce a new error type.

### Nullable filter parameter binding via `*int64` (backend)
**Source:** `backend/internal/models/anime.go`'s `AnimeFilter.FansubGroupID *int64`, consumed in `anime.go` lines 362-372.
**Apply to:** `PublicEpisodeOptions.GroupID *int64` and its SQL bind — pgx binds `nil` as SQL `NULL` directly, no `sql.NullInt64` wrapper.

### Abortable, last-write-wins client fetch state (frontend)
**Source:** `frontend/src/components/fansubs/FansubVersionBrowser.tsx` lines 162-199 (`requestRef`/`AbortController` + `{source, episodes, pagination}`/`{source, loading, error}` state pairs).
**Apply to:** the group-switch refetch (D-07..D-10) — reuse this exact pattern rather than the generic `useCancellableSlugState` hook (RESEARCH.md's Alternatives table: that hook discards `data` while loading, which breaks D-08's "old list stays visible, dimmed" requirement).

### URL state via `window.history.pushState`, never the Next.js router (frontend)
**Source:** `FansubVersionBrowser.tsx` lines 141-156 (`updateFansubSelection`), inherited from Phase 162 (`162-RESEARCH.md`'s RSC-refetch rationale).
**Apply to:** any new URL-state write in this phase (group switch) — `router.push`/`router.replace` would trigger an RSC refetch of the whole dynamic route; `pushState` + local state update is the established, deliberate alternative.

### `@/components/ui` primitives for all new user-facing elements (frontend, CLAUDE.md-mandated)
**Source:** `FansubVersionBrowser.tsx` line 6-7 import, line 317 usage (`<Button variant="secondary" loading={isLoading} onClick={...}>`).
**Apply to:** every new empty-state, error-state, and retry-button element required by D-14/D-16/D-17 — never a native `<button>`/`<div role="alert">`-only pattern; the existing `<Button>` usage at line 317 with a `loading` prop is the direct copy target for the "Erneut versuchen" retry button (D-10).

## No Analog Found

None — every file in scope has a strong, directly-reusable analog either in the same file (in-place extension) or in an immediately adjacent file in the same package/directory. This is consistent with RESEARCH.md's own conclusion ("every piece needed for this phase ... already exists elsewhere in this exact file/component").

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`, `backend/internal/models/`, `frontend/src/components/fansubs/`, `frontend/src/app/anime/[id]/`, `frontend/src/lib/`, `frontend/src/types/`, `shared/contracts/openapi.yaml`.
**Files scanned:** 9 target files read in full or via targeted grep+offset reads (`episode_version_public_query.go`, `episode_version_public_integration_test.go`, `episode_version_reads.go`, `episode_version_grants.go`, `anime.go`, `fansub_repository.go`, `episode_version.go` (models), `FansubVersionBrowser.tsx`, `page.tsx`, `api.ts` (targeted), `episodeVersion.ts` (targeted), `openapi.yaml` (targeted)); plus 163-CONTEXT.md and 163-RESEARCH.md.
**Pattern extraction date:** 2026-09-17
