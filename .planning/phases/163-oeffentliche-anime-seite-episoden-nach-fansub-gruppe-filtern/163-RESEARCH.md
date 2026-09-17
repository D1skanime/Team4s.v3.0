# Phase 163: Öffentliche Anime-Seite: Episoden nach Fansub-Gruppe und vorhandenen Releases filtern - Research

**Researched:** 2026-09-17
**Domain:** PostgreSQL keyset-pagination query rewrite (Go/pgx) + Next.js client refetch-on-filter-change
**Confidence:** HIGH (root cause and fix shape empirically verified against the live dev DB; frontend refetch pattern verified against an existing project hook)

## Summary

The reported bug is real and has one root cause, confirmed live against `team4s_v2` (read-only, anime_id=4/Naruto): `publicEpisodeQuery`'s `inventory` CTE joins episodes to their release variants with `LEFT JOIN LATERAL`. When an episode has no matching variant (no release, or a release with a version but zero `release_variants`, or — after this fix — zero `release_version_groups` rows for the active group), the `LEFT JOIN` still emits exactly one "neutral" row per episode with all variant columns `NULL`. That neutral row is what makes every one of Naruto's 220 episodes appear in "Alle" today, and it is also why a client-side group filter (today's *only* filter, entirely inside `FansubVersionBrowser.tsx`) cannot remove episode 23 correctly once pagination is introduced — the neutral row for ep. 23 survives the SQL layer untouched and only a group-aware SQL predicate can suppress it. There is currently **no server-side group filter at all**: `PublicEpisodeOptions` has exactly two fields (`Limit`, `Cursor`); the handler's public-projection allowlist (`parseStrictNamedQuery(..., "projection","limit","cursor","includeVersions","includeFansubs")`) does not accept any group parameter; and `FansubVersionBrowser.tsx` filters `episode.versions` client-side per already-loaded page via `groupMatchedVersions`/`getSummaryVersion`/`hasNoMatchingVersion` — exactly the "Scheinfilterung über Teilmenge" the Auftraggeber (§6) warns about.

The fix is a small, additive, single-statement change: turn the LATERAL join into an `INNER JOIN LATERAL` (so episodes without a surviving variant produce **zero** rows, not a neutral row) and add one `EXISTS` predicate against `release_version_groups` inside that same LATERAL subquery — both for the baseline "does this version count as public" gate (D-02: version needs ≥1 variant **and** ≥1 group) and, when a group filter is active, for the group match itself (Ebene A+B in one place, coop handled for free because `EXISTS` doesn't care how many other groups also match). This was verified live: `EXPLAIN (ANALYZE)` against anime_id=4 with the AnimeOwnage group id (29) returns exactly episodes 1, 2, 5 in 1.08ms (vs. 1.11ms for the unfiltered baseline, 220-row scan); "Alle" (NULL group) returns exactly episodes 1–5 in 1.22ms. No N+1 is introduced — the query count stays what it is today (existence check + one bounded statement), plus one new small bounded lookup to resolve `slug → fansub_group_id` scoped to the anime (fail-closed 400 for an unknown/foreign slug), which is also O(1) regardless of episode/version count.

**Primary recommendation:** Change `LEFT JOIN LATERAL ... v ON TRUE` to `JOIN LATERAL ... v ON TRUE` in `publicEpisodeQuery`, add `AND EXISTS (SELECT 1 FROM release_version_groups rvg WHERE rvg.release_version_id = rev.id AND ($group::BIGINT IS NULL OR rvg.fansub_group_id = $group::BIGINT))` inside the LATERAL subquery, bump the cursor to `v:2` with a `g` (group id, `0`=Alle) field that must match the request's resolved group id, add a `total` CTE (`SELECT COUNT(DISTINCT episode_id) FROM inventory`) cross-joined into the final `SELECT` for the D-12 hit count, and add a `fansub=<slug>` query parameter to the handler's public allowlist that is resolved against `anime_fansub_groups`/`fansub_groups` before the main query runs (400 if the slug does not belong to this anime).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Episode/version visibility gate (Ebene A+B, D-01..D-03) | API/Backend (`publicEpisodeQuery` SQL) | Database (`release_version_groups`, `release_variants`) | Must be correct under pagination and coop; cannot be done client-side (§6) |
| Group-slug → group-id resolution + fail-closed validation (D-05) | API/Backend (new small repository lookup) | — | Must reject a slug that doesn't belong to this anime before it reaches the paginated query |
| Cursor scope enforcement (D-06) | API/Backend (`publicEpisodeCursor` struct + `normalized`) | — | Cursor is an opaque server-issued token; only the server can validate its filter scope |
| Trefferzahl "Episoden (N)" (D-12) | API/Backend computes the number (window/CTE in the same statement) | Browser/Client (holds and displays the latest fetched number) | Server must not add a second query; client must update on group switch without re-fetching all pages |
| Group switch / URL update (D-07..D-10) | Browser/Client (`FansubVersionBrowser.tsx`, `window.history.pushState`, existing `AbortController` pattern) | — | Established in Phase 162; D-07 layers a full refetch of the new group's first page on top, no RSC/page reload |
| SSR-deterministic initial selection + first page (D-11) | Frontend-Server (`page.tsx`, reads `searchParams.fansub`, passes it into the same server-side `getGroupedEpisodes` call with the filter param) | — | Avoids "Alle"-then-group flicker; same pattern as Phase 162 D-04 |
| Empty-state / error messaging (D-14, D-16, D-17) | Browser/Client (renders neutral text via `@/components/ui`) | — | Pure presentational decision on already-fetched (possibly empty) data |
| Contract sync (Go DTO / OpenAPI / TS types / `api.ts`) | API/Backend defines shape | Frontend consumes | Additive fields only (`fansub` query param, cursor `v:2` opaque, new `episode_count`-style field) |

## Standard Stack

No new external packages. This phase is a query/contract change inside the existing stack.

### Core (already in repo, no new install)

| Library | Version | Purpose | Why standard here |
|---------|---------|---------|--------------------|
| `github.com/jackc/pgx/v5` | pinned in `backend/go.mod` (unchanged) | SQL execution, nullable-param binding (`*int64`) | Already the project's only DB driver; `EXISTS`/`JOIN LATERAL` are plain SQL, no driver feature needed |
| PostgreSQL 16 (`postgres:16` in `docker-compose.yml`) | 16 (live, confirmed via `docker exec team4sv30-db`) | `JOIN LATERAL`, window functions, `EXISTS` semi-join | Already the project's only DB; version confirmed live, no upgrade needed |
| Next.js `^16.1.6` | confirmed in `frontend/package.json` | `searchParams` (SSR), `window.history.pushState`/`popstate` (client) | Already established in Phase 162 (`162-RESEARCH.md`) as the correct pattern for this exact route; no router refetch |
| `frontend/src/hooks/useCancellableSlugState.ts` | already in repo (used by `AdminGroupsClient.tsx`, `GroupRolesTab.tsx`, etc.) | Generic requestKey-scoped, abortable, last-write-wins fetch state | Directly reusable shape for "switch group → cancel in-flight → only last selection may set state" (D-09) — see caveat below |

### Alternatives considered

| Instead of | Could use | Tradeoff |
|------------|-----------|----------|
| `INNER JOIN LATERAL` + `EXISTS` inside the same subquery | A second `WHERE` clause outside the LATERAL, filtering on `v.release_version_id IS NOT NULL` | Does not remove the neutral row problem — a `LEFT JOIN` that is then filtered in the outer `WHERE` still requires restructuring the window functions (`COUNT/MIN OVER`), and does not correctly exclude episodes with a version-but-no-group in one place. The LATERAL-internal `EXISTS` is strictly simpler and was the one verified live. |
| `useCancellableSlugState` for the group-switch refetch | Keep+extend `FansubVersionBrowser.tsx`'s own local `AbortController ref` / `{source, episodes, pagination}` state (already used for `loadMore`) | `useCancellableSlugState` returns `data: null` while `status==='loading'`, which loses the "old list stays visible, dimmed" requirement (D-08) unless the caller separately caches the last successful payload. The component's own existing pattern *already* satisfies D-08 (it keeps `loadedEpisodes` visible during `loadMore`), so extending it to the group-switch case is less code and provably correct against D-08. Recommend **not** introducing the generic hook here; note it exists in case the planner prefers a rewrite. |
| Separate `slug → group_id` lookup query before the main query | Fold the resolution into the main query via an extra CTE and detect "0 rows matched" after the fact | A pre-check query is simpler to unit-test in isolation (matches the existing `ExistsVisible`-before-main-query pattern already used for anime existence) and keeps the fail-closed 400 path outside the paginated statement entirely — consistent with the already-tested "foreign anime cursor must fail before SQL" pattern in `episode_version_public_integration_test.go` line 255-256. |

**Installation:** none (`npm install`/`go get` not required).

**Version verification:** `postgres:16` confirmed running (`docker compose ps`, container `team4sv30-db`, healthy). `pgx/v5` and `next@^16.1.6` unchanged from `backend/go.mod`/`frontend/package.json` — this phase does not touch dependency versions.

## Package Legitimacy Audit

**Not applicable** — this phase installs no external packages (no `npm install`, no `go get`). All building blocks (`pgx/v5`, native SQL, `window.history`, `@/components/ui`, the existing `useCancellableSlugState`/`AbortController` patterns) are already present in the repository.

## Architecture Patterns

### System Architecture Diagram

```
Browser (chip click / popstate)
   │
   ├─ window.history.pushState(?fansub=<slug>)   [D-07, no RSC reload]
   │
   └─ FansubVersionBrowser: fetch new first page
         │
         ▼
GET /api/v1/anime/{id}/episodes?projection=public&fansub=<slug>&limit=24[&cursor=...]
         │
         ▼
Handler (ListGroupedEpisodes, episode_version_reads.go)
   ├─ parseStrictNamedQuery(..., "fansub")        [additive allowlist entry]
   ├─ resolve slug -> group_id, scoped to animeID  [NEW small bounded query; 400 if slug foreign/unknown]
   └─ repository.PublicEpisodeOptions{ Cursor, Limit, GroupID *int64 }
         │
         ▼
EpisodeVersionRepository.ListPublicGroupedByAnimeID
   ├─ ExistsVisible(animeID)                       [unchanged; anime.status <> 'disabled']
   ├─ options.normalized(animeID, groupID)          [cursor v2 decode + GroupID-scope match, D-06]
   └─ publicEpisodeQuery(animeID, cursor..., limit, groupID)
         │
         ▼  (single SQL statement, one round trip)
   inventory CTE:
     episodes e
       INNER JOIN LATERAL ( fansub_releases -> release_versions -> release_variants
                             WHERE EXISTS(release_version_groups
                                          WHERE ... AND ($group IS NULL OR fansub_group_id=$group)) )
     -> window: COUNT/MIN(v.id) OVER (PARTITION BY e.id)   [now scoped to surviving/filtered rows, D-03]
   total CTE:  COUNT(DISTINCT episode_id) FROM inventory    [D-12 hit count, same statement]
   page CTE:   keyset WHERE (...) > cursor ORDER BY ... LIMIT n+1
   final SELECT: page JOIN LATERAL (groups per variant, unchanged) CROSS JOIN total
         │
         ▼
Response: { anime_id, episodes[], episode_count, pagination{has_more,next_cursor,row_limit} }
         │
         ▼
Browser: replace (not merge) episode list + pagination + episode_count for the new group [D-07/D-09]
```

### Recommended file-level delta (no new files required on the backend; one small addition recommended)

```
backend/internal/repository/episode_version_public_query.go   # cursor v2, GroupID field, SQL change (D-01..D-06, D-12)
backend/internal/repository/fansub_repository.go (or a small   # NEW: ResolveFansubGroupIDForAnime(ctx, animeID, slug)
  new method on EpisodeVersionRepository/AnimeRepository)       #      scoped slug->id lookup, fail-closed (D-05)
backend/internal/handlers/episode_version_reads.go             # additive "fansub" allowlist entry, wiring (D-04)
backend/internal/models/episode_version.go                     # PublicGroupedEpisodesData: + EpisodeCount field (D-12)
shared/contracts/openapi.yaml                                  # + fansub query param, + episode_count response field
frontend/src/types/episodeVersion.ts                            # + PublicGroupedEpisodesOptions.fansub?, + episode_count
frontend/src/lib/api.ts                                          # getGroupedEpisodes: forward fansub param
frontend/src/components/fansubs/FansubVersionBrowser.tsx        # group-switch triggers full refetch (D-07..D-10);
                                                                  #   remove noVersionHint + client-side group filter (D-15)
frontend/src/app/anime/[id]/page.tsx                             # pass resolved fansub slug into SSR getGroupedEpisodes call (D-11);
                                                                  #   remove/replace the anime.episodes fallback list (D-16)
```

### Pattern 1: EXISTS-based group filter inside the existing LATERAL (Ebene A + Ebene B in one predicate)

**What:** A single correlated `EXISTS` against `release_version_groups`, parameterized by a nullable group id, placed inside the LATERAL subquery that already restricts variants to a given episode.
**When to use:** Any time "does this row belong to filter X" must be enforced *before* a `LIMIT`/window-function step, to avoid both row multiplication and post-limit filtering bugs.
**Verified example (this exact shape, run live via `EXPLAIN (ANALYZE)` against `team4s_v2`, anime_id=4):**
```sql
-- Source: backend/internal/repository/episode_version_public_query.go (modified), verified live 2026-09-17
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
Live result for `$6 = 29` (AnimeOwnage) against Naruto: rows for episodes 1, 2, 5 only (3 episodes) — matches the real data inventory documented in `162-CONTEXT.md`/`163-CONTEXT.md` D-18 (AO has releases only on ep. 1, 2, 5-coop). Live result for `$6 = NULL` ("Alle"): episodes 1–5 (5 episodes; ep. 6–220 have zero group-having releases and correctly disappear). Both plans use `Nested Loop`/`Seq Scan` over the tiny fixture-scale tables (220 episodes, single-digit releases) — `release_version_groups` has its primary key on `(release_version_id, fansub_group_id)`, so at production scale (more releases per anime) the equality lookup inside `EXISTS` is index-backed and does not require a new index.

### Pattern 2: Cursor filter-scope binding (v1 → v2)

**What:** Add a `GroupID int64` field (`json:"g"`, `0` = "Alle") to `publicEpisodeCursor`, bump `Version` to `2`, and reject (`ErrValidation`) any cursor whose `GroupID` does not equal the group id resolved from the current request's `fansub` parameter.
**When to use:** Whenever a filter must be part of a keyset cursor's identity so stale/foreign cursors cannot silently return cross-filter data (D-06, Pflichtfall G).
**Why this "just works" with the existing strict-decode machinery:** `normalized()` already does `decoder.DisallowUnknownFields()` plus a canonical-JSON round-trip equality check (`bytes.Equal(raw, canonical)`). Adding a required field with no `omitempty` means any cursor issued under the old 4-field shape re-serializes to a *different* byte sequence (now including `"g":0` or `"g":<id>`) than what was decoded, and is rejected automatically — no separate "is this an old cursor" branch is needed. Explicitly compare `cursor.Version != 2` as well, for a clearer error path during the transition and in tests.
```go
// Source: backend/internal/repository/episode_version_public_query.go, extending the existing struct
type publicEpisodeCursor struct {
    Version       int   `json:"v"`
    AnimeID       int64 `json:"a"`
    GroupID       int64 `json:"g"` // 0 = "Alle" (no group filter)
    EpisodeNumber int32 `json:"n"`
    EpisodeID     int64 `json:"e"`
    VariantID     int64 `json:"i"`
}
// in normalized(): ... || cursor.Version != 2 || cursor.AnimeID != animeID || cursor.GroupID != requestGroupID || ...
```

### Pattern 3: D-12 hit count in the same statement (no extra query)

**What:** A `total` CTE computing `COUNT(DISTINCT episode_id)` over the already-materialized `inventory` CTE, cross-joined into the final `SELECT`.
**When to use:** Whenever a "total matches across all pages" number must accompany a paginated result without adding a round trip.
**Why it's free:** `inventory` (all matching episode/variant rows for the anime+filter, pre-`LIMIT`) is already fully materialized today to compute the existing `COUNT(v.id) OVER (PARTITION BY e.id)` window aggregates — this is visible in the live `EXPLAIN` baseline as "Subquery Scan on inventory ... rows=220" (unfiltered) / "rows=3" (AnimeOwnage-filtered). Postgres materializes a CTE referenced multiple times exactly once (confirmed in the live "after" `EXPLAIN`: `CTE inventory` computed once, then two separate `CTE Scan on inventory` nodes feed both `page` and `total`). `COUNT(DISTINCT ...)` is a **plain aggregate**, not a window function — Postgres rejects `DISTINCT` inside `OVER(...)`, so this must be a separate CTE/subquery, not an additional window column on `inventory` itself.
```sql
-- Source: episode_version_public_query.go (new), verified live: 5 distinct episodes for anime_id=4/"Alle"
, total AS ( SELECT COUNT(DISTINCT episode_id) AS n FROM inventory )
SELECT ... , total.n
FROM page p
LEFT JOIN LATERAL (...) g ON TRUE
CROSS JOIN total
```
Field name/placement is Claude's discretion per CONTEXT.md; recommend a new top-level `episode_count int64` (`json:"episode_count"`) on `PublicGroupedEpisodesData`, sibling to `pagination`, so the client can read it from every page response (including page 2+, satisfying D-12's "aktualisiert sich beim Gruppenwechsel ... Quelle ist die Client-Liste").

### Pattern 4: Slug → group id resolution, fail-closed (D-05)

**What:** Before running the main paginated query, resolve `fansub=<slug>` to a `fansub_group_id` scoped to `anime_fansub_groups` for this specific `animeID`. If the slug doesn't resolve (foreign group, typo, removed group), return `ErrValidation` (400) — same status/shape as the existing "cursor from a foreign anime" rejection, which is already tested to fail *before* the main SQL runs.
```sql
-- Source: new small query, modeled on FansubRepository.animeExists / ListAnimeFansubs's WHERE afg.anime_id=$1 pattern
SELECT fg.id FROM anime_fansub_groups afg
JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
WHERE afg.anime_id = $1 AND fg.slug = $2
```
This is one bounded, indexed (`anime_fansub_groups_pkey (anime_id, fansub_group_id)` + `idx_fansub_groups_slug` unique) lookup — O(1) regardless of anime/episode/version scale, and does not violate the "no N+1" contract (it runs exactly once per request, not per episode). Total query budget becomes: existence check (1) + slug resolution when `fansub` is present (0 or 1) + main statement (1) = 2 or 3, still constant per request. The frontend never actually needs to trigger the 400 path in normal operation, because Phase 162 D-02 already falls back to "Alle" for an invalid/foreign slug *before* it reaches this endpoint — this handler-side check is defense-in-depth for a manipulated/stale URL, and is exactly what Pflichtfall H needs to test.

### Anti-Patterns to Avoid

- **Filtering the group match only in the outer `page`/final `SELECT`:** would still require the window aggregates (`version_count`, `default_version_id`) to be computed over the *unfiltered* variant set, breaking D-03 (these must reflect only the filtered/matched variants).
- **A second request per group ("does group X have any episodes?") to decide the empty state (D-14):** unnecessary — the existing single paginated request already returns `episodes: []` plus (with Pattern 3) `episode_count: 0` for a group with no public releases; the frontend renders the empty-state text purely from that.
- **Reintroducing a client-side filter as a "double check" on top of the new server-side filter:** explicitly forbidden by D-15 (`noVersionHint`/`groupMatchedVersions`-style client filtering must be *removed*, not kept alongside the new server filter) and by §6 of the Auftrag.
- **`COUNT(DISTINCT x) OVER (...)`:** not valid Postgres syntax for window functions; use a separate CTE/aggregate (Pattern 3).

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| Cursor scope validation across filters | A second ad-hoc "does this cursor match the current filter" check bolted onto the handler | Extend the existing `publicEpisodeCursor` struct + its already-strict `normalized()` decode/canonicalize logic | The strict-decode machinery (DisallowUnknownFields + canonical re-marshal) already invalidates any cursor whose shape/fields don't match exactly; adding a required `GroupID` field gets scope-rejection "for free" |
| Abortable, last-write-wins refetch on group switch | A bespoke new state machine | The pattern already implemented in `FansubVersionBrowser.tsx`'s `loadMore` (`requestRef` AbortController ref + `{source, episodes, pagination}`/`{source, loading, error}` state pairs) | Already proven to satisfy "keep old data visible while loading" (D-08) and "only the last request may set state" (D-09); a second competing pattern (e.g. `useCancellableSlugState`) would duplicate the concept with different discard-on-loading semantics |
| Group-exists-for-anime validation | Trusting the client-supplied slug and letting a foreign group id silently return someone else's episodes | The existing `anime_fansub_groups`-scoped lookup pattern already used by `ListAnimeFansubs`/`animeExists` | Prevents an IDOR-style cross-anime data leak through a manipulated `fansub` parameter |

**Key insight:** every piece needed for this phase (strict cursor decoding, scoped existence checks, abortable last-write-wins client state, LATERAL+EXISTS filtering) already exists elsewhere in this exact file/component — the fix is almost entirely "apply the established pattern one level deeper," not new infrastructure.

## Common Pitfalls

### Pitfall 1: Forgetting that the LATERAL subquery's `EXISTS` must reference `rev.id`, not `rv.id`
**What goes wrong:** `release_version_groups.release_version_id` references `release_versions.id`, not `release_variants.id`. Writing `rvg.release_version_id = rv.id` (variant id) instead of `rev.id` (version id) silently returns zero matches for every row (column type/identity mismatch that Postgres will happily execute since both are `bigint`).
**Why it happens:** the LATERAL subquery aliases both `rev` (release_versions) and `rv` (release_variants) with very similar names, and the outer/window code also uses `v` for the whole subquery result.
**How to avoid:** copy the EXISTS predicate verbatim from the verified live query in Pattern 1; add a fixture-level regression test where a version has a variant but its `release_version_groups` row is deliberately mismatched to catch this class of bug (this is effectively Pflichtfall I).
**Warning signs:** the group filter appears to filter out *everything*, including groups that should legitimately match.

### Pitfall 2: Rewriting the existing integration test file additively instead of correcting its baseline expectations
**What goes wrong:** `backend/internal/repository/episode_version_public_integration_test.go`'s current fixture and assertions *encode the bug being fixed*. Specifically (verified by reading the fixture + current query semantics):
- Anime 1: episode 12 ("Neutral mixed", zero `fansub_releases` rows) and episode 13 ("Same number, another neutral episode", has a `release_versions` row but zero `release_variants`) currently appear in the response with empty `versions: []`. `TestEpisodeVersionPublicMixedAndIdentity` asserts `require.Len(t, page.Data.Episodes, 4)` including these two neutral rows. **After the fix, both must disappear entirely** — the correct assertion is `Len(..., 2)` (episodes 11 and 14 only).
- Anime 4 (in the isolated Go fixture, not to be confused with the live Naruto anime_id=4 in `team4s_v2`): episode 42 ("Neutral after many") has zero releases and currently produces a neutral row, counted into `TestEpisodeVersionPublicAtomicPages`'s `require.Len(t, seen, 126)` (125 real variant rows + 1 neutral row for ep. 42). After the fix this must become `125`, and `require.True(t, seen["42:0"])` must be replaced with an assertion that episode 42 is **absent**.
- Anime 5 ("Only neutral", episode 51, zero releases): `TestEpisodeVersionPublicEmptyAndVisibility` currently asserts `require.Len(t, neutral.Data.Episodes, 1)` with empty versions. After the fix this must become `require.Empty(t, neutral.Data.Episodes)` — this is the fixture-level equivalent of Pflichtfall A.
**Why it happens:** these tests were written to characterize the *current* (buggy) behavior, which the Auftrag explicitly requires changing.
**How to avoid:** per the mandatory TDD ordering, write the corrected expectations as new/modified RED assertions *before* touching `publicEpisodeQuery`, confirm they fail against the current code for the documented reason (neutral row present), then apply the SQL fix and watch them go GREEN. Do not leave the old assertions in place "for compatibility" — they assert incorrect behavior.
**Warning signs:** after implementing the SQL fix, `go test ./internal/repository/...` fails on exactly these three tests with row counts one-off from the fixed values above — that is the expected, intended failure signature confirming the fix is working; it is not a regression to chase down separately.

### Pitfall 3: Treating "no matching version" (Ebene B, within an already-visible episode) as still reachable in the public projection
**What goes wrong:** Because the fix removes the neutral row entirely, `hasNoMatchingVersion`/`noVersionHint` in `FansubVersionBrowser.tsx` becomes **dead code that can never trigger** for the public endpoint (an episode that reaches the client already has ≥1 matching version, by construction of the new query) — but only once §3/D-15 is also implemented. If the SQL fix ships without removing the client-side `groupMatchedVersions`/`noVersionHint` code, the two filters can disagree in edge cases during the transition (e.g., an episode/version whose display fields the client re-derives from cached/merged pages after a previous "Alle" load — see Pitfall 4) and produce a confusing empty state that shouldn't exist per §3 ("Folge 23 darf nicht als leere Karte stehen bleiben").
**Why it happens:** D-15 explicitly says "ersetzt, nicht parallel" — this is easy to under-scope as "add the backend filter" without also deleting the now-redundant client logic.
**How to avoid:** the backend and frontend changes should land together (or backend-first with the frontend still functionally identical since it was already filtering versions to the active group — just now redundantly); the *removal* of `noVersionHint`/`hasNoMatchingVersion`/`groupMatchedVersions` client filtering is itself a required deliverable (D-15), not an optional cleanup.

### Pitfall 4: `mergeEpisodes` silently reintroducing cross-filter data if group-switch is implemented as another "load more" call
**What goes wrong:** the existing `mergeEpisodes(current, incoming)` helper in `FansubVersionBrowser.tsx` is designed for *appending* pages of the *same* filter (`loadMore`). If a group switch is wired through the same code path without first fully discarding `inventory`/`loadState`, a stale AnimeOwnage version could get merged into a fresh Project Messiah page (via the `Map`-based merge-by-`episode_id`/`variant_id` dedup, which doesn't know about groups at all).
**Why it happens:** `loadMore` and "switch group and load page 1" look superficially similar (both call `getGroupedEpisodes` and update the same state shape).
**How to avoid:** on group switch, **replace** `inventory`/`loadState` wholesale (`setInventory({source: episodes, episodes: response.data.episodes, pagination: response.data.pagination})`, no `mergeEpisodes` call) — this matches D-07 ("Alte Liste und alter Cursor werden verworfen, nie gemergt") and is exactly Pflichtfall G.
**Warning signs:** switching AnimeOwnage → Project Messiah → Alle shows a version that shouldn't be visible in the current filter, or Naruto's coop episode 5 shows only one group's badge when it should show both.

## Code Examples

### Handler: additive `fansub` allowlist entry + resolution before the repository call
```go
// Source: backend/internal/handlers/episode_version_reads.go, extending the existing public branch
query, err = parseStrictNamedQuery(c.Request.URL.RawQuery,
    "projection", "limit", "cursor", "includeVersions", "includeFansubs", "fansub")
// ...
var groupID *int64
if slug := query.Get("fansub"); slug != "" {
    id, err := h.fansubRepo.ResolveFansubGroupIDForAnime(c.Request.Context(), animeID, slug) // new, small
    if errors.Is(err, repository.ErrNotFound) {
        badRequest(c, "unbekannte Fansub-Gruppe für diesen Anime")
        return
    }
    if err != nil { /* 500, existing pattern */ }
    groupID = &id
}
options := repository.PublicEpisodeOptions{Cursor: query.Get("cursor"), GroupID: groupID}
```

### Repository: parameter binding for the nullable group filter
```go
// Source: backend/internal/repository/episode_version_public_query.go
rows, err := r.db.Query(ctx, publicEpisodeQuery,
    animeID, cursor.EpisodeNumber, cursor.EpisodeID, cursor.VariantID, limit+1, options.GroupID) // *int64, nil -> SQL NULL
```
pgx binds a nil `*int64` as SQL `NULL` directly — no `sql.NullInt64` wrapper needed (already the pattern used elsewhere in this codebase for optional filters, e.g. `models.AnimeFilter.FansubGroupID *int64` in `anime.go`'s `buildAnimeListWhere`).

## State of the Art

| Old approach | Current/required approach | When changed | Impact |
|--------------|---------------------------|---------------|--------|
| `LEFT JOIN LATERAL` emitting a neutral row for episodes without variants | `INNER JOIN LATERAL` with the group/visibility `EXISTS` predicate inline | This phase | Episodes without a public (optionally group-matching) version disappear entirely from the public projection, per D-01/§1/§2/§3 |
| Group filtering entirely client-side, over already-loaded pages | Group filtering server-side, inside the paginated SQL statement | This phase | Fixes the exact pagination-scope bug in §6 (AnimeOwnage releases only on page 2+ would previously show "no episodes") |
| Cursor v1 (anime + episode/variant position only) | Cursor v2 (adds group scope) | This phase | A cursor obtained under one filter is now provably rejected under another (D-06) |
| `Episoden (N)` = `anime.episodes.length` (anime's total episode count) | New `episode_count` field = count of currently-visible (filtered) episodes, computed in the same statement | This phase | Matches §9's distinction between "Anime-Gesamtzahl" (stays on the poster, unrelated field) and "aktuell sichtbare Episoden mit Releases" (the new field) |

**Deprecated/outdated:**
- `FansubVersionBrowser.tsx`'s `hasNoMatchingVersion`/`noVersionHint`/`groupMatchedVersions` client-side filtering: superseded by the server-side filter; must be removed per D-15, not kept as a fallback.
- `page.tsx`'s `anime.episodes`-based fallback list (rendered when `groupedEpisodesResponse` is null): per D-16 this must stop rendering episodes without releases; replace with a neutral error state.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Recommended field name `episode_count` (top-level on `PublicGroupedEpisodesData`) for the D-12 hit count is not yet settled with the Auftraggeber/UI — CONTEXT.md explicitly leaves the field name to Claude's discretion. | Pattern 3, State of the Art | Low — purely a naming choice; renaming before shipping is a one-line change with no behavioral impact, and OpenAPI/TS/Go stay trivially in sync either way. |
| A2 | Recommended fail-closed behavior for an unknown/foreign `fansub` slug is HTTP 400 (`ErrValidation`), not an empty 200 list. CONTEXT.md D-05 explicitly leaves this choice ("Validierungsfehler oder leere Liste – Planner entscheidet") to the planner; this research recommends 400 for consistency with the already-tested foreign-anime-cursor-rejection pattern, but it is not a hard requirement from the Auftrag. | Pattern 4 | Low — either choice is fail-closed and testable; a later change from 400 to empty-200 (or vice versa) only touches one `errors.Is` branch and one test assertion. |
| A3 | `useCancellableSlugState` is judged unsuitable for the group-switch refetch because it discards `data` while `status==='loading'`. This is based on reading the hook's source once; it has not been executed against a live consumer to double-check whether any wrapping component in the existing codebase already works around this to preserve "old data visible while loading." | Standard Stack (Alternatives), Don't Hand-Roll | Low — worst case the planner re-evaluates this hook and finds a workaround pattern already in use elsewhere (e.g. `GroupRolesTab.tsx`'s "3-state derivation" mentioned in STATE.md); either way the component's own existing `AbortController`/`{source,...}` pattern remains a safe, already-proven fallback. |

**If this table is empty:** N/A — three low-risk naming/discretion items are logged above; no claim here needs user confirmation to become a locked decision (D-01..D-19 already lock the substantive behavior).

## Open Questions

1. **Exact response placement of the D-12 hit count**
   - What we know: it must be in the same SQL statement (no extra query), and the client must be able to read it from every page response, not just page 1 (D-12).
   - What's unclear: whether it belongs on `PublicGroupedEpisodesData` (sibling to `pagination`) or nested inside `pagination` itself.
   - Recommendation: planner picks one; both are equally cheap. This research recommends top-level `episode_count` for symmetry with `anime_id`/`episodes`.

2. **HTTP status for a `fansub` slug that is syntactically valid but currently has zero anime associations at all vs. one that belongs to a *different* anime**
   - What we know: both must fail closed per D-05; the live data currently has no anime with zero groups combined with a non-empty `fansub` param in practice, since Phase 162's frontend never sends an invalid slug.
   - What's unclear: whether the Auftraggeber wants these two cases (typo vs. cross-anime) distinguished in the error message.
   - Recommendation: treat both identically (400, same generic message) — matches the existing `badRequest(c, "ungültige Episodenoptionen")`-style generic error messages elsewhere in this handler; this is a defense-in-depth path the normal UI never triggers per 162 D-02.

3. **Whether `FansubGroupPicker`/`FansubGroupContext` need to react to the new `episode_count` for their own display, or only the "Episoden (N)" heading in `page.tsx` does**
   - What we know: D-12 only mentions the heading, and D-13 (badge "+N Versionen") is explicitly `version_count`-derived (already correct via D-03), not `episode_count`-derived.
   - What's unclear: nothing beyond wiring — this is a plan-time detail, not a research gap.
   - Recommendation: only `page.tsx`'s heading and `FansubVersionBrowser.tsx`'s client-held count (post group-switch) need `episode_count`; no other component needs it.

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|------------|--------------|-----------|---------|----------|
| PostgreSQL (`team4sv30-db`) | Live EXPLAIN baseline, all backend integration tests | ✓ (confirmed via `docker exec`, healthy) | 16 | — |
| Backend container (`team4sv30-backend`) | Live HTTP verification of current bug (§ Summary) | ✓ (confirmed via `curl 127.0.0.1:18092`) | Go 1.25 per `go.mod` | — |
| Frontend container (`team4sv30-frontend`) | Browser-UAT (D-19, deferred to execution phase) | ✓ (running, port 3000) | Next.js ^16.1.6 | — |
| `go test ./...` | Backend regression | not run in this research session (read-only investigation only, per operational constraint) | — | Planner's first executor task must run the full suite before touching code, to capture the pre-fix baseline pass/fail count |
| `npm run test` / `typecheck` / `lint` / `build` (frontend) | Frontend regression | not run in this research session | — | Same as above — capture baseline first |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — the two "not run" items above are deliberate research-time restraint (no code was touched, no test run needed to answer "what do I need to know to plan"), not missing tooling; the planner's first task should establish these baselines.

## Validation Architecture

### Test framework

| Property | Value |
|----------|-------|
| Backend framework | Go `testing` + `testify/require`, Postgres integration tests via `testsupport.OpenPhase117Postgres` (isolated schema/search_path, never `DATABASE_URL`) |
| Backend config file | none (table-driven fixtures inline in `_test.go` files) |
| Backend quick run | `go test ./internal/repository/... -run TestEpisodeVersionPublic` |
| Backend full suite | `go test ./...` |
| Frontend framework | Vitest 3 (`vitest run`), React Testing Library conventions (per `FansubVersionBrowser.test.tsx`) |
| Frontend config file | `frontend/vitest.config.ts` |
| Frontend quick run | `npx vitest run FansubVersionBrowser` / `npx vitest run page.test.tsx` (in `frontend/src/app/anime/[id]/`) |
| Frontend full suite | `npm run test` (== `vitest run`) |

### Phase requirements (§15 Pflichtfälle A–J) → test map

| Pflichtfall | Behavior | Test type | Automated command | File exists? |
|---|---|---|---|---|
| A | Episode without any release invisible in "Alle" | Postgres integration | `go test ./internal/repository/... -run TestEpisodeVersionPublicEmptyAndVisibility` | ✅ (needs corrected expectation, Pitfall 2) |
| B | Episode with one group: visible/hidden per filter | Postgres integration | `go test ./internal/repository/... -run TestEpisodeVersionPublicGroupFilter` (new) | ❌ Wave 0 |
| C | Two separate versions (AO/PM): correct set per filter | Postgres integration | same new test file | ❌ Wave 0 |
| D | Coop version visible/present at both group filters | Postgres integration | same new test file | ❌ Wave 0 |
| E | Naruto-style "only PM" episode invisible under AO | Postgres integration (fixture-level regression of the real Naruto shape, per D-18) | same new test file | ❌ Wave 0 |
| F | Pagination-scope: matches only on page 2+ still found | Postgres integration | same new test file (fixture needs episodes 1..N with the matching group only beyond page 1) | ❌ Wave 0 |
| G | Filter switch Alle→AO→PM→Alle: no mixed pagination data | Frontend (Vitest) | `npx vitest run FansubVersionBrowser` (new cases) | ✅ file exists, needs new cases |
| H | Invalid group filter: 162 fallback respected | Frontend (invalid slug never reaches backend) + Backend (defense-in-depth 400) | both suites, new cases | ❌ Wave 0 (backend case) / ✅ (frontend, extend existing) |
| I | Non-public version (variant without any group) doesn't make episode visible | Postgres integration | same new test file (mirrors existing "No variant" fixture pattern, extended with a group-less variant) | ❌ Wave 0 |
| J | No query-per-episode structure (performance) | Postgres integration (query tracer) | reuse `assertPublicBudget`/`episodePublicTracer` already in the test file | ✅ infra exists, needs assertion update for the +1 slug-resolution query when `fansub` is set |

### Sampling rate
- **Per task commit:** targeted `go test ./internal/repository/... -run TestEpisodeVersionPublic` and/or `npx vitest run FansubVersionBrowser`
- **Per wave merge:** full `go test ./...` and `npm run test`, plus `npm run typecheck` and `npm run lint`
- **Phase gate:** full suite green (documented against the pre-fix baseline counts) before `/gsd:verify-work`; live `EXPLAIN (ANALYZE)` after-fix comparison against the before-baseline captured in this research (see Summary)

### Wave 0 gaps
- [ ] New backend test file (or a new `Test...GroupFilter` function appended to `episode_version_public_integration_test.go`, mind the file's current 356 lines + CLAUDE.md's 450-line cap — likely needs a **new** file, e.g. `episode_version_public_group_filter_test.go`) covering Pflichtfälle B, C, D, E, F, I, plus the updated J assertion
- [ ] Fixture data for Pflichtfall F (pagination-scope leak): needs an anime with ≥25 episodes where the filtered group's only matching episode is on page 2 (reuse the existing anime 4 "Large release" 125-variant fixture shape, or add a dedicated small one)
- [ ] Fixture data for Pflichtfall I (non-public version): a `release_versions` row with a `release_variants` row but **zero** `release_version_groups` rows — currently no such row exists in the fixture (the existing "No variant" fixture, id 13, has zero variants, which is a different case)
- [ ] Backend: capture the **pre-fix** full `go test ./...` pass/fail baseline as the first executor task (per the operational note that a known-disabled test `TestFansubRepository_PublicProfileSourceInvariants` and unrelated CSS-guard frontend failures already exist per `STATE.md` — the new work must diff against this, not chase pre-existing failures)
- [ ] Frontend: new Vitest cases in `FansubVersionBrowser.test.tsx` for D-07..D-10 (group switch discards old cursor, dims old list, aborts in-flight requests, retry button) and removal of the existing `'Keine Version dieser Gruppe verfügbar.'` assertion (line 82) once D-15 removes that code path
- [ ] Frontend: `page.test.tsx` updates for D-11 (SSR fetch includes `fansub`) and D-16 (fallback list no longer renders unreleased episodes)

## Security Domain

### Applicable ASVS categories

| ASVS category | Applies | Standard control |
|---|---|---|
| V2 Authentication | No | Endpoint is public, unauthenticated by design (unchanged) |
| V3 Session Management | No | No session state involved |
| V4 Access Control | Yes | Fail-closed group/version visibility (D-01, D-02, D-05): a version without ≥1 `release_version_groups` row must never make an episode visible; a `fansub` slug foreign to the requested anime must never leak that other anime's group's episodes — resolved via the anime-scoped lookup in Pattern 4 |
| V5 Input Validation | Yes | `fansub` slug validated against `anime_fansub_groups` for the specific `animeID` (not a global lookup); cursor `GroupID` scope-checked against the resolved current filter (Pattern 2); existing `parseStrictNamedQuery` allowlist extended, not loosened |
| V6 Cryptography | No | Cursor remains an opaque base64 JSON blob, not a security boundary (already the existing pattern; no new crypto surface) |

### Known threat patterns for this stack

| Pattern | STRIDE | Standard mitigation |
|---|---|---|
| IDOR via cross-anime group id in `fansub` param (e.g. a group that belongs to a different anime) | Information Disclosure | Anime-scoped `anime_fansub_groups` lookup (Pattern 4) rather than a bare `fansub_groups` slug lookup |
| Cursor replay across filters (using an AnimeOwnage-scoped cursor while `fansub` is now unset or a different group) to smuggle out-of-filter rows | Tampering / Information Disclosure | Cursor `GroupID` scope check (Pattern 2), already covered by the existing strict-decode+canonicalize machinery |
| Non-public (group-less) release version surfaced through the episode's "any variant" check | Information Disclosure | The `EXISTS (... release_version_groups ...)` predicate is now unconditional (applies even for "Alle"), not just when a specific group filter is active — this is the D-02 fail-closed requirement and doubles as the ASVS V4 control |

## Sources

### Primary (HIGH confidence — live, read-only verification against `team4s_v2`, 2026-09-17)
- `docker exec team4sv30-db psql ...` — live schema inspection (`\d fansub_groups`, `\d release_version_groups`, `\d anime_fansub_groups`) confirming `release_version_groups` is a pure many-to-many join table (composite PK `(release_version_id, fansub_group_id)`, no primary-group column) — matches CONTEXT.md D-01/D-02's "keine Primärgruppe" claim.
- `docker exec team4sv30-db psql ... EXPLAIN (ANALYZE, BUFFERS)` — "before" baseline for `publicEpisodeQuery` (anime_id=4/Naruto, 220 episodes, 1.226ms, 220-row inventory scan) and "after" comparison for the proposed fix (AnimeOwnage-filtered: 3 rows/1.08-1.22ms; "Alle": 5 rows/1.22-1.51ms) — all captured in this session, read-only, no writes.
- `curl http://127.0.0.1:18092/api/v1/anime/4/episodes?projection=public&limit=24` (live backend container) — confirmed the current response includes episode 75 (episode_number 23, `version_count: 0`) unfiltered, i.e. the exact neutral-row bug live in production data, matching D-18's real-data description (Naruto ep. 23 currently has no release at all; the *illustrative* bug in the Auftrag's episode-23 example maps onto the real ep. 3/4 (PM-only) and ep. 1/2 (AO-only) pairs).
- `curl http://127.0.0.1:18092/api/v1/anime/4/fansubs` — confirmed live `story_preview` field from Phase 162 and the two real group slugs (`animeownage` id 29, `project-messiah` id 30) used throughout this research's live queries.

### Secondary (MEDIUM confidence — read from repository source, cross-checked against live behavior above)
- `backend/internal/repository/episode_version_public_query.go` — current `publicEpisodeQuery`, `PublicEpisodeOptions`, `publicEpisodeCursor` (v1), `ListPublicGroupedByAnimeID`.
- `backend/internal/handlers/episode_version_reads.go` — current `parseStrictNamedQuery` allowlist for the public projection.
- `backend/internal/repository/episode_version_public_integration_test.go` — existing fixture and assertions; cross-checked against the live query semantics to derive the exact pre/post-fix expectation deltas documented in Pitfall 2.
- `backend/internal/repository/anime.go` — `ExistsVisible` (the only existing public visibility gate; unrelated to group filtering, confirmed unchanged).
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx`, `FansubGroupPicker.tsx`, `FansubGroupContext.tsx` — current client-side filter/refetch/dimming logic.
- `frontend/src/app/anime/[id]/page.tsx` — current SSR fetch (`limit: 24`, no `fansub` param yet), `episodeCount = anime.episodes.length`, and the `anime.episodes`-based fallback list.
- `frontend/src/hooks/useCancellableSlugState.ts` — evaluated as an alternative for the group-switch refetch (see Standard Stack Alternatives).
- `.planning/phases/162-.../162-RESEARCH.md` — the `window.history.pushState` vs. `router.push` rationale this phase's D-07 continuation depends on.
- `.planning/phases/163-.../163-CONTEXT.md`, `163-USER-REQUEST.md` — D-01..D-19, §1–§17, Pflichtfälle A–J (this research treats these as locked scope, not alternatives to explore).

### Tertiary (LOW confidence)
- None used — every claim in this research is either directly read from repository source or verified live against the running dev stack.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; every building block already lives in this exact codebase area.
- Architecture / SQL fix shape: HIGH — the proposed `INNER JOIN LATERAL` + `EXISTS` change was executed live via `EXPLAIN (ANALYZE)` against the real dev database for both the group-filtered and "Alle" cases, with results cross-checked against the real Naruto data documented in CONTEXT.md D-18.
- Pitfalls (existing test file breakage): HIGH — derived from reading the actual fixture SQL inserts and the actual current query semantics side by side; the specific row-count deltas (4→2, 126→125, 1→0) are arithmetic consequences of the documented fixture data, not speculation.
- Security domain: MEDIUM — ASVS mapping is standard reasoning for a public read endpoint; no live penetration test was performed (out of scope for research).

**Research date:** 2026-09-17
**Valid until:** 2026-10-17 (30 days; schema/query shape is stable, but re-verify live EXPLAIN numbers if the anime/release dataset changes materially before execution)
