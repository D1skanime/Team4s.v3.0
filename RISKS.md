# RISKS

## Top 3 Risks

### 1. Handler Modularization Backlog
- **Impact:** Medium (maintainability degrades with oversized files)
- **Status:** Major monoliths split, but remaining files >150 lines need systematic sweep
- **Mitigation:** Identify all handlers >150 lines and create focused split plan

### 2. New Admin Anime Routes Have Limited Regression Coverage
- **Impact:** Medium (navigation or layout regressions can slip through)
- **Status:** Manual QA complete, but no automated regression tests
- **Mitigation:** Add focused UI smoke/regression suite for new step flow

### 3. Next.js Image Warnings Accumulating
- **Impact:** Low (cosmetic, but clutters build output)
- **Status:** Multiple img tags remain in admin routes
- **Mitigation:** Systematic replacement pass with next/image component

## Current Blockers
- None

## If Nothing Changes
- Handler files will continue to grow beyond maintainable size
- Admin UI regressions may go undetected without automated coverage
- Build warnings will accumulate and obscure real issues
