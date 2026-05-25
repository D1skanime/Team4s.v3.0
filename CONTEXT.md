# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** `v1.1 asset lifecycle hardening`
- **Current branch:** `codex/ui-system-closeout-2026-05-21`
- **Current slice:** Phase 50 platform-admin boundary and contributor-scope governance is the active frontend cleanup slice.

## Current State

### What Finished In This Pass
- `EpisodeVersionEditorPage` now waits for both current user and release-version capabilities before rendering a tab shell.
- Platform-admin tabs render only for `currentUser.is_platform_admin === true`.
- Non-platform contributors are limited to release capability surfaces: media and/or notes. They do not enter the admin-tab branch.
- Direct non-platform visits to `/admin/fansubs/create` and `/admin/fansubs/merge` are covered by a new regression test that proves the `PlatformAdminGate` blocks child mounting/data loading.
- Existing backend contributor context was inspected and is already narrowed through `loadEpisodeVersionContributorContext`; no backend editor-context change was required.

### What Works
- Release-version editor visibility is capability-driven from backend release-version capabilities.
- Fansub create/merge pages are platform-admin gated.
- Targeted tests, targeted lint, frontend typecheck, targeted diff check, and frontend build passed for the editor/direct-access slice.
- Phase 49 same-origin API/media proxy behavior remains the runtime baseline.

### What Is Open
- The worktree is very broad and dirty. Product code, GSD/Codex tooling, planning docs, screenshots, temp folders, and generated artifacts coexist.
- `frontend/src/components/auth/PlatformAdminGate.test.tsx` is untracked and relevant to the same boundary theme, but it was not part of the final direct-access test command in this pass.
- `frontend/tsconfig.tsbuildinfo` is dirty after verification/build.
- The next action is commit hygiene, not more feature work.

## Active Planning Context
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Current phase/thread: Phase 50 `platform-admin boundaries und contributor scope governance`
- Earlier baseline: Phase 48 contributor dashboard and Phase 49 Docker-live API/media proxy follow-through are done enough to serve as the baseline.
- Phase 42 collaboration remains parked until auth/member/capability behavior stays stable.

## Key Decisions In Force
- Keycloak owns identity; Team4s owns app users, global roles, fansub memberships, and permission decisions.
- Permission-aware frontend screens should consume backend capability endpoints instead of re-inferring roles.
- Release-version editor admin tabs are platform-admin only.
- Non-platform release-version users get only capability-granted media/notes surfaces.
- Browser-facing API/media URLs should be same-origin or explicitly public-domain. Docker-internal backend addresses belong only in server-side proxy/streaming boundaries.
- Release/fansub media must stay on canonical release/fansub-group structures, not attach directly to neutral episodes/anime.
- Pushes from this dirty workspace must be explicitly sliced; temp screenshots and broad GSD update noise are not safe default commit material.
