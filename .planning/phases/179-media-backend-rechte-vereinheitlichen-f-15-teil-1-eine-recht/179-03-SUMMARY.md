---
phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht
plan: 03
subsystem: api
tags: [go, gin, permissions, postgres, pgx, capability-registry]

# Dependency graph
requires:
  - phase: 179-01
    provides: ActionReleaseThemeAssetUpload registered end-to-end (unrelated file scope; no functional dependency)
provides:
  - "UploadFansubMedia (Gruppenmedien-Upload, Weg 2) authorized by exactly one rights layer (CanForFansubGroup)"
  - "Real-Postgres regression proving the removed fallback no longer grants access even when seeded with can_upload=true"
affects: [179-media-backend-rechte-vereinheitlichen, fansub-media-upload, fansub-media-delete]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-layer capability-registry authorization (matches Weg 1 / release-media upload shape)"
    - "Real, schema-isolated Postgres fixture (testsupport.OpenPhase107Postgres + ApplySQLFile) used instead of a Go interface fake, because h.mediaRepo is a concrete *repository.MediaRepository (CLAUDE.md Teststil rule)"

key-files:
  created: []
  modified:
    - backend/internal/handlers/fansub_media_upload.go
    - backend/internal/handlers/fansub_media_permission_test.go

key-decisions:
  - "Removed only the upload-side custom-permission fallback in UploadFansubMedia; left the structurally identical delete-side fallback in fansub_media_delete.go completely untouched, per D-10"
  - "Proved the removal by seeding a can_upload=true row against a real Postgres-backed *repository.MediaRepository and asserting 403, then manually reverting the fix once to confirm the test goes red (500), then restoring the fix"

patterns-established:
  - "Dual-rights-check removal pattern: one action keeps a legacy custom-permission fallback (delete), the sibling action (upload) collapses to the single capability-registry check — proven independently per action, not assumed symmetric"

requirements-completed: [D-10, D-11]

# Metrics
duration: ~9min
completed: 2026-10-10
---

# Phase 179 Plan 03: Collapse Gruppenmedien-Upload to a Single Rights Layer Summary

**Removed the second, parallel custom-permission-fallback rights layer from `UploadFansubMedia` (D-10), leaving the capability-registry check (`CanForFansubGroup`) as the sole authorization decision for image uploads, with a real-Postgres regression test proving a seeded `can_upload=true` row no longer grants access.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-10-10T21:40:59Z (immediately after 179-01 completion)
- **Completed:** 2026-10-10T21:45:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `UploadFansubMedia`'s permission check is now single-layer, matching Weg 1's (release-media upload) shape — no more `GetFansubGroupMediaPermissionsForAppUser` call on the upload path
- `fansub_media_delete.go` is confirmed byte-for-byte unchanged (zero diff), preserving D-10's explicit keep-the-delete-fallback guarantee
- A new real-Postgres regression test (`TestFansubMediaUploadRejectsDespiteCustomUploadPermissionFallback`) proves the removed fallback no longer grants access, even when seeded with `can_upload=true` against a genuine, non-nil `*repository.MediaRepository`
- Manually confirmed (and then reverted) that the test fails with a 500 if the Task 1 fix is reverted, proving the test actually exercises the removed code path rather than passing vacuously

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove the upload-only custom-permission fallback** - `578a2815` (fix)
2. **Task 2: Real-Postgres regression proving the removed fallback no longer grants access** - `b4113662` (test)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `backend/internal/handlers/fansub_media_upload.go` - `UploadFansubMedia`'s `!result.Allowed` branch now calls `auditPermissionDenied` + `writePermissionDenied` + `return` directly, with no `GetFansubGroupMediaPermissionsForAppUser` call or `allowedByCustomMediaPermission` variable
- `backend/internal/handlers/fansub_media_permission_test.go` - added `fansubMediaUploadFallbackMigrationPath`, `openFansubMediaUploadFallbackFixture` (real Phase-107 Postgres fixture + migration 0110 for `fansub_group_member_media_permissions`), and `TestFansubMediaUploadRejectsDespiteCustomUploadPermissionFallback`

## Decisions Made
- Scoped Task 1's diff strictly to `fansub_media_upload.go`; confirmed via `git diff --stat backend/internal/handlers/fansub_media_delete.go` showing zero changes that `deleteFansubGroupMedia`'s own, separate `GetFansubGroupMediaPermissionsForAppUser` / `FansubGroupMediaUploadedByAppUser` calls remain untouched
- Used the real-Postgres fixture pattern from `admin_content_release_version_media_replace_test.go` (`openReplaceRVMHandlerFixture`) rather than a Go interface fake, because `FansubHandler.mediaRepo` is a concrete `*repository.MediaRepository` — per CLAUDE.md's Teststil rule, faking it would violate the "must actually execute the code under test" requirement
- Verified the regression test's falsifiability by temporarily re-adding the removed fallback block, confirming the test goes red (500 "media service nicht verfügbar", since the removed branch's own `h.mediaRepo != nil` check falls through to `h.mediaService == nil`), then restoring the fix — confirmed via `git diff --stat` showing zero residual diff on the handler file after the restore

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `go`/`git` binaries are not on `PATH` by default in the `team4sv30-backend` and other containers; worked around via `export PATH=$PATH:/usr/local/go/bin` inside `docker compose exec` and running `git diff`/`git status` on the host instead of inside the container (consistent with CLAUDE.md's canonical-Linux-host workflow)
- `TEAM4S_PHASE107_TEST_DSN` is not set by default in this environment; reused the existing `team4s_phase107_test_174` fixture database already present on `team4sv30-db` (left over from Phase 174 work) rather than provisioning a new one, consistent with every other `TEAM4S_PHASE107_TEST_DSN`-gated test in this package skipping (not failing) when the DSN is absent
- Full `go test ./...` has several pre-existing, unrelated failures (missing `TEAM4S_PHASE128_TEST_DSN`, missing Jellyfin fixture JSON files under `docs/audits/`, a pre-existing `release_version_media.reorder` capability-registry gap, and live Keycloak/network-dependent Phase-134 matrix tests) — confirmed via `git stash` that these failures are identical on the commit immediately prior to this plan's changes, so none of them are caused by this plan

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Permission-Matrix row 1.2 (Weg 2, Gruppenmedien-Upload) is closed: group-media upload is now authorized by exactly one capability-registry check
- The delete-side fallback (`DeleteFansubMedia`/`deleteFansubGroupMedia`) remains intentionally untouched per D-10 and is unaffected by this plan
- No blockers for subsequent 179 plans

---
*Phase: 179-media-backend-rechte-vereinheitlichen-f-15-teil-1-eine-recht*
*Completed: 2026-10-10*

## Self-Check: PASSED

- FOUND: backend/internal/handlers/fansub_media_upload.go
- FOUND: backend/internal/handlers/fansub_media_permission_test.go
- FOUND: commit 578a2815 (fix: remove upload-only custom-permission fallback)
- FOUND: commit b4113662 (test: real-Postgres regression)
