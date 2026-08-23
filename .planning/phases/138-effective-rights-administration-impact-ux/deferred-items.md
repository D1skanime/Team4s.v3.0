# Deferred Items — Phase 138

## Plan 03 (D-29 Beiträge-Tab display bug)

- **Pre-existing, out-of-scope test failures in `UserContributionsTab.test.tsx`:**
  `zeigt Karaoke FX und Typesetting getrennt mit Katalogdarstellung` and
  `hält unbekannte gespeicherte Codes neutral lesbar` both fail with
  `expected undefined to be 'image'/'user'` (missing `data-role-icon`
  attribute). Confirmed present in the file at `HEAD` (i.e. before any
  Plan 03 change) by temporarily restoring the original file and re-running
  the suite — same two failures, same assertions. Not caused by, and not
  fixed by, Plan 03's `release_version_label`/`episode_number` display fix.
  Out of scope per the executor's scope-boundary rule (only auto-fix issues
  directly caused by the current task's changes). Left untouched.
