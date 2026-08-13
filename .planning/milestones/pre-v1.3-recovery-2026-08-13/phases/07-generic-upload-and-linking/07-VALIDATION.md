---
phase: 07
slug: generic-upload-and-linking
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-04
---

# Phase 07 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | go test and npm test |
| **Config file** | none |
| **Quick run command** | `cd backend && go test ./internal/repository ./internal/handlers -run "Test.*Anime.*Asset|Test.*MediaUpload.*" -count=1` |
| **Full suite command** | `cd backend && go test ./internal/repository ./internal/handlers -count=1 && cd ../frontend && npm test -- src/lib/api.admin-anime.test.ts src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts src/app/admin/anime/create/page.test.tsx` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && go test ./internal/repository ./internal/handlers -run "Test.*Anime.*Asset|Test.*MediaUpload.*" -count=1`
- **After every plan wave:** Run `cd backend && go test ./internal/repository ./internal/handlers -count=1 && cd ../frontend && npm test -- src/lib/api.admin-anime.test.ts src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts src/app/admin/anime/create/page.test.tsx`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | UPLD-01, UPLD-03 | unit | `cd backend && go test ./internal/repository -run "Test.*Anime.*Asset.*(Assign|Add|Clear|Remove)" -count=1` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | UPLD-01, UPLD-02, UPLD-03 | unit | `cd backend && go test ./internal/handlers -run "Test.*AdminAnime.*Asset|Test.*MediaUpload.*" -count=1` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 2 | UPLD-01, UPLD-02 | unit | `cd frontend && npm test -- src/lib/api.admin-anime.test.ts src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts` | ✅ | ⬜ pending |
| 07-02-02 | 02 | 2 | UPLD-02, UPLD-03 | component | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/[id]/edit/page.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

- [ ] Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Manual create can upload and link at least one new non-cover slot through the generic seam | UPLD-01, UPLD-02, UPLD-03 | Browser verification is needed to prove the full upload-plus-link path, not only mocks | Start the local stack, create or open an anime, upload `banner` and `logo`, then confirm the saved anime resolves the expected asset URLs from the V2 path. |
| Edit route can add a background and a background video without falling back to legacy cover-only behavior | UPLD-02, UPLD-03 | Mixed file-type UI behavior is easier to validate end-to-end than by isolated mocks alone | On an existing anime, upload one background image and one background video, save, refresh, and confirm both appear under the expected asset sections and continue to resolve after reload. |
| Operator copy no longer references `frontend/public/covers` for active upload behavior | UPLD-01 | This is a product-facing correctness check rather than a backend contract | Open the create and edit surfaces and inspect asset help text around uploads. It should describe the generic V2 upload path rather than the old local cover directory. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
