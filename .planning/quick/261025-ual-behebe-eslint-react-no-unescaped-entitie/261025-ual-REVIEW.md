---
phase: 261025-ual-behebe-eslint-react-no-unescaped-entitie
reviewed: 2026-10-25T21:54:07Z
depth: quick
files_reviewed: 1
files_reviewed_list:
  - frontend/src/app/admin/users/tabs/CapabilityDetailRow.tsx
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Quick Task: Code Review Report

**Reviewed:** 2026-10-25T21:54:07Z
**Depth:** quick
**Files Reviewed:** 1
**Status:** issues_found

## Summary

Commit `0d345df31` changes one character on line 77 of `CapabilityDetailRow.tsx`: the
ASCII closing quote `"` (U+0022) after "Prüf-/Freigabe-Rechte" is replaced with the
correct German typographic closing quote `"` (U+201C), pairing correctly with the
existing opening `„` (U+201E) and fixing the `react/no-unescaped-entities` ESLint
error. `npx eslint` on the file now passes clean (exit 0), confirming the lint fix
itself is correct and well-targeted.

However, the claim that "nothing else in the file is affected" does not hold for the
component's test coverage. `CapabilityDetailRow.test.tsx` (not part of the diff) still
asserts on the *old* string containing the ASCII `"`, via
`screen.getByText('Gewähren nur über „Prüf-/Freigabe-Rechte" oben.')` (line 89) and
`screen.queryByText(...)` (line 97). Since `getByText` does exact string matching by
default, these assertions no longer match the rendered DOM text (which now contains
U+201C), and running the suite confirms 3 of 6 tests in that file now fail.

## Critical Issues

### CR-01: Quote-character fix breaks exact-text test assertions in the same component's test file

**File:** `frontend/src/app/admin/users/tabs/CapabilityDetailRow.test.tsx:89,97`
**Issue:** The production change on `CapabilityDetailRow.tsx:77` swapped the rendered
text's closing quote from ASCII `"` to the correct German typographic `"` (U+201C).
The sibling test file was not updated and still does exact-string `getByText`/
`queryByText` matching against the old ASCII-quote string. Running
`npx vitest run src/app/admin/users/tabs/CapabilityDetailRow.test.tsx` confirms 3 of 6
tests fail:
- `hides the generic grant button and shows the delegation hint for review.image.decide`
- `hides the generic grant button and shows the delegation hint for review.text.decide`
- `hides the generic grant button and shows the delegation hint for review.contribution.decide`

This means the one-character production fix, while correct on its own, currently
leaves the test suite red. This must be fixed before the change ships — a lint-driven
fix that breaks CI is not a safe fix.
**Fix:** Update both assertions in the test file to use the same U+201C closing quote
character used in the component:
```tsx
// frontend/src/app/admin/users/tabs/CapabilityDetailRow.test.tsx:89
expect(screen.getByText('Gewähren nur über „Prüf-/Freigabe-Rechte“ oben.')).not.toBeNull()
// frontend/src/app/admin/users/tabs/CapabilityDetailRow.test.tsx:97
expect(screen.queryByText('Gewähren nur über „Prüf-/Freigabe-Rechte“ oben.')).toBeNull()
```
After editing, re-run `npx vitest run src/app/admin/users/tabs/CapabilityDetailRow.test.tsx`
to confirm all 6 tests pass again.

**Outcome:** fixed. `CapabilityDetailRow.test.tsx:89,97` updated to the U+201C
closing quote in commit `ccb66f374`. Re-ran
`npx vitest run src/app/admin/users/tabs/CapabilityDetailRow.test.tsx` — all 6 tests
pass. Re-ran `npx eslint` on both files — exit 0.

---

_Reviewed: 2026-10-25T21:54:07Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
