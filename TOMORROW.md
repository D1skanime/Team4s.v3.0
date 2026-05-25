# TOMORROW

## Top 3 Priorities
1. Review the Phase 50 frontend boundary diff and choose the exact commit slice.
2. Re-run targeted tests for the chosen slice before staging.
3. Keep unrelated `.codex/`, `.planning/`, backend media, screenshots, temp files, and generated artifacts out of the Phase 50 commit.

## First 15-Minute Task
- Run `git diff -- frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx frontend/src/app/admin/fansubs/direct-access-gate.test.tsx frontend/src/components/auth/PlatformAdminGate.test.tsx frontend/src/app/admin/my-groups/[id]/page.test.tsx` and write a one-line keep/drop decision for each file.

## Dependencies To Unblock Early
- Decide whether `frontend/tsconfig.tsbuildinfo` should be staged or ignored for the Phase 50 slice.
- If including `frontend/src/components/auth/PlatformAdminGate.test.tsx`, re-run that test explicitly because it was not part of the final direct-access verification command.
- Confirm the branch is still `codex/ui-system-closeout-2026-05-21`.
- Use explicit-path staging only; do not stage temp screenshots, `.clone/`, generated GSD/Codex files, or broad planning artifacts by accident.
