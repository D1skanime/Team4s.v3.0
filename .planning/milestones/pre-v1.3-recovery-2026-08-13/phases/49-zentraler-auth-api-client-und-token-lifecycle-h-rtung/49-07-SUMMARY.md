---
phase: 49-zentraler-auth-api-client-und-token-lifecycle-h-rtung
plan: "07"
subsystem: frontend-auth-api-client
status: complete
tags:
  - auth
  - api-client
  - fansub-admin
  - token-lifecycle
dependency_graph:
  requires:
    - 49-05
    - 49-06
    - AUTH-API-CLIENT-01
  provides:
    - token-free fansub admin list/create/merge/edit callers
    - token-free fansub edit child section props
    - focused parent-page token-free wiring tests
  affects:
    - frontend/src/app/admin/fansubs
    - 49-08
    - 49-09
tech_stack:
  added: []
  patterns:
    - useAuthSession boolean gating for fansub admin callers
    - token-free MediaUpload and child section props
    - central api helper calls without page-owned bearer values
key_files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - .planning/phases/49-zentraler-auth-api-client-und-token-lifecycle-h-rtung/49-07-SUMMARY.md
  modified:
    - frontend/src/app/admin/fansubs/page.tsx
    - frontend/src/app/admin/fansubs/create/page.tsx
    - frontend/src/app/admin/fansubs/merge/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
key_decisions:
  - Fansub admin pages now gate on hasAccessToken/isClientInitialized and call central API helpers without page-owned authToken arguments.
  - Release-theme asset calls continue using existing release-theme/release APIs; group media continues using MediaUpload and existing group media helpers.
  - Optional compatibility props on child sections avoid forcing out-of-scope child test rewrites while production callers pass token-free hasAccessToken.
requirements-completed:
  - AUTH-API-CLIENT-01
metrics:
  duration: 10 min
  completed: 2026-05-20
---

# Phase 49 Plan 07: Fansub Admin Caller Migration Summary

Fansub admin list, create, merge, edit, member, notes, and release-theme callers now use token-free session booleans and central API helpers without page-owned bearer threading.

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-20T15:33:54Z
- **Completed:** 2026-05-20T15:44:18Z
- **Tasks:** 3
- **Files modified:** 10 source/test files plus this summary

## Outcome

Status: COMPLETE

Plan 49-07 stayed within the 10-file fansub admin budget. The production static token gate for `frontend/src/app/admin/fansubs` now returns zero hits outside tests.

## Tasks Completed

| Task | Result | Commit | Files |
|---|---|---|---|
| Task 1: Enforce fansub admin split scope before edits | PASS | `c9824091` | Scope search found production hits in 9 planned files. |
| Task 2: Remove token threading from fansub list, create, merge, and edit callers | PASS | `c9824091` | 9 fansub admin production files. |
| Task 3: Update focused fansub regression checks within budget | PASS | `c9824091` | `page.test.tsx`. |

## Files Changed

- `frontend/src/app/admin/fansubs/page.tsx` - Bulk/delete/status mutations now gate on `hasAccessToken` and call helpers without tokens.
- `frontend/src/app/admin/fansubs/create/page.tsx` - Create, alias, link, collaboration, and group media flows no longer forward `authToken`.
- `frontend/src/app/admin/fansubs/merge/page.tsx` - Merge preview/execute now gate on token-free access state.
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` - Edit orchestration, release drawer uploads/deletes, release loads, aliases, links, group save/delete, MediaUpload, and child sections are token-free.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` - Capability/member/invitation calls use central helpers without token props.
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.tsx` - Group notes and member stories use token-free session state.
- `frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx` - Anime project note loading/saving uses `hasAccessToken` and token-free helper calls.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx` - OP/ED section loads anime/themes without token forwarding.
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx` - Canonical release, release-theme asset load/upload/delete calls no longer receive page tokens.
- `frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx` - Added parent-page assertions that MediaUpload and child sections receive no token-shaped prop.

## Decisions Made

- Kept capability-driven UI behavior in `FansubAppMembersSection`; no frontend role checks were added.
- Kept release-theme asset ownership on the existing release-theme/release endpoints and group media on existing MediaUpload/group media helpers.
- Did not touch DB/schema/migrations, backend permissions, Jellyfin/streaming routes, endpoint URLs, or media ownership tables.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kept child test files out of the 10-file budget**
- **Found during:** Task 3
- **Issue:** Existing child component tests outside the plan still instantiate child sections with legacy props. Updating them would exceed the allowed 10-file budget.
- **Fix:** The production child section prop types accept optional compatibility extras without naming or consuming `authToken`; production callers pass `hasAccessToken`.
- **Files modified:** `FansubAppMembersSection.tsx`, `AnimeProjectNotesSection.tsx`, `ReleaseThemeAssetsSection.tsx`
- **Verification:** `npm run typecheck`, focused page test, production static authToken gate.
- **Committed in:** `c9824091`

**Total deviations:** 1 auto-fixed (Rule 3). **Impact:** Production fansub admin callers are token-free; out-of-scope child tests remain unmodified for a later test cleanup slice.

## Known Stubs

None found in created or modified files.

## Threat Flags

None. This plan changed frontend caller wiring only and introduced no new endpoint, auth path, file access behavior, schema change, backend permission behavior, streaming behavior, release media ownership path, or group media ownership path.

## Verification

Automated checks run:

- `cd frontend && npm run test -- app/admin/fansubs/[id]/edit/page.test.tsx` - PASS
- `cd frontend && npm run typecheck` - PASS
- `cd frontend && npx eslint src/app/admin/fansubs/page.tsx src/app/admin/fansubs/create/page.tsx src/app/admin/fansubs/merge/page.tsx src/app/admin/fansubs/[id]/edit/page.tsx src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx src/app/admin/fansubs/[id]/edit/NotesTab.tsx src/app/admin/fansubs/[id]/edit/AnimeProjectNotesSection.tsx src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx src/app/admin/fansubs/[id]/edit/page.test.tsx` - PASS with one pre-existing warning for unused `timelineLaneFor` in `page.tsx`.
- `git diff --check -- [10 plan files]` - PASS
- `rg -n "\bauthToken\b|authToken\s*[?:=]|authToken=\{|runtimeAuthToken" frontend/src/app/admin/fansubs --glob "!**/*.test.ts*"` - PASS, zero production hits

## Residual Risks

- The repo remains heavily dirty/untracked from existing work outside this plan.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx`, `AnimeProjectNotesSection.test.tsx`, and `ReleaseThemeAssetsSection.test.tsx` still contain legacy test props and were intentionally not updated to stay inside 49-07.
- Targeted eslint still reports an existing unused helper warning in `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`.

## Commits

- `c9824091` - `feat(49-07): migrate fansub admin callers to token-free auth`

## Self-Check: PASSED

- Found all 10 plan files.
- Found `49-07-SUMMARY.md`.
- Found implementation/test commit `c9824091`.
- Scoped test, typecheck, lint, static token gate, and diff whitespace checks passed.
