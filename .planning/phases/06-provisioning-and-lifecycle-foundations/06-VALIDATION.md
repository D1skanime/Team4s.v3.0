---
phase: 06
slug: provisioning-and-lifecycle-foundations
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-02
---

# Phase 06 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | go test |
| **Config file** | none |
| **Quick run command** | `cd backend && go test ./internal/handlers -run "TestMediaUploadHandler_(UploadRejectsMissingAuthIdentity|UploadPersistsUploadedByFromAuthIdentity|Delete|ValidateFile|MainFileStaysWithinLineBudget)" -count=1` |
| **Full suite command** | `cd backend && go test ./internal/handlers ./internal/repository -count=1` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && go test ./internal/handlers -run "TestMediaUploadHandler_(UploadRejectsMissingAuthIdentity|UploadPersistsUploadedByFromAuthIdentity|Delete|ValidateFile|MainFileStaysWithinLineBudget)" -count=1`
- **After every plan wave:** Run `cd backend && go test ./internal/handlers ./internal/repository -count=1`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | PROV-04, LIFE-04 | unit | `cd backend && go test ./internal/handlers -run "TestMediaUploadHandler_(UploadRejectsMissingAuthIdentity|ValidateFile)" -count=1` | ✅ | ⬜ pending |
| 06-01-02 | 01 | 1 | PROV-01, PROV-02, PROV-03 | unit | `cd backend && go test ./internal/handlers ./internal/repository -run "Test.*Provision.*|Test.*MediaUpload.*" -count=1` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | LIFE-02, LIFE-03 | unit | `cd backend && go test ./internal/handlers -run "TestMediaUploadHandler_(UploadPersistsUploadedByFromAuthIdentity|Delete)" -count=1` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/handlers/media_upload_test.go` - extend with provisioning/idempotency/error-detail coverage for `PROV-01` through `PROV-04`
- [ ] `backend/internal/repository/*asset_lifecycle*_test.go` - add audit/subject lookup and lifecycle policy repository tests once new repository seams exist

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| First upload auto-provisions missing canonical anime folders in the non-Jellyfin path | PROV-01, PROV-02 | Requires filesystem/runtime observation across the real manual anime create/edit path | Start backend locally or in Docker, upload a valid asset for an anime with no existing canonical asset folders, then confirm the upload succeeds and the expected server-derived folder set exists under the canonical anime root. |
| Repeated upload does not recreate an already-valid structure | PROV-03 | Idempotency should be confirmed against on-disk state, not only mocked behavior | Repeat the same upload after the canonical structure exists and confirm the response indicates reuse/already-exists behavior rather than duplicate provisioning or folder churn. |
| Inconsistent reserved structure fails with an operator-usable error | PROV-04, LIFE-02 | The exact operator-facing failure copy and blocking semantics need end-to-end confirmation | Create an invalid reserved path state for an entity (for example a file where a required folder should live), upload again, and confirm the UI/error response names the failing folder or validation reason. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
