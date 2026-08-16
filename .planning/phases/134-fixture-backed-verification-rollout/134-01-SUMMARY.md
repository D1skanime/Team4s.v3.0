---
phase: 134-fixture-backed-verification-rollout
plan: 01
subsystem: testing
tags: [node, fetch, formdata, tiptap, media-assets, fixture-manifest, postgres]

# Dependency graph
requires:
  - phase: 129-canonical-public-projections-data-correctness
    provides: scripts/seed-member-profile-fixtures.mjs (the idempotent API-driven seed this plan extends in place)
provides:
  - "scripts/seed-member-profile-fixtures.mjs Step 11: idempotent member-owned story-image seeding via POST /me/profile/story-images + PUT /me/profile"
  - "scripts/member-profile-fixture.manifest.json: versioned (manifest_version 1), machine-readable single source of truth for PMQA-02's eight fact categories per reference profile"
  - "scripts/README-manifest.md: manifest schema + the real /media/profile/... story-image src pattern"
  - "scripts/fixtures/seed134-story.jpg: tracked 320-byte deterministic JPEG fixture"
affects: [134-03-verification-matrix, 134-05-reset-script, 134-06-live-uat]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Manifest-as-single-source: seed script readFileSync + JSON.parse's a checked-in JSON manifest at startup and reads scenario constants FROM it, failing loudly on malformed/missing fields, instead of maintaining independently-authored duplicate constants"
    - "Idempotent media upload: GET-then-check-existing-image-node before POST upload, reusing media_asset_id on every re-run (required, not optional, because the backend's cleanup-on-save lifecycle deletes any previously-referenced image dropped from a new PUT)"

key-files:
  created:
    - scripts/member-profile-fixture.manifest.json
    - scripts/README-manifest.md
    - scripts/fixtures/seed134-story.jpg
  modified:
    - scripts/seed-member-profile-fixtures.mjs
    - scripts/README-seed.md

key-decisions:
  - "Story-image src substring corrected from the plan's assumed /media/story-images/ to the actual /media/profile/ pattern the TipTap sanitizer allows (see Deviations)"
  - "CONFIRMED_ANIME_COUNT moved out of the seed script into the manifest (manifest.profiles['csubs-leader'].projects.confirmed_distinct_anime_min); GROUP_A/GROUP_B kept as seed-mechanics constants since they aren't part of PMQA-02's documented fields"

patterns-established:
  - "Manifest-driven seed assertions: check(...) calls read expected values from the manifest object, not local literals, so editing the manifest is the only way to change what the seed asserts"

requirements-completed: [PMQA-01, PMQA-02]

# Metrics
duration: 35min
completed: 2026-08-16
---

# Phase 134 Plan 01: Fixture Contract Extension Summary

**Extended the Phase-129 seed with an idempotent member-owned story-image upload step and introduced a versioned JSON manifest that the seed now reads its scenario constants from, closing both of RESEARCH.md's identified gaps (zero media_assets rows, no single-source manifest).**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-08-16T13:35:00Z (approx.)
- **Completed:** 2026-08-16T14:10:38Z
- **Tasks:** 2
- **Files modified:** 5 (2 created new content files, 1 new binary fixture, 2 existing docs/script updated)

## Accomplishments
- `scripts/seed-member-profile-fixtures.mjs` now seeds one real `media_assets` row per reference profile (csubs-leader, sheppert) via the already-productionized `POST /api/v1/me/profile/story-images` endpoint, referenced through `PUT /me/profile`'s `member_story_json` — verified live: exactly 2 `media_assets` rows exist after two consecutive seed runs, no duplicates.
- `scripts/member-profile-fixture.manifest.json` is now the single, versioned, checked-in source of truth for PMQA-02's eight fact categories (identity, visibility, profile_status, roles, memberships, projects, badges, media, content_lengths) per reference profile — the seed script reads `CONFIRMED_ANIME_COUNT` and the story-image assertion substring from it instead of maintaining independent hardcoded constants.
- Both tasks' exact `<verify>` automated commands were run against the live shared Docker Compose stack and passed: manifest parses with both required profile keys, and the seed script printed `RESULT: PASS` (15/15 checks) on two consecutive runs.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the idempotent media-seeding step + media assertions to the seed script** - `65aa0271` (feat)
2. **Task 2: Extract the single-source manifest and make the seed read expectations from it** - `0b192c22` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `scripts/seed-member-profile-fixtures.mjs` - Added Step 11 (idempotent story-image upload + reference), `findFirstStoryImageID`/`ensureStoryImage` helpers, two new manifest-driven `check(...)` assertions, manifest readFileSync/JSON.parse + fail-loud validation at startup, `CONFIRMED_ANIME_COUNT` now sourced from the manifest
- `scripts/member-profile-fixture.manifest.json` - New: `manifest_version: 1`, `profiles.sheppert` / `profiles["csubs-leader"]` with all eight PMQA-02 fact categories
- `scripts/README-manifest.md` - New: schema/field reference table, "Story-image URL shape" note explaining `/media/profile/...` vs. `/media/story-images/:id`, how to validate
- `scripts/fixtures/seed134-story.jpg` - New: 320-byte deterministic JPEG (128x128 solid color) generated via `ffmpeg -f lavfi -i color=...` inside `team4sv30-backend`, magic bytes `FF D8 FF` confirmed
- `scripts/README-seed.md` - Documented the new media step, the fixture image, the manifest dependency, and the same URL-shape correction

## Decisions Made
- **Story-image `src` substring corrected to `/media/profile/`, not the plan's assumed `/media/story-images/`.** Verified by reading `backend/internal/services/tiptap_service.go`'s `newTipTapSanitizerPolicy()`: the `src` attribute is allowed only via regex `^/media/profile/\d+/story/[a-z0-9-]+/original\.(jpg|jpeg|png|webp)$`. `GET /api/v1/media/story-images/:id` is a distinct resolve-by-ID endpoint used only for editor-side image preview before save — it is never the value embedded in saved/rendered `member_story_html`. Confirmed live: actual rendered `src` was `/media/profile/1/story/34d22c5f-.../original.jpg`.
- **`CONFIRMED_ANIME_COUNT` moved into the manifest**; `GROUP_A`/`GROUP_B` mechanics constants stayed in the script since they aren't part of PMQA-02's documented field list (only their slugs are referenced as `roles` keys in the manifest).
- **Task boundaries kept the manifest refactor commit separate from the media-seeding commit**, matching the plan's task split even though both were implemented together in one working pass — Task 1's commit uses a local `STORY_IMAGE_SRC_SUBSTRING` constant (still `/media/profile/`, still corrected) and a literal `CONFIRMED_ANIME_COUNT = 10`; Task 2's commit layers the manifest-read refactor on top. Both intermediate and final states were independently run against the live stack and both printed `RESULT: PASS`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected the story-image assertion's expected `src` substring**
- **Found during:** Task 1 (before implementing the media assertions)
- **Issue:** The plan's `<interfaces>` section and Task 1/Task 2 action text both assert `member_story_html` contains the literal substring `/media/story-images/`. Reading the actual rendering path (`backend/internal/handlers/app_profile_story_image.go`'s `applyStoryImageLifecycle` populates `assetsURLMap[a.ID] = a.FilePath`, and `backend/internal/services/tiptap_service.go`'s sanitizer policy only allows `src` matching `^/media/profile/\d+/story/[a-z0-9-]+/original\.(...)$`) showed the real, persisted `src` is `/media/profile/{memberID}/story/{uuid}/original.{ext}` — `/media/story-images/:id` is a separate, GET-only resolve-by-ID endpoint used exclusively for editor-side image preview before save, never embedded in saved story HTML. Asserting the plan's literal substring would have made both new checks permanently FAIL against correct, working behavior.
- **Fix:** Used `/media/profile/` as the expected substring in both the seed's assertions and the manifest's `media.story_html_contains` field; documented the actual URL shape and the reasoning in `scripts/README-manifest.md` ("Story-image URL shape") and `scripts/README-seed.md`.
- **Files modified:** scripts/seed-member-profile-fixtures.mjs, scripts/member-profile-fixture.manifest.json, scripts/README-manifest.md, scripts/README-seed.md
- **Verification:** Live seed run against the shared stack: `[PASS] story image referenced in public profile (csubs-leader) — member_story_html=<p>Seed134 Mitgliedsgeschichte.</p><img src="/media/profile/1/story/34d22c5f-.../original.jpg" ...>` and the equivalent for sheppert; both PASS on two consecutive runs.
- **Committed in:** `65aa0271` (Task 1), `0b192c22` (Task 2, manifest field)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Necessary for correctness — the plan's stated assertion substring would never have matched real backend output. No scope creep; the fix stays within the same task's file set and is fully documented for downstream Plan 134-03 (verification matrix) and 134-05 (reset script), which both read the same corrected manifest field.

## Issues Encountered
None beyond the deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `scripts/member-profile-fixture.manifest.json` is ready for Plan 134-03's verification matrix and Plan 134-05's reset script to read as their single source of truth per D-02.
- Both reference profiles (`csubs-leader`, `sheppert`) now have a real, publicly-visible, member-owned story image — closing the gap that would have left PMQA-05's live-UAT "images" checkpoint with nothing real to screenshot.
- No blockers for downstream Phase 134 waves.

---
*Phase: 134-fixture-backed-verification-rollout*
*Completed: 2026-08-16*

## Self-Check: PASSED

All 5 referenced files confirmed on disk; all 2 task commits (`65aa0271`, `0b192c22`) confirmed in `git log`.
