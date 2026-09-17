---
phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern
reviewed: 2026-09-17T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - backend/internal/handlers/episode_version_reads.go
  - backend/internal/models/episode_version.go
  - backend/internal/repository/episode_version_public_group_filter_test.go
  - backend/internal/repository/episode_version_public_integration_test.go
  - backend/internal/repository/episode_version_public_query.go
  - backend/internal/repository/fansub_repository.go
  - frontend/src/app/anime/[id]/page.performance.test.ts
  - frontend/src/app/anime/[id]/page.test.tsx
  - frontend/src/app/anime/[id]/page.tsx
  - frontend/src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx
  - frontend/src/components/fansubs/FansubVersionBrowser.module.css
  - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
  - frontend/src/components/fansubs/FansubVersionBrowser.tsx
  - frontend/src/lib/api.episode-versions.test.ts
  - frontend/src/lib/api.ts
  - frontend/src/lib/fansub-summary.test.ts
  - frontend/src/lib/fansub-summary.ts
  - frontend/src/types/episodeVersion.ts
  - shared/contracts/openapi.yaml
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 163: Code Review Report

**Reviewed:** 2026-09-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

This phase adds a fansub-group filter to the public grouped-episodes endpoint
(`GET /api/v1/anime/{id}/episodes?projection=public&fansub=...`), plus the
matching client-side group switcher (`FansubVersionBrowser`) and a per-filter
`episode_count`. The IDOR mitigation (anime-scoped slug resolution via
`ResolveFansubGroupIDForAnime`) is sound and well covered by
`episode_version_public_group_filter_test.go` (cross-anime slug rejection,
pagination-scope, cursor-scope, coop-version exposure). No SQL injection,
hardcoded secrets, or dangerous-function usage was found; parameterization is
correct throughout, and the German-text/umlaut convention is respected in all
user-facing strings.

Two real logic defects were found, both in the backend read path, neither
exercised by the existing test suite:

1. The handler resolves the `fansub` slug *before* checking whether the
   target anime exists/is visible, so a missing or disabled anime combined
   with the `fansub` query parameter returns the wrong HTTP status/message
   (400 "unbekannte Fansub-Gruppe" instead of 404 "anime nicht gefunden").
2. `episode_count` can silently report `0` even when the filtered total is
   non-zero, because the total is only visible through a `CROSS JOIN` against
   the (already keyset-limited) `page` result set; if `page` ever returns
   zero rows while `total` is non-zero, the Go code's zero-row fallback
   reports an incorrect count of 0.

Both are edge cases (missing/disabled anime + filter; a keyset cursor that
lands exactly on/after the last matching row) rather than mainline breakage,
but they are untested and contradict the documented "fail closed" / accurate
`episode_count` intent of this phase (D-05, D-06, D-12).

## Warnings

### WR-01: Fansub slug resolution runs before the anime existence/visibility check, causing a wrong status code for missing/disabled anime

**File:** `backend/internal/handlers/episode_version_reads.go:65-77`
**Issue:**
In `ListGroupedEpisodes`, when `options.Fansub != ""` the handler calls
`h.fansubRepo.ResolveFansubGroupIDForAnime(ctx, animeID, options.Fansub)`
immediately, and only afterwards calls
`h.episodeVersionRepo.ListPublicGroupedByAnimeID`, whose *first* action is
`NewAnimeRepository(r.db).ExistsVisible(ctx, animeID)`
(`backend/internal/repository/episode_version_public_query.go:136-142`,
`backend/internal/repository/anime.go:28-38`).

`ResolveFansubGroupIDForAnime`'s query
(`backend/internal/repository/fansub_repository.go:1491-1506`) does not check
anime visibility at all — it just joins `anime_fansub_groups`/`fansub_groups`
on `anime_id = $1 AND slug = $2`. For an anime id that does not exist, or one
that exists but has `status = 'disabled'`, this join produces zero rows
whenever the caller doesn't happen to also know the exact linked group slug,
so `ResolveFansubGroupIDForAnime` returns `ErrNotFound` and the handler
responds `400 {"unbekannte Fansub-Gruppe für diesen Anime"}` — never
reaching the `ExistsVisible` check that would have produced the correct
`404 {"anime nicht gefunden"}`.

Consequence: for the exact same (disabled or non-existent) `animeID`, the
response status/message now differs depending on whether the caller's
`fansub` slug happens to be one that is actually linked to that anime (400 vs
404 for a wrong/typo'd slug, but 404 once the caller supplies a slug that
really is linked) — an inconsistent contract, and a minor oracle for probing
whether a given slug is linked to a hidden/disabled anime. This exact
combination (fansub filter + missing/disabled anime) has no test coverage;
`episode_version_public_group_filter_test.go`'s
`TestEpisodeVersionPublicGroupFilterUnknownSlug` only exercises an unknown
slug against an *existing, visible* anime (id 7), and
`episode_version_public_integration_test.go`'s
`TestEpisodeVersionPublicEmptyAndVisibility` only exercises missing/disabled
anime *without* the `fansub` parameter.

**Fix:** Check anime visibility before resolving the slug, e.g.:
```go
exists, err := h.animeRepo.ExistsVisible(c.Request.Context(), animeID) // or a shared repo method
if err != nil {
    log.Printf("grouped episodes list: anime visibility check error (anime_id=%d): %v", animeID, err)
    c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
    return
}
if !exists {
    c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "anime nicht gefunden"}})
    return
}
if options.Fansub != "" {
    groupID, resolveErr := h.fansubRepo.ResolveFansubGroupIDForAnime(c.Request.Context(), animeID, options.Fansub)
    // ... unchanged
}
```
(`ListPublicGroupedByAnimeID`'s own `ExistsVisible` call becomes a harmless
second check and can stay for defense in depth.) Add a test mirroring
`TestEpisodeVersionPublicGroupFilterUnknownSlug` but against a disabled or
non-existent anime id with `fansub` set, asserting 404, not 400.

### WR-02: `episode_count` can report 0 for a non-empty filtered total when the requested page itself returns zero rows

**File:** `backend/internal/repository/episode_version_public_query.go:102-121,177-180`
**Issue:**
`total` is computed once from the full (unpaginated) `inventory` CTE
(`SELECT COUNT(DISTINCT episode_id) AS n FROM inventory`), but it is only
surfaced to the caller by `CROSS JOIN total` against the *already
keyset-limited* `page` CTE in the final `SELECT`. Because this is an
(implicit inner) `CROSS JOIN`, if `page` returns zero rows the entire
statement returns zero rows too — including the `total.n` value that would
otherwise still be non-zero. Go then falls back to:
```go
var episodeCount int64
if len(items) > 0 {
    episodeCount = items[0].episodeCount
}
```
which silently reports `episode_count: 0` in that situation, even though the
filter actually matches N>0 episodes elsewhere in the (already-consumed)
result set. This can happen whenever a keyset cursor lands on/after the last
matching row while the filter's total is still positive (e.g. a stale
`next_cursor` reused after data changed, or any future caller that does not
strictly gate `loadMore()` on `has_more`). It is untested: none of the
pagination tests in `episode_version_public_integration_test.go` or
`episode_version_public_group_filter_test.go` exercise a request whose
`page` CTE returns zero rows while the filtered total is non-zero.

**Fix:** Decouple `total` from `page` so it is always returned regardless of
whether `page` has rows, e.g. compute it as a scalar subquery in the outer
`SELECT` instead of a `CROSS JOIN`:
```sql
SELECT p.episode_id, ..., COALESCE(g.groups,'[]'::json),
 (SELECT n FROM total) AS episode_count
FROM page p
LEFT JOIN LATERAL (...) g ON TRUE
ORDER BY ...
```
or issue `total` as a separate, always-executed query (mirroring how
`ExistsVisible` is already a separate round trip) and pass its value through
independently of whether `items` ends up empty.

## Info

### IN-01: Stale comment describing "neutral row" lateral-join behavior no longer matches the query

**File:** `backend/internal/repository/episode_version_public_query.go:74-76`
**Issue:** The comment directly above `publicEpisodeQuery` states: *"The
lateral variant relation yields one neutral row when an episode has no
variants, including mixed inventory."* This phase's diff changed the join
from `LEFT JOIN LATERAL (...) v ON TRUE` to a plain (inner) `JOIN LATERAL
(...) v ON TRUE` in order to push the new group-`EXISTS` filter into the
lateral subquery. With a *inner* lateral join, an episode whose lateral
subquery returns zero rows (no matching public version, or none matching the
active group filter) is dropped from the result set entirely — it does
**not** produce a "neutral row" anymore. This is exactly the behavior the new
tests assert (`"episodes without any public release (12, 13) must disappear
entirely after the fix"`, `TestEpisodeVersionPublicGroupFilterNonPublicVersion`),
so the code is correct, but the comment documenting *why* is now inaccurate
and will mislead the next person touching this query into assuming a
`LEFT JOIN` semantics that no longer exists.

**Fix:** Update the comment, e.g.: *"The lateral variant relation is an
inner join: an episode with zero matching (group-filtered) public variants
is dropped entirely, never emitted as a neutral row. Group aggregation
happens after LIMIT and cannot multiply atomic page rows."*

### IN-02: Dead defensive branch — `item.variantID` can no longer be nil in the public projection

**File:** `backend/internal/repository/episode_version_public_query.go:157-166`
**Issue:** `if item.variantID != nil { ... }` guards the variant-hydration
block (`v.ID = *item.variantID`, `json.Unmarshal(groups, &v.FansubGroups)`,
etc.). This nil-guard pattern is inherited from the admin projection query
where a `LEFT JOIN LATERAL` can legitimately produce a neutral row with a
`NULL` variant id. After the change described in IN-01 (inner `JOIN
LATERAL`), every row returned by `publicEpisodeQuery` is guaranteed to have a
non-null `variant_id` (the lateral subquery cannot match with zero rows and
still be joined), so this branch is now always true and the `else` path
(implicitly: leave `item.variant` zero-valued) is unreachable. Harmless, but
it is dead/misleading code that obscures the actual invariant of the public
query.

**Fix:** Either remove the nil check (scan directly into a non-pointer
`variantID int64`/`releaseVersionID int64`) or add a comment explaining that
the guard is now unreachable-by-construction and kept only for scan-type
symmetry with the shared row struct.

---

_Reviewed: 2026-09-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
