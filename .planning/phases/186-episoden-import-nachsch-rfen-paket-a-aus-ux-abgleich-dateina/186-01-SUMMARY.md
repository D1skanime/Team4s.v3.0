---
phase: 186-episoden-import-nachsch-rfen-paket-a-aus-ux-abgleich-dateina
plan: 01
subsystem: api
tags: [go, refactor, handlers, episode-import, file-split]

# Dependency graph
requires: []
provides:
  - "admin_episode_import.go reduced from 783 to 355 lines, all four touched files <=450 lines"
  - "admin_episode_import_filename_parser.go: isolated Exx/SxxExx/range regex cluster, the exact seam Plan 186-02 (D-03) will replace with the anitogo-backed ReleaseFilenameParser"
  - "admin_episode_import_series_resolution.go: isolated Jellyfin series-by-folder-path resolution cluster"
  - "admin_episode_import_preview_builder.go: isolated preview-assembly cluster (buildEpisodeImportPreview + season-offset/display-path/dedup helpers)"
affects: [186-02]

# Tech tracking
tech-stack:
  added: []
  patterns: ["admin_episode_import_<concern>.go same-package sibling-file split, mirroring commit e1774a6da"]

key-files:
  created:
    - backend/internal/handlers/admin_episode_import_filename_parser.go
    - backend/internal/handlers/admin_episode_import_series_resolution.go
    - backend/internal/handlers/admin_episode_import_preview_builder.go
  modified:
    - backend/internal/handlers/admin_episode_import.go

key-decisions:
  - "Split along the three natural concern clusters named in the plan's <interfaces> map (filename-parsing, series-resolution, preview-building) rather than by line-count alone, matching the existing admin_episode_import_<concern>.go sibling-file convention already used in this handler package."
  - "Landed as a single standalone pure-refactor commit covering all three extraction tasks plus the regression-verification task, per the plan's explicit Task 3 instruction (mirrors commit e1774a6da's discipline) rather than three separate per-task commits."

requirements-completed: [D-04]

# Metrics
duration: 25min
completed: 2026-10-18
---

# Phase 186 Plan 01: Split admin_episode_import.go (D-04 pre-split) Summary

**Pure, behavior-preserving extraction of `admin_episode_import.go` (783 lines) into itself plus three concern-based sibling files (filename-parser, series-resolution, preview-builder), each verified against the full backend test suite before landing as a single standalone commit — unblocking Plan 186-02's D-03 parser-swap content change.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-18T11:53:00Z (approx, first file read)
- **Completed:** 2026-10-18T12:18:14Z
- **Tasks:** 3/3 completed
- **Files modified:** 4

## Accomplishments
- `admin_episode_import.go` shrank from 783 to 355 lines; all three new siblings (87, 148, 236 lines) and the original are now all comfortably under the project's 450-line ceiling.
- Zero behavior change: every moved function body is byte-identical to its pre-split source, verified via the project's full `./scripts/test-backend.sh` run (`GATE: GREEN (0)`, no failures anywhere in the suite, including the full `admin_episode_import_test.go` cluster).
- The filename-parsing cluster — the exact seam Plan 186-02's D-03 anitogo-parser swap will touch next — is now isolated in its own file, so that follow-up change will be a small, reviewable diff against an already-split, already-tested file.

## Task Commits

Because the plan explicitly structures this as three sequential extraction/verification tasks that must land as **one** standalone pure-refactor commit (Task 3's acceptance criteria require `git log -1 --stat` to show exactly the 4 `files_modified` and nothing else, mirroring commit `e1774a6da`'s discipline), all three tasks are captured in a single commit rather than three separate per-task commits:

1. **Task 1: Extract filename-parsing cluster (Cluster A)** — content staged, verified via `go build ./...` (exit 0)
2. **Task 2: Extract series-resolution (Cluster B) and preview-builder (Cluster C) clusters** — content staged, verified via `go build ./...` (exit 0)
3. **Task 3: Full regression verification and pure-refactor commit** — `727d95114` (refactor) — `./scripts/test-backend.sh` run to completion (`GATE: GREEN (0)`), then all 4 files committed together

## Files Created/Modified
- `backend/internal/handlers/admin_episode_import_filename_parser.go` - 3 regexp vars + 5 functions (episodeImportEvidenceEpisodeNumber/SeasonNumber, parseEpisodeImportFilenameSeasonEpisode/Episode/RangeEnd), verbatim move
- `backend/internal/handlers/admin_episode_import_series_resolution.go` - 6 functions (extractAniSearchIDFromSourceLinks, extractJellyfinSeriesIDFromSourceLinks, resolveEpisodeImportSeriesByFolderPath, appendUniqueJellyfinLookupTerms, expandJellyfinLookupTerms, findJellyfinSeriesMatchesByPath), verbatim move
- `backend/internal/handlers/admin_episode_import_preview_builder.go` - 6 functions (buildEpisodeImportPreview, resolveEpisodeImportSuggestedTargets, buildEpisodeImportSeasonBaseOffsets, episodeImportFileName, episodeImportDisplayPath, filterAlreadyMappedCandidates), verbatim move
- `backend/internal/handlers/admin_episode_import.go` - trimmed to the 3 gin handler methods + context/candidate loaders + apply-rehydration logic; import block reduced from 10 to 6 entries (dropped `path`, `regexp`, `slices`, `sort`, `strconv`, `importutil`, none of which the remaining code uses)

## Decisions Made
- Split boundaries followed the plan's `<interfaces>` map exactly (by function/var name, located via `grep`, not by the plan's pre-split line numbers, since those shift after each extraction) — no deviation needed, the plan's inventory matched the live code precisely.
- Single combined commit for all three tasks, per the plan's explicit Task 3 instruction overriding the default one-commit-per-task cadence — this is not a deviation, it is the plan's own mandated structure, intentionally mirroring the `e1774a6da` precedent.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria for all three tasks were met without needing any Rule 1-4 auto-fixes:
- `go build ./...` succeeded with zero errors/warnings after both extraction tasks.
- `grep -c "func "` on the filename-parser file returned exactly 5.
- `admin_episode_import.go` no longer contains `episodeImportFilenameRangePattern` (verified absent).
- All four files are at or below 450 lines (355 / 87 / 148 / 236).
- `./scripts/test-backend.sh` exited 0 with `GATE: GREEN (0)` and zero `--- FAIL` lines anywhere in the full log, including the `handlers` package (`ok team4s.v3/backend/internal/handlers 22.555s`) and the full `admin_episode_import_test.go` cluster.
- The final commit (`727d95114`) stages exactly the 4 files from `files_modified`, with a `refactor(186-01):` prefix and no `feat`/`fix` content.

## Self-Check: PASSED

- FOUND: backend/internal/handlers/admin_episode_import.go
- FOUND: backend/internal/handlers/admin_episode_import_filename_parser.go
- FOUND: backend/internal/handlers/admin_episode_import_series_resolution.go
- FOUND: backend/internal/handlers/admin_episode_import_preview_builder.go
- FOUND: commit 727d95114 (refactor(186-01) split commit)
