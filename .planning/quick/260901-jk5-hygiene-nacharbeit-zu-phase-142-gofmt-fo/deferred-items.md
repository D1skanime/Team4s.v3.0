# Deferred Items — Quick Task 260901-jk5

Out-of-scope issues discovered during execution, logged per the executor's scope-boundary
rule (only auto-fix issues directly caused by the current task's own changes).

## 1. Pre-existing gofmt debt outside range 4891109a..HEAD (Task 1)

`gofmt -l` over the full `backend/cmd`/`backend/internal` tree reports 79 dirty files
after Task 1's fix (down from ~94 before), all of which sit outside the
`4891109a..HEAD` diff range this quick task was scoped to. The plan's own Task 1
`<action>` explicitly instructs "Do not run gofmt on any file outside this scoped
set (this is a targeted fix, not a repo-wide reformat)", so these were left
untouched. Not fixed here; a future hygiene pass could re-scope against a wider
range if desired.

## 2. `EpisodeVersionEditorPage.tsx`'s `page.test.tsx` — pre-existing failure, unrelated to Task 3

`npx vitest run 'src/app/admin/episode-versions/[versionId]/edit/page.test.tsx'`
reports 15/15 failing both before and after Task 3's `queueMicrotask` fix
(confirmed identical failure against the original unmodified file). Root cause:
the test file's `vi.mock("@/lib/api", ...)` does not export
`getAnimeFansubProjectTimeline`, so any render that reaches the
`useEffect` calling it throws `[vitest] No "getAnimeFansubProjectTimeline"
export is defined on the "@/lib/api" mock`. This mock predates the
project-timeline feature (added in a later Phase-137/138-era plan) and was
never updated. Out of scope for this hygiene task — logged here rather than
fixed, per the executor's scope boundary.

## 3. `EpisodeVersionEditorPage.tsx` pre-existing native `<input>` lint warnings (Task 3)

`npx eslint` on this file reports 5 pre-existing `no-restricted-syntax`
("Natives `<input>` verboten") warnings at lines 582/677/689/738/758, unrelated
to the `set-state-in-effect` error this task fixed. Left untouched — out of
scope.
