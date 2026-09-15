---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 20
subsystem: backend
tags: [go, permissions, segment-credits, gap-closure, tdd]

# Dependency graph
requires: []
provides:
  - "permissions.SegmentCreditRoleCodes: 8 codes (adds encoder, designer to the prior 6)"
  - "permissions.SegmentCreditPreselectionRoleCodes: new, narrower 6-code var, true subset of SegmentCreditRoleCodes"
  - "permissions.segmentCreditLabels: 8 entries, typesetter relabeled to 'Karaoke-Typesetting', encoder='Karaoke-Encoding', designer='Logo'"
affects: [156-21, 156-22, 156-UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two sibling role-code lists in one file (SegmentCreditRoleCodes vs SegmentCreditPreselectionRoleCodes) instead of a single list plus an ad-hoc exclusion filter at each consumption site, so credit/label visibility and preselection eligibility can diverge without duplicating role-code literals anywhere else in the backend"

key-files:
  created: []
  modified:
    - backend/internal/permissions/segment_credit_roles.go
    - backend/internal/permissions/segment_credit_roles_test.go

key-decisions:
  - "Kept SegmentCreditLabelForRoles's function body completely unchanged -- extending SegmentCreditRoleCodes and segmentCreditLabels to 8 entries was sufficient, no new logic needed, per the plan's explicit interface contract"
  - "Replaced raw_provider (not encoder) as the test file's standing example of a permanently-excluded role, since encoder is no longer excluded as of this plan -- avoids leaving a stale exclusion example in test names/comments"

patterns-established: []

requirements-completed: [GAP-09]

# Metrics
duration: ~15min
completed: 2026-09-15
---

# Phase 156 Plan 20: GAP-09 Segment-Credit-Rollenkatalog auf Encoder/Designer erweitert Summary

**`permissions.SegmentCreditRoleCodes` waechst test-first von 6 auf 8 Codes (encoder/designer neu freigegeben), eine neue, separate `SegmentCreditPreselectionRoleCodes`-Liste haelt die alten 6 Codes fuer die automatische Vorauswahl exklusiv.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-15
- **Tasks:** 1 (TDD: RED then GREEN)
- **Files modified:** 2

## Accomplishments

- `SegmentCreditRoleCodes` now contains exactly the eight GAP-09-approved codes `{translator, timer, karaoke_fx, typesetter, editor, quality_checker, encoder, designer}`, with encoder/designer appended at the fixed end of the list (controls `SegmentCreditLabelForRoles`'s output order).
- New `SegmentCreditPreselectionRoleCodes` var (same file, same package) carries only the original six codes and is proven a true (strictly smaller) subset of `SegmentCreditRoleCodes` via `require.Subset` + a length comparison — not just `ElementsMatch`, which would also pass for two identical slices.
- `segmentCreditLabels` gained `encoder -> "Karaoke-Encoding"` and `designer -> "Logo"`, and `typesetter`'s label was sharpened from `"Typesetting / Logo"` to `"Karaoke-Typesetting"` per the Auftraggeber-confirmed GAP-09 wording.
- The stale doc comment claiming "encoder remains the only deliberately excluded contributor-relevant role" is gone, replaced with a GAP-09-accurate description naming the retired `156-USER-REQUEST.md`/GAP-01/Regressionsfall-D rule it supersedes, plus a new paragraph documenting why `SegmentCreditPreselectionRoleCodes` exists (Plan 156-21's `ensureThemeSegmentContributorsPreselectedTx` consumer).
- Test suite fully rewritten for the new premise: `TestSegmentCreditRoleCodes`'s false `"never contains encoder"` subtest is gone, replaced by explicit encoder/designer `Contains` assertions; a new `TestSegmentCreditPreselectionRoleCodes` proves the subset property; `TestSegmentCreditLabelForRoles` covers all 8 codes including the renamed typesetter label; `TestSegmentCreditLabelForRolesFixedOrder` gained the literal GAP-09 Pflichttest ("Person mit Übersetzung und Encoding ausgewählt" → `"Karaoke-Übersetzung, Karaoke-Encoding"`); the old `TestSegmentCreditLabelForRolesExcludesEncoder` (now-false premise) is replaced by `TestSegmentCreditLabelForRolesExcludesUnapprovedRoles` using `raw_provider` as the new standing example of a genuinely, permanently excluded role.
- `TestSegmentCreditLabelCoverageIsDeckungsgleich` needed no literal-list edits (it derives both sides from the package vars) and now proves coverage across all eight codes automatically.

## Task Commits

Each task was committed atomically, following the RED/GREEN TDD gate sequence:

| Commit | Type | Description |
|--------|------|-------------|
| `f3bedfca` | test | Add failing tests for GAP-09 encoder/designer segment credits (RED — confirmed build failure on undefined `SegmentCreditPreselectionRoleCodes` against the unmodified source file) |
| `336d4635` | feat | Extend segment credit roles/labels for GAP-09 encoder/designer (GREEN — full `internal/permissions` suite passes, `go build`/`go vet` clean) |

## TDD Gate Compliance

Both gates present in git log: `test(156-20): ...` (RED, `f3bedfca`) followed by `feat(156-20): ...` (GREEN, `336d4635`). No REFACTOR commit was needed — `SegmentCreditLabelForRoles`'s function body was intentionally left unchanged per the plan's interface contract.

## Deviations from Plan

None — plan executed exactly as written. The RED gate was demonstrated via a compile failure (`undefined: SegmentCreditPreselectionRoleCodes`) rather than a runtime test failure, which is the expected and only possible RED shape in Go when a test references a not-yet-declared package-level identifier; every other new/changed assertion in the same test run would also have failed once compilation succeeded, consistent with the plan's RED expectation.

## Verification

- `docker run --rm -v /home/d1sk/team4s:/workspace -w /workspace/backend golang:1.25-alpine go test ./internal/permissions/... -v -count=1` — full package suite green, including all new/changed `segment_credit_roles_test.go` assertions.
- `go build ./...` and `go vet ./...` (same container) — both clean, no errors.
- `grep -c "encoder.*must never appear as a segment credit" backend/internal/permissions/segment_credit_roles.go` → `0`.
- `grep -n "\"encoder\", \"designer\"\|RoleEncoder, RoleDesigner" backend/internal/permissions/segment_credit_roles.go` → matches the `SegmentCreditRoleCodes` declaration line, encoder/designer last.
- `grep -c "Karaoke-Typesetting"` → `1`; `grep -c "Typesetting / Logo"` → `0`.
- `wc -l backend/internal/permissions/segment_credit_roles.go` → `83` (well under the 450-line project cap).

## Known Stubs

None — this plan touches only pure Go constant/map definitions and their own unit tests, no UI or data-flow stubs introduced.

## Threat Flags

None — this plan's threat model (T-156-41, T-156-SC) was pre-declared in the plan itself and both dispositions are `accept`; no new, undeclared surface was introduced. No consumer file (repository, handler, frontend) was touched by this plan, so no new network endpoint, auth path, file access pattern, or schema change exists to flag.

## Self-Check: PASSED

- FOUND: backend/internal/permissions/segment_credit_roles.go
- FOUND: backend/internal/permissions/segment_credit_roles_test.go
- FOUND commit f3bedfca (test)
- FOUND commit 336d4635 (feat)
