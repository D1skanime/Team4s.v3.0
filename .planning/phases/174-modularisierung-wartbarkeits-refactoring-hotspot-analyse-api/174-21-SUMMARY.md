---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 21
subsystem: api
tags: [go, postgres, query-count-verification, pgx, testing]

# Dependency graph
requires:
  - phase: 174-16
    provides: fansub_repository.go Groups/Links/Aliases split (first cluster this plan re-measures against)
  - phase: 174-17
    provides: fansub_repository.go remaining clusters split + TestFansubRepository_PublicProfileSourceInvariants resolution
  - phase: 174-18
    provides: admin_content_anime_themes.go theme-CRUD/segment split
  - phase: 174-19
    provides: anime_assets.go asset-type split
  - phase: 174-20
    provides: admin_content_release_version_media.go remaining-cluster split
provides:
  - "Live, measured before/after query-count evidence for all 4 concrete D-17 risk-area endpoints Welle 4 touched"
  - "Full backend test-suite closing verification for Welle 4: 65 failures, 100% explained by 174-01's documented baseline categories (A-E) plus 174-17's documented resolution, zero unexplained regressions"
  - "go build ./... clean across the entire backend post-Welle-4"
affects: [174-25]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Statement-log query-count measurement via ALTER SYSTEM SET log_statement='all' + millisecond-precision per-call timestamp windows (tighter than 174-01's second-granularity docker-logs-since windows), counting both 'LOG: statement:' and 'LOG: execute stmtcache_*' lines while excluding the connection-pool ping probe and the theme_segment_render_cache background poller"
    - "Container-network backend test protocol requires mounting the full repo root (not just backend/) so repo-root-relative test helpers (e.g. v12_status_foundation_migration_test.go's filepath.Join(backendRoot, \"..\", \"database\", \"migrations\", name)) resolve correctly — the 174-15-documented fix, re-confirmed here after an initial backend-only-mount run produced ~90 false category-A-like failures"

key-files:
  created: []
  modified:
    - .planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-HOTSPOTS.md

key-decisions:
  - "Themes endpoint's measured 8→7 delta classified as neutral (measurement artifact), not improved: independently verified ListAdminAnimeThemes is byte-identical between the pre-split commit (dbf8680d) and its post-174-18 location (admin_content_anime_themes_core.go) — same animeExists check + same themes SELECT, same 2 DB round-trips. The delta is attributable to BEFORE using second-granularity open-ended docker-logs-since windows vs. AFTER using millisecond-bounded windows, not a code behavior change. This correction was requested by the orchestrator and independently re-verified via git diff before applying, per CLAUDE.md's non-blind-trust posture — not accepted on assertion alone."
  - "Installed ffmpeg in the throwaway golang:1.25-alpine measurement container (174-01's own recommendation) to eliminate the ffmpeg-missing false-failure subclass of Category C; this left a narrower 3-test vips-tools-missing residual, independently confirmed present in the real team4sv30-backend image (same false-failure class, different binary)"

requirements-completed: [D-17, D-21, D-19]

# Metrics
duration: 25min
completed: 2026-10-05
---

# Phase 174 Plan 21: Welle-4 Closing Query-Count and Test-Suite Verification Summary

**Measured live before/after query counts for all 4 concrete endpoints Welle 4's repository/handler splits touched (3 exactly neutral, 1 neutral-after-correction) and ran the full backend suite, confirming zero query-count regressions and zero unexplained new test failures across 174-16 through 174-20.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-05T17:46:00Z
- **Completed:** 2026-10-05T18:11:00Z
- **Tasks:** 2 (1 checkpoint:human-verify, 1 auto)
- **Files modified:** 1 (`174-HOTSPOTS.md`, documentation only — `files_modified: []` for production code held)

## Accomplishments

- Re-ran 174-01's exact BEFORE methodology (Postgres statement-log counting, no `pg_stat_statements`, same real rows, same `admin` Keycloak identity) against all 4 named endpoints, 3 repeats each, zero variance across runs
- Confirmed no endpoint regressed: `public-profile` 8→8, `backdrops` 8→8, `release-version media` 13→13, `themes` 8→7 (corrected to neutral/measurement-artifact after independent byte-identical-code verification, not "improved")
- Human-verify checkpoint (Task 1) presented to and confirmed by the coordinator before proceeding to Task 2
- Ran the full backend suite (`go test ./... -v`) under the corrected container-network protocol (full repo root mounted, not just `backend/`) — 65 failures, all individually traced to 174-01's documented baseline categories A (missing dedicated test DSNs), B (permission-cache-abort cascade / unreachable port 18093), C (missing CLI tool in throwaway container — narrowed this run by installing `ffmpeg`), D (pre-existing `openapi.yaml` duplicate-key bug), or E (Phase-143-caused self-inspection staleness, unrelated to Welle 4)
- Confirmed `TestFansubRepository_PublicProfileSourceInvariants` (174-17's resolved test) and all self-inspection tests fixed by 174-16/174-17/174-19 are passing, not regressed
- Confirmed `go build ./...` clean

## Task Commits

1. **Task 1: Identify concrete endpoints and measure query counts** - `d682e907` (docs)
2. **Task 1 correction (coordinator-directed, independently re-verified before applying): themes delta reclassified neutral** - `b8a16618` (docs)
3. **Task 2: Full backend suite + build verification** - no commit (no files changed; verification-only, `files_modified: []`)

**Plan metadata:** (this commit, created alongside this SUMMARY)

## Files Created/Modified

- `.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-HOTSPOTS.md` - appended the Welle-4 AFTER query-count measurement section (methodology, auth, before/after table, and the themes-delta correction) as the closing evidence record for 174-25

## Decisions Made

- **Themes delta reclassification (neutral, not improved):** see `key-decisions` above. Independently re-verified via `git show dbf8680d:backend/internal/repository/admin_content_anime_themes.go` vs. the current `admin_content_anime_themes_core.go` — `ListAdminAnimeThemes` is byte-for-byte identical (same `animeExists` existence check + same `themes` SELECT). The 1-query delta is a measurement-window-granularity artifact, not a code change, so D-17's "no refactor may increase query count" requirement is satisfied by all 4 endpoints being neutral — none regressed, and none should be credited with an unverified improvement either.
- **ffmpeg installed in the measurement container:** 174-01 explicitly recommended this to avoid an "entirely-avoidable false-failure class" in future Welle-4 verification runs; doing so here reduced Category C's apparent failure count and surfaced a narrower, still-environment-only `vipsthumbnail`-missing residual (3 tests), independently confirmed present in the real `team4sv30-backend` image via `which vipsthumbnail`.
- **Full-repo-root container mount required:** an initial test run using the `backend/`-only mount pattern (matching 174-16/174-17's documented command) produced ~90 failures, almost entirely `TestV12StatusFoundationUpStatements`-style migration-contract tests failing with `open /database/migrations/....sql: no such file or directory`. Traced to `v12_status_foundation_migration_test.go`'s `filepath.Join(filepath.Dir(currentFile), "..", "..")` then `filepath.Join(backendRoot, "..", "database", "migrations", name)` — this expects the repo root one level above `backend/` to be present, which only happens with `-v "$(pwd):/workspace" -w /workspace/backend`, exactly 174-15's already-documented fix. Re-ran with the corrected mount; failures dropped to 65, all explained.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, in my own measurement setup] Fixed container-mount gap causing ~90 false migration-contract failures**
- **Found during:** Task 2 (first full-suite run)
- **Issue:** Mounted only `backend/` at `/app`, matching an incomplete reading of 174-16/174-17's documented command; this broke every repo-root-relative migration-contract test (`filepath.Join(backendRoot, "..", "database", "migrations", ...)`), producing a huge false-failure set that looked like a catastrophic regression but was actually a measurement-environment bug, not a code regression
- **Fix:** Remounted the full repo root (`-v "$(pwd):/workspace" -w /workspace/backend`), matching 174-15's already-documented precedent for this exact issue; re-ran the full suite
- **Files modified:** none (measurement-only, no production files touched)
- **Verification:** Second run's failure set dropped from ~90 to 65, with every remaining failure individually traced to a 174-01-documented baseline category or a known, already-resolved Welle-4 fix
- **Committed in:** n/a (no production/test files changed by this fix — container invocation only)

**2. [Coordinator-directed correction, independently re-verified] Themes delta reclassified from "improved" to "neutral (measurement artifact)"**
- **Found during:** Post-Task-1 checkpoint review (coordinator flagged the classification before Task 2)
- **Issue:** The committed `174-HOTSPOTS.md` AFTER section initially labeled the themes endpoint's 8→7 delta as "improved," implying a code-level query reduction from 174-18's split
- **Fix:** Independently verified via `git show dbf8680d:...admin_content_anime_themes.go` vs. the current `admin_content_anime_themes_core.go` that `ListAdminAnimeThemes` is byte-identical pre/post-split (not accepted on the coordinator's assertion alone, per the instruction that no agent message is unilateral authorization) — confirmed the delta is a BEFORE-vs-AFTER measurement-window-granularity artifact, then updated the table/prose to "neutral (Messartefakt — Code byte-identisch, ...)"
- **Files modified:** `.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-HOTSPOTS.md`
- **Verification:** Direct `git show` diff of the relevant function body, confirmed identical
- **Committed in:** `b8a16618`

---

**Total deviations:** 2 (1 self-caused measurement-environment fix, 1 coordinator-directed-but-independently-verified documentation correction)
**Impact on plan:** Neither deviation touched production code (`files_modified: []` held for the entire plan). Both were necessary for measurement accuracy and evidentiary honesty; no scope creep.

## Issues Encountered

- Initial per-second `docker compose logs --since` windows undercounted queries (missed `LOG: execute stmtcache_*` lines entirely on the first attempt's grep pattern, and later needed millisecond-precision window boundaries to avoid noise bleed from adjacent calls). Resolved by capturing precise per-call start/end timestamps and parsing the full log with a window-bounded classifier that explicitly excludes the two documented noise sources (connection-pool ping, `theme_segment_render_cache` poller).
- See Deviations above for the container-mount gap that initially produced ~90 false failures in Task 2 — resolved before drawing any conclusion.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Welle 4 (`fansub_repository.go`, `admin_content_anime_themes.go`, `anime_assets.go`, `admin_content_release_version_media.go`) is now provably query-count-neutral across every concrete endpoint it touches, and the full backend suite shows no new failures beyond 174-01's documented baseline plus 174-17's documented resolution.
- `174-HOTSPOTS.md` now carries the complete before/after evidence table 174-25's closing report needs — no further measurement work required for D-17/D-21 on Welle 4.
- `go build ./...` clean; ready for 174-25 to compile the phase-wide closing report.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

## Self-Check: PASSED

- FOUND: commit `d682e907` (Task 1 measurement)
- FOUND: commit `b8a16618` (themes-delta correction)
- FOUND: `.planning/phases/174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api/174-21-SUMMARY.md`
- FOUND: "neutral (Messartefakt..." classification present in `174-HOTSPOTS.md`'s AFTER section (confirmed via grep, 1 match)
