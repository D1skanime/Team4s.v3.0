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

## 165-08: `page.tsx` was already over the 450-line CLAUDE.md limit before this plan, and this plan's additive wiring grew it further

- **Found during:** Plan 165-08, Task 3 (Discovery hand-off wiring on the Create page)
- **Symptom:** `frontend/src/app/admin/anime/create/page.tsx` was 506 lines at the start of
  this plan (`git show HEAD~3:frontend/src/app/admin/anime/create/page.tsx | wc -l`, i.e.
  already over CLAUDE.md's 450-line production-file ceiling before 165-08 touched it) and is
  542 lines after this plan's additive wiring (useSearchParams, useCreatePageDiscoveryHandoff
  call site, DiscoveryEntryCard/DiscoveryReturnLink rendering, 3 new props threaded into
  `CreateAniSearchIntakeCard`).
- **Not fixed:** This plan's task scope (3 tasks: discovery hand-off hook, controller wiring,
  decision-UI extraction + page wiring) explicitly did not include splitting `page.tsx`'s
  existing `detailsSection`/`assetsSection` JSX into further sub-components — doing so here
  would be an unplanned, non-trivial structural refactor of an already-complex file (Rule 4
  architectural-change territory), out of scope for this plan's `files_modified` list and
  task boundaries. 165-05's executor already made the equivalent call for
  `useAdminAnimeCreateController.ts` (already 1451 lines) by building the new
  `useCreatePageDiscoveryHandoff.ts` hook as a sibling file specifically to avoid growing
  that file further — this plan followed the same additive-sibling-file principle for all
  genuinely new logic (`useCreatePageDiscoveryHandoff.ts`, `AniSearchDuplicateDecision.tsx`)
  but could not avoid a small amount of net-new wiring inside `page.tsx` itself, since
  `page.tsx` is the one file that owns the `useSearchParams()` call site per the plan's own
  interface contract (`AdminUsersClient.tsx`-pattern, client-component hook usage).
- **Suggested follow-up:** A dedicated hardening plan should extract `detailsSection`
  ("Basisdaten"/"Genre, Tags und Beschreibung") and/or `assetsSection` out of
  `AdminAnimeCreateContent` into their own component files, bringing `page.tsx` back under
  the 450-line ceiling.
