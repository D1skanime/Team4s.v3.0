---
status: diagnosed
trigger: "Phase 103 HUMAN-UAT test 9: authorized Fansubber cannot select a release preview"
created: 2026-07-16
updated: 2026-07-16
scope: root-cause-only
---

# Phase 103 — release preview selection

## Symptom

Sheppert cannot mark an eligible release-version image as the preview for release version 1. The database has no current preview candidate, so the public release continues to use its fallback.

## Root cause

The atomic backend preview contract exists and is correct; the failure is the frontend interaction/authorization composition in the current `ReleaseVersionMediaSection`.

Preview selection is not exposed as an image-level action in the media gallery. The only active control lives inside the generic edit Drawer (`ReleaseVersionMediaSection.tsx:653-662`), is disabled by the broad item-edit boolean (`canEditSelectedItem`), and is persisted only when the user presses the Drawer’s generic `Speichern` button (`ReleaseVersionMediaSection.tsx:306-319,599-617`). Consequently an eligible, unselected image has no discoverable preview action on its card; the preview choice is coupled to the same edit state that also controls caption and public/review status.

This coupling is especially significant for the reported user: `canEditSelectedItem` prefers the item annotation whenever it exists (`selectedItem.can_update ?? canUpdateMedia`, line 204). Because `can_update` is a non-optional backend boolean in practice, a false relation annotation suppresses the capability fallback even if the aggregate release-version capability says the user may update media. The checkbox remains visible for eligible categories but disabled (`lines 653-660`), presenting exactly “I cannot select a preview.” The same broad edit gate also disables the caption field (`lines 631-638`), matching the adjacent UAT observation that the public item appears locked for text editing.

There is already a narrower preview interaction seam in `ReleaseVersionMediaDetailPanel.tsx`: `togglePreview()` patches only `{is_preview_candidate: nextValue}` immediately. That component is not used by the current `ReleaseVersionMediaSection`; the Phase-90 Drawer duplicates the detail UI and routes preview changes through the generic save payload instead. The current active component therefore lost the explicit preview action while leaving the correct helper component orphaned.

## Backend and data evidence

- Release version 1 has nine `release_version_media` rows and all have `is_preview_candidate=false`.
- Eligible rows exist: screenshots 57, 58, 59 and typesetting/Karaoke rows 1, 60, 61, 62, 63.
- Those eligible rows were uploaded by legacy user 3. `app_users.id=3` is `Sheppert Member` and is linked to `legacy_user_id=3`, so ownership identity is aligned.
- Sheppert has group roles including `encoder`; current `role_capabilities` grants `encoder` `release_version_media.update`. This is not a missing capability seed.
- Backend `PatchReleaseVersionMedia` accepts `is_preview_candidate`, rejects only non-eligible categories (`admin_content_release_version_media.go:783-838`), and when true clears every other preview for the same real `release_version_id` before patching the target within one transaction (`lines 848-865`). The max-one behavior is already atomic.
- Runtime logs show successful PATCH requests for Sheppert-owned release-1 media, but the database remains all false. Thus no `{is_preview_candidate:true}` mutation reached/committed; the server did not reject a true preview request.

## Why tests missed it

`ReleaseVersionMediaSection.test.tsx` verifies category tabs, upload, status mapping, delete-own, and readonly coop items. It does not assert that an authorized non-admin can select an existing eligible item, toggle preview, save/patch true, and see the previous preview cleared.

Its default fixture sets both `can_update_media:true` and `item.can_update:true`, bypassing the real item-vs-capability gate. The only readonly test intentionally supplies `can_update:false` and checks that every edit control is disabled; there is no matrix case for “eligible owned image + release media update capability + no current preview.”

Backend tests cover category validation and singleton clearing separately, but no UI-to-handler test proves that the active Fansubber workspace emits `is_preview_candidate:true`.

## Suggested fix direction (do not implement in this debug session)

1. Keep `release_version_media.is_preview_candidate`, the eligible-category allowlist, and the existing single transaction. Do not add another table, endpoint, or episode-owned preview field.
2. Reuse the existing narrow `togglePreview` idea from `ReleaseVersionMediaDetailPanel`, or extract it into the active Drawer/gallery. Offer a discoverable action on eligible image cards or an unmistakable enabled action in the Drawer; patch only `{is_preview_candidate:true}` for selection.
3. Resolve the item permission source consistently. The backend relation annotation remains authoritative, but owned release media with `release_version_media.update` must produce `can_update:true`; do not let a generic public/review lock silently disable preview selection if the permission contract says update is allowed.
4. Do not send unchanged visibility/review fields as part of a preview-only mutation. Preview selection should not depend on review-management rights or caption editing.
5. After success, refresh or atomically reconcile all local items: target true, every sibling false. The backend already performs the authoritative clear in one transaction.
6. Add focused coverage for Sheppert’s shape: owned screenshot/typesetting image, `can_update:true`, no current candidate, toggle emits true; ineligible categories hide the action; switching candidates leaves exactly one; `can_update:false` remains disabled; backend category and ownership denial still hold.

## Files implicated

- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx` (existing narrow seam, currently unused)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`
- `frontend/src/types/releaseVersionMedia.ts`
- `frontend/src/lib/api.ts`
- `backend/internal/handlers/admin_content_release_version_media.go`
- `backend/internal/repository/release_version_media_repository.go`
- `shared/contracts/admin-content.yaml`
- `shared/contracts/openapi.yaml`

## Current focus

- hypothesis: confirmed — active workspace hides/couples preview selection behind generic item edit state; no true preview patch reached the valid atomic backend seam
- next_action: gap-closure plan to restore a narrow discoverable preview action and test the real owned-Fansubber permission shape
