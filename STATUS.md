# STATUS

## Project Snapshot
- **Project:** Team4s.v3.0
- **Milestone:** `v1.1 Asset Lifecycle Hardening`
- **Branch:** `codex/ui-system-closeout-2026-05-21`
- **Status:** Phase 48 is implemented, real-user tested, validated, reviewed, and UI-reviewed. Phase 49 exists and has a committed Docker live API proxy fix ready to push.
- **Current focus:** Push the narrow closeout/Phase-49 branch state, then cleanly slice the remaining dirty workspace.

## What Works Now
- `GET /api/v1/me/fansub-groups` and `GET /api/v1/me/fansub-groups/:id` were verified with real Keycloak users.
- `/admin/my-groups` and `/admin/my-groups/[id]` render the contributor dashboard and group detail for the correct group context.
- Lead user `phase43-member` can access AnimeOwnage admin/member/media seams and is blocked from Tomoni.
- Contributor user `tomoni.member.auto.20260518152444` can access Tomoni version context, sees no lead-only actions, and is blocked from AnimeOwnage.
- Phase 48 UI matches the global Team4s admin language closely enough for a `PASS` UI review.
- Docker live API routing has a local commit: `04a5f588 fix(49): proxy docker live api requests through frontend`.

## What Is Not Done Yet
- The full worktree is not clean. There are many unrelated or not-yet-sliced changes under `.codex/`, `.planning/`, backend, frontend, migrations, docs, screenshots, and temp folders.
- Temporary screenshots and `.tmp-playwright-uat/` are useful evidence but should not be pushed blindly.
- Phase 48 UI follow-ups remain optional polish: progressive release-list handling, clearer disabled capability badges, stronger media fallbacks.
- Repo-wide lint/build should not be assumed green from the dirty tree; rely on the recorded targeted phase checks until the next explicit verification pass.

## Valid Commands
- `docker compose up -d --build`
- `docker compose up -d --build team4sv30-frontend`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run build`
- `cd frontend && npx eslint src/app/admin/my-groups --ext .ts,.tsx`
- `cd backend && go test ./...`
- `cd backend && go build ./...`
- `git diff --check`
- `git status --short --branch`

## Verification Evidence
- Phase 48 backend: `go test ./...` passed in the prior UAT/validation pass.
- Phase 48 backend: `go build ./...` passed in the prior UAT/validation pass.
- Phase 48 frontend: targeted Vitest, `npm run typecheck`, `npm run build`, and targeted ESLint passed in the prior UAT/validation pass.
- Phase 48 live UAT: real Keycloak login for one fansub lead and one contributor passed own-group and foreign-group access checks.
- Phase 48 UI review: `21/24 PASS`, documented in `.planning/phases/48-meine-gruppen-und-contributor-dashboard/48-UI-REVIEW.md`.
- Closeout hygiene: handoff files updated on 2026-05-21 before push.

## Top 3 Next
1. Create a keep/drop list from `git status --short --branch` before staging any broad remaining work.
2. Decide which Phase 48/49 planning artifacts should become the next intentional commit slice.
3. Re-run targeted frontend/backend checks after the next slice is staged, not before.

## Risks / Blockers
- Broad dirty worktree is the main operational risk.
- The current branch can be pushed safely for its existing local commit plus closeout, but the remaining tree is not PR-clean.
- Do not treat `.tmp-*`, `.clone/`, or generated GSD migration/update files as safe default push material.
