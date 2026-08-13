# Phase 36: Release-Version Media - Frontend Upload UI und Galerie - Research

**Date:** 2026-05-08
**Mode:** Inline research refresh during plan-phase

## Research Question

How should Phase 36 use the existing frontend structure to deliver release-version-media UX without building two separate upload UIs?

## Findings

### 1. Two existing host surfaces already exist

- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`
  - already has a release side drawer
  - already carries concrete fansub/release context
  - already uses drawer tabs and compact release-detail patterns
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
  - already has the large tabbed editor workspace
  - already hosts release-version-adjacent flows like files, metadata, and segments
  - has room for a full Media / Assets management area

**Implication:** the locked product decision is technically aligned with the codebase. The drawer should be the compact entry point; the editor should be the full management host.

### 2. Existing drawer media pattern is intentionally compact

- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx`
  - uses a simple scoped upload/list/delete surface
  - keeps loading and error state local to the section
  - relies on explicit release context instead of hidden global state

**Implication:** this is a good pattern reference for a compact drawer summary and local release-scoped status, but it is too small/simple to become the full release-version-media gallery management UX.

### 3. Upload progress pattern already exists in the frontend API seam

- `frontend/src/lib/api.ts`
  - existing upload helpers use `XMLHttpRequest` plus `xhr.upload.onprogress`
  - this pattern is already used for fansub media, anime media, and release theme assets
  - typed API helpers already surface `ApiError` and local upload progress

**Implication:** Phase 36 should reuse the existing XHR upload helper style for per-file progress instead of introducing a different upload transport pattern.

### 4. Existing admin media component is useful as a pattern, not as a direct fit

- `frontend/src/components/admin/MediaUpload.tsx`
  - shows strong local busy/error/warning state handling
  - includes replace/delete affordances and progress UI
  - is designed around singular slot media (`logo`, `banner`) rather than categorized multi-file galleries

**Implication:** the component is valuable for UX/state patterns, but Phase 36 still needs a dedicated release-version-media section and hook instead of trying to bend `MediaUpload.tsx` into a multi-category gallery tool.

### 5. Test seam is thinner than the current plans assumed

- `frontend/src/app/admin/episode-versions/[versionId]/edit/page.tsx`
  - is only a route wrapper around `EpisodeVersionEditorPage`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/`
  - currently has `SegmenteTab.test.tsx`
  - does not yet show an existing page-level editor test suite in the directory

**Implication:** Phase 36 should plan for section/component tests first and only add page-level verification where it genuinely fits the current test structure, rather than assuming a mature editor page test seam already exists.

### 6. Planning conflict discovered

The existing Phase-36 plans were still anchored to an older assumption:
- full feature focus only in the episode-version editor
- inline editing language for gallery controls
- no explicit drawer-summary deliverable

This conflicts with the updated Phase-36 context decisions:
- compact drawer entry only
- full management in editor
- compact cards + detail/edit panel instead of dense inline editing

## Planning Recommendations

1. Keep one shared frontend seam:
   - `useReleaseVersionMedia`
   - typed API helpers
   - shared section/gallery/detail components

2. Make the drawer a distinct but compact host:
   - counts
   - preview status
   - small thumbnail strip
   - CTA into editor

3. Keep the full management surface in the episode-version editor:
   - Media / Assets tab
   - upload composer
   - categorized gallery sections
   - detail/edit panel

4. Avoid optimistic gallery insertion:
   - upload rows can show progress immediately
   - persisted gallery updates should wait for backend-ready state

5. Rework existing plans instead of replacing the phase:
   - no new phase needed
   - current four plans are enough once retargeted to the locked context

## Conclusion

The current codebase supports the locked UX direction well. The right plan shape is:
- Plan 36-01: shared foundations + drawer summary + editor host wiring
- Plan 36-02: category-first upload composer
- Plan 36-03: categorized gallery + detail/edit panel
- Plan 36-04: regression coverage + drawer/editor verification
