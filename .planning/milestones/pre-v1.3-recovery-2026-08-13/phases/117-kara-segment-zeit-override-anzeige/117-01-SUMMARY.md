---
phase: 117-kara-segment-zeit-override-anzeige
plan: 01
subsystem: database
tags: [postgresql, migrations, theme_segments, kara-segments, release_versions]

# Dependency graph
requires:
  - phase: (none — Wave 1, no upstream Phase 117 plan dependencies)
    provides: (n/a)
provides:
  - "theme_segment_assignments table (many-to-many Kara <-> release_version, D-03)"
  - "additive composite UNIQUE (theme_segment_id, release_version_id) on theme_segment_playback_sources, coexisting with legacy 1:1 index"
  - "theme_segment_episode_overrides table (per-(segment, release-version) time override, D-01), composite FK against theme_segment_assignments"
  - "theme_segment_render_cache.release_version_id column + index (fixes RESEARCH.md Risk 1 cache-key episode collision)"
  - "backfilled assignment/playback data for pre-existing segments"
affects: [117-02, 117-03, 117-04, 117-05, 117-06, 117-07, 117-08, 117-09]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Nyquist-Fix W1: additive schema landed before dependent code changes to avoid a live-dev SQL-error window on main"]

key-files:
  created:
    - database/migrations/0141_theme_segment_assignments.up.sql
    - database/migrations/0141_theme_segment_assignments.down.sql
    - database/migrations/0142_theme_segment_episode_overrides.up.sql
    - database/migrations/0142_theme_segment_episode_overrides.down.sql
    - database/migrations/0143_theme_segment_render_cache_release_version.up.sql
    - database/migrations/0143_theme_segment_render_cache_release_version.down.sql
  modified: []

key-decisions:
  - "Old 1:1 UNIQUE index uq_theme_segment_playback_sources_segment on theme_segment_playback_sources was deliberately NOT dropped in this plan (Nyquist-Fix W1) — it coexists with the new composite UNIQUE index until Plan 117-03 drops it atomically with the ON CONFLICT code change in syncThemeSegmentPlaybackSourceTx"
  - "Backfill CTE reused the resolved_variant join shape from admin_content_anime_themes.go, additionally filtered on episode range (start_episode..end_episode) to fix RESEARCH.md Risk 3 already at backfill time"

patterns-established:
  - "Append-only migration pairs (0141/0142/0143) following existing uq_<table>_<columns>/idx_<table>_<columns> naming and CREATE ... IF NOT EXISTS convention"

requirements-completed: [D-01, D-02, D-03]

# Metrics
duration: 15min
completed: 2026-07-29
---

# Phase 117 Plan 01: Segment-Schema-Grundlage (Zuweisung, Zeit-Override, Render-Cache-Diskriminator) Summary

**Drei additive Migrationen (0141/0142/0143) legen das volle-Option-B-Schema für ein geteiltes, pro Release-Version zuweisbares Kara-Segment mit Per-Version-Zeit-Override, koexistierend mit dem alten 1:1-Playback-Index bis Plan 117-03.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-29T13:41:00Z (approx.)
- **Completed:** 2026-07-29T13:43:39Z
- **Tasks:** 2/2 completed
- **Files modified:** 6 (all new migration files)

## Accomplishments
- `theme_segment_assignments` table created — explicit many-to-many relation between a Kara-Segment and a `release_versions.id`, replacing the implicit "one segment row per episode" pattern with a real, admin-controlled assignment relation (D-03).
- Additive composite UNIQUE index `uq_theme_segment_playback_sources_segment_version` added to `theme_segment_playback_sources`, allowing a per-(segment, release-version) playback binding to coexist with the pre-existing 1:1 index — no live-dev breakage window opened (Nyquist-Fix W1, verified in threat register T-117-01-03).
- `theme_segment_episode_overrides` table created with a composite FK against `theme_segment_assignments`, structurally preventing an override from existing without a real assignment (D-01) — verified live with a rejected INSERT (Postgres 23503).
- `theme_segment_render_cache.release_version_id` column + composite index added, resolving RESEARCH.md Risk 1 (render-cache key previously had no per-episode discriminator).
- Backfill of all pre-existing `theme_segment_playback_sources` rows into `theme_segment_assignments`, filtered to the actual episode range (fixes RESEARCH.md Risk 3 at backfill time, not just going forward) — verified: 2/2 segments backfilled, 0 rows left with `release_version_id IS NULL`.
- `RAISE NOTICE` block in migration 0141 answers RESEARCH.md Open Question 2 at execution time (count of real multi-episode-range segments in current data) without failing the migration on any result.

## Task Commits

Each task was committed atomically:

1. **Task 1: Migration 0141 — theme_segment_assignments + additive composite UNIQUE + backfill** - `2ca60ef5` (feat)
2. **Task 2: Migration 0142 (per-version time override) + Migration 0143 (render-cache release_version discriminator)** - `0b39a773` (feat)

_No plan-metadata commit required a separate hash beyond this SUMMARY commit._

## Files Created/Modified
- `database/migrations/0141_theme_segment_assignments.up.sql` - New assignment table, additive playback composite unique, backfill of existing segments
- `database/migrations/0141_theme_segment_assignments.down.sql` - Reversal (drops new index/column/table only; leaves the legacy 1:1 index untouched)
- `database/migrations/0142_theme_segment_episode_overrides.up.sql` - Per-version time override table with composite FK + time-range CHECK
- `database/migrations/0142_theme_segment_episode_overrides.down.sql` - Drops the override table
- `database/migrations/0143_theme_segment_render_cache_release_version.up.sql` - Adds nullable `release_version_id` + index to render cache
- `database/migrations/0143_theme_segment_render_cache_release_version.down.sql` - Drops the column

## Decisions Made
- Kept both UNIQUE indexes (`uq_theme_segment_playback_sources_segment` legacy 1:1 and `uq_theme_segment_playback_sources_segment_version` new composite) coexisting on `theme_segment_playback_sources` through this plan, exactly as the plan's Nyquist-Fix W1 specifies, to avoid breaking the still-unmodified `syncThemeSegmentPlaybackSourceTx` `ON CONFLICT (theme_segment_id)` code path on `main` between now and Plan 117-03.
- Reused the exact join shape of the existing `resolved_variant` CTE (`admin_content_anime_themes.go:1366-1391`) for the backfill, additionally constraining to the segment's `start_episode..end_episode` range (the filter that CTE itself is missing per RESEARCH.md Risk 3) — this means the backfill itself is more correct than the runtime resolution logic it will eventually replace.

## Deviations from Plan

**None — plan executed exactly as written.** One environment-level correction was required to run verification (not a plan deviation, a local-execution detail): `go run ./cmd/migrate` run from `backend/` resolves its migrations directory candidate list starting with `database/migrations` relative to cwd, which matches an unrelated pre-existing `backend/database/migrations/` directory (1 legacy media-table migration, per `./CLAUDE.md` "Additional backend-local migration assets exist under `backend/database/migrations/`") before it would reach the real `database/migrations/` at repo root. All verification commands were run with an explicit `-dir "<repo-root>/database/migrations"` flag to target the correct directory; no code or migration files were changed to address this, and the plan's own verify commands are correct when run with the project's real migrations path.

## Issues Encountered
- A stale `.git/index.lock` (no `git.exe` process running, timestamp from an earlier, already-finished session) blocked the first commit attempt. Verified no live git process (`tasklist`), then removed the stale lock file before staging/committing — consistent with prior session guidance on parallel GSD writers on `main` (checked for a live writer first; there was none).

## Verification Evidence (live, against local Docker Postgres)

- `go run ./cmd/migrate up` applied 0141 (then 0142+0143) cleanly against `team4sv30-db` (host port 5433, db `team4s_v2`).
- `\d theme_segment_assignments`: `uq_theme_segment_assignments_segment_version` UNIQUE on `(theme_segment_id, release_version_id)` confirmed.
- `\d theme_segment_playback_sources`: both `uq_theme_segment_playback_sources_segment` (legacy) and `uq_theme_segment_playback_sources_segment_version` (new) present simultaneously, plus new `release_version_id` column.
- Backfill counts: `theme_segments`=2, `theme_segment_playback_sources`=2, `theme_segment_assignments`=2, rows with `release_version_id IS NULL` in playback sources = 0.
- `\d theme_segment_episode_overrides`: composite FK `fk_theme_segment_episode_override_assignment` confirmed against `theme_segment_assignments(theme_segment_id, release_version_id)`.
- Manual `INSERT INTO theme_segment_episode_overrides` with a `(theme_segment_id, release_version_id)` pair absent from `theme_segment_assignments` failed with Postgres error 23503 (foreign_key_violation) as required.
- `\d theme_segment_render_cache`: new nullable `release_version_id` column + `idx_theme_segment_render_cache_segment_version` index confirmed.
- Round-trip for both task migration groups verified: `down -steps=1` / `up` for 0141, and `down -steps=2` / `up` for 0142+0143 — both ran without error, and post-round-trip backfill counts (`theme_segment_assignments`=2, `release_version_id IS NULL`=0) were unchanged, confirming the down migration correctly reverses only the additive schema without corrupting re-applied backfill state.
- `schema_migrations` table confirms versions 141/142/143 all in `applied` state after the final `up`.

## User Setup Required

None - no external service configuration required. Verification ran directly against the existing local Docker Postgres instance (`team4sv30-db`, host port 5433).

## Next Phase Readiness

- Full Option B schema foundation (assignment table, per-version override table, render-cache discriminator) is live and backfilled in the local dev database — Plan 117-02 onward can build repository/handler/UI logic against it.
- The legacy 1:1 `uq_theme_segment_playback_sources_segment` index remains in place by design; Plan 117-03 Task 1 must drop it (new migration 0144) atomically with the `syncThemeSegmentPlaybackSourceTx` `ON CONFLICT` code change — until then, any new segment-creation code path must continue to write only one playback-source row per `theme_segment_id`, exactly as today's unmodified code already does.
- No blockers identified for Plan 117-02.

---
*Phase: 117-kara-segment-zeit-override-anzeige*
*Completed: 2026-07-29*

## Self-Check: PASSED

All 6 created migration files verified present on disk; task commits `2ca60ef5` and `0b39a773` verified present in `git log`.
