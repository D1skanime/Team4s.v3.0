# Phase 151 Final Code Review

Status: **review findings recorded below; coordinator closures appended. Phase 151 is paused: all six Karaoke sources now exist; final visual evidence and independent phase verification remain incomplete.**

Scope: final production integration for the shared achievement-artwork slot, family CSS, artwork manifest/coverage, `FocalCarousel`, and the dev achievement-gallery fixtures. Collector-script changes were excluded because they are still owned by another worker.

## Findings

### MEDIUM — Reduced motion removes the visible active-slide distinction

- **File/line:** `frontend/src/components/ui/FocalCarousel.module.css:195-204`
- **Reproduction:** In native Chromium with `prefers-reduced-motion: reduce`, the active and first two inactive items in the 100-item gallery carousel all computed to `opacity: 1` and `filter: none`; only the inactive DOM nodes retained `inert`. The inactive card therefore has no generic visible selection cue even though `aria-current` advances.
- **Rationale:** Reduced motion should remove transitions, not the final active/inactive state. At a middle index, neither inertness nor `aria-current` is visually available, so the carousel contract's clear active card is lost for users who request reduced motion.
- **Action:** Keep `transition: none`, but do not override inactive opacity/filter in the reduced-motion block. Add a computed-style or browser regression proving active and inactive slides remain visually distinct while navigation settles immediately.

### LOW — `pointercancel` leaves the next genuine carousel click suppressed

- **File/line:** `frontend/src/components/ui/FocalCarousel.tsx:283-340,391`; `frontend/src/components/ui/FocalCarouselInternals.tsx:213-218`
- **Reproduction:** In native Chromium, dispatch a horizontal touch drag followed by `pointercancel`, then click the visible inactive neighbor. Active item remains `1`; clicking the same point again advances to item `2`. The horizontal move sets `suppressClickRef.current = true`, but cancellation produces no compatibility click to consume and clear it.
- **Rationale:** A browser/system-cancelled gesture causes the next deliberate selection click to be discarded. Existing pointer-cancel coverage checks animation/class cleanup but not suppression cleanup.
- **Action:** Clear click suppression on `pointercancel` (while preserving normal drag-release suppression), and add a cancellation-then-neighbor-click regression.

### LOW — Container-sized artwork advertises viewport-sized image candidates

- **File/line:** `frontend/src/components/profile/AchievementArtwork.tsx:20-21`; `frontend/src/components/profile/AchievementArtwork.module.css:114-130`
- **Reproduction:** At a 1440 px viewport and DPR 2, the gallery's 390 px container probe renders a `192 x 192` hero slot, but its `sizes` attribute evaluates to `240px`; Chromium selected a Next image candidate with `w=512` instead of the 192 px slot's expected DPR-2 candidate. Layered artwork repeats the mismatch for motif and frame.
- **Rationale:** HTML `sizes` media conditions are viewport-based, while the slot geometry is container-based. Embedded narrow cards therefore over-fetch and the implementation does not satisfy the UI contract that image hints match 192/216/240 geometry.
- **Action:** Introduce a documented container-aware candidate strategy and cover the wide-viewport/narrow-container DPR case. Do not add per-badge API/file probes or a second artwork path.

### LOW — The 450-line target is met through line packing, not a readable split

- **File/line:** `frontend/src/components/ui/FocalCarousel.tsx:19-22,72`; `frontend/src/components/ui/FocalCarouselInternals.tsx:178-182`; `frontend/src/components/profile/badgeArtwork.ts:1-11`
- **Reproduction/rationale:** `FocalCarousel.tsx` is exactly 450 physical lines, while imports, the complete drag-state initializer, prop destructuring, and artwork maps are packed into dense lines. This satisfies the numeric ceiling but not the explicit “readable production lines; no line golfing” acceptance constraint, and makes the interaction lifecycle harder to audit.
- **Action:** Reformat normally and extract one cohesive private lifecycle/helper seam so each production module remains at or below 450 lines without compressed declarations. Do not change public props or create a second carousel engine.

## Prior carousel findings rechecked

All three findings in `151-INTEGRATION-REVIEW.md` are fixed at their intended ownership seams:

- Inactive descendants remain native `inert`; track-level coordinate selection uses direct owned items only.
- Expansion cancels timers/measurement/programmatic RAF work; collapse remount immediately restores the active physical center before focus restoration.
- A shrinking visible set synchronizes the active state/ref, cancels obsolete motion, recenters, and accepts the first Previous command.

The supplied Chromium evidence in `/tmp/team4s-phase151-carousel-review` supports inert exclusion, direct selection, expansion cancellation, collapse geometry/focus, full mount, and bounded render/request counts. A narrow additional Chromium probe found no trailing 120 ms settle after the final adjacent-animation scroll write.

## Authority and integration checks

- `badgeArtwork.ts` contains presentation strategy and deterministic filename grammar only. It has no thresholds, catalog labels, icon-key gating, runtime file probing, legacy lookup, or request seam.
- Every current role must have an explicit strategy; the Compose-only coverage test obtains the boundary through the existing `listRoleDefinitions('anime_contribution')` helper and builds available paths from the real public directory. Synthetic-role and removed-file negative cases fail closed.
- Timer remains the sole `direct-volume` role; Karaoke-FX follows the ordinary layered path with no rendering special case.
- Production family progress continues to consume server-provided `badge_progress[].stages`; no Phase 150 backend/contract/auth ownership was added or replaced.
- The dev gallery's role/threshold lists are explicitly static server-shaped fixtures under the dev route. Production components remain their render targets, the raw inventory reads one fixed server-side directory, and no API/auth/business-catalog seam was added.
- Shared hero/stage dimensions are owned by `AchievementArtwork.module.css`; reviewed family CSS contains no competing hero dimensions, active scaling, or profile override of carousel snap/scroll behavior.

## Known blockers and remaining QA

These are not new findings and are not waived:

- The three known Karaoke files are still absent: `role_entry_karaoke_fx.png`, `role-karaoke_fx-motif.png`, and `rank-frame-karaoke_fx-bronze.png`. The directory currently has 110 PNGs, so the real-filesystem coverage gate deliberately remains RED.
- Exhaustive live artwork/viewport signoff cannot be claimed while those assets and the resulting evidence rows are incomplete. This review makes no subjective all-art visual PASS claim.
- The collector worker's in-flight changes were not reviewed as final.

## Review probes

- Read-only source/module relationship inspection; no full build, lint, typecheck, or test matrix rerun.
- Narrow native Chromium probes against `/dev/ui-system/achievements` for animation-end settle state, cancelled-drag click suppression, reduced-motion computed active/inactive styles, and DPR-2 embedded-slot image selection.
- No Git/index/commit/push, install, configuration, runtime-data, environment, media, or database mutation was performed.

## Coordinator closure after this independent review

- Reduced motion: retained static inactive opacity/filter while disabling transitions. Actual Chromium computes active opacity1/inactive0.72 and0s transitions under reduced motion.
- Cancellation: new pointer gestures reset suppression; pointercancel clears it.39 carousel tests now pass, including missing-compatibility-click regressions. Initial unit fixture needed real pointer coordinates/rectangles; the independent browser RED, rather than that faulty first fixture, is the valid reproduction. Native CDP touchCancel followed by the first real mouse click advances0→1 in normal and reduced motion.
- Image hints: native lazy auto sizes now use the actual container image box; eager priority keeps a conservative fallback.100 shared-artwork/chain/image-transport tests pass. Native1440/DPR2 confirms176/48px density-corrected image widths. The existing configured candidate ladder jumps256→512, so the review's512w hero observation is not itself excessive:512 is the smallest adequate candidate for352 physical pixels. Browser cache reuse may also retain a larger already-loaded candidate; quality and the exact advertised layout size are enforced rather than requiring an extra download. The cold-cache marker probe selected96w instead of160w.
- Readability: the existing engine remains in FocalCarousel.tsx; private collapsed/expanded presenters live in FocalCarouselInternals.tsx. Normal Prettier formatting yields404/443 lines.39 carousel +105 consumer tests, scoped lint and native collapse/drag/stress proof pass. badgeArtwork.ts is normally formatted at154 lines.

Reproducible native proof: checks/check-native-touch.cjs; result in evidence/after/native-touch/result.json. This coordinator follow-up is distinguished from the independent review above and does not waive the missing Entry/motif/Bronze artwork or final all-art signoff.
