---
phase: 103
plan: "01"
status: complete
completed: 2026-07-16
commits:
  - 96dbba76
  - 04ee653f
---

# Plan 103-01 Summary

## Delivered

- Extended the canonical public release-detail contract and frontend DTO with release identity, participating groups, technical metadata, subtitle tracks, selected preview, exact author/avatar fields, release-bound segments, category totals, and adjacent navigation.
- Kept the existing public detail route and release-version media seam; no parallel endpoint or episode-owned media path was introduced.
- Made image pagination category-scoped and ownership-checked, with validated canonical categories, per-category totals, returned counts, and independent cursors.
- Added server reads for selected public preview media, release-version contributors and notes, cooperation groups, technical tracks, release-bound Kara segments, and same-group adjacent releases with same-version preference.
- Added focused repository and handler regression assertions.

## Task Commits

1. `96dbba76` — `feat(103-01): define public release detail projection`
2. `04ee653f` — `feat(103-01): implement public release aggregate`

## Deviations

- The repository has no documented runnable OpenAPI validation command and neither the system Python nor workspace Node resolution exposed a YAML parser. YAML validation could therefore not be executed locally; structural contract changes were reviewed directly and `git diff --check` passed.
- Subtitle tracks are projected from the existing `release_streams` language rows and `release_variants.subtitle_type`. No new persistence table or inferred Jellyfin/file metadata was introduced.
- Segment participants reuse the exact release-version contribution set filtered to Kara/Typesetting roles because no segment-specific contributor relation exists.

## Verification

- `go test ./internal/repository ./internal/handlers` from `backend` — passed.
- `npm run typecheck` from `frontend` — passed.
- `git diff --check` — passed.
- OpenAPI parser — not runnable locally (parser/command unavailable).

## Self-Check

- [x] Contract, backend DTO, and frontend DTO use matching JSON field names.
- [x] Media remains owned by a real `release_version_id`.
- [x] Image, note, contributor, segment, and navigation reads retain server-side release/group scope.
- [x] Public image visibility still requires ready, public, approved, and non-deleted assets.
- [x] No filenames, Jellyfin IDs, source URLs, or render diagnostics are exposed.
- [x] Only plan-owned files were committed; unrelated planning state and temporary assets remain untouched.
