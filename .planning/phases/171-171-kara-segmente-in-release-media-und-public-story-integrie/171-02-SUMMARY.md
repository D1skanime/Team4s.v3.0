---
phase: 171-kara-segmente-in-release-media-und-public-story-integrie
plan: 02
subsystem: admin-ui
tags: [react, release-media, kara, ordering, responsive]

requires:
  - phase: 171-kara-segmente-in-release-media-und-public-story-integrie
    provides: Typed mixed release-version story order and reorder contract
provides:
  - One admin ReleaseVersionMedia list containing media and assigned Kara segments
  - Fallback preview resolution and orientation-only Kara cards
  - Mixed drag-and-drop reorder persistence through the existing API seam
affects: [admin-release-version-media, phase-171-verification]

key-files:
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.test.tsx
    - frontend/src/types/releaseVersionMedia.ts

requirements-completed: [PH171]
---

# Phase 171 Plan 02: Admin mixed release-media list

The existing ReleaseVersionMedia admin surface now displays assigned Kara segments alongside release media in one ordered list. Kara cards remain orientation-only: they show category, title, timing/episode hints, status, and a resolved preview fallback, without play or preview actions.

## Accomplishments

- Loaded assigned theme segments through the existing admin API context for the real release version.
- Composed media and Kara into a typed shared story list and preserved the existing media mutation controls.
- Added mixed drag-and-drop handling so both media and Kara cards can be dragged onto either kind of card and persisted with the canonical reorder payload.
- Kept Kara outside `release_version_media`; only the order projection is persisted.
- Updated the existing reorder test expectation to the typed media order contract.

## Verification

- Admin focused suite: 149 tests passed across Gallery, MediaSection, and SegmenteTab.
- Backend compile-only checks passed for handlers, repository, and models.
- `git diff --check` passed.
- Full frontend typecheck still reports only the pre-existing `ReleaseDetailHero.test.tsx` fixtures missing required `previous` fields.
- Production build compiles the application but fails during existing Next `/_global-error` prerendering with a null `useContext` error; no Phase-171 source error was reported.

## Deviations

- The existing Gallery test expected the legacy untyped `{ id, sort_order }` payload. It was updated to assert the canonical typed `{ type: 'media', media_id, sort_order }` payload introduced in Plan 01.
- The plan's original test filenames were not all present in this checkout; the available focused admin suites were used.

## Next

Plan 04 remains for cross-surface live/browser verification.
