# Phase 31 UAT

## Primary Browser Path

1. Open `http://127.0.0.1:3002/admin/fansubs/17/edit`.
2. Select `Anime & Releases`.
3. Verify `11eyes` and `11eyes: Pink Phantasmagoria` are visible.
4. Expand `Release #92`.
5. Verify the expanded area shows Theme-/Segment context.
6. Click a segment card.
7. Verify a release-specific segment editor opens.

## Expected Non-Goals

- No visible primary button `Releases neu laden`.
- No release-specific Logo/Banner upload fields.
- No OP/ED/Karaoke/Insert inside generic process-media upload.

## Current Status

status: pending-human-check
updated: 2026-04-30

Automated deployment check passed. Please verify in browser that `Release #92` can be expanded and that clicking a Theme-/Segment card opens `Segment bearbeiten`.
