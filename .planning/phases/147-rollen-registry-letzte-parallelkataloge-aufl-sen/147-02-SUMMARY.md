---
phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen
plan: 02
subsystem: frontend-public-notes
tags: [role-registry, public-ui, hardcoding-cleanup, HC-01]
dependency-graph:
  requires:
    - PublicReleaseNote.RoleCode (Plan 147-01, release_detail_public_repository.go / _helpers.go)
    - ProjectMemberNote.RoleCode (Plan 147-01, project_member_public_repository.go)
    - shared/contracts/openapi.yaml role_code properties (Plan 147-01)
  provides:
    - PublicNoteCard roleCode prop as sole data-role-code source
    - frontend/src/types/releaseDetail.ts PublicReleaseNote.role_code
    - frontend/src/types/projectMember.ts ProjectMemberNote.role_code
  affects:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx
tech-stack:
  added: []
  patterns:
    - "roleCode?: string | null sibling prop pattern: data-role-code={roleCode || 'other'}, roleLabel stays pure display text"
key-files:
  created: []
  modified:
    - frontend/src/types/releaseDetail.ts
    - frontend/src/types/projectMember.ts
    - frontend/src/components/public/PublicNoteCard.tsx
    - frontend/src/components/public/PublicNoteCard.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx
  deleted:
    - frontend/src/lib/roleColors.ts
decisions:
  - "data-role-code now renders raw role_definitions.code values for techadmin/gfxler directly (no longer remapped to 'admin'/'designer' as roleColorCode's old label-driven map did) — this is the explicit, tested Phase 147 contract, not a regression."
metrics:
  duration: "~25 minutes"
  completed: 2026-09-05
---

# Phase 147 Plan 02: role_code consumed into PublicNoteCard's data-role-code Summary

Threaded the `role_code` field Plan 147-01 added to both backend DTOs/OpenAPI schemas into
`PublicNoteCard`'s `data-role-code` attribute via a new `roleCode` prop, replacing the broken
`roleColors.ts` label→code reverse map entirely, and proved the fix with a regression test
covering all 8 currently-relevant role codes plus label-independence.

## What Was Built

**Task 1 — Type `role_code` and add the `roleCode` prop:**
- `frontend/src/types/releaseDetail.ts`: added `role_code: string;` to `PublicReleaseNote`, right
  after `role_label: string;` (semicolon-terminated style preserved).
- `frontend/src/types/projectMember.ts`: added `role_code: string` to `ProjectMemberNote`, right
  after `role_label: string` (no-semicolon style preserved).
- `frontend/src/components/public/PublicNoteCard.tsx`: removed the
  `import { roleColorCode } from '@/lib/roleColors'` import; added an optional `roleCode?: string |
  null` prop (documented) directly after `roleLabel` in `PublicNoteCardProps`; destructured
  `roleCode` in the component signature; changed the `<article>` element from
  `data-role-code={roleColorCode(roleLabel ?? '')}` to `data-role-code={roleCode || 'other'}`.
  `roleLabel` usages elsewhere in the file (header band text, role-variant title) are unchanged —
  pure display text, as specified.
- Rule 3 (auto-fix blocking issue): making `role_code` a required TS field broke `tsc --noEmit` in
  two pre-existing test files not listed in the plan's `<files>` but which construct
  `PublicReleaseNote`/`ProjectMemberNote` object literals directly:
  `ReleaseNotesList.test.tsx` (11 fixture literals) and `ProjectMemberNotesSection.test.tsx` (1
  fixture factory). Backfilled `role_code` on every fixture (value mirrors the existing
  `role_label` string where mechanically convenient, or the corresponding role code where the test
  already implied one) so `tsc --noEmit` and both test files' own suites stay green. This does not
  change either test file's assertions or behavior — it only satisfies the now-required field.

**Task 2 — Thread `roleCode` through both consumers, delete `roleColors.ts`:**
- `ReleaseNotesList.tsx`: added `roleCode={note.role_code}` immediately after
  `roleLabel={note.role_label}` in its `PublicNoteCard` usage.
- `ProjectMemberNoteCard.tsx`: added `roleCode={note.role_code}` immediately after
  `roleLabel={note.role_label}` in its `PublicNoteCard` usage.
- Re-verified via `grep -rn "roleColors" frontend/src --include="*.ts*"` that no consumer remained
  (Task 1 had already removed `PublicNoteCard.tsx`'s import) — deleted
  `frontend/src/lib/roleColors.ts` entirely (`ROLE_CODE_BY_LABEL` map + `roleColorCode` function,
  the broken label→code reverse lookup).

**Task 3 — Frontend regression test:**
- `PublicNoteCard.test.tsx`: updated all 4 existing `render(<PublicNoteCard roleLabel="..." .../>)`
  calls to also pass an explicit `roleCode` prop matching each case's role (`quality_checker`,
  `timer`, `editor` x2), with `data-role-code` assertions unchanged in expected value but now
  asserting against the directly-passed prop rather than a label-derived lookup.
- Added a new `describe('data-role-code (role_code-driven, Phase 147)', ...)` block:
  - An `it.each` test over `['fansub_lead', 'founder', 'co_leader', 'techadmin', 'gfxler',
    'karaoke_fx', 'editor', 'typesetter']`, rendering `PublicNoteCard` with `roleCode={code}` and a
    fixed `roleLabel="Beliebiges Label"`, asserting `data-role-code` equals that exact code and is
    never `'other'`.
  - A `rerender`-based test rendering with `roleCode="editor"` / `roleLabel="Editing"`, then
    re-rendering with the same `roleCode` but `roleLabel="Etwas ganz anderes"`, asserting
    `data-role-code` stays `"editor"` across both renders.

## Verification Performed

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit"` — clean, 0 errors.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint src/components/public/PublicNoteCard.tsx src/types/releaseDetail.ts src/types/projectMember.ts \"src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx\" src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx"` — clean, 0 findings.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/public/PublicNoteCard.test.tsx"` — 13/13 tests pass (4 updated + 9 new: 8 parametrized + 1 rerender).
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run \"src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx\" src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx"` — 11/11 tests pass (confirms the fixture backfill from Task 1's Rule-3 fix caused no regressions).
- `test ! -f frontend/src/lib/roleColors.ts` — file absent.
- `grep -rln "roleColors" frontend/src --include="*.ts*"` — no results.
- All acceptance-criteria greps from the plan (roleCode prop presence, data-role-code expression, roleColorCode absence, role_code field presence in both TS types, roleCode prop threading at both consumer call sites) — all pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Backfilled `role_code` fixture field in two test files broken by the now-required TS field**
- **Found during:** Task 1's `tsc --noEmit` verification
- **Issue:** Making `role_code` a required (non-optional) field on `PublicReleaseNote` and
  `ProjectMemberNote` broke `tsc --noEmit` for two pre-existing test files
  (`ReleaseNotesList.test.tsx`, `ProjectMemberNotesSection.test.tsx`) that construct these DTOs as
  inline object literals without going through the note-card consumers this plan's `<files>` list
  covers.
- **Fix:** Added a `role_code` field to every affected fixture literal/factory in both files. No
  test assertions or component behavior changed — this only satisfies the TypeScript contract.
- **Files modified:** `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx`, `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx`
- **Commit:** 7b9d3daf

None of the other deviation rules applied — no architectural changes, no auth gates, no package
installs.

## Known Stubs

None. `roleCode` is wired end-to-end from the already-shipped backend field (Plan 147-01) through
both real consumers; no placeholder/mock data paths were introduced.

## Threat Flags

None. This plan's diff stays entirely within the trust boundary already assessed in the plan's own
`<threat_model>` (T-147-03, T-147-04) — no new network endpoint, auth path, file access pattern, or
schema change was introduced. `roleCode` values continue to originate from the backend's small
`role_definitions.code` enum threaded through in Plan 147-01, rendered as a plain React attribute
string (auto-escaped, no `dangerouslySetInnerHTML`).

## Self-Check: PASSED

- FOUND: frontend/src/types/releaseDetail.ts
- FOUND: frontend/src/types/projectMember.ts
- FOUND: frontend/src/components/public/PublicNoteCard.tsx
- FOUND: frontend/src/components/public/PublicNoteCard.test.tsx
- FOUND: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx
- FOUND: frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx
- MISSING (intentional, confirmed deleted per plan): frontend/src/lib/roleColors.ts
- FOUND commit 7b9d3daf (Task 1)
- FOUND commit a05a993b (Task 2)
- FOUND commit 9d181c27 (Task 3)
