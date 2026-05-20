---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
plan: "11"
subsystem: frontend-auth-api-client
status: complete
tags:
  - auth
  - api-client
  - anime-edit
  - relations
  - themes
dependency_graph:
  requires:
    - 49-05
    - 49-06
    - 49-09
    - AUTH-API-CLIENT-01
  provides:
    - token-free anime context relation and theme callers
    - token-free Jellyfin edit and AniSearch enrichment hooks
  affects:
    - frontend/src/app/admin/anime/components/AnimeContext
    - frontend/src/app/admin/anime/components/AnimeEditPage
    - frontend/src/app/admin/anime/hooks
tech_stack:
  added: []
  patterns:
    - central API helper auth ownership
    - token-free hook and component compatibility wrappers
    - split-scope bounded caller migration
key_files:
  created:
    - .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-11-SUMMARY.md
  modified:
    - frontend/src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx
    - frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx
    - frontend/src/app/admin/anime/hooks/useAdminAnimeRelations.ts
    - frontend/src/app/admin/anime/hooks/useAdminAnimeThemes.ts
    - frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts
    - frontend/src/app/admin/anime/hooks/internal/useJellyfinSyncImpl.ts
    - frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts
    - frontend/src/app/admin/anime/hooks/useAdminAnimeThemes.test.ts
key_decisions:
  - Legacy parent props/arguments are tolerated through compatibility shapes in this split so 49-11 can stay inside the 10-file budget while target files stop consuming token values.
  - Context, relation, theme, Jellyfin, and AniSearch calls now rely on central API helper auth resolution instead of forwarding page-owned tokens.
requirements-completed:
  - AUTH-API-CLIENT-01
metrics:
  duration: 8 min
  completed: 2026-05-20T16:21:47Z
---

# Phase 49 Plan 11: Anime Context, Relations, Themes, Jellyfin Hooks, and AniSearch Edit Enrichment Summary

Status: COMPLETE

Plan 49-11 removed token ownership from the bounded anime context, relation, theme, Jellyfin edit, and AniSearch edit enrichment slice. Payloads, endpoint choices, relation labels, theme/segment behavior, `anime_fansub_groups` assignment semantics, backend permission ownership, and the Jellyfin/streaming boundary were preserved.

## Scope Gate Result

| Check | Result |
|---|---|
| Planned production files | 9 |
| Production files touched | 9 |
| Test files touched | 1 |
| Total touched files | 10 |
| Extra files required | None |
| Split status | Not required |

## Tasks Completed

| Task | Result | Commit | Files |
|---|---|---|---|
| Task 1: Enforce anime context and hook split scope before edits | PASS | no code commit | Scope confirmed at 9 production files plus 1 focused test file. |
| Task 2: Remove token threading from context, relations, and themes | PASS | `b603b4f3` | Context card/manager, relation section/hook, theme section/hook, theme hook test. |
| Task 3: Remove token threading from Jellyfin and AniSearch edit hooks | PASS | `7003bd06` | Jellyfin intake, Jellyfin sync, AniSearch edit enrichment hooks. |

## Files Changed

- `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx` - Removed consumed token prop and stopped forwarding it into the fansub manager.
- `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` - Uses token-free `hasAccessToken` gating and calls attach/detach helpers without token arguments.
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx` - Removes relation-section token consumption while keeping legacy parent compatibility.
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx` - Removes theme-section token consumption while keeping legacy parent compatibility.
- `frontend/src/app/admin/anime/hooks/useAdminAnimeRelations.ts` - Calls relation list/search/create/update/delete helpers without token arguments.
- `frontend/src/app/admin/anime/hooks/useAdminAnimeThemes.ts` - Calls theme and segment helpers without token arguments.
- `frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts` - Removes direct runtime-token resolution and deprecated explicit token consumption.
- `frontend/src/app/admin/anime/hooks/internal/useJellyfinSyncImpl.ts` - Uses token-free auth state and calls Jellyfin search/preview/sync helpers without token arguments.
- `frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts` - Calls edit enrichment without token forwarding and preserves conflict metadata handling.
- `frontend/src/app/admin/anime/hooks/useAdminAnimeThemes.test.ts` - Updates expectations to assert token-free theme helper calls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Preserved parent compatibility without expanding the split**
- **Found during:** Task 2 and Task 3
- **Issue:** Parent edit-shell files still pass legacy token-shaped props/arguments, but editing those files would exceed this plan's bounded split.
- **Fix:** Added compatibility index/rest shapes in the target files while ignoring those values. The target files have no `authToken`/`runtimeAuthToken` hits and no longer consume token values.
- **Files modified:** `AnimeContextCard.tsx`, `AnimeRelationsSection.tsx`, `AnimeThemesSection.tsx`, `useJellyfinIntakeImpl.ts`, `useJellyfinSyncImpl.ts`, `useAniSearchEditEnrichment.ts`
- **Commit:** `b603b4f3`, `7003bd06`

## Known Stubs

None. The stub-pattern scan returned form placeholders, button `type="button"` attributes, and normal initialized hook state (`null`, `[]`) only; none are unwired UI data stubs.

## Threat Flags

None. This plan introduced no new endpoint, schema change, backend permission behavior, stream relay behavior, release media ownership path, group media ownership path, or episode/release-version segment ownership change.

## Verification

Automated checks run:

- `cd frontend && npm run test -- app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.test.tsx app/admin/anime/components/AnimeEditPage/AnimeThemesSection.test.tsx app/admin/anime/hooks/useAdminAnimeThemes.test.ts app/admin/anime/hooks/useAniSearchEditEnrichment.test.ts app/admin/anime/hooks/useJellyfinIntake.test.ts` - PASS, 20 tests.
- `cd frontend && npm run typecheck` - PASS.
- `cd frontend && npx eslint src/app/admin/anime/components/AnimeContext/AnimeContextCard.tsx src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.tsx src/app/admin/anime/components/AnimeEditPage/AnimeThemesSection.tsx src/app/admin/anime/hooks/useAdminAnimeRelations.ts src/app/admin/anime/hooks/useAdminAnimeThemes.ts src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts src/app/admin/anime/hooks/internal/useJellyfinSyncImpl.ts src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts src/app/admin/anime/hooks/useAdminAnimeThemes.test.ts` - PASS.
- Scoped static token gate for the nine production files - PASS, zero hits.
- `git diff --check -- [49-11 touched files]` - PASS.

## Residual Risks

- Parent edit-shell files outside 49-11 still pass legacy token-shaped props/arguments until their owning split plan removes them; the target 49-11 files ignore those values.
- The repo remains heavily dirty with unrelated existing changes. This plan staged and committed only the 49-11 files listed above.
- `.planning/STATE.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md` were already dirty before this plan, so this execution did not mutate or stage them to avoid mixing unrelated planning drift into the 49-11 metadata commit.

## Commits

- `b603b4f3` - `feat(49-11): remove context relation theme token threading`
- `7003bd06` - `feat(49-11): remove provider hook token threading`

## Self-Check: PASSED

- Found all 10 modified source/test files.
- Found `49-11-SUMMARY.md`.
- Found implementation commits `b603b4f3` and `7003bd06`.
- Scoped tests, typecheck, targeted lint, static token gate, and diff whitespace checks passed.
