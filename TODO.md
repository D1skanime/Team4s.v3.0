# TODO

## Completed (2026-03-14)

### Phase A Migrations and Backfill
- [x] Reconcile Package 2 with `docs/architecture/db-schema-v2.md`
- [x] Re-scope Package 2 to canonical Phase A only
- [x] Rework migrations `0019-0022` to remove out-of-scope Phase A entities
- [x] Audit legacy anime source columns: `title`, `title_de`, `title_en`, `genre`
- [x] Fix title mapping rules for Phase A backfill
- [x] Add anime metadata repository support
- [x] Add anime metadata backfill service
- [x] Add CLI command `go run ./cmd/migrate backfill-phase-a-metadata`
- [x] Add focused migration/service tests
- [x] Execute corrected migrations in local environment (22 applied, 0 pending)
- [x] Execute Phase A metadata backfill locally (19,578 anime, 99.5% complete)
- [x] Verify sample anime rows against `anime_titles` (stichproben passed)
- [x] Verify `genres` and `anime_genres` after backfill (501 genres, 60,932 links)

### Relation Source Investigation
- [x] Investigate legacy schema for relation source (migrations 0001, 0003, 0008)
- [x] Investigate import files for relation data (v2_anime.tsv, v2_full_anime_min.tsv)
- [x] Document findings in Critical Review
- [x] Identify external API integration requirement

---

## Immediate (Production Blockers)

### HIGH-1: Backfill Timeout Fix
- [ ] Increase timeout from 5 to 10 minutes in `backend/cmd/migrate/main.go:121`
- [ ] Implement batch processing (100 anime per transaction)
- [ ] Add progress logging every 1000 anime
- [ ] Re-run backfill and verify 100% completion (19,578 anime)
- [ ] Document timeout fix in day summary

**Priority:** CRITICAL
**Blocking:** Production deployment
**ETA:** 1 day

### MEDIUM-1: Backfill Verification Script
- [ ] Create `scripts/verify-phase-a-backfill.sql`
- [ ] Add row count checks for all Phase A tables
- [ ] Add sample data queries for manual inspection
- [ ] Add data quality checks (null counts, orphans)
- [ ] Execute verification script and document results

**Priority:** HIGH
**Blocking:** Production deployment confidence
**ETA:** 1 day

### MEDIUM-2: Backfill Error Reporting
- [ ] Modify `backend/cmd/migrate/main.go:148-150` to return non-zero exit code on errors
- [ ] Test error reporting with intentional failures
- [ ] Document error handling in backfill service

**Priority:** MEDIUM
**Blocking:** Silent failure prevention
**ETA:** 0.5 days

---

## Short Term (Task #3 Conditions)

### API Evaluation for Relation Backfill
- [ ] Document AniDB API option (availability, rate limits, auth, relation coverage)
- [ ] Document MyAnimeList API option (availability, rate limits, auth, relation coverage)
- [ ] Document AniList API option (availability, rate limits, auth, relation coverage)
- [ ] Compare all options in a decision matrix
- [ ] Verify selected API availability with proof-of-concept call
- [ ] Document API selection justification
- [ ] Define fallback strategy for manual entry
- [ ] Define hybrid approach (API + manual override)
- [ ] Define error handling for API unavailability

**Priority:** HIGH
**Blocking:** Relation backfill implementation
**ETA:** 2-3 days

### Verification and Documentation
- [ ] Document reusable DB verification SQL snippets
- [ ] Add SQL snippets for inspecting 10 sample anime rows
- [ ] Verify DB GUI that supports SCRAM auth (DBeaver, pgAdmin, psql)
- [ ] Capture local migration/backfill evidence in repo-local docs

**Priority:** MEDIUM
**Blocking:** None
**ETA:** 1 day

---

## Medium Term (Phase 5 Completion)

### Adapter Layer Preparation
- [ ] Design adapter layer for dual-read (legacy + normalized)
- [ ] Add adapter parity tests for normalized anime metadata reads
- [ ] Verify no performance regression with normalized queries
- [ ] Plan gradual switch from legacy to normalized titles
- [ ] Document rollback plan

**Priority:** MEDIUM
**Blocking:** Phase 6 (handler consumption)
**ETA:** 3-5 days

### Integration Tests
- [ ] Add integration tests for migration/backfill flow
- [ ] Add end-to-end tests for normalized metadata reads
- [ ] Add performance baseline tests

**Priority:** MEDIUM
**Blocking:** Production confidence
**ETA:** 2-3 days

### Package 2 Closeout
- [ ] Complete Package 2 backend verification gates
- [ ] Document Phase A evidence package
- [ ] Final Critical Review for production deployment

**Priority:** MEDIUM
**Blocking:** Phase 5 completion
**ETA:** After HIGH-1 resolved

---

## Long Term (Phase 6 Preparation)

### Relation Backfill Implementation
- [ ] Create external API client (after API selection)
- [ ] Implement relation-type mapping
- [ ] Add batch sync command for relation backfill
- [ ] Add admin UI for manual corrections
- [ ] Verify relation data quality

**Priority:** LOW (blocked by API evaluation)
**Blocking:** Relation features
**ETA:** 5-7 days (after API selection)

### Package 1 Preparation
- [ ] Prepare Package 1 (TypeScript SDK) execution artifacts
- [ ] Review TypeScript SDK impact on Phase A schema
- [ ] Plan contract updates if needed

**Priority:** LOW
**Blocking:** None
**ETA:** TBD

### Phase 6 Planning
- [ ] Plan Phase 6 handler consumption
- [ ] Design read-path switch strategy
- [ ] Plan production rollout and cleanup gates

**Priority:** LOW
**Blocking:** None
**ETA:** TBD

---

## Dependencies

### Blocking Other Work
- HIGH-1 timeout fix blocks production deployment
- API evaluation blocks relation backfill implementation
- Adapter layer blocks Phase 6 handler consumption

### Blocked By
- Relation backfill blocked by API evaluation
- Read-path switch blocked by adapter layer design
- Phase 6 blocked by Phase 5 completion

---

## Nice to Have (Not Blocking)

- [ ] Add progress bars to CLI commands
- [ ] Add --dry-run flag to backfill command
- [ ] Add --limit flag for partial backfill testing
- [ ] Add backfill rollback command
- [ ] Add anime metadata export command
- [ ] Add genre cleanup/merge tools
- [ ] Add title variant search tools

---

## Parking Lot (Deferred)

- Revisit title-type richness later when AniSearch/AniDB enrichment returns
- Consider adding `title_sources` table for tracking where titles came from
- Consider adding `genre_aliases` table for genre normalization
- Consider adding audit columns to track backfill metadata (created_at, updated_at, source)
