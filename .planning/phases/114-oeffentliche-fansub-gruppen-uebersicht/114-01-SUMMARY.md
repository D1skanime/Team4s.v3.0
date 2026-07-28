---
phase: 114-oeffentliche-fansub-gruppen-uebersicht
plan: 01
subsystem: api
tags: [go, postgres, fansub, aggregate-count, openapi, typescript]

# Dependency graph
requires: []
provides:
  - "FansubGroup.projects_count field (Go struct, OpenAPI schema, TS type) that counts only anime relations to non-disabled anime"
  - "attachGroupCounts 5th populateCountMap batch (ProjectsCount) mirroring listPublicFansubProjects's a.status <> 'disabled' filter"
  - "Source-invariant regression test pinning the ProjectsCount SQL filter"
affects: [114-02, 114-03, 114-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "5th batched populateCountMap call inside attachGroupCounts, same drop-in shape as the existing 4 count fields"

key-files:
  created: []
  modified:
    - backend/internal/models/fansub.go
    - backend/internal/repository/fansub_repository.go
    - backend/internal/repository/fansub_repository_test.go
    - shared/contracts/fansubs.yaml
    - frontend/src/types/fansub.ts
    - frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx
    - "frontend/src/app/fansubs/[slug]/page.test.tsx"
    - frontend/src/components/fansubs/__tests__/FansubStorySection.test.tsx

key-decisions:
  - "projects_count added as a distinct field from anime_relations_count because the latter has no anime.status filter and would silently over-count relative to the detail page's Anime-Projekte figure"
  - "Placed the new populateCountMap block immediately after AnimeRelationsCount (both query anime_fansub_groups) rather than at the end of attachGroupCounts, keeping semantically related blocks adjacent"

patterns-established:
  - "Any future FansubGroup count field should follow the populateCountMap(ctx, query, ids, assign, indexByID) drop-in shape and, if it depends on anime status, must mirror listPublicFansubProjects's a.status <> 'disabled' filter exactly (regression-tested)"

requirements-completed: [D-03, D-02]

# Metrics
duration: 35min
completed: 2026-07-28
---

# Phase 114 Plan 01: Backend projects_count Aggregate Summary

**Added FansubGroup.projects_count end-to-end (Go struct, OpenAPI, TS type, and a batched SQL aggregate filtered to `a.status <> 'disabled'`), backed by a source-invariant regression test — but the Docker backend rebuild/live-verify step (Task 3) could not run because the local Docker Desktop engine (`docker-desktop` WSL2 distro) was down for the entire session.**

## Performance

- **Duration:** ~35 min (includes ~20 min of Docker Desktop recovery attempts)
- **Started:** 2026-07-28T11:10:00Z (approx.)
- **Completed:** 2026-07-28T11:44:00Z
- **Tasks:** 2 of 3 completed; Task 3 (Docker rebuild + live verify) blocked by environment
- **Files modified:** 8

## Accomplishments
- `FansubGroup.ProjectsCount` / `projects_count` present in the Go model, OpenAPI contract, and TS type, in the same field position (after `anime_relations_count`) across all three layers
- New 5th `populateCountMap` batch inside `attachGroupCounts` computes `ProjectsCount` with the exact `JOIN anime a ... WHERE ... AND a.status <> 'disabled'` filter used by `listPublicFansubProjects`, so it will match the detail page's "Anime-Projekte" figure once live
- `TestAttachGroupCounts_ProjectsCountExcludesDisabledAnime` added following the exact RED→GREEN TDD cycle: confirmed FAIL before the repository change, confirmed PASS after
- Full `go test ./internal/repository/...` suite green (no regression to the other 3 `populateCountMap` blocks)
- `cd backend && go build ./...` succeeds; `cd frontend && npm run typecheck` clean (0 errors)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add projects_count contract fields (Go model, OpenAPI, TS type)** - `e4313d1f` (feat)
2. **Task 2 RED: Add failing regression test for ProjectsCount batch** - `939d8656` (test)
3. **Task 2 GREEN: Compute ProjectsCount excluding disabled anime** - `8a73bf7a` (feat)

Task 3 (Docker rebuild + live verify) produced **no commits** — it is a verification-only task with no `files_modified`, and it could not be executed (see Deviations/Issues below).

**Plan metadata:** committed alongside this SUMMARY.

_Note: Task 2 is a `tdd="true"` task; the RED and GREEN commits together satisfy its TDD gate sequence._

## Files Created/Modified
- `backend/internal/models/fansub.go` - Added `ProjectsCount int` json:"projects_count" to `FansubGroup`, positioned after `AnimeRelationsCount`
- `backend/internal/repository/fansub_repository.go` - Added 5th `populateCountMap` block inside `attachGroupCounts` with the `a.status <> 'disabled'` filter
- `backend/internal/repository/fansub_repository_test.go` - Added `TestAttachGroupCounts_ProjectsCountExcludesDisabledAnime` (source-invariant, RED→GREEN)
- `shared/contracts/fansubs.yaml` - Added `projects_count: int32` to the `FansubGroup` OpenAPI schema
- `frontend/src/types/fansub.ts` - Added `projects_count: number;` to the `FansubGroup` interface
- `frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx` - Added `projects_count` to the fixture object (Rule 3 fix, see below)
- `frontend/src/app/fansubs/[slug]/page.test.tsx` - Added `projects_count` to the mock group fixture (Rule 3 fix)
- `frontend/src/components/fansubs/__tests__/FansubStorySection.test.tsx` - Added `projects_count` to the fixture object (Rule 3 fix)

## Decisions Made
- `ProjectsCount`/`projects_count` naming follows the existing `{Noun}Count`/`{noun}_count` convention exactly (matches plan's naming constraint; does not reuse `AnimeRelationsCount`'s wrong semantics or use a longer `AnimeProjectsCount` name)
- New SQL block positioned directly after the `AnimeRelationsCount` block (both source from `anime_fansub_groups`) rather than at the end of the function, for readability/adjacency of related queries

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed 3 pre-existing test/showcase fixtures broken by the new required TS field**
- **Found during:** Task 1 (`npm run typecheck` verification step)
- **Issue:** Adding a non-optional `projects_count: number;` field to the `FansubGroup` TS interface caused 3 existing object literals typed as `FansubGroup` to fail `tsc --noEmit` with `TS2741: Property 'projects_count' is missing`: `PublicFansubSurfacesShowcase.tsx`, `frontend/src/app/fansubs/[slug]/page.test.tsx`, and `FansubStorySection.test.tsx`
- **Fix:** Added `projects_count` with a plausible value to each of the 3 fixture objects, matching their existing `anime_relations_count` value
- **Files modified:** `frontend/src/app/dev/ui-system/showcase/PublicFansubSurfacesShowcase.tsx`, `frontend/src/app/fansubs/[slug]/page.test.tsx`, `frontend/src/components/fansubs/__tests__/FansubStorySection.test.tsx`
- **Verification:** Re-ran `npm run typecheck` — 0 errors
- **Committed in:** `e4313d1f` (Task 1 commit)

**2. [Environment recovery, not a code fix] Removed a stale `git index.lock`**
- **Found during:** staging Task 1 files
- **Issue:** `git add` failed with "Unable to create '.git/index.lock': File exists" — the lock file was 0 bytes, 7 minutes old, and no `git.exe`/`node.exe` process was running anywhere on the system (`tasklist` confirmed), indicating a stale lock from an earlier crashed process rather than a live concurrent writer
- **Fix:** Removed the stale lock file, then successfully staged only the intended Task 1 files (never used `git add -A`)
- **Verification:** `git status --short` afterward showed only the intended files staged; unrelated concurrent-writer changes to `.planning/STATE.md`/`.planning/ROADMAP.md` (from another active GSD process on `main`, confirmed by new `.planning/phases/111-*` and `115-*` files appearing mid-session) were left untouched
- **Committed in:** n/a (no file change, operational recovery only)

---

**Total deviations:** 1 auto-fixed code issue (Rule 3), 1 environment-recovery action (not a plan deviation)
**Impact on plan:** Both actions were necessary to complete Task 1 as specified. No scope creep — no production behavior was changed beyond what Task 1 already required.

## Issues Encountered

**Task 3 (Docker rebuild + live verify) could not be executed — Docker Desktop's backend engine was down for the entire session.**

- `docker ps` / `docker version` consistently returned `request returned 500 Internal Server Error for API route ... http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/...` despite `Docker Desktop.exe` and `com.docker.backend.exe` processes running in Task Manager.
- `wsl -l -v` confirmed the root cause: both the `Ubuntu` and `docker-desktop` WSL2 distros were in `Stopped` state — the Linux engine backing Docker Desktop was not running at all.
- Attempted recovery: relaunched `Docker Desktop.exe` and polled `docker ps` for over 10 minutes (multiple rounds, up to 5-minute individual waits); the `docker-desktop` distro never transitioned out of `Stopped`.
- Per this plan's own guidance ("if a curl parity check cannot run from the sandbox, document the exact command and expected result in SUMMARY.md and rely on the live verify in plan 114-04 rather than fabricating a pass"), Task 3 is documented here as **not completed**, not fabricated as passed.

**Exact commands to run once Docker Desktop is healthy (from repo root):**
```bash
# 1. Confirm the engine is actually responsive first
docker ps --format "{{.Names}}"

# 2. Rebuild and restart the backend container
docker compose up -d --build team4sv30-backend

# 3. Confirm rebuild + find the live-mapped host port (do NOT assume .env's 8092)
docker ps --filter "name=team4sv30-backend" --format "{{.Status}}"
P=$(docker port team4sv30-backend 8092 | head -1 | sed 's/.*://')
echo "Live port: $P"

# 4. Verify projects_count is present on every group
curl -s "http://localhost:${P}/api/v1/fansubs?per_page=500" | grep -o '"projects_count":[0-9]*' | head -20

# 5. Parity check: pick one group slug with a known non-zero project count and compare
#    its projects_count from step 4 against its own detail-page Anime-Projekte figure
curl -s "http://localhost:${P}/api/v1/fansubs/<slug>" | grep -o '"projects_count":[0-9]*'
# ...and cross-check against the profile endpoint's project list length, or visually at
# :3000/fansubs/<slug>
```

**Expected result:** every object in `data[]` contains an integer `projects_count` field, and the SQL added in this plan (`JOIN anime a ... AND a.status <> 'disabled'`) guarantees it will equal the sampled group's own "Anime-Projekte" detail-page figure, since both now share the identical filter.

**Confidence this will pass once Docker is available:** HIGH — the query was written as a byte-for-byte mirror of `listPublicFansubProjects`'s WHERE clause (the actual source of the detail page's "Anime-Projekte" number), and the regression test (`TestAttachGroupCounts_ProjectsCountExcludesDisabledAnime`) pins that exact SQL fragment at the source level, going RED without it and GREEN with it.

## User Setup Required

None - no external service configuration required. Docker Desktop itself needs to be brought back to a healthy state locally (see Issues Encountered above) before Task 3's live verification can run; this is a local development-environment issue, not a new configuration requirement introduced by this plan.

## Next Phase Readiness

- `projects_count` is available end-to-end in the Go/OpenAPI/TS contract layers and is correctly computed at the SQL level — Plan 114-03's frontend directory page can be built against the `FansubGroup` type today without waiting on the live verify.
- **Blocker for full phase closeout:** the live Docker verification (Task 3's acceptance criteria: rebuilt container confirmed via `docker ps`, live curl showing `projects_count` on every group, and one sampled group's parity check against its own detail page) is still outstanding and must be completed — either as a resumed Task 3 once Docker Desktop is healthy, or explicitly folded into Plan 114-04's live UAT pass, before this plan's `must_haves.truths` (which includes "The backend container is rebuilt and serving the new field live") can be marked fully satisfied.

---
*Phase: 114-oeffentliche-fansub-gruppen-uebersicht*
*Completed: 2026-07-28 (Tasks 1-2; Task 3 deferred — see Issues Encountered)*

## Self-Check: PASSED

All 6 created/modified files confirmed present on disk; all 3 task commit hashes (`e4313d1f`, `939d8656`, `8a73bf7a`) confirmed present in `git log --oneline --all`.
