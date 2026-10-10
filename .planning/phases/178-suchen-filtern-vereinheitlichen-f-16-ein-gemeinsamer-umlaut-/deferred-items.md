# Deferred Items — Phase 178

## 178-02, Task 2: Pre-existing unrelated `tsc --noEmit` failure

`cd frontend && npx tsc --noEmit -p tsconfig.json` reports one error unrelated to this
plan's changes:

```
.next/dev/types/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts(36,29):
error TS2344: Type 'Props' does not satisfy the constraint 'PageProps'.
```

This is a Next.js dev-server-generated route type artifact under `frontend/.next/`
(gitignored, not part of the repo's source tree) for a route completely unrelated to
`frontend/src/types/fansub.ts`. Confirmed pre-existing and independent of this plan's
change: reverting the new `aliases?: string[]` field and re-running `tsc --noEmit`
reproduces the identical error. Out of scope for 178-02 per the executor scope
boundary (pre-existing failure in an unrelated, generated file). Not fixed.

## 178-03: Pre-existing unrelated `vitest run` (full-suite) failures

Running the full frontend suite (`cd frontend && npx vitest run`) after 178-03's changes shows
3 failed test files / 2 failed tests, none touching `frontend/src/app/admin/groups/` or
`frontend/src/lib/textFilter.ts`:

- `src/components/profile/badgeArtwork.test.ts` ("canonical live catalog and shipped files")
- `src/components/ui/ResponsiveImage.config.test.ts` ("allows only the configured Team4s API
  media namespace for responsive group logos")
- `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` (reads a hardcoded
  absolute path `/backend/internal/permissions/permissions.go`, which does not exist outside the
  project's Docker container filesystem layout)

All three are sandbox/environment-path-dependent and unrelated to this plan's files. Confirmed
out of scope per the executor scope boundary (pre-existing failures in unrelated files). Not
fixed. The scoped test run (`npx vitest run src/app/admin/groups/`) and `npm run build` both pass
cleanly.
