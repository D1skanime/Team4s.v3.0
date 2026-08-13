---
phase: 30
slug: fansub-releases-api-endpunkte
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-30
---

# Phase 30 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `go test`, `npm.cmd run build`, `npx tsc --noEmit` |
| **Config file** | `backend/go.mod`, `frontend/package.json`, `frontend/tsconfig.json` |
| **Quick run command** | `cd backend && go test ./internal/handlers ./internal/repository -count=1` |
| **Full suite command** | `cd backend && go test ./... && cd ..\\frontend && npm.cmd run build && npx tsc --noEmit` |
| **Estimated runtime** | ~120 seconds |

## Sampling Rate

- After every backend route/repository task: `cd backend && go test ./internal/handlers ./internal/repository -count=1`
- After every frontend integration task: `cd frontend && npx tsc --noEmit`
- After every plan wave touching the UI: `cd frontend && npm.cmd run build`
- Before `$gsd-verify-work`: full suite must be green
- Max feedback latency: 120 seconds

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-01-01 | 01 | 1 | P30-SC1 | repository | `cd backend && go test ./internal/repository -count=1` | yes | pending |
| 30-01-02 | 01 | 1 | P30-SC2 | handler | `cd backend && go test ./internal/handlers -count=1` | yes | pending |
| 30-02-01 | 02 | 2 | P30-SC3 | frontend types | `cd frontend && npx tsc --noEmit` | yes | pending |
| 30-02-02 | 02 | 2 | P30-SC4 | frontend build | `cd frontend && npm.cmd run build` | yes | pending |
| 30-03-01 | 03 | 3 | P30-SC5 | docs/boundary | `cd backend && go test ./internal/handlers ./internal/repository -count=1` | yes | pending |

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Explicit release discovery on fansub edit | P30-SC1, P30-SC4 | operator sees context load and empty states | Open `/admin/fansubs/:id/edit`, load the theme-assets area for one anime, and confirm the UI resolves release context from the explicit release endpoint before asset actions occur. |
| No-release state behaves honestly | P30-SC1, P30-SC5 | depends on real scoped data absence | Open a fansub-anime pair without a canonical release anchor and confirm the UI/API reports a clear missing-release state instead of pretending theme assets are just empty. |
| Theme-asset continuity after release API adoption | P30-SC3, P30-SC4 | requires upload/list/delete round-trip | Upload one release theme asset, reload the page, verify it still lists, then delete it and confirm the release context remains available throughout. |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
