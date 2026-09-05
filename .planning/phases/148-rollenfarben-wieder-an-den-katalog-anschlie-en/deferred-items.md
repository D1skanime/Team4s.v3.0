# Deferred Items — Phase 148

## Pre-existing, out-of-scope `tsc --noEmit` failure

- **Found during:** Plan 01, verification step (`npx tsc --noEmit` inside the frontend container)
- **File:** `.next/dev/types/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts` (generated
  Next.js route-type file, mirroring `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.tsx`)
- **Error:** `TS2344: Type 'Props' does not satisfy the constraint 'PageProps'` — the route's
  `params` prop type is `{ id, groupId, releaseVersionId } | Promise<...>` instead of the
  Next.js-15+ expected `Promise<any> | undefined`.
- **Why out of scope:** Not touched by any Plan 01 task/file list, not caused by any commit in this
  plan (`git diff` against the pre-plan-01 HEAD shows zero changes under `frontend/src/app/anime/`).
  Pre-existing generated-type drift unrelated to the role-color restoration work.
- **Action:** Not fixed, per SCOPE BOUNDARY rule. Left for a future dedicated Next.js route-type
  cleanup pass.
