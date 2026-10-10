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
