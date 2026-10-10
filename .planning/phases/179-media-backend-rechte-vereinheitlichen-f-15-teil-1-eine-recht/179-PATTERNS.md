# Phase 179: Media-Backend & Rechte vereinheitlichen (F-15 Teil 1) - Pattern Map

**Mapped:** 2026-10-10
**Files analyzed:** 11 (6 production files modified/created backend, 1 production file modified
frontend, 4 test files created/extended)
**Analogs found:** 11 / 11 — every file has a directly-usable in-repo precedent; no "No Analog
Found" section needed. This phase is pure internal-convention replication (confirmed by
179-RESEARCH.md); all excerpts below were re-verified by direct file reads during pattern mapping,
not taken from research at face value.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/handlers/fansub_media_upload.go` (D-10: delete fallback branch, lines 63-78) | controller (Gin handler) | request-response | Same file's own `deleteFansubGroupMedia` pattern (the branch being removed) — AFTER-shape mirrors `UploadReleaseThemeAsset`'s simple `if !result.Allowed { writePermissionDenied; return }` (no second layer) | exact (removal, not addition — target shape already exists elsewhere in-repo) |
| `database/migrations/0182_release_version_theme_asset_upload.{up,down}.sql` (D-12) | migration | batch (one-time DDL/DML) | `database/migrations/0173_release_version_notes_view_all.up.sql`/`.down.sql` | exact |
| `backend/internal/permissions/permissions.go` (D-12: new `Action` const + `allKnownActions` entry) | config/registry | CRUD (in-memory cache load) | Existing `ActionReleaseVersionMediaUpload`/`ActionReleaseVersionMediaReorder` entries in the same const block and `allKnownActions` slice | exact |
| `backend/internal/handlers/admin_content_release_theme_assets.go` (D-12: swap action in both handlers) | controller (Gin handler) | request-response | Same file, same pattern already used twice (`CanForFansubGroup`/`CanForRelease` + `ActionReleaseVersionMediaUpload` call sites at lines 196 and 376) — only the `Action` constant argument changes | exact |
| `backend/internal/handlers/admin_content_release_theme_assets_persist.go` (NEW FILE, 1.6 persistence extraction) | controller (private helper method) | file-I/O + CRUD | `persistFansubMediaAsset` in `backend/internal/handlers/fansub_media_upload.go:240-306` | exact |
| `backend/internal/repository/media_soft_delete.go` (NEW FILE, D-14 shared soft-delete helper) | repository | CRUD | `SoftDeleteFansubGroupMedia` (`media_repository.go:1041-1062`) + `SoftDeleteReleaseVersionMedia` (`release_version_media_repository.go:374-392`, being unified) + `fmt.Sprintf(table)` technique precedent in `media_upload.go:366-382` | exact (unification of two existing near-identical methods) |
| `backend/internal/repository/media_repository.go` (`SoftDeleteFansubGroupMedia` → delegates to new helper) | repository | CRUD | New `media_soft_delete.go` helper (see above) | exact |
| `backend/internal/repository/release_version_media_repository.go` (`SoftDeleteReleaseVersionMedia` → delegates to new helper) | repository | CRUD | New `media_soft_delete.go` helper (see above) | exact |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx` (D-13: thread `isPlatformAdmin`) | component | request-response (client fetch) | `frontend/src/app/admin/fansubs/[id]/edit/FansubEditAccessGate.tsx` (self-fetching `getCurrentUser()` → `is_platform_admin` boolean, same shape recommended by research option (a)) | role-match (gate component, not the leaf component itself — but it is the only in-repo example of a non-page-level component independently calling `getCurrentUser()`) |
| `backend/internal/handlers/fansub_media_permission_test.go` (D-10 new regression case) | test | request-response | Existing `TestFansubGroupMediaUploadRejectsMissingGroupRole` in the same file (lines 114-141) | exact |
| `backend/internal/handlers/admin_content_release_theme_assets_test.go` (D-12 new/updated cases) | test | request-response | Existing `releaseThemeAssetDeniedResolverStub`/`releaseThemeAssetRepoStub` fixtures already in this file (lines 23-120) | exact |
| `backend/internal/repository/release_version_media_repository_test.go` (D-14 new/extended soft-delete cases) | test | CRUD | `TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows` (lines 205-231) in the same file | exact |
| `frontend/.../AnimeJellyfinAssetUploadControls.test.tsx` (NEW FILE, D-13 behavior test) | test | request-response | `frontend/src/components/auth/PlatformAdminGate.test.tsx` (full file, 173 lines) for the `getCurrentUser()`-mock + `is_platform_admin` boolean assertion shape; `AnimeJellyfinMetadataSection.test.tsx` for the sibling-component render/mock-`@/lib/api` shape | role-match (combine both: gate-test's mocking idiom + sibling-component's render idiom) |

## Pattern Assignments

### D-10: `fansub_media_upload.go` — remove upload custom-permission fallback

**Analog:** same file, target shape already exists in `admin_content_release_theme_assets.go` (no
second rights layer after `!result.Allowed`)

**Current code to remove** (`backend/internal/handlers/fansub_media_upload.go:63-78`, verified
2026-10-10):
```go
if !result.Allowed {
    allowedByCustomMediaPermission := false
    if kind == models.MediaKindImage && h.mediaRepo != nil {
        customPerms, permErr := h.mediaRepo.GetFansubGroupMediaPermissionsForAppUser(c.Request.Context(), fansubID, identity.AppUserID)
        if permErr != nil {
            writePermissionInternalError(c, permErr, "Fansub-Media-Berechtigung konnte nicht geprüft werden.")
            return
        }
        allowedByCustomMediaPermission = customPerms.CanUpload
    }
    if !allowedByCustomMediaPermission {
        auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.upload.denied", &fansubID, "fansub_group", &fansubID, action, result)
        writePermissionDenied(c, result)
        return
    }
}
```

**Target shape to replace it with** — mirror the simple single-layer pattern already used by
`UploadReleaseThemeAsset` (`admin_content_release_theme_assets.go:196-204`, verified):
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, fansubID)
if err != nil {
    writePermissionInternalError(c, err, "Release-Media-Berechtigung konnte nicht geprüft werden.")
    return
}
if !result.Allowed {
    writePermissionDenied(c, result)
    return
}
```
Adapted for `fansub_media_upload.go`, keep the existing `auditPermissionDenied` call before
`writePermissionDenied` (the theme-asset handler does not audit-log denials; the fansub upload
handler does — preserve that call, do not drop it):
```go
if !result.Allowed {
    auditPermissionDenied(c, h.auditLogRepo, identity, "fansub_group_media.upload.denied", &fansubID, "fansub_group", &fansubID, action, result)
    writePermissionDenied(c, result)
    return
}
```

**Do not touch:** `fansub_media_delete.go:70-98` (`deleteFansubGroupMedia`) — the *same*
`GetFansubGroupMediaPermissionsForAppUser` call and `FansubGroupMediaUploadedByAppUser` must remain
byte-for-byte unchanged (verified: both still present at lines 80 and 88 of that file, this is the
confirmed-isolated delete-side fallback D-10 explicitly keeps).

---

### D-12a: Migration `0182` — new `release_version_theme_asset.upload` action

**Analog:** `database/migrations/0173_release_version_notes_view_all.up.sql` / `.down.sql` (full
files read, verified verbatim below)

**Up-migration shape** (`0173...up.sql`, verified lines 1-29):
```sql
BEGIN;

INSERT INTO action_definitions (
    code, label_de, category, sort_order, description_de, help_text_de, user_overridable
) VALUES (
    'release_version.notes.view_all',
    'Alle Release-Notizen anzeigen',
    'veroeffentlichungen',
    260,
    'Alle Notizen einer Release-Version unabhängig vom Mitglied anzeigen.',
    'Standardmäßig nur für die Fansub-Leitung. Kann über die Rollenverwaltung weiteren Rollen gegeben werden.',
    true
)
ON CONFLICT (code) DO UPDATE SET
    label_de = EXCLUDED.label_de,
    category = EXCLUDED.category,
    sort_order = EXCLUDED.sort_order,
    description_de = EXCLUDED.description_de,
    help_text_de = EXCLUDED.help_text_de,
    user_overridable = EXCLUDED.user_overridable;

INSERT INTO role_capabilities (role_code, action_code)
VALUES ('fansub_lead', 'release_version.notes.view_all')
ON CONFLICT (role_code, action_code) DO NOTHING;

COMMIT;
```

**Down-migration shape** (`0173...down.sql`, verified verbatim, 12 lines):
```sql
BEGIN;

DELETE FROM role_capabilities
WHERE action_code = 'release_version.notes.view_all';

DELETE FROM action_definitions
WHERE code = 'release_version.notes.view_all';

COMMIT;
```

**Role list and category to use for the new action** — confirmed via
`grep -rn "release_version_media.upload'" database/migrations/*.sql`: the existing
`release_version_media.upload` row uses `category = 'release'`
(`database/migrations/0108_capability_registry.up.sql:40`: `('release_version_media.upload',
'Medien hochladen', 'release', 40)`). D-12 requires the new action's role list to be identical to
`release_version_media.upload`'s current live-DB role set (11 roles, per 179-CONTEXT.md's
fact-check): `designer, editor, encoder, fansub_lead, karaoke_fx, project_lead, quality_checker,
raw_provider, timer, translator, typesetter`. Use `category = 'release'` (matching the action being
replaced, not `0173`'s `'veroeffentlichungen'`, since this new action is a sibling of
`release_version_media.upload`, not of `release_version.notes.view_all`).

---

### D-12b: `permissions.go` — new `Action` const + registry entries

**Analog:** existing const block and `allKnownActions`/`standaloneActions` slices in the same file

**Const block location** (`permissions.go:47-54`, verified):
```go
ActionReleaseView                        Action = "release.view"
ActionReleaseVersionView                 Action = "release_version.view"
ActionReleaseVersionMediaView            Action = "release_version_media.view"
ActionReleaseVersionMediaUpload          Action = "release_version_media.upload"
ActionReleaseVersionMediaUpdate          Action = "release_version_media.update"
ActionReleaseVersionMediaDelete          Action = "release_version_media.delete"
ActionReleaseVersionMediaDeleteOwn       Action = "release_version_media.delete_own"
ActionReleaseVersionMediaReorder         Action = "release_version_media.reorder"
```
Add directly after this block (or logically adjacent):
```go
ActionReleaseThemeAssetUpload Action = "release_version_theme_asset.upload"
```

**`allKnownActions` location** (`permissions.go:224-266`, verified full slice content read) — add
the new constant into the slice, e.g. directly after `ActionReleaseVersionMediaReorder` (line 256):
```go
ActionReleaseVersionMediaUpload,
ActionReleaseVersionMediaUpdate,
ActionReleaseVersionMediaDelete,
ActionReleaseVersionMediaDeleteOwn,
ActionReleaseVersionMediaReorder,
ActionReleaseThemeAssetUpload, // <-- new (D-12)
ActionReleaseVersionMediaHighlight,
```

**Do NOT add to `standaloneActions`** (`permissions.go:271`, verified: currently only
`[]Action{ActionFansubGroupInvitationsAccept}`) — the new action needs real `role_capabilities`
rows per D-12, unlike the one existing standalone action. If forgotten, server fails closed at
startup with: `"permission cache: Action %q fehlt in role_capabilities und ist keine
standalone-Action — Startup abgebrochen"` (`permissions.go:413`, verified exact error string).

---

### D-12c: `admin_content_release_theme_assets.go` — swap the reused action

**Analog:** both call sites already in this exact file use an identical pattern; only the second
argument to `permissions.Action...` changes.

**Call site 1** (`UploadReleaseThemeAsset`, line 196, verified):
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, fansubID)
```
→ becomes:
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionReleaseThemeAssetUpload, fansubID)
```

**Call site 2** (`UploadReleaseThemeAssetForRelease`, line 376, verified):
```go
result, err := h.permissionSvc.CanForRelease(c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, releaseID)
```
→ becomes:
```go
result, err := h.permissionSvc.CanForRelease(c.Request.Context(), actor, permissions.ActionReleaseThemeAssetUpload, releaseID)
```
Both sites' surrounding error-handling (`writePermissionInternalError`/`writePermissionDenied`,
verified lines 197-204 and 377-384) stays unchanged — only the `Action` constant argument differs.

---

### D-12d / 1.6: Theme-asset persistence extraction (new file)

**Analog:** `persistFansubMediaAsset` in `backend/internal/handlers/fansub_media_upload.go:240-306`
(full method read, verified)

**Analog's shape** (verbatim, verified):
```go
func (h *FansubHandler) persistFansubMediaAsset(
    c *gin.Context,
    userID int64,
    fansubID int64,
    kind models.MediaKind,
    saveResult *services.MediaSaveResult,
    sourceResult *services.MediaVariantSaveResult,
) (*models.MediaAsset, bool) {
    asset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
    if err != nil {
        _ = removeFileQuietly(saveResult.CreateInput.StoragePath)
        if errors.Is(err, repository.ErrConflict) {
            c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "media asset bereits vorhanden"}})
            return nil, false
        }
        log.Printf("fansub media upload: create asset failed (user_id=%d, fansub_id=%d): %v", userID, fansubID, err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
        return nil, false
    }
    if err := h.mediaRepo.InsertMediaFile(c.Request.Context(), asset.ID, "original", asset.StoragePath, asset.SizeBytes); err != nil {
        _ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), asset.ID)
        _ = removeFileQuietly(asset.StoragePath)
        log.Printf("fansub media upload: insert original media file failed (user_id=%d, fansub_id=%d, media_id=%d): %v", userID, fansubID, asset.ID, err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
        return nil, false
    }
    // ... (display variants, source_original, AssignFansubMedia, cleanup-on-error chain)
    return asset, true
}
```

**Duplicate block to extract (both occurrences verified, nearly line-for-line identical except
`*releaseID` vs. `releaseID` and the log message prefix):**

`UploadReleaseThemeAsset` (`admin_content_release_theme_assets.go:284-327`, verified):
```go
mediaAsset, err := h.mediaRepo.CreateMediaAsset(c.Request.Context(), saveResult.CreateInput)
if err != nil {
    _ = removeFileQuietly(saveResult.CreateInput.StoragePath)
    if errors.Is(err, repository.ErrConflict) {
        c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "media asset bereits vorhanden"}})
        return
    }
    writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Asset konnte nicht gespeichert werden.")
    return
}
if err := h.mediaRepo.InsertMediaFile(c.Request.Context(), mediaAsset.ID, "original", mediaAsset.StoragePath, int64(len(data))); err != nil {
    _ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
    _ = removeFileQuietly(mediaAsset.StoragePath)
    writeInternalErrorResponse(c, "interner serverfehler", err, "Media-Dateigröße konnte nicht gespeichert werden.")
    return
}
created, err := h.themeRepo.CreateReleaseThemeAsset(c.Request.Context(), models.AdminReleaseThemeAssetCreateInput{
    ReleaseID: *releaseID, ThemeID: themeID, MediaID: mediaAsset.ID,
})
if err != nil {
    _ = h.mediaRepo.DeleteMediaAsset(c.Request.Context(), mediaAsset.ID)
    _ = removeFileQuietly(mediaAsset.StoragePath)
    if errors.Is(err, repository.ErrConflict) {
        c.JSON(http.StatusConflict, gin.H{"error": gin.H{"message": "theme bereits zugewiesen", "code": "already_assigned"}})
        return
    }
    if errors.Is(err, repository.ErrNotFound) {
        c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"message": "release oder theme nicht gefunden"}})
        return
    }
    log.Printf("admin release theme asset upload: fansub=%d anime=%d theme=%d: %v", fansubID, animeID, themeID, err)
    writeInternalErrorResponse(c, "interner serverfehler", err, "Theme-Video konnte nicht verknuepft werden.")
    return
}
c.JSON(http.StatusCreated, gin.H{"data": created})
```

`UploadReleaseThemeAssetForRelease` (`admin_content_release_theme_assets.go:449-494`, verified) is
structurally identical except `ReleaseID: releaseID` (no dereference) and the log line
`"admin release theme asset direct upload: release=%d theme=%d: %v"`.

**Recommended signature for the new file
(`backend/internal/handlers/admin_content_release_theme_assets_persist.go`)**:
```go
func (h *AdminContentHandler) persistReleaseThemeAsset(
    c *gin.Context,
    releaseID int64,
    themeID int64,
    createInput repository.MediaAssetCreateInput, // saveResult.CreateInput, already carries VisibilityCode/ReviewStatusCode
    dataSize int64,
    logContext string, // e.g. "fansub=%d anime=%d theme=%d" vs "release=%d theme=%d" pre-formatted by caller
) (*models.AdminReleaseThemeAsset, bool)
```
Both call sites should only run their own theme-segment-lock checks
(`GetCanonicalFansubAnimeRelease`, `HasGlobalThemeSegmentCoverageForRelease`,
`HasReleaseAssetSegmentUploadBlockedForRelease` — these differ structurally between the two
handlers and must NOT be folded in) before calling this shared tail.

---

### D-14: Shared soft-delete helper (new file)

**Analog A** — `SoftDeleteFansubGroupMedia` (`media_repository.go:1041-1062`, verified verbatim):
```go
func (r *MediaRepository) SoftDeleteFansubGroupMedia(ctx context.Context, fansubGroupID, mediaID int64, deletedByUserID *int64) error {
    var deletedBy interface{}
    if deletedByUserID != nil {
        deletedBy = *deletedByUserID
    }
    tag, err := r.db.Exec(ctx, `
        UPDATE fansub_group_media
        SET deleted_at = NOW(),
            deleted_by_user_id = (SELECT id FROM users WHERE id = $3),
            updated_at = NOW()
        WHERE group_id = $1
          AND media_id = $2
          AND deleted_at IS NULL
    `, fansubGroupID, mediaID, deletedBy)
    if err != nil {
        return fmt.Errorf("soft delete fansub_group_media (group_id=%d, media_id=%d): %w", fansubGroupID, mediaID, err)
    }
    if tag.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}
```

**Analog B** — `SoftDeleteReleaseVersionMedia` (`release_version_media_repository.go:374-392`,
verified verbatim):
```go
func (r *MediaRepository) SoftDeleteReleaseVersionMedia(
    ctx context.Context,
    relationID int64,
    deletedByUserID int64,
) error {
    tag, err := r.db.Exec(ctx, `
        UPDATE release_version_media
        SET deleted_at = NOW(), deleted_by_user_id = (SELECT id FROM users WHERE id = $2)
        WHERE id = $1
          AND deleted_at IS NULL
    `, relationID, deletedByUserID)
    if err != nil {
        return fmt.Errorf("soft delete release_version_media %d: %w", relationID, err)
    }
    if tag.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}
```

**Key difference to preserve exactly (verified by direct comparison):** Analog A sets
`updated_at = NOW()`; Analog B does not. Both already live on `*MediaRepository` (same receiver
type, confirmed by `grep "func (r \*MediaRepository)"` in both files) — this is a same-struct
unification, not a cross-struct one. D-14 requires this behavioral difference to survive the
unification unchanged.

**`fmt.Sprintf(table)` technique precedent** — `backend/internal/repository/media_upload.go:366-382`
(sibling repository struct, confirms the trusted-constant-table-name-via-fmt.Sprintf technique is
already an accepted pattern in this package, even though it is not the exact same struct):
```go
for _, table := range joinTables {
    query := fmt.Sprintf("DELETE FROM %s WHERE media_id = $1", table)
    _, err := r.getConn().Exec(ctx, query, id)
    ...
}
```

**Recommended new file** `backend/internal/repository/media_soft_delete.go` on `*MediaRepository`,
parametrized by table name (always a Go string literal from the two call sites, never
request/user-derived — security-critical invariant per 179-RESEARCH.md's Tampering note):
```go
func (r *MediaRepository) softDeleteMediaRelation(ctx context.Context, table string, whereClause string, args []interface{}, touchUpdatedAt bool) error {
    setClause := "deleted_at = NOW(), deleted_by_user_id = (SELECT id FROM users WHERE id = $N)"
    if touchUpdatedAt {
        setClause += ", updated_at = NOW()"
    }
    query := fmt.Sprintf("UPDATE %s SET "+setClause+" WHERE %s AND deleted_at IS NULL", table, whereClause)
    tag, err := r.db.Exec(ctx, query, args...)
    if err != nil {
        return fmt.Errorf("soft delete %s: %w", table, err)
    }
    if tag.RowsAffected() == 0 {
        return ErrNotFound
    }
    return nil
}
```
A simpler two-fixed-wrapper variant (one small method per table, each with static `$1`/`$2`/`$3`
placeholders, both calling one truly shared tiny exec helper) is equally valid per research's own
discretion note — avoid dynamic placeholder-number string formatting in favor of concrete `$1`/`$2`
per call site to keep SQL fully static and unambiguous.

---

### D-13: `AnimeJellyfinAssetUploadControls.tsx` — thread `isPlatformAdmin`

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/FansubEditAccessGate.tsx` (full file read,
verified) — the only existing in-repo example of a non-page-level component independently calling
`getCurrentUser()` to read `is_platform_admin`.

**Relevant excerpt** (verified lines 101-112):
```tsx
try {
  const currentUserPromise = getCurrentUser();
  const capabilitiesPromise = loadCapabilitiesForAccessGate(fansubID);
  const currentUserResponse = await currentUserPromise;
  if (currentUserResponse.data.is_platform_admin) {
    if (!cancelled) {
      setIsAllowed(true);
      setIsPlatformAdmin(true);
      setCapabilities(PLATFORM_ADMIN_CAPABILITIES);
    }
    return;
  }
  // ...
```

**Current component's import/prop shape** (`AnimeJellyfinAssetUploadControls.tsx:1-39`, verified —
no `currentUser`/`isPlatformAdmin` prop exists today):
```tsx
'use client'

import { useRef, useState } from 'react'

import {
  addAdminAnimeBackgroundAsset,
  assignAdminAnimeCoverAsset,
  // ... other api imports
  resolveApiUrl,
  uploadAdminAnimeMedia,
} from '@/lib/api'
import type { AdminAnimeJellyfinContext } from '@/types/admin'
import { MediaOwnershipContext, MediaOwnershipContextValue } from '@/components/admin/media/MediaOwnershipContext'

interface AnimeJellyfinAssetUploadControlsProps {
  animeID: number
  animeTitle?: string
  disabled?: boolean
  assetCards: AssetCardDescriptor[]
  coverCurrentImage?: string
  coverCurrentSource: AdminAnimeJellyfinContext['cover']['current_source']
  persistedAssets: AdminAnimeJellyfinContext['persisted_assets']
  onSuccess: (message: string) => void
  onError: (message: string) => void
  onAfterMutation: () => Promise<void>
}
```

**Recommended change (option (a) from research, self-fetch):** import `getCurrentUser` from
`@/lib/api` (same barrel already used by `FansubEditAccessGate.tsx`) and add an internal
`useEffect`/`useState` resolving `is_platform_admin`, gating the render of the upload controls
(not the whole component necessarily — D-13 only requires the controls themselves to disappear for
non-admins). `CurrentUserData.is_platform_admin: boolean` is defined at
`frontend/src/types/auth.ts:39` (verified).

**`segment_preview` special case stays untouched** — D-13 explicitly: "der Sonderfall
`segment_preview` behält sein eigenes Segment-Recht," i.e. do not fold that asset type's existing
separate check into the new platform-admin flag.

---

## Shared Patterns

### Data-driven capability registration (backend)
**Source:** `database/migrations/0173_release_version_notes_view_all.up.sql`/`.down.sql` +
`permissions.go`'s const block/`allKnownActions`
**Apply to:** D-12's new migration `0182` and the new `Action` constant.
Pattern: `INSERT ... ON CONFLICT (code) DO UPDATE` for `action_definitions`, `INSERT ... ON CONFLICT
DO NOTHING` for `role_capabilities`, always wrapped in `BEGIN;`/`COMMIT;`; the down-migration does
the mirror `DELETE FROM role_capabilities WHERE action_code = ...` then `DELETE FROM
action_definitions WHERE code = ...`.

### Permission-check flow (single layer)
**Source:** `admin_content_release_theme_assets.go:196-204` / `:376-384`
**Apply to:** D-10's end-state in `fansub_media_upload.go` and both D-12c call sites.
```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, <Action>, fansubID)
if err != nil {
    writePermissionInternalError(c, err, "<Fehlertext>")
    return
}
if !result.Allowed {
    writePermissionDenied(c, result)
    return
}
```

### Persistence-tail extraction into a private handler method
**Source:** `persistFansubMediaAsset` (`fansub_media_upload.go:240-306`)
**Apply to:** the new `admin_content_release_theme_assets_persist.go` file (1.6).
Pattern: `CreateMediaAsset` → (on error: `removeFileQuietly` + conflict/internal-error branching) →
`InsertMediaFile("original", ...)` → (on error: `DeleteMediaAsset` + `removeFileQuietly` cleanup) →
domain-specific link/assign call → (on error: same cleanup chain) → return `(*Model, bool)`.

### Soft-delete SQL skeleton
**Source:** `SoftDeleteFansubGroupMedia` + `SoftDeleteReleaseVersionMedia` (being unified by D-14)
**Apply to:** the new `media_soft_delete.go` helper.
Pattern: `UPDATE <table> SET deleted_at = NOW(), deleted_by_user_id = (SELECT id FROM users WHERE id
= $N) [, updated_at = NOW()] WHERE <key predicate> AND deleted_at IS NULL`; `tag.RowsAffected() ==
0` → `ErrNotFound`; table name and key predicate are always Go string literals from trusted call
sites, never derived from request input.

### Frontend self-fetch of `is_platform_admin`
**Source:** `FansubEditAccessGate.tsx` (`getCurrentUser()` → `currentUserResponse.data.is_platform_admin`)
**Apply to:** `AnimeJellyfinAssetUploadControls.tsx` (D-13).
No existing `CurrentUserContext`/`useCurrentUser()` hook exists in this frontend (verified: no
matches for `CurrentUserContext|useCurrentUser\b` under `frontend/src`) — every consumer either
wraps with `<PlatformAdminGate>` (opaque to children) or self-fetches like
`FansubEditAccessGate.tsx`. Self-fetch is the lower-blast-radius, already-precedented choice.

### Behavior-test fixtures for permission-gate handlers
**Source:** `fansub_media_permission_test.go` (full file, 142 lines) +
`admin_content_release_theme_assets_test.go`'s `releaseThemeAssetDeniedResolverStub`/
`releaseThemeAssetRepoStub` (lines 23-120)
**Apply to:** D-10's new regression test, D-12's updated theme-asset action tests.
Pattern: a package-local `permissions.Resolver` stub returning a real (non-nil) `*permissions.Context`
so `CanForFansubGroup`/`CanForRelease` evaluates a genuine role-based decision instead of
short-circuiting to a 404; `gin.CreateTestContext` + `httptest.NewRecorder()` +
`c.Set("auth_identity", middleware.AuthIdentity{...})`; assert on `recorder.Code` and
`recorder.Body.String()` (not source-grep).

### Behavior-test fixtures for soft-delete repository methods
**Source:** `TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows`
(`release_version_media_repository_test.go:205-231`)
**Apply to:** D-14's new shared-helper test (likely a new `media_soft_delete_test.go` or appended
to the existing repository test file).
Pattern: `openReleaseVersionMediaReplaceFixture(t)` (real Postgres fixture helper, defined in
`release_version_media_cross_package_test.go:85`) → direct `pool.Exec` to pre-seed a soft-deleted
row → call the repository method under test → assert the live row remains listed and the
soft-deleted row is excluded, using `testify`'s `require`/`assert`, never `strings.Contains`
against the handler's own source.

### Behavior-test fixtures for frontend gate/self-fetch components
**Source:** `PlatformAdminGate.test.tsx` (full file, 173 lines)
**Apply to:** the new `AnimeJellyfinAssetUploadControls.test.tsx` (D-13).
Pattern: `vi.mock('@/lib/api', () => ({ getCurrentUser: (...args) => apiMocks.getCurrentUser(...args), ... }))`
with `apiMocks` built via `vi.hoisted`; `apiMocks.getCurrentUser.mockResolvedValue({ data: { ...,
is_platform_admin: true|false } })`; assert via `screen.findByText`/`queryByText` that admin-only UI
appears only when `is_platform_admin: true` and is absent (not merely hidden) when `false`.

## No Analog Found

None — all 13 classified files have a direct, re-verified in-repo precedent (see table above).

## Metadata

**Analog search scope:** `backend/internal/handlers/`, `backend/internal/repository/`,
`backend/internal/permissions/`, `database/migrations/`,
`frontend/src/app/admin/anime/components/AnimeEditPage/`, `frontend/src/app/admin/fansubs/[id]/edit/`,
`frontend/src/components/auth/`.
**Files scanned (direct Read/Grep, this session):** `fansub_media_upload.go` (full),
`fansub_media_delete.go` (full), `admin_content_release_theme_assets.go` (targeted: lines 140-370,
370-530), `admin_content_release_theme_assets_test.go` (lines 1-120), `fansub_media_permission_test.go`
(full), `media_repository.go` (targeted: 715-784, 1035-1065), `release_version_media_repository.go`
(targeted: 368-398), `release_version_media_repository_test.go` (targeted: 1-70, 200-240),
`permissions.go` (targeted: 1-60, 218-292), `0173_release_version_notes_view_all.up.sql`/`.down.sql`
(full), `0108_capability_registry.up.sql` (grep), `AnimeJellyfinAssetUploadControls.tsx` (lines
1-100), `PlatformAdminGate.tsx` (full), `PlatformAdminGate.test.tsx` (full), `FansubEditAccessGate.tsx`
(full), `AnimeJellyfinMetadataSection.test.tsx` (lines 1-80), `frontend/src/types/auth.ts` (grep for
`is_platform_admin`), `frontend/src/lib/api/auth.ts` (grep for `getCurrentUser` definition).
**Pattern extraction date:** 2026-10-10
