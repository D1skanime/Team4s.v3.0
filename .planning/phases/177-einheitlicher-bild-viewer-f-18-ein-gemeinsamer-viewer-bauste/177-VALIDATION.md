---
phase: 177
slug: einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-10-08
---

# Phase 177 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3 (frontend, `frontend/vitest.config.ts`); Go `testing` + `testify` (backend) |
| **Config file** | `frontend/vitest.config.ts` (frontend); standard `go test`, no central config (backend) |
| **Quick run command** | `cd frontend && npx vitest run <changed-file>.test.ts` / `cd backend && go test ./internal/repository/... -run <TestName>` |
| **Full suite command** | `cd frontend && npm test` (= `vitest run`); `cd backend && go test ./...` |
| **Estimated runtime** | ~30-60s per scoped run; full suite varies with repo size |

---

## Sampling Rate

- **After every task commit:** Run the scoped quick command for the file(s) touched.
- **After every plan wave:** Run the full suite (frontend `npm test` + backend `go test ./...`).
- **Before `/gsd:verify-work`:** Full suite must be green, plus the mandatory Live-UAT (D-14 in `177-CONTEXT.md`) since this phase has public-facing UI surfaces.
- **Max feedback latency:** 60 seconds for scoped runs.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD-01 | TBD | 0 | D-01/D-03 | — | Wrap-around navigation index math is correct for first/last/middle index | unit (pure function) | `npx vitest run src/components/fansubs/<nav-logic>.test.ts` | ❌ Wave 0 | ⬜ pending |
| TBD-02 | TBD | 0 | D-02 | — | Prefetch triggers for neighbor indices only, not out-of-range | unit (pure function + mocked `window.Image`) | `npx vitest run src/components/fansubs/<prefetch-logic>.test.ts` | ❌ Wave 0 | ⬜ pending |
| TBD-03 | TBD | 0 | D-03 | — | Zoom toggle state transitions correctly (off→100%→off) | unit (pure reducer/state function) | `npx vitest run src/components/fansubs/<zoom-logic>.test.ts` | ❌ Wave 0 | ⬜ pending |
| TBD-04 | TBD | 0 | D-03 | — | Display→Original swap-on-load selects correct URL given load state | unit (pure function) | `npx vitest run src/components/fansubs/<progressive-load-logic>.test.ts` | ❌ Wave 0 | ⬜ pending |
| TBD-05 | TBD | 1-2 | D-19 | T-177-01 | Non-public / non-approved / soft-deleted media excluded from each touched consumer's query at the repository layer (SQL predicate), not just hidden in the UI | integration (Go repository test) | `go test ./internal/repository/... -run TestListMedia` (or equivalent per touched repository) | Partial — existing visibility tests exist for `FansubRepository`/`ReleaseDetailPublicRepository`; extension needed if `ProjectMemberPublicRepository.ListMedia` gains a new join | ⬜ pending |
| TBD-06 | TBD | TBD | D-04/D-05 | — | `ScreenshotGallery` repointed to the working `getGroupReleaseImages` endpoint; correct data/args flow through data-fetching logic | logic test against mocked API (not render/click simulation — assert on returned view-model/derived state per D-13) | TBD — design during planning | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Exact Task IDs and Plan IDs are filled in once the planner assigns them — this table is a contract for what must be covered, not a final numbering.*

---

## Wave 0 Requirements

- [ ] Extract pure-logic files (navigation index math, zoom toggle state, prefetch trigger, progressive-load URL selection) as standalone, directly-testable units — none of these exist as separable functions yet. Required before D-13-compliant tests can be written (D-13: no render/click-simulation tests).
- [ ] Decide the test strategy for `ScreenshotGallery`'s data-source repointing (D-04/D-05) — the one behavior in this phase that is fundamentally "does the right API get called, does the right data flow through." Plan must specify: test the data-fetching/transform logic as a standalone function/hook; leave pixel-level rendering to Live-UAT.
- [ ] Explicitly plan the rewrite (not mere extension) of `FansubMediaLightbox.test.tsx` and `ProjectMemberMediaViewer.test.tsx` — their current `render()`+`fireEvent` pattern conflicts with D-13 once logic moves into extracted pure functions.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|--------------------|
| Full visual viewer experience (dark stage, zoom-on-click, swipe gesture feel, progressive image load perceived smoothness, metadata overlay layout) across all 5 live consumer surfaces | D-14 | Visual/UX quality and touch-gesture feel cannot be asserted by unit tests; project rule mandates Live-UAT for UI acceptance | Open each of the 5 consumer surfaces (public release gallery, fansub group media block, episode screenshots, project member media, group assets) over the configured tunnel (`http://127.0.0.1:3300`); verify zoom, swipe, keyboard nav, wrap-around, metadata overlay content per consumer, and that only "X" closes the modal |
| `GroupAssetsExperience` Jellyfin-sourced images have no visibility/review-state row to filter — confirm current behavior is intentional, not a silent gap (Open Question 1 from `177-RESEARCH.md`) | D-19 | Requires a product decision on whether Jellyfin-sourced images need their own access boundary; not resolvable by an automated assertion alone | Confirm with user during planning whether Jellyfin-backed group asset images need any visibility gating, or are correctly unrestricted by design |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (pure-logic extraction files, ScreenshotGallery test strategy, lightbox test rewrites)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** 2026-10-09 (verified via plan-checker: 0 blockers)
