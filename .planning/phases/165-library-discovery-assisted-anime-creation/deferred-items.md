# Deferred Items — Phase 165

Out-of-scope discoveries logged during plan execution but not fixed (per executor
scope-boundary rule: only auto-fix issues directly caused by the current task's changes).

## 165-05: Pre-existing `tsc --noEmit` failure in `.next/dev/types/app/admin/anime/create/page.ts`

- **Found during:** Plan 165-05, Task 2 verification (`npx tsc --noEmit`)
- **Symptom:** `Property 'buildCreateSuccessMessage' is incompatible with index signature` —
  Next.js's generated route-type file for `frontend/src/app/admin/anime/create/page.tsx`
  flags a non-reserved named export (`buildCreateSuccessMessage`, re-exported from
  `createPageHelpers.ts` at `page.tsx:33-34` for test import convenience) as violating the
  App Router page-export-shape constraint.
- **Confirmed pre-existing:** `git status --short frontend/src/app/admin/anime/create/page.tsx`
  and `git diff --stat` both show zero changes to `page.tsx` from this plan — 165-05 only
  touched `createPageHelpers.ts` (additive), `DiscoveryEntryCard.tsx`,
  `DiscoveryReturnLink.tsx`, and their test files. `page.tsx`'s re-export block already
  existed before this plan ran.
  Every other 165-05 in-scope file (`DiscoveryEntryCard.test` n/a per plan, `DiscoveryReturnLink.test.tsx`,
  `createPageHelpers.test.ts`) passes `vitest run` cleanly, and ESLint is clean on both new
  components.
- **Not fixed:** Out of scope for 165-05 — `page.tsx` is not in this plan's `files_modified`
  list and the root cause (the re-export pattern on `page.tsx`) predates this plan.
- **Suggested follow-up:** A later plan touching `page.tsx` (or a small standalone
  hardening plan) should either move these re-exports to a barrel/test-only module or
  confirm Next's route-export lint is intentionally suppressed elsewhere in the build
  config.
