# DECISIONS

## 2026-03-14 - Correct Package 2 to Canonical Phase A

### Decision
Correct Package 2 back to the canonical Phase A metadata scope from `docs/architecture/db-schema-v2.md`.

### Context
The existing Package 2 plan and migrations had drifted into studios/persons/contributor entities that do not belong to Phase A.

### Options Considered
- Continue with the drifted scope
- Stop and correct Package 2 before further implementation

### Why This Won
The schema draft is the architectural source of truth for the migration lane. Continuing on the wrong entity set would only create invalid follow-up work.

### Consequences
- `0019` now covers `genres`
- `0020` keeps lookup tables
- `0021` keeps `anime_titles` and `anime_relations`
- `0022` now covers `anime_genres`
- contributor/studio/person structures are out of this phase

### Follow-ups Required
- Execute corrected migrations locally
- Inspect the resulting tables in the DB
- Recover the old relation source before designing relation backfill

---

## 2026-03-14 - Fix Legacy Title Mapping

### Decision
Use explicit title mappings for legacy anime columns:
- `anime.title` -> `ja/main`
- `anime.title_de` -> `de/main`
- `anime.title_en` -> `en/official`

### Context
The old DB stores the Japanese AniSearch title in `anime.title`, while German titles are important for actual user search behavior.

### Options Considered
- Delay title mapping until later crawler enrichment
- Treat all old titles as generic aliases
- Define a pragmatic search-friendly mapping now

### Why This Won
It preserves source meaning, supports likely search behavior, and makes the backfill deterministic now.

### Consequences
- The backfill service can populate `anime_titles` directly
- German titles stay language-primary for future search work
- English titles are preserved without being treated as the main user-facing title

### Follow-ups Required
- Run the backfill locally
- Inspect representative anime rows after the backfill
- Revisit richer title typing later if AniSearch/AniDB enrichment adds better metadata
