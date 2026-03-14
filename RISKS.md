# RISKS

## Top 3 Risks

### 1. Backfill Timeout Blocks Production Deployment (HIGH-1)
- **Impact:** HIGH - Cannot deploy Phase A to production until resolved
- **Likelihood:** CONFIRMED - ~100 anime (0.5%) encountered timeouts during local execution
- **Evidence:** Timeout warnings for anime IDs 13340-13404 during backfill
- **Root Cause:** 5-minute timeout insufficient for 19,578 anime (~293,670 queries)
- **Mitigation:**
  - Increase timeout from 5 to 10 minutes
  - Implement batch processing (100 anime per transaction)
  - Add progress logging every 1000 anime
  - Re-run backfill and verify 100% completion
- **Owner:** Backend lane
- **Status:** Fix designed, not yet implemented
- **Due:** Before production deployment

### 2. API Selection for Relation Backfill Uncertain
- **Impact:** MEDIUM - `anime_relations` table remains empty, relation features blocked
- **Likelihood:** HIGH - No API evaluation completed yet
- **Evidence:** Task #3 investigation found no legacy relation source
- **Root Cause:** Only one API option presented (AniSearch), no comparison with alternatives
- **Mitigation:**
  - Document alternative APIs (AniDB, MyAnimeList, AniList)
  - Compare: availability, documentation, rate limits, relation coverage, data quality
  - Verify selected API availability and constraints
  - Define fallback strategy for manual entry
  - Create proof-of-concept API call
- **Owner:** Backend lane (requires planning phase)
- **Status:** Conditions documented in Critical Review
- **Due:** Before relation backfill implementation

### 3. Read-Path Switch Timing Unclear
- **Impact:** MEDIUM - Cannot leverage normalized metadata until adapter layer implemented
- **Likelihood:** MEDIUM - Not yet planned
- **Evidence:** Phase A backfill complete, but API still uses legacy columns
- **Root Cause:** No adapter parity tests or dual-read strategy defined
- **Mitigation:**
  - Add adapter parity tests for normalized metadata reads
  - Design adapter layer for dual-read during transition
  - Plan gradual switch from legacy to normalized titles
  - Verify no performance regression
- **Owner:** Backend lane
- **Status:** Not yet planned
- **Due:** Before Phase 6 (handler consumption)

---

## Current Blockers

### Production Deployment
- **Blocker:** HIGH-1 - Backfill timeout
- **Impact:** Cannot deploy Phase A migrations to production
- **Resolution:** Implement timeout fix + batch processing + verification
- **ETA:** 1 day (tomorrow)

### Relation Features
- **Blocker:** API evaluation incomplete
- **Impact:** `anime_relations` table remains empty
- **Resolution:** Complete API comparison and selection
- **ETA:** 2-3 days (requires research and POC)

---

## Technical Debt

### Immediate (Production Blockers)
1. **HIGH-1: Backfill Timeout**
   - Location: `backend/cmd/migrate/main.go:121`
   - Fix: Increase timeout to 10 minutes + batch processing
   - Priority: CRITICAL

2. **MEDIUM-1: No Backfill Verification Script**
   - Location: Missing `scripts/verify-phase-a-backfill.sql`
   - Fix: Create SQL script with row count checks
   - Priority: HIGH

3. **MEDIUM-2: Silent Backfill Failures**
   - Location: `backend/cmd/migrate/main.go:148-150`
   - Fix: Return non-zero exit code if `len(report.Errors) > 0`
   - Priority: MEDIUM

### Short-Term (Phase 5 Completion)
1. **Adapter Parity Tests Missing**
   - Impact: Cannot safely switch read-path to normalized metadata
   - Fix: Add tests comparing legacy vs. normalized reads
   - Priority: MEDIUM

2. **Integration Tests Missing**
   - Impact: Cannot verify full migration/backfill flow
   - Fix: Add end-to-end tests
   - Priority: MEDIUM

3. **DB Verification SQL Missing**
   - Impact: Manual verification is tedious and error-prone
   - Fix: Document reusable SQL snippets
   - Priority: LOW

### Medium-Term (Phase 6 Preparation)
1. **Dual-Read Strategy Undefined**
   - Impact: Risky to switch read-path without fallback
   - Fix: Design adapter layer with dual-read support
   - Priority: MEDIUM

2. **Relation Backfill Implementation**
   - Impact: Relation features unavailable
   - Fix: Implement after API evaluation
   - Priority: MEDIUM

---

## Resolved Risks (2026-03-14)

### Scope Drift in Package 2
- **Resolution:** Corrected to canonical Phase A scope
- **Evidence:** Migrations 0019-0022 implement only titles, genres, relations (schema)
- **Status:** RESOLVED

### Unclear Legacy Title Semantics
- **Resolution:** Explicit mapping rules defined (ja/main, de/main, en/official)
- **Evidence:** Backfill service implements deterministic mapping
- **Status:** RESOLVED

### No Local Execution Path
- **Resolution:** Added CLI command `go run ./cmd/migrate backfill-phase-a-metadata`
- **Evidence:** Backfill executed successfully on 19,578 anime
- **Status:** RESOLVED

---

## Residual Risks

### Data Quality
1. **Genre Normalization Quality Unknown**
   - Likelihood: MEDIUM
   - Impact: LOW (can be cleaned up post-backfill)
   - Mitigation: Stichproben verification passed, further cleanup if needed

2. **Relation Data Quality from External API**
   - Likelihood: UNKNOWN (depends on API selection)
   - Impact: MEDIUM
   - Mitigation: Define validation strategy, allow manual corrections

### Performance
1. **Normalized Query Performance**
   - Likelihood: LOW (indexes present)
   - Impact: MEDIUM (if regression occurs)
   - Mitigation: Index coverage validated, can monitor in production

2. **Adapter Layer Complexity**
   - Likelihood: MEDIUM
   - Impact: MEDIUM
   - Mitigation: Phase A defers adapter implementation, can be designed carefully

### API Integration
1. **API Availability Uncertain**
   - Likelihood: UNKNOWN
   - Impact: HIGH (blocks relation features)
   - Mitigation: Verify availability before implementation, define fallback

2. **Rate Limiting**
   - Likelihood: MEDIUM
   - Impact: MEDIUM (slower backfill)
   - Mitigation: Document rate limits, implement respectful backfill

---

## If Nothing Changes, What Fails Next Week?

1. **Production deployment stalls** - HIGH-1 timeout must be fixed before production rollout
2. **Relation features remain unavailable** - API evaluation must complete before implementation
3. **Phase 6 delays** - Adapter layer planning must start to support handler consumption

---

## Risk Mitigation Checklist

### Before Production Deployment
- [ ] HIGH-1 timeout fix implemented and verified
- [ ] Backfill re-run shows 100% completion (19,578 anime)
- [ ] Verification script created and executed
- [ ] Error reporting enhanced (non-zero exit codes)
- [ ] Critical Review approval for production obtained

### Before Relation Backfill
- [ ] API evaluation complete (3+ alternatives documented)
- [ ] Selected API verified (availability, rate limits, auth)
- [ ] Fallback strategy defined (manual entry workflow)
- [ ] Proof-of-concept API call successful
- [ ] Data quality validation strategy defined

### Before Read-Path Switch
- [ ] Adapter parity tests passing
- [ ] Dual-read strategy designed and tested
- [ ] Performance baseline established
- [ ] Rollback plan documented
- [ ] Gradual rollout plan defined

---

## Escalation Criteria

**Escalate if:**
1. HIGH-1 timeout fix does not resolve incompleteness (requires architectural change)
2. No viable API option found for relation data (requires product decision on feature scope)
3. Normalized query performance shows regression >20% (requires optimization or rollback)
4. Backfill verification reveals data quality issues affecting >5% of anime (requires cleanup strategy)
