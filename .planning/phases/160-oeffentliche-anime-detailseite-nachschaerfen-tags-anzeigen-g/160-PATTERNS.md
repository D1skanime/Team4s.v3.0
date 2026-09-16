# Phase 160 (Teilschritt „Tags und Genres") - Pattern Map

**Mapped:** 2026-09-16
**Files analyzed:** 15 (new + modified, backend + frontend + migration)
**Analogs found:** 13 / 15 (2 flagged "no exact analog" — new admin CRUD page composition)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `database/migrations/0168_tag_genre_language_names.up/.down.sql` | migration | CRUD (schema) | `database/migrations/0021_add_normalized_metadata_tables.up.sql` (`anime_titles`) | exact |
| `backend/internal/repository/anime_metadata.go` (extend `loadNormalizedAnimeMetadata`) | repository | request-response (read, SQL-budget-locked) | itself, existing genre/tag SELECT blocks (lines 67-127) | exact (in-place extension) |
| `backend/internal/repository/admin_content.go` (extend: new tag_names/genre_names CRUD) | repository | CRUD | itself — `replaceAuthoritativeAnimeGenres`/`Tags` (write) + `buildAuthoritative*TokensQuery`/`List*Tokens` (read+aggregate) | exact |
| `backend/internal/handlers/admin_content_tags.go` / `admin_content_genres.go` (new PATCH handlers, sibling file or extend) | controller | request-response | `ListTagTokens` (`admin_content_tags.go:13-49`) | exact |
| `backend/cmd/server/admin_routes.go` (register new endpoints) | route | request-response | itself, lines 95-96 (`/admin/genres`, `/admin/tags` registration) | exact |
| `backend/internal/handlers/search.go` (`Search`, `parseSearchQueryTerm` reorder) | controller | request-response | itself, `Search()` lines 64-181 | exact (in-place) |
| `backend/internal/repository/search_anime.go` (`buildSearchAnimeQuery` genre/tag EXISTS) | repository | request-response | itself, lines 90-103 | exact (in-place) |
| `backend/internal/repository/search_repository.go` (`searchesFansub` q-less guard — Pitfall 1) | repository | request-response | itself, lines 27-30, 49-63 | exact (in-place) |
| `frontend/src/app/anime/[id]/page.tsx` (Tags block + genre chips → Links) | component (Server Component) | request-response (SSR) | itself — `.fansubChip` Link pattern (lines 232-243) + `.genreChip` span block (lines 154-167) | exact (both halves already in this file) |
| `frontend/src/app/anime/[id]/page.module.css` (`.tagsSection`/`.tagChip`, genre chip → link states) | config (styles) | — | itself — `.genreChip`/`.fansubChip`/`.divider` (lines 294-317, 458-463, 518-530) | exact |
| `frontend/src/app/suche/useDebouncedSearch.ts` (`MIN_QUERY_LENGTH` bypass) | hook | request-response | itself, lines 200-217 | exact (in-place) |
| `frontend/src/app/suche/SearchResults.tsx` (empty-state gate mirror) | component | request-response | itself, lines 109-128 | exact (in-place) |
| `frontend/src/app/admin/tags-genres/` (new admin page — list + inline per-row German name edit) | component + provider (client) | CRUD | Table shell: `frontend/src/app/admin/role-capabilities/RoleCapabilityTable.tsx`; row-edit mechanics: `frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx` | role-match (composed, no single exact analog) |
| `frontend/src/lib/api.ts` (new admin API helper functions for tag/genre name PATCH) | utility | request-response | itself — existing `getSearch`/`getSearchSuggestions`/admin token fetchers (same file) | exact |
| `shared/contracts/openapi.yaml` (extend `/search` q-optional, new admin endpoints) | config | — | itself, existing `/search` + `/admin/genres`/`/admin/tags` schema blocks (lines 749-888, 2966-3064) | exact |

## Pattern Assignments

### `database/migrations/0168_tag_genre_language_names.up.sql` / `.down.sql` (migration, CRUD schema)

**Analog:** `database/migrations/0021_add_normalized_metadata_tables.up.sql`

**Core pattern** (verbatim source, `anime_titles`, lines 1-18):
```sql
-- Phase 5 Package 2 Task 3: Normalized Metadata Tables Migration
-- Creates anime_titles and anime_relations for normalized metadata storage
-- Shadow mode: Dual-read pattern - legacy flat columns remain unchanged

-- Anime titles - normalized storage for multi-language, multi-variant titles
CREATE TABLE IF NOT EXISTS anime_titles (
    id BIGSERIAL PRIMARY KEY,
    anime_id BIGINT NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    language_id BIGINT NOT NULL REFERENCES languages(id),
    title TEXT NOT NULL,
    title_type_id BIGINT NOT NULL REFERENCES title_types(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_anime_title UNIQUE (anime_id, language_id, title_type_id)
);

CREATE INDEX IF NOT EXISTS idx_anime_title_anime ON anime_titles(anime_id);
CREATE INDEX IF NOT EXISTS idx_anime_title_language ON anime_titles(language_id);
CREATE INDEX IF NOT EXISTS idx_anime_title_type ON anime_titles(title_type_id);
```

**Copy shape (no `title_type_id` equivalent — D-02/D-03, one name per tag+language):**
```sql
CREATE TABLE IF NOT EXISTS tag_names (
    id BIGSERIAL PRIMARY KEY,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    language_id BIGINT NOT NULL REFERENCES languages(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tag_name_language UNIQUE (tag_id, language_id)
);
CREATE INDEX IF NOT EXISTS idx_tag_names_tag ON tag_names(tag_id);
-- mirror for genre_names(genre_id, language_id, name)
```
`languages` already has the `de` row seeded from `database/migrations/0020_add_metadata_reference_tables.up.sql` — no seed migration needed. Next free migration number confirmed via `ls database/migrations` = **0168** (last existing: `0167_episode_type_source`).

---

### `backend/internal/repository/anime_metadata.go` (repository, request-response, SQL-budget-locked)

**Analog:** itself — `loadNormalizedAnimeMetadata`, genre block lines 67-96, tag block lines 98-127

**Current genre query (extend in place, do NOT add a new `db.Query` call):**
```go
// Source: backend/internal/repository/anime_metadata.go:67-77
genreRows, err := db.Query(
    ctx,
    `
    SELECT g.name
    FROM anime_genres ag
    JOIN genres g ON g.id = ag.genre_id
    WHERE ag.anime_id = $1
    ORDER BY g.name ASC
    `,
    animeID,
)
```

**Required shape (COALESCE + LEFT JOIN, same statement count = 3 queries total for titles+genres+tags, keeps the hard-coded SQL-budget of 7 total detail statements green):**
```sql
SELECT COALESCE(gn.name, g.name)
FROM anime_genres ag
JOIN genres g ON g.id = ag.genre_id
LEFT JOIN genre_names gn
  ON gn.genre_id = g.id
 AND gn.language_id = (SELECT id FROM languages WHERE code = 'de')
WHERE ag.anime_id = $1
ORDER BY g.name ASC
```
Apply the identical pattern to the tag query (lines 98-108) with `tag_names`/`tag_id`. Do not touch `mergeNormalizedAnimeMetadata`, `uniqueSortedGenres`, or the `normalizedAnimeMetadata` struct shape beyond what the caller already returns — genres/tags remain `[]string` (already displayed name).

**Anti-pattern warning (Pitfall 2 from RESEARCH.md):** `TestAnimePublicReadDetailStoredSlugAndSQLBudget` (`backend/internal/repository/anime_public_read_integration_test.go:255`) hard-asserts `len(queries) != 7`. A 4th genre/tag query breaks this test. Modify the two existing `SELECT` statements only.

---

### `backend/internal/repository/admin_content.go` (repository, CRUD)

**Analog:** itself — write pattern from `replaceAuthoritativeAnimeGenres` (lines 123-163), aggregate-read pattern from `buildAuthoritativeGenreTokensQuery`/`ListGenreTokens` (lines 210-279)

**Write pattern to mirror for a per-tag/genre single-language upsert** (note: this is a DIFFERENT shape than `replaceAuthoritative*` — that's a bulk per-anime delete+reinsert; the new endpoint is per-tag/genre, global, single row upsert):
```go
// Source: backend/internal/repository/admin_content.go:123-163 (replaceAuthoritativeAnimeGenres)
// — study the tx.Exec(...) parameterization convention ($n binds, ON CONFLICT ...
// DO UPDATE / DO NOTHING), not the bulk-replace control flow itself.
if _, err := tx.Exec(
    ctx,
    `
    INSERT INTO genres (name)
    VALUES ($1)
    ON CONFLICT (name) DO NOTHING
    `,
    genre,
); err != nil {
    return fmt.Errorf("ensure authoritative genre %q: %w", genre, err)
}
```

**Aggregate-read pattern to mirror for the admin list (usage count):**
```go
// Source: backend/internal/repository/admin_content.go:210-217
func buildAuthoritativeGenreTokensQuery() string {
    return `
        SELECT g.name, COUNT(*) AS usage_count
        FROM anime_genres ag
        JOIN genres g ON g.id = ag.genre_id
        GROUP BY g.name
    `
}
```
Extend with `LEFT JOIN genre_names gn ON gn.genre_id = g.id AND gn.language_id = (SELECT id FROM languages WHERE code = 'de')` and add `gn.name AS name_de` to the SELECT list for the admin page's "current German name" column. `ListGenreTokens`/`ListTagTokens` (lines 255-279, 334-358) show the `rows.Scan` + `defer rows.Close()` + `rows.Err()` loop convention to copy for the new list function.

**Error handling pattern (uniform across this file):** every DB call wraps errors with `fmt.Errorf("<action> <context>: %w", err)` — no bare error returns, no panics.

---

### `backend/internal/handlers/admin_content_tags.go` (controller, request-response)

**Analog:** itself — `ListTagTokens` (lines 1-49)

**Full pattern to copy (imports, admin gate, param validation, response envelope):**
```go
// Source: backend/internal/handlers/admin_content_tags.go:1-49
package handlers

import (
    "log"
    "net/http"
    "strconv"
    "strings"

    "github.com/gin-gonic/gin"
)

func (h *AdminContentHandler) ListTagTokens(c *gin.Context) {
    if _, ok := h.requireAdmin(c); !ok {
        return
    }

    q := strings.TrimSpace(c.Query("query"))
    if q == "" {
        q = strings.TrimSpace(c.Query("q"))
    }
    if len([]rune(q)) > 100 {
        badRequest(c, "ungültiger query parameter")
        return
    }
    // ... limit parsing ...

    items, err := h.repo.ListTagTokens(c.Request.Context(), q, limit)
    if err != nil {
        log.Printf("admin_content list_tags: repo error: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
        return
    }

    c.JSON(http.StatusOK, gin.H{"data": items})
}
```
New `PATCH /admin/tags/:id/names/de` (and `/admin/genres/:id/names/de`) handlers reuse `h.requireAdmin(c)` first, then a length-capped body-field validation (mirror `len([]rune(q)) > 100`), then a repo call, then the same `gin.H{"data": ...}` / `gin.H{"error": gin.H{"message": ...}}` envelope shapes.

---

### `backend/cmd/server/admin_routes.go` (route, request-response)

**Analog:** itself, lines 95-96

```go
// Source: backend/cmd/server/admin_routes.go:95-96
v1.GET("/admin/genres", auth, deps.adminContentHandler.ListGenreTokens)
v1.GET("/admin/tags", auth, deps.adminContentHandler.ListTagTokens)
```
New PATCH routes register the same way (same `auth` middleware, same `deps.adminContentHandler` receiver):
```go
v1.PATCH("/admin/tags/:id/names/:languageCode", auth, deps.adminContentHandler.UpsertTagName)
v1.PATCH("/admin/genres/:id/names/:languageCode", auth, deps.adminContentHandler.UpsertGenreName)
```

---

### `backend/internal/handlers/search.go` (controller, request-response — D-08 bypass)

**Analog:** itself — `Search()` lines 64-181

**Current q-gate (must reorder so genre/tag parsing happens BEFORE this check — Pitfall 3):**
```go
// Source: backend/internal/handlers/search.go:80-88
q, ok := parseSearchQueryTerm(c)
if !ok {
    badRequest(c, "der Suchbegriff muss mindestens 2 Zeichen lang sein")
    return
}
if len(q) > searchMaxQueryLen {
    badRequest(c, "ungültiger q parameter")
    return
}

searchType, ok := allowedSearchTypes[strings.TrimSpace(c.DefaultQuery("type", "alle"))]
```
Genre/tag parsing currently happens later, lines 113-122:
```go
// Source: backend/internal/handlers/search.go:113-122
genre, err := parseOptionalFilterString(c.Query("genre"))
if err != nil {
    badRequest(c, "ungültiger genre parameter")
    return
}
tag, err := parseOptionalFilterString(c.Query("tag"))
if err != nil {
    badRequest(c, "ungültiger tag parameter")
    return
}
```
**Required D-08 shape:** parse `genre`/`tag` (and any other independent parses) BEFORE the final q-required decision. `q, qOK := parseSearchQueryTerm(c)` stays non-fatal; the `badRequest(... "mindestens 2 Zeichen" ...)` call only fires when `!qOK && genre == nil && tag == nil`. Keep `parseSearchQueryTerm`'s existing rune-based length check (lines 209-215) untouched — only its caller's control flow changes.

**Validation helper pattern to reuse verbatim (already exists, no change needed):**
```go
// Source: backend/internal/handlers/search.go:262-271
func parseOptionalFilterString(raw string) (*string, error) {
    trimmed := strings.TrimSpace(raw)
    if trimmed == "" {
        return nil, nil
    }
    if len(trimmed) > searchMaxFilterLen {
        return nil, errSearchFilterTooLong
    }
    return &trimmed, nil
}
```

---

### `backend/internal/repository/search_anime.go` (repository, request-response — D-10 multi-language match)

**Analog:** itself, lines 90-103

**Current base-name-only genre/tag filter:**
```go
// Source: backend/internal/repository/search_anime.go:90-103
if f.Genre != nil && *f.Genre != "" {
    conditions = append(conditions, fmt.Sprintf(
        `EXISTS (SELECT 1 FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id
            WHERE ag.anime_id = anime.id AND lower(g.name) = lower($%d))`, argPos))
    args = append(args, *f.Genre)
    argPos++
}
if f.Tag != nil && *f.Tag != "" {
    conditions = append(conditions, fmt.Sprintf(
        `EXISTS (SELECT 1 FROM anime_tags atg JOIN tags t ON t.id = atg.tag_id
            WHERE atg.anime_id = anime.id AND lower(t.name) = lower($%d))`, argPos))
    args = append(args, *f.Tag)
    argPos++
}
```
**Required D-10 shape (match base name OR any language name):**
```sql
EXISTS (SELECT 1 FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id
  WHERE ag.anime_id = anime.id AND (lower(g.name) = lower($n)
    OR EXISTS (SELECT 1 FROM genre_names gn WHERE gn.genre_id = g.id AND lower(gn.name) = lower($n))))
```
Same `$argPos` bind-parameter discipline as the rest of the file — never string-interpolate the name value (V5/ASVS constraint, confirmed 100% parameterized across this file).

**Empty-`Q` fallback already handled correctly here (no change needed):**
```go
// Source: backend/internal/repository/search_anime.go:125-128
func buildSearchAnimeOrder(f models.SearchQuery, qPos int) string {
    if f.Q == "" {
        return "display_title ASC"
    }
    ...
```

---

### `backend/internal/repository/search_repository.go` (repository — Pitfall 1 fix, fansub-empty-WHERE)

**Analog:** itself, lines 27-30 and 49-63

**Current dispatch (bug source: `searchesFansub("")` returns `true`, and `buildSearchFansubQuery` with `f.Q==""` and no `f.Status` produces an EMPTY WHERE ⇒ returns ALL fansub groups):**
```go
// Source: backend/internal/repository/search_repository.go:27-30
func searchesAnime(t string) bool  { return t == "" || t == "all" || t == "anime" }
func searchesFansub(t string) bool { return t == "" || t == "all" || t == "fansub" }
```
```go
// Source: backend/internal/repository/search_repository.go:49-63
if searchesAnime(query.Type) {
    items, total, err := searchAnime(ctx, tx, query)
    ...
}
if searchesFansub(query.Type) {
    items, total, err := searchFansub(ctx, tx, query)
    ...
}
```
**Recommended fix (matches RESEARCH.md Assumption A2, Option (a)):** gate the fansub branch so a tag/genre-only search (no `q`) never touches `searchFansub` — tag/genre are anime-only concepts. E.g. `if searchesFansub(query.Type) && query.Q != "" { ... } else if searchesFansub(query.Type) { result.Fansub = models.SearchEntityResult{Items: []models.SearchResultItem{}, Total: 0} }`. Do not modify `search_fansub.go`'s query-building logic itself — the empty-WHERE behavior there is fine for the `q!=""` case; only the dispatch decision needs to change.

---

### `frontend/src/app/anime/[id]/page.tsx` (Server Component, SSR request-response)

**Analog:** itself — `.fansubChip` real-Link pattern (lines 232-243) is the closest existing "chip that is a link" pattern already in THIS file; `.genreChip` (lines 154-167) is what must be converted.

**Current genre chips (plain `<span>`, includes non-link fallback — Pitfall 4):**
```tsx
// Source: frontend/src/app/anime/[id]/page.tsx:154-167
<div className={styles.genresSection}>
  <span className={styles.genresLabel}>Genres</span>
  <div className={styles.genres}>
    {anime.genres && anime.genres.length > 0 ? (
      anime.genres.map((genre) => (
        <span key={genre} className={styles.genreChip}>
          {genre}
        </span>
      ))
    ) : (
      <span className={styles.genreChip}>Anime</span>
    )}
  </div>
</div>
```
**D-20 requirement:** only the `.map()` branch becomes `<Link>`; the `Anime` placeholder fallback (`else` branch) STAYS a plain `<span>` (do not link it).

**Existing real-Link chip pattern to copy the mechanics from (already in this file, proves the "chip as Link" convention works here):**
```tsx
// Source: frontend/src/app/anime/[id]/page.tsx:232-243
{animeFansubsResponse.data.map((relation) =>
  relation.fansub_group ? (
    <Link
      key={relation.fansub_group.id}
      href={`/fansubs/${relation.fansub_group.slug}`}
      prefetch={false}
      className={styles.fansubChip}
    >
      {relation.fansub_group.name}
    </Link>
  ) : null,
)}
```
`Link` is already imported at the top of the file (`import Link from 'next/link'`, line 3) — no new import needed.

**Insertion point for the new Tags block** — between `.description` (lines 188-190) and the Emby link / `AnimeInfoBanner` (line 192 / 207):
```tsx
// Source: frontend/src/app/anime/[id]/page.tsx:188-190 (insert AFTER this, BEFORE line 192/207)
<p className={styles.description}>
  {anime.description ?? 'Keine Beschreibung vorhanden.'}
</p>
```
Since `page.tsx` is a Server Component (no `'use client'`, cannot import `useDebouncedSearch`'s hook helpers), build the href directly:
```tsx
new URLSearchParams({ type: 'anime', tag: name }).toString()
// → `/suche?${qs}` — same encoding guarantee as URLSearchParams elsewhere in the app (D-09)
```
Tags block must render its OWN `<hr className={styles.divider}>` (only when `anime.tags && anime.tags.length > 0`, per D-13) — do NOT rely on `AnimeInfoBanner`'s divider (see `AnimeMediaProvider.tsx` analog below).

---

### `frontend/src/components/anime/AnimeMediaProvider.tsx` (shared pattern — divider binding, D-13 confirmation)

**Analog:** itself, `AnimeInfoBanner`

```tsx
// Source: frontend/src/components/anime/AnimeMediaProvider.tsx:162-179
export function AnimeInfoBanner({ className, dividerClassName }: {...}) {
  const manifest = useAnimeMediaManifest()
  const bannerURL = useMemo(() => resolveInfoBannerURL(manifest), [manifest])
  if (!bannerURL) return null
  return (
    <>
      <hr className={dividerClassName} />
      <Image src={bannerURL} alt="" className={className} width={600} height={180} unoptimized />
    </>
  )
}
```
Confirms: the `<hr>` is emitted ONLY together with the banner. Do not modify this component — the Tags block's divider (D-12/D-13) is separate and independently conditioned in `page.tsx`.

---

### `frontend/src/app/anime/[id]/page.module.css` (styles, contentnav chip — D-17)

**Analog:** itself — `.genreChip` (lines 301-316), `.fansubChip` (lines 518-530), `.divider` (lines 458-463)

**Existing badge-style chip (do NOT copy this look for Tags — D-17 says content-nav style, not this metadata-badge look):**
```css
/* Source: frontend/src/app/anime/[id]/page.module.css:301-316 */
.genreChip {
  padding: 8px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s;
}
.genreChip:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
}
```
**Existing divider to mirror for the Tags block's own `<hr>`:**
```css
/* Source: frontend/src/app/anime/[id]/page.module.css:458-463 */
.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.25);
  border: none;
  margin: 20px 0;
}
```
**Note on `.badge` (the "loud" metadata-badge look D-17 explicitly forbids for Tags):**
```css
/* Source: frontend/src/app/anime/[id]/page.module.css:373-382 — DO NOT copy this look */
.badge {
  padding: 6px 12px;
  border-radius: 8px;
  background: #f0f0f0;
  color: #444;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
```

---

### `frontend/src/styles/globals.css` (shared pattern — focus-visible, global)

**Analog:** itself

```css
/* Source: frontend/src/styles/globals.css:216-219 */
:focus-visible {
  outline: 2px solid var(--focus-outline);
  outline-offset: 2px;
}
```
This global rule already applies to any new focusable `<Link>` chip automatically — no extra work needed for basic focus visibility (D-16). For a richer focus treatment matching the app's "interactive card" convention, see the `SearchResults.module.css` analog below.

---

### `frontend/src/app/suche/SearchResults.module.css` (analog — focus-visible on a content link)

**Analog:** `.resultCard`/`.resultCard:focus-visible`

```css
/* Source: frontend/src/app/suche/SearchResults.module.css:29-38 */
.resultCard {
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: var(--radius-md, 12px);
  outline: none;
}
.resultCard:focus-visible {
  box-shadow: var(--focus-ring);
}
```
This file uses CSS custom properties (`var(--space-4)`, `var(--radius-md, 12px)`, `var(--focus-ring)`) from `frontend/src/styles/globals.css` — `page.module.css` currently does NOT use these tokens (hardcoded `rgba(...)`/`px` values throughout), which is an inconsistency in the existing file, not a new convention to introduce. Prefer the token-based approach (`var(--focus-ring)`, `var(--radius-md)`) for the NEW `.tagChip`/`.tagsSection` rules per CLAUDE.md's "globale Design-Tokens" instruction (D-17), even though the surrounding legacy rules in this file don't use them yet.

---

### `frontend/src/app/suche/useDebouncedSearch.ts` (hook, request-response — D-08 frontend mirror)

**Analog:** itself, lines 200-217

**Current MIN_QUERY_LENGTH short-circuit:**
```ts
// Source: frontend/src/app/suche/useDebouncedSearch.ts:206-217
const trimmed = state.q.trim()
if (trimmed.length < MIN_QUERY_LENGTH) {
  // Zu kurz: laufende Requests abbrechen, Ergebnisse räumen, nichts anfragen.
  searchAbortRef.current?.abort()
  suggestAbortRef.current?.abort()
  setResults(null)
  setMeta(null)
  setSuggestions(null)
  setIsLoading(false)
  setError(null)
  return
}
```
**Required D-08 shape:** add `&& !state.filters.tag && !state.filters.genre` to the guard condition so a tag/genre-only URL still fires the results request even with empty `q`. This is a UX nicety (defense-in-depth); the backend gate in `search.go` is authoritative per RESEARCH.md's Architecture Responsibility Map.

**URL-encoding convention already established here (reuse, do not hand-roll — D-09):**
```ts
// Source: frontend/src/app/suche/useDebouncedSearch.ts:119-134
export function buildStateQuery(state: SearchState): string {
  const query = new URLSearchParams()
  const q = state.q.trim()
  if (q) query.set('q', q)
  if (state.type && state.type !== 'alle') query.set('type', state.type)
  ...
  if (f.tag) query.set('tag', f.tag)
  ...
  return query.toString()
}
```
`page.tsx` (a Server Component) cannot import this hook, but must use the SAME `URLSearchParams` mechanism directly to build chip hrefs — never hand-rolled `%XX` encoding.

---

### `frontend/src/app/suche/SearchResults.tsx` (component, request-response — empty-state gate mirror)

**Analog:** itself, lines 109-128

```tsx
// Source: frontend/src/app/suche/SearchResults.tsx:109-128
export function SearchResults() {
  const { q, type, page, results, meta, isLoading, error, setType, setPage } =
    useDebouncedSearch({ role: 'results' })

  const trimmedQuery = q.trim()
  const retry = useCallback(() => setPage(page), [setPage, page])

  // Vor der Mindestlänge zeigt die Ergebnisfläche denselben Initial-Leerzustand wie die Shell.
  if (trimmedQuery.length < MIN_QUERY_LENGTH) {
    return (
      <div className={styles.stateSlot}>
        <EmptyState
          title="Wonach suchst du?"
          description="Gib einen Anime-Titel oder eine Fansubgruppe ein, um loszulegen."
        />
      </div>
    )
  }
  ...
```
**Required D-08 shape:** this early-return gate needs the same `&& !filters.tag && !filters.genre` extension as `useDebouncedSearch.ts` (`filters` is already returned by the hook via `...state`, just not currently destructured here — add it to the destructure). Uses `EmptyState` from `@/components/ui` — already imported, reuse verbatim, no native markup.

---

### `frontend/src/app/admin/tags-genres/` (new admin page — no single exact analog, composed from 2 partial analogs)

**Analog 1 (Table shell):** `frontend/src/app/admin/role-capabilities/RoleCapabilityTable.tsx`
```tsx
// Source: frontend/src/app/admin/role-capabilities/RoleCapabilityTable.tsx:1-12, 34-57
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table'

export function RoleCapabilityTable({ roles, allActions, filteredCategory, onGrant, onRevoke }: RoleCapabilityTableProps) {
  return (
    <Table variant="compact">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Rolle</TableHeaderCell>
          ...
        </TableRow>
      </TableHead>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.role_code}>
            <TableCell style={{ fontWeight: 500 }}>{role.label_de}</TableCell>
            ...
```

**Analog 2 (per-row inline edit + `Input`/`FormField`, state-update-by-key mechanics):** `frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx`
```tsx
// Source: frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx:1-10, 79-101
import { Button, FormField, Input, Select } from "@/components/ui";
...
<FormField label="Name" htmlFor={`community-link-name-${link.key}`}>
  <Input
    id={`community-link-name-${link.key}`}
    value={link.name}
    disabled={link.id == null ? !canManage : !canUpdate}
    onChange={(event) =>
      setLinks((current) =>
        current.map((item) =>
          item.key === link.key ? { ...item, name: event.target.value } : item,
        ),
      )
    }
    placeholder="Optionaler Anzeigename"
  />
</FormField>
```
Composition guidance: build the new page from `Table`/`TableBody`/`TableRow`/`TableCell` (Analog 1's shell) with one `TableCell` per row containing `FormField`+`Input` (Analog 2's mechanics), bound to an individual `PATCH /admin/tags/:id/names/de` call per row (e.g., on blur or an explicit small `Button` — `variant="secondary" size="sm"`, per the `Button` usage conventions visible in both analogs), NOT saved as one bulk submit like `FansubCommunityLinksList` does for its parent form.

**Explicit anti-pattern (do NOT copy this file despite superficial similarity):** `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx` uses a raw native `<input>` (line 93) — this predates the ESLint `no-restricted-syntax` ban on native form elements and is tracked legacy debt (CLAUDE.md: "closest-analog" rule never overrides the global `@/components/ui` primitive mandate).

---

### `backend/internal/handlers/admin_content_authz.go` (shared pattern — admin gate)

**Analog:** itself (already used by `ListTagTokens`/`ListGenreTokens`)

```go
// Source: backend/internal/handlers/admin_content_authz.go:9-11
func (h *AdminContentHandler) requireAdmin(c *gin.Context) (middleware.AuthIdentity, bool) {
    return requirePlatformAdminIdentity(c, h.authzRepo, h.adminRoleName)
}
```
Apply verbatim (`if _, ok := h.requireAdmin(c); !ok { return }`) as the first line of every new tag/genre-name write handler — no new auth mechanism.

## Shared Patterns

### SQL parameterization (V5/ASVS — Tampering mitigation)
**Source:** `backend/internal/repository/admin_content.go` (all `tx.Exec`/`db.Query` calls), `backend/internal/repository/search_anime.go` (all `fmt.Sprintf(..., argPos)` conditions)
**Apply to:** every new repository function touching `tag_names`/`genre_names` — values ALWAYS flow as `$n` bind parameters, never string-interpolated into SQL, including the new admin PATCH write path and the D-10 search filter EXISTS clause.

### Error wrapping convention (Go)
**Source:** `backend/internal/repository/anime_metadata.go`, `admin_content.go`, `search_anime.go`, `search_fansub.go` (uniform across all four)
```go
return nil, fmt.Errorf("query normalized anime genres %d: %w", animeID, err)
```
**Apply to:** every new repository function — `fmt.Errorf("<verb> <noun> <key context>: %w", err)`, always wrapping with `%w`, never a bare `return err`.

### Gin handler response envelope
**Source:** `backend/internal/handlers/admin_content_tags.go:44-48`, `backend/internal/handlers/search.go:172-180`
```go
c.JSON(http.StatusOK, gin.H{"data": items})
// error case:
c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
```
**Apply to:** all new admin tag/genre-name handlers and any modified search handler responses — same envelope shape, same German error-message convention (`badRequest(c, "ungültiger ... parameter")` for 400s via the existing `badRequest` helper).

### Admin authorization gate
**Source:** `backend/internal/handlers/admin_content_authz.go:9-11`
**Apply to:** all new `/admin/tags/*`/`/admin/genres/*` write handlers — `h.requireAdmin(c)` as the first statement, no new middleware.

### `@/components/ui` primitive mandate (frontend, CLAUDE.md-enforced)
**Source:** `frontend/src/app/admin/role-capabilities/RoleCapabilityTable.tsx`, `frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx`, `frontend/src/app/suche/SearchResults.tsx` (all import exclusively from `@/components/ui`)
**Apply to:** the new admin tags-genres page (`Table`, `TableBody`, `TableRow`, `TableCell`, `FormField`, `Input`, `Button`) — no native `<table>`/`<input>`/`<select>`/`<button>`. This rule OVERRIDES local-file consistency even if a "closest analog" (e.g. `AnimeEditGenreSection.tsx`) uses native elements.

### URL query-string construction (D-09)
**Source:** `frontend/src/app/suche/useDebouncedSearch.ts:119-134` (`buildStateQuery`, uses `URLSearchParams`)
**Apply to:** the new Tags/Genre chip hrefs in `page.tsx` (Server Component — build `new URLSearchParams({ type: 'anime', tag: name }).toString()` directly since the client hook cannot be imported into a Server Component) and any admin-page link-outs.

### Focus-visible accessibility (D-16)
**Source:** `frontend/src/styles/globals.css:216-219` (global `:focus-visible` rule, applies automatically) + `frontend/src/app/suche/SearchResults.module.css:37-38` (`.resultCard:focus-visible { box-shadow: var(--focus-ring); }`, richer per-component treatment)
**Apply to:** new `.tagChip`/genre-chip-as-link styles in `page.module.css`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `frontend/src/app/admin/tags-genres/` (whole-page composition: list + usage-count + per-row independently-persisted inline edit) | component (client) | CRUD | No existing admin page combines these three traits in one file; composed from two partial analogs (Table shell + FormField/Input row-edit mechanics) documented above under Pattern Assignments — flagged honestly per RESEARCH.md Pattern 4, not a copy of one exact source |
| `backend/internal/repository/search_repository.go` fansub-empty-WHERE guard (Pitfall 1 fix) | repository | request-response | No existing "skip an entity branch when the filter set doesn't apply to it" guard exists elsewhere in the search dispatch layer to copy from; the fix is a small in-place addition to `Search()`'s existing `if searchesFansub(query.Type) { ... }` block, documented above with the exact insertion point |

## Metadata

**Analog search scope:** `backend/internal/repository/`, `backend/internal/handlers/`, `backend/cmd/server/`, `database/migrations/`, `frontend/src/app/anime/[id]/`, `frontend/src/app/suche/`, `frontend/src/app/admin/`, `frontend/src/components/anime/`, `frontend/src/styles/`
**Files scanned:** ~20 (all directly read this session; RESEARCH.md's own file-level survey was reused as the starting index, then independently verified via direct `Read` calls for every excerpt above)
**Pattern extraction date:** 2026-09-16
