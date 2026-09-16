# Phase 160 (Teilschritt „Tags und Genres“) - Research

**Researched:** 2026-09-16
**Domain:** Go/Gin/pgx backend + Next.js 16 App Router frontend, PostgreSQL migrations — multilingual reference-data modeling, additive search-filter relaxation, public detail-page rendering
**Confidence:** HIGH (all findings are direct code/schema reads on the live repo, no external library research needed)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Mehrsprachige Tag- und Genre-Namen (Ausführung VOR der öffentlichen Anzeige)
- **D-01:** Mehrsprachigkeit ist ein eigener Teilschritt, der vor der öffentlichen Tag-/Genre-Anzeige umgesetzt wird. Die Anzeige baut direkt auf dem neuen Modell auf.
- **D-02:** Speicherung nach dem Muster von `anime_titles`: je eine Tabelle „Tag + Sprache + Name“ und „Genre + Sprache + Name“ über die bestehende Tabelle `languages`. Keine festen Spalten je Sprache. Ersetzt bewusst die Auftragsvorgabe „keine neue Tag-Tabelle“ (Nutzerentscheidung 2026-09-16).
- **D-03:** `tags.name` und `genres.name` bleiben der eindeutige Grundname (bestehende 15 gemischt deutsch/englischen Tag-Namen unverändert). Sprachnamen werden ergänzt. Keine automatische Sprachzuordnung des Bestands.
- **D-04:** Pflege auf einer neuen Admin-Seite (Tags und Genres): Liste mit Grundname, Nutzungsanzahl und Namensfeld je Sprache, jetzt Deutsch. Übersetzung gilt global für alle Anime.
- **D-05:** aniSearch-/sonstiger Import legt weiterhin nur den Grundnamen an; er schreibt keine Sprachnamen.
- **D-06:** Öffentliche Anzeige in fester Sprache Deutsch: deutscher Name, sonst Grundname. Kein Sprachumschalter. Tags/Genres ohne deutschen Namen bleiben sichtbar.
- **D-07:** Genres erhalten dasselbe Mehrsprachen-Modell und dieselbe Pflege wie Tags.

### Suchziel ohne Suchbegriff
- **D-08:** `/suche` liefert Ergebnisse auch ohne `q`, wenn `tag` oder `genre` gesetzt ist (Backend-Handler und Frontend-Ergebnisfläche). Additive Änderung; für alle anderen Filter (Format, Status, Jahre, Fansubgruppe) bleibt die Suchbegriff-Pflicht (mind. 2 Zeichen) unverändert.
- **D-09:** Links verwenden den bestehenden Query-Contract mit Anime-Scope: `/suche?type=anime&tag=<angezeigter Name>` bzw. `/suche?type=anime&genre=<angezeigter Name>`, korrekt URL-encodiert (Leerzeichen, Umlaute, Sonderzeichen). Keine neue URL-Konvention, keine Tag-/Genre-Detailseite, kein ID-Parameter.
- **D-10:** Der Such-Filter findet einen Tag/ein Genre über jeden seiner Namen (Grundname und alle Sprachnamen), weiterhin ohne Groß-/Kleinschreibung.
- **D-11:** Aktiver Filter wird wie heute über das vorbelegte bestehende Filterfeld sichtbar; keine neue Filter-Hinweis-UI.

### Position und Trennlinie der Tags
- **D-12:** Reihenfolge in der rechten Infokarte: Titel → Status/Typ/Jahr → Beschreibung → **Tags** → Linie → Jellyfin-Banner → Verwandte Anime. Ersetzt die Entscheidung vom 2026-09-15 („Tags unter der Linie“).
- **D-13:** Die Linie bleibt an den Banner gebunden (`AnimeInfoBanner`); ohne Banner keine Linie nach den Tags, nur Abstand. Ohne Tags: keine Überschrift, kein Container, kein zusätzlicher Abstand.
- **D-14:** Tags gehören nicht in den Genre-Bereich links, nicht in die Statuszeile, nicht unter „Verwandte Anime“, nicht in die Episoden-Sektion.

### Beschriftung und Zugänglichkeit
- **D-15:** Überschrift über den Tag-Chips: „Tags“.
- **D-16:** Chips sind echte Links (`<a>`/Next `Link`), per Tastatur erreichbar, sichtbarer Fokus; sichtbarer und zugänglicher Linktext ist nur der Name. Die Chips stehen in einer Liste, die über die Überschrift „Tags“ benannt ist.
- **D-17:** Tag-Chips optisch als Inhaltsnavigation, nicht wie die Metadaten-Badges oben: normale Schreibweise (keine Großbuchstaben), kleine bis mittlere abgerundete Chips, dezenter Hintergrund, klare Hover-/Fokus-Rückmeldung, Pointer, ausreichender Kontrast, kein kräftiger CTA-Stil. Globale Design-Tokens.

### Reihenfolge, Menge, Genres
- **D-18:** Tags alphabetisch nach angezeigtem Namen sortiert.
- **D-19:** Alle Tags anzeigen, Chips brechen um (Desktop/Tablet/Mobile), keine horizontale Scrollleiste; lange Namen sprengen das Layout nicht. Kein Einklappen.
- **D-20:** Genre-Chips links am Poster werden Links auf `/suche?type=anime&genre=<Name>` im heutigen Chip-Stil, ergänzt um Hover, Pointer und sichtbaren Fokus. Genres und Tags bleiben optisch getrennt.

### Claude's Discretion
- Sortierung der Suchergebnisse ohne Suchbegriff (z. B. Titel alphabetisch statt Relevanz).
- Verhalten von `type=alle`/`type=fansub` bei reiner Tag-/Genre-Suche (Fansub-Teil leer, keine Fehlermeldung).
- Umgang mit dem heutigen Platzhalter-Chip „Anime“ bei fehlenden Genres (nicht verlinken).
- Genaue Tabellen-/Spaltennamen, Unique-Constraints und API-Form der Sprachnamen, solange D-02/D-03 eingehalten sind.
- Ob der öffentliche Anime-Detail-Contract zusätzlich zur Anzeige-Form strukturierte Namen liefert; ohne zusätzliche Anfrage und ohne N+1.
- Navigation/Platzierung der neuen Admin-Seite im Admin-Menü.
- Hinweis: Der Emby-Link auf der Detailseite existiert nur für eine fest eingetragene Test-Zuordnung (`frontend/src/lib/emby.ts`); falls er erscheint, steht er nach den Tags.

### Deferred Ideas (OUT OF SCOPE)

- Sprachumschalter / weitere Sprachen neben Deutsch in der öffentlichen Oberfläche.
- Nur-Filter-Suche für Format, Status, Jahre, Fansubgruppe.
- Übrige Phase-160-Themen (Gruppenbuttons, „Gruppenbereich“, Coop, Episodenfilter/-anzeige) — nächster Discuss-Schritt in Phase 160.

### Reviewed Todos (not folded)
- „no-restricted-syntax Legacy-Datei-Migration“ — Stichworttreffer, fachlich kein Bezug zu Tags/Genres.
- „Contributor owned media and note edit delete“ — kein Bezug.
- „DELETE /admin/media/:id läuft gegen ein nicht mehr existierendes Legacy-Schema“ — kein Bezug.
- Zwei weitere Stichworttreffer der Todo-Suche — kein Bezug; Nutzer entschied, keines zu übernehmen.
</user_constraints>

## Summary

This is a brownfield, three-layer feature confined to an existing, well-established codebase. All
patterns needed already exist in the repo and must be mirrored, not invented: the `anime_titles` +
`languages` normalized-metadata pattern (migrations 0019-0022) is the direct template for the new
tag/genre language-name tables (D-02); the `ListGenreTokens`/`ListTagTokens` admin-token endpoints
already compute usage counts and are the base for the new admin page's row data; the
`loadNormalizedAnimeMetadata` function in `backend/internal/repository/anime_metadata.go` is the
SINGLE place that already queries `anime_genres`/`anime_tags` for the public detail response and
must be extended in-place (not duplicated) to preserve the SQL-budget-locked query count of 7,
verified by `TestAnimePublicReadDetailStoredSlugAndSQLBudget`. The next free migration number is
**0168**.

For the search-filter relaxation, the required change touches exactly two gates: the backend
`parseSearchQueryTerm` short-circuit in `backend/internal/handlers/search.go` (currently a hard 400
below 2 characters) and the frontend `MIN_QUERY_LENGTH` guard in
`frontend/src/app/suche/useDebouncedSearch.ts` (currently aborts/clears whenever `q.trim().length <
2`, with no awareness of `genre`/`tag` filters at all). Both need an additive bypass: proceed when
`tag` or `genre` is set, even if `q` is absent. A serious, previously undocumented pitfall was found
in `search_fansub.go`: when `q=""` and no other filter narrows the fansub side, `buildSearchFansubQuery`
produces an EMPTY WHERE clause, so `searchFansub` returns **all** fansub groups, not zero — this
directly conflicts with the desired "Fansub-Teil leer" behavior noted under Claude's Discretion in
CONTEXT.md and must be handled explicitly in the plan (skip `searchFansub` when `Q==""` and no
Fansub-relevant filter is set, or otherwise gate the fansub branch).

For the public display layer, the exact insertion point in `frontend/src/app/anime/[id]/page.tsx` is
between `.description` (line 188-190) and `<AnimeInfoBanner>` (line 207); the Tags block needs its
OWN `<hr>`/divider (styled from `.divider` in `page.module.css`), independent of
`AnimeInfoBanner`'s own divider, because `AnimeInfoBanner` only renders its `<hr>` when a Jellyfin
banner URL exists (`frontend/src/components/anime/AnimeMediaProvider.tsx:174-178`).

**Primary recommendation:** Build in the three ordered layers as scoped. For Layer 1, add ONE new
migration (`0168_*`) creating `tag_names(tag_id, language_id, name)` and `genre_names(genre_id,
language_id, name)` — same shape as `anime_titles`, no per-language columns — plus a `UNIQUE
(tag_id, language_id)` / `(genre_id, language_id)` constraint (title_type has no equivalent needed
here since there is only one "name" per tag+language, not multiple title-type variants). Extend
`loadNormalizedAnimeMetadata`'s existing genre/tag queries with a `LEFT JOIN ... ON language.code =
'de'` and `COALESCE(name_de.name, g.name)` rather than adding new queries. For Layer 2, patch
`parseSearchQueryTerm`'s caller in `search.go` and `MIN_QUERY_LENGTH` gate in
`useDebouncedSearch.ts` with an additive OR-condition, and explicitly handle the fansub-empty-WHERE
pitfall. For Layer 3, insert a Tags block into `page.tsx` right after `.description`, matching the
`.genreChip` styling pattern but with contentnav semantics (D-17), each chip a real `<Link>` to
`/suche?type=anime&tag=<name>`, and convert the existing genre chips (currently plain `<span>`,
`page.tsx:159-161`) into `<Link>` elements the same way.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Tag/genre language-name storage | Database / Storage | API / Backend | New normalized tables mirroring `anime_titles`; backend repository reads/writes them |
| Admin CRUD for tag/genre translations | API / Backend | Frontend Server (SSR) admin page | New `/admin/tags`-adjacent + `/admin/genres`-adjacent PATCH endpoints; admin page is a client-rendered CRUD table under `frontend/src/app/admin/` |
| Public German display name resolution | API / Backend | — | `loadNormalizedAnimeMetadata` (used by both public detail read and admin edit read) resolves `COALESCE(de-name, base-name)` server-side; frontend only renders what it receives |
| Tag/genre chip rendering + links | Browser / Client (SSR-rendered, no client JS needed) | — | `page.tsx` is a Server Component; chips are static `<Link>` elements, no client-side interactivity required |
| `/suche` filter-only search (no q) | API / Backend | Frontend Server (SSR)/Client | Gate lives in `search.go` handler + `search_anime.go`/`search_fansub.go` repository; frontend gate in `useDebouncedSearch.ts` mirrors it (defense in depth, not authoritative) |
| Tag/genre name-matching across languages | Database / Storage | API / Backend | Search filter query (`search_anime.go`) must join the new name tables so `lower(name) = lower($n)` matches any language variant, not just the base name |

## Standard Stack

No new external packages are introduced by this phase — it is 100% additive SQL + Go + TypeScript
using the project's existing stack (Gin, pgx/v5, Next.js 16 App Router, `@/components/ui`
primitives). No `npm install` / `go get` is required.

**Version verification (informational, already pinned in the repo, not phase-specific):**
- `next`: `^16.1.6` — `frontend/package.json:27` `[VERIFIED: repo package.json]`
- `react` / `react-dom`: `18.3.1` — `frontend/package.json:28` `[VERIFIED: repo package.json]`
- `vitest`: `^3.2.4` — `frontend/package.json:46` `[VERIFIED: repo package.json]`
- Go: `1.25.0`, `github.com/jackc/pgx/v5 v5.7.1`, `github.com/gin-gonic/gin v1.10.0` — `backend/go.mod` `[VERIFIED: repo go.mod]`

### Alternatives Considered
None — CONTEXT.md D-02 already locks the storage pattern (mirror `anime_titles`), and no library
research is needed for the rest of the phase.

## Package Legitimacy Audit

**Not applicable.** This phase installs zero new packages (backend or frontend). No slopcheck /
registry verification was needed or performed.

## Architecture Patterns

### System Architecture Diagram (Layer 1: Mehrsprachigkeit)

```
Admin browser (new /admin/tags-genres page)
   │  GET  list tags+genres with usage count + de-name
   │  PATCH set/clear de-name for one tag or genre
   ▼
AdminContentHandler (new handlers, e.g. admin_content_tag_names.go)
   │
   ▼
AdminContentRepository (new repo funcs, mirrors ListTagTokens/ListGenreTokens
   │ + a new upsert/delete against tag_names/genre_names)
   ▼
Postgres: tags/genres (base name, UNCHANGED) ⟷ tag_names/genre_names (NEW, FK + language_id)
                                                        ▲
                                                        │ LEFT JOIN ... code='de'
Public anime detail read  ──────────────────────────────┘
(anime_metadata.go: loadNormalizedAnimeMetadata, SAME query, extended not duplicated)
   ▼
GET /api/v1/anime/:id  →  AnimeDetail.tags[] / genres[] (already deutsche Namen, transparent to caller)
```

### System Architecture Diagram (Layer 2: Nur-Filter-Suche)

```
Browser: chip link /suche?type=anime&tag=Amnesia (no q)
   ▼
useDebouncedSearch.ts: MIN_QUERY_LENGTH gate
   — currently: q.trim().length < 2  → abort, no request
   — needed:    (q.trim().length < 2 AND !filters.tag AND !filters.genre) → abort
   ▼ (request fires)
GET /api/v1/search?type=anime&tag=Amnesia   (no q param)
   ▼
SearchHandler.Search (search.go)
   — currently: parseSearchQueryTerm() failing ⇒ always 400
   — needed:    only 400 if q too short AND tag/genre both absent
   ▼
SearchRepository.Search → searchesAnime/searchesFansub(type) → tx
   ├─ searchAnime(tx, f)   — buildSearchAnimeQuery already handles f.Q=="" gracefully
   │                          (skips q-OR-block, orderSQL falls back to "display_title ASC")
   └─ searchFansub(tx, f)  — ⚠ PITFALL: f.Q=="" + no fansub-relevant filter ⇒ EMPTY WHERE
                              ⇒ returns ALL fansub groups, not zero. Needs explicit handling.
```

### Recommended Project Structure (new/touched files only)

```
database/migrations/
├── 0168_tag_genre_language_names.up.sql      # NEW — tag_names + genre_names tables
└── 0168_tag_genre_language_names.down.sql    # NEW

backend/internal/
├── repository/
│   ├── anime_metadata.go                     # EXTEND loadNormalizedAnimeMetadata's genre/tag SELECTs
│   ├── admin_content.go                      # EXTEND: add tag_names/genre_names CRUD helpers
│   └── search_anime.go                       # EXTEND: genre/tag filter joins name tables too (D-10)
├── handlers/
│   ├── search.go                             # EXTEND: additive q-required bypass (D-08)
│   ├── admin_content_tags.go                 # EXTEND or sibling file: language-name endpoints
│   └── admin_content_genres.go               # EXTEND or sibling file: language-name endpoints
└── cmd/server/admin_routes.go                # EXTEND: register new admin endpoints

frontend/src/
├── app/
│   ├── anime/[id]/
│   │   ├── page.tsx                          # EXTEND: Tags block after .description, genre chips → Links
│   │   ├── page.module.css                   # EXTEND: .tagsSection/.tagChip styles (contentnav, not badge)
│   │   ├── page.test.tsx                     # EXTEND
│   │   ├── page.performance.test.ts          # EXTEND (SQL-budget-equivalent guard already elsewhere;
│   │   │                                        this file guards fetch/query counts on the FE side)
│   │   └── animeDetailData.test.ts            # EXTEND if AnimeDetail shape changes
│   ├── suche/
│   │   ├── useDebouncedSearch.ts             # EXTEND: additive MIN_QUERY_LENGTH bypass
│   │   ├── useDebouncedSearch.test.tsx       # EXTEND
│   │   ├── SearchResults.tsx                 # EXTEND: empty-state gate must mirror the bypass
│   │   ├── SearchResults.test.tsx            # EXTEND
│   │   └── SearchFilters.tsx                 # unchanged (genre/tag inputs already exist)
│   └── admin/
│       └── tags-genres/ (or similar; NEW)     # NEW admin page — @/components/ui Table/Input/FormField/Button
├── types/anime.ts                            # unchanged shape (tags?: string[]; genres?: string[])
└── shared/contracts/openapi.yaml              # EXTEND: q no longer required; new admin endpoints documented
```

### Pattern 1: Normalized per-language reference data (mirror `anime_titles`)
**What:** One row per (entity_id, language_id) with a plain `name`/`title` TEXT column — no per-language
columns on the base table.
**When to use:** Exactly the D-02 requirement — adding German (and future) names to `tags`/`genres`.
**Example (verbatim from the existing schema, `database/migrations/0021_add_normalized_metadata_tables.up.sql`):**
```sql
-- Source: database/migrations/0021_add_normalized_metadata_tables.up.sql (existing anime_titles)
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
```
The new tables need NO `title_type_id` equivalent (tags/genres have exactly one name per language,
not multiple variants like main/romaji/official) — so the unique constraint is simply `(tag_id,
language_id)` / `(genre_id, language_id)`. Recommended shape:
```sql
-- NEW (Migration 0168) — proposed shape, table/column names are Claude's Discretion per CONTEXT.md
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

CREATE TABLE IF NOT EXISTS genre_names (
    id BIGSERIAL PRIMARY KEY,
    genre_id BIGINT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    language_id BIGINT NOT NULL REFERENCES languages(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_genre_name_language UNIQUE (genre_id, language_id)
);
CREATE INDEX IF NOT EXISTS idx_genre_names_genre ON genre_names(genre_id);
```
`languages` already has `('de', 'German')` seeded (`database/migrations/0019...` row insert), so no
languages-table seed migration is required — the German row already exists with `code='de'`.

### Pattern 2: Extending an existing query in place, not adding a new one (SQL-budget discipline)
**What:** `loadNormalizedAnimeMetadata` (`backend/internal/repository/anime_metadata.go:67-96` for
genres, `:98-127` for tags) currently does a plain `SELECT g.name FROM anime_genres ag JOIN genres g
...`. It must become `SELECT COALESCE(gn.name, g.name) FROM anime_genres ag JOIN genres g ... LEFT
JOIN genre_names gn ON gn.genre_id = g.id AND gn.language_id = (SELECT id FROM languages WHERE
code='de')` — SAME statement count, just a richer SELECT. This is the mechanism that satisfies
"ohne zusätzliche Anfrage und ohne N+1" (Claude's Discretion note) AND keeps
`TestAnimePublicReadDetailStoredSlugAndSQLBudget`'s hard-coded `len(queries) != 7` assertion green.
**When to use:** Any time the public detail read needs the German name — do NOT add a third
genre/tag query "for the display name" — extend the two existing ones.
**Source:** `backend/internal/repository/anime_metadata.go:67-127` (existing code, read directly).

### Pattern 3: Additive validation gate (q required unless X)
**What:** `parseSearchQueryTerm` in `backend/internal/handlers/search.go:209-215` is a pure
short-circuit today. The D-08 change is: compute `q, qOK := parseSearchQueryTerm(c)`, THEN only
`badRequest` if `!qOK && genre == nil && tag == nil` (genre/tag must be parsed BEFORE the q check, so
the order of operations in `Search()` needs light reshuffling — currently genre/tag parsing happens
AFTER the q check at line 80-88, so it must move earlier).
**When to use:** Exactly this D-08 gate; mirror the SAME logic client-side in
`useDebouncedSearch.ts:206-217` (the `trimmed.length < MIN_QUERY_LENGTH` early-return there needs
the same `&& !filters.tag && !filters.genre` guard) — the frontend gate is a UX nicety (avoids
firing pointless requests), the backend gate is authoritative.

### Pattern 4: Admin list+usage-count+inline-edit page — no exact existing analog found
**What:** No page in `frontend/src/app/admin/` currently combines (a) a full list of a normalized
reference-data type, (b) a computed usage count column, and (c) a per-row editable text field saved
individually. The CLOSEST partial analogs are:
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx` — genre-token
  autocomplete UI for one anime (uses `/admin/genres` `ListGenreTokens` for suggestions with usage
  counts, `item.count` displayed as `x{item.count}`). **Do NOT copy its `<input>` element** — it uses
  a raw native `<input>` (line 93), which violates CLAUDE.md's `@/components/ui` primitive mandate;
  it predates the ESLint `no-restricted-syntax` rule and is tracked as legacy debt, not a pattern to
  extend.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx` — a genuine per-row
  editable list using `@/components/ui` `FormField`/`Input`/`Select`/`Button`, `setLinks((current) =>
  current.map(...))` state-update-by-key pattern. Good template for the ROW-EDITING mechanics, but it
  edits a sub-resource of one parent form (saved together on submit), not a standalone global list
  with per-row independent persistence.
- `frontend/src/app/admin/groups/AdminGroupsClient.tsx` — `Table`/`TableBody`/`TableRow`/`TableCell`
  read-only listing pattern for the table shell.
**Recommendation:** Compose a new page from `Table` (shell, per `AdminGroupsClient.tsx`) + `FormField`
+ `Input` per editable cell (mechanics per `FansubCommunityLinksList.tsx`, but bound to `PATCH` per
row, e.g. on blur or an explicit small `Button`), NOT from `AnimeEditGenreSection.tsx`. This is
flagged honestly as a new UI composition, not a copy of an existing exact pattern.

### Anti-Patterns to Avoid
- **Adding a third query to `loadNormalizedAnimeMetadata` for the German name lookup:** breaks the
  SQL-budget test (`anime_public_read_integration_test.go:255`, hard `len(queries) != 7` assertion).
  Extend the existing genre/tag SELECTs with a `LEFT JOIN` instead.
- **Copying `AnimeEditGenreSection.tsx`'s native `<input>`:** CLAUDE.md forbids new native
  `<input>`/`<select>`/`<textarea>`/`<button>` usage; this file is legacy debt, not a template.
- **Filtering tag/genre search only against `tags.name`/`genres.name`:** D-10 requires matching
  "jeden seiner Namen" (base name AND all language names). The current
  `lower(g.name) = lower($n)` / `lower(t.name) = lower($n)` conditions in `search_anime.go:90-103`
  must become an `EXISTS` that also checks the new `genre_names`/`tag_names` tables.
- **Letting the fansub side silently return everything when `q=""`:** see Pitfall 1 below.
- **Building a second/new URL-encoding convention for the tag/genre chip links:** D-09 explicitly
  forbids this — reuse `URLSearchParams`/the same encoding `buildStateQuery` already uses in
  `useDebouncedSearch.ts`. Since `page.tsx` is a Server Component and cannot import the `'use client'`
  hook, construct the href directly with `new URLSearchParams({ type: 'anime', tag: name
  }).toString()` (or `encodeURIComponent`) rather than hand-rolling percent-encoding.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tag/genre usage counts | A new aggregate query | `buildAuthoritativeGenreTokensQuery()` / `buildAuthoritativeTagTokensQuery()` (`admin_content.go:210-291`) — already `GROUP BY name, COUNT(*)` | Exact same aggregation the new admin page needs; only needs a JOIN added for the German name column |
| URL query-string encoding for chip links | Manual `%XX` percent-encoding | `URLSearchParams` (same mechanism `buildStateQuery` in `useDebouncedSearch.ts:119-134` already uses) | Guarantees round-trip-safe encoding of spaces/umlauts/special chars consistent with how the search page reads params back out |
| Admin authorization for new tag/genre-name endpoints | New auth middleware | `h.requireAdmin(c)` (`backend/internal/handlers/admin_content_authz.go:10`, used identically by `ListTagTokens`/`ListGenreTokens`) | Established, tested admin-gate pattern for this exact handler family |

**Key insight:** Every mechanical piece this phase needs (aggregation query, admin auth check, normalized
per-language table shape, additive-write "replace" pattern) already has a proven, tested
implementation elsewhere in this file family. The only genuinely new code is: (1) the two new tables,
(2) the LEFT JOIN extension for German-name resolution, (3) the additive q-required bypass, and (4)
the admin CRUD page composition.

## Common Pitfalls

### Pitfall 1: Fansub search returns ALL groups (not zero) when q="" and no filter narrows it
**What goes wrong:** With `type=alle` or `type=fansub` and only `tag`/`genre` set (both anime-only
filters), `searchesFansub(type)` still returns `true`, so `searchFansub` executes. Inside
`buildSearchFansubQuery` (`search_fansub.go:22-68`), if `f.Q == ""` and `f.Status == nil`, the
`conditions` slice stays empty, `whereSQL` stays `""`, and the resulting SQL is `SELECT ... FROM
fansub_groups` with NO WHERE clause at all — returning every fansub group in the database, paginated,
not an empty result.
**Why it happens:** `buildSearchFansubQuery` was never designed for a q-less call; it silently
degrades to "match everything" instead of "match nothing" the way a defensive filter builder should.
**How to avoid:** Explicitly handle this in the plan — either (a) make `searchesFansub` return `false`
when `Q==""` (i.e., a tag/genre-only search never touches the fansub branch, consistent with tag/genre
being anime-only concepts), or (b) add an explicit "no query, no fansub match" guard inside
`buildSearchFansubQuery`. Option (a) is simpler and matches the CONTEXT.md discretion note
("Fansub-Teil leer, keine Fehlermeldung") without touching fansub SQL at all.
**Warning signs:** A UAT of `/suche?type=alle&tag=Amnesia` unexpectedly shows a full list of fansub
groups under the "Fansubgruppen" tab/section.

### Pitfall 2: SQL-budget test breaks silently if a new query is added instead of extending the existing one
**What goes wrong:** `TestAnimePublicReadDetailStoredSlugAndSQLBudget` asserts
`len(queries) != 7` fails the test with an explicit message ("detail statements = %d, want unchanged
7"). Any implementation that adds a dedicated "fetch German tag/genre names" query (rather than
joining it into the existing genre/tag SELECTs in `anime_metadata.go`) will push this to 8 and fail
CI/tests, and violates the CONTEXT.md constraint "keine zusätzlichen Requests" explicitly.
**Why it happens:** Easy to reach for "just add one more query" when extending an existing feature,
especially since `loadNormalizedAnimeMetadata` already issues three separate `Query()` calls (titles,
genres, tags) — adding a fourth feels natural but isn't allowed here.
**How to avoid:** Modify the existing genre/tag `SELECT` statements with a `LEFT JOIN
genre_names/tag_names ... AND language_id = (SELECT id FROM languages WHERE code = 'de')` and
`COALESCE()` in the select-list. Zero new `Query()` calls.
**Warning signs:** `go test ./backend/internal/repository/... -run TestAnimePublicReadDetailStoredSlugAndSQLBudget` failing after implementation.

### Pitfall 3: `q` becoming truly optional in OpenAPI/handler ordering
**What goes wrong:** `search.go`'s `Search()` currently parses `q` (line 80) BEFORE `genre`/`tag`
(lines 113-122). A naive additive fix ("if !ok, check genre/tag") needs genre/tag parsed first, or the
function needs restructuring so the 400 decision happens after all three are known. Get the ordering
wrong and either genre/tag parsing errors get masked by an early q-400, or the q-bypass check
references not-yet-parsed variables.
**Why it happens:** The existing code was written under a "q is always required" assumption, so early
return was a valid simplification at the time.
**How to avoid:** Reorder so `genre`/`tag`/`format`/`status` parsing (which are all currently
independent parses anyway) happens before the final `q`-required decision, OR parse `q` non-fatally
first (`q, qOK := parseSearchQueryTerm(c)`) and defer the `badRequest` call until after genre/tag are
known.
**Warning signs:** `TestSearchRejectsMissingQuery` (asserts bare `/api/v1/search` with nothing set
still 400s) regressing, or a genre/tag search with a too-short-but-nonempty `q` silently succeeding
when it should still 400 on `q` if `q` is present-but-invalid-length (open question — see below).

### Pitfall 4: Genre chips are currently `<span>`, not links — a real UI type change, not just a CSS tweak
**What goes wrong:** `page.tsx:157-165` renders `anime.genres` as `<span className={styles.genreChip}>`
today, including a hardcoded fallback `<span className={styles.genreChip}>Anime</span>` when no
genres exist. D-20 requires genre chips to become links EXCEPT the discretion item says "Umgang mit
dem heutigen Platzhalter-Chip 'Anime' bei fehlenden Genres (nicht verlinken)" — i.e. the fallback chip
must stay a non-link `<span>`, only REAL genres become `<Link>`.
**Why it happens:** Easy to blanket-convert the whole `.map()` to `<Link>` without special-casing the
`else` branch.
**How to avoid:** Keep the `else` branch (`{genre.length === 0 ? <span>Anime</span> : ...}`) as a plain
`<span>`; only the `.map((genre) => ...)` branch becomes `<Link href=...>`.
**Warning signs:** The "Anime" placeholder chip becomes a dead link to `/suche?type=anime&genre=Anime`.

## Code Examples

### Existing normalized-metadata read pattern (extend this, do not duplicate)
```go
// Source: backend/internal/repository/anime_metadata.go:67-96 (existing, to be extended with a
// LEFT JOIN genre_names + COALESCE — NOT a new query)
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

### Existing admin token aggregation (base for the new admin page's list query)
```go
// Source: backend/internal/repository/admin_content.go:210-217 (existing, mirror for tag_names/genre_names JOIN)
func buildAuthoritativeGenreTokensQuery() string {
    return `
        SELECT g.name, COUNT(*) AS usage_count
        FROM anime_genres ag
        JOIN genres g ON g.id = ag.genre_id
        GROUP BY g.name
    `
}
```

### Existing admin route registration pattern (mirror for new endpoints)
```go
// Source: backend/cmd/server/admin_routes.go:95-96 (existing)
v1.GET("/admin/genres", auth, deps.adminContentHandler.ListGenreTokens)
v1.GET("/admin/tags", auth, deps.adminContentHandler.ListTagTokens)
```

### Existing search filter pattern to extend for D-10 (multi-language name match)
```go
// Source: backend/internal/repository/search_anime.go:90-96 (existing — base-name only)
if f.Genre != nil && *f.Genre != "" {
    conditions = append(conditions, fmt.Sprintf(
        `EXISTS (SELECT 1 FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id
            WHERE ag.anime_id = anime.id AND lower(g.name) = lower($%d))`, argPos))
    args = append(args, *f.Genre)
    argPos++
}
// D-10 extension shape (to add genre_names matching, not yet implemented):
//   EXISTS (SELECT 1 FROM anime_genres ag JOIN genres g ON g.id = ag.genre_id
//     WHERE ag.anime_id = anime.id AND (lower(g.name) = lower($n)
//       OR EXISTS (SELECT 1 FROM genre_names gn WHERE gn.genre_id = g.id AND lower(gn.name) = lower($n))))
```

### AnimeInfoBanner's self-contained divider (do not rely on it for the Tags block's own line)
```tsx
// Source: frontend/src/components/anime/AnimeMediaProvider.tsx:162-179 (existing, unmodified)
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
This confirms D-13 precisely: the existing `<hr>` is emitted ONLY together with the banner image.
The Tags block (per D-12/D-13) needs its own, separately-conditioned `<hr className={styles.divider}>`
rendered only when `anime.tags && anime.tags.length > 0`, placed between `.description` and
`<AnimeInfoBanner>` — this does not touch `AnimeMediaProvider.tsx` at all.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Public detail page renders only `genres`, never `tags` | Add a Tags block (D-12–D-19) | This phase | New public UI surface, zero backend contract break (field already exists) |
| `/suche` always requires `q>=2` | Additive bypass when `tag`/`genre` set | This phase (D-08) | `q` becomes conditionally optional in the OpenAPI contract — must update `required`/`minLength` semantics without breaking the existing "no params at all → 400" test |
| `tags.name`/`genres.name` is the only searchable/displayable name | Add `tag_names`/`genre_names` for German (and future) names, base name unchanged | This phase (D-02, D-03) | Search filter (D-10) and public display (D-06) both read the new tables; import pipeline (D-05) is explicitly NOT touched |

**Deprecated/outdated:** None — this is a purely additive phase; nothing existing is removed except
the plain `<span>` genre chips become `<Link>` (visually/semantically upgraded, not deprecated).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Proposed table names `tag_names`/`genre_names` and column names (`tag_id`/`genre_id`, `language_id`, `name`) — CONTEXT.md explicitly leaves exact naming to Claude's Discretion, so this is a suggestion, not a verified requirement | Architecture Patterns, Pattern 1 | Low — CONTEXT.md explicitly permits different naming as long as D-02/D-03 (mirrors `anime_titles`, no per-language columns) are honored |
| A2 | Recommended fix for Pitfall 1 (make `searchesFansub` return `false` when `Q==""`) — this is a design recommendation, not something confirmed against a written product decision beyond the "Claude's Discretion" note in CONTEXT.md | Common Pitfalls, Pitfall 1 | Medium — if the planner chooses a different fix (e.g., gate inside `buildSearchFansubQuery` instead), that is equally valid; but SOME explicit fix must ship, doing nothing will regress fansub results |
| A3 | No REQ-IDs exist yet for phase 160 in `.planning/REQUIREMENTS.md` (grep found zero matches for "160") — requirement mapping in the table below is inferred directly from CONTEXT.md decisions, not from a REQUIREMENTS.md source | Phase Requirements section | Low — CONTEXT.md is the authoritative locked-decision source per this phase's own provenance note ("Auftraggeber-bestaetigt") |

**If this table is empty:** N/A — see rows above.

## Open Questions

1. **Should a `q` value that IS present but shorter than 2 characters still 400 when `tag`/`genre` is set?**
   - What we know: D-08 says "liefert Ergebnisse auch ohne `q`, wenn `tag` oder `genre` gesetzt ist" —
     this describes the ABSENT-q case explicitly, not the "q present but 1 character" case.
   - What's unclear: `?tag=Amnesia&q=a` — does the too-short `q` still trigger a 400 (strict reading:
     "ohne q" means q is absent, not q is short-and-invalid), or is `q` effectively ignored/bypassed
     whenever tag/genre exist?
   - Recommendation: Treat "q absent or empty string" as the bypass condition (i.e., only skip the
     length check when `q` is empty after trim), and continue to 400 on a present-but-too-short `q`
     regardless of tag/genre. This preserves `TestSearchRejectsTooShortQuery`'s existing semantics
     (`?q=a` alone still 400s) and is the narrower, safer reading of D-08's wording. Confirm with the
     product owner during planning if ambiguity remains.

2. **Exact admin endpoint shape for writing German tag/genre names (PATCH per-row vs. bulk PATCH).**
   - What we know: D-04 requires "Namensfeld je Sprache" on a list page; the existing
     `replaceAuthoritativeAnimeTags`/`replaceAuthoritativeAnimeGenres` pattern is a bulk
     delete-then-reinsert PER ANIME, which does not fit — the new endpoint is PER TAG/GENRE (global,
     not anime-scoped), a different shape entirely.
   - What's unclear: Whether the endpoint should be `PATCH /admin/tags/:id/names/:languageCode` (one
     name at a time) or `PUT /admin/tags/:id/names` (replace-all-languages-at-once, mirroring the
     `replaceAuthoritative*` idiom). Since only German exists as a target language right now (D-06:
     "Kein Sprachumschalter" in public UI, only German maintained), a single-language PATCH is
     probably simpler and sufficient — no existing pattern strongly forces either choice.
   - Recommendation: `CONTEXT.md` marks the exact API form as Claude's Discretion — plan a narrow
     `PATCH /admin/tags/:id/names/de` and `PATCH /admin/genres/:id/names/de` (upsert-or-clear) as the
     simplest option consistent with "jetzt Deutsch" (D-04) and easily extended to other languages
     later without a breaking change.

## Environment Availability

Skipped — this phase has no new external tool/service/runtime dependencies. All work uses the
existing Postgres 16 + Go 1.25 + Node/Next.js 16 stack already running in Docker Compose on
`team4s-linux`, verified reachable via `docker compose ps` per CLAUDE.md's canonical workflow (not
re-verified here since no new dependency is introduced).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend framework | Go `testing` + `httptest` + `testify` (`github.com/stretchr/testify v1.9.0`) |
| Backend integration DB | Real Postgres via `testsupport.OpenPhase106Postgres(t)` (scoped fixture DB, NOT `DATABASE_URL`) — `anime_public_read_integration_test.go:50` |
| Frontend framework | Vitest 3.2.4 + `@testing-library/react` (jsdom environment where needed) |
| Backend quick run | `cd backend && go test ./internal/handlers/... ./internal/repository/... -run TestSearch` (targeted) |
| Backend full suite | `cd backend && go test ./...` |
| Frontend quick run | `cd frontend && npx vitest run src/app/anime/\[id\]/ src/app/suche/` |
| Frontend full suite | `cd frontend && npm test` (or `npx vitest run`) |

### Phase Requirements → Test Map
No REQ-IDs exist yet for this phase (`.planning/REQUIREMENTS.md` has zero matches for "160" —
mapping is inferred from CONTEXT.md decision IDs):

| Decision ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-02/D-03/D-06/D-07 | German tag/genre names stored + resolved on public detail, base name unchanged, no extra query | integration | `go test ./backend/internal/repository/... -run TestAnimePublicReadDetailStoredSlugAndSQLBudget` | ✅ existing, extend |
| D-04 | Admin CRUD list for tag/genre names | unit (httptest) | New: `go test ./backend/internal/handlers/... -run TestAdminTagGenreNames` | ❌ Wave 0 — new handler test file needed |
| D-08 | `/suche` works without `q` for tag/genre | unit (httptest) | `go test ./backend/internal/handlers/... -run TestSearch` | ✅ existing (`search_test.go`), extend with new cases |
| D-08 (fansub pitfall) | `type=alle`/`fansub` + tag/genre-only ⇒ empty fansub side | integration or unit | New case in `search_repository_test.go` | ❌ Wave 0 — needs a new test case (Pitfall 1 regression guard) |
| D-09 | Chip links correctly URL-encoded | unit (component) | `npx vitest run src/app/anime/\[id\]/page.test.tsx` | ✅ existing, extend |
| D-10 | Filter matches any language name | integration | `go test ./backend/internal/repository/... -run TestSearchAnime` (or equivalent in `search_repository_test.go`) | ❌ Wave 0 — new case needed after `genre_names`/`tag_names` join lands |
| D-12/D-13/D-14/D-15/D-16/D-17/D-18/D-19 | Tags block position/order/a11y/styling | component | `npx vitest run src/app/anime/\[id\]/page.test.tsx` | ✅ existing, extend |
| D-20 | Genre chips become links, placeholder stays non-link | component | `npx vitest run src/app/anime/\[id\]/page.test.tsx` | ✅ existing, extend |

### Sampling Rate
- **Per task commit:** targeted `go test ./internal/... -run <TestName>` and `npx vitest run <file>`
- **Per wave merge:** `go test ./...` (backend) + `npx vitest run` (frontend full)
- **Phase gate:** Full suite green before `/gsd:verify-work`, including
  `TestAnimePublicReadDetailStoredSlugAndSQLBudget` (SQL-budget regression guard) and
  `TestSearchRejectsMissingQuery` (D-08 bypass didn't break the no-filter-at-all case)

### Wave 0 Gaps
- [ ] New backend handler test file for admin tag/genre-name CRUD endpoints — covers D-04
- [ ] New backend repository test case(s) in `search_repository_test.go` for the fansub-empty-WHERE
      pitfall (D-08 discretion item) — covers Pitfall 1
- [ ] New backend repository test case(s) for D-10 (filter matches language name, not just base name)
      once `genre_names`/`tag_names` exist
- [ ] Migration test/verification for `0168_tag_genre_language_names` (up/down round-trip) — follow
      the existing convention visible in e.g. `0166_jellyfin_source_identity` migrations (guarded
      `DO $$ ... RAISE EXCEPTION` blocks are used for higher-risk migrations; this one is purely
      additive `CREATE TABLE IF NOT EXISTS`, so a simple apply/rollback smoke check is likely
      sufficient — no data-loss risk since no existing rows are touched)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (admin endpoints only) | Existing `h.requireAdmin(c)` (`admin_content_authz.go`), reused verbatim — no new auth mechanism |
| V3 Session Management | no | Unchanged; public GET endpoints, existing admin session/bearer handling reused |
| V4 Access Control | yes (admin endpoints only) | `requireAdmin` gate before any write to `tag_names`/`genre_names`; public reads have no access-control change |
| V5 Input Validation | yes | New admin endpoints must reuse existing patterns: trim + length caps (mirror `searchMaxFilterLen`/`len([]rune(q)) > 100` checks in `search.go`/`admin_content_tags.go`) for the German-name input; `parseOptionalFilterString`-style validation for `tag`/`genre` query params (already exists, unchanged) |
| V6 Cryptography | no | Not applicable — no new secrets, tokens, or crypto operations |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via new tag/genre name inputs | Tampering | All values MUST flow as `$n` bind parameters exactly like the existing `replaceAuthoritativeAnimeTags`/`Genres` and `buildSearchAnimeQuery` code — never string-interpolate a name into SQL. This is already the established codebase convention (confirmed via `admin_content.go`/`search_anime.go` reads — 100% parameterized) |
| Unbounded/DoS-length name inputs | Denial of Service | Cap the new German-name PATCH input length server-side, mirroring `searchMaxFilterLen = 100` in `search.go:25` and the `len([]rune(q)) > 100` check pattern in `admin_content_tags.go:23` |
| Reflected XSS via tag/genre name in chip rendering | Tampering / Information Disclosure | Not a realistic risk here — React (both admin table cells and public `page.tsx` `<Link>` text children) auto-escapes all text content; no `dangerouslySetInnerHTML` is used anywhere in the touched files |

## Sources

### Primary (HIGH confidence — direct repo reads, this session)
- `database/migrations/0019_add_reference_data_tables.up.sql` — `tags`/`genres` base table schema
- `database/migrations/0020_add_metadata_reference_tables.up.sql` — `languages` table + seed rows (incl. `de`)
- `database/migrations/0021_add_normalized_metadata_tables.up.sql` — `anime_titles` pattern (D-02 template)
- `database/migrations/0022_add_junction_tables.up.sql` — `anime_genres`/`anime_tags` junction tables
- `database/migrations/0042_add_tag_tables_forward_fix.up.sql`, `0166_jellyfin_source_identity.up/down.sql`, `0167_episode_type_source.up.sql` — migration numbering/comment/down-file conventions
- `backend/cmd/migrate/main.go` — migration CLI usage (`migrate up/down/status`)
- `backend/internal/repository/anime_metadata.go` — `loadNormalizedAnimeMetadata` (SQL-budget-critical extension point)
- `backend/internal/repository/anime_v2.go` — public detail query, confirms tags/genres come from `loadNormalizedAnimeMetadata`
- `backend/internal/repository/admin_content.go` — `ListGenreTokens`/`ListTagTokens`, `replaceAuthoritativeAnimeTags/Genres`
- `backend/internal/handlers/admin_content_tags.go`, `admin_content_genres.go` — existing token-list handlers
- `backend/cmd/server/admin_routes.go` — route registration pattern (lines 95-96)
- `backend/internal/handlers/search.go` — `parseSearchQueryTerm`, full `Search()` handler flow
- `backend/internal/repository/search_anime.go`, `search_fansub.go`, `search_repository.go` — filter/order builders, `searchesAnime`/`searchesFansub` dispatch, Pitfall 1 root cause
- `backend/internal/repository/anime_public_read_integration_test.go` — SQL-budget test (`len(queries) != 7`), fixture schema
- `backend/internal/handlers/search_test.go` — existing q-validation test coverage
- `frontend/src/app/anime/[id]/page.tsx`, `page.module.css` — insertion point, existing genre-chip markup/styles
- `frontend/src/components/anime/AnimeMediaProvider.tsx` — `AnimeInfoBanner` divider-binding behavior (D-13 confirmation)
- `frontend/src/app/suche/useDebouncedSearch.ts`, `SearchResults.tsx`, `SearchFilters.tsx` — MIN_QUERY_LENGTH gate, empty-state gate, existing filter fields
- `frontend/src/app/anime/[id]/page.test.tsx`, `page.performance.test.ts`, `animeDetailData.test.ts` — test extension patterns (`elements()`/`textContent()`/`loadContent()` helpers)
- `frontend/src/app/suche/useDebouncedSearch.test.tsx`, `SearchResults.test.tsx` — test structure for the search-gate extension
- `frontend/src/types/anime.ts` — `AnimeDetail.tags?: string[]` / `genres?: string[]` (unchanged shape)
- `shared/contracts/openapi.yaml` (lines 749-888, 2966-3064) — existing `/search` and `/admin/genres`/`/admin/tags` schema definitions to extend
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx`, `frontend/src/app/admin/fansubs/[id]/edit/FansubCommunityLinksList.tsx`, `frontend/src/app/admin/groups/AdminGroupsClient.tsx` — admin UI pattern survey (Pattern 4)
- `frontend/package.json`, `backend/go.mod` — pinned dependency versions

### Secondary (MEDIUM confidence)
None — no WebSearch was needed; this is a pure brownfield-codebase research task with everything
verifiable directly in the repo.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all versions read directly from `package.json`/`go.mod`
- Architecture: HIGH — every pattern cited is read verbatim from the current repo, not inferred
- Pitfalls: HIGH for Pitfall 1/2/3/4 (all derived from direct code reads of the exact conditional
  logic involved, not speculation)

**Research date:** 2026-09-16
**Valid until:** 30 days (stable brownfield codebase, no fast-moving external dependency)
