---
phase: 103
plan: "08"
status: complete
completed: 2026-07-16
commits:
  - 13a962b5
  - 0871780c
---

# Plan 103-08 Summary

## Delivered

- Made the public release-detail aggregate explicitly session-neutral by using a public no-auth server fetch. Public Karaoke titles and segment metadata no longer pass through auth preflight or browser refresh state.
- Kept `ThemeTimeline` derived solely from the public `segments` prop. Guest, access-token, and refresh-only rerenders retain identical segment titles; authentication only adds play controls.
- Added typed `getReleasePlaybackAccess(releaseVersionID)` to the central browser API client. It calls the private backend endpoint with `cache: no-store` through `apiClientFetch`.
- Updated `ReleaseEpisodePlayer` to use the typed helper only after client initialization and an access-or-refresh session. It contains failures locally and renders only when the resolver allows playback and the source is ready.
- Removed the redundant `/api/releases/[id]/playback-access` JSON Next relay and its source-text-only test after confirming there are no callers.
- Preserved `/api/releases/[id]/stream` and `/api/segments/[id]/stream`; grant issuance, byte-stream cookie handoff, backend entitlement resolver and final stream rechecks remain unchanged.

## Files changed

- `frontend/src/lib/api.ts`
- `frontend/src/lib/api.auth-refresh.test.ts`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ThemeTimeline.test.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.tsx`
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseEpisodePlayer.test.tsx`
- removed `frontend/src/app/api/releases/[id]/playback-access/route.ts`
- removed `frontend/src/app/api/releases/[id]/playback-access/route.test.ts`

## Verification

- ThemeTimeline focused suite — 4 tests passed.
- Central auth-refresh and ReleaseEpisodePlayer suites — 21 tests passed.
- Coverage includes guest/access/refresh-only segment stability, pre-init/no-session gating, allow+ready rendering, local access errors, one 401 refresh/retry, rotated refresh persistence, and non-retried 403 denial.
- `npm run typecheck` — passed.
- Focused ESLint for plan files — passed.
- Full `npm run lint` — blocked only by the existing `FansubStorySection.tsx:49` set-state-in-effect error; plan files introduced no errors.
- `npm run build` — passed after one transient `.next/lock` collision with another concurrent build.
- `rg` confirms no JSON relay/caller remains and both stream relay files still exist.
- `git diff --check` — passed.

## Deviations and UAT

- `releaseDetailPageData.tsx`, `ThemeTimeline.tsx`, backend handlers and contracts required no production change: their data/authorization behavior was already correct once the public fetch and protected helper boundaries were fixed.
- Live in-app browser UAT was unavailable in this agent context. Automated tests exercise the required session transitions and central refresh behavior without mutating release data.
- Build-generated `frontend/next-env.d.ts` and unrelated shared-worktree assets were not staged.
