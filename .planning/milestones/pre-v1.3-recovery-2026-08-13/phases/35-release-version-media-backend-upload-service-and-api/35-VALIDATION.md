---
phase: 35
slug: release-version-media-backend-upload-service-and-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-07
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `github.com/stretchr/testify` v1.9.0 |
| **Config file** | none — Go `testing`-Package Standard |
| **Quick run command** | `cd backend && go test ./internal/handlers/... -run TestReleaseVersionMedia -v` |
| **Full suite command** | `cd backend && go test ./... -timeout 120s` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && go test ./internal/handlers/... -run TestReleaseVersionMedia -v`
- **After every plan wave:** Run `cd backend && go test ./... -timeout 120s`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 35-01-01 | 01 | 1 | RVM-BACKEND-01 | build | `cd backend && go build ./...` | ✅ existing | ⬜ pending |
| 35-02-01 | 02 | 1 | RVM-BACKEND-01 | unit | `go test ./internal/handlers/... -run TestUploadReleaseVersionMedia -v` | ❌ W0 | ⬜ pending |
| 35-02-02 | 02 | 1 | RVM-BACKEND-01 | unit | `go test ./internal/... -run TestGenerateGIFThumbnail -v` | ❌ W0 | ⬜ pending |
| 35-03-01 | 03 | 2 | RVM-BACKEND-01 | unit | `go test ./internal/handlers/... -run TestPatchReleaseVersionMedia_CategoryChange -v` | ❌ W0 | ⬜ pending |
| 35-03-02 | 03 | 2 | RVM-BACKEND-01 | unit | `go test ./internal/handlers/... -run TestPreviewCategoryValidation -v` | ❌ W0 | ⬜ pending |
| 35-03-03 | 03 | 2 | RVM-BACKEND-01 | unit | `go test ./internal/repository/... -run TestClearPreviewCandidate -v` | ❌ W0 | ⬜ pending |
| 35-04-01 | 04 | 2 | RVM-BACKEND-01 | integration | `go test ./internal/handlers/... -run TestUploadReleaseVersionMedia_PartialFailure -v` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/internal/handlers/admin_content_release_version_media_test.go` — Handler-Tests für Upload, PATCH, DELETE, Reorder
- [ ] `backend/internal/repository/release_version_media_repository_test.go` — Repo-Tests für ClearPreviewCandidate, ReorderReleaseVersionMedia

*Existing infrastructure (go test) covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GIF-Original bleibt animiert nach Upload | RVM-BACKEND-01 | Requires real animated GIF + libvips runtime | Upload animated GIF via API, verify original file has multiple frames with `identify -verbose` or browser preview |
| Thumbnail ist statisches Frame-0 | RVM-BACKEND-01 | Requires real govips runtime in Docker | Upload animated GIF, inspect thumbnail file — must be single-frame JPEG/WebP |
| CGO-Build in Docker funktioniert | RVM-BACKEND-01 | Dockerfile change requires rebuild + docker compose up | `docker compose build backend && docker compose up -d backend` — must start without error |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
