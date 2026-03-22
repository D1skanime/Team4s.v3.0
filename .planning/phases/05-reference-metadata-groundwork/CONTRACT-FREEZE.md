# CONTRACT FREEZE DECLARATION

**Phase:** 5 - Reference and Metadata Groundwork
**Date:** 2026-03-18
**Decision:** FREEZE

---

## Status

```
+------------------------------------------+
|                                          |
|    CONTRACT FREEZE: YES                  |
|                                          |
|    shared/contracts/openapi.yaml         |
|    shall NOT be modified during          |
|    Phase 5 execution                     |
|                                          |
+------------------------------------------+
```

---

## Justification

### Analysis Performed
Full contract impact analysis comparing:
- Phase 5 target entities (from `docs/architecture/db-schema-v2.md`)
- Current OpenAPI schema (from `shared/contracts/openapi.yaml`)

### Findings

| Phase 5 Entity | Requires Contract Change? | Reason |
|----------------|---------------------------|--------|
| `languages` | NO | Internal lookup table |
| `title_types` | NO | Internal lookup table |
| `anime_titles` | NO | Maps to existing `title`, `title_de`, `title_en` |
| `genres` | NO | Maps to existing `genres: string[]` |
| `anime_genres` | NO | Junction table, no new API field |
| `anime_types` | NO | Already enum in contract |
| `anime_relations` | NO | Not exposed in Phase 5 |

### Contract Compatibility

The current `AnimeDetail` schema already contains all fields needed to serve normalized data:

```yaml
AnimeDetail:
  properties:
    title: string          # <- served from anime_titles
    title_de: string       # <- served from anime_titles
    title_en: string       # <- served from anime_titles
    genres: string[]       # <- served from anime_genres JOIN genres
    type: AnimeType        # <- unchanged enum
```

---

## What This Means

1. **Frontend team:** No changes required during Phase 5
2. **Backend team:** Repository layer adapts internally, same JSON output
3. **Contract file:** Remains untouched, version stays at 0.1.0
4. **Integration tests:** Should pass without modification

---

## Exceptions

None. All Phase 5 work is internal backend restructuring.

If an exception is needed, it must be:
1. Documented in this file
2. Approved by project lead
3. Accompanied by frontend impact assessment

---

## Duration

This freeze applies until Phase 5 is marked complete.

**Expected completion:** TBD (dependent on backend execution)

---

## References

- Full analysis: `05-CONTRACT-ANALYSIS.md`
- Execution plan: `05-01-PLAN.md`
- Target schema: `docs/architecture/db-schema-v2.md`
- Current contract: `shared/contracts/openapi.yaml`

---

**Freeze declared by:** Orchestrator (Claude Opus 4.5)
**Date:** 2026-03-18
