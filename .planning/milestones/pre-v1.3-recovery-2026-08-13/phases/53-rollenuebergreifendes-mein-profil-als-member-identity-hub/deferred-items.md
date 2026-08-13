# Phase 53-01 Deferred Items

## Out-of-Scope Lint Failures

- `npm run lint` currently fails on pre-existing files outside the 53-01 write scope:
  - `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`
  - `frontend/src/app/dev/ui-system/page.tsx`
  - `frontend/src/components/auth/PlatformAdminGate.tsx`
  - `frontend/tmp-live-full-flow*.js`
- 53-01 targeted lint for changed profile/shell files passes.
