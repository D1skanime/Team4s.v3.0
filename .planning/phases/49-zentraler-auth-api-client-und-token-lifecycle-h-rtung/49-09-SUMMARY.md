---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
plan: "09"
subsystem: frontend-auth-api-client
status: split_required
tags:
  - auth
  - api-client
  - token-lifecycle
  - split-required
dependency_graph:
  requires:
    - 49-05
    - 49-06
    - AUTH-API-CLIENT-01
  provides:
    - split recommendation for anime edit, episode, and segment caller migration
  affects:
    - frontend/src/app/admin/anime
    - frontend/src/app/admin/episode-versions
tech_stack:
  added: []
  patterns:
    - split-before-edit scope gate
    - token-free caller migration planning
key_files:
  created:
    - .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-09-SUMMARY.md
  modified: []
key_decisions:
  - Plan 49-09 stopped before source edits because the mandatory split gate found 28 production files and 191 token-ownership hits, exceeding the 10-file budget.
  - Remaining anime edit, episode, and segment migration must be split into smaller implementation plans before application code is edited.
requirements-completed: []
metrics:
  duration: 4 min
  completed: 2026-05-20
---

# Phase 49 Plan 09: Anime Edit, Episode, and Segment Caller Migration Summary

Status: SPLIT_REQUIRED

Plan 49-09 stopped at Task 1 before source edits. The mandatory split gate required rerunning the normal frontend token ownership search for `frontend/src/app/admin/anime` and `frontend/src/app/admin/episode-versions` and stopping if the remaining migration exceeded the 10-file budget. It does exceed the budget.

## Scope Gate Result

| Check | Result |
|---|---|
| Files listed by 49-09 | 10 |
| Production files with token ownership hits | 28 |
| Static token ownership hits | 191 |
| Implementation attempted | No |
| App/source files changed | None |
| Summary created | Yes |

## Blocking Evidence

Command:

```powershell
rg -n "\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken" frontend/src/app/admin/anime frontend/src/app/admin/episode-versions --glob "!**/*.test.ts*"
```

Files still containing normal frontend token ownership:

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

## Split Recommendation

Create additional numeric plans before resuming application edits:

1. **49-10 Anime edit shell and patch/asset controls**
   - Scope: `anime/[id]/edit/page.tsx`, `AdminAnimeEditPageClient.tsx`, `AnimeEditWorkspace.tsx`, `AnimePatchForm.tsx`, `useAnimePatchImpl.ts`, `anime-patch/useAnimePatchMutations.ts`, `AnimeJellyfinAssetUploadControls.tsx`, and `AnimeJellyfinMetadataSection.tsx`.
   - Goal: remove edit-page and patch/asset token threading while preserving existing anime asset slots, Jellyfin preview/adoption boundaries, endpoint URLs, and no media ownership changes.

2. **49-11 Anime context, relations, themes, and Jellyfin edit hooks**
   - Scope: `AnimeContextCard.tsx`, `AnimeContextFansubManager.tsx`, `AnimeRelationsSection.tsx`, `AnimeThemesSection.tsx`, `useAdminAnimeRelations.ts`, `useAdminAnimeThemes.ts`, `useJellyfinIntakeImpl.ts`, `useJellyfinSyncImpl.ts`, and `useAniSearchEditEnrichment.ts`.
   - Goal: migrate relation/theme/context/Jellyfin-adjacent edit callers to `hasAccessToken` and central helpers without changing relation semantics, theme segment ownership, or backend permissions.

3. **49-12 Episode admin pages and episode manager hooks**
   - Scope: `anime/[id]/episodes/page.tsx`, `anime/[id]/episodes/[episodeId]/edit/page.tsx`, `anime/[id]/episodes/[episodeId]/versions/page.tsx`, `EpisodeManager.tsx`, `useEpisodeManagerImpl.ts`, `episode-manager/useEpisodeManagerEditMutations.ts`, and `episode-manager/useEpisodeManagerBulkMutations.ts`.
   - Goal: remove episode CRUD token threading while preserving neutral episode ownership and release/version navigation behavior.

4. **49-13 Episode-version editor and segment surfaces**
   - Scope: `episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts`, `useReleaseSegments.ts`, `SegmenteTab.tsx`, and focused segment tests such as `SegmenteTab.test.tsx` if needed.
   - Goal: remove segment/editor token threading while preserving release-version segment ownership, upload behavior, FormData/payload shapes, and no Jellyfin/streaming redesign.

5. **49-14 Admin anime overview and final anime/episode static cleanup**
   - Scope: `AdminAnimeOverviewClient.tsx` plus any residual production hits found after 49-10 through 49-13.
   - Goal: close remaining normal frontend token ownership under `frontend/src/app/admin/anime` and `frontend/src/app/admin/episode-versions` before the final 49-04 static gates.

Each implementation plan should rerun the same static search at its Task 1 split gate and stay at or below 10 touched files including required tests.

## Tasks

| Task | Result | Notes |
|---|---|---|
| Task 1: Mandatory split gate for anime edit, episode, and segment scope | SPLIT_REQUIRED | Current scope has 28 production files and 191 hits. |
| Task 2: Remove token threading from the bounded remaining caller slice | NOT RUN | Blocked by Task 1 split rule. |
| Task 3: Prove no remaining normal frontend token ownership or stop with split evidence | NOT RUN | Blocked by Task 1 split rule. |

## Deviations from Plan

None. The plan explicitly required stopping before source edits and creating a split summary when the remaining migration exceeded the listed 10-file budget.

## Known Stubs

None. This summary records a split decision only.

## Threat Flags

None. No application code, endpoint, auth path, file access behavior, schema, backend permission behavior, Jellyfin/streaming route, release media ownership, segment ownership, or group media ownership was changed.

## Verification

Automated checks run:

- `rg -n "\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken" frontend/src/app/admin/anime frontend/src/app/admin/episode-versions --glob "!**/*.test.ts*"` - SPLIT_REQUIRED evidence, 191 hits.
- `rg -l "\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken" frontend/src/app/admin/anime frontend/src/app/admin/episode-versions --glob "!**/*.test.ts*" | Sort-Object` - SPLIT_REQUIRED evidence, 28 files.

Not run:

- `npm run typecheck`
- `npm run test -- app/admin/episode-versions/[versionId]/edit/SegmenteTab.test.tsx`
- Source-file `git diff --check`

These implementation checks were not run because application edits were intentionally stopped by Task 1.

## Residual Risks

- `AUTH-API-CLIENT-01` remains incomplete for anime edit, episode, and segment surfaces until the recommended split plans execute.
- The repo remains heavily dirty with unrelated existing work; no unrelated files were staged or reverted.
- Plan 49-04 final static gates should remain blocked until the split implementation plans close these remaining normal frontend token ownership hits.

## Commits

- No source implementation commit. A summary-only metadata commit should contain this file.

## Self-Check: PASSED

- Found `49-09-SUMMARY.md`.
- Confirmed no application source files were edited by this plan.
- Confirmed the split gate evidence exceeds the 10-file budget.
