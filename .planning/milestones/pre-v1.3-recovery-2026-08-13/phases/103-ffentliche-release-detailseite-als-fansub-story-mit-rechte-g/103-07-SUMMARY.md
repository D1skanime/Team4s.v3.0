---
phase: 103
plan: "07"
status: complete
completed: 2026-07-16
commits:
  - 3e6b313b
  - 1a2f848a
---

# Plan 103-07 Summary

## Delivered

- Routed PATCH response items through the same actor-aware `can_update`/`can_delete` annotation used by the list response. Publishing or editing an owned image no longer replaces a valid permission with Go boolean zero values.
- Kept visibility and review status out of permission decisions; release-version update plus existing owner/group relation rules remain authoritative.
- Added a discoverable `Als Vorschau wählen` action directly to eligible screenshot and Typesetting/Karaoke cards in the active media workspace.
- Preview selection sends only `{is_preview_candidate: boolean}` through the existing PATCH endpoint and atomic `ClearPreviewCandidateForVersion` transaction.
- Removed preview from the generic caption/status save payload. The Drawer checkbox now invokes the same narrow preview mutation.
- Reconciled local state after a successful selection so the selected item is true and every sibling is false; the authoritative PATCH response remains the selected item source.
- Preserved readonly behavior for other-owner items and hid the preview action for ineligible categories.

## Files changed

- `backend/internal/handlers/admin_content_release_version_media.go`
- `backend/internal/handlers/admin_content_release_version_media_test.go`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.module.css`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.test.ts`

## Verification

- Focused backend ReleaseVersionMedia handler tests — passed.
- `go test ./internal/handlers ./internal/repository` — passed.
- Focused ReleaseVersionMediaSection and hook tests — 12 passed.
- Focused ESLint — no errors; eight pre-existing warnings in the touched section remain.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `git diff --check` — passed.

## Deviations and UAT

- Added one focused hook test file and touched the existing local media-section CSS because the image-level action required semantic, non-nested buttons.
- No contract shape changed, so OpenAPI/admin-content files required no update.
- Live in-app browser UAT was not executable in this agent context because the advertised browser skill/tool was unavailable. Automated coverage verifies permission retention, narrow preview payload, eligible/readonly visibility, and max-one local reconciliation.
- Build-induced `frontend/next-env.d.ts` churn and unrelated temporary assets were not staged or committed.
