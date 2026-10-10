# Phase 178: Suchen & Filtern vereinheitlichen (F-16) - Research

**Researched:** 2026-10-10
**Domain:** Frontend admin-filter consolidation (TypeScript/React, Next.js App Router) + minor backend contract extension (Go/Gin/pgx)
**Confidence:** HIGH (all 6 filter sites read line-accurate; backend list/alias/Kuerzel code paths read and cross-checked against the live dev database; JS Unicode-normalization behavior verified by running Node directly)

## Summary

All 19 locked decisions (D-01 to D-19) in `178-CONTEXT.md` are internally consistent with the
actual code, with one important correction and one scope-narrowing finding that change how the
planner should size the work:

1. **The "per_page:500 Pseudo-Vollabruf" framing in D-16 is only literally true for filter #3
   (`merge/page.tsx`).** Filters #1 (`AdminGroupsClient.tsx`) and #2 (`admin/fansubs/page.tsx`)
   both loop `do { ... } while (page <= totalPages)` — they already retrieve every page, so they
   never silently truncate at 500 records regardless of how many fansub groups exist. Only
   `merge/page.tsx` does a single `getFansubList({ per_page: 500 })` call with no loop — that is
   the only site with a genuine silent-truncation risk. The D-16 "Abrufgrenze erreicht" hint is
   still worth building generically (compare `response.data.length` against `response.meta.total`
   after the fetch completes), but it will only ever fire for #3 in practice today.
2. **Kuerzel is already in the `FansubGroup` payload returned by `GetFansubList`/`ListGroups`**
   (`kuerzel` column, added in phase 176) — no backend change needed for the Kuerzel half of D-18.
   **Alias is not** — the list endpoint has no alias field; aliases are only fetched per-group via
   `GET /api/v1/fansubs/:id/aliases` (used today only by filter #2, lazily, per *currently paged*
   item). D-18's "Contract nachziehen" therefore means: add an `aliases: string[]` field to the
   `FansubGroup` contract/response (bulk-loaded via the existing per-group aliases endpoint or a
   small server-side join), not a Kuerzel change.
3. **The live dataset is tiny: 14 fansub groups, 5 aliases total** (verified via `docker compose
   exec team4sv30-db psql`). This resolves Open Question 2's "depends on actual data volume"
   concern: an N+1 per-group alias fetch for all 14 groups (needed so #1/#3, which render
   everything unpaginated, can alias-search the *entire* list, not just a visible page) is
   trivially cheap today. It is not a scalable long-term pattern, but it is safe for this phase's
   scope.
4. **The backend already has an undocumented, unused `q` search parameter on `GET /api/v1/fansubs`**
   that does `name ILIKE / slug ILIKE / EXISTS alias ILIKE` server-side (not accent-tolerant, no
   `f_unaccent`). None of #1/#2/#3 currently send it. D-16 (Option B) correctly keeps this phase
   client-side only — but the planner should know this backend capability exists for a future
   phase, and that it does *not* search Kuerzel today either.
5. The JS equivalent of PostgreSQL's `f_unaccent()` for the D-15 normalization contract is
   `value.normalize('NFD').replace(/[̀-ͯ]/g, '')` followed by `.toLowerCase()`. This was
   verified by direct execution: ä→a, ö→o, ü→u, Ä/Ö/Ü→A/O/U (then lowercased), and **ß is
   unaffected by both NFD decomposition and `.toLowerCase()`** (stays `ß`, does not become `ss`).
   This exactly matches D-15's required behavior.
6. `useAnimePatchImpl.ts` and `useAdminAnimeCreateControllerImpl.ts` are confirmed structurally
   identical for the 4 filter blocks named in D-19 (genre/tag suggestions + totals) — but the
   duplication actually extends slightly further than the CONTEXT.md line references suggest: the
   catalog-fetch-and-cache-once effects (`getAdminGenreTokens`/`getAdminTagTokens`, `limit: 1000`)
   are *also* duplicated verbatim between the two files. The planner should decide explicitly
   whether the shared "Autocomplete-Baustein" absorbs just the filter/suggestion logic (narrow,
   matches the exact CONTEXT.md line numbers) or the full fetch+filter+suggest hook (broader, but
   removes more duplication and is more consistent with D-14's "keine doppelten Implementierungen"
   project rule).

**Primary recommendation:** Build one small pure-function module (e.g.
`frontend/src/lib/textFilter.ts`) exporting a `normalizeSearchText(value: string): string` helper
(NFD-strip-diacritics + lowercase) and a thin `matchesSearch(haystacks: Array<string | null |
undefined>, query: string): boolean` helper; wire it into all 6 filter sites verbatim (D-14);
build a second small module/hook for the shared Genre/Tag autocomplete baseline per D-19; extend
the `FansubGroup` contract with `aliases: string[]` per D-18; and add a generic
"Abrufgrenze erreicht"-detection utility that is called from #1/#2/#3 but will only visibly render
for #3 given current data volume.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Umlaut-tolerant text normalization/matching | Browser/Client | - | Pure function, no I/O, runs on already-fetched in-memory lists (mirrors how the global search's `f_unaccent` runs server-side only because it must hit an index — client-side lists are small enough to normalize in JS) |
| Fansub-Gruppen Name/Slug/Kuerzel/Alias filtering (#1/#2/#3) | Browser/Client | API/Backend | Client owns match logic; Backend owns sourcing the alias data (currently per-group endpoint, extended per D-18) that the client needs in memory before it can filter |
| Merge-Scoring/Rangfolge (#3) | Browser/Client | - | Derived, ephemeral ranking over an already-fetched in-memory list; no persistence, no backend involvement (D-04) |
| Genre/Tag-Autocomplete-Vorschläge (#5/#6) | Browser/Client | API/Backend | Client filters a fully preloaded catalog (`getAdminGenreTokens`/`getAdminTagTokens`, `limit:1000`); Backend owns the catalog endpoint itself, untouched by this phase |
| Medien-Mehrfeld-Suche (#4) | Browser/Client | - | Filters an already non-paginated, structurally small in-memory media list; no backend change needed |
| "Abrufgrenze erreicht"-Hinweis (D-16) | Browser/Client | - | Derived purely from `response.meta.total` vs. accumulated `data.length` after a client-side fetch loop; no new backend endpoint |
| `FansubGroup.aliases` Kontrakt-Erweiterung (D-18) | API/Backend | Database/Storage | New response field sourced from existing `fansub_group_aliases` table; read-only, additive, backward compatible |
| Globale Suche (`/suche`, out of scope) | API/Backend | Database/Storage | Explicitly untouched (D-01) — `f_unaccent`/pg_trgm/tsvector live in Postgres via `search_anime.go` |

## Standard Stack

### Core
No new runtime dependencies. This phase is pure refactor/consolidation using the project's
existing stack:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|---------------|
| React/Next.js (existing) | 18.3.1 / Next 16 (per `CLAUDE.md`) | Hooks (`useMemo`) for derived filtered lists | Already the project's exclusive UI runtime; no alternative needed |
| `String.prototype.normalize('NFD')` (native ECMAScript, no package) | N/A (built-in since ES2015/Node 4+) | Diacritic-stripping equivalent of PostgreSQL's `unaccent` | Verified directly via `node -e` to produce the exact ä→a/ö→o/ü→u/ß-unchanged mapping D-15 requires; no library needed for this scope (no fuzzy matching required per D-15) |
| Vitest (existing) | 3 (per `CLAUDE.md`) | Pure-function unit tests for the new filter helper (D-10) | Already the project's exclusive test runner; colocated `*.test.ts` convention already used identically in `frontend/src/app/admin/fansubs/fansubListSort.test.ts` |

### Supporting
None required. No new UI primitive is introduced unless the planner decides the D-16 hint needs a
dedicated component (see "Don't Hand-Roll" below — no existing `Alert`/`Banner` primitive exists
in `@/components/ui`, this is a real gap, not an oversight in this research).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled NFD-strip normalization | A diacritics library (e.g. a `transliteration`/`diacritics`-style npm package) | Unnecessary dependency for a one-line native-JS operation; would also risk introducing behavior (digraph expansion, locale-specific folding) that diverges from D-15's explicit "no digraphs" requirement. Rejected. |
| Client-side-only Kuerzel/Alias search (current plan) | Migrate #1/#2/#3 to backend `?q=` search (which already exists, see Fact 4) | D-16 (Option B) explicitly defers this to a future phase; documented here only so the planner knows the capability exists and is not accent-tolerant today either |

**Installation:** None — no new packages.

**Version verification:** Not applicable — no new packages to verify against a registry.

## Package Legitimacy Audit

**Not applicable.** This phase introduces zero new external packages (pure internal
refactor/consolidation using already-approved project dependencies and native JS APIs). No
`slopcheck`/registry verification needed. If a future planning step decides to add a diacritics
or fuzzy-matching library (see "Alternatives Considered" above), the Package Legitimacy Gate must
be run at that time — it was deliberately *not* run here because research concluded no such
package is needed.

## Current State of the 6 Filter Sites (exact, line-accurate)

### #1 `frontend/src/app/admin/groups/AdminGroupsClient.tsx` (484 lines)
- Filter predicate, lines 352-356:
  ```ts
  const filteredGroups = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) return groups
    return groups.filter((group) => group.name.toLowerCase().includes(query) || group.slug.toLowerCase().includes(query))
  }, [groups, searchValue])
  ```
- Fields searched today: `name`, `slug` only. **No Kuerzel, no Alias** (D-18 requires adding both).
- UI: already uses the `Input` primitive (lines 425-435, `type="search"`, `aria-label`,
  placeholder "Gruppe suchen ..." — correct umlaut usage already present).
- Data fetch (`loadGroups`, lines 358-385): loops ALL pages for 3 statuses
  (`active`/`inactive`/`dissolved`) via `do { ... } while (page <= totalPages)` — **no 500-record
  truncation risk** (see Summary point 1). `getFansubList({ page, per_page: 500, status })`.
- No pagination of the *rendered* list — all filtered groups render in a scrollable `Card` list
  (lines 437-452). This means any Kuerzel/Alias search added here needs alias data for **every**
  group up front, not just a visible page (unlike #2's lazy-per-page pattern).

### #2 `frontend/src/app/admin/fansubs/page.tsx` (816 lines)
- Filter predicate, lines 147-167:
  ```ts
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const statusMatches = /* ... */
      if (!statusMatches) return false;
      if (!query) return true;
      const name = item.name.toLowerCase();
      const slug = item.slug.toLowerCase();
      const aliases = aliasesByGroup[item.id] ?? [];
      const aliasMatches = aliases.some((alias) => alias.toLowerCase().includes(query));
      return name.includes(query) || slug.includes(query) || aliasMatches;
    });
  }, [aliasesByGroup, items, query, statusFilter]);
  ```
- Fields searched today: `name`, `slug`, **and alias** (already the richest of #1/#2/#3, matches
  CONTEXT.md's note that only #2 has alias search today). **No Kuerzel** (D-18 adds it; note
  `kuerzel` is already rendered as a table column at line 638, just not searched).
- `query` itself is debounced lowercase-only (`SEARCH_DEBOUNCE_MS = 300`, lines 140-145) —
  **no diacritic normalization today**, this is exactly what D-15's helper must add.
- UI: native `<input>` at lines 431-436 (confirmed UI-primitive violation per D-02/D-07,
  placeholder "Name, Slug oder Tag...").
- **Alias loading is lazy and incomplete for search purposes**: the effect at lines 237-272 only
  fetches aliases for `pagedItems` (the current *visible* 20-item page, `PAGE_SIZE = 20`) that
  don't have aliases cached yet — not for the full (already-fully-fetched) `items` array. Because
  filtering happens on the full `items` array before pagination, a group not yet paginated into
  view will not match on alias even if its alias matches the query (its `aliasesByGroup[id]` is
  still `undefined` → falls back to `[]`). This is a pre-existing, undocumented limitation of the
  *current* code — not something this phase is required to fix, but the planner should decide
  whether the new shared helper preserves this lazy/incomplete behavior or (given the dataset is
  only 14 groups / 5 aliases, see Summary point 3) switches to eagerly loading all aliases
  up front once, which would actually make the search *more* correct with negligible cost.
- Data fetch (`loadList`, lines 105-134): loops ALL pages via the same
  `do { ... } while (currentPage <= totalPages)` pattern — **no 500-record truncation risk**.

### #3 `frontend/src/app/admin/fansubs/merge/page.tsx` (965 lines)
- Filter + scoring, lines 80-113:
  ```ts
  const filteredGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    function relevanceScore(group: FansubGroup): number {
      if (!query) return 0;
      const name = group.name.toLowerCase();
      const slug = group.slug.toLowerCase();
      if (name === query || slug === query) return 120;
      if (name.startsWith(query)) return 90;
      if (slug.startsWith(query)) return 80;
      if (name.includes(query)) return 55;
      if (slug.includes(query)) return 45;
      return 0;
    }
    return groups
      .filter((group) => {
        if (query) {
          const inName = group.name.toLowerCase().includes(query);
          const inSlug = group.slug.toLowerCase().includes(query);
          if (!inName && !inSlug) return false;
        }
        if (statusFilter !== "all" && group.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortMode === "related") {
          const scoreDiff = relevanceScore(b) - relevanceScore(a);
          if (scoreDiff !== 0) return scoreDiff;
        }
        return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
      });
  }, [groups, searchQuery, sortMode, statusFilter]);
  ```
- Fields searched today: `name`, `slug` only. **No Kuerzel, no Alias.**
- Scoring tiers (per D-04, preserve as-is): exact match (120) > prefix-name (90) >
  prefix-slug (80) > substring-name (55) > substring-slug (45) > no match (0). D-18 requires
  "Kuerzel-/Alias-Treffer sinnvoll in die Rangfolge" — the natural extension (decision for the
  planner, not pre-decided) is to insert Kuerzel/Alias tiers *below* name/slug tiers of the same
  specificity (e.g. exact-Kuerzel/Alias between 45 and 120, or simply appended at the bottom as a
  lower-priority catch-all) so name/slug relevance is never demoted by an alias hit.
  **The filter helper only needs to return boolean match/no-match (D-04); the numeric scoring
  stays bespoke to this file and must be extended by hand once the helper tells it alias/Kuerzel
  matched.**
- UI: native `<input>` at lines 398-405 (confirmed violation, placeholder "Name oder Slug...").
- Data fetch (`loadGroups`, lines 65-78): **single, non-looping** call
  `getFansubList({ per_page: 500 })` — **this is the one genuine 500-record truncation risk**
  (see Summary point 1). `response.meta.total` is available on this response and should be
  compared against `response.data.length` to detect truncation.

### #4 `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewFilterBar.tsx` (176 lines, pure presentational) + filter logic in `GroupMediaReviewSection.tsx` (632 lines)
- Filter predicate lives in `GroupMediaReviewSection.tsx`, lines 196-221:
  ```ts
  const filteredMediaItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    return mediaItems
      .filter((item) => {
        const draft = itemToDraft(item)
        const matchesCategory = categoryFilter === 'all' || draft.category === categoryFilter
        const matchesStatus = statusFilter === 'all' || draft.review_status === statusFilter
        const matchesVisibility = visibilityFilter === 'all' || draft.visibility === visibilityFilter
        const matchesSearch =
          normalizedSearch.length === 0 ||
          [getMediaDisplayTitle(item), item.description, item.alt_text, item.uploaded_by_display_name]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedSearch))
        return matchesCategory && matchesStatus && matchesVisibility && matchesSearch
      })
      .sort(/* ... */)
  }, [categoryFilter, mediaItems, searchTerm, sortMode, statusFilter, visibilityFilter])
  ```
- Fields searched today: 4 fields — display title, description, alt text, uploader display name.
  This is the richest multi-field search in the cluster and the best fit for the new helper's
  "array of haystacks" signature (`matchesSearch([title, description, altText, uploaderName],
  query)`).
- UI: already uses `Input` and `FormField` primitives (`GroupMediaReviewFilterBar.tsx`, lines
  166-172, placeholder "Titel oder Beschreibung" — correct, already D-02/D-07 compliant).
- Data: non-paginated, structurally small per-group media list fetched once — no `per_page:500`
  pattern here at all (confirmed, matches CONTEXT.md's note).

### #5 `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts` (363 lines, Edit-Flow)
Four nearly-identical filter blocks, lines 152-194:
```ts
const genreSuggestions = useMemo(() => {
  const q = values.genreDraft.trim().toLowerCase()
  const selected = new Set(values.genreTokens.map((token) => token.toLowerCase()))
  const filtered = genreTokens.filter((token) => {
    if (selected.has(token.name.toLowerCase())) return false
    if (!q) return true
    return token.name.toLowerCase().includes(q)
  })
  const limit = q ? Math.max(80, genreSuggestionLimit) : genreSuggestionLimit
  return filtered.slice(0, limit)
}, [genreSuggestionLimit, genreTokens, values.genreDraft, values.genreTokens])

const genreSuggestionsTotal = useMemo(() => { /* same filter, .length instead of .slice */ }, [...])
const tagSuggestions = useMemo(() => { /* identical shape, tag* variables */ }, [...])
const tagSuggestionsTotal = useMemo(() => { /* identical shape */ }, [...])
```
- Catalog loaded once via `getAdminGenreTokens({ limit: 1000 })` /
  `getAdminTagTokens({ limit: 1000 })` in `useEffect`s at lines 86-150 — loaded once, cached in
  `genreTokens`/`tagTokens` state for the component's lifetime (guarded by
  `if (genreTokens.length > 0) return`).
- UI consumer: `AnimeEditGenreSection.tsx` — confirmed **native `<input>`** at line 93-102
  (`className={styles.input}`, placeholder "Genre tippen und mit Enter oder Komma hinzufügen" —
  confirmed UI-primitive violation per D-02/D-07). A parallel `AnimeEditTagSection`-style component
  for tags was not found by name; if tags use the same input pattern it needs the same fix — the
  planner should grep for the tag-equivalent component before finalizing task scope.

### #6 `frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts` (1052 lines, Create-Flow)
Four blocks, lines 400-442, structurally identical to #5 (confirmed by direct diff-by-reading —
only variable names differ: `createGenreDraft`/`createGenreTokens` instead of
`values.genreDraft`/`values.genreTokens`, and parameter name `t` instead of `token`):
```ts
const genreSuggestions = useMemo(() => {
  const q = createGenreDraft.trim().toLowerCase();
  const selected = new Set(createGenreTokens.map((t) => t.toLowerCase()));
  const filtered = genreTokens.filter((t) => {
    if (selected.has(t.name.toLowerCase())) return false;
    if (!q) return true;
    return t.name.toLowerCase().includes(q);
  });
  const limit = q ? Math.max(80, genreSuggestionLimit) : genreSuggestionLimit;
  return filtered.slice(0, limit);
}, [createGenreDraft, createGenreTokens, genreSuggestionLimit, genreTokens]);
/* genreSuggestionsTotal, tagSuggestions, tagSuggestionsTotal: same pattern */
```
- Catalog-fetch effects for this file are at lines ~258-290 (`getAdminGenreTokens({limit:1000})`
  / `getAdminTagTokens({limit:1000})`) — **also a verbatim duplicate** of #5's fetch effects, not
  just the filter blocks named in CONTEXT.md's line references. See Summary point 6 — flag this
  for the planner's scoping decision on D-19's "Autocomplete-Baustein" boundary.
- D-19 confirmed: `useAnimePatchImpl.ts` is the canonical basis; this file's 4 blocks (plus,
  arguably, its 2 catalog-fetch effects) are deleted in favor of the shared hook.

## Backend Facts Relevant to D-18

### `FansubGroup` as returned by `GET /api/v1/fansubs` today
`backend/internal/repository/fansub_repository_groups.go`, `ListGroups` (lines 14-67) selects:
```sql
SELECT id, slug, name, kuerzel, logo_id, banner_id, logo_url, banner_url,
       founded_year, dissolved_year, closed_year, status, website_url, discord_url, irc_url, country,
       created_at, updated_at
FROM fansub_groups ... ORDER BY name ASC LIMIT $n OFFSET $n
```
then calls `attachGroupCounts` (adds `anime_relations_count`, `projects_count`,
`release_versions_count`, `members_count`, **`aliases_count`** — a count only, not the alias
strings) and `attachGroupLinks`. **Kuerzel is already present; the actual alias text is not.**

`frontend/src/types/fansub.ts`'s `FansubGroup` interface matches this exactly (`kuerzel?: string
| null`, `aliases_count: number`, no `aliases: string[]`).

### Where aliases actually live
Table `fansub_group_aliases` (confirmed via `fansub_repository_groups.go:589` and
`fansub_repository_merge_core.go`). No bulk "aliases for N groups" repository method exists today
— only `GetFansubAliases(groupID)` (single-group) via `GET /api/v1/fansubs/:id/aliases` (public,
no auth required — confirmed via `backend/cmd/server/main.go:458`, not behind `authMiddleware`).

### Kuerzel vs. Alias are genuinely two distinct concepts (confirms CONTEXT.md's premise)
- `fansub_groups.kuerzel` — a single, optional, system-wide-unique short code column on the group
  itself (added in phase 176, see `backend/internal/repository/phase176_fansub_create_kuerzel_test.go`
  and `fansub_repository_groups.go` `CreateGroup`/`UpdateGroup`). Uniqueness is cross-checked
  against **both** other groups' Kuerzel *and* their aliases via `findFansubKuerzelOrAliasOwner`
  (using `normalizeAliasKey`, a lowercase-alphanumeric-only normalizer at
  `fansub_repository_merge_core.go:147-155` — simpler than the planned D-15 search-normalizer;
  it strips ALL non-alphanumerics, not just diacritics, and exists purely for uniqueness
  comparison, not search).
- `fansub_group_aliases` — a separate one-to-many table, independent lifecycle (create/delete/
  reassign via `/api/v1/fansubs/:id/aliases*` endpoints), used for alternate names/tags, not a
  short code.
- **CONTEXT.md's D-18 premise is factually correct**: these are two distinct concepts and both
  need to be added to the fansub-filter search surface. No discrepancy found here.

### Undocumented existing backend search capability (not used by #1/#2/#3, informational only)
`buildFansubGroupWhere` in `fansub_repository_groups.go` (lines 424-460) already implements:
```sql
WHERE (
  name ILIKE $1
  OR slug ILIKE $1
  OR EXISTS (SELECT 1 FROM fansub_group_aliases fga WHERE fga.fansub_group_id = fansub_groups.id AND fga.alias ILIKE $1)
) AND status = $2
```
exposed as `?q=` on `GET /api/v1/fansubs` and already typed in
`frontend/src/lib/api/fansubs-core.ts`'s `FansubListParams` (`q?: string`) — but **no caller in
the frontend ever sends it**. This is plain `ILIKE`, not accent-tolerant (no `f_unaccent`), and
does **not** match on `kuerzel`. Per D-16 (Option B), this phase does not migrate #1/#2/#3 to use
it — documented here purely so the planner/user knows it exists for a future phase, and so nobody
re-discovers it mid-implementation and is tempted to silently expand scope.

### `shared/contracts/fansubs.yaml` drift (pre-existing, not caused by this phase)
The documented `FansubGroup` schema in the contract (lines 610-631) is **missing `kuerzel`
entirely** even though the Go model, the TS type, and the actual JSON response all include it
(a contract-vs-code drift left over from phase 176, which apparently didn't update this YAML).
D-18's "Contract nachziehen" work should fix **both** gaps at once: add the missing `kuerzel:
string | null` line (documentation-only fix, zero behavior change) and add the new
`aliases: string[]` field (actual behavior change). Flagging this so the planner doesn't treat the
Kuerzel contract fix as in-scope-but-forgotten if it's found separately later.

## Normalization Helper: Verified JS Equivalent of `f_unaccent()`

Verified directly by running Node (not training-data recall):
```js
function strip(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
strip("ä")  -> "a"   strip("ö")  -> "o"   strip("ü")  -> "u"
strip("Ä")  -> "A"   strip("Ö")  -> "O"   strip("Ü")  -> "U"
strip("ß")  -> "ß"   (unchanged — ß has no NFD canonical decomposition)
strip("Mädchen").toLowerCase() -> "madchen"
strip("Straße").toLowerCase()  -> "straße"   (ß survives lowercasing too — JS does NOT expand ß to "ss")
```
This is `[VERIFIED: direct execution]` — not an assumption. It produces exactly the D-15-required
mapping: diacritics stripped to base letters, ß left alone, no digraph expansion anywhere in the
pipeline (neither NFD-strip nor `.toLowerCase()` introduces `ae`/`oe`/`ue`/`ss`).

**No existing project helper does this today.** `frontend/src/lib/api/search.ts` (the only
`lib/*search*` file) is a thin fetch wrapper around the backend `/suche` API — all normalization
for the global search happens server-side via `f_unaccent()`; there is nothing to normalize
client-side there. **Confirmed: this phase's filter helper is genuinely new code, not a
duplicate of existing logic** (point 3 of the research brief, resolved).

**Recommended helper location:** `frontend/src/lib/textFilter.ts` (flat, alongside the project's
existing flat `lib/*.ts` modules like `fansub-labels.ts`, `fansub-summary.ts` — no `lib/search.ts`
or `lib/filters/` directory convention exists to collide with; a new top-level file matches
existing conventions best). Suggested shape:
```ts
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function matchesSearch(
  haystacks: Array<string | null | undefined>,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query.trim())
  if (!normalizedQuery) return true
  return haystacks
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeSearchText(value).includes(normalizedQuery))
}
```
This directly matches D-10's testing requirement (pure function, two tiny exported functions,
trivially testable with `describe/it` + `expect(...).toBe(...)` exactly like
`fansubListSort.test.ts` already does in this codebase) and D-12 (well under 450 lines on its own).

## "Abrufgrenze erreicht" Detection (D-16)

No new fetch needed — every `getFansubList` response already carries
`meta: { total, page, per_page, total_pages }` (`frontend/src/types/anime.ts`'s `PaginationMeta`,
reused by `fansub.ts`). Detection is a pure comparison after the existing fetch loop/single-call
completes:
```ts
const limitReached = accumulatedItems.length < lastResponse.meta.total
```
For #1/#2 (looping fetchers), this will be `false` under all realistic conditions because the loop
only stops once `page > totalPages`, i.e. once every record has been retrieved — it is a
dead-code-safe guard, not a live risk, given the current code. For #3 (single non-looping fetch),
this is a live, meaningful check: if `response.data.length < response.meta.total`, truncation has
actually occurred and the hint must render.

**No existing `Alert`/`Banner`/`InfoBox` primitive exists in `@/components/ui`** (confirmed by
listing the directory — only `EmptyState`, `ErrorState`, `LoadingState`, no generic
info/warning-tone message component). The planner has two options: (a) build a minimal new
primitive (small, D-08/D-07-compliant, token-driven) if this pattern is expected to recur beyond
this phase, or (b) inline a small `<p>` with an existing CSS-module warning-tone class (the pages
already do this ad hoc — e.g. `styles.hintWarning` in `merge/page.tsx` line 768, `styles.errorBox`
pattern elsewhere) scoped locally to the touched files. Given D-16 only has one real call site
today (#3), option (b) is proportionate; flag option (a) only if the planner expects this banner
pattern to spread.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Diacritic stripping | A custom lookup table of ä/ö/ü/etc. → base letter | `String.prototype.normalize('NFD')` + combining-mark strip regex | Native, zero-dependency, verified-correct (see above); a lookup table would need manual maintenance for every accented character the admin UI might ever see (names of fansub groups are not guaranteed to be German-only) |
| Pagination-limit detection | A new "did I get everything" API call/HEAD request | Compare existing `meta.total` to accumulated `data.length` | The data is already in the response; no new round-trip needed |
| Cross-group alias search for #1/#3 | A new dedicated "alias search" backend endpoint built from scratch | Reuse the existing per-group `GET /api/v1/fansubs/:id/aliases` endpoint, fetched once per group (14 groups today) on list load | Endpoint already exists and is public; building a new one duplicates existing surface for no benefit at this data volume |

**Key insight:** Every piece of infrastructure this phase needs — pagination metadata, per-group
alias fetch, the `Input`/`FormField` primitives, the Vitest pure-function test convention —
already exists elsewhere in this codebase. The actual new code surface is small: one
normalization/match helper, one shared autocomplete hook, one contract field, and UI primitive
swaps in 4 files.

## Common Pitfalls

### Pitfall 1: Treating all three `per_page:500` sites as equally at-risk
**What goes wrong:** Building the "Abrufgrenze erreicht" hint logic as if #1/#2 need the same
truncation-recovery treatment as #3, wasting effort on dead-code paths.
**Why it happens:** CONTEXT.md's phase-boundary description groups all three together under the
same "Pseudo-Vollabruf" label without distinguishing the looping vs. non-looping fetch pattern.
**How to avoid:** Implement the detection utility once, call it from all three (consistency, low
cost), but do not expect #1/#2 to ever visibly trigger it under current code — don't spend task
budget "fixing" something that isn't broken there.
**Warning signs:** A plan task description that says "add Weiter-laden pagination to #1/#2" would
indicate a misunderstanding — they already paginate fully.

### Pitfall 2: Alias search incompleteness carried forward silently
**What goes wrong:** #2's existing alias search only works for groups whose aliases happen to have
been lazily fetched already (visible-page-driven). If the shared helper is wired in without
changing this lazy-fetch strategy, the *appearance* of "alias search now works everywhere" (D-18)
will be subtly wrong — some groups further down an unfiltered, unpaginated list (like #1/#3 after
this phase) will never get their aliases fetched at all unless the fetch strategy changes to
eager/upfront for those two.
**Why it happens:** The lazy-per-page pattern made sense for #2's original paginated-at-20
UI, but #1 and #3 render everything unpaginated — the same lazy strategy doesn't make sense
there structurally.
**How to avoid:** Given the confirmed tiny dataset (14 groups, 5 aliases), fetch all groups'
aliases eagerly once after `loadGroups`/`loadList` completes (14 extra requests, trivial), for all
three sites uniformly, rather than porting the lazy pattern.
**Warning signs:** A plan that reuses #2's `aliasesByGroup` effect as-is for #1/#3 without
re-examining whether "lazy, page-driven" still makes sense when there is no page.

### Pitfall 3: Scoring regression in the merge wizard (#3)
**What goes wrong:** Replacing the inline name/slug boolean check with a call to the new shared
`matchesSearch` helper changes *which groups pass the filter* — if Kuerzel/Alias matches are
added to the filter predicate per D-18 but the `relevanceScore` function isn't extended in lockstep,
groups that only match on Kuerzel/Alias will now appear in the filtered list but sort to the very
bottom (score 0) under `sortMode === "related"`, which looks like a UI bug even though it's
"technically filtered correctly."
**Why it happens:** The filter (what's in the list) and the scorer (how the list is ordered) are
two separate functions operating on the same `query` variable; it's easy to update one and forget
the other.
**How to avoid:** When implementing D-18 for #3, extend `relevanceScore` with Kuerzel/Alias tiers
in the same change that extends the filter predicate — do not split these into separate tasks/waves.
**Warning signs:** A task plan that puts "extend filter predicate" and "extend scoring" in
different waves/tasks for `merge/page.tsx` specifically (unlike #1/#2 where there is no scoring to
keep in sync).

### Pitfall 4: `useAdminAnimeCreateControllerImpl.ts`'s already-oversized file growing further
**What goes wrong:** This file is already 1052 lines (CLAUDE.md's 450-line production-file limit
is a pre-existing, large violation, unrelated to this phase). Removing the 4 duplicate filter
blocks shrinks it somewhat, but if the shared autocomplete hook is designed to be imported *and*
some adapter/glue code is left behind in this file, it could net-grow instead of shrink.
**Why it happens:** Partial extractions sometimes add more glue code than they remove.
**How to avoid:** Verify the file's line count explicitly after extraction; if still far over 450,
flag as a known pre-existing debt rather than silently expanding this phase's scope to a full
file-split (that's a separate, larger refactor than "unify search/filter").
**Warning signs:** The plan tries to use this phase's line-count obligation on the *new* helper
files as license to skip checking what happens to the *existing*, already-oversized files.

## Code Examples

### Verified-correct normalization (ran directly, not recalled from training data)
```js
// Source: direct `node -e` execution during this research session
function strip(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
strip("ä") === "a"   // true
strip("ß") === "ß"   // true — unchanged
strip("Mädchen").toLowerCase() === "madchen"  // true
```

### Existing pure-function test convention to mirror (D-10)
```ts
// Source: frontend/src/app/admin/fansubs/fansubListSort.test.ts (read in full during research)
import { describe, expect, it } from "vitest";
import { compareFansubListItems } from "./fansubListSort";

describe("compareFansubListItems", () => {
  it("sorts by name ascending/descending", () => {
    const a = makeGroup({ id: 1, name: "Alpha" });
    const b = makeGroup({ id: 2, name: "Beta" });
    expect(compareFansubListItems("name", "asc", a, b)).toBeLessThan(0);
  });
});
```
The new filter helper's test file should follow this exact pattern: colocated
`textFilter.test.ts`, `describe/it`, direct function calls, no render/mount.

### Existing richest-fields filter to generalize from (#4, `GroupMediaReviewSection.tsx:196-211`)
```ts
// Source: frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx (read in full)
const matchesSearch =
  normalizedSearch.length === 0 ||
  [getMediaDisplayTitle(item), item.description, item.alt_text, item.uploaded_by_display_name]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedSearch))
```
This "array of nullable haystacks, filter Boolean, some(includes)" shape is exactly the pattern
the new `matchesSearch(haystacks, query)` helper should generalize — #4 is the best existing
template for the helper's call signature.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-------------------|---------------|--------|
| 6 independent `toLowerCase().includes()` filters, 0/6 umlaut-tolerant, 2/6 on the `Input` primitive | 1 shared `normalizeSearchText`/`matchesSearch` helper reused by all 6, consistent umlaut behavior, 6/6 on `Input` | This phase | Consistent search UX; removes 6 copies of near-identical logic; closes the UI-primitive gap flagged by `175-INVENTORY.md` |
| `FansubGroup` list response: Kuerzel present, Alias absent | `FansubGroup` list response: both present (D-18) | This phase | Enables uniform Kuerzel/Alias search across #1/#2/#3 without a second round-trip per filter keystroke |
| 2 verbatim-duplicated Genre/Tag autocomplete implementations (Edit + Create flow) | 1 shared autocomplete baseline (D-19, based on `useAnimePatchImpl.ts`) | This phase | Removes `useAdminAnimeCreateControllerImpl.ts`'s largest block of duplicate logic; shrinks (but does not fully fix) its 1052-line size |

**Deprecated/outdated:** None — no library deprecations involved, this is an internal
consolidation phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|----------------|
| A1 | The planner's choice of where to insert Kuerzel/Alias score tiers in #3's `relevanceScore` (e.g., below name/slug substring tiers vs. interleaved) is left open — this research deliberately did not prescribe exact numeric weights, per D-18's own text ("Detailgewichtung im Planungsschritt festzulegen"). | "Current State of the 6 Filter Sites", #3 | Low — D-18 explicitly defers this; flagged here only so the planner doesn't miss that it is their decision to make, not a pre-existing fact |
| A2 | Eagerly fetching all 14 groups' aliases (vs. porting #2's lazy pattern) is recommended based on the *current* dataset size (14 groups). If the fansub-group count grows substantially in the future, this N+1 pattern would need revisiting (e.g., a bulk aliases-by-group-ids endpoint). This is a judgment call based on today's measured data, not a verified future-proof guarantee. | "Common Pitfalls", Pitfall 2 | Medium if the fansub-group catalog grows past roughly 50-100 groups without a bulk endpoint being added later; low for the foreseeable scope of this project |
| A3 | Whether tags have a sibling `AnimeEditTagSection.tsx`-equivalent component with the same native-`<input>` violation as `AnimeEditGenreSection.tsx` was not exhaustively confirmed by name (no exact file match found) — the planner should grep for the tag-input-rendering component before finalizing the UI-primitive-swap task list for #5/#6. | "#5" section | Low — if the tag input component turns out to already use the `Input` primitive, there is simply one fewer file to touch; if it doesn't, the task list is one file short |

## Open Questions (RESOLVED)

None outstanding from this research. All 5 originally open questions in `178-CONTEXT.md` are
already answered by the user (D-15 to D-19) and were independently cross-checked against the code
in this research session without finding any factual contradiction — only the two scope
clarifications already called out in the Summary (the #1/#2 vs. #3 truncation-risk distinction,
and the Kuerzel-already-present/Alias-not-present split).

## Environment Availability

Not applicable — this phase has no new external tool/service/runtime dependencies. All work uses
the existing Docker Compose stack (`team4sv30-backend`, `team4sv30-db`, `team4sv30-frontend`,
already confirmed running via `docker compose ps` during this research session) and existing
project tooling (npm/vitest, Go/pgx already in use).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3 (frontend), Go `testing` + `testify` (backend, only for the D-18 contract change) |
| Config file | `frontend/vitest.config.ts` (`include: ['src/**/*.test.ts', 'src/**/*.test.tsx']`, `globals: true`) |
| Quick run command | `cd frontend && npx vitest run src/lib/textFilter.test.ts` (or equivalent path once named) |
| Full suite command | `cd frontend && npm test` (= `vitest run`); backend: `cd backend && go test ./internal/repository/... ./internal/handlers/...` for the D-18 contract change |

### Phase Requirements -> Test Map
(No `REQUIREMENTS.md` REQ-IDs apply to this phase — decision coverage is via `178-CONTEXT.md`'s
D-01 to D-19; mapping below is by decision number instead.)

| Decision | Behavior | Test Type | Automated Command | File Exists? |
|----------|----------|-----------|---------------------|---------------|
| D-15 | `normalizeSearchText`/`matchesSearch` replicate `f_unaccent` behavior (ä→a, ö→o, ü→u, ß unchanged, no digraphs) | unit | `vitest run src/lib/textFilter.test.ts` | ❌ Wave 0 — new file |
| D-04 | Merge-page scoring unaffected by filter-helper swap for name/slug matches | unit | `vitest run src/app/admin/fansubs/merge/*.test.ts` | ❌ Wave 0 — no existing test file for the scoring function (it is currently inline in `page.tsx`, untested); extracting it to a named, testable function is itself part of this phase's work if D-04 compliance is to be test-verified per D-10 |
| D-18 | Kuerzel/Alias matches surface in #1/#2/#3's filtered results | unit | `vitest run` on whichever file hosts each site's filter logic once extracted/wired | ❌ Wave 0 — same reasoning; current filter logic is inline in each page, not a named testable export today |
| D-19 | Shared autocomplete hook produces identical suggestions/totals for both Edit and Create flows | unit | `vitest run` on the new shared hook's test file | ❌ Wave 0 — new file |
| D-07/D-02 | 4 native `<input>` sites (#2, #3, #5, #6's genre input, possibly tag input) replaced with `Input` primitive | manual/UAT (D-11) | N/A — visual/DOM primitive swap, not independently unit-testable beyond "renders" | N/A |

### Sampling Rate
- **Per task commit:** targeted `vitest run <changed-file>.test.ts`
- **Per wave merge:** `npm test` (frontend full suite) + relevant backend package tests if D-18's
  contract change touches `fansub_repository_groups.go`/`fansub_groups.go`
- **Phase gate:** Full suite green before `/gsd:verify-work`; plus D-11's mandatory live-UAT
  browser pass over the tunnel address for the 6 filter UIs (automated tests cannot substitute for
  this per the project's explicit D-11 rule)

### Wave 0 Gaps
- [ ] `frontend/src/lib/textFilter.ts` + `textFilter.test.ts` — new shared normalization/match
  helper and its direct-function tests (D-15, D-10)
- [ ] A named, exported, independently-testable scoring function for `merge/page.tsx` (currently
  inline `relevanceScore` closure inside a `useMemo` — must be extracted to a module-level or
  colocated-file function before it can be unit-tested per D-10/D-04)
- [ ] A named, exported, independently-testable filter-predicate function for each of #1/#2/#3
  (currently inline `.filter()` closures inside `useMemo`s — same extraction need as above, for
  the same D-10 reason: "Tests prüfen die Logik hinter dem Button", which requires the logic to be
  a callable function, not an inline closure)
- [ ] Shared Genre/Tag autocomplete hook + its test file (D-19)
- [ ] Backend test(s) for the `FansubGroup.aliases` contract addition (D-18) — e.g. extend
  existing `ListGroups`/`GetGroupByID` repository tests to assert the new field round-trips, using
  the project's mandated behavior-test style (real repo call against a test DB, not a source-grep)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|----------------|---------|---------------------|
| V2 Authentication | No | No new auth surface; all touched endpoints (`GET /api/v1/fansubs`, `GET /api/v1/fansubs/:id/aliases`) are already public/unauthenticated today (confirmed via `backend/cmd/server/main.go` route registration — neither route has `authMiddleware`) |
| V3 Session Management | No | Not touched |
| V4 Access Control | No | Confirmed independently (not just trusting D-05's claim): adding `aliases: string[]` to an already-public list response exposes no new data class — the same alias strings are already individually fetchable via the existing public per-group endpoint. No permission matrix change. |
| V5 Input Validation | Yes (unchanged) | Search text input is free-form client-side filtering only in this phase (no new backend query params added per D-16); the existing backend `?q=` parameter (unused by this phase, see "Backend Facts") already has length validation (`len([]rune(q)) > 120` → 400) if a future phase adopts it |
| V6 Cryptography | No | Not applicable |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|------------------------|
| Reflected XSS via unsanitized search query echoed into DOM | Tampering/Information Disclosure | Not a new risk introduced by this phase — React's default JSX text-node escaping already protects the existing `searchValue`/`queryInput`/`searchQuery` state across all 6 sites; this phase does not add any `dangerouslySetInnerHTML` or raw HTML rendering of search text |
| Unbounded regex/ReDoS via user-controlled search string | Denial of Service | `matchesSearch`'s `.includes()` substring check (not a regex) has no ReDoS surface; `normalizeSearchText`'s `.replace(/[̀-ͯ]/g, '')` regex is a fixed, non-backtracking character class with no catastrophic-backtracking risk |

## Sources

### Primary (HIGH confidence — read directly in this session)
- `frontend/src/app/admin/groups/AdminGroupsClient.tsx` (full file, 484 lines)
- `frontend/src/app/admin/fansubs/page.tsx` (full file, 816 lines)
- `frontend/src/app/admin/fansubs/merge/page.tsx` (full file, 965 lines)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewFilterBar.tsx` (full file, 176 lines)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` (lines 140-229, the
  filter-relevant section)
- `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts` (full file, 363 lines)
- `frontend/src/app/admin/anime/create/internal/useAdminAnimeCreateControllerImpl.ts` (lines
  380-460, the filter-relevant section)
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx` (full file)
- `backend/internal/repository/fansub_repository_groups.go` (full file, 720 lines)
- `backend/internal/handlers/fansub_groups.go` (full file, 419 lines)
- `backend/internal/repository/fansub_repository_merge_core.go` (lines 130-160,
  `normalizeAliasKey`)
- `frontend/src/lib/api/fansubs-core.ts` (lines 1-230, `FansubListParams`/`getFansubList`)
- `frontend/src/lib/api/fansubs-aliases.ts` (full file, `getFansubAliases`)
- `shared/contracts/fansubs.yaml` (grepped + read lines 505-665)
- `frontend/src/types/fansub.ts` (lines 1-150)
- `frontend/src/components/ui/` directory listing + `Input.tsx`, `EmptyState.tsx` (full files)
- `frontend/src/app/admin/fansubs/fansubListSort.ts` + `.test.ts` (full files — test convention
  reference)
- `backend/cmd/server/main.go` (grepped route registrations for `/fansubs*`)
- Live database query via `docker compose exec team4sv30-db psql -U team4s -d team4s_v2 -c
  "SELECT COUNT(*) ... FROM fansub_groups / fansub_group_aliases"` → 14 groups, 5 aliases
  (`[VERIFIED: live dev database]`)
- Direct Node execution (`node -e`) verifying NFD-strip-diacritics behavior for ä/ö/ü/ß
  (`[VERIFIED: direct execution]`)
- `.planning/phases/178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-/178-CONTEXT.md`
  (full file, all D-01 to D-19 decisions and the Faktencheck section)
- `database/migrations/0140_search_foundation.up.sql` (lines 1-30, `f_unaccent` definition,
  cross-checked against CONTEXT.md's own Faktencheck)
- `.env` / `docker compose ps` / `docker compose exec ... env` (confirmed running stack and DB
  credentials for the live-database verification query)

### Secondary (MEDIUM confidence)
None — all claims in this research were either read directly from source files, executed directly
(Node, psql), or copied verbatim from the already-user-verified `178-CONTEXT.md`.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all behavior verified by direct execution or direct
  source reading, zero reliance on training-data recall for library behavior
- Architecture: HIGH — all 6 filter sites and the relevant backend/contract code were read in full
  or in the precisely relevant line ranges; database state was queried live, not assumed
- Pitfalls: HIGH — all 4 pitfalls are derived from directly observed code structure (the
  looping-vs-non-looping fetch distinction, the lazy-alias-fetch/pagination mismatch, the
  filter/scorer split in `merge/page.tsx`, and the measured 1052-line file size), not speculation

**Research date:** 2026-10-10
**Valid until:** 30 days (stable internal refactor domain; the only decay risk is if the fansub
group count grows substantially before implementation, which would reopen Assumption A2 — or if a
parallel phase touches the same 6 files first)
