---
phase: 27
slug: segment-library-identity-and-reuse
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-28
---

# Phase 27 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `go test`, `npm.cmd run build` |
| **Config file** | `backend/go.mod`, `frontend/package.json` |
| **Quick run command** | `cd backend && go test ./internal/repository ./internal/handlers -count=1` |
| **Full suite command** | `cd backend && go test ./... && cd ..\\frontend && npm.cmd run build` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && go test ./internal/repository ./internal/handlers -count=1`
- **After every plan wave:** Run `cd backend && go test ./... && cd ..\\frontend && npm.cmd run build`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | P27-SC1 | repository | `cd backend && go test ./internal/repository -count=1` | ✅ | ⬜ pending |
| 27-01-02 | 01 | 1 | P27-SC4 | repository | `cd backend && go test ./internal/repository -count=1` | ✅ | ⬜ pending |
| 27-02-01 | 02 | 2 | P27-SC2 | handler | `cd backend && go test ./internal/handlers -count=1` | ✅ | ⬜ pending |
| 27-02-02 | 02 | 2 | P27-SC3 | integration | `cd backend && go test ./... -count=1` | ✅ | ⬜ pending |
| 27-03-01 | 03 | 3 | P27-SC5 | frontend | `cd frontend && npm.cmd run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Delete anime, recreate same AniSearch identity, then reuse existing segment asset | P27-SC3 | requires live DB/media state transitions across multiple admin routes | Upload or reuse one OP asset, delete the local anime, recreate/import the anime with the same AniSearch ID, open the segment editor, and confirm the prior OP/ED definition is offered for reuse or already reattached. |
| Distinguish "new upload" vs "reused library asset" in the editor | P27-SC5 | operator clarity is primarily UX-level | On `/admin/episode-versions/:id/edit`, confirm the segment source UI labels provenance clearly and does not look identical for fresh upload vs library reuse. |
| Anime delete detaches reusable data without silent loss | P27-SC4 | DB and file cleanup behavior must be judged together | Before delete, capture segment-definition/media rows; after delete, confirm local anime links are gone while reusable library data persists until explicitly cleaned. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
