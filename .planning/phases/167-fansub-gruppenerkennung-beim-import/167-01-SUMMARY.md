---
phase: 167-fansub-gruppenerkennung-beim-import
plan: 01
subsystem: api
tags: [go, regexp, importutil, fansub-parsing, table-driven-tests]

# Dependency graph
requires: []
provides:
  - "Hardened DeriveFansubGroupName(fileName, fullPath string) string in backend/internal/importutil/fansub_group.go — filename-only evidence (D-05), uniform technical-token denylist applied to every candidate (D-06), new scene-schema prefix pattern (D-07)"
  - "New DeriveReleaseVersion(fileName string) (string, bool) in backend/internal/importutil/fansub_release_version.go for D-04 version detection (v2/v3/v4)"
  - "First real test coverage for backend/internal/importutil (previously zero tests) — 16 sub-tests for the group parser, 6 for the version detector"
affects: [167-02, 167-05, 167-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Uniform technical-token denylist (isTechnicalGroupToken/isTechnicalToken) applied identically to every parser candidate (bracket, scene-prefix, suffix) instead of per-branch ad-hoc checks"
    - "Left-to-right first-non-technical-match scanning over FindAllStringSubmatch instead of trusting the first regex match unconditionally"

key-files:
  created:
    - backend/internal/importutil/fansub_group_test.go
    - backend/internal/importutil/fansub_release_version.go
    - backend/internal/importutil/fansub_release_version_test.go
  modified:
    - backend/internal/importutil/fansub_group.go

key-decisions:
  - "D-05/D-06/D-07 implemented exactly as researched: evidence selection changed from always-concatenate to filename-only-with-path-fallback; denylist unified across all three match branches; new scene-prefix pattern gated on a real sXXeYY marker so unrelated hyphenated filenames stay empty"
  - "D-04 implemented as a single anchored regex v([2-9])$ with no preceding-separator requirement, uniformly handling both glued-to-bracket and separated forms"

requirements-completed: [REQ-167-01, REQ-167-02, REQ-167-03, REQ-167-04, REQ-167-05, REQ-167-06, REQ-167-18]

# Metrics
duration: 22min
completed: 2026-09-23
---

# Phase 167 Plan 01: Fansub-Gruppenerkennung-Parser Summary

**Hardened `DeriveFansubGroupName` (filename-only evidence, uniform technical-token denylist, new scene-schema pattern) plus a new `DeriveReleaseVersion(v2/v3/v4)` detector, both proven against the 13 real filenames from the Auftraggeber's measurement table with real table-driven tests where none existed before.**

## Performance

- **Duration:** ~22 min (first commit 14:06:40Z, last task commit 14:08:43Z, plus context-loading time)
- **Started:** 2026-09-23T13:xx (context load)
- **Completed:** 2026-09-23T14:08:43Z
- **Tasks:** 2/2 completed
- **Files modified:** 4 (1 modified, 3 created)

## Accomplishments
- `DeriveFansubGroupName` now evaluates only the filename (D-05); `fullPath` is consulted solely when the filename is empty, closing the false-positive risk from parent-directory brackets.
- A single uniform denylist (`isTechnicalGroupToken`/`isTechnicalToken`) rejects CRC checksums, resolutions, codec/container tags, and language/source tags as group names regardless of which branch or bracket position they appear in (D-06) — fixes `Serie_01_[AEC71BC3].mkv` (was `AEC71BC3`, now correctly empty) and closes the bracket-ordering risk flagged in research as Pitfall 4.
- New scene-schema prefix pattern (`gruppe-titel.sXXeYY...`) recognizes releases like `dmpd-mashle...s01e17...` (was empty, now correctly `dmpd`) without regressing the four previously-working schemas (D-07).
- New `DeriveReleaseVersion` function detects `v2`/`v3`/`v4` at the true end of a filename, including the real glued-to-bracket fixture `[GK]No Game, No Life - 01(720p 10bit)[C281B950]v4.mkv` -> `("v4", true)`, while never surfacing `v1` as detected (D-04).
- `backend/internal/importutil` went from zero tests to 22 real, executing table-driven sub-tests (D-10) — all calling the exported functions directly and asserting on return values, no source-inspection pattern.

## Task Commits

Each task followed the RED/GREEN TDD cycle and was committed atomically:

1. **Task 1: Harden DeriveFansubGroupName** —
   - `484416eb` (test): RED — failing table-driven test with all 13 real filenames + 3 edge cases; 3 sub-tests failed against the unhardened baseline (dmpd scene-schema, CRC-as-group, bracket-ordering), confirming the exact discrepancies documented in 167-RESEARCH.md Section 2.
   - `7d2b0918` (feat): GREEN — rewrote the parser in place with filename-only evidence selection, the uniform denylist, and the new scene-prefix pattern. All 16 sub-tests pass; the pre-existing repository-level sanity test (`TestEpisodeImportReleaseGraphHelpers_DeriveGroupAndFilename`) does not regress.
2. **Task 2: Release-version detection (v2/v3/v4)** —
   - `8916999c` (test): RED — failing table-driven test; build fails because `DeriveReleaseVersion` did not exist yet.
   - `b8aaebfc` (feat): GREEN — new file `fansub_release_version.go` with the anchored `(?i)v([2-9])$` regex. All 6 sub-tests pass.

**Plan metadata:** committed alongside this SUMMARY (see below).

## Files Created/Modified
- `backend/internal/importutil/fansub_group.go` (167 lines) — rewritten in place; exported signature unchanged so both existing call sites (`admin_episode_import.go:438`, `episode_import_repository_release_helpers.go:427`) keep compiling without edits. New unexported helpers: `firstNonTechnicalBracketGroup`, `isTechnicalGroupToken`, `isTechnicalToken`. New patterns: `scenePrefixGroupPattern`, `sceneEpisodeMarkerPattern`, plus the denylist's `hex8Pattern`/`pureDigitsPattern`/`resolutionPPattern`/`resolutionWxHPattern`/`multiTokenSplitPattern` and the `technicalCompoundTokens`/`technicalLanguageTokens` sets.
- `backend/internal/importutil/fansub_group_test.go` (112 lines, new) — `TestDeriveFansubGroupName`, 16 sub-tests (13 real filenames + 3 edge cases).
- `backend/internal/importutil/fansub_release_version.go` (39 lines, new) — `DeriveReleaseVersion(fileName string) (string, bool)`.
- `backend/internal/importutil/fansub_release_version_test.go` (63 lines, new) — `TestDeriveReleaseVersion`, 6 sub-tests.

All four files are well under the CLAUDE.md 450-line ceiling.

## Decisions Made
- Followed the plan's design exactly: a single `isTechnicalToken` check for one token, reused both as a whole-candidate check (handles compound tokens like `H.264` -> `h264` and `1280x720`) and per-part in a fallback split on `[._\s-]+` (handles multi-token brackets like `Web.1080p.AAC` where every part is individually technical, while correctly sparing real group names like `FH-Subs`/`Pure-Ani-me`/`L-S` where at least one part is not technical).
- No deviation from the plan's regex/design recommendations was needed — hand-tracing every one of the 13 real filenames plus the 3 edge cases against the implementation before running tests matched the RED failures exactly (3 failing sub-tests, precisely the two documented "falsch" cases plus the new bracket-ordering edge case), and the GREEN implementation passed on the first attempt with no fix-up iterations.

## Deviations from Plan

None — plan executed exactly as written. Both tasks followed the mandatory TDD RED-then-GREEN sequence; no Rule 1-4 auto-fixes were needed since the design in the plan's `<action>` sections was precise enough to implement directly and pass all tests without iteration.

## Issues Encountered

**Test execution environment:** The `team4sv30-backend` container has no live bind mount of the backend source (only a `docker compose watch` sync target, which is not an actively running watch process in this session) — `go` itself is only present in the dev container (`Dockerfile.dev`, not the production `Dockerfile`). Worked around by `docker compose cp`-ing each new/changed Go file into the running container's `/app` tree before each `go test`/`go build`/`go vet`/`gofmt` invocation. This is a test-environment mechanic only; no source code or plan behavior was affected, and the final `go build ./...` (full package tree, host-side files unchanged) and `go vet ./...` both passed clean inside the container after all four files were copied in.

## User Setup Required

None — no external service configuration required. Pure Go stdlib (`regexp`, `strings`, `path`, `path/filepath`), no new dependencies.

## Next Phase Readiness

`DeriveFansubGroupName` and `DeriveReleaseVersion` are ready for Plan 02 (batch alias/name/slug resolution) to consume as the candidate-string source, and for Plan 05/07 (preview-time wiring and UI origin hint) to call `DeriveReleaseVersion` for the release-version proposal. No blockers. The two existing call sites of `DeriveFansubGroupName` are untouched and still compile/behave as documented fallbacks — Plan 02/03 will need to address the separate apply-time auto-upsert path (`upsertImportFansubGroup`) that this plan intentionally did not touch (D-03 is out of this plan's scope per its frontmatter).

---
*Phase: 167-fansub-gruppenerkennung-beim-import*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 4 created/modified files verified present on disk; all 4 task commit hashes (`484416eb`, `7d2b0918`, `8916999c`, `b8aaebfc`) verified present in `git log`.
