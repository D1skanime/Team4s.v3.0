---
phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra
plan: 07
subsystem: api
tags: [typescript, openapi, dto-sync, contracts, admin-content]

# Dependency graph
requires:
  - phase: "172-01"
    provides: "AdminThemeSegment.PreviewURL/PreviewSource, AdminSegmentPreviewImageCandidate Go model"
  - phase: "172-05"
    provides: "4 manual preview-image HTTP endpoints (upload/candidates/attach/reset) under /api/v1/admin/anime/:id/segments/:segmentId/preview-image..."
provides:
  - "AdminThemeSegment.preview_url/preview_source TypeScript fields, synced to the Go model"
  - "AdminSegmentPreviewImageCandidate/AdminSegmentPreviewImageCandidatesResponse TypeScript types"
  - "4 typed api.ts client functions: uploadSegmentPreviewImage, getSegmentPreviewImageCandidates, attachSegmentPreviewImage, resetSegmentPreviewImage"
  - "openapi.yaml + admin-content.yaml contract documentation for the 4 endpoints and new schemas/types"
affects: ["172-08 (frontend upload/picker/reset UI, consumes this finished contract interface)", "172-09"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All 4 new api.ts functions follow the exact existing segment-asset function pattern byte-for-byte (authorizedFetch + getApiBaseUrl + URLSearchParams release_variant_id + parseApiErrorPayload/ApiError on !response.ok), inserted directly after deleteSegmentAsset so future segment-scoped endpoints have one obvious insertion point to copy from."

key-files:
  created: []
  modified:
    - frontend/src/types/admin.ts
    - frontend/src/lib/api.ts
    - shared/contracts/openapi.yaml
    - shared/contracts/admin-content.yaml

key-decisions:
  - "Reused the existing AdminAnimeSegmentResponse ({data: AdminThemeSegment}) schema for all 4 new openapi.yaml path responses instead of inventing a new schema, since all 4 real Go handlers return exactly {\"data\": updated} (verified by reading admin_content_anime_theme_segments_preview.go directly, not guessed) — no AdminThemeSegmentMutationResponse-style range_sync wrapper applies here."
  - "Added a dedicated &id009 404-response anchor for the attach endpoint (distinct from the existing &id006 'segment not found' anchor) because the real handler's 404 on attach means something semantically different: 'media_asset_id does not belong to a public, approved image of an assigned release version' (foreign-asset rejection), not 'segment not found'."
  - "Used *id001 (AdminAnimeId) and *id002 (release_variant_id query param) YAML anchors already defined at the /segments path (verified they resolve document-wide, confirmed no --- document separators exist before reuse point) instead of re-declaring the parameter objects inline, exactly matching the sibling /segments/{segmentId}/assignments pattern."

requirements-completed: ["D-09"]

# Metrics
duration: ~25min
completed: 2026-10-01
---

# Phase 172 Plan 07: Backend/Frontend Preview-Image Contract Summary

**TypeScript `preview_url`/`preview_source` fields plus 4 typed `api.ts` client functions (upload/candidates/attach/reset) and matching OpenAPI/admin-content.yaml documentation close the contract for the 4 manual preview-image endpoints already shipped in Plan 172-05 — verified against the real Go handler code, not assumed.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-10-01
- **Tasks:** 2/2 completed
- **Files modified:** 4 (admin.ts, api.ts, openapi.yaml, admin-content.yaml)

## Accomplishments

- `AdminThemeSegment.preview_url?: string | null` and `AdminThemeSegment.preview_source?: 'manual' | 'auto' | 'fallback' | null` added right after `assigned_episodes`, exactly matching the Go model fields from Plan 172-01.
- New `AdminSegmentPreviewImageCandidate` / `AdminSegmentPreviewImageCandidatesResponse` TypeScript types added next to `AdminSegmentLibraryCandidate`, the direct format template named in the plan's interfaces block.
- 4 new `api.ts` functions (`uploadSegmentPreviewImage`, `getSegmentPreviewImageCandidates`, `attachSegmentPreviewImage`, `resetSegmentPreviewImage`) inserted directly after `deleteSegmentAsset`, each built by copying the exact existing sibling function (`uploadSegmentAsset`, `getSegmentLibraryCandidates`, `attachSegmentLibraryAsset`) line-for-line and swapping only the URL path, payload type, and multipart-vs-JSON body — including `retryAuth401: false` for the upload function and the identical `URLSearchParams` `release_variant_id` query-param pattern for all 4.
- The exact 4 route paths and request/response shapes were verified by reading the real Go handler file (`backend/internal/handlers/admin_content_anime_theme_segments_preview.go`) and the real route registrations in `backend/cmd/server/admin_routes.go`, not guessed from the plan text alone — confirming `POST .../preview-image` (multipart `file`), `GET .../preview-image/candidates`, `POST .../preview-image/attach` (JSON `{media_asset_id}`), `POST .../preview-image/reset` (no body), all returning `{"data": AdminThemeSegment}`.
- `shared/contracts/openapi.yaml`: 4 new path entries added after `/segments/{segmentId}/assignments`, reusing the existing `*id001`/`*id002`/`*id003`/`*id004`/`*id005`/`*id006`/`*id008` anchors from the sibling `/segments/{segmentId}` paths, plus one new `&id009` anchor for the attach endpoint's semantically-distinct 404. New schemas: `AdminSegmentPreviewImageCandidate`, `AdminSegmentPreviewImageCandidatesResponse`, `AdminSegmentPreviewImageAttachRequest`; `AdminThemeSegment` schema gained `preview_url`/`preview_source` properties.
- `shared/contracts/admin-content.yaml`: mirrored the same 4 endpoints as new `endpoints:` entries (following the exact `admin-segment-assign`/`admin-segment-episode-override-upsert` entry shape) and the same 3 new types plus the 2 new `AdminThemeSegment` fields in the `types:` section.
- Both YAML files verified: `openapi.yaml` parses cleanly end-to-end via `python3 -c "import yaml; yaml.safe_load(...)"` including all 4 new paths and 3 new schemas. `admin-content.yaml` has a pre-existing (unrelated, not introduced by this plan) YAML-parse defect elsewhere in the file — see Deviations below.

## Task Commits

1. **Task 1: TypeScript-Typen + 4 api.ts-Funktionen** - `830f47b9` (feat)
2. **Task 2: Contract-Dokumentation synchronisieren** - `7d2ab8ff` (docs)

**Plan metadata:** pending (this commit)

## Files Created/Modified

- `frontend/src/types/admin.ts` - `AdminThemeSegment.preview_url`/`preview_source` fields; new `AdminSegmentPreviewImageCandidate`/`AdminSegmentPreviewImageCandidatesResponse` interfaces
- `frontend/src/lib/api.ts` - `uploadSegmentPreviewImage`, `getSegmentPreviewImageCandidates`, `attachSegmentPreviewImage`, `resetSegmentPreviewImage` client functions; added `AdminSegmentPreviewImageCandidatesResponse` to the existing `@/types/admin` import block
- `shared/contracts/openapi.yaml` - 4 new paths (`/preview-image`, `/preview-image/candidates`, `/preview-image/attach`, `/preview-image/reset`), 3 new schemas, 2 new `AdminThemeSegment` properties
- `shared/contracts/admin-content.yaml` - 4 new endpoint entries, 3 new types, 2 new `AdminThemeSegment` fields

## Decisions Made

- Reused `AdminAnimeSegmentResponse` (`{data: AdminThemeSegment}`) for all 4 new endpoint responses in `openapi.yaml` rather than `AdminThemeSegmentMutationResponse` (which carries `range_sync`), because the real handlers never return `range_sync` — confirmed by reading the actual Go response bodies (`c.JSON(http.StatusOK, gin.H{"data": updated})`).
- Introduced a new `&id009` 404-response anchor for the attach endpoint instead of reusing `&id006`, since the attach 404 means "foreign/unassigned asset", a materially different condition from the generic "segment not found" that `&id006` documents elsewhere.
- Did not touch any UI/component files — this plan is explicitly data/network-contract-only per its frontmatter `files_modified` list; Plan 172-08/172-09 consume this as a finished, typed interface.

## Deviations from Plan

### Auto-fixed Issues

None — no code bugs or missing critical functionality were found; this was a pure additive contract-sync task.

### Out-of-scope pre-existing issues (logged, not fixed)

**1. `shared/contracts/admin-content.yaml` has a pre-existing YAML-parse defect, unrelated to this plan's additions**
- **Found during:** Task 2, while validating the new contract additions with a Python YAML parse check.
- **Issue:** A `notes:` list item elsewhere in the file (in the `EffectiveContributionsResponse`-adjacent endpoint block, far from any segment/preview-image content) begins with a quoted substring immediately followed by more unquoted text on the same line — invalid YAML grammar.
- **Verification it's pre-existing:** `git show HEAD:shared/contracts/admin-content.yaml` (the version before any 172-07 edits) fails with the identical `ParserError` at the line number corresponding to this plan's +117-line insertion offset — same bug, same content, confirmed unrelated to any text this plan added.
- **Why not fixed:** Out of this plan's `files_modified` scope (only preview-image endpoints/types); per the scope-boundary rule, unrelated pre-existing defects are logged, not auto-fixed.
- **Action taken:** Logged to `deferred-items.md` with root cause and recommended fix. This plan's own additions to `admin-content.yaml` were verified independently by visual pattern-matching against the sibling endpoint/type blocks (exact same structure, indentation, and quoting style already used throughout the file), and by `openapi.yaml` — a strict, separate contract file — parsing 100% cleanly with all 4 new paths and 3 new schemas present.
- **Files:** `.planning/phases/172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra/deferred-items.md`

---

**Total deviations:** 0 auto-fixed; 1 pre-existing issue logged (out of scope, not this plan's defect).
**Impact on plan:** None — the YAML-parse defect does not touch, and was not caused by, any content this plan added. No scope creep.

## Issues Encountered

- **`cd frontend && npx tsc --noEmit` surfaces ~6 pre-existing, unrelated TypeScript errors** (Next.js generated page-type mismatches in `admin/anime/create/page.ts`, `anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts`, `anime/page.ts`, and 6 `ReleaseDetailHero.test.tsx` fixture type mismatches missing a `previous` property). Confirmed none of these reference `admin.ts`, `api.ts`, or anything with "preview" in the name — they are pre-existing and out of this plan's scope. Re-ran `tsc --noEmit` both before committing Task 1 and again after Task 2 with identical results, confirming no regression was introduced by this plan's changes.
- No OpenAPI/YAML lint script exists anywhere in the repo (`package.json`, `frontend/package.json`, no Makefile, no `spectral`/`swagger-cli`/`redocly` references found) — per the plan's own acceptance criteria fallback, this is noted here as "kein Linter gefunden" rather than run.

## User Setup Required

None — pure TypeScript/contract-documentation changes; no new environment variables, no new dependencies, no migrations.

## Next Phase Readiness

- Plan 172-08/172-09 (frontend upload/picker/reset UI) can now import and call all 4 typed functions directly from `@/lib/api`:
  `uploadSegmentPreviewImage(animeId, segmentId, file, authToken?, releaseVariantId?)`,
  `getSegmentPreviewImageCandidates(animeId, segmentId, authToken?, releaseVariantId?)`,
  `attachSegmentPreviewImage(animeId, segmentId, {media_asset_id}, authToken?, releaseVariantId?)`,
  `resetSegmentPreviewImage(animeId, segmentId, authToken?, releaseVariantId?)` — all typed against `AdminThemeSegment`/`AdminSegmentPreviewImageCandidate(sResponse)`.
- `AdminThemeSegment.preview_url`/`preview_source` are now available on every segment object the frontend already fetches, ready for UI badge/picker rendering without any additional type work.
- No blockers. This plan has no UI itself (by design — see Objective), so no live/visual UAT applies here; the first UI-dependent UAT point is Plan 172-08/172-09's own checkpoint, not this plan's.
- The pre-existing `admin-content.yaml` YAML-parse defect and the pre-existing unrelated `tsc` page-type errors should continue to be tracked separately in `deferred-items.md`, not treated as blockers for this plan or the next.

---
*Phase: 172-kara-vorschaubild-pro-segment-automatisch-aus-dem-render-fra*
*Completed: 2026-10-01*

## Self-Check: PASSED

All modified files verified present on disk (`frontend/src/types/admin.ts`, `frontend/src/lib/api.ts`,
`shared/contracts/openapi.yaml`, `shared/contracts/admin-content.yaml`); both task commits
(`830f47b9`, `7d2ab8ff`) verified present in git history.
