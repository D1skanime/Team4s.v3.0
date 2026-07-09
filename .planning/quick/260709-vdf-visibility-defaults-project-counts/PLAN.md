---
status: complete
date: 2026-07-09
slug: visibility-defaults-project-counts
---

# Quick Task: Visibility Defaults And Project Contributor Counts

## Scope

- New confirmed anime contribution creates default public visibility flags to `true` when the client omits them.
- Admin project/release contribution UIs send `true` for new confirmed rows instead of silently hiding them.
- Public anime+group detail stats expose `project_contributor_count` from confirmed `anime_contributions`.
- Public project hero uses `project_contributor_count` and labels it as project contributors instead of group members.

## Read First

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/api/api-contracts.md`
- `docs/architecture/db-schema-fansub-domain.md`
- `backend/internal/repository/group_repository.go`
- `backend/internal/handlers/fansub_anime_contributions_handler.go`
- `frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseContributionDrawer.tsx`
- `shared/contracts/openapi.yaml`

## Acceptance

- Public project hero no longer shows group membership count as project members.
- Project contributor stat counts confirmed `anime_contributions` even when a profile/card is not publicly visible.
- New confirmed contribution records default to public flags in backend, frontend, and DB default.
- Existing records are not mass-backfilled by this quick task.
- Contracts and DTOs match the changed response/request behavior.
