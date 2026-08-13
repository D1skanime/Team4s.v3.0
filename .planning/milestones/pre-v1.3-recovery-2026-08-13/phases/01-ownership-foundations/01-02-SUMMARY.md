---
phase: 01-ownership-foundations
plan: 02
subsystem: api
tags: [go, gin, postgres, auth, audit, media-upload]
requires:
  - phase: 01-01
    provides: authoritative anime metadata writes and read alignment
provides:
  - durable admin anime mutation audit storage
  - fail-closed admin anime route authentication
  - authenticated media upload actor attribution
affects: [phase-01, admin-anime, media-upload, auditability]
tech-stack:
  added: []
  patterns: [transactional audit writes, fail-closed admin actor resolution, authenticated media attribution]
key-files:
  created:
    - database/migrations/0035_add_admin_anime_mutation_audit.up.sql
    - database/migrations/0035_add_admin_anime_mutation_audit.down.sql
  modified:
    - backend/internal/repository/admin_content_anime_metadata.go
    - backend/internal/repository/admin_content_test.go
    - backend/internal/handlers/admin_content_authz.go
    - backend/internal/handlers/admin_content_anime.go
    - backend/internal/handlers/media_upload.go
    - backend/internal/repository/media_upload.go
    - backend/cmd/server/main.go
    - backend/internal/handlers/admin_content_test.go
    - backend/internal/handlers/media_upload_test.go
key-decisions:
  - "Admin anime mutations now write a JSONB audit row inside the same database transaction as the mutation."
  - "Phase 1 admin anime and upload routes fail closed without authenticated actor context; no dev fallback identity remains."
patterns-established:
  - "Admin mutation attribution belongs in repository-backed writes, not transient log lines."
  - "Upload handlers must resolve auth identity before any filesystem or persistence work begins."
requirements-completed: [RLY-03]
duration: 32min
completed: 2026-03-24
---

# Phase 1 Plan 02: Restore Trusted Actor Attribution Summary

**Transactional admin anime audit rows plus fail-closed auth on anime and upload mutation routes**

## Performance

- **Duration:** 32 min
- **Started:** 2026-03-24T12:45:00+01:00
- **Completed:** 2026-03-24T13:17:41+01:00
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Added `admin_anime_mutation_audit` with concrete actor, mutation kind, and request payload columns for Phase 1 anime mutations.
- Wrote `anime.create`, `anime.update`, and `anime.cover.remove` audit entries in the same repository transaction as anime writes.
- Re-enabled auth middleware on admin anime and media upload routes, removed the handler-level fallback admin identity, and persisted `uploaded_by` from authenticated actors.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add durable audit storage and repository writes for Phase 1 anime mutations** - `9113b2d` (feat)
2. **Task 2: Require authenticated admin identity on anime and upload routes and propagate actor IDs** - `8b6e3cc` (fix)

## Files Created/Modified
- `database/migrations/0035_add_admin_anime_mutation_audit.up.sql` - Creates the durable admin anime mutation audit table and indexes.
- `database/migrations/0035_add_admin_anime_mutation_audit.down.sql` - Drops the audit table on rollback.
- `backend/internal/repository/admin_content_anime_metadata.go` - Builds audit payloads and inserts audit rows inside create/update transactions.
- `backend/internal/repository/admin_content_test.go` - Covers audit payload shape and cover-removal mutation classification.
- `backend/internal/handlers/admin_content_authz.go` - Rejects actor-less requests instead of minting a fallback admin identity.
- `backend/internal/handlers/admin_content_anime.go` - Passes authenticated actor IDs into anime mutation repository calls.
- `backend/internal/handlers/media_upload.go` - Requires auth identity for upload/delete and persists `uploaded_by`.
- `backend/internal/repository/media_upload.go` - Uses the active DB connection consistently during deletes.
- `backend/cmd/server/main.go` - Re-enables comment-auth middleware on admin anime and upload routes.
- `backend/internal/handlers/admin_content_test.go` - Covers fail-closed admin identity resolution.
- `backend/internal/handlers/media_upload_test.go` - Covers unauthenticated upload rejection and authenticated `uploaded_by` persistence.

## Decisions Made

- Stored admin anime audit payloads as concrete JSONB request snapshots in a repo-local audit table instead of introducing a generic event abstraction.
- Classified explicit `cover_image: null` patches as `anime.cover.remove` so cover removal has a distinct durable audit trail.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Propagated authenticated upload actor into image and video processing paths**
- **Found during:** Task 2
- **Issue:** The first auth enforcement pass resolved the actor in `Upload` but did not pass it into `processImage` and `processVideo`, causing a build failure and dropped attribution.
- **Fix:** Threaded `actorUserID` through both processing paths and stored it on `media_assets.uploaded_by`.
- **Files modified:** `backend/internal/handlers/media_upload.go`
- **Verification:** `go test ./internal/handlers ./internal/repository -run 'TestAdminContent|TestMediaUpload' -count=1`
- **Committed in:** `8b6e3cc`

**2. [Rule 1 - Bug] Made media delete operations honor the active repository connection**
- **Found during:** Task 2
- **Issue:** `DeleteMediaAsset` bypassed `getConn()` and always used the pool directly, which broke transaction consistency assumptions in the media upload repository.
- **Fix:** Switched delete statements to use `getConn()` for the same tx/pool behavior as the rest of the repository.
- **Files modified:** `backend/internal/repository/media_upload.go`
- **Verification:** `go test ./internal/handlers ./internal/repository -run 'TestAdminContent|TestMediaUpload' -count=1`
- **Committed in:** `8b6e3cc`

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were directly required for correct authenticated actor attribution. No scope creep.

## Issues Encountered

- PowerShell rejected `&&` in direct commit commands, so task staging and commit steps were run as separate shell commands.

## User Setup Required

None - no external service configuration required.

## Known Stubs

- `backend/internal/handlers/media_upload.go:423` and `backend/internal/handlers/media_upload.go:701` still use a black placeholder thumbnail when video frame extraction fails. This is pre-existing fallback behavior in the modified file and does not block Phase 1 actor attribution.

## Next Phase Readiness

- Phase 1 now has trusted actor attribution for admin anime save and cover-removal paths plus authenticated media upload attribution.
- The shared editor shell work in `01-03` can now rely on a fail-closed admin mutation surface with durable audit writes.

## Self-Check

PASSED

- FOUND: `.planning/phases/01-ownership-foundations/01-02-SUMMARY.md`
- FOUND: `9113b2d`
- FOUND: `8b6e3cc`

---
*Phase: 01-ownership-foundations*
*Completed: 2026-03-24*
