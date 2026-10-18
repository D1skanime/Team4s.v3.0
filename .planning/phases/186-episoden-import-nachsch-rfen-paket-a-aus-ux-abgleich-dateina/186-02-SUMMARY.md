---
phase: 186-episoden-import-nachsch-rfen-paket-a-aus-ux-abgleich-dateina
plan: 02
subsystem: api
tags: [go, backend, episode-import, parser, anitogo, bugfix]

# Dependency graph
requires: ["186-01"]
provides:
  - "services.ReleaseFilenameParser interface + AnitogoReleaseFilenameParser implementation, swappable without call-site changes"
  - "episodeImportEvidenceEpisodeNumber's innermost Exx-regex fallback replaced by the anitogo-backed parser (CRC-as-episode-number bug, Finding #15, fixed)"
  - "buildEpisodeImportPreview's trailing-variadic parser plumbing, consumed by PreviewEpisodeImport via h.releaseFilenameParser"
affects: []

# Tech tracking
tech-stack:
  added: ["github.com/nssteinbrenner/anitogo v1.0.0 (MPL-2.0)"]
  patterns: ["Mailer/SMTPMailer/NoopMailer interface-swap seam reused for ReleaseFilenameParser/AnitogoReleaseFilenameParser", "trailing variadic optional-parameter pattern (mirrors loadEpisodeImportContext's resolveSeries ...bool) to extend buildEpisodeImportPreview without breaking existing test call sites"]

key-files:
  created:
    - backend/internal/services/release_filename_parser.go
    - backend/internal/services/release_filename_parser_test.go
    - backend/internal/handlers/admin_episode_import_filename_parser_test.go
  modified:
    - backend/go.mod
    - backend/go.sum
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_episode_import_filename_parser.go
    - backend/internal/handlers/admin_episode_import_preview_builder.go
    - backend/internal/handlers/admin_episode_import.go

key-decisions:
  - "anitogo types (anitogo.Elements) never cross into the handlers package -- the project-owned ReleaseFilenameParseResult struct is the only thing that crosses the services->handlers boundary, verified via grep returning zero matches."
  - "Parser threaded through buildEpisodeImportPreview as a trailing variadic argument rather than a required parameter, so the 7 pre-existing test call sites in admin_episode_import_test.go needed zero changes (git diff on that file is empty)."
  - "Jellyfin-metadata-first, then-SxxExx, then-filename-fallback priority order is completely unchanged -- only the innermost Exx-only fallback step was replaced; a nil parser defensively falls back to the old regex."

requirements-completed: [D-03]

# Metrics
duration: ~55min
completed: 2026-10-18
---

# Phase 186 Plan 02: anitogo-backed ReleaseFilenameParser (D-03, Finding #15) Summary

**Replaced the bug-prone hand-rolled `Exx` fallback regex (which misread CRC tags like `[E61CA0BA]` as episode 61) with `github.com/nssteinbrenner/anitogo` behind a new, swappable `services.ReleaseFilenameParser` interface, mirroring the existing `Mailer`/`SMTPMailer`/`NoopMailer` seam.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-10-18T11:43:00Z (approx, first file read)
- **Completed:** 2026-10-18T12:40:00Z
- **Tasks:** 3/3 completed
- **Files modified/created:** 9 (2 dependency files, 4 modified handler/service files, 3 new files)

## Accomplishments

- A filename like `[SubsPlease] Attack on Titan - 01 (1080p) [E61CA0BA].mkv` now correctly resolves to episode 1, not episode 61 -- verified both in an isolated parser unit test and end-to-end through the full `buildEpisodeImportPreview` pipeline.
- Checksum/CRC values are extracted into a dedicated `ReleaseFilenameParseResult.Checksum` field and can never leak into the episode number field (defensive collision assertion included in the test).
- v2/v3 batch-release suffixes (`"Jujutsu Kaisen - 05v2"`, `"One Piece - 1085v3"`) and Specials/OVA filenames (`SP01`, `S00E01`) all resolve correctly via the new parser.
- All 15 real `release_variants.filename` values produce byte-identical episode results before and after this change -- the old-vs-new regression test proves this is not just claimed but mechanically checked on every test run.
- `anitogo`-specific types never appear in the `handlers` package (`grep -rn "anitogo\." backend/internal/handlers/` returns zero matches) -- only the project-owned `ReleaseFilenameParser` interface and `ReleaseFilenameParseResult` struct cross that boundary.
- The `google/uuid` and `golang.org/x/text` versions in `go.mod` are byte-identical to before (Minimal Version Selection picked up the project's already-newer versions, as predicted in the plan).
- Backend container rebuilt (`docker compose up -d --build team4sv30-backend`) and `/health` confirmed `{"status":"ok"}` with no startup errors.

## Task Commits

1. **Task 1: Add the anitogo dependency and the ReleaseFilenameParser interface + impl** — `91c5b2b29` (feat) — `go build ./internal/services/...` exit 0; `go.mod`/`go.sum` diff shows exactly one new direct require line
2. **Task 2: Wire the parser into the preview pipeline (handler struct + call chain)** — `caa16903f` (feat) — `go build ./...` exit 0; `admin_episode_import_test.go` diff empty (7 existing call sites untouched)
3. **Task 3: Write the two mandatory test groups and run the full suite** — `cecd75e22` (test) — `./scripts/test-backend.sh` → `GATE: GREEN (0)`; targeted re-runs confirmed all 6 + 15 + 1 new subtests pass

## Files Created/Modified

- `backend/internal/services/release_filename_parser.go` - new `ReleaseFilenameParseResult` struct, `ReleaseFilenameParser` interface, `AnitogoReleaseFilenameParser` impl + constructor, compile-time `var _ ReleaseFilenameParser = (*AnitogoReleaseFilenameParser)(nil)` assertion, MPL-2.0 license-note doc comment
- `backend/internal/services/release_filename_parser_test.go` - `TestAnitogoReleaseFilenameParser_ParseFilename`, table-driven, 6 subtests (CRC-tagged, multi-subtitle CRC-tagged, v2/v3 batch suffix, SP01/S00E01 specials)
- `backend/internal/handlers/admin_episode_import_filename_parser_test.go` - `TestEpisodeImportEvidenceEpisodeNumber_RegressionAgainstRealFilenames` (15 real filenames, old-vs-new parity) + `TestPreviewEpisodeImport_CRCTagDoesNotLeakIntoEpisodeNumber` (full-pipeline integration test)
- `backend/internal/handlers/admin_content_handler.go` - new `releaseFilenameParser services.ReleaseFilenameParser` field, constructed in `NewAdminContentHandler` alongside the existing `aniSearchEpisodes` wiring
- `backend/internal/handlers/admin_episode_import_filename_parser.go` - `episodeImportEvidenceEpisodeNumber` gains a `parser services.ReleaseFilenameParser` parameter; innermost fallback now calls `parser.ParseFilename`, with a nil-safe defensive fallback to the old `parseEpisodeImportFilenameEpisode` regex
- `backend/internal/handlers/admin_episode_import_preview_builder.go` - `buildEpisodeImportSeasonBaseOffsets` and `resolveEpisodeImportSuggestedTargets` thread the parser through; `buildEpisodeImportPreview` gains a trailing variadic `parser ...services.ReleaseFilenameParser` parameter
- `backend/internal/handlers/admin_episode_import.go` - `PreviewEpisodeImport` passes `h.releaseFilenameParser` as the 9th argument to `buildEpisodeImportPreview`
- `backend/go.mod` / `backend/go.sum` - one new direct require: `github.com/nssteinbrenner/anitogo v1.0.0`

## Decisions Made

- Followed the plan's exact variadic-parameter design for `buildEpisodeImportPreview` rather than a required parameter, specifically to avoid touching `admin_episode_import_test.go` (confirmed via `git diff` on that file being empty after the commit).
- Kept `go get` + `go mod tidy` as a combined operation but discovered (and worked around) that running them *before* the consuming Go file exists causes `go mod tidy` to immediately remove the unused dependency again -- the correct order is: write the file that imports the package first, then run `go get`/`go mod tidy` together.
- License-note comment placed directly above the `AnitogoReleaseFilenameParser` type (not in a separate NOTICE file), per the plan's explicit fallback instruction since no repo-wide NOTICE/THIRD-PARTY file exists.

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria for all three tasks were met without needing any Rule 1-4 auto-fixes beyond the documented go-get/go-mod-tidy ordering learning above (which is a process detail, not a deviation from any plan acceptance criterion).

- `git diff backend/go.mod` shows exactly one new direct require line for `github.com/nssteinbrenner/anitogo`; `google/uuid` and `golang.org/x/text` version strings are byte-identical to before.
- `grep -n "var _ ReleaseFilenameParser" backend/internal/services/release_filename_parser.go` finds the compile-check line.
- `grep -rn "anitogo\." backend/internal/handlers/` returns zero matches.
- `go build ./...` succeeded with zero errors after both backend tasks.
- `grep -n "parser ...services.ReleaseFilenameParser" backend/internal/handlers/admin_episode_import_preview_builder.go` finds the variadic signature; `grep -n "h.releaseFilenameParser" backend/internal/handlers/admin_episode_import.go` finds the call-site wiring.
- The 7 pre-existing `buildEpisodeImportPreview(...)` call sites in `admin_episode_import_test.go` remain byte-identical.
- `./scripts/test-backend.sh` exited 0 with `GATE: GREEN (0)`; targeted re-runs confirmed `TestAnitogoReleaseFilenameParser_ParseFilename` (6/6), `TestEpisodeImportEvidenceEpisodeNumber_RegressionAgainstRealFilenames` (15/15), and `TestPreviewEpisodeImport_CRCTagDoesNotLeakIntoEpisodeNumber` all pass.
- `git diff --stat` for Task 3's commit touches only the 2 new test files.
- Backend container rebuilt via `docker compose up -d --build team4sv30-backend`; `/health` returns `{"status":"ok"}`.
- All touched files remain at or below the 450-line CLAUDE.md ceiling: `admin_content_handler.go` 441, `admin_episode_import_preview_builder.go` 249, `admin_episode_import_filename_parser.go` 103, `admin_episode_import.go` 356.

## Self-Check: PASSED

- FOUND: backend/internal/services/release_filename_parser.go
- FOUND: backend/internal/services/release_filename_parser_test.go
- FOUND: backend/internal/handlers/admin_episode_import_filename_parser_test.go
- FOUND: commit 91c5b2b29 (feat, Task 1)
- FOUND: commit caa16903f (feat, Task 2)
- FOUND: commit cecd75e22 (test, Task 3)
