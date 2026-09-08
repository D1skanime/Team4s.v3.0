---
phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung
plan: 02
subsystem: editor
tags: [tiptap, bluemonday, sanitizer, react, go, security]

# Dependency graph
requires: []
provides:
  - "Backend pinning test (TestTipTapValidateJSON_linkMarkRejected) proving ValidateJSON already correctly rejects a TipTap link mark"
  - "Frontend StarterKit link extension disabled (link: false), closing the frontend/backend contract drift (D1)"
  - "Sanitizer hardening: span/td/th class attribute constrained to ^color-token-[a-z]+$, h1 removed from AllowElements (D2)"
affects: [tiptap-service, rich-text-editor, group-history, member-story]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backend contract-drift fixes are reproduced as a pinning test against the authoritative allowlist FIRST, before any frontend change"
    - "Sanitizer attribute constraints use bluemonday's Matching(regexp) idiom consistently across all elements (img, span/td/th) rather than a bare AllowAttrs"

key-files:
  created: []
  modified:
    - backend/internal/services/tiptap_service.go
    - backend/internal/services/tiptap_service_test.go
    - frontend/src/components/editor/RichTextEditor.tsx
    - frontend/src/components/editor/RichTextEditor.test.tsx

key-decisions:
  - "Fixed the link-mark drift on the frontend (link: false) rather than adding link to the backend allowlist — the backend was already correct and the product decision (per USER-REQUEST) is that group-history/story rich text does not support links"
  - "span/td/th class rule mirrors the existing img class Matching(regexp) idiom already established in newTipTapSanitizerPolicy, rather than introducing a new sanitizer mechanism"

patterns-established:
  - "TipTap sanitizer attribute allowlisting always uses Matching(regexp) for class values, never a bare AllowAttrs(\"class\")"

requirements-completed: [P152-11]

# Metrics
duration: ~15min
completed: 2026-09-08
---

# Phase 152 Plan 02: Tiptap Link-Mark Contract Drift and Sanitizer Hardening Summary

**Frontend StarterKit link extension disabled to stop producing link marks the backend already rejects; sanitizer now constrains span/td/th class to color-token pattern and drops h1 from the rich-text allowlist.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-08T17:27:00Z (approx.)
- **Completed:** 2026-09-08T17:31:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Reproduced and pinned today's already-correct backend deny behavior for a TipTap `link` mark as a regression test (`TestTipTapValidateJSON_linkMarkRejected`), confirming the defect analysis before touching any other file
- Disabled the `@tiptap/starter-kit` `link`/`autolink` extension client-side (`link: false`) so the frontend can never again produce a mark the backend allowlist rejects — closes the contract drift (D1) at its source (the side that drifted)
- Constrained the `span`/`td`/`th` sanitizer `class` attribute to `^color-token-[a-z]+$` via the same `Matching(regexp.MustCompile(...))` idiom already used for `img`'s `class` rule, closing the only open path for an arbitrary admin- or attacker-controlled class value to reach public HTML output
- Removed `h1` from the sanitizer's `AllowElements`, preventing rich-text-authored content from ever producing a second `<h1>` on a page that already has exactly one (the group name in the hero)

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend reproduction test pinning the link-mark-rejection defect** - `8f1da3a7` (test)
2. **Task 2: Disable the StarterKit link extension in the frontend editor (D1 fix)** - `a6f6987f` (fix)
3. **Task 3: Sanitizer hardening — constrain span/td/th class values and remove h1 (D2)** - `03631a38` (fix)

_Note: Task 1 and Task 2 were each their own single-commit TDD cycle — Task 1's test passed unmodified (pure reproduction/pinning, no production code change needed), and Task 2's fix + its new test landed together as they touch the same two files in one coherent change._

## Files Created/Modified
- `backend/internal/services/tiptap_service_test.go` - Added `TestTipTapValidateJSON_linkMarkRejected` (Task 1) and `TestTipTapSanitizeSpanClass_AllowsColorToken`/`TestTipTapSanitizeSpanClass_BlocksArbitraryClass`/`TestTipTapSanitizeH1_Stripped` (Task 3)
- `backend/internal/services/tiptap_service.go` - `newTipTapSanitizerPolicy()`: `class` on `span`/`td`/`th` now `Matching(regexp.MustCompile("^color-token-[a-z]+$"))`; `h1` removed from `AllowElements`
- `frontend/src/components/editor/RichTextEditor.tsx` - `StarterKit.configure({...})` gained `link: false`
- `frontend/src/components/editor/RichTextEditor.test.tsx` - Added a test asserting `StarterKit.configure` was called with `expect.objectContaining({ link: false })`

## Decisions Made
- Fixed the D1 drift on the frontend side (`link: false`) rather than adding `link` to the backend's `allowedTipTapMarks` — the backend's link-rejection was already correct per the interface contract documented in the plan, and per the plan's product framing group-history/story rich text does not support links.
- The Task 3 sanitizer changes reuse the file's own established `Matching(regexp.MustCompile(...))` idiom already applied to `img`'s `class`/`src`/`style` attributes, rather than introducing a new sanitizer mechanism — keeps the file internally consistent.

## Deviations from Plan

None - plan executed exactly as written. Task 1's test passed unmodified on first run as required by the plan (`<behavior>`: "This test MUST pass today, unmodified, with zero production code changes"), confirming the defect analysis was correct before proceeding to Task 2.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The link-mark contract drift (D1) and the two sanitizer under-constraints (D2) identified in `152-CONTEXT.md`'s Tiptap audit section are both closed.
- All 34 backend TipTap tests pass (`go test ./internal/services/... -run TipTap`), including all pre-existing tests unmodified.
- All 11 `RichTextEditor.test.tsx` frontend tests pass, including the pre-existing "rendert ohne Crash" smoke test.
- Full backend `go build ./... && go vet ./...` clean.
- This plan is independent of the History/badge migration and query-budget work in the rest of Phase 152 (per `critical_sequencing_constraint #5`); no blockers for other Phase 152 plans.
- `backend/internal/services/tiptap_service.go` (454 lines) and `frontend/src/components/editor/RichTextEditor.tsx` (506 lines) remain over the CLAUDE.md 450-line cap — this was already true before this plan (451 and 505 lines respectively) and is explicitly deferred per D02/the plan's notes section (targeted additive edits only, no rewrite in scope for Phase 152).

---
*Phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung*
*Completed: 2026-09-08*

## Self-Check: PASSED
