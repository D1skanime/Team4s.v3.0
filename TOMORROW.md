# TOMORROW

## Top 3 Priorities

1. **Fix HIGH-1: Backfill Timeout and Batch Processing**
   - Increase timeout from 5 to 10 minutes in `backend/cmd/migrate/main.go:121`
   - Implement batch processing (100 anime per transaction)
   - Add progress logging every 1000 anime
   - Re-run backfill and verify 100% completion (19,578 anime)

2. **Backend: Add `genres: string[]` Field to AnimeDetail Contract**
   - Update `AnimeDetail` type to include `genres: string[]`
   - Update `backend/internal/handlers/anime.go` to split CSV into array
   - Update `backend/internal/repository/anime.go` if needed
   - Update `frontend/src/types/anime.ts` to remove unsafe cast
   - Verify genre chips display on anime detail page
   - **Blocks:** Genre chips display on redesigned anime detail page

3. **Frontend: Add CSS Variable Fallback for Accessibility**
   - File: `frontend/src/app/anime/[id]/page.module.css`
   - Add fallback to `var(--color-primary, #ff8a4c)` on lines 249, 388
   - Test focus outlines with CSS variable disabled
   - **Improves:** Accessibility for keyboard navigation users

---

## First 15-Minute Task

**Open `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\backend\cmd\migrate\main.go`**

1. Find line 121 (timeout configuration for backfill command)
2. Change timeout from `5 * time.Minute` to `10 * time.Minute`
3. Save file
4. Run `go test ./...` to verify no syntax errors
5. Commit change with message: "Fix HIGH-1: Increase backfill timeout to 10 minutes"

This is a simple code change that unblocks the next steps (batch processing implementation).

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

## Relation Data Quality Verification (Optional)

Anime relations feature is functional with 2,278 legacy relations imported. Optional quality checks:

1. **Spot-Check Verification**
   - Manually verify 10-20 sample anime relations
   - Check relation type accuracy (sequel, prequel, etc.)
   - Document any incorrect or missing relations

2. **Data Quality Metrics**
   - Count anime with 0 relations
   - Count anime with 1+ relations
   - Identify most common relation types

3. **Future Enrichment (Deferred)**
   - External API integration is optional for enrichment
   - Baseline data from legacy `verwandt` table is sufficient
   - Can be planned for future phase if needed

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

### What Just Happened (2026-03-15)
- **Morning:** Implemented anime relations feature (full stack)
  - Migration 0023: Imported 2,278 legacy relations from `verwandt` table
  - Created bidirectional relations (4,556 total records)
  - GET /api/v1/anime/:id/relations endpoint deployed
  - AnimeRelations.tsx component integrated and deployed
  - Critical Review: APPROVED (3 Low findings)
- **Afternoon:** Redesigned AnimeDetail page (full stack)
  - Complete visual redesign: glassmorphism, blurred background, 2-column grid
  - 592 lines of CSS rewritten (dark theme, responsive, accessibility)
  - Enhanced AnimeRelations with variant prop, enhanced WatchlistAddButton
  - Deployed to production
  - Critical Review: CONDITIONAL APPROVAL (1 High, 1 Medium, 3 Low findings)

### What Happened Previously (2026-03-14)
- Executed Phase A migrations successfully (7 tables created)
- Backfilled 19,578 anime with normalized titles and genres
- Identified timeout issue affecting ~100 anime (~0.5%)
- Completed relation source investigation
- Passed 2 Critical Reviews with conditional approvals

### Current State
- Phase A schema: COMPLETE (7 tables)
- Phase A backfill: 99.5% (timeout on ~100 anime)
- Anime relations: COMPLETE (2,278 legacy relations imported, 4,556 bidirectional)
- AnimeDetail page redesign: COMPLETE (glassmorphism, responsive, accessible)
- Production readiness: BLOCKED (HIGH-1 timeout fix required)
- Genre chips: BLOCKED (backend needs `genres: string[]` field)
- Phase 5 completion: ~85%

### What's Clear
- Timeout fix is straightforward (increase + batch processing)
- Relation data source found (legacy `verwandt` table)
- Schema design is correct and approved
- Backfill logic is correct and idempotent
- Anime relations feature is functional and deployed

### What's Uncertain
- Relation data quality from legacy source (needs spot-check)
- Timeline for Phase 5 completion (depends on HIGH-1 fix)
- When to switch read-path from legacy to normalized metadata
- Genre chips display blocked until backend provides `genres: string[]`
