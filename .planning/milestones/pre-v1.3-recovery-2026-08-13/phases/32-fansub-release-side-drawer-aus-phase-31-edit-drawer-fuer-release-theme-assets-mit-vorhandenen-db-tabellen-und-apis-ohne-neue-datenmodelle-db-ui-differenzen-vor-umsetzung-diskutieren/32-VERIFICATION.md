---
status: human_needed
phase: 32
verified: 2026-05-01
---

# Phase 32 Verification

## Automated Result

Passed.

## Must-Haves

- Direct release Theme asset upload writes through existing `release_theme_assets`: passed.
- No new DB table or `fansub_group_media` runtime path introduced: passed.
- Release row `Edit` opens a right Side Drawer: implemented, needs browser visual confirmation.
- Drawer does not expose Anime edit actions: passed by source check.
- Drawer does not edit timeline timings: passed by implementation/source review.
- Upload/delete controls call release-scoped Theme asset APIs: passed by source check.

## Human Verification Needed

- Confirm the Drawer visual placement and polish in the browser.
- Confirm OP/ED/IN selection behavior in the Drawer feels correct.
- Confirm an actual upload with an accepted video file succeeds for a missing/release-specific Theme slot.

## Gaps

None found in automated verification. Human UAT remains open.
