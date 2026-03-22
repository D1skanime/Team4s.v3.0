# RISKS

## Top 3 Risks

### 1. Cover Upload Button Not Working - Blocks UI Workflow (NEW)
- **Impact:** High (UI feature broken)
- **Likelihood:** High (currently reproducible)
- **Why it matters:** Admin users cannot upload covers via UI, must use direct API calls. Click handler on "Cover hochladen" button does not trigger file input - `coverFileInputRef.current` appears to be null at click time.
- **Mitigation:** Debug component mount order and ref lifecycle tomorrow. API upload path works, so functionality exists (just UI convenience missing).

### 2. Missing Migration Rollback Documentation - Blocks Production Deployment (NEW)
- **Impact:** High (operational risk)
- **Likelihood:** Medium (required for production readiness)
- **Why it matters:** Critical Review blocker C6. If cover migration causes production issues, no documented procedure to rollback. Migration touched 2231 anime records and created thousands of new DB entries and filesystem files.
- **Mitigation:** Document rollback procedure tomorrow (SQL to delete from new tables, restore `anime.cover_image`, delete `/media/anime/*/poster/` directories).

### 3. Schema Deviation May Cause Future Phase Conflicts (NEW)
- **Impact:** Medium (technical debt)
- **Likelihood:** Medium (if future work assumes spec is source of truth)
- **Why it matters:** `media_assets` table uses inline `entity_type`/`asset_type` fields instead of `media_type_id` FK as specified in `db-schema-v2.md`. Future database migrations or API work may assume spec is accurate, causing implementation conflicts.
- **Mitigation:** Update `db-schema-v2.md` to reflect actual implementation, add migration note explaining deviation rationale.

### 4. Documentation Inconsistency May Cause Future Confusion
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** Previous UX handoff documents incorrectly described Related section as standalone post-hero block, when it actually belongs inside infoCard. This could mislead future developers or cause unnecessary rework.
- **Mitigation:** Review and archive/correct outdated documentation tomorrow, add notes explaining the correction.

### 5. Repo-Wide Frontend Lint Debt Masks Slice-Level Regressions
- **Impact:** Medium
- **Likelihood:** High
- **Why it matters:** `frontend npm run lint` still fails outside this scope, so it cannot currently serve as a clean gate for local slice validation.
- **Mitigation:** Inventory lint failures tomorrow and create separate cleanup plan. Continue using build/runtime validation as primary gates.

### 6. Dirty Worktree Increases Commit/Deploy Risk
- **Impact:** Low
- **Likelihood:** Medium
- **Why it matters:** Foreign changes exist in `backend/server.exe`, `backend/migrate-covers.exe`, `backend/migrate.exe`, and `frontend/tsconfig.tsbuildinfo`. Careless staging could include unrelated files in commits.
- **Mitigation:** Continue using explicit file staging. Use `.gitignore` for build artifacts.

## Current Blockers
- **Cover upload button not working:** UI click handler not triggering file input (debugging in progress)
- **Missing rollback documentation:** Critical Review blocker C6 - migration rollback procedure not documented

## If Nothing Changes, What Fails Next Week?
- **Admin users cannot upload covers via UI** (workaround: direct API calls)
- **Production migration rollback is undocumented** (risk if migration causes issues)
- **Schema deviation will confuse future developers** (assumes spec matches implementation)
- Documentation inconsistency will persist and potentially confuse future work
- Frontend lint will continue producing noisy failures unrelated to current work
- Core media upload functionality works (API-level), just UI integration incomplete
