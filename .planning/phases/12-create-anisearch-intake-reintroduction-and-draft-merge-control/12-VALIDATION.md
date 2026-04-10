---
phase: 12
slug: create-anisearch-intake-reintroduction-and-draft-merge-control
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-10
---

# Phase 12 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 and Go `testing` with testify 1.9.0 |
| **Config file** | `frontend/vitest.config.ts`; backend uses `go test` with package-local tests |
| **Quick run command** | `cd frontend && npm test -- src/lib/api.admin-anime.test.ts` |
| **Full suite command** | `cd frontend && npm test && cd ../backend && go test ./internal/services ./internal/handlers -count=1` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run the smallest task-specific targeted command from the table below
- **After every plan wave:** Run `cd frontend && npm test && cd ../backend && go test ./internal/services ./internal/handlers -count=1`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 25 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | ENR-01 | frontend unit/render | `cd frontend && npm test -- src/app/admin/anime/create/createAniSearchSummary.test.ts` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | ENR-02 | frontend API + backend service | `cd frontend && npm test -- src/lib/api.admin-anime.test.ts && cd ../backend && go test ./internal/services -run TestAnimeCreateEnrichmentService -count=1` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | ENR-03 | frontend controller/unit + backend service | `cd frontend && npm test -- src/app/admin/anime/create/useAdminAnimeCreateController.test.ts && cd ../backend && go test ./internal/services -run TestAnimeCreateEnrichmentService_ReturnsRedirectForDuplicateAniSearchID -count=1` | ⚠️ W0 | ⬜ pending |
| 12-02-02 | 02 | 2 | ENR-04 | frontend controller/unit + backend service regression | `cd frontend && npm test -- src/app/admin/anime/create/useAdminAnimeCreateController.test.ts && cd ../backend && go test ./internal/services -run TestAnimeCreateEnrichmentService_PreservesManualValuesAndAppliesFillOnlyFollowup -count=1` | ⚠️ W0 | ⬜ pending |
| 12-03-01 | 03 | 3 | ENR-05 | frontend helper/unit + backend handler/service | `cd frontend && npm test -- src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx src/app/admin/anime/create/page.test.tsx && cd ../backend && go test ./internal/handlers -run TestBuildAdminAnimeUpsertResponse_IncludesAniSearchWarningSummary -count=1` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` - focused load-order precedence and duplicate/conflict state coverage for ENR-03 and ENR-04
- [ ] `frontend/src/lib/api.admin-anime.test.ts` - create AniSearch request helper and redirect/draft response parsing coverage
- [ ] create-side summary/helper tests for updated fields, overwritten Jellyfin values, preserved manual values, and `not saved yet` copy if these move out of `page.test.tsx`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Create AniSearch card placement, summary readability, and duplicate redirect usability on the live create route | ENR-01, ENR-03, ENR-05 | Final operator readability and navigation confidence are best checked in browser | Open `/admin/anime/create`, load AniSearch by explicit ID, confirm the card sits above Jellyfin, review the unsaved-draft summary, and verify duplicate IDs jump to the existing anime edit route. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
