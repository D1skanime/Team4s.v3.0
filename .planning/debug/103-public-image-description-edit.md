---
phase: 103
uat_test: 8
status: root_cause_found
investigated: 2026-07-16
scope: diagnosis_only
---

# Phase 103 UAT 8 — Public release image becomes uneditable

## Symptom

An authorized user uploads a release-version image, changes it to `Öffentlich`, closes the editor, then reopens the same image. The description field and save action are disabled even though the user's release-version media update permission has not changed.

## Root cause

The PATCH response loses the per-item permission annotations. The frontend then replaces the correctly annotated list item with this incomplete response object. Because `can_update` is a non-optional boolean in the runtime response, its Go zero value serializes as `false`; the UI treats that explicit `false` as authoritative and does not fall back to the still-valid aggregate capability.

Exact sequence:

1. The initial list endpoint correctly calculates item permissions.
   - `ListReleaseVersionMedia` loads the items, resolves the release-version update result, and calls `annotateReleaseVersionMediaItemPermissions` at `backend/internal/handlers/admin_content_release_version_media.go:651-669`.
   - That annotator assigns `items[i].CanUpdate = canUpdate` and `CanDelete = canDelete` at lines `591-619`.

2. Changing the status to `Öffentlich` sends a normal PATCH.
   - The UI maps `oeffentlich` to `{ visibility: 'oeffentlich', review_status: 'freigegeben' }` in `ReleaseVersionMediaSection.tsx:77-81`.
   - The backend accepts caption, visibility, review status, and preview fields under the same update permission and transaction (`admin_content_release_version_media.go:778-886`). There is no backend rule saying public/approved media becomes immutable.

3. The PATCH response reloads the database item but does not annotate permissions.
   - After commit, `PatchReleaseVersionMedia` calls `loadReleaseVersionMediaResponseItem` at `admin_content_release_version_media.go:892`.
   - `loadReleaseVersionMediaResponseItem` only calls the repository list and builds URLs (`683-701`). It does **not** call `annotateReleaseVersionMediaItemPermissions` and does not receive actor/update-result inputs.
   - `ReleaseVersionMediaItem.CanUpdate` and `.CanDelete` are plain booleans with JSON fields (`backend/internal/repository/release_version_media_repository.go:52-64`). Repository reads never populate them (`200-271`), so the returned PATCH item contains `can_update: false` and `can_delete: false` by Go zero value.

4. The hook replaces the good item with the incomplete response.
   - `useReleaseVersionMedia.patchItem` stores the PATCH response verbatim: `item.id === mediaId ? updated : item` at `useReleaseVersionMedia.ts:316-333`.
   - This discards the previous `can_update: true` annotation immediately after the successful public-status patch.

5. Reopening uses the explicit false and locks the editor.
   - `canEditSelectedItem` is computed as `selectedItem.can_update ?? canUpdateMedia` at `ReleaseVersionMediaSection.tsx:203-205`.
   - Because `can_update` is `false`, nullish fallback does not use `canUpdateMedia`, even if the capability is still true.
   - The save button, description textarea, status select, and preview checkbox are all disabled from that value at lines `593-617`, `631-644`, and `653-660`.

The public status is therefore correlated with the failure because changing to public triggers PATCH. It is **not** an intentional public-status lock. Any successful item PATCH whose response replaces an annotated item can produce the same permission loss.

## Permission evidence

- The PATCH handler first checks `ActionReleaseVersionMediaUpdate` and ownership/group scope (`admin_content_release_version_media.go:730-763`).
- Caption remains a supported patch field at lines `778-782` and is persisted together with review fields at `840-886`.
- No condition checks `visibility == oeffentlich` or `review_status == freigegeben` to forbid later caption edits.
- The capabilities endpoint independently reports `CanUpdateMedia: canUpdateMedia.Allowed` at `1133-1198`; the user's capability is not revoked by publication.

## Test coverage gap

Existing tests cover permission calculation and update authorization separately, but the response-contract invariant is missing: a successful PATCH response must carry the same actor-specific `can_update`/`can_delete` annotations as the list response, or the client must preserve existing annotations when the mutation DTO omits them.

No integration test exercises:

`list annotated item → patch visibility/review → replace client item → reopen → edit caption`.

## Suggested fix direction

Preferred contract fix:

- Make the PATCH response go through the same actor-specific annotation path as `ListReleaseVersionMedia`, including update/delete permissions and owner/group rules. Refactor a shared response-item annotator so list and mutation responses cannot drift.
- Add a backend handler test asserting that an authorized user's PATCH response retains `can_update: true` after setting `visibility=oeffentlich` and `review_status=freigegeben`.

Defensive frontend hardening:

- When merging a mutation response, preserve prior permission annotations only if the contract intentionally omits them. Do not use this as a substitute for the backend contract if fields remain mandatory booleans.
- Add a component/hook regression test that publishes an image, closes/reopens it, edits the description, and saves successfully.

Do not special-case public status in the UI. Authorized update permission and relation ownership—not visibility—must determine editability.

## Files implicated

- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts`
- `frontend/src/types/releaseVersionMedia.ts`
- `backend/internal/handlers/admin_content_release_version_media.go`
- `backend/internal/repository/release_version_media_repository.go`

No product implementation was changed during this diagnosis.
