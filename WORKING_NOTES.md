# WORKING_NOTES

## Current Workflow Phase
- Phase 50 platform-admin boundary and contributor-scope governance is active.
- Phase 48 contributor dashboard and Phase 49 Docker-live API/media proxy follow-through remain the verified baseline.
- Keep release-native media ownership untouched unless a task explicitly targets it.

## Useful Facts To Keep
- `frontend/src/app/admin/fansubs/create/page.tsx` and `frontend/src/app/admin/fansubs/merge/page.tsx` already wrap their content in `PlatformAdminGate`.
- `frontend/src/app/admin/fansubs/direct-access-gate.test.tsx` now proves non-platform direct visits see the admin gate and do not call `getFansubList()`.
- `EpisodeVersionEditorPage` now has a loaded-scope boundary:
  - no tab shell until `currentUser` and release capabilities are both loaded
  - platform admins get the full admin tab set
  - non-platform users only get `media` and/or `notizen` when capabilities allow
  - no-capability non-platform users see `Kein Zugriff auf diese Release-Version.`
- Backend contributor editor context is already narrowed in `loadEpisodeVersionContributorContext`; it omits admin fields such as anime folder path/provider IDs/stream URL.

## Verification Memory
- `cd frontend && npx vitest run src/app/admin/episode-versions/[versionId]/edit/page.test.tsx src/app/admin/fansubs/direct-access-gate.test.tsx` passed (9 tests).
- `cd frontend && npx eslint src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx src/app/admin/episode-versions/[versionId]/edit/page.test.tsx src/app/admin/fansubs/direct-access-gate.test.tsx` passed.
- `cd frontend && npx tsc --noEmit --pretty false` passed.
- Targeted `git diff --check` passed for the editor/direct-access files.
- `cd frontend && npm run build` passed after the editor/direct-access changes.

## Commit Hygiene Notes
- The worktree includes many unrelated dirty paths. Use `git status --short --branch` and explicit-path staging only.
- `frontend/tsconfig.tsbuildinfo` is dirty after local verification/build.
- Untracked `frontend/src/components/auth/PlatformAdminGate.test.tsx` appears relevant to the same boundary thread; inspect before deciding whether to include it with the Phase 50 slice.
- Do not mix `.codex/get-shit-done`, `.codex/skills`, screenshots, `.tmp-*`, `.clone/`, or broad `.planning/` updates with the product/test commit.
