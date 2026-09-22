# Deferred Items — Quick Task 260922-min (GAP-20 + GAP-21)

Pre-existing test failures found during the full `npm run test` verification run
(Task 6), confirmed unrelated to this plan's changes (zero diff for the affected
files between the pre-session commit `6bd8c015` and the final state of this plan;
none of the files below were created, read, or modified by this plan):

1. `src/lib/cssCustomProperties.guard.test.ts` — two failing assertions
   ("finds zero fallback-free dead custom-property references..." and
   "the known-non-CSS-textual-mentions allow-list stays exactly as small as
   documented") both point at `--surface-muted` referenced without a fallback
   in `lib/roleCatalog.accessibility.test.ts:268`. Pre-existing CSS custom
   property drift unrelated to GAP-20/GAP-21 (no ConfirmDialog/window.confirm
   or anime-type files involved).

2. `src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx` — the
   race-safety test "A->B->C in schneller Folge..." times out after 5000ms.
   Pre-existing flake/timeout in an unrelated fansub version browser windowing
   test (last touched by commit `442fb747`, well before this quick task).

Per the executor's SCOPE BOUNDARY rule, these are out of scope for this plan
(not directly caused by GAP-20/GAP-21 changes) and were not modified. Recommend
a follow-up `/gsd:debug` or quick task to investigate both independently.
