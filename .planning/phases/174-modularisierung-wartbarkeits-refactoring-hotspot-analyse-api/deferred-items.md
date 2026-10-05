# Deferred Items — Phase 174

Issues discovered during plan execution that are out of scope for the current
plan's files (pre-existing, unrelated to the task's changes). Logged per the
scope-boundary rule; not fixed here.

## 174-10

- `npx tsc --noEmit` reports pre-existing errors unrelated to this plan's files:
  - `.next/dev/types/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts`
    and `.next/dev/types/app/anime/page.ts`: stale Next.js-generated `PageProps`
    type-check artifacts (build cache, not source).
  - `src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx`:
    `Property 'previous' is missing` — pre-dates this plan (introduced by commit
    `1572c58e feat(public): separate release technical details`, unrelated to
    `useAdminAnimeCreateController`). Confirmed via `git log` that the affected
    file was last touched by `7fec2599 test(169-04): cover public highlight ordering`,
    well before Phase 174.
  - Verified via `grep` that none of the `tsc --noEmit` output lines reference
    `admin-anime-create`, `useAdminAnimeCreateController`, or any file in this
    plan's `files_modified` list.

## 174-11

- `npx tsc --noEmit` reports the same pre-existing, unrelated errors as 174-10
  (stale `.next/dev/types/...` `PageProps` artifacts, `ReleaseDetailHero.test.tsx`
  missing-`previous`). Confirmed via `grep` that none reference
  `admin-anime-create`, `useAdminAnimeCreateController`, `useAssetStagingActions`,
  or `useCreateSubmitAction`.
- `npx eslint src/app/admin/anime/create/internal/` reports a pre-existing
  `resetStagedAssets' is defined but never used` warning (line unchanged by
  this plan; confirmed present in the pre-174-11 file via a before/after
  comparison). Not fixed — out of scope for this plan's files_modified diff.
