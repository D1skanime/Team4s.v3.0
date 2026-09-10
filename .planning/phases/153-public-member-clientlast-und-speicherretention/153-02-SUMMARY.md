---
phase: 153-public-member-clientlast-und-speicherretention
plan: 02
subsystem: frontend
tags: [nextjs, react, vitest, bundle-size, import-graph, tiptap]

# Dependency graph
requires:
  - phase: 153-01
    provides: AchievementArtwork sizes fix (unrelated file, same phase)
provides:
  - Four renderer-only consumers (MemberStorySection, MemberGroupsHistorySection, PublicNoteCard,
    AnimeProjectNotesSection) importing RichTextRenderer directly from its own module instead of
    the shared editor barrel
  - editor/index.ts barrel scoped to real editor consumers only (RichTextEditor,
    ColorTokenExtension, COLOR_TOKENS), with RichTextRenderer's barrel re-export removed and a
    documented B3 rationale comment
  - Three dual-symbol consumers (ProfileStoryCard, AnimeProjectNoteWorkspace, NotesTab.helpers)
    updated to two explicit import statements (barrel RichTextEditor + direct RichTextRenderer)
affects: [153-03 (not-found.tsx loading boundary — combined with this plan is what the audit's
  A/B measurement showed saves 1.653 MB / 26.1% of public JS transfer), any future consumer of
  RichTextRenderer]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Barrel files exporting both a heavy (framework-dependent) and a light (dependency-free)
      symbol must be split so a light-symbol-only import cannot silently reintroduce the heavy
      bundle; enforced here as a compile-time TypeScript error, not a lint rule or audit script."

key-files:
  created: []
  modified:
    - frontend/src/components/profile/MemberStorySection.tsx
    - frontend/src/components/profile/MemberStorySection.test.tsx
    - frontend/src/components/profile/MemberGroupsHistorySection.tsx
    - frontend/src/components/public/PublicNoteCard.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx
    - frontend/src/components/editor/index.ts
    - frontend/src/app/me/profile/components/ProfileStoryCard.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.test.tsx (deviation, Rule 1)
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx (deviation, Rule 1)
    - frontend/src/app/me/profile/page.test.tsx (deviation, Rule 1)

key-decisions:
  - "B3 (locked, documented in editor/index.ts): RichTextRenderer's barrel re-export is removed
    entirely rather than left in place with a lint-only guard. Direct imports from
    '@/components/editor/RichTextRenderer' remain the one and only public entry point."

patterns-established:
  - "Pitfall 4 (mock/import-path drift): a vi.mock() targeting a barrel specifier silently stops
    intercepting once the source file's import moves to a direct module path, without failing
    the test — verified live by re-running each affected suite and confirming
    data-testid=\"rich-text-renderer\" / equivalent still resolves through the intended mock,
    not a real fallthrough render."

requirements-completed: [P153-04, P153-05]

# Metrics
duration: 4min
completed: 2026-09-10
---

# Phase 153 Plan 02: RichTextRenderer barrel split Summary

**Four renderer-only public/admin consumers now import `RichTextRenderer` directly from its own
module (no Tiptap dependency), and the editor barrel no longer re-exports it at all — a future
accidental `import { RichTextRenderer } from '@/components/editor'` now fails to compile instead
of silently reintroducing the full Tiptap/ProseMirror import graph into renderer-only surfaces.**

## Performance

- **Duration:** 4 min (10:36:36Z first task commit -> 10:40:02Z summary write; work itself was
  continuous within that window)
- **Started:** 2026-09-10T10:36:36Z
- **Completed:** 2026-09-10T10:40:02Z
- **Tasks:** 2/2 completed
- **Files modified:** 13 (10 in the plan's files_modified list + 3 pre-existing test files fixed
  as a Rule 1 deviation, see below)

## Accomplishments

- `MemberStorySection`, `MemberGroupsHistorySection`, `PublicNoteCard`, and
  `AnimeProjectNotesSection` import `RichTextRenderer` from
  `'@/components/editor/RichTextRenderer'` — zero remaining barrel imports of this symbol among
  the four renderer-only consumers (verified by grep, zero matches).
- `frontend/src/components/editor/index.ts` no longer exports `RichTextRenderer`; carries a
  documented B3 decision comment. Barrel now exports exactly `RichTextEditor`,
  `ColorTokenExtension`, `COLOR_TOKENS`, and the `ColorToken` type.
- `ProfileStoryCard`, `AnimeProjectNoteWorkspace`, `NotesTab.helpers` compile against two explicit
  import statements each (`RichTextEditor` via barrel, `RichTextRenderer` direct) with zero
  behavioral change.
- `RichTextRenderer.tsx` itself is untouched — `git diff --stat` across both task commits shows no
  changes to that file, confirming the `SICHERHEITSINVARIANTE` sanitization contract stayed
  byte-identical (T-153-02-01 mitigation).
- `npx tsc --noEmit` across the whole frontend: **0 errors** (not just filtered to the editor
  barrel — a full unfiltered run was executed to confirm no missed consumer).
- Full frontend `vitest` suite re-run after both tasks: **293/294 test files passed (1 skipped),
  2255/2258 tests passed (3 todo), 0 failures.**

## Task Commits

1. **Task 1: Point the four renderer-only consumers at the direct RichTextRenderer module** -
   `3c466567` (refactor)
2. **Task 2: Split RichTextRenderer out of the barrel (B3 decision) and update the three
   dual-symbol consumers** - `17a338a3` (refactor)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS update)

## Files Created/Modified

- `frontend/src/components/profile/MemberStorySection.tsx` - import specifier changed to direct
  `RichTextRenderer` module
- `frontend/src/components/profile/MemberStorySection.test.tsx` - `vi.mock` target updated to
  match
- `frontend/src/components/profile/MemberGroupsHistorySection.tsx` - import specifier changed
  (no test file exists for this component)
- `frontend/src/components/public/PublicNoteCard.tsx` - import specifier changed (its test file
  has no barrel mock, unaffected)
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` - import specifier
  changed
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.test.tsx` - split the
  combined barrel mock into a barrel-only `RichTextEditor` mock (still needed by the indirectly
  rendered `AnimeProjectNoteForm`) plus a new direct-module `RichTextRenderer` mock
- `frontend/src/components/editor/index.ts` - removed the `RichTextRenderer` re-export; added the
  documented B3 rationale comment
- `frontend/src/app/me/profile/components/ProfileStoryCard.tsx` - split the combined import into
  two explicit import statements
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.tsx` - split the combined
  import into two explicit import statements
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx` - split the combined import into
  two explicit import statements
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.test.tsx` (deviation) - split
  its pre-existing combined barrel mock so `RichTextRenderer` stays intercepted
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx` (deviation) - same split, for the
  `NotesTab.helpers`-rendering test suite
- `frontend/src/app/me/profile/page.test.tsx` (deviation) - same split, for the
  `ProfileStoryCard`-rendering test suite

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, Pitfall 4 from the plan's own interfaces section] Three pre-existing test
files silently stopped exercising their `RichTextRenderer` mock after Task 2's import-path
change**

- **Found during:** Task 2, immediately after editing `ProfileStoryCard.tsx`,
  `AnimeProjectNoteWorkspace.tsx`, and `NotesTab.helpers.tsx`.
- **Issue:** The plan's `files_modified` list only named the two test files whose consuming
  source component is renderer-only (`MemberStorySection.test.tsx`,
  `AnimeProjectNotesSection.test.tsx`). It did not account for three *other* pre-existing test
  files — `AnimeProjectNoteWorkspace.test.tsx`, `NotesTab.test.tsx`, and
  `frontend/src/app/me/profile/page.test.tsx` — that each carry their own `vi.mock('@/components/editor', ...)`
  block including a `RichTextRenderer` factory, because they render the three *dual-symbol*
  consumers Task 2 touches. Once those consumers' `RichTextRenderer` import moved to
  `'@/components/editor/RichTextRenderer'`, the old mock specifier no longer matched, so Vitest
  silently fell through to the real `RichTextRenderer` component instead of the test's intended
  mock — exactly the Pitfall 4 failure mode the plan's own `<interfaces>` section warns about,
  just in three files the plan didn't enumerate. All three test suites still passed afterward
  (the real component happens to render similarly enough for these tests' assertions), which
  would have masked the drift indefinitely.
- **Fix:** Split each of the three `vi.mock('@/components/editor', ...)` blocks into two —
  a barrel-only block keeping `RichTextEditor`'s mock factory, and a new
  `vi.mock('@/components/editor/RichTextRenderer', ...)` block carrying the exact same
  `RichTextRenderer` factory body, unchanged. No test assertions were modified.
- **Verification:** Re-ran all seven affected test files together (103 tests, 0 failures) and a
  full unscoped `vitest run` (293/294 files, 2255/2258 tests, 0 failures) to confirm no other
  file was missed.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNoteWorkspace.test.tsx`,
  `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.test.tsx`,
  `frontend/src/app/me/profile/page.test.tsx`
- **Commit:** `17a338a3` (folded into Task 2's commit, since it is a direct, same-cause
  consequence of Task 2's import-path change, not an independent change)

## Threat Flags

None. `RichTextRenderer.tsx`'s sanitization contract (T-153-02-01) is byte-identical (`git diff
--stat` empty across both task commits); the barrel split (T-153-02-02) is the plan's own intended
mitigation, not new surface.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `frontend/src/components/editor/index.ts` (barrel, RichTextRenderer export removed)
- FOUND: `frontend/src/components/profile/MemberStorySection.tsx` (direct import)
- FOUND: `frontend/src/app/me/profile/components/ProfileStoryCard.tsx` (split import)
- FOUND: commit `3c466567` in `git log --oneline`
- FOUND: commit `17a338a3` in `git log --oneline`
