---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
plan: 13
subsystem: testing
tags: [go, testquality, ratchet-guard, ast-free-scanner, ciless-enforcement]

# Dependency graph
requires:
  - phase: 146-04 through 146-12
    provides: 16 remediated security-relevant test files (real httptest/Postgres calls replacing os.ReadFile substring proofs) plus 4 already-compliant absence-only files
provides:
  - Re-measured, confirmed post-remediation state (45 files still read .go source; 11 of 20 security-relevant files remain, all absence-only; 9 fully clean)
  - backend/internal/testquality/source_substring_guard_test.go — go-test-executed ratchet guard (TestSecurityRelevantFilesNeverInLegacyExceptionList, TestNoNewSourceSubstringTests)
  - 146-SUBSTRING-TEST-REMAINDER.md — named, per-file Criterion 8 debt documentation for the 34 remaining non-security files
affects: [future-testquality-phases, any-phase-touching-backend-test-files]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Go-native ratchet-list guard (frozen []string exception list + go-test-executed scanner), ported from frontend/eslint.config.mjs's LEGACY_NO_RESTRICTED_SYNTAX_FILES shape — first Go-language instance of this pattern in the repo"
    - "Per-function variable-provenance tracing (regex-based, fixed-point) to distinguish source-substring presence claims from unrelated behavioral Contains assertions co-located in the same file"

key-files:
  created:
    - backend/internal/testquality/source_substring_guard_test.go
    - .planning/phases/146-registry-selbstschutz-und-sanierung-der-quelltext-substring-/146-SUBSTRING-TEST-REMAINDER.md
  modified: []

key-decisions:
  - "LegacyAllowedSubstringTestFiles is the full 34-file non-security 'Übrige' remainder (matching measure-substring-tests.py's own reproducible os.ReadFile(...\".go\") detection), not a hand-filtered presence-only subset — this keeps the exception list itself trivially reproducible against the same script D-08 already established as authoritative, while the guard's own runtime detector independently applies the stricter presence-vs-absence distinction only to decide which NEW files get flagged."
  - "member_archive_repository_test.go (one of the 20 locked SecurityRelevantTestFiles) is excluded from LegacyAllowedSubstringTestFiles even though the raw measurement script's own keyword filter reclassified it as non-security post-remediation — the frozen SecurityRelevantTestFiles list from Plan 146-04, not the script's dynamic re-classification, is authoritative for what counts as security-relevant."
  - "All 11 of the 20 locked security-relevant files still containing an os.ReadFile(...\".go\") call were individually re-read and confirmed to contain ONLY the CLAUDE.md exception-1 sanctioned absence check, never a presence-style claim — Criterion 5/6 closes with zero remaining security-relevant violations, satisfying the guard's core empty-intersection assertion."

requirements-completed: ["Criterion 6", "Criterion 7", "Criterion 8"]

# Metrics
duration: ~90min
completed: 2026-09-04
---

# Phase 146 Plan 13: Registry-Selbstschutz und Sanierung — Ratchet Guard and Remainder Documentation Summary

**Go-native, `go test`-executed ratchet guard (no CI/lint in this repo) locking the post-remediation state at 34/53 remaining source-substring test files, zero of them security-relevant, with a frozen shrink-only exception list modeled on the frontend's existing ESLint ratchet pattern.**

## Performance

- **Duration:** ~90 min
- **Completed:** 2026-09-04T20:09:51Z
- **Tasks:** 3 (1 measurement/verification-only, 2 file-producing)
- **Files modified:** 2 created

## Accomplishments

- Re-ran `.planning/notes/measure-substring-tests.py` against the current tree and confirmed the
  post-Plan-146-04..12 state: 45 of the original 53 files still contain an
  `os.ReadFile(...".go")` call (down from 53); of the 20 locked `SecurityRelevantTestFiles`, 9
  are fully clean (zero remaining `os.ReadFile(.go)` calls) and 11 remain but were individually
  re-read and confirmed to hold ONLY the CLAUDE.md Teststil exception-1 sanctioned absence check
  — zero presence-style violations remain among the security-relevant set. This closes Criterion
  5/6's security-relevant clause.
- Built `backend/internal/testquality/source_substring_guard_test.go`: a `go test`-executed
  scanner (`TestNoNewSourceSubstringTests`) that walks every `backend/**/*_test.go` file, uses
  per-function variable-provenance tracing to identify genuine presence-style
  `os.ReadFile(...".go")` + `strings.Contains`/`assert.Contains`/`require.Contains`/negated-Contains
  assertions (as opposed to unrelated behavioral assertions co-located in the same file), and
  fails the build if any such file exists outside the frozen `LegacyAllowedSubstringTestFiles`
  ratchet list. A second test (`TestSecurityRelevantFilesNeverInLegacyExceptionList`) proves the
  two frozen lists are disjoint.
- Manually verified the guard's negative case during implementation: injected a scratch test
  file (`internal/testquality/scratch_violation_test.go`) outside the exception list with a
  presence-style `os.ReadFile` + `strings.Contains` assertion, confirmed
  `TestNoNewSourceSubstringTests` failed with a clear, named error message, then deleted the
  scratch file before committing.
- Documented all 34 remaining non-security-relevant files by exact relative path with a
  per-file reason in `146-SUBSTRING-TEST-REMAINDER.md`, grouped by area (repository-layer,
  handler-layer, cross-cutting), plus the headline measurement numbers and the carried-forward
  `IsHistoricalMemberRoleCode` open item from `145-REVIEW.md` WR-01.

## Task Commits

1. **Task 1 (measurement/verification) + Task 2 (ratchet guard)** - `78d1d98d` (test) — re-measurement is verification-only (no separate artifact); the guard file itself embodies the confirmed post-remediation state and both required test functions.
2. **Task 3 (Criterion 8 remainder documentation)** - `ce206b00` (docs)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `backend/internal/testquality/source_substring_guard_test.go` - `LegacyAllowedSubstringTestFiles` (34-entry frozen ratchet list) + `TestSecurityRelevantFilesNeverInLegacyExceptionList` + `TestNoNewSourceSubstringTests` (regex/variable-provenance-based scanner)
- `.planning/phases/146-registry-selbstschutz-und-sanierung-der-quelltext-substring-/146-SUBSTRING-TEST-REMAINDER.md` - per-file Criterion 8 debt documentation, 34 files named with reasons, headline measurement numbers, carried-forward open item

## Decisions Made

- The ratchet exception list mirrors the full 34-file "Übrige" set from the reproducible
  measurement script rather than a hand-classified presence-only subset, keeping the list
  itself trivially re-verifiable; the guard's runtime scanner independently applies the
  stricter presence/absence distinction only when deciding whether a *new* file (not
  already in the list) should fail the build. This means two of the 34 listed files
  (`internal/handlers/media_upload_test.go`, a pure line-count-budget check with no
  substring assertion at all, and `internal/handlers/member_media_upload_defaults_test.go`,
  a pure absence check) are present in the list defensively even though the scanner would
  not flag them if they were removed from it — documented explicitly in the remainder doc
  rather than left ambiguous.
- `member_archive_repository_test.go` stays authoritatively classified as security-relevant
  (per the frozen `SecurityRelevantTestFiles` list from Plan 146-04) even though the
  measurement script's own dynamic keyword filter now classifies it as non-security post
  remediation (a keyword the filter matched on was removed from the file's content during
  146-06's remediation). The frozen list, not the script's live re-classification, is
  authoritative — this file is correctly excluded from `LegacyAllowedSubstringTestFiles`.

## Deviations from Plan

None - plan executed exactly as written. Task 1 required no code fixes (all 20 security-relevant
files were already confirmed clean during Plans 146-04 through 146-12); Task 1's output is
folded into Task 2's commit since the plan's own frontmatter lists only the guard file and the
remainder doc as `files_modified`.

## Issues Encountered

- The raw `measure-substring-tests.py` output alone was insufficient to build a correct guard:
  a naive file-level "does this file contain any Contains call" check produced false positives
  (e.g. `member_point_totals_repository_test.go`'s real behavioral
  `require.Contains(t, jsonString, ...)` JSON-serialization assertion, unrelated to its separate,
  legitimate absence-only `os.ReadFile` check, would have been misclassified as a source-substring
  violation). Resolved by implementing per-function variable-provenance tracing (which string
  variable is actually derived from the `os.ReadFile` call, via fixed-point regex tracing of
  `:=` assignments) so only assertions against the traced source-derived variable(s) count.
  Validated against the real backend tree via an ephemeral `docker run` (the compose service's
  backend volume isn't live-mounted) before finalizing the committed guard.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 146 is now complete: Block 1 (Registry-Selbstschutz, Plans 146-01 through 146-03) and
  Block 2 (Testsanierung, Plans 146-04 through 146-13) both closed. All 8 ROADMAP.md Success
  Criteria for this phase are satisfied.
- Future phases touching `backend/**/*_test.go` should be aware that adding a new
  `os.ReadFile(...".go")`-based presence-style substring assertion outside
  `LegacyAllowedSubstringTestFiles` will now fail `go test ./...` immediately via
  `TestNoNewSourceSubstringTests` — this is intentional regression protection, not a bug.
- The 34-file remainder (`146-SUBSTRING-TEST-REMAINDER.md`) and the
  `IsHistoricalMemberRoleCode` open item remain available as scoped candidates for a future
  testquality-focused phase, per Criterion 8's explicit accept-disposition (T-146-20).

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-*
*Completed: 2026-09-04*

## Self-Check: PASSED

- FOUND: backend/internal/testquality/source_substring_guard_test.go
- FOUND: .planning/phases/146-registry-selbstschutz-und-sanierung-der-quelltext-substring-/146-SUBSTRING-TEST-REMAINDER.md
- FOUND: 78d1d98d (test commit)
- FOUND: ce206b00 (docs commit)
