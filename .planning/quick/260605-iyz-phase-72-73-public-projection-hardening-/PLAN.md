---
quick_id: 260605-iyz
slug: phase-72-73-public-projection-hardening-
status: in_progress
date: 2026-06-05
mode: validate
---

# Quick Task: Phase 72/73 Public Projection Hardening And Fansub Page Integration Fix

## Scope

Fix the review findings from the Phase 72/73 implementation check:

- Harden public Phase-72 projection endpoints so public responses do not expose internal media paths, application user IDs, or email fallbacks.
- Keep backend runtime DTOs, OpenAPI, frontend DTOs, and API helpers aligned.
- Update the Phase-73 public fansub page branch to consume final Phase-72 DTO names and avoid the invalid `group` media owner type.
- Replace todo-only coverage with focused tests for the critical public filters and integration assumptions.

## Read First

- `docs/engineering/implementation-contract.md`
- `docs/api/api-contracts.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `backend/internal/repository/domain_projection_repository.go`
- `backend/internal/repository/media_ownership_projection_repository.go`
- `backend/internal/handlers/media_ownership_projection_handler.go`
- `frontend/src/types/domain-projection.ts`
- `frontend/src/types/media-ownership.ts`
- `frontend/src/lib/api.ts`
- `C:/Users/admin/Documents/Team4s-phase73/frontend/src/app/fansubs/[slug]/page.tsx`
- `C:/Users/admin/Documents/Team4s-phase73/frontend/src/components/fansubs/*`

## Plan

1. Phase 72 hardening on `main`:
   - Remove public `app_user_id` from the domain projection DTO.
   - Avoid `au.email` as public display fallback.
   - Gate active member rows on member public visibility when a member profile exists.
   - Filter media ownership projection rows to public + approved at the repository boundary.
   - Update contract tests, TS DTOs, and OpenAPI schemas.

2. Phase 73 integration in the existing `codex/phase-73-public-fansub-page` worktree:
   - Replace Phase-72 type stubs with final Phase-72 type imports/names.
   - Use `fansub_group` owner type, not `group`.
   - Avoid rendering Release/Member media blocks as if a group-scoped fetch can populate them.
   - Add executable component tests for filtering behavior and owner-type usage.

3. Verification:
   - Backend focused Go tests.
   - Frontend typecheck and focused Vitest tests in both affected worktrees where relevant.
   - `git diff --check`.

