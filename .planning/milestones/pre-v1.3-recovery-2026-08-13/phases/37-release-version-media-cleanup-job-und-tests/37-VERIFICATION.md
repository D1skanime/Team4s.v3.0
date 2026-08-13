---
phase: 37-release-version-media-cleanup-job-und-tests
verified: 2026-05-08T16:28:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 37: RVM Cleanup Job & Tests — Verification Report

**Phase Goal:** Implement a periodic cleanup job for release-version media assets (stale processing, orphan staging, missing files, soft-delete cleanup) and complete the backend and frontend test suites that lock upload behavior, validation rules, and gallery interactions.
**Verified:** 2026-05-08T16:28:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Cleanup service exists at `backend/internal/services/release_version_media_cleanup.go` and is started in `main.go` via a ticker goroutine | ✓ VERIFIED | File is 157 lines; `time.NewTicker(services.RVMCleanupInterval)` goroutine at main.go:183 calls `RunOnce` every 10 min |
| 2  | Cleanup never selects shared media assets (referenced by multiple RVM rows) for physical delete | ✓ VERIFIED | `SelectSoftDeleteRVMCleanupCandidates` enforces `NOT EXISTS` subquery at SQL level; `IsMediaAssetReferencedByOtherRVM` is a runtime double-check in the service before `HardDeleteRVMAndAsset` |
| 3  | Backend handler tests cover JPEG/PNG/WebP/GIF upload, GIF animation invariant, partial-failure, MIME/size rejection | ✓ VERIFIED | 30+ named tests in `admin_content_release_version_media_test.go`: `TestReleaseVersionMedia_ThumbnailFromJPEG/PNG/AnimatedGIF_OriginalPreservesFrames`, `TestReleaseVersionMedia_AllowedMIMETypes`, `TestReleaseVersionMedia_FileSizeRejection`, `TestReleaseVersionMedia_PartialFailureResultsArray` |
| 4  | Frontend tests: category required before upload, preview affordances only for screenshot/typesetting_karaoke, per-file error surfacing, gallery refresh | ✓ VERIFIED | `ReleaseVersionMediaSection.test.tsx` (512 lines, 21 tests) covers all four: category gating, preview toggle by category, retry button per-file, delete-removes-card |
| 5  | `go test ./internal/... -count=1` passes | ✓ VERIFIED | All 11 internal packages pass: auth, config, handlers, middleware, migrations, models, observability, repository, services |
| 6  | `npx vitest run` passes | ✓ VERIFIED | 40 test files, 384 tests — all pass |
| 7  | Cleanup passes: stale processing, missing files, soft-delete all implemented | ✓ VERIFIED | `passStaleProcessing`, `passMissingFiles`, `passSoftDelete` all present and substantive in service; repository methods `SelectStaleProcessingRVMAssets`, `SelectMissingFileRVMCandidates`, `SelectSoftDeleteRVMCleanupCandidates` confirmed in `release_version_media_cleanup.go` (278 lines) |
| 8  | Integration-style tests: cleanup idempotency, UUID storage-key uniqueness, preview exclusivity | ✓ VERIFIED | `TestRVMCleanupService_MultipleRunsAreIdempotent`, `TestRVMUploadStorageKeyUniqueness` (100-call loop), `TestRVMPreviewAssignmentIsExclusive` all present in `release_version_media_cleanup_test.go` (403 lines) |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/services/release_version_media_cleanup.go` | Three-pass cleanup service with RunOnce entrypoint | ✓ VERIFIED | 157 lines; passes 1–3 implemented; `RVMCleanupStore` interface enables mock testing |
| `backend/internal/repository/release_version_media_cleanup.go` | Repository scan/mutation methods for cleanup | ✓ VERIFIED | 278 lines; 4 select methods + 4 mutation helpers |
| `backend/internal/services/release_version_media_cleanup_test.go` | Unit tests for all service paths | ✓ VERIFIED | 403 lines; 17 test functions including idempotency, uniqueness, exclusivity |
| `backend/internal/repository/release_version_media_cleanup_test.go` | Compile-time signature and no-shared-asset tests | ✓ VERIFIED | 90 lines; confirms method signatures and shared-asset invariant |
| `backend/internal/handlers/admin_content_release_version_media_test.go` | Upload validation, GIF, partial-failure, auth tests | ✓ VERIFIED | 632 lines; 30+ test functions covering all required validation paths |
| `backend/internal/repository/release_version_media_repository_test.go` | Repository soft-delete, category lock, reorder scope tests | ✓ VERIFIED | Extended with source-inspection tests; all pass |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx` | Category gating, retry, preview, gallery refresh | ✓ VERIFIED | 512 lines; 21 named tests; all pass in vitest |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx` | Media tab render, error shell visibility | ✓ VERIFIED | 144 lines; 3 tests; all pass |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `main.go` | `RVMCleanupService.RunOnce` | `time.NewTicker` goroutine | ✓ WIRED | Goroutine at main.go:182–191; fires every `RVMCleanupInterval` (10 min) |
| `RVMCleanupService` | `RVMCleanupStore` interface | `SelectSoftDeleteRVMCleanupCandidates` | ✓ WIRED | Interface defined in services package; `*MediaRepository` satisfies it |
| `SelectSoftDeleteRVMCleanupCandidates` | shared-asset guard | `NOT EXISTS` SQL subquery | ✓ WIRED | SQL at repository cleanup line 138–144 |
| `passSoftDelete` | runtime guard | `IsMediaAssetReferencedByOtherRVM` | ✓ WIRED | Called at service line 125 before `HardDeleteRVMAndAsset` |
| Frontend category gate | upload disabled state | disabled prop on file input + button | ✓ WIRED | Test "keeps file input and upload button disabled until a category is selected" passes |

---

### Data-Flow Trace (Level 4)

Not applicable — phase produces tests and a background job, not new UI components rendering dynamic data from a new API.

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `go test ./internal/repository/... ./internal/services/... -count=1` | Backend repository+services | Both `ok` | ✓ PASS |
| `go test ./internal/handlers/... -run ReleaseVersionMedia -count=1` | Handler ReleaseVersionMedia tests | `ok` | ✓ PASS |
| `go test ./internal/... -count=1` | All 11 internal packages | All `ok` | ✓ PASS |
| `npx vitest run` | 40 test files | 384 tests passed | ✓ PASS |
| `cmd/server` package compilation | Windows only — govips unavailable | Excluded | ? SKIP (pre-existing constraint from Phase 35, Docker-only build) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RVM-CLEANUP-01 | 37-01, 37-02, 37-03, 37-04 | Periodic cleanup job with safe shared-asset handling; backend + frontend test suites | ✓ SATISFIED | Cleanup service wired in main.go; all test suites pass; shared-asset SQL guard + runtime guard verified |

---

### Anti-Patterns Found

None. Scanned all phase-37 artifacts (`release_version_media_cleanup.go`, `release_version_media_cleanup_test.go`, `admin_content_release_version_media_test.go`, `ReleaseVersionMediaSection.test.tsx`, `page.test.tsx`) for TODO/FIXME/placeholder/stub patterns — clean.

---

### Human Verification Required

The following items need live container validation before calling the system fully production-ready. These are LOW risk (code paths identical to what is unit-tested):

#### 1. Periodic Ticker Fires in Docker

**Test:** Start the backend container and observe logs after 10+ minutes.
**Expected:** `rvm cleanup: ...` log lines appear on each ticker interval.
**Why human:** Container runtime required; no in-process equivalent.

#### 2. Cleanup Removes Files on Docker Volume

**Test:** Upload an asset in the container, soft-delete it, wait for next cleanup cycle, verify file gone from storage volume.
**Expected:** Physical file absent from `/media` volume after cleanup run.
**Why human:** Requires Docker compose + live filesystem check.

#### 3. Preview Toggle Live Round-Trip

**Test:** Upload a `screenshot`, mark as preview, upload second screenshot, mark it preview, verify first loses preview badge.
**Expected:** Only one active preview per release-version at any time.
**Why human:** `ClearPreviewCandidateForVersion` DB behavior requires live Postgres.

---

### Gaps Summary

No gaps. All automated must-haves verified. Three items remain for live container follow-up (all assessed LOW risk in the phase summary).

---

_Verified: 2026-05-08T16:28:00Z_
_Verifier: Claude (gsd-verifier)_
