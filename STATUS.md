# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Branch:** `codex/ui-system-closeout-2026-05-21`
- **Status:** Phase 50 admin-boundary/contributor-scope regression work is in progress and locally verified in targeted slices.
- **Current focus:** Commit-slice the Phase 50 frontend boundary fixes/tests from the broad dirty worktree without pulling in unrelated GSD/tooling/temp changes.

## What Works Now
- `/admin/fansubs/create` and `/admin/fansubs/merge` are wrapped in `PlatformAdminGate`; direct-access tests prove non-platform users do not mount the page bodies or load group data.
- `EpisodeVersionEditorPage` renders no tab shell while current user plus release capabilities are still loading.
- Platform admins get the full release-version admin tab set only after the capability scope is ready.
- Non-platform users never enter the admin-tab branch; they only see media/notes surfaces when release capabilities grant them.
- Contributor editor context is already narrowed backend-side via `loadEpisodeVersionContributorContext`; no backend change was needed for that item today.
- Earlier Phase 49 same-origin API/media proxy behavior remains part of the baseline.

## What Is Not Done Yet
- The worktree is not clean. There are many unrelated or not-yet-sliced changes under `.codex/`, `.planning/`, backend, frontend, screenshots, temp folders, and generated artifacts.
- `frontend/tsconfig.tsbuildinfo` is dirty after local verification/build and needs a deliberate include/exclude decision.
- Untracked `frontend/src/components/auth/PlatformAdminGate.test.tsx` exists alongside today's new `frontend/src/app/admin/fansubs/direct-access-gate.test.tsx`; decide the exact test commit boundary before staging.
- Repo-wide lint/build should not be inferred from the entire dirty tree. Use targeted checks per slice until the dirty state is split.

## Valid Commands
- `cd frontend && npx vitest run src/app/admin/episode-versions/[versionId]/edit/page.test.tsx src/app/admin/fansubs/direct-access-gate.test.tsx`
- `cd frontend && npx eslint src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx src/app/admin/episode-versions/[versionId]/edit/page.test.tsx src/app/admin/fansubs/direct-access-gate.test.tsx`
- `cd frontend && npx tsc --noEmit --pretty false`
- `cd frontend && npm run build`
- `git diff --check`
- `git status --short --branch`
- `docker compose up -d --build`
- `cd backend && go test ./...`

## Verification Evidence
- Targeted Vitest passed: `src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` and `src/app/admin/fansubs/direct-access-gate.test.tsx` (9 tests).
- Targeted ESLint passed for `EpisodeVersionEditorPage.tsx`, editor page tests, and direct-access gate tests.
- Frontend `npx tsc --noEmit --pretty false` passed.
- Targeted `git diff --check` passed for the editor/direct-access files.
- Frontend `npm run build` passed after the editor/direct-access slice.
- Earlier closeout notes recorded additional green targeted tests around my-groups release media links and `PlatformAdminGate.test.tsx`; re-run that exact slice before committing it.

## Top 3 Next
1. Review the Phase 50 diff for only `EpisodeVersionEditorPage.tsx`, editor page tests, direct-access gate tests, `PlatformAdminGate.test.tsx`, and my-groups link tests.
2. Decide whether `frontend/tsconfig.tsbuildinfo` belongs in the commit or should be left unstaged.
3. Stage by explicit path only, then re-run the targeted tests for the staged slice.

## Risks / Blockers
- Broad dirty worktree is the main operational risk; never use `git add .` from this state.
- GSD/Codex tooling changes and planning artifacts should not be mixed with product boundary tests.
- Temp screenshots and `.tmp-*` files are evidence, not safe default commit material.
- Backend release/fansub media ownership was not changed today; keep future cleanup on canonical release/fansub-group structures.
