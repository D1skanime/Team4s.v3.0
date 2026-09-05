---
phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en
plan: 05
subsystem: backend+frontend
tags: [go, postgres, openapi, react, typescript, role-colors, public-api]

# Dependency graph
requires: []
provides:
  - "role_color_key present on PublicReleaseNote (release_detail_public_repository.go) and ProjectMemberNote (project_member_public_repository.go), sourced via COALESCE(rd.color_key, '') at all three query sites"
  - "role_color_key documented in both OpenAPI schemas (PublicReleaseNote, ProjectMemberNote)"
  - "roleColorKey prop on PublicNoteCard, rendering data-color-key on the <article> with a 'neutral' fallback"
  - "Both PublicNoteCard consumers (ReleaseNotesList.tsx, ProjectMemberNoteCard.tsx) pass roleColorKey through"
affects: [148-06, 148-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "role_color_key is a raw passthrough (COALESCE(rd.color_key, '')) at the Go/SQL layer, mirroring the existing role_code pattern byte-for-byte; normalization to a bounded hex/'neutral' happens client-side via presentationForRole's boundedColorKey"
    - "data-color-key on PublicNoteCard's <article> is the sole new CSS color-selection seam for this surface, alongside the pre-existing semantic-only data-role-code"

key-files:
  created: []
  modified:
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/project_member_public_repository.go
    - backend/internal/repository/public_note_role_code_integration_test.go
    - backend/internal/testsupport/phase117_postgres.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/releaseDetail.ts
    - frontend/src/types/projectMember.ts
    - frontend/src/components/public/PublicNoteCard.tsx
    - frontend/src/components/public/PublicNoteCard.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx
    - frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx

key-decisions:
  - "The shared Phase-117 Postgres test harness (testsupport/phase117_postgres.go) lacked a color_key column on its stub role_definitions table (it only mirrored code/label_de/contexts/sort_order). Added `color_key TEXT NOT NULL DEFAULT 'other'` directly to the stub CREATE TABLE, mirroring phase145_postgres.go's already-established minimal-stand-in-for-migration-0146 precedent, since applying the real migration would pull in unrelated production tables outside this fixture's blast radius."
  - "PublicNoteCard's roleLabel doc-comment ('färbt das Header-Band') was corrected to attribute header-band coloring to roleColorKey/data-color-key instead, since roleLabel/roleCode are purely textual/semantic."

patterns-established: []

requirements-completed: []

# Metrics
duration: ~30min
completed: 2026-09-05
---

# Phase 148 Plan 05: Thread role_color_key through the public note pipeline Summary

**`role_color_key` now rides end-to-end from `role_definitions.color_key` through all three public-note Go query sites, both DTOs, the OpenAPI contract, both TypeScript types, and `PublicNoteCard`'s new `roleColorKey` prop, rendering `data-color-key` on the note card with no additional client-side catalog fetch.**

## Performance

- **Duration:** ~30 min
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- `RoleColorKey string` (`json:"role_color_key"`) added to `PublicReleaseNote` and `ProjectMemberNote`; populated via `COALESCE(rd.color_key, '')` at all three existing `LEFT JOIN role_definitions rd` query sites (`ListReleaseVersionNotesCursor`, `loadNotes`, `ProjectMemberPublicRepository.ListNotes`) at zero extra join cost
- `role_color_key: {type: string}` added to both `PublicReleaseNote` and `ProjectMemberNote` OpenAPI schemas (not added to `required`, matching the existing `role_code` precedent)
- `TestPublicNoteRoleCode` extended with a new real-Postgres sub-case: seeds `role_definitions.color_key = '#0F766E'`, proves all three sites return it identically, then changes `label_de` and re-proves `role_color_key` is unchanged — all 3 sub-cases pass against a real, isolated `team4s_phase117_test_*` database
- `roleColorKey?: string | null` added to `PublicNoteCardProps`; the `<article>` now renders `data-color-key={roleColorKey || 'neutral'}` alongside the existing `data-role-code`
- Both consumers (`ReleaseNotesList.tsx`, `ProjectMemberNoteCard.tsx`) pass `roleColorKey={note.role_color_key}` through; no additional client-side catalog fetch introduced on either public SSR page
- `PublicNoteCard.test.tsx` gained 6 new behavior/stability tests for `data-color-key` (3 real catalog hex values, absent fallback, explicit-`null` fallback, stability across a `roleLabel`-only change) — all pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add role_color_key to both public note DTOs, all three query sites, and the OpenAPI contract** - `bb59bab4` (feat)
2. **Task 2: Add roleColorKey to both TS types and PublicNoteCard; wire both consumers** - `e68eaf0f` (feat)

## Files Created/Modified
- `backend/internal/repository/release_detail_public_repository.go` - `PublicReleaseNote.RoleColorKey` field; `ListReleaseVersionNotesCursor` SELECT + Scan updated
- `backend/internal/repository/release_detail_public_repository_helpers.go` - `loadNotes` SELECT + Scan updated (second `PublicReleaseNote` query site)
- `backend/internal/repository/project_member_public_repository.go` - `ProjectMemberNote.RoleColorKey` field; `ListNotes` SELECT + Scan updated
- `backend/internal/repository/public_note_role_code_integration_test.go` - `result` struct extended with 3 `*RoleColorKey` fields; new `t.Run` sub-case proving `role_color_key` at all three sites and its independence from `label_de`
- `backend/internal/testsupport/phase117_postgres.go` - stub `role_definitions` table gained a `color_key TEXT NOT NULL DEFAULT 'other'` column (Rule 3 fix, required for the new sub-case to run against real Postgres)
- `shared/contracts/openapi.yaml` - `role_color_key: {type: string}` added to `PublicReleaseNote` and `ProjectMemberNote` schemas
- `frontend/src/types/releaseDetail.ts` - `role_color_key: string` added to `PublicReleaseNote`
- `frontend/src/types/projectMember.ts` - `role_color_key: string` added to `ProjectMemberNote`
- `frontend/src/components/public/PublicNoteCard.tsx` - `roleColorKey` prop; `data-color-key` rendered on `<article>`; doc-comment corrected
- `frontend/src/components/public/PublicNoteCard.test.tsx` - new `describe('data-color-key ...')` block, 6 tests
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx` - `roleColorKey={note.role_color_key}` added to the `<PublicNoteCard>` call
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx` - fixtures updated with `role_color_key` (Rule 3, required by the now-mandatory TS field)
- `frontend/src/components/fansubs/projectMember/ProjectMemberNoteCard.tsx` - `roleColorKey={note.role_color_key}` added to the `<PublicNoteCard>` call
- `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx` - fixture builder updated with `role_color_key` (Rule 3)

## Decisions Made
- Added a minimal `color_key` stand-in column directly to the shared Phase-117 Postgres test harness's stub `role_definitions` table, mirroring the exact minimal-stand-in pattern `phase145_postgres.go` already established for the same production migration (0146) — full migration application was avoided since it pulls in unrelated production tables outside this fixture's blast radius.
- `PublicNoteCard`'s `roleLabel` doc-comment was corrected to no longer claim it colors the header-band, since color now flows exclusively through `roleColorKey`/`data-color-key`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing `color_key` column to the shared Phase-117 Postgres test harness**
- **Found during:** Task 1, running the extended integration test against real Postgres
- **Issue:** `testsupport/phase117_postgres.go`'s stub `role_definitions` table (used by `TestPublicNoteRoleCode` via `OpenPhase117Postgres`) only had `code`, `label_de`, `contexts`, `sort_order` — no `color_key` column, so `COALESCE(rd.color_key, '')` in the new query-site SQL would fail against this test database.
- **Fix:** Added `color_key TEXT NOT NULL DEFAULT 'other'` directly to the stub table's `CREATE TABLE` statement, mirroring the identical minimal-stand-in precedent already established in `phase145_postgres.go` for the same production migration (0146).
- **Files modified:** `backend/internal/testsupport/phase117_postgres.go`
- **Commit:** `bb59bab4`

**2. [Rule 3 - Blocking] Added `role_color_key` to test fixtures made invalid by the new required TS field**
- **Found during:** Task 2, `npx tsc --noEmit`
- **Issue:** `PublicReleaseNote`/`ProjectMemberNote` fixture objects in `ReleaseNotesList.test.tsx` and `ProjectMemberNotesSection.test.tsx` no longer satisfied their respective (now-extended) interfaces, since `role_color_key` is a required field.
- **Fix:** Added a `role_color_key` value to every fixture object in both files.
- **Files modified:** `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx`, `frontend/src/components/fansubs/projectMember/ProjectMemberNotesSection.test.tsx`
- **Commit:** `e68eaf0f`

## Issues Encountered
- Full-suite `npx vitest run` surfaced one unrelated pre-existing failure in `frontend/src/app/members/[slug]/page.test.tsx` (line 471, a stale `data-role-code` expectation of `'other'` for an unmatched `future_role` fixture, left over from Plan 148-01's `data-role-code` semantics change which updated three other test files but missed this fourth one). Not caused by this plan's commits, not in this plan's `files_modified` list — logged to `deferred-items.md`, not fixed.
- `go test ./internal/repository/...` (unscoped, no DSN env vars set) surfaces ~40 pre-existing hard-failing (not skipping) tests requiring various `TEAM4S_PHASEXXX_TEST_DSN`/Keycloak env vars unrelated to any file this plan touched — confirmed pre-existing and out of scope (verified via `git status --short` showing none of those test files as modified).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three plan-level verification commands pass: `go build ./...` exits 0; `go test ./internal/repository/... -run TestPublicNoteRoleCode` (real Postgres, via a `golang:1.25-alpine` container on `team4s_default` network) exits 0 with all 3 sub-cases green; `npx tsc --noEmit` and `npx vitest run src/components/public/PublicNoteCard.test.tsx` both exit 0; `grep -c "role_color_key" shared/contracts/openapi.yaml` returns 2.
- `role_color_key` is now available end-to-end for Plans 148-06/07 (whichever restored surfaces still need it) to consume without any further backend/contract work.

---
*Phase: 148-rollenfarben-wieder-an-den-katalog-anschlie-en*
*Completed: 2026-09-05*

## Self-Check: PASSED

All 14 files_modified paths verified present on disk; both task commit hashes
(`bb59bab4`, `e68eaf0f`) verified present in `git log --oneline --all`.
