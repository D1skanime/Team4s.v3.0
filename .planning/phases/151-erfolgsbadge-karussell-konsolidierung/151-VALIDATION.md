---
phase: 151
slug: erfolgsbadge-karussell-konsolidierung
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-07
---

# Phase 151 — Validation Strategy

## Existing infrastructure
Vitest 3 / Testing Library / axe in `frontend/vitest.config.ts`; Go testing and guarded PostgreSQL fixtures; plain Playwright 1.55/Chromium inside Linux Compose frontend. No pixel-baseline runner exists. Reuse screenshot capture plus structural assertions and mandatory manual per-artwork review, not fragile golden pixels. No dependency/tool/runtime changes.

## Feedback sampling
- After artwork tasks: resolver tests plus filesystem/catalog completeness with a negative missing-role/missing-file proof.
- After shared slot/card tasks: artwork/chain tests; inspect actual Linux browser geometry, embedded narrow containers and threshold boundaries.
- After carousel tasks: `FocalCarousel.test.tsx`, active/inert, pointer/wheel/keyboard, reduced motion and stress coverage.
- After integration: full frontend suite (baseline 2225 pass), scoped lint, full lint/typecheck with recorded pre-existing exceptions, feasible production build and `git diff --check`.
- Backend: `go test ./internal/badges/...`, generic Karaoke code test, guarded Phase131 constant-query and Phase150 exact-once PostgreSQL tests. Preserve backend source and query count20.
- Target quick feedback <90s, no watch mode; rerun broad checks after relevant changes/failures, not automatically after unchanged documentation.

## Requirements to verification
| Requirement | Evidence |
|---|---|
| P151-01 | Completed research/patterns and clean Git/Compose baseline |
| P151-02 | Phase150 threshold tests, source diff review, same badge progress payload and exact-once PostgreSQL test |
| P151-03/04 | Shared slot tests, original 107-asset SHA256 equality, actual dimensions/contain/HiDPI and responsive browser screenshots |
| P151-05 | Carousel unit/axe tests plus live Linux pointer, wheel, keyboard, reduced motion, rapid navigation, active/neighbor geometry |
| P151-06/07 | All12 current catalog roles resolve five badge stages; explicit artwork manifest, real-file tests, missing-role/file negative proof |
| P151-08 | Measured fixed20-query test before/after, no backend diff or card API requests, 100/200-item browser stress |
| P151-09/10 | Focused and full frontend results; backend results separately; scoped lint, baseline comparison, build/diff hygiene |
| P151-11 | Reproducible complete gallery/capture manifest, all current resolved art and all source files reviewed individually; screenshot artifact paths and per-row sign-off |
| P151-12 | Plan/UI review, wave summaries, gap closure, independent final verification, clean main commit/push |

## Manual visual review
For every artwork code: sharpness, optical centering, padding, crop, aspect ratio, title, card height, active/inactive state, carousel appearance, relative weight. Source inventory review already covered all107 initial PNGs but does not replace production-composition acceptance. All six requested viewport classes must pass (320,520,768,1024,1440,1920/2560), plus390, exact container boundaries, narrow embed at wide viewport, and zoom/reflow. All browser execution is Linux-only per user; Windows only displays Linux evidence and links for user review.

## Wave0 / finalization
Existing tools suffice. Planned gallery/capture and component tests are implementation deliverables mapped below. Do not set `nyquist_compliant` or mark visual completion until all required automated gates and per-artwork review actually pass. Existing unrelated typecheck/lint failures are explicitly recorded in `151-BASELINE-CHECKS.md`; do not hide them or refactor unrelated files to clear them.

## Plan/task verification map

| Wave | Task | Owned proof | Fast automated gate | Final evidence |
|---:|---|---|---|---|
| 1 | 151-01-01 | six additive Karaoke RGBA PNGs generated only with built-in Linux `image_gen.imagegen` | file/RGBA/count plus original107 SHA256 equality; resolver gate follows in151-01-02 | Entry + motif + four frames; original paths untouched |
| 1 | 151-01-02 | `badgeArtwork.test.ts` live catalog + real filesystem matrix, missing-role and missing-file negative proofs | focused resolver Vitest in Compose | all 12 catalog roles x five stages; Timer declared direct; no icon-key gate |
| 1 | 151-02-01 | `AchievementArtwork.test.tsx` direct/layered/portrait slot contract | artwork + ResponsiveImage Vitest | 192/216/240 hero, 64/80 marker, 8px inset, minmax/zero minima |
| 1 | 151-02-02 | `MemberBadgeChain.test.tsx` productive migration, reset, full-mount and render-count coverage | chain/labels Vitest | dead FamilyCollectionCard engine absent; stable exported card composition |
| 2 | 151-04-01 | CSS ownership/source contract | artwork + chain Vitest and scoped ESLint | 561/562/657/658 boundaries, equal active/inactive heights, no FocalCarousel override |
| 1 | 151-03-01 | focused RED regressions in `FocalCarousel.test.tsx` | carousel Vitest/axe | manual scroll, interruption, rapid nav, nested direct ownership, reduced motion |
| 1 | 151-03-02 | minimal carousel fix and 100/200-item render/request budget | carousel Vitest/axe + scoped ESLint | 210ms adjacent/120ms settle, mounted/inert/a11y preserved |
| 3 | 151-05-01 | `AchievementBadgeShowcase.test.tsx` and linked `/dev/ui-system/achievements` | gallery + production-component Vitest | all role/non-role/source compositions and stable collector markers |
| 3 | 151-05-02 | `capture-phase151-badge-evidence.mjs`, JSON manifests, contact sheets/crops | plain Playwright collector | eight widths, boundaries/embed/zoom/input/motion/perf, image-inside-slot bounds, 107 SHA256 rows |
| 3 | 151-05-03 | full gate logs + `ARTWORK-SIGNOFF.md` | full frontend/backend suites, baseline comparisons, isolated Compose build, `git diff --check` | coordinator signs every row; gaps return to owner and affected checks rerun |

Wave 1 plans have zero file overlap and consume only stable existing public signatures; the coordinator performs sequential Git index/commit operations. Wave2 contains CSS Plan04 after Plan02. Wave3 integration Plan05 depends on all four summaries. `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/checks/check-postgres.py` is the approved guarded procedure for the two schema-only scratch-database tests; scratch names use one alphanumeric suffix, the public-profile budget must remain exactly 20, and backend production files remain unchanged.

After 151-05 completes, an independent verifier—not the plan executor—must check requirements and evidence before the coordinator commits and pushes. Status stays `draft`, `nyquist_compliant: false`, and `wave_0_complete: false` until execution and manual signoff actually pass.
