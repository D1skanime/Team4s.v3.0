---
phase: 173
slug: ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
status: final
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-02
revised: 2026-10-02
---

# Phase 173 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

**Revision note (2026-10-02):** this file originally shipped with `TBD` placeholders for every
`Plan`/`Wave` column because it was authored before the plan set existed. Per plan-checker
WARNING 4, the table below now carries the real, final plan IDs and wave numbers for the complete
16-plan set (173-01 through 173-16), and the frontmatter `nyquist_compliant`/`wave_0_complete`
flags reflect the actual state of that finalized plan set, not the draft state.

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

- **After every task commit:** Run the targeted handler/service/component test for the touched
  write path or component (e.g. `go test ./internal/handlers/... -run TestUploadReleaseVersionMedia`,
  `npx vitest run src/components/fansubs/FansubGroupMediaBlock.test.tsx`)
- **After every plan wave:** Run full suite — `cd backend && go test ./...` and `cd frontend && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green AND the full live D-13 UAT (173-16, Task 3)
  on `:3300`/`:3000` with real data, desktop + mobile emulation (375px, DPR 3)
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 173-01-T1 | 173-01 | 1 | REQ-173-01/02/03/06/07 | T-173-01-01/02/03 | Small test image (<1920px) stays unscaled; large test image capped at 1920px long edge; WebP original keeps real WebP bytes | unit/integration | `go test ./internal/handlers/... -run TestMediaUploadHandler -v` | ✅ written in 173-01 | ⬜ pending |
| 173-01-T2 | 173-01 | 1 | REQ-173-04 | T-173-01-01/02 | Animated GIF produces an animated WebP `display` with valid `VP8X`/`ANIM` header; missing ffmpeg degrades non-fatally | integration | `go test ./internal/handlers/... -run TestMediaUploadHandler_AnimatedDisplay -v` | ✅ written in 173-01 | ⬜ pending |
| 173-02-T1 | 173-02 | 1 | REQ-173-01/02/03/06/07 | T-173-02-01/02/03 | RVM upload produces a display row (1920px cap, JPEG≥88); WebP-original regression fix | unit/integration | `go test ./internal/handlers/... -run TestUploadReleaseVersionMedia -v` | ✅ written in 173-02 | ⬜ pending |
| 173-03-T1 | 173-03 | 2 | REQ-173-01/02/03 | T-173-03-01/02 | RVM replace produces a display row with cleanup-on-failure parity | unit/integration | `go test ./internal/handlers/... -run TestReplaceReleaseVersionMedia -v` | ✅ written in 173-03 | ⬜ pending |
| 173-04-T1 | 173-04 | 2 | REQ-173-12/15 | T-173-04-01/03/04 | Fansub assets namespaced under /media/fansub/<group_id>/; legacy 301 redirect for migrated rows | integration | `go test ./internal/services/... ./internal/handlers/... -run "TestSaveUpload|TestServeMediaFile|TestUploadFansubMedia" -v` | ✅ written in 173-04 | ⬜ pending |
| 173-04-T2 | 173-04 | 2 | REQ-173-01/02/03 | T-173-04-02 | Logo/banner display variant (SVG exception) | unit | `go test ./internal/services/... -run TestSaveUpload_Display -v` | ✅ written in 173-04 | ⬜ pending |
| 173-04-T3 | 173-04 | 2 | REQ-173-01/02/03 | — | Fansub group-media display variant via shared generateRVMDisplay | unit | `go test ./internal/handlers/... -run TestFansubGroupMedia -v` | ✅ written in 173-04 | ⬜ pending |
| 173-05-T1 | 173-05 | 2 | REQ-173-01/02/03/09 | T-173-05-01/02 | Avatar/background display variant, non-fatal on failure | unit/integration | `go test ./internal/handlers/... ./internal/repository/... -run "TestUploadOwnProfileAvatar|TestUploadOwnProfileBackground"` | ✅ written in 173-05 | ⬜ pending |
| 173-05-T2 | 173-05 | 2 | REQ-173-09 | — | GetOwnProfile display_url with original fallback | unit | `go test ./internal/repository/... -run TestGetOwnProfile -v` | ✅ written in 173-05 | ⬜ pending |
| 173-06-T1 | 173-06 | 3 | REQ-173-08 | T-173-06-01/02 | True 1:1 original + capped display for new story-image uploads | unit/integration | `go test ./internal/handlers/... -run TestUploadOwnProfileStoryImage -v` | ✅ written in 173-06 | ⬜ pending |
| 173-06-T2 | 173-06 | 3 | REQ-173-08 | — | True original persisted as media_files row; old rows untouched | unit | `go test ./internal/repository/... -run TestInsertStoryImageAsset -v` | ✅ written in 173-06 | ⬜ pending |
| 173-07-T1/T2/T3 | 173-07 | 4 | REQ-173-16/17 | T-173-07-01/02/03/04 | Idempotent backfill: display generation, story-image pointer-only entries, fansub namespace migration, race-safety, dry-run | integration | `go test ./cmd/migrate-display-backfill/... -v` | ✅ written in 173-07 | ⬜ pending |
| 173-08-T1 | 173-08 | 1 | REQ-173-09/11 | T-173-08-01/02 | display_url fallback chain at 4 read sites (release-detail, group-media, review, fansub-media) | unit/integration | `go test ./internal/repository/... -run "TestLoadImages|TestGetPublicReleaseMedia|TestReleaseReview|TestListPublicFansubMedia" -v` | ✅ written in 173-08 | ⬜ pending |
| 173-09-T1 | 173-09 | 1 | REQ-173-22 | T-173-09-01/02 | Kara fallback preview prefers display over thumb (single + batch resolver) | unit/integration | `go test ./internal/repository/... -run "TestResolveThemeSegmentPreview|TestResolveThemeSegmentPreviewAssetsBatch" -v` | ❌ W0 — new test to add in 173-09 | ⬜ pending |
| 173-09-T2 | 173-09 | 1 | REQ-173-23 | T-173-09-01/02 | Anime cover/banner/logo + fansub project banner prefer display over original (V1+V2 schema) | unit/integration | `go test ./internal/repository/... -run "TestGetAnimeDetail|TestGetResolvedAssets|TestListPublicFansubProjects" -v` | ❌ W0 — new test to add in 173-09 | ⬜ pending |
| 173-10-T1 | 173-10 | 4 | REQ-173-24 | T-173-10-01/02 | Public fansub group logo/banner prefer display over stored original | unit/integration | `go test ./internal/repository/... -run "TestGetPublicGroupBase|TestGetPublicProfileBySlug" -v` | ❌ W0 — new test to add in 173-10 | ⬜ pending |
| 173-10-T2 | 173-10 | 4 | REQ-173-25 | T-173-10-01/02 | Public member profile display_url with original-safe fallback | unit/integration | `go test ./internal/repository/... -run TestGetPublicMemberProfile -v` | ❌ W0 — new test to add in 173-10 | ⬜ pending |
| 173-11-T1 | 173-11 | 2 | REQ-173-10 | T-173-11-01 | OpenAPI + 4 frontend type files list display_url | contract | `grep -c "display_url" shared/contracts/openapi.yaml frontend/src/types/*.ts` | ✅ exists, extended in 173-11 | ⬜ pending |
| 173-12-T1 | 173-12 | 1 | REQ-173-13/14 | T-173-12-01 | localPatterns covers /media/fansub/**; qualities includes 85 | unit (Vitest) | `cd frontend && npx vitest run src/components/ui/ResponsiveImage.config.test.ts` | ✅ exists, extended in 173-12 | ⬜ pending |
| 173-13-T1 | 173-13 | 3 | REQ-173-26/27 | T-173-13-01/02 | ReleaseGallery grid+Kara render via ResponsiveImage sourced from display_url/preview_url; lightbox original-first unchanged | integration (Vitest) | `npx vitest run "src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx"` | ❌ W0 — existing test extended in 173-13 | ⬜ pending |
| 173-13-T2 | 173-13 | 3 | REQ-173-26 | T-173-13-01 | PublicReleaseBlock heroImage/preview tiles prefer display_url via ResponsiveImage | type-check + unit | `cd frontend && npx tsc --noEmit` | ❌ W0 — covered by typecheck + component test in 173-13 | ⬜ pending |
| 173-13-T3 | 173-13 | 3 | REQ-173-26 | T-173-13-01 | HeroSection self-hosted branch uses ResponsiveImage; Jellyfin/API branch keeps unoptimized | unit (Vitest) | `cd frontend && npx vitest run src/app/anime/\[id\]/group/\[groupId\]/sections/HeroSection.test.tsx` | ❌ W0 — new/extended test in 173-13 | ⬜ pending |
| 173-14-T1 | 173-14 | 5 | REQ-173-28 | T-173-14-01/02 | FansubGroupMediaBlock tiles prefer display_url via ResponsiveImage; lightbox click flow unchanged | unit (Vitest) | `cd frontend && npx vitest run src/components/fansubs/FansubGroupMediaBlock.test.tsx` | ❌ W0 — new/extended test in 173-14 | ⬜ pending |
| 173-14-T2 | 173-14 | 5 | REQ-173-28 | T-173-14-01/02 | FansubBannerDisplay/FansubProfileTabs/FansubProjectBannerCard render via ResponsiveImage | unit (Vitest) | `cd frontend && npx vitest run src/components/fansubs/FansubBannerDisplay.test.tsx src/components/fansubs/FansubProfileTabs.test.tsx src/components/fansubs/FansubProjectBannerCard.test.tsx` | ❌ W0 — new/extended tests in 173-14 | ⬜ pending |
| 173-15-T1 | 173-15 | 5 | REQ-173-29 | — | PublicMemberProfileData types list display_url | type-check | `cd frontend && npx tsc --noEmit` | ❌ W0 — type-only change, verified by typecheck | ⬜ pending |
| 173-15-T2 | 173-15 | 5 | REQ-173-29 | T-173-15-01/02 | Public avatar/background render from display source via ResponsiveImage; animated-avatar branch still sources true original; /me/profile caller untouched | unit (Vitest) + git diff | `cd frontend && npx vitest run src/components/profile/MemberProfileHero.test.tsx && git diff --stat -- frontend/src/app/me` | ❌ W0 — new/extended test in 173-15 | ⬜ pending |
| 173-16-T1 | 173-16 | 6 | REQ-173-05/18/19 | — | Full suite green; imageDisplay.ts/imageDisplayContract.ts zero-diff; admin/me zero-diff; route count unchanged | integration | `cd backend && go test ./... && cd ../frontend && npm test` | ✅ existing suites | ⬜ pending |
| 173-16-T2 | 173-16 | 6 | REQ-173-19/30 | — | No new route/endpoint/dropzone anywhere in the phase; admin/me untouched | manual-only | code-review checklist against `cmd/server` route registration + `git diff --stat` on admin/me | n/a | ⬜ pending |
| 173-16-T3 | 173-16 | 6 | REQ-173-21/31 | T-173-16-01 | Full live backend contract + visual/mobile D-13 UAT, desktop+mobile, cold-cache RAM/CPU | manual-only | live `:3300`/`:3000` walkthrough per 173-16's `<how-to-verify>` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] New tests for `display` generation in each of the 6 write paths (size cap, "never upscale",
  EXIF-strip preserved) — covered by 173-01 through 173-06's own `<behavior>`/`<verify>` blocks.
- [x] New test for animated GIF→WebP `display` generation (D-07), asserting `VP8X`/`ANIM` header
  — covered by 173-01 Task 2.
- [x] Extended test cases in `ResponsiveImage.config.test.ts` for the new `/media/fansub/**`
  namespace (D-09/D-10) — covered by 173-12.
- [x] New `backend/cmd/migrate-display-backfill` package with its own tests — covered by 173-07.
- [x] New test for profile story image true-original storage (D-15) — covered by 173-06.
- [x] New test for fansub media 301 redirect from old URL forms (D-17) — covered by 173-04.
- [x] New tests for the four backend "prefer display" in-place sites added during revision (Kara
  preview, anime cover/banner, fansub project banner, fansub group logo/banner) — covered by
  173-09/173-10.
- [x] New test for the public member profile's additive display_url with original-fallback and
  animated-avatar-safety (D-07) — covered by 173-10/173-15.
- [x] New/extended frontend component tests proving ResponsiveImage consumption and
  click-to-original preservation for every public surface named in `173-CONTEXT.md`'s findings —
  covered by 173-13/173-14/173-15.

All Wave 0 gaps identified during the original (pre-revision) planning pass, plus the additional
gaps surfaced by the 2026-10-02 scope-expansion revision, now have a concrete plan+task mapping in
the table above — none remain `TBD`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No new upload endpoint/dropzone UI introduced anywhere in the phase (backend write paths AND frontend wiring plans) | D-14 | Absence of a new route/UI surface is a structural/architectural property, not a runtime behavior — best caught by code review against the route registration and diff review, not a test assertion | 173-16 Task 2: review `cmd/server` route registration diff and the full frontend diff across all 15 implementation plans; confirm no new `POST`/`PUT` route or new upload UI component was added; confirm image-processing extraction is a plain function/service call, not an HTTP handler, and that 173-13/173-14/173-15 added zero new `fetch`/API calls |
| Admin/`/me/**` surfaces never touched by any plan in the phase | D-04 | Absence of a touched file under a specific directory tree is a structural property, not a runtime behavior | 173-16 Task 1/2: `git diff --stat` on `frontend/src/app/admin`, `frontend/src/app/me` across the whole phase, must be empty |
| Live UAT: gallery/hero/banner/avatar sharp, `_next/image` sourced from `display` (or the two documented `imageDisplay.ts` exceptions), original only after click, no horizontal overflow, cold-cache RAM/CPU of frontend container | D-13 (full, REQ-173-31) | Visual/perceptual quality and resource usage under a real browser + real VM load cannot be asserted by unit tests | 173-16 Task 3: follow the 8 steps on `:3300`/`:3000` (desktop) and mobile emulation (375px, DPR 3); inspect Network tab for `_next/image?url=...` requests; measure frontend container RAM/CPU on cold cache per phase UAT process |
| Backend-contract-only live check (display_url present, namespace+redirect, backfill clean run) | D-13 (backend subset, REQ-173-21) | Requires a real database and real file storage, not mockable in a unit test | 173-16 Task 3, steps 1-2 and 6 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or a documented Wave 0/manual-only classification
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (see Wave 0 Requirements above — all checked)
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** signed off 2026-10-02 as part of the scope-expansion revision — the plan set is now
final (16 plans, 6 waves) and every task in the Per-Task Verification Map carries a real plan ID
and wave number.
