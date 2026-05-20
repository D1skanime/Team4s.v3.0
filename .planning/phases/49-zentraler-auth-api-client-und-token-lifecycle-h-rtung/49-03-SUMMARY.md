---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
plan: "03"
subsystem: frontend-auth-api-client
status: split_required
tags:
  - auth
  - api-client
  - token-lifecycle
  - split-required
dependency_graph:
  requires:
    - 49-01
    - 49-02
    - AUTH-API-CLIENT-01
  provides:
    - split recommendation for normal frontend caller migration
  affects:
    - frontend/src/lib/api.ts
    - frontend/src/lib/api/admin-anime-intake.ts
    - frontend/src/lib/useAuthSession.ts
    - frontend/src/app/admin/fansubs
    - frontend/src/app/admin/anime
    - frontend/src/app/admin/episode-versions
tech_stack:
  added: []
  patterns:
    - split-before-edit scope gate
    - token-free caller migration planning
key_files:
  created:
    - .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-03-SUMMARY.md
  modified: []
key_decisions:
  - Plan 49-03 was stopped before implementation because the 49-01 inventory lists normal frontend token ownership beyond the 10 files allowed by 49-03.
  - Caller migration must be split into smaller plans before removing broad authToken ownership from pages, components, hooks, and helper signatures.
requirements-completed: []
metrics:
  duration: 4 min
  completed: 2026-05-20
---

# Phase 49 Plan 03: Normal Frontend Caller Migration Summary

Status: SPLIT_REQUIRED

Plan 49-03 stopped at Task 1 before application edits. The plan's split rule required comparing the 49-01 inventory against the 49-03 `files_modified` list before implementation. That comparison found normal frontend token ownership outside the listed paths, so the migration cannot safely proceed in this 10-file slice.

## Scope Gate Result

| Check | Result |
|---|---|
| Files listed by 49-03 | 10 |
| 49-01 inventory rows classified `centralize` and owner `49-03` | 42 unique files |
| Inventory-owned files beyond 49-03 listed paths | 35 |
| Implementation attempted | No |
| App/source files changed | None |
| Summary commit | Created after summary self-check |

## Blocking Evidence

The 49-01 inventory identifies these 35 additional normal frontend token-ownership files beyond 49-03's listed paths:

- `frontend/src/app/admin/anime/[id]/edit/page.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/edit/page.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/[episodeId]/versions/page.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/page.tsx`
- `frontend/src/app/admin/anime/components/AdminAnimeOverviewClient.tsx`
- `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx`
- `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx`
- `frontend/src/app/admin/anime/components/AnimePatchForm/AnimePatchForm.tsx`
- `frontend/src/app/admin/anime/components/EpisodeManager/EpisodeManager.tsx`
- `frontend/src/app/admin/anime/create/createPageHelpers.ts`
- `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts`
- `frontend/src/app/admin/anime/hooks/internal/episode-manager/useEpisodeManagerBulkMutations.ts`
- `frontend/src/app/admin/anime/hooks/internal/episode-manager/useEpisodeManagerEditMutations.ts`
- `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts`
- `frontend/src/app/admin/anime/hooks/internal/useEpisodeManagerImpl.ts`
- `frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts`
- `frontend/src/app/admin/anime/hooks/internal/useJellyfinSyncImpl.ts`
- `frontend/src/app/admin/anime/hooks/useAdminAnimeRelations.ts`
- `frontend/src/app/admin/anime/hooks/useAdminAnimeThemes.ts`
- `frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseSegments.ts`
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx`
- `frontend/src/app/admin/fansubs/create/page.tsx`
- `frontend/src/app/admin/fansubs/merge/page.tsx`
- `frontend/src/app/admin/fansubs/page.tsx`

## Split Recommendation

Replace 49-03 with narrower follow-up plans in this order:

1. **Helper/API contract migration**
   - Scope: `frontend/src/lib/api.ts`, `frontend/src/lib/api/admin-anime-intake.ts`, and focused helper tests.
   - Goal: remove normal browser `authToken` helper parameters, keep central `apiClientFetch` ownership, and preserve 49-02 no-replay behavior for unsafe uploads.

2. **Upload and media caller migration**
   - Scope: `frontend/src/components/admin/MediaUpload.tsx`, `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`, and the upload helper call sites selected by the helper/API plan.
   - Goal: migrate progress upload callers to token-free booleans without changing group media, release media, release-version media, FormData fields, endpoint URLs, or ownership tables.

3. **Fansub admin caller migration**
   - Scope: fansub edit/list/create/merge pages and fansub edit child sections, capped at 10 files per plan.
   - Goal: remove `authToken` props/locals from fansub admin flows while preserving capability-driven UI, scoped loading/error behavior, release-theme asset ownership, and group media ownership.

4. **Anime create caller migration**
   - Scope: `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts`, `createAssetUploadPlan.ts`, `createPageHelpers.ts`, and directly coupled create components only if needed.
   - Goal: remove create-flow token threading while preserving existing Jellyfin/AniSearch intake, post-create asset sequencing, singular asset slots, and additive backgrounds.

5. **Anime edit and episode caller migration**
   - Scope: anime edit pages, anime context components, patch/episode hooks, episode manager components, and segment/editor hooks, split further if the file count exceeds 10.
   - Goal: remove remaining normal frontend token ownership from anime edit and episode/version surfaces without migrating SSR pages, streaming routes, backend permissions, database schema, or media ownership.

49-04 static gates should stay deferred until these split implementation plans land.

## Tasks

| Task | Result | Notes |
|---|---|---|
| Task 1: Confirm migration scope and split if inventory expanded | SPLIT_REQUIRED | Inventory exceeded the listed file set and the 10-file budget. |
| Task 2: Remove token parameters from API helpers and safe upload paths | NOT RUN | Blocked by Task 1 split rule. |
| Task 3: Remove token props and locals from normal pages/components | NOT RUN | Blocked by Task 1 split rule. |

## Deviations from Plan

None. The plan explicitly required stopping and splitting before edits when inventory expanded beyond listed files.

## Known Stubs

None. This summary records a blocked split decision only.

## Threat Flags

None. No application code, endpoint, auth path, file access behavior, schema, release media ownership, or group media ownership was changed.

## Verification

Automated checks run:

- Compared 49-01 inventory rows classified `centralize` and owner `49-03` against the 49-03 `files_modified` list.
- `git diff --check -- .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-03-SUMMARY.md`

Not run:

- Frontend typecheck, tests, lint, and static auth gates were not run because implementation was intentionally stopped before source edits.

## Residual Risks

- The broad frontend `authToken` caller surface remains unresolved until the split follow-up plans are created and executed.
- The workspace remains dirty with unrelated user/agent changes. This plan changed only this summary file.
- `AUTH-API-CLIENT-01` remains incomplete because caller migration did not execute.

## Self-Check: PASSED

- Found `49-03-SUMMARY.md`.
- Confirmed no app/source implementation files were edited by this plan.
- Confirmed the split gate evidence exceeds the 10-file budget.
