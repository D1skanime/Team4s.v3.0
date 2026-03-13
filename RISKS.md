# RISKS

## Top 3 Risks

### 1. Reference Data Migration Complexity
- **Impact:** High (large existing dataset needs safe backfill without production disruption)
- **Likelihood:** Medium
- **Mitigation:** Shadow mode pattern with verification gates, explicit backfill strategy in Package 2 execution plan, metrics tracking during migration

### 2. Foreign Key Dependencies During Shadow Mode
- **Impact:** Medium (new tables must align with existing schema, constraint violations could block migration)
- **Likelihood:** Medium
- **Mitigation:** Shadow mode validation before constraint enforcement, explicit dependency mapping in 05-01-PLAN.md, verification tests for constraint compatibility

### 3. Contract Freeze Scope Expansion
- **Impact:** Medium (unexpected contract needs during Phase 5 require phase re-planning)
- **Likelihood:** Low (contract impact analysis was thorough)
- **Mitigation:** Contract freeze documented and confirmed, handler consumption deferred to Phase 6, any contract changes require explicit phase planning

## Current Blockers
- None - Package 2 Tasks 1-4 complete, ready for Tasks 5-11
- Migrations created but not yet executed in local environment

## Technical Debt
- Shadow mode validation duration thresholds not yet defined (needs refinement during Package 2 execution)
- Reference data backfill progress tracking not yet implemented
- Automated verification gate checks not yet established
- Current production schema still mixes release, stream, and provider concerns inside `episode_versions` (addressed by Phase 5 normalized schema)
- Database migrations 0019-0022 created but not yet executed or tested in local environment
- Repository layer not yet implemented (blocks service layer and tests)

## If Nothing Changes, What Fails Next Week?
- Backend implementation cannot proceed without repository layer (Tasks 5-6)
- Service layer and tests blocked without repository layer foundation
- SDK generation remains blocked until backend implementation completes and tables are verified
- Migration execution delayed without local environment testing
- Backfill strategy remains theoretical without service layer implementation
