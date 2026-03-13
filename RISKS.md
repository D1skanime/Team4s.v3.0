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
- None - all Phase 5 prerequisites are met
- Package 2 execution artifacts are the next action item (planning complete, ready to execute)

## Technical Debt
- Shadow mode validation duration thresholds not yet defined (needs refinement during Package 2 execution)
- Reference data backfill progress tracking not yet implemented
- Automated verification gate checks not yet established
- Current production schema still mixes release, stream, and provider concerns inside `episode_versions` (addressed by Phase 5 normalized schema)

## If Nothing Changes, What Fails Next Week?
- Phase 5 execution will stall without Package 2 execution artifacts
- Backend implementation cannot start without detailed lane-by-lane plan (05-02-PLAN.md)
- SDK generation remains blocked until backend tables exist
- Migration progress tracking will be manual and error-prone without defined metrics
