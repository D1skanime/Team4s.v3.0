# RISKS

## Top 3 Risks

### 1. Handler Modularization Backlog
- **Impact:** Medium (maintainability degrades with oversized files)
- **Status:** Major monoliths split, but remaining files >150 lines need systematic sweep
- **Mitigation:** Identify all handlers >150 lines and create focused split plan

### 2. New Admin Anime Routes Have Limited Regression Coverage
- **Impact:** Medium (navigation or layout regressions can slip through)
- **Status:** RESOLVED - 145 automated tests added (97 frontend, 48 backend)
- **Mitigation:** Complete - all admin anime routes now have regression coverage

### 3. Next.js Image Warnings Accumulating
- **Impact:** Low (cosmetic, but clutters build output)
- **Status:** Multiple img tags remain in admin routes
- **Mitigation:** Systematic replacement pass with next/image component

## Current Blockers
- None

## If Nothing Changes
- Handler files will continue to grow beyond maintainable size
- Build warnings will accumulate and obscure real issues
- Technical debt from oversized handlers will make future refactoring harder
