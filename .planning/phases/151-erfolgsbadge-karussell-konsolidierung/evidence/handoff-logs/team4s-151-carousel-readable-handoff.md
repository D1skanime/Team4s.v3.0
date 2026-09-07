# Phase 151 readable carousel split handoff

Status: complete

## Seam

- `FocalCarousel.tsx` retains all state, motion, drag, settle, geometry, cancellation, and focus ownership.
- The collapsed JSX composition moved to private `CollapsedCarousel` beside `ExpandedCarousel` in `FocalCarouselInternals.tsx`.
- A typed `CollapsedTrackHandlers` bundle wires the existing engine handlers without duplicating carousel or motion logic.
- `DirectCarouselItem` and `CarouselArrow` are now private to the presenter module.
- Fresh fixes were preserved: pointer-down suppression reset, pointer-cancel suppression clear, and `ownedItemClickHandler` native-inert coordinate routing.

## Validation

- Cached Docker Prettier 3.9.6 (`singleQuote=true`, `semi=false`, `printWidth=100`): PASS.
- `FocalCarousel.test.tsx`: 39/39 PASS. Existing manual-scroll/wheel React `act(...)` warnings remain.
- Existing consumers (`FansubProjectsGrid`, `MemberBadgeChain`, `AchievementBadgeShowcase`): 105/105 PASS.
- Scoped ESLint on both production modules plus `FocalCarousel.test.tsx`, `--max-warnings=0`: PASS (0 warnings/errors).
- Native Chromium 100-item probe: PASS; 100 mounted before/after, pointer drag settled logical/physical at index 1, collapse restored index/center (`0.296875px` delta) and expand-button focus.
- `git diff --check` on owned files: PASS.
- Readable physical line counts: `FocalCarousel.tsx` 404; `FocalCarouselInternals.tsx` 443.

No CSS, tests, collector scripts, shared artwork, docs, Git/index, runtime configuration, environment, media, or database state was changed.
