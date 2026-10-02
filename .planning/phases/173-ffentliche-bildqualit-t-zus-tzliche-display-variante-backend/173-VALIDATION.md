---
phase: 173
slug: ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-02
---

# Phase 173 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (Backend)** | Go stdlib `testing` + `testify`, real Postgres integration tests (pattern: `admin_content_release_version_media_test.go`, `fansub_media_upload_thumbnail_test.go`, `app_profile_story_image_test.go` already exist for the 6 write paths) |
| **Framework (Frontend)** | Vitest 3 (`frontend/package.json` `"test": "vitest run"`), incl. `ResponsiveImage.config.test.ts` for `localPatterns`/`remotePatterns` contracts |
| **Config file** | `backend/go.mod` (no separate test config), `frontend/vitest.config.ts` |
| **Quick run command** | `cd backend && go test ./internal/handlers/... -run TestUploadReleaseVersionMedia` (example for one of the 6 paths) |
| **Full suite command** | `cd backend && go test ./...` and `cd frontend && npm test` |
| **Estimated runtime** | ~60s backend, ~30s frontend |

---

## Sampling Rate

- **After every task commit:** Run the targeted handler/service test for the touched write path (e.g. `go test ./internal/handlers/... -run TestUploadReleaseVersionMedia`)
- **After every plan wave:** Run full suite — `cd backend && go test ./...` and `cd frontend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green AND live UAT (D-13) on `:3300`/`:3000` with real data, desktop + mobile emulation (375px, DPR 3)
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 173-01-01 | TBD | 0 | D-01 | — | Small test image (<1920px) stays unscaled; large test image capped at 1920px long edge | unit/integration | `go test ./internal/handlers/... -run TestDisplayVariant` (new) | ❌ W0 | ⬜ pending |
| 173-01-02 | TBD | TBD | D-07 | — | Animated GIF produces an animated WebP `display` with valid `VP8X`/`ANIM` header | integration | `go test ./internal/services/... -run TestAnimatedDisplayVariant` (new) | ❌ W0 | ⬜ pending |
| 173-01-03 | TBD | TBD | D-08 | — | Animated WebP upload still returns the existing rejection error code (FFmpeg cannot decode animated WebP — confirmed live) | unit | `go test ./internal/handlers/... -run TestAnimatedWebP` | ✅ existing | ⬜ pending |
| 173-01-04 | TBD | TBD | D-05 | — | API response includes `display_url`, falls back to `original_url` when no `display` media file exists | unit | `go test ./internal/handlers/... -run TestDisplayURLFallback` (new) | ❌ W0 | ⬜ pending |
| 173-01-05 | TBD | TBD | D-09/D-10 | — | Every backend-produced public image URL form matches `localPatterns`/`remotePatterns` | unit (Vitest) | `cd frontend && npx vitest run src/components/ui/ResponsiveImage.config.test.ts` | ✅ exists, needs new cases | ⬜ pending |
| 173-01-06 | TBD | TBD | D-15 | — | Profile story image upload stores a true 1:1 original (EXIF/GPS stripped) plus a `display` variant; existing 1600px story images are untouched by backfill except for `display` generation | unit/integration | `go test ./internal/handlers/... -run TestProfileStoryImageOriginal` (new) | ❌ W0 | ⬜ pending |
| 173-01-07 | TBD | TBD | D-17 | — | Old fansub media URLs (`/api/v1/media/files/...`, flat `/media/...`) return HTTP 301 to the new `/media/fansub/...` path after migration | integration | `go test ./internal/handlers/... -run TestFansubMediaRedirect` (new) | ❌ W0 | ⬜ pending |
| 173-01-08 | TBD | TBD | D-14 | — | No new HTTP route exists that triggers display/preview processing without being tied to an existing write path | manual-only | code-review checklist against `cmd/server` route registration | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New tests for `display` generation in each of the 6 write paths (size cap, "never upscale", EXIF-strip preserved)
- [ ] New test for animated GIF→WebP `display` generation (D-07), asserting `VP8X`/`ANIM` header as live-verified during research
- [ ] Extended test cases in `ResponsiveImage.config.test.ts` for the new `/media/fansub/**` namespace (D-09/D-10)
- [ ] New `backend/cmd/migrate-display-backfill` package with its own tests, analogous to `cmd/migrate-preview-backfill/backfill_test.go`
- [ ] New test for profile story image true-original storage (D-15)
- [ ] New test for fansub media 301 redirect from old URL forms (D-17)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No new upload endpoint/dropzone UI introduced | D-14 | Absence of a new route/UI surface is a structural/architectural property, not a runtime behavior — best caught by code review against the route registration and diff review, not a test assertion | Review `cmd/server` route registration diff and frontend diff; confirm no new `POST`/`PUT` route or new upload UI component was added; confirm image-processing extraction (if any) is a plain function/service call, not an HTTP handler |
| Live UAT: gallery sharp, `_next/image` sourced from `display`, original only after click, no horizontal overflow, cold-cache RAM/CPU of frontend container | D-13 | Visual/perceptual quality and resource usage under a real browser + real VM load cannot be asserted by unit tests | Follow D-13 steps on `:3300` (desktop) and mobile emulation (375px, DPR 3); inspect Network tab for `_next/image?url=...display...`; measure frontend container RAM/CPU on cold cache per phase UAT process |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
