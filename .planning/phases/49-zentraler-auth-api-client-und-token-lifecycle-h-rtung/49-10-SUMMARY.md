---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
plan: "10"
subsystem: frontend-auth-api-client
status: split_required
tags:
  - auth
  - api-client
  - anime-edit
  - split-required
dependency_graph:
  requires:
    - 49-05
    - 49-06
    - 49-09
    - AUTH-API-CLIENT-01
  provides:
    - split recommendation for anime edit shell and adjacent edit hooks
  affects:
    - frontend/src/app/admin/anime/[id]/edit/page.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage
    - frontend/src/app/admin/anime/hooks
tech_stack:
  added: []
  patterns:
    - split-before-edit scope gate
    - token-free caller migration planning
key_files:
  created:
    - .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-10-SUMMARY.md
  modified: []
key_decisions:
  - Plan 49-10 stopped before source edits because the bounded edit shell files still depend on relation, theme, Jellyfin sync, and Jellyfin intake hook token contracts outside the declared 10-file slice.
  - The anime edit shell cannot be made token-free safely until those adjacent contracts are included in a follow-up split plan or the static gate is narrowed to exclude explicitly deferred surfaces.
requirements-completed: []
metrics:
  duration: 3 min
  completed: 2026-05-20
---

# Phase 49 Plan 10: Anime Edit Shell And Patch/Asset Controls Summary

Status: SPLIT_REQUIRED

Plan 49-10 stopped at Task 1 before application source edits. The mandatory split gate required rerunning the token ownership search against the exact 49-10 production slice and stopping before source edits if the implementation needed files beyond the listed 10-file budget.

## Scope Gate Result

| Check | Result |
|---|---|
| Files listed by 49-10 | 10 |
| Production files in the 49-10 static gate with token ownership hits | 8 |
| Extra production files required to make those bounded files token-free without breaking behavior | 6 |
| Implementation attempted | No |
| App/source files changed | None |
| Summary created | Yes |

## Blocking Evidence

Command:

```powershell
rg -n "\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken" frontend/src/app/admin/anime/[id]/edit/page.tsx frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx frontend/src/app/admin/anime/components/AnimePatchForm/AnimePatchForm.tsx frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts
```

The exact 49-10 slice still contains token ownership in:

- `frontend/src/app/admin/anime/[id]/edit/page.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx`
- `frontend/src/app/admin/anime/components/AnimePatchForm/AnimePatchForm.tsx`
- `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts`
- `frontend/src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.ts`

Removing those hits safely requires at least these additional production files because the target files pass tokens into their current contracts:

- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx`
- `frontend/src/app/admin/anime/hooks/useAdminAnimeRelations.ts`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx`
- `frontend/src/app/admin/anime/hooks/useAdminAnimeThemes.ts`
- `frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts`
- `frontend/src/app/admin/anime/hooks/internal/useJellyfinSyncImpl.ts`

Changing only the listed 49-10 files would either leave the required static search failing or require passing fake token-shaped values/removing reachable relation/theme/sync behavior. That would violate the Phase 49 central-auth boundary and the plan requirement to preserve existing behavior.

## Split Recommendation

Create a follow-up implementation slice that includes the 49-10 files plus the six adjacent relation/theme/Jellyfin hook contracts, or narrow the 49-10 static gate to explicitly defer `AnimeRelationsSection`, `AnimeThemesSection`, and legacy `AdminAnimeEditPageClient` sync/theme surfaces to 49-11.

Recommended next split:

1. **49-10A Anime edit patch and asset controls**
   - Scope: `AnimeEditWorkspace.tsx`, `AnimePatchForm.tsx`, `useAnimePatchImpl.ts`, `useAnimePatchMutations.ts`, `AnimeJellyfinAssetUploadControls.tsx`, `AnimeJellyfinMetadataSection.tsx`, and focused tests.
   - Goal: remove patch, upload, Jellyfin metadata, and asset token arguments while preserving asset slot vocabulary, additive backgrounds, endpoint URLs, and media ownership.

2. **49-10B Edit shell adjacent contracts**
   - Scope: `page.tsx`, `AdminAnimeEditPageClient.tsx`, `AnimeRelationsSection.tsx`, `useAdminAnimeRelations.ts`, `AnimeThemesSection.tsx`, `useAdminAnimeThemes.ts`, `useJellyfinIntakeImpl.ts`, and `useJellyfinSyncImpl.ts`.
   - Goal: remove edit shell, relation, theme, and Jellyfin sync/intake token props without changing relation semantics, theme segment ownership, Jellyfin preview/adoption behavior, or streaming routes.

## Tasks

| Task | Result | Notes |
|---|---|---|
| Task 1: Enforce anime edit shell split scope before edits | SPLIT_REQUIRED | Exact-slice token search requires additional files outside the 10-file budget. |
| Task 2: Remove token threading from edit shell and patch flow | NOT RUN | Blocked by Task 1 split rule. |
| Task 3: Remove token threading from Jellyfin edit asset and metadata controls | NOT RUN | Blocked by Task 1 split rule. |

## Deviations from Plan

None. The plan explicitly required stopping before source edits and writing this summary if implementation needed files beyond the listed 10-file slice.

## Known Stubs

None. This summary records a split decision only.

## Threat Flags

None. No application code, endpoint, auth path, file access behavior, schema, backend permission behavior, Jellyfin/streaming route, release media ownership, anime media ownership, or group media ownership was changed.

## Verification

Automated checks run:

- `rg -n "\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken" [49-10 production files]` - SPLIT_REQUIRED evidence.
- `rg -n "\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken" [six adjacent relation/theme/Jellyfin files]` - confirmed extra files still own token contracts.

Not run:

- `npm run test -- app/admin/anime/[id]/edit/page.test.tsx app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts`
- `npm run typecheck`
- Source-file `git diff --check`

These implementation checks were not run because application edits were intentionally stopped by Task 1.

## Residual Risks

- `AUTH-API-CLIENT-01` remains incomplete for anime edit shell, patch, asset, relation, theme, and Jellyfin sync/intake surfaces.
- The repo remains heavily dirty with unrelated existing work; no unrelated files were staged or reverted.
- Plan 49-04 final static gates should remain blocked until the anime edit split is replanned and implemented.

## Commits

- No source implementation commit. A summary-only metadata commit should contain this file.

## Self-Check: PASSED

- Found `49-10-SUMMARY.md`.
- Confirmed no application source files were edited by this plan.
- Confirmed the split gate evidence requires files beyond the 49-10 budget.
