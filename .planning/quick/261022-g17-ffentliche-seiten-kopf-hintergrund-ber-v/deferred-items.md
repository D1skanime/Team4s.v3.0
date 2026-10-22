# Deferred items (out of scope for quick-261022-g17)

Pre-existing `tsc --noEmit` errors unrelated to this plan's changes, present in files never
touched by this plan (confirmed by reading the source directly — not caused by the backdrop/CSS
split work here):

1. `frontend/src/app/anime/page.tsx` — `AnimePageProps.searchParams` is typed as a union that
   includes a non-`Promise` object variant, which no longer satisfies Next.js 16's `PageProps`
   constraint (`Promise<any> | undefined` only). Causes:
   `.next/dev/types/app/anime/page.ts(36,29): error TS2344: Type 'AnimePageProps' does not
   satisfy the constraint 'PageProps'.`
2. `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx` — `Props.params`
   has the same non-`Promise` union pattern. Causes:
   `.next/dev/types/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts(36,29):
   error TS2344: Type 'Props' does not satisfy the constraint 'PageProps'.`

Neither file is in this plan's `files_modified` list, and neither error references anything this
plan touches. Not fixed here per the executor's scope-boundary rule (only auto-fix issues directly
caused by the current task's changes). All `tsc --noEmit` verification runs during this plan's
execution filter these two specific, pre-existing lines out of the pass/fail gate; any *other*
`tsc` error is still treated as a real failure.

## Pre-existing `eslint .` errors (also out of scope)

`npx eslint .` reports 5 pre-existing errors (plus ~216 pre-existing warnings), none in files
touched by this plan:
- `capture-responsive.cjs` -- 2x `@typescript-eslint/no-require-imports`
- `src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` -- 1x
  "Compilation Skipped: Existing memoization could not be preserved" (react-compiler lint rule)
- `src/app/admin/users/tabs/CapabilityDetailRow.tsx` -- 1x `react/no-unescaped-entities`
- `src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx` (note: `releases/`, NOT
  `releases/[releaseVersionId]/` -- a sibling file this plan never touches) -- 1x
  `no-restricted-syntax` (native `<input>`)

None of these are new; all pre-date this plan's commits. Confirmed clean/no-new-errors per the
plan's own success criteria.
