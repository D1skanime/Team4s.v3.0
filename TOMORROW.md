# TOMORROW

## Top 3 Priorities

1. **Fix HIGH-1: Backfill Timeout and Batch Processing**
   - Increase timeout from 5 to 10 minutes in `backend/cmd/migrate/main.go:121`
   - Implement batch processing (100 anime per transaction)
   - Add progress logging every 1000 anime

2. **Verify Backfill Completeness**
   - Re-run backfill after timeout/batch fixes
   - Verify 100% completion (19,578 anime)
   - Inspect sample anime for data quality

3. **Task #3 Conditions: API Evaluation**
   - Document alternative APIs (AniDB, MyAnimeList, AniList)
   - Compare: availability, documentation, rate limits, relation coverage
   - Verify AniSearch API availability and constraints
   - Define fallback strategy for manual entry

---

## First 15-Minute Task

Fix HIGH-1 timeout: Edit `backend/cmd/migrate/main.go:121` and change:
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
```
to:
```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
```

---

## Phase 5 Execution Checklist

- [x] Phase 5 planning complete
- [x] Contract impact analysis complete
- [x] Contract freeze set
- [x] Package 2 scope corrected to canonical Phase A
- [x] Backend migrations corrected to canonical Phase A scope
- [x] Anime metadata backfill repository/service code added
- [x] Focused migration/service tests added
- [x] Migrations executed in local environment
- [x] Backfill executed and verified (99.5% - timeout on ~100 anime)
- [ ] Backfill timeout fixed (HIGH-1)
- [ ] Batch processing implemented (HIGH-1)
- [ ] Progress logging added (LOW-1)
- [ ] Backfill re-run with 100% completion verification
- [ ] Verification script created (MEDIUM-1)
- [ ] Error reporting enhanced (MEDIUM-2)
- [ ] API evaluation complete (Task #3 conditions)
- [ ] Relation backfill implementation ready
- [ ] Package 1 ready for execution

---

## Production Blockers

### HIGH-1: Backfill Timeout
- **Issue:** 5-minute timeout insufficient for 19,578 anime
- **Evidence:** ~100 anime (IDs 13340-13404) encountered timeouts
- **Impact:** ~0.5% data incompleteness
- **Required Actions:**
  1. Increase timeout to 10 minutes
  2. Implement batch processing (100 anime/transaction)
  3. Add progress logging
  4. Re-run and verify 100% completion
- **Blocking:** Production deployment (local dev approved)

---

## Task #3 Conditions (Relation Backfill)

Before relation backfill implementation proceeds:

1. **API Option Analysis**
   - Document: AniDB, MyAnimeList, AniList, Kitsu
   - Compare: availability, documentation, rate limits, relation coverage, data quality
   - Justify final selection with evidence

2. **Primary API Verification**
   - Verify API endpoint availability
   - Document rate limits and authentication requirements
   - Provide API documentation reference
   - Create proof-of-concept API call

3. **Fallback Strategy**
   - Define manual entry workflow for missing relations
   - Document hybrid approach (API + manual override)
   - Define error handling for API unavailability

---

## Dependencies

### Technical Dependencies
- Local DB must be reachable on `localhost:5433`
- Postgres 13+ with SCRAM-SHA-256 authentication
- Go 1.21+ for backend

### Data Dependencies
- Legacy anime columns remain backfill source:
  - `title` (Japanese)
  - `title_de` (German)
  - `title_en` (English)
  - `genre` (CSV)
- Relation backfill depends on external API selection

---

## Nice to Have

### Immediate
- Create `scripts/verify-phase-a-backfill.sql` with:
  - Row count checks for all Phase A tables
  - Sample data queries for manual inspection
  - Data quality checks (null counts, orphans)

### Short-Term
- Verify DB GUI that supports SCRAM auth (DBeaver, pgAdmin, psql)
- Document reusable SQL snippets for anime metadata inspection
- Add unit test execution evidence to reviews

### Medium-Term
- Add adapter parity tests for normalized metadata reads
- Add integration tests for migration/backfill flow
- Plan read-path switch from legacy to normalized titles

---

## Open Questions

1. Which external API provides best anime relation coverage and quality?
2. What are rate limits and authentication requirements for candidate APIs?
3. When should read-path switch from legacy to normalized titles?
4. Should adapter layer support dual-read during transition?

---

## Context for Next Session

### What Just Happened
- Executed Phase A migrations successfully (7 tables created)
- Backfilled 19,578 anime with normalized titles and genres
- Identified timeout issue affecting ~100 anime (~0.5%)
- Completed relation source investigation (no legacy data)
- Passed 2 Critical Reviews with conditional approvals

### Current State
- Phase A schema: COMPLETE
- Phase A backfill: 99.5% (timeout on ~100 anime)
- Production readiness: BLOCKED (HIGH-1)
- Relation backfill: BLOCKED (API evaluation required)

### What's Clear
- Timeout fix is straightforward (increase + batch processing)
- Schema design is correct and approved
- Backfill logic is correct and idempotent
- API evaluation conditions are well-defined

### What's Uncertain
- Best API for relation data (AniSearch vs. alternatives)
- API availability and constraints
- Timeline for relation feature delivery
