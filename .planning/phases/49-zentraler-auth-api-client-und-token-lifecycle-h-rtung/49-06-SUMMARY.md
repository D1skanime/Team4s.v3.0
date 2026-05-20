---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
plan: "06"
subsystem: frontend-auth-api-client
status: complete
tags:
  - auth
  - api-client
  - upload-auth
  - media-upload
dependency_graph:
  requires:
    - 49-05
    - AUTH-API-CLIENT-01
  provides:
    - token-free shared MediaUpload caller
    - focused MediaUpload regression tests
    - release-version media caller verification
  affects:
    - frontend/src/components/admin/MediaUpload.tsx
    - frontend/src/components/admin/MediaUpload.test.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
tech_stack:
  added: []
  patterns:
    - token-free shared upload component
    - public/no-auth remote source fetch classification
    - compatibility index for parent pages pending 49-07/49-09 cleanup
key_files:
  created:
    - frontend/src/components/admin/MediaUpload.test.tsx
  modified:
    - frontend/src/components/admin/MediaUpload.tsx
key_decisions:
  - MediaUpload no longer declares or forwards token-shaped upload/delete props; parents remain a later split-plan concern.
  - MediaUpload keeps a compatibility index signature so existing parent pages can finish migrating in 49-07/49-09 without breaking typecheck in this slice.
  - useReleaseVersionMedia was already token-free for upload calls and was left untouched despite pre-existing dirty changes.
requirements-completed:
  - AUTH-API-CLIENT-01
metrics:
  duration: 7 min
  completed: 2026-05-20
---

# Phase 49 Plan 06: Shared Upload/Media Caller Migration Summary

Shared fansub media upload now calls the central upload/delete helpers without token forwarding, with focused tests for progress, disabled gating, delete behavior, and public remote-source fetches.

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-20T15:24:10Z
- **Completed:** 2026-05-20T15:30:33Z
- **Tasks:** 3
- **Files modified:** 2 committed files

## Outcome

Status: COMPLETE

`MediaUpload` no longer has an explicit token prop and no longer forwards token values into `uploadFansubMedia` or `deleteFansubMedia`. Its existing progress callback, busy callback, disabled checks, crop/edit behavior, group media helper calls, and public remote logo fetch behavior are preserved.

`useReleaseVersionMedia` already called `uploadReleaseVersionMedia` without token arguments. It was read and verified for this plan but not modified or staged because it already had unrelated dirty changes before 49-06 started.

## Tasks Completed

| Task | Result | Commit | Files |
|---|---|---|---|
| Task 1: Enforce upload/media split scope before edits | PASS | no code commit | Scoped search found only `MediaUpload` token hits; 49-05 completion confirmed. |
| Task 2: Remove token props from shared media upload callers | PASS | `dc09be87` | `MediaUpload.tsx` |
| Task 3: Add focused upload caller regression coverage | PASS | `4dd06c24` | `MediaUpload.test.tsx` |

## Files Changed

- `frontend/src/components/admin/MediaUpload.tsx` - Removed explicit token prop destructuring/forwarding and calls group media upload/delete helpers without token arguments.
- `frontend/src/components/admin/MediaUpload.test.tsx` - Added focused tests for token-free upload/delete calls, disabled-state gating, progress/busy callbacks, and unauthenticated remote logo fetch.

## Decisions Made

- Parent fansub pages still pass legacy upload props in the current dirty workspace, but those pages are assigned to 49-07/49-09. This plan kept that migration out of scope and used a compatibility index signature on `MediaUploadProps` so the shared component can be token-free without forcing parent edits here.
- Remote logo edit fetch remains public/no-auth and is not routed through the protected API client.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kept parent-page migration out of the shared component slice**
- **Found during:** Task 2
- **Issue:** Existing parent fansub pages still pass legacy props to `MediaUpload`; removing the explicit prop would otherwise force parent-page edits assigned to later plans or break typecheck.
- **Fix:** Added a generic compatibility index signature to `MediaUploadProps`, while removing explicit token prop ownership and ensuring upload/delete helpers receive no token values.
- **Files modified:** `frontend/src/components/admin/MediaUpload.tsx`
- **Verification:** Scoped token search, `npm run typecheck`, focused component tests.
- **Committed in:** `dc09be87`

**Total deviations:** 1 auto-fixed (Rule 3). **Impact:** No media ownership or upload behavior change; later fansub caller plans still own parent-page prop cleanup.

## Known Stubs

None. Stub-pattern scan hits were existing initialized arrays/null resets in component and hook code, not UI stubs or unwired data paths.

## Threat Flags

None. This plan introduced no new endpoint, schema change, backend permission behavior, streaming behavior, release media ownership path, or group media ownership path.

## Verification

Automated checks run:

- `cd frontend && npm run test -- components/admin/MediaUpload.test.tsx` - PASS
- `cd frontend && npm run typecheck` - PASS
- `cd frontend && npx eslint src/components/admin/MediaUpload.tsx src/components/admin/MediaUpload.test.tsx` - PASS
- `git diff --check -- frontend/src/components/admin/MediaUpload.tsx frontend/src/components/admin/MediaUpload.test.tsx frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` - PASS
- Scoped static gate: `rg -n "\bauthToken\b|authToken\s*[?:=]|authToken=\{" frontend/src/components/admin/MediaUpload.tsx frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` - PASS, zero hits

## Residual Risks

- Parent fansub pages still have pre-existing token-threading and are intentionally left for 49-07/49-09.
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` remains dirty with pre-existing changes that were not made, staged, or committed by this plan.
- `.planning/STATE.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md` were already dirty before this plan; this execution did not mutate or stage them to avoid mixing unrelated tracking drift into the 49-06 summary commit.

## Commits

- `dc09be87` - `feat(49-06): make media upload token-free`
- `4dd06c24` - `test(49-06): cover token-free media upload`

## Self-Check: PASSED

- Found `frontend/src/components/admin/MediaUpload.tsx`.
- Found `frontend/src/components/admin/MediaUpload.test.tsx`.
- Found `49-06-SUMMARY.md`.
- Found implementation commit `dc09be87`.
- Found test commit `4dd06c24`.
- Scoped tests, typecheck, targeted lint, static token gate, and diff whitespace checks passed.
