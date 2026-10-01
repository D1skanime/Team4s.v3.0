---
phase: 172
slug: kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-01
---

# Phase 172 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Go `testing` + `testify` (backend); Vitest 3 (frontend) |
| **Config file** | none centrally required for Go (`go test ./...`); `frontend/vitest.config.ts` for frontend |
| **Quick run command** | `cd backend && go test ./internal/handlers/... ./internal/services/... ./internal/repository/... -run TestSegmentPreview` |
| **Full suite command** | `cd backend && go test ./...` and `cd frontend && npm test` |
| **Estimated runtime** | ~60-90 seconds (full suite, both stacks) |

---

## Sampling Rate

- **After every task commit:** Run `go test ./internal/handlers/... ./internal/services/... -run TestSegment` (or equivalent focused Vitest run for frontend tasks)
- **After every plan wave:** Run `go test ./...` (backend) + `npm test` (frontend)
- **Before `/gsd:verify-work`:** Full suite must be green, plus live UAT on Release 27 (Desktop + Mobile) via `http://127.0.0.1:3300` per CONTEXT.md Acceptance section
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD-01 | TBD | 0 | D-04/D-06 | — | Render success still produces auto-preview; extraction failure does not fail render | unit | `go test ./internal/handlers/... -run TestExecuteSegmentRender_AutoPreview` | ❌ W0 | ⬜ pending |
| TBD-02 | TBD | 0 | D-05 | — | Upload path extracts frame at ~35%, not 0% | unit | `go test ./internal/services/... -run TestSaveSegmentVideoPreview_Offset` | ❌ W0 | ⬜ pending |
| TBD-03 | TBD | 1 | D-03 | T-172-01 | Manual preview immediately public (no review) | unit/integration | `go test ./internal/handlers/... -run TestUploadSegmentPreviewImage_NoReview` | ❌ W0 | ⬜ pending |
| TBD-04 | TBD | 1 | D-08 | — | New render never overwrites manual choice | unit | `go test ./internal/handlers/... -run TestExecuteSegmentRender_PreservesManualPreview` | ❌ W0 | ⬜ pending |
| TBD-05 | TBD | 1 | D-09 | — | Admin list, admin single, public detail return identical `preview_url` for same segment | integration | `go test ./internal/repository/... -run TestPreviewURL_ConsistentAcrossReadPaths` | ❌ W0 | ⬜ pending |
| TBD-06 | TBD | 1 | D-11 | T-172-02 | Picker rejects images from non-assigned release versions (404/403) | unit | `go test ./internal/handlers/... -run TestAttachSegmentPreviewImage_OwnershipGate` | ❌ W0 | ⬜ pending |
| TBD-07 | TBD | 1 | Permission gate | T-172-03 | No segment-manage right → 403, no upload UI | unit + component | `go test ./internal/handlers/... -run TestSegmentPreviewImage_RequireSegmentManage` | ❌ W0 | ⬜ pending |
| TBD-08 | TBD | 2 | D-13 | — | Backfill is idempotent (running twice produces no duplicate assets) | unit/integration | `go test ./cmd/migrate-preview-backfill/... -run TestBackfill_Idempotent` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are placeholders — the planner assigns real `{plan}-{task}` IDs; update this table to match once PLAN.md files exist.*

---

## Wave 0 Requirements

- [ ] Fake `segmentStreamThemeRepository` test harness for `executeSegmentRender` — no existing test currently covers its success path (verify at plan time: `grep -rl "executeSegmentRender" backend/internal/handlers/*_test.go`)
- [ ] Fixture video (or stub `ffmpegPath` writing a known-size dummy frame) for `saveSegmentVideoPreview` offset tests — no existing test covers this function
- [ ] New `admin_content_anime_theme_segments_preview_test.go` from scratch, following the `httptest` + fake-repo pattern used by `admin_content_release_theme_assets_test.go`
- [ ] Extract `cmd/migrate-preview-backfill` core logic into a testable package function (not left entirely inside `main()`), mirroring the gap in `cmd/migrate-covers/main.go`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| End-to-end preview display on Release 27 (Segmente 7, 8, 9) across Admin-Media-Liste and Public-Release-Story | CONTEXT.md Acceptance | Visual/cross-surface consistency and real ffmpeg frame quality cannot be fully asserted by unit tests | Open `http://127.0.0.1:3300`, navigate to Release 27 admin + public views on Desktop and Mobile widths, confirm identical preview images per segment |
| Segment-Panel "Vorschaubild" section matches UI-SPEC (badges, dropzone, picker, inline success/error) | UI-SPEC.md | Visual fidelity to design tokens/primitives requires human eyes | Open Segment-Tab for a segment with a finished render, verify badge states (Manuell/Automatisch/Standardbild), exercise upload/picker/reset actions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
