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

## 2026-03-15 - Bidirectional Relation Storage

### Decision
Store anime relations bidirectionally during migration (both A->B and B->A).

### Context
Legacy `verwandt` table stored only one direction per relation. Modern graph queries benefit from bidirectional access without UNION complexity.

### Options Considered
1. Store one direction, query with UNION (SELECT ... UNION SELECT ...)
2. Store both directions, query single table (SELECT with simple WHERE)
3. Use recursive CTE for bidirectional traversal

### Why This Won
- Simplifies repository query logic (no UNION needed)
- Better query performance (single table scan with index)
- Aligns with modern graph database patterns
- Makes relation semantics explicit in both directions

### Consequences
- Migration creates 2x records (2,278 -> 4,556)
- Slightly higher storage cost (negligible for this dataset)
- Repository code is simpler and more maintainable
- Future relation queries are faster and more readable

### Follow-ups Required
- Document relation query patterns for future developers
- Consider adding relation traversal depth limiting
- Add relation count verification to backfill script

---

## 2026-03-15 - Legacy Relation Source Discovery

### Decision
Import anime relations from legacy `verwandt` table instead of external API.

### Context
Investigation on 2026-03-14 concluded no legacy relation source existed. Further inspection revealed `verwandt` table with 2,278 records was overlooked due to non-standard naming.

### Options Considered
1. Continue with external API integration plan (AniSearch, AniDB, MAL)
2. Import legacy `verwandt` data and defer API enrichment
3. Hybrid approach (legacy baseline + API enrichment)

### Why This Won
- Legacy data already exists in the database (zero external dependency)
- 2,278 relations provide solid baseline for feature launch
- External API integration can be deferred to enrichment phase
- Faster time-to-market (no API evaluation delay)

### Consequences
- `anime_relations` table is now populated with production-ready data
- External API evaluation is no longer blocking for baseline feature
- Future enrichment can supplement (not replace) legacy data
- Relation quality depends on legacy source accuracy

### Follow-ups Required
- Verify relation quality with manual spot checks
- Document relation data lineage (legacy `verwandt` source)
- Plan optional API enrichment for future phase

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
