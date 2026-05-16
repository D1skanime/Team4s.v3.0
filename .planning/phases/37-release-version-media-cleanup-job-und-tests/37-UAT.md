---
status: partial
phase: 37-release-version-media-cleanup-job-und-tests
source:
  - 37-01-SUMMARY.md
  - 37-02-SUMMARY.md
  - 37-03-SUMMARY.md
  - 37-04-SUMMARY.md
  - 37-VERIFICATION.md
started: 2026-05-08T14:39:49Z
updated: 2026-05-08T15:12:00Z
---

## Current Test

[live verification found a cleanup-run gap]

## Tests

### 1. Backend Regression Suite Re-Run
expected: `go test ./internal/... -count=1` passes so the cleanup service, repository seams, upload handler regressions, and integration-style checks stay green.
result: pass

### 2. Frontend Regression Suite Re-Run
expected: `ReleaseVersionMediaSection.test.tsx`, `page.test.tsx`, and `npx tsc --noEmit` pass so the upload/gallery UI contract remains green.
result: pass

### 3. Preview Exclusivity Live Round-Trip
expected: Setting relation `8` as preview and then relation `9` as preview should leave exactly one active preview candidate for release version `41`.
result: pass
notes: Live PATCH requests against `/api/v1/admin/release-versions/41/media/8` and `/api/v1/admin/release-versions/41/media/9` succeeded. Postgres then showed `8=false`, `9=true`.

### 4. Soft-Delete Candidates Reach Cleanup Query
expected: After deleting test relations `8` and `9`, the cleanup SQL should recognize both rows as eligible soft-delete candidates.
result: pass
notes: Direct Postgres query returned both rows with `deleted_at` set plus their `original` and `thumb` file paths, so the repository selection contract is live-valid.

### 5. Periodic Docker Cleanup Tick
expected: After restarting `team4sv30-backend` at `2026-05-08T14:59:52Z` and waiting more than one full `RVMCleanupInterval` (10 minutes), the background ticker should have run `RunOnce` and removed soft-deleted relations `8` and `9`.
result: fail
notes: At `2026-05-08T15:11:01Z`, both rows still existed in `release_version_media`, both `media_assets` rows still existed, and all four `media_files` rows still existed. No `rvm cleanup:` log lines appeared in `docker logs team4sv30-backend --since 12m`.

### 6. Docker Volume File Removal
expected: The same cleanup tick should remove `/app/media/release-version/41/.../original.png` and `thumb.jpg` for both test assets from the backend container filesystem.
result: fail
notes: Immediately after the >10 minute wait, all four files still existed on disk. This is blocked by the same missing or non-effective periodic cleanup execution as Test 5.

## Summary

total: 6
passed: 4
issues: 2
pending: 0
skipped: 0
blocked: 0

## Gaps

- The live Docker runtime did not prove that the periodic `time.NewTicker(services.RVMCleanupInterval)` loop actually executes effective cleanup work. Soft-deleted RVM candidates remained untouched after more than one full interval.
- Because the DB rows were not hard-deleted, physical media files on the Docker volume also remained in place.
- This is narrower than a broad Phase-37 failure: automated backend/frontend suites are green, preview exclusivity is live-correct, and the soft-delete candidate query itself is live-correct. The gap is specifically in the runtime cleanup loop or its side effects.
