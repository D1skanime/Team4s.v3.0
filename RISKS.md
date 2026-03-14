# RISKS

## Top 3 Risks

### 1. Legacy Relation Source Is Missing
- **Impact:** High
- **Likelihood:** Medium
- **Mitigation:** Keep `anime_relations` schema-only until the old relation source is available again

### 2. Genre Normalization May Be Noisy
- **Impact:** Medium
- **Likelihood:** Medium
- **Mitigation:** Inspect representative backfill results before any cleanup or read-path switch

### 3. Local Validation Evidence Is Still Missing
- **Impact:** Medium
- **Likelihood:** Medium
- **Mitigation:** Run migrations and backfill locally, then inspect the DB directly

## Current Blockers
- None on code implementation
- Old anime-relation source schema is still unavailable for backfill design

## Technical Debt
- Adapter parity tests are still incomplete
- Relation-source recovery is still outstanding
- Backfill verification SQL/checklists still need to be captured

## If Nothing Changes, What Fails Next Week?
- Phase 5 stalls at schema-only progress without local execution evidence
- Search/read-path work cannot safely move to normalized titles
- `anime_relations` remains dead schema until the old source is recovered
