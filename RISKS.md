# Risks & Blockers - Team4s.v3.0

## Active Blockers
- **Docker daemon availability:** Intermittent - sometimes Docker Desktop pipe unavailable
  - Impact: Cannot rebuild/verify frontend container
  - Action: Restart Docker Desktop if needed

## Top 3 Risks

### 1. Handler file size debt
- **Likelihood:** Certain (already exists)
- **Impact:** Medium - maintainability degradation
- **Files exceeding 150-line limit:**
  - `episode_versions.go` (735 lines)
  - `admin_content.go` (629 lines)
  - `anime_backdrops.go` (558 lines)
  - `episode_playback.go` (430 lines)
- **Mitigation:** Continue modularization using `code-modularization-agent.md`

### 2. Uncommitted frontend changes
- **Likelihood:** Medium
- **Impact:** Low - potential merge conflicts or lost context
- **Details:** 2 Episode Manager files modified but not committed
- **Mitigation:** Review and commit or stash with explanation

### 3. Release tag alias gaps
- **Likelihood:** Medium
- **Impact:** Low - some episode versions show without fansub attribution
- **Details:** Tags like `B-SH` not mapped to fansub groups
- **Mitigation:** Create missing aliases or groups as discovered

## If Nothing Changes, What Fails Next Week?
- Code debt in handlers will make future changes harder
- Uncommitted changes may be lost or cause confusion
- New Jellyfin imports may have unmapped release tags
