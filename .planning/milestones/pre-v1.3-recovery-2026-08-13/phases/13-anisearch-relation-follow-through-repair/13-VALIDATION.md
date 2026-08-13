---
phase: 13
slug: anisearch-relation-follow-through-repair
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-10
---

# Phase 13 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 and Go `testing` |
| **Config file** | `frontend/vitest.config.ts`; backend uses package-local `go test` |
| **Quick run command** | `cd frontend && npm test -- src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` |
| **Full suite command** | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/create/useAdminAnimeCreateController.test.ts && cd ../backend && go test ./internal/handlers ./internal/repository ./internal/services -count=1` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the smallest targeted command from the table below
- **After every plan wave:** Run `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx src/app/admin/anime/create/useAdminAnimeCreateController.test.ts && cd ../backend && go test ./internal/handlers ./internal/repository ./internal/services -count=1`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | ENR-05 | frontend unit + backend handler unit | `cd frontend && npm test -- src/app/admin/anime/create/useAdminAnimeCreateController.test.ts && cd ../backend && go test ./internal/handlers -run "TestCreateAnime|TestBuildAdminAnimeUpsertResponse" -count=1` | ✅ | ⬜ pending |
| 13-01-02 | 01 | 1 | ENR-10 | backend repository/service unit | `cd backend && go test ./internal/repository ./internal/services -run "Test.*Relation|TestAnimeCreateEnrichment" -count=1` | ✅ | ⬜ pending |
| 13-02-01 | 02 | 2 | ENR-05 | frontend helper/controller regression | `cd frontend && npm test -- src/app/admin/anime/create/useAdminAnimeCreateController.test.ts src/app/admin/anime/create/page.test.tsx` | ⚠️ W0 | ⬜ pending |
| 13-02-02 | 02 | 2 | ENR-10 | backend create follow-through regression | `cd backend && go test ./internal/handlers ./internal/repository -run "Test.*AniSearch.*Relation|TestCreateAnime" -count=1` | ⚠️ W0 | ⬜ pending |
| 13-03-01 | 03 | 3 | ENR-05, ENR-10 | browser UAT + helper regression | `cd frontend && npm test -- src/app/admin/anime/create/page.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky/W0*

---

## Wave 0 Requirements

- [ ] Create-save seam regression proving AniSearch relations survive from loaded draft into final `createAdminAnime(...)` payload
- [ ] Backend handler/repository regression proving create follow-through writes rows to `anime_relations` when `relations` are present
- [ ] Summary/warning regression proving operator feedback matches attempted/applied/skipped relation outcomes

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AniSearch load -> create save -> persisted relation visible on the created anime | ENR-05, ENR-10 | Needs real browser flow and live DB-backed create/save behavior | Load a valid AniSearch ID with known resolvable relations on `/admin/anime/create`, save the anime, then open the created anime and verify the relation exists in the persisted relation list or backend state. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
