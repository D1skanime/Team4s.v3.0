# Deferred Items — Phase 181

Issues discovered during execution that are out of scope for the current task (pre-existing,
not caused by the task's own changes) are logged here instead of being auto-fixed.

## 181-03 (Task 3, full regression)

- **`frontend/src/components/releaseEditor/ReleaseVersionMediaEditDrawer.tsx:142`** —
  ESLint error `no-restricted-syntax` (natives `<input type="checkbox">` statt `@/components/ui`
  Primitive). Pre-existing: byte-identical to the file's content before this plan's pure
  relocation (verified via diff against the pre-move blob, commit `e3471ecd`/`0691c6a9`). Not
  introduced by 181-03. Belongs to the UI-primitives migration backlog referenced in CLAUDE.md
  ("nach Migration der Altfälle wird auf `error` angehoben"), not to this relocation plan.
- **`frontend/src/components/releaseEditor/useReleaseVersionMedia.ts:249`** — React Compiler
  error "Compilation Skipped: Existing memoization could not be preserved" (inferred dependency
  `storyContext` vs. explicit `[storyContext?.animeId, storyContext?.groupId, storyContext?.version, versionId]`).
  Pre-existing: file is byte-identical to its pre-move content (confirmed via diff, 0 changes).
  Not introduced by 181-03.

Both findings pre-date this plan and were already present in the original
`app/admin/episode-versions/[versionId]/edit/` location before relocation; they are unrelated to
the move itself (import paths only) and are therefore left untouched per the deviation rules'
scope boundary (pre-existing issues in moved files remain out of scope for auto-fix).
