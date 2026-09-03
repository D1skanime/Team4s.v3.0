---
phase: 260903-gf0-teststil-konvention-verhalten-testen-sta
plan: 01
subsystem: testing
tags: [conventions, claude-md, go-testing, documentation, altlasten]

# Dependency graph
requires: []
provides:
  - New "### Teststil" convention subsection in CLAUDE.md's ## Conventions, forbidding
    os.ReadFile+strings.Contains "source-inspection" assertions in Go tests and stating it
    overrides the closest-analog convention
  - Expanded WR-02 section in .planning/notes/2026-09-02-altlasten-cr01-wr02.md with the
    measured 49-file/236-assertion/three-package scope and Phase-144 spread evidence
affects: [future backend test remediation phase, any future phase touching internal/handlers,
  internal/repository, internal/services test files]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CLAUDE.md Teststil rule: behavioral assertions must execute code via httptest + fake
      repository, not grep a handler's own .go source file"

key-files:
  created: []
  modified:
    - CLAUDE.md
    - .planning/notes/2026-09-02-altlasten-cr01-wr02.md

key-decisions:
  - "Teststil rule explicitly overrides closest-analog: neighboring test files using the
    antipattern are not valid justification to copy it forward"
  - "49-file/236-assertion backlog documented as Altlast (legacy debt) for a future, separate,
    evidence-led remediation phase — not touched by this quick task"

patterns-established:
  - "Pattern: New CLAUDE.md conventions subsections are pure insertions between existing
    subsections and the conventions-end marker, matching prose style (Pflicht/Verboten/
    Ausnahmen bold lead labels, German prose, no code fences)"

requirements-completed: []

# Metrics
duration: ~5min
completed: 2026-09-03
---

# Phase 260903-gf0-teststil-konvention-verhalten-testen-sta Plan 01: Teststil Convention Summary

**Documented a new CLAUDE.md "Teststil" rule forbidding os.ReadFile+strings.Contains source-inspection tests and recorded the real measured backlog (49 files, 236 assertions) in the WR-02 tracking note.**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-09-03
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- Added a "### Teststil" subsection to CLAUDE.md's Conventions section (after Frontend-UI,
  before the conventions-end marker) that names the os.ReadFile/strings.Contains antipattern,
  requires httptest+fake-repository behavioral execution instead, lists the two legitimate
  exceptions (absence checks, files that are themselves under test), and states explicitly
  that the closest-analog convention never overrides this rule.
- Expanded the WR-02 section of .planning/notes/2026-09-02-altlasten-cr01-wr02.md with the
  full nachgemessen scope: 49 backend test files, 236 assertions, spread across
  internal/handlers, internal/repository, and internal/services — correcting the prior
  two-file review-scope note — and recorded that the new Phase-144 file
  admin_content_release_version_media_replace_test.go already copied the pattern, proving
  active spread rather than static legacy debt.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Teststil convention subsection to CLAUDE.md** - `fd6468cd` (docs)
2. **Task 2: Expand WR-02 section with full measured scope** - `ec4be553` (docs)

_No plan-metadata commit created by this executor per orchestrator instructions — SUMMARY.md,
STATE.md, and PLAN.md commits are handled by the orchestrator, not this quick-task executor._

## Files Created/Modified
- `CLAUDE.md` - New "### Teststil" subsection in "## Conventions" (20 lines added, 0 deleted)
- `.planning/notes/2026-09-02-altlasten-cr01-wr02.md` - WR-02 section gained a "Tatsächlicher
  Umfang (nachgemessen)" paragraph, a spread-evidence paragraph, and a next-steps paragraph
  (21 lines added, 0 deleted); CR-01 section confirmed byte-identical before/after

## Decisions Made
- The Teststil rule uses plural "Ausnahmen" (two exception categories: absence checks, and
  files that are themselves the thing under test) rather than the Frontend-UI subsection's
  singular "Ausnahme", per the plan's explicit instruction.
- Kept all pre-existing WR-02 fields (Dateien, Problem, Sichtbar-beim-Nachmessen, Richtung,
  Umfang) unchanged and added the new measured-scope content as additional paragraphs after
  the existing "Umfang:" paragraph, rather than deleting or rewriting the original two-file
  example — the original review example remains visible alongside the corrected full scope.

## Deviations from Plan

None - plan executed exactly as written. No test file or production code file was modified;
only CLAUDE.md and the WR-02 notes file changed, matching the plan's constraint.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Verification

Ran all four verification checks from the plan's `<verification>` block:

1. `git diff --name-only` across both task commits shows exactly two paths: `CLAUDE.md` and
   `.planning/notes/2026-09-02-altlasten-cr01-wr02.md`. No `_test.go` or other `.go` file
   appears. **Confirmed** — see exact command/output below.
2. In CLAUDE.md, `grep -n` line-number ordering confirms: `GSD:conventions-start` (75) <
   `Sprachqualität` (102) < `Frontend-UI` (112) < `Teststil` (128) < `GSD:conventions-end`
   (147). **Confirmed.**
3. In the notes file, `git diff -U0 ... | grep -c "^-[A-Za-z#]"` returned `0` (no deletions or
   alterations anywhere in the file); a direct byte-diff of the CR-01 section (lines 1-58,
   pre- vs post-edit) confirmed byte-identical. **Confirmed.**
4. The Teststil subsection references
   `.planning/notes/2026-09-02-altlasten-cr01-wr02.md` by exact relative path; the notes
   file's WR-02 section contains the literal strings `49` and `236`. **Confirmed.**

### Literal `git diff --name-only` output (verbatim, run after both task commits)

```
.planning/notes/2026-09-02-altlasten-cr01-wr02.md
CLAUDE.md
```

(Compared against the pre-plan HEAD `fd6468cd~1`; these are the only two files touched by
either task commit. The working tree additionally has one untracked directory,
`.planning/quick/260903-gf0-teststil-konvention-verhalten-testen-sta/`, which holds this
plan and this summary — not part of the plan's file-modification constraint.)

## Next Phase Readiness
- The Teststil rule is now discoverable in CLAUDE.md for any future phase touching
  internal/handlers, internal/repository, or internal/services test files.
- The WR-02 note now carries the full measured backlog (49 files / 236 assertions / three
  packages) as the authoritative scope reference for a future, separate, evidence-led
  remediation phase; that remediation itself is explicitly out of scope for this quick task
  and remains open work.

---
*Phase: 260903-gf0-teststil-konvention-verhalten-testen-sta*
*Completed: 2026-09-03*

## Self-Check: PASSED

- FOUND: commit `fd6468cd` (Task 1)
- FOUND: commit `ec4be553` (Task 2)
- FOUND: `CLAUDE.md`
- FOUND: `.planning/notes/2026-09-02-altlasten-cr01-wr02.md`
- FOUND: `.planning/quick/260903-gf0-teststil-konvention-verhalten-testen-sta/260903-gf0-SUMMARY.md`
