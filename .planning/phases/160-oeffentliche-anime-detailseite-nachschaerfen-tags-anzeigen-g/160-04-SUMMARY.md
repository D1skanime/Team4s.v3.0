---
phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g
plan: 04
subsystem: api
tags: [go, gin, pgx, postgres, search, i18n, sql]

# Dependency graph
requires:
  - phase: 160-01
    provides: "tag_names / genre_names tables (migration 0168), German-name resolution pattern"
provides:
  - "GET /api/v1/search accepts tag/genre-only requests without q (D-08), additive only for tag/genre"
  - "Search tag/genre filter matches any language name via genre_names/tag_names, not just the base name (D-10)"
  - "Fansub branch returns an explicit empty result instead of every fansub group when a q-less request reaches it (Pitfall 1 fix)"
affects: [160-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive validation-gate bypass: parse dependent filters (genre/tag) BEFORE the required-field gate so the gate can inspect them, instead of an early unconditional return"
    - "Reuse a single $n bind parameter for a base-name AND a joined language-name comparison inside one EXISTS, avoiding a second SQL injection surface or argPos bump"
    - "Explicit-empty-result short-circuit ahead of a query builder known to degrade to 'match everything' on an empty predicate, rather than patching the builder itself"

key-files:
  created:
    - backend/internal/handlers/search_bypass_integration_test.go
  modified:
    - backend/internal/handlers/search.go
    - backend/internal/handlers/search_test.go
    - backend/internal/repository/search_anime.go
    - backend/internal/repository/search_repository.go
    - backend/internal/repository/search_repository_test.go

key-decisions:
  - "D-08 bypass is narrow: only a truly ABSENT q (after trim) skips the length gate; a PRESENT-but-too-short q (e.g. ?tag=Amnesia&q=a) still 400s, resolving 160-RESEARCH.md Open Question 1 as planned"
  - "Pitfall 1 fixed at the Search() dispatch level (skip searchFansub entirely when query.Q==\"\"), not inside buildSearchFansubQuery — search_fansub.go stays byte-identical, confirmed via git diff"
  - "genre_names/tag_names EXISTS reuses the SAME $n bind parameter as the base-name comparison — no new argPos, no new bind slot, no new injection surface"

patterns-established:
  - "When an additive validation exception depends on other query parameters, parse those parameters before the gate that decides the 400, not after — mirrors 160-RESEARCH.md Pitfall 3's documented ordering fix"

requirements-completed: []

# Metrics
duration: ~45min
completed: 2026-09-16
---

# Phase 160 Plan 04: Nur-Filter-Suche (Layer 2, D-08/D-09/D-10/D-11) Summary

**`/api/v1/search` now accepts `tag`/`genre`-only requests without `q`, matches tag/genre filters against any language name via `genre_names`/`tag_names`, and explicitly empties the fansub branch instead of leaking the full `fansub_groups` list when no query term narrows it — all three proven live against a rebuilt backend and real `team4s_v2` production data, not just tests.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-09-16
- **Tasks:** 2/2 completed
- **Files modified:** 6 (1 created, 5 modified) + 1 phase-tracking doc (`deferred-items.md`)

## Accomplishments
- `search.go`: `genre`/`tag` are now parsed BEFORE the `q`-required gate; a new `searchQueryBypassAllowed(q, genre, tag)` predicate skips the 400 only when `q` is truly absent (empty after trim) and `tag` or `genre` is set — `parseSearchQueryTerm` now returns the trimmed-but-short value instead of discarding it, so "absent" and "present-but-short" are distinguishable
- `search_anime.go`: the genre and tag `EXISTS` filter conditions now also check `genre_names`/`tag_names` (any language, case-insensitive), sharing the same `$n` bind parameter as the base-name comparison
- `search_repository.go`: `Search()` no longer unconditionally calls `searchFansub` when the fansub branch is selected — a `query.Q == ""` request now short-circuits to an explicit `models.SearchEntityResult{Items: []models.SearchResultItem{}, Total: 0}` instead of falling through to `buildSearchFansubQuery`'s empty-WHERE "match everything" behavior; `search_fansub.go` itself is untouched (verified via `git diff`)
- New `search_bypass_integration_test.go` (real isolated-schema Postgres, `package handlers`) proves D-08 + D-10 together end-to-end: a tag search with no `q` finds an anime whose tag ONLY has a German `tag_names` translation (base tag name "Demon" ≠ German "Dämon")
- Live-verified against the rebuilt `team4sv30-backend` container and real `team4s_v2` data (4 real fansub groups on disk): `type=alle&tag=Amnesia` (no `q`) and `type=fansub&tag=Amnesia` (no `q`) both return `fansub: {"items": [], "total": 0}` despite those 4 groups existing — not the pre-fix "leak everything" behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Additive q-required bypass in the search handler (D-08)** - `32c5c83b` (feat)
2. **Task 2: Multi-language tag/genre match (D-10) + fansub empty-WHERE fix (Pitfall 1), proven end-to-end** - `530daf2e` (feat)

_TDD note: as in 160-01, both tasks' tests and implementation landed in a single commit per task after interactively confirming RED (tests failing against the pre-change code) before writing the fix, rather than as a separate committed `test(...)` commit — the plan's `<behavior>`/`<action>` blocks specify test and implementation together per task, and this plan's frontmatter `type` is `execute`, not `tdd`, so the plan-level RED/GREEN commit-gate enforcement does not apply._

**Plan metadata:** (this commit, to follow)

## Files Created/Modified
- `backend/internal/handlers/search.go` - genre/tag parsed before the q-required gate; new `searchQueryBypassAllowed`; `parseSearchQueryTerm` returns the trimmed-but-short value instead of `""`
- `backend/internal/handlers/search_test.go` - pure predicate table test, present-but-short-with-tag-still-400 regression, and a 5-case table (format/status/year_from/year_to/fansub_group-only) proving the bypass is additive ONLY for tag/genre
- `backend/internal/repository/search_anime.go` - genre/tag `EXISTS` conditions extended with `genre_names`/`tag_names` sub-`EXISTS`, same shared bind parameter
- `backend/internal/repository/search_repository.go` - `Search()`'s fansub dispatch gated on `query.Q != ""`; explicit empty result otherwise
- `backend/internal/repository/search_repository_test.go` - `TestSearchAnimeGenreMatchesLanguageName`/`TestSearchAnimeTagMatchesLanguageName` pure builder-string tests
- `backend/internal/handlers/search_bypass_integration_test.go` - new real-Postgres integration suite (6 tests) covering D-08, D-10, and Pitfall 1 end-to-end
- `.planning/phases/160-.../deferred-items.md` - logs one pre-existing, out-of-scope bug found during live verification (see Issues Encountered)

## Decisions Made
- Narrow D-08 reading confirmed: only a truly absent `q` bypasses the length gate; `?tag=Amnesia&q=a` still 400s (RESEARCH.md Open Question 1, resolved as recommended).
- Pitfall 1 fixed at the `Search()` dispatch level rather than inside `buildSearchFansubQuery`, keeping `search_fansub.go` byte-identical and the fix scoped to exactly the "no q reaches the fansub branch" case, per CONTEXT.md's discretion note ("Fansub-Teil leer, keine Fehlermeldung").
- `genre_names`/`tag_names` matching reuses the single existing `$n` bind parameter for both the base-name and language-name comparison — no new argument position, no new injection surface (matches threat register T-160-09's "accept" disposition).

## Deviations from Plan

None — plan executed exactly as written. The plan's own acceptance criteria (bypass predicate, ordering, `EXISTS` extension, dispatch-level Pitfall-1 fix, byte-identical `search_fansub.go`) were met without any Rule 1-4 auto-fixes. The additional handler-level `format`/`status`/`year_from`/`year_to`/`fansub_group` table test and the two dedicated `type=alle`/`type=fansub` empty-fansub integration tests are Auftraggeber-Mandat Punkt 3 deliverables layered on top of the plan's own baseline test cases, not deviations from it.

## Auftraggeber-Mandat Punkt 3: Drei explizite Nachweise

1. **`type=alle` mit `tag`/`genre`, ohne `q` → Fansub-Teil leer (nicht die volle Liste).**
   Neuer Test `TestSearchBypassTagOnlyTypeAlleFansubStaysEmpty`
   (`backend/internal/handlers/search_bypass_integration_test.go`): seedet einen echten
   Fansub-Eintrag ("Test Gruppe") in der isolierten Postgres-Fixture, ruft
   `GET /api/v1/search?type=alle&tag=D%C3%A4mon` (kein `q`) auf und prüft explizit
   `fansub.total == 0` UND `fansub.items == []` — NICHT nur HTTP 200. Zusätzlich
   live gegen `team4s_v2` bestätigt: `curl ".../search?type=alle&tag=Amnesia"` liefert
   `{"items": [], "total": 0}`, obwohl 4 echte Fansub-Gruppen in der Produktions-DB
   existieren (`SELECT COUNT(*) FROM fansub_groups` → 4).

2. **`type=fansub` mit `tag`/`genre`, ohne `q` → ebenfalls leer (nicht die volle Liste),
   obwohl tag/genre reine Anime-Konzepte sind.**
   Neuer, eigener Test `TestSearchBypassTagOnlyTypeFansubStaysEmpty` (separat von Punkt 1,
   nicht nur implizit über `type=alle` mitbewiesen): `GET /api/v1/search?type=fansub&tag=D%C3%A4mon`
   (kein `q`) → 200, `fansub.total == 0`, `fansub.items == []`. Live-Gegenprobe:
   `curl ".../search?type=fansub&tag=Amnesia"` → `{'items': [], 'total': 0}`.

3. **`format`/`status`/`year_from`/`year_to`/`fansub_group` ohne `q` (und ohne tag/genre)
   → weiterhin 400 (D-08 ist additiv NUR für tag/genre).**
   Handler-Ebene (kein DB-Zugriff, sicher gegen nil-Repo):
   `TestSearchRejectsMissingQueryWithOtherFiltersOnly` in `search_test.go`, 5 explizite
   Unterfälle (`format`, `status`, `year_from`, `year_to`, `fansub_group`), alle 400.
   Zusätzlich End-to-End gegen ein ECHTES, Repository-gestütztes Handler (nicht nur den
   nil-Repo-Unittest): `TestSearchBypassRejectsMissingQueryWithNonTagGenreFilterEndToEnd`
   in `search_bypass_integration_test.go` (`type=alle&format=tv`, kein `q`, kein tag/genre)
   → 400 gegen eine echte Postgres-Fixture. Live-Gegenprobe gegen `team4s_v2`:
   `curl ".../search?status=ongoing"` → 400, `curl ".../search?year_from=2020"` → 400,
   `curl ".../search?fansub_group=1"` → 400.

## Issues Encountered
- Live end-to-end verification surfaced a PRE-EXISTING, out-of-scope bug unrelated to
  this plan: `GET /api/v1/search?q=aa&type=fansub` (a real, non-empty `q` against the
  fansub branch) returns HTTP 500 `db_schema_mismatch` in production, because
  `search_fansub.go`'s `SELECT` list references `fansub_groups.group_type`, a column that
  does not exist on `team4s_v2`'s `fansub_groups` table (`\d fansub_groups` confirms: no
  `group_type` column). `search_fansub.go` was not touched by this plan (byte-identical,
  per Task 2's own acceptance criteria) and this bug only affects the `q`-present fansub
  path, which this plan's fix deliberately never reaches for `q`-absent requests — 0
  regression, not fixed (out of Task 2's `<files>` scope). Logged in
  `deferred-items.md` for a future plan.
- Local integration-test fixture initially failed with `text search dictionary
  "public.unaccent" does not exist` because `CREATE EXTENSION IF NOT EXISTS unaccent`
  installs into the isolated test schema by default when `search_path` excludes
  `public` — fixed by explicitly qualifying `CREATE EXTENSION IF NOT EXISTS unaccent
  SCHEMA public;` in the fixture (the `public` schema itself still exists in the
  Phase-106 test database even though the pool's `search_path` excludes it). Rule 3
  (blocking-issue auto-fix), test-infrastructure-only, no production code affected.

## User Setup Required
None - no external service configuration required. Verified against the running
`team4sv30-db`/`team4sv30-backend` containers per CLAUDE.md's canonical Linux workflow.

## Next Phase Readiness
- `/api/v1/search` is ready for Layer 3 (plan 160-06) to link tag/genre chips at
  `/suche?type=anime&tag=<name>` / `.../genre=<name>` without a search term and have
  them resolve correctly, including against German-only translations from plan 160-01/02.
- The pre-existing `fansub_groups.group_type` schema mismatch (see Issues Encountered)
  remains open and unrelated to this plan's scope; a future plan should either add the
  missing column or drop the reference from `search_fansub.go`.
- No blockers for 160-06.

## Self-Check: PASSED

All 6 claimed files found on disk; both task commit hashes (`32c5c83b`, `530daf2e`) found
in `git log`.

---
*Phase: 160-oeffentliche-anime-detailseite-nachschaerfen-tags-anzeigen-g*
*Completed: 2026-09-16*
