---
phase: 105-responsive-release-detailseite-und-kara-timeline-redesign
plan: "04"
subsystem: public-release-content-ui
tags: [react, css-modules, responsive-grid, lightbox, rich-text, cursor-pagination]
requires:
  - phase: 105-01
    provides: Wave-0 regression contracts for Gallery and Notes
  - phase: 103-10
    provides: Release-version gallery cursor, reveal, and shared lightbox seams
provides:
  - One metadata-rich 2/2/3/4 release-version image grid independent of source groups
  - Role-based release notes with stable per-note in-place expansion
  - Local cursor error states that preserve loaded Gallery and Notes content
affects: [105-05, public-release-detail, release-version-media, release-version-notes]
tech-stack:
  added: []
  patterns: [source-group-as-card-metadata, stable-ID expansion Set, local cursor error preservation]
key-files:
  created: []
  modified:
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx
key-decisions:
  - "Fansub groups remain optional card metadata; they never select the Gallery or Notes primary layout axis."
  - "Long release notes are expanded by stable note ID while RichTextRenderer remains the only body_html renderer."
patterns-established:
  - "Public release media always renders through one grid; ownership labels stay inside each card."
  - "Cursor merges update item collections without replacing independent per-item interaction state."
requirements-completed: [D-03, D-18, D-19, D-20, D-21, D-22, D-27, D-28, P103-D-01, P103-D-06, P102-D-04, P102-D-07]
duration: 10min
completed: 2026-07-19
---

# Phase 105 Plan 04: Responsive Gallery and Team Texts Summary

**Release-version images now share one metadata-rich 2/2/3/4 grid, while role-based team texts expand independently in place without replacing the established Lightbox, cursor, or RichText seams.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-07-19T13:02:10Z
- **Completed:** 2026-07-19T13:12:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Removed source-group-dependent Gallery chapters and retained group identity only as wrapping card metadata in one responsive release grid.
- Preserved category cursor fanout, ID deduplication, the 6/4/2 reveal slice, and the shared `FansubMediaLightbox` original-image contract.
- Replaced source-group Notes buckets with release-role buckets and added stable per-note `Weiterlesen` / `Weniger anzeigen` controls with `aria-expanded` and `aria-controls`.
- Kept loaded images, notes, and expanded note state visible across cursor merges and local load failures.

## Task Commits

Each task was committed atomically:

1. **Task 1: Gallery auf ein Metadaten-reiches 2/2/3/4-Raster festlegen** - `ab6b3add` (feat)
2. **Task 2: Teamtexte rollenbasiert und per stabiler Note-ID aufklappbar machen** - `f6b2b4cc` (feat)

**Plan metadata:** this commit

The RED contracts were introduced in Wave 0 by Plan 105-01; both planned red cases were confirmed before their corresponding GREEN implementations.

## Files Created/Modified

- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` - One grid, optional source-group metadata, exact local load-error copy, and unchanged shared Lightbox ownership.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.module.css` - Exact two-column base, three-column 901–1199 px, and four-column 1200+ px layout with bounded metadata.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx` - Multi-group single-grid, original-image, cursor dedupe, and error-preservation coverage.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.tsx` - Role buckets, optional group metadata, stable `Set<number>` expansion, and local cursor errors.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.module.css` - One/two-column role grid, 68ch bodies, six-line clamp, and expanded state.
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseNotesList.test.tsx` - Role-axis, independent expansion, cursor preservation, error retention, and UTC hydration coverage.

## Decisions Made

- `groups` resolves visible source names only. The canonical primary axes remain a single release-version image grid and release-role note buckets.
- Long-note disclosure uses a local content-length decision and stable numeric note IDs; it does not parse, sanitize, or render HTML outside `RichTextRenderer`.
- API errors are intentionally mapped to the locked public German copy so technical messages do not leak into the public surface.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The expected Wave-0 RED failures were confirmed and turned green.

## Verification

- Focused Vitest: 3 files, 17 tests passed.
- `npm run typecheck`: passed.
- Scoped ESLint across all six plan paths: passed without findings.
- Acceptance scans: one Gallery grid; no source-group render branch; Notes use `Set<number>` and no `groups.length` switch; no parallel `dangerouslySetInnerHTML` seam.
- Ownership scan: no backend, API, DTO, contract, upload, `media_assets`, `media_files`, or `release_version_media` changes.
- `git diff --check`: passed.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gallery and Notes are ready for the Phase 105 integration suite and live responsive UAT in Plan 105-05.
- No ownership, API, authentication, or renderer blocker remains for this slice.

## Self-Check: PASSED

- All six planned implementation files exist.
- Task commits `ab6b3add` and `f6b2b4cc` exist in Git history.
- All planned acceptance criteria and plan-level verification commands pass.

---
*Phase: 105-responsive-release-detailseite-und-kara-timeline-redesign*
*Completed: 2026-07-19*
