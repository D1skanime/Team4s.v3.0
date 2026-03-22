# Phase 5 Contract Impact Analysis

**Date:** 2026-03-18
**Phase:** 5 - Reference and Metadata Groundwork
**Analyst:** Orchestrator (Claude Opus 4.5)
**Status:** COMPLETE

---

## Executive Summary

**CONTRACT FREEZE: YES**

Phase 5 (Reference and Metadata Groundwork) introduces backend-only database migrations for reference tables (anime_titles, genres, relations, languages, types). The existing OpenAPI contract already supports all required response shapes. **No API changes are required.**

---

## Analysis Scope

### Phase 5 Target Entities (from db-schema-v2.md)

| Entity | Purpose | API Impact |
|--------|---------|------------|
| `AnimeTitle` | Multi-language title normalization | None (internal) |
| `TitleType` | Reference lookup (main, romaji, etc.) | None (internal) |
| `Language` | ISO language codes | None (internal) |
| `Genre` | Normalized genre table | None (internal) |
| `AnimeGenre` | Anime-genre junction | None (internal) |
| `AnimeType` | TV, OVA, Film, etc. | Already in contract |
| `AnimeRelation` | Related anime links | Future phase |
| `RelationType` | Sequel, prequel, etc. | Future phase |

---

## Contract Analysis

### Current OpenAPI Schema Review

#### AnimeDetail Schema (Lines 4403-4459)
```yaml
AnimeDetail:
  properties:
    title:        # Current: single string
    title_de:     # Current: nullable string
    title_en:     # Current: nullable string
    type:         # $ref: AnimeType (enum)
    genre:        # Current: CSV string (legacy)
    genres:       # Current: string[] (added 2026-03-18)
```

**Finding:** The current contract already has:
- `title`, `title_de`, `title_en` - supports basic title variants
- `genres: string[]` - added today, supports array output
- `type` enum - already normalized in contract

#### AnimeType Enum (Line 4312-4314)
```yaml
AnimeType:
  type: string
  enum: [tv, film, ova, ona, special, bonus]
```

**Finding:** Already an enum, backend migration can normalize without contract change.

#### GenreToken Schema (Lines 5077-5093)
```yaml
GenreToken:
  properties:
    id: integer
    name: string
GenreTokenListResponse:
  properties:
    data:
      type: array
      items:
        $ref: "#/components/schemas/GenreToken"
```

**Finding:** Admin genre listing endpoint exists at `/api/v1/admin/genres` (Line 1546). The new normalized `Genre` table can serve this endpoint without contract change.

---

## Impact Assessment by Entity

### 1. AnimeTitle + TitleType + Language

**Database Change:** New tables `anime_titles`, `title_types`, `languages`

**API Impact:** NONE
- Current `AnimeDetail.title`, `.title_de`, `.title_en` fields remain stable
- Repository can internally query normalized tables and map to existing response shape
- No new endpoints required for Phase 5

**Adapter Strategy:**
```
[Normalized Tables] --> [AnimeRepository] --> [AnimeDetail DTO] --> [OpenAPI Response]
                              ^
                         (mapping layer)
```

### 2. Genre + AnimeGenre

**Database Change:** New tables `genres`, `anime_genres`

**API Impact:** NONE
- `AnimeDetail.genres: string[]` already in contract (added today)
- `GenreToken` schema already exists for admin listing
- Backend can populate from normalized table or CSV parse

**Current Flow (today):**
```
anime.genre (CSV) --> strings.Split() --> AnimeDetail.Genres []string
```

**Future Flow (post-migration):**
```
anime_genres JOIN genres --> []Genre --> AnimeDetail.Genres []string
```

Same output shape, different data source.

### 3. AnimeType Normalization

**Database Change:** New table `anime_types` (reference lookup)

**API Impact:** NONE
- `AnimeType` enum in contract unchanged
- Backend maps internal ID to enum string

### 4. AnimeRelation + RelationType

**Database Change:** New tables `anime_relations`, `relation_types`

**API Impact:** DEFERRED TO LATER PHASE
- Current contract has no `relations` field in `AnimeDetail`
- Phase 5 only creates the tables, does not expose new API
- Exposure planned for a future iteration

---

## Contract Freeze Justification

| Criterion | Status |
|-----------|--------|
| All Phase 5 entities are internal | YES |
| No new public endpoints required | YES |
| Existing response shapes sufficient | YES |
| Adapter-backed compatibility possible | YES |
| No breaking changes | YES |

**Decision: CONTRACT FREEZE = YES**

The OpenAPI contract at `shared/contracts/openapi.yaml` requires **no modifications** for Phase 5 execution.

---

## Validation Gates for Phase 5

### Gate 1: Schema Readiness
- [ ] Migration files created for: `languages`, `title_types`, `anime_titles`
- [ ] Migration files created for: `genres`, `anime_genres`
- [ ] Migration files created for: `anime_types` (if normalizing)
- [ ] All foreign keys and constraints defined

### Gate 2: Backfill Correctness
- [ ] Languages seeded from hardcoded list (de, en, ja, romaji)
- [ ] Title types seeded (main, official, short, synonym, romaji, japanese)
- [ ] Genres extracted from existing CSV data
- [ ] Anime-genre relationships backfilled

### Gate 3: Repository Parity
- [ ] `AnimeRepository.GetByID()` returns same output with new data source
- [ ] `AnimeRepository.List()` returns same output with new data source
- [ ] Genre chip display unchanged in frontend

### Gate 4: Cleanup Eligibility
- [ ] NOT IN SCOPE for Phase 5
- [ ] Old columns retained until Phase B+ migration complete

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migration fails on production | Low | Test on staging first |
| Backfill misses edge cases | Medium | Validate row counts before/after |
| Repository returns different output | Low | Integration tests before cutover |
| Frontend breaks | Very Low | Contract unchanged, same JSON shape |

---

## Recommendation

**Proceed with Phase 5 Backend Execution**

1. Create database migrations for reference tables
2. Seed lookup data (languages, title_types, genres)
3. Create backfill scripts for existing data
4. Update repository layer to read from normalized tables
5. Run integration tests to verify parity
6. Deploy to staging, validate, then production

**No contract changes needed. Frontend work not required.**

---

## Appendix: Relevant Contract Excerpts

### AnimeDetail Schema (current)
```yaml
AnimeDetail:
  type: object
  required: [id, title, type, content_type, status, view_count, episodes]
  properties:
    id: { type: integer, format: int64 }
    title: { type: string }
    title_de: { type: string, nullable: true }
    title_en: { type: string, nullable: true }
    type: { $ref: "#/components/schemas/AnimeType" }
    genre: { type: string, nullable: true }
    genres: { type: array, items: { type: string } }
    # ... remaining fields unchanged
```

### AnimeType Enum (current)
```yaml
AnimeType:
  type: string
  enum: [tv, film, ova, ona, special, bonus]
```

---

**Analysis Complete.**
**Contract Freeze Confirmed: YES**
**Ready for Backend Execution: YES**
