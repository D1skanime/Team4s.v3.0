---
phase: 29
slug: fansub-group-model-normalization-and-generic-links
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-29
---

# Phase 29 - Validation Strategy

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

- After every task commit: `cd backend && go test ./internal/handlers ./internal/repository -count=1`
- After every plan wave: `cd frontend && npm.cmd run build` plus `cd frontend && npx tsc --noEmit`
- Before `$gsd-verify-work`: full suite must be green
- Max feedback latency: 120 seconds

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | P29-SC1 | repository | `cd backend && go test ./internal/repository -count=1` | ✅ | ⬜ pending |
| 29-01-02 | 01 | 1 | P29-SC2 | handler | `cd backend && go test ./internal/handlers -count=1` | ✅ | ⬜ pending |
| 29-02-01 | 02 | 2 | P29-SC4 | frontend | `cd frontend && npm.cmd run build` | ✅ | ⬜ pending |
| 29-02-02 | 02 | 2 | P29-SC3 | integration | `cd backend && go test ./internal/handlers ./internal/repository -count=1` | ✅ | ⬜ pending |
| 29-03-01 | 03 | 3 | P29-SC5 | migration/docs | `cd backend && go test ./internal/repository -count=1` | ✅ | ⬜ pending |

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Generic link rows round-trip through create/edit | P29-SC2, P29-SC4 | operator workflow and form behavior are primarily UI-level | Create or edit a fansub, add `website`, `discord`, and one extra type such as `github` or `twitter`, save, reload, and confirm all links render with the correct type and URL. |
| Collaboration member administration works explicitly | P29-SC3 | requires seeing member-group state in the admin surface | Open a collaboration fansub, add one member group, remove one member group, save or apply changes, and confirm the resulting collaboration-member list matches the backend state. |
| Cleanup boundary does not regress existing fansub pages | P29-SC5 | compatibility-only fields may still shadow real behavior | Verify one existing normal group and one collaboration group after cleanup changes; confirm profile data, aliases, media, and current links still load correctly. |

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
