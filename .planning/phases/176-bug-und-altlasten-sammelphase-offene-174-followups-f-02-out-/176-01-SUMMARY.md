---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 01
subsystem: admin
tags: [go, gin, pgx, postgres, nextjs, typescript, migration, altlast-removal]

# Dependency graph
requires: []
provides:
  - "member_group_stories table permanently dropped from the live schema (reversible via 0178 down.sql)"
  - "all 5 /admin/fansubs/:id/member-stories* routes removed and return 404"
  - "frontend/src/lib/api/history.ts and fansubs-members.ts free of MemberGroupStory*/MemberStoryContext* exports"
  - "orphaned admin UI scaffolding (StoryEditor/StoryPreview) removed from NotesTab.helpers.tsx"
affects: [176-02, 176-03, 176-04, 176-05, 176-06, 176-07, 176-08, 176-09, 176-10, 176-11, 176-12, 176-13, 176-14, 176-15]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Append-only migration removal: drop a superseded table via a new forward-only DROP migration (0178) rather than editing/deleting the original historical CREATE migrations (0062/0068), preserving migration-history immutability per CLAUDE.md"

key-files:
  created:
    - database/migrations/0178_drop_member_group_stories.up.sql
    - database/migrations/0178_drop_member_group_stories.down.sql
  modified:
    - backend/cmd/server/admin_routes.go
    - backend/internal/handlers/admin_content_fansub_group_notes.go
    - backend/internal/handlers/admin_content_fansub_notes_test.go
    - backend/internal/repository/fansub_group_notes_repository.go
    - backend/internal/repository/fansub_notes_repository_test.go
    - frontend/src/lib/api/history.ts
    - frontend/src/lib/api/fansubs-members.ts
    - frontend/src/types/fansubNotes.ts
    - frontend/src/lib/api.fansubNotes.test.ts
    - "frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx"

key-decisions:
  - "Added migration 0178 as a new forward-only DROP instead of deleting/editing historical migrations 0062/0068, per CLAUDE.md's append-only migration rule (overrides 176-PATTERNS.md's literal 'delete 0062/0068' wording)"
  - "Removed the never-rendered StoryEditor/StoryPreview/StoryDraft UI scaffolding from NotesTab.helpers.tsx (not explicitly listed in the plan's file list) because it imported the deleted MemberStoryContext* types and NotesTab.tsx never actually wired it up -- required to satisfy the plan's own zero-grep-hits acceptance criterion"

requirements-completed: []

# Metrics
duration: ~20min
completed: 2026-10-07
---

# Phase 176 Plan 01: Remove Member-Group-Story Altlast Summary

**Deleted the fully superseded Member-Group-Story admin feature end to end (handler, 2 repo files, 5 routes, DB table via reversible migration 0178, and dead frontend API/UI code) per D-16, with zero remaining references anywhere in the repo.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-10-07T12:54Z (approx, continuation of in-flight Phase 176 execution)
- **Completed:** 2026-10-07T13:08:10Z
- **Tasks:** 2
- **Files modified:** 15 (3 new, 12 modified/deleted)

## Accomplishments
- Backend surface (handler, 2 repository files, 5 routes) fully removed; all 5 `/admin/fansubs/:id/member-stories*` routes now return 404
- Reversible migration 0178 applied against the live dev DB; `member_group_stories` table confirmed gone via `\dt`
- Frontend API client (`history.ts`, `fansubs-members.ts`) and type definitions (`fansubNotes.ts`) stripped of all `MemberGroupStory*`/`MemberStoryContext*` exports
- Discovered and removed an additional orphaned UI layer (`StoryEditor`/`StoryPreview`/`StoryDraft` in `NotesTab.helpers.tsx`) that the plan's file list did not anticipate but that blocked the plan's own zero-reference acceptance criterion
- Personal member story feature (`members.member_story_*`, `/me/profile`) untouched and out of scope, as required

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove the Member-Group-Story backend surface (handler, repositories, routes, schema)** - `a272acdc` (feat)
2. **Task 2: Remove the dead Member-Group-Story frontend API-client surface** - `e7481732` (feat)

**Plan metadata:** (this commit, created after this SUMMARY)

## Files Created/Modified

Backend:
- `database/migrations/0178_drop_member_group_stories.up.sql` - DROP TABLE IF EXISTS member_group_stories
- `database/migrations/0178_drop_member_group_stories.down.sql` - recreates the table (0062 base + 0068 TipTap columns combined)
- `backend/cmd/server/admin_routes.go` - removed the 5 member-stories route registrations
- `backend/internal/handlers/admin_content_fansub_group_notes.go` - updated stale doc comment referencing the removed table
- `backend/internal/handlers/admin_content_fansub_notes_test.go` - removed member_group_stories fixture table/rows and the two UpdateMemberGroupStory/DeleteMemberGroupStory subtests (deleted files are no longer required by any test)
- `backend/internal/repository/fansub_group_notes_repository.go` - updated stale doc comment
- `backend/internal/repository/fansub_notes_repository_test.go` - removed the os.ReadFile-based signature assertions against the now-deleted member_group_stories_repository.go
- Deleted: `backend/internal/handlers/admin_content_member_stories.go`, `backend/internal/repository/member_group_stories_repository.go`, `backend/internal/repository/member_group_story_context_repository.go`

Frontend:
- `frontend/src/lib/api/history.ts` - removed `RawMemberGroupStory`/`RawMemberStoryContextMember`/`RawMemberStoryContextRole` types, `mapMemberGroupStory`/`mapMemberStoryContextMember`/`mapMemberStoryContextRole` mappers, and the 4 member-story fetchers
- `frontend/src/lib/api/fansubs-members.ts` - removed `listMemberGroupStories` and its stale comment/imports
- `frontend/src/types/fansubNotes.ts` - removed `MemberGroupStory`/`MemberStoryContext*`/`CreateMemberGroupStoryRequest`/`UpdateMemberGroupStoryRequest` type exports
- `frontend/src/lib/api.fansubNotes.test.ts` - removed the two member-story-specific test cases and now-unused imports
- `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx` - removed the never-consumed `StoryEditor`/`StoryPreview`/`StoryDraft`/`emptyStoryDraft`/`findMemberLabel`/`findRoleLabel` scaffolding and its `MemberStoryContextMember`/`MemberStoryContextRole` import

## Decisions Made

- Used a new forward-only DROP migration (0178) instead of deleting/editing historical migrations 0062/0068, honoring CLAUDE.md's append-only migration rule over 176-PATTERNS.md's literal wording -- this was already called out as the correct approach in the plan's own `<read_first>` guidance.
- Removed the dead `StoryEditor`/`StoryPreview` UI scaffolding in `NotesTab.helpers.tsx` even though it wasn't in the plan's `<files>` list for Task 2: `NotesTab.tsx` (the only consumer file) never imported these exports, they only existed to satisfy their own now-deleted type imports, and leaving them in place would have left `MemberStoryContextMember`/`MemberStoryContextRole` references in `frontend/src` -- directly violating Task 2's own acceptance criterion ("zero matches" for `MemberStoryContext`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed test code that would not compile/run after deleting the handler/repository files**
- **Found during:** Task 1 (backend removal)
- **Issue:** `admin_content_fansub_notes_test.go` created a `member_group_stories` fixture table and had two subtests (`UpdateMemberGroupStory scopes...`, `DeleteMemberGroupStory scopes...`) calling the handler methods being deleted; `fansub_notes_repository_test.go` used `os.ReadFile("member_group_stories_repository.go")` to assert on a file being deleted. Both would fail to compile/run once the source files were removed.
- **Fix:** Removed the member-story-specific fixture rows/table, the two subtests, and the `os.ReadFile`-based assertions, leaving the unrelated `fansub_group_notes`/`anime_fansub_project_notes` test coverage intact.
- **Files modified:** `backend/internal/handlers/admin_content_fansub_notes_test.go`, `backend/internal/repository/fansub_notes_repository_test.go`
- **Verification:** `go build ./...`, `go vet ./...` both clean; `go test ./internal/handlers/... -run TestAdminContentFansubNotes` and `go test ./internal/repository/... -run TestFansubNotesRepository` pass (the handler test skips without `TEAM4S_PHASE107_TEST_DSN`, consistent with its pre-existing baseline).
- **Committed in:** `a272acdc` (Task 1 commit)

**2. [Rule 3 - Blocking] Removed orphaned UI scaffolding that imported the deleted frontend types**
- **Found during:** Task 2 (frontend removal)
- **Issue:** `NotesTab.helpers.tsx` imported `MemberStoryContextMember`/`MemberStoryContextRole` from `@/types/fansubNotes` and exported `StoryEditor`/`StoryPreview`/`StoryDraft`/`emptyStoryDraft`. Grepping consumers confirmed `NotesTab.tsx` (the component's only caller) never imports any of these -- it only wires up the unrelated `GroupNoteEditor`/`GroupNotePreview` pair. This dead code would have kept `MemberStoryContext` references alive in `frontend/src`, failing Task 2's own zero-match grep acceptance criterion.
- **Fix:** Removed the `StoryDraft` type, `emptyStoryDraft`, `findMemberLabel`/`findRoleLabel` helpers, the `StoryEditor`/`StoryPreview` components, and the now-unused `MemberStoryContextMember`/`MemberStoryContextRole` import; narrowed `visibilityLabel`/`statusLabel` signatures to `GroupNoteDraft` only (their sole remaining use).
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/NotesTab.helpers.tsx`
- **Verification:** `grep -rn "MemberGroupStory|MemberStoryContext|member-stories" frontend/src` returns zero matches; `npx tsc --noEmit` shows no new errors (the 9 pre-existing errors are in unrelated files `ReleaseDetailHero.test.tsx` and `admin/anime/create/page.ts`); `npx vitest run src/app/admin/fansubs` (44 files, 344 tests, including `NotesTab.test.tsx`) passes fully.
- **Committed in:** `e7481732` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking compile/consistency issues caused directly by this plan's deletions)
**Impact on plan:** Both fixes were necessary to make the plan's own deletions compile/pass and to satisfy its own stated acceptance criteria (zero remaining references). No scope creep beyond what D-16 required.

## Issues Encountered

- `go test ./internal/repository/...` surfaces many pre-existing unrelated failures (missing `TEAM4S_PHASE128_TEST_DSN`/`TEAM4S_PHASE107_TEST_DSN` env vars, no live Keycloak/Jellyfin fixtures reachable from the test run, an `openapi.yaml` duplicate-key parse error). None of these are caused by this plan; confirmed by running the specific `TestAdminContentFansubNotes_*` and `TestFansubNotesRepository_*` tests in isolation, both of which are green (the former intentionally skips without the Phase-107 Postgres DSN, matching its pre-existing behavior).
- Attempting to set `TEAM4S_PHASE107_TEST_DSN=<dev DB URL>` to force the Postgres-backed handler test to actually execute failed with a database-name-pattern guard (`must match ^team4s_phase107_test_[a-z0-9]+$`) -- this is an intentional safety rail in `testsupport.OpenPhase107Postgres` preventing accidental use of the real dev database as a disposable test schema. Not pursued further since it is not required by the plan's acceptance criteria (which only requires `go test ./...` to stay green, and the skip-without-DSN behavior is the pre-existing baseline).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The Member-Group-Story Altlast (D-16) is fully closed: Permission-Matrix row 6.4 is now moot since the surface it described no longer exists.
- Remaining Paket A→E plans in this phase (176-02 through 176-15) are unblocked and can proceed independently of this plan's changes.
- The personal member story feature (`members.member_story_*`, `/me/profile`) remains completely untouched, as scoped.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: 2026-10-07*
