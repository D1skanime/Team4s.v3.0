---
quick_id: 260605-iyz
slug: phase-72-73-public-projection-hardening-
status: complete
date: 2026-06-05
mode: validate
---

# Summary: Phase 72/73 Public Projection Hardening And Fansub Page Integration Fix

## Completed

- Hardened the Phase-72 public domain projection:
  - Removed `app_user_id` from the public member DTO.
  - Removed the `au.email` public display fallback.
  - Gated active member rows to real public member profiles.
- Hardened the Phase-72 media ownership projection:
  - Public endpoint now returns only `visibility='public'` and `review_status='approved'` rows at the repository boundary.
- Updated runtime/contract/frontend parity:
  - Backend source guards.
  - `frontend/src/types/domain-projection.ts`.
  - `frontend/src/types/__tests__/v12-projection-contract.test.ts`.
  - `shared/contracts/openapi.yaml`.
- Updated the existing Phase-73 worktree branch:
  - Replaced Phase-72 type stubs with final DTO names/shapes.
  - Switched public fansub page media fetch from invalid `group` to canonical `fansub_group`.
  - Removed Release/Member media cards from the group-scoped media section because the current fetch cannot populate those owner scopes.
  - Replaced todo-only tests with executable coverage for media filters, owner-type fetch, project links, and team grouping.

## Checks

- `cd backend && go test ./internal/repository/... -run "TestProjection|TestMediaProjection|TestV12StatusFoundation" -count=1`
- `cd backend && go build ./...`
- `cd frontend && npm run typecheck`
- `cd frontend && npx vitest run src/types/__tests__/v12-projection-contract.test.ts`
- `git diff --check`
- `cd C:/Users/admin/Documents/Team4s-phase73/frontend && npm run typecheck`
- `cd C:/Users/admin/Documents/Team4s-phase73/frontend && npx vitest run src/app/fansubs/__tests__/page.test.tsx src/components/fansubs/__tests__/FansubMediaSection.test.tsx src/components/fansubs/__tests__/FansubProjectsSection.test.tsx src/components/fansubs/__tests__/FansubTeamSection.test.tsx`
- `cd C:/Users/admin/Documents/Team4s-phase73 && git diff --check`

## Notes

- Main `frontend/node_modules` was empty; for checks it was replaced with a local junction to the already-installed Phase-73 worktree dependencies. No tracked dependency files changed.
- Existing untracked `.planning/phases/78-leader-workspace-review-pflege/78-PATTERNS.md` was not touched.
- Phase-73 remains on its dedicated branch/worktree and should be merged after the Phase-72 hardening commit is available.

