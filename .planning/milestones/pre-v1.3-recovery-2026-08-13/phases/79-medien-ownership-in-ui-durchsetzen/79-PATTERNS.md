# Phase 79: Medien-Ownership in UI durchsetzen — Pattern Map

**Mapped:** 2026-06-06
**Files analyzed:** 14 neue/modifizierte Dateien
**Analogs found:** 13 / 14

---

## File Classification

| Neue/modifizierte Datei | Rolle | Data Flow | Nächster Analog | Match-Qualität |
|-------------------------|-------|-----------|-----------------|----------------|
| `frontend/src/components/admin/media/MediaOwnershipContext.tsx` | component | request-response | `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` | role-match (FormField+Select+Badge+Card-Muster) |
| `frontend/src/components/admin/media/MediaOwnershipContext.module.css` | config/style | — | `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.module.css` | role-match |
| `frontend/src/components/admin/media/mediaStatusMapping.ts` | utility | transform | `frontend/src/types/releaseVersionMedia.ts` (Enum+Label-Konstanten) | role-match |
| `frontend/src/components/admin/MediaUpload.tsx` (Split) | component | request-response | sich selbst (540 Z. → ≤450 Z. splitten) | exact |
| `frontend/src/components/admin/MediaUploadCore.tsx` (neu nach Split) | component | file-I/O | `frontend/src/components/admin/MediaUpload.tsx` Z. 204–540 | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx` | component | file-I/O | `frontend/src/components/admin/MediaUpload.tsx` | role-match |
| `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx` | component | file-I/O | `frontend/src/components/admin/MediaUpload.tsx` | role-match |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` | component | file-I/O | sich selbst | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` | hook | CRUD | sich selbst | exact |
| `frontend/src/app/me/profile/components/MemberAvatarCard.tsx` | component | file-I/O | `frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx` | exact |
| `frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx` | component | file-I/O | `frontend/src/app/me/profile/components/MemberAvatarCard.tsx` | exact |
| `frontend/src/lib/api.ts` (Upload-Helfer erweitern) | utility | request-response | sich selbst (bestehende Helfer) | exact |
| `shared/contracts/openapi.yaml` (Request-Body-Erweiterung) | config | — | sich selbst (bestehende multipart/form-data Schemas) | exact |
| `backend/internal/models/media.go` | model | — | sich selbst | exact |
| `backend/internal/repository/media_repository.go` + `release_version_media_repository.go` | repository | CRUD | sich selbst (bestehende UPDATE-Pfade mit Code-Lookup) | exact |
| `backend/internal/handlers/fansub_media_upload.go` | handler | request-response | sich selbst | exact |
| `backend/internal/handlers/admin_content_release_version_media.go` | handler | request-response | sich selbst (`processOneRVMFile`) | exact |
| `backend/internal/handlers/admin_content_release_theme_assets.go` | handler | request-response | `backend/internal/handlers/fansub_media_upload.go` | role-match |

---

## Pattern Assignments

### `frontend/src/components/admin/media/MediaOwnershipContext.tsx` (component, request-response)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx`

**Imports-Muster** (Zeilen 1–17 des Analogs):
```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { Save } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  SectionHeader,
  Select,
  Toolbar,
} from '@/components/ui'
```

**Owner-Chip + FormField+Select-Muster** (Zeilen 170–205 des Analogs):
```tsx
{!item.owner_consistent ? (
  <div className={styles.ownerFlagRow}>
    <Badge variant="warning">Owner-Zuordnung prüfen</Badge>
  </div>
) : null}

<div className={styles.mediaCardBody}>
  <FormField label="Sichtbarkeit">
    <Select
      value={draft.visibility}
      onChange={(e) =>
        setDraftField(item.id, 'visibility', e.target.value as FansubMediaVisibility)
      }
    >
      <option value="intern">Intern</option>
      <option value="oeffentlich">Öffentlich</option>
    </Select>
  </FormField>

  <FormField label="Prüfstatus">
    <Select
      value={draft.review_status}
      onChange={(e) =>
        setDraftField(item.id, 'review_status', e.target.value as FansubMediaReviewStatus)
      }
    >
      <option value="in_pruefung">In Prüfung</option>
      <option value="freigegeben">Freigegeben</option>
    </Select>
  </FormField>
</div>
```

**ErrorState-Muster bei fehlendem Kontext** (Zeilen 139–141 des Analogs):
```tsx
if (loadError) {
  return <ErrorState title="Fehler beim Laden" description={loadError} />
}
```

**EmptyState-Muster** (Zeilen 158–162 des Analogs):
```tsx
<EmptyState
  title="Keine Medien vorhanden"
  description="Für diese Gruppe sind noch keine Medien angelegt."
/>
```

**Callback-Muster für `onContextChange`:** Orientiert sich am Callback-Delegations-Muster aus `MemberAvatarCard.tsx` Z. 16:
```tsx
onAvatarSelected: (payload: { sourceFile: File; croppedFile: File }) => Promise<void> | void
```
Für Phase 79 entsprechend:
```tsx
onContextChange: (ctx: { ownerResolved: boolean; visibilityCode: string; reviewStatusCode: string; categoryValue: string }) => void
```

**D-06-Guard-Muster — Owner-Blockierung VOR Upload:**
Analog: `MemberAvatarCard.tsx` Z. 112–124 (`if (!canUpload || isUploading) return`).
Für Phase 79 entsprechend:
```tsx
if (!ownerID || ownerID <= 0) {
  // Zeigt ErrorState statt Formular; kein authorizedUploadXhr-Aufruf
  return <ErrorState title="Upload nicht möglich" description="Dieser Upload-Bereich hat keinen gültigen Owner-Kontext. Bitte lade die Seite neu oder öffne den Upload erneut aus dem zugehörigen Bereich." />
}
```

---

### `frontend/src/components/admin/media/mediaStatusMapping.ts` (utility, transform)

**Analog:** Kein direkter Analog im Codebase für Zwei-Achsen-Mapping. Strukturell am nächsten: `frontend/src/types/releaseVersionMedia.ts` (exportierte Enum-Konstanten + Label-Maps).

**Muster aus `RELEASE_VERSION_MEDIA_CATEGORIES` / `CATEGORY_LABELS`** (Zeilen 8–10 in `ReleaseVersionMediaSection.tsx`):
```tsx
import {
  CATEGORY_ALLOWS_PREVIEW,
  CATEGORY_LABELS,
  RELEASE_VERSION_MEDIA_CATEGORIES,
  ReleaseVersionMediaCategory,
} from '@/types/releaseVersionMedia'
```

**Neues Mapping — kein Analog nötig, aus D-02 direkt ableiten:**
```ts
export type StatusLabel =
  | 'öffentlich'
  | 'intern'
  | 'in Prüfung'
  | 'abgelehnt'
  | 'archiviert'
  | 'entfernt'

export interface StatusAxes {
  visibilityCode: string   // 'public' | 'private' | ...
  reviewStatusCode: string // 'approved' | 'in_review' | ...
}

export const STATUS_LABEL_MAPPING: Record<StatusLabel, StatusAxes> = {
  'öffentlich':  { visibilityCode: 'public',  reviewStatusCode: 'approved'  },
  'intern':      { visibilityCode: 'private', reviewStatusCode: 'approved'  },
  'in Prüfung':  { visibilityCode: 'private', reviewStatusCode: 'in_review' },
  'abgelehnt':   { visibilityCode: 'private', reviewStatusCode: 'rejected'  },
  'archiviert':  { visibilityCode: 'private', reviewStatusCode: 'archived'  },
  'entfernt':    { visibilityCode: 'private', reviewStatusCode: 'removed'   },
}

export const STATUS_LABELS_ORDERED: StatusLabel[] = [
  'intern', 'in Prüfung', 'öffentlich', 'abgelehnt', 'archiviert', 'entfernt',
]
```

---

### `frontend/src/components/admin/MediaUpload.tsx` (Split auf ≤450 Z.)

**Analog:** sich selbst — Zeilen 1–203 bleiben in `MediaUpload.tsx` (Koordinator, Props, Utility-Funktionen, Owner-Kontext-Einbindung), Zeilen 204–540 werden in `MediaUploadCore.tsx` ausgelagert.

**Props-Interface** (Zeilen 24–33 der aktuellen Datei):
```tsx
interface MediaUploadProps {
  type: FansubMediaKind
  fansubID: number
  groupName: string
  value: EditableMediaValue | null
  disabled?: boolean
  onBusyChange?: (isBusy: boolean) => void
  onChange: (nextValue: EditableMediaValue | null) => void
  [compatProp: string]: unknown
}
```

**Upload-Trigger `submitUpload`** (Zeilen 235–271 der aktuellen Datei):
```tsx
const submitUpload = async (file: File) => {
  setError(null)
  setWarning(null)
  setBusyAction('upload')
  setProgress(0)

  try {
    const response = await uploadFansubMedia({
      fansubID,
      kind: type,
      file,
      onProgress: setProgress,
    })
    // ...onChange(...)
  } catch (nextError) {
    setError(readErrorMessage(nextError, 'Upload fehlgeschlagen.'))
  } finally {
    setBusyAction(null)
    setProgress(0)
  }
}
```

Nach Phase 79 wird dieser Aufruf um `visibilityCode`/`reviewStatusCode` aus dem `MediaOwnershipContext`-Callback erweitert:
```tsx
const response = await uploadFansubMedia({
  fansubID,
  kind: type,
  file,
  visibilityCode: ownerCtx.visibilityCode,    // aus MediaOwnershipContext
  reviewStatusCode: ownerCtx.reviewStatusCode, // aus MediaOwnershipContext
  onProgress: setProgress,
})
```

---

### `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx` (Surface 3)

**Analog:** `frontend/src/components/admin/MediaUpload.tsx` (Upload-Trigger-Muster)

**Bestehender Upload-Trigger** (Zeilen 92–112):
```tsx
async function handleUpload() {
  if (!file || !themeID || !hasAccessToken) return
  setBusy(true)
  setError(null)
  try {
    await uploadAdminReleaseThemeAsset({
      fansubID,
      animeID,
      themeID,
      file,
      onProgress: setProgress,
    })
    await reloadAssets()
    setFile(null)
    setProgress(100)
  } catch (uploadError) {
    setError(uploadError instanceof Error ? uploadError.message : 'Upload fehlgeschlagen.')
  } finally {
    setBusy(false)
  }
}
```

Nach Phase 79 wird `uploadAdminReleaseThemeAsset` um `visibilityCode`/`reviewStatusCode` erweitert (aus `MediaOwnershipContext` über Callback).

**Natives `<select>` muss auf globales `Select`-Primitive umgestellt werden** (Zeile 119 — Verstoß gegen CLAUDE.md):
```tsx
// VORHER (Zeile 119) — verboten:
<select className={styles.select} value={themeID} onChange={...}>

// NACHHER — Pflicht:
<Select value={String(themeID)} onChange={(e) => setThemeID(Number(e.target.value))}>
```

**Natives `<input>` muss auf `Input`-Primitive umgestellt werden** (Zeile 131):
```tsx
// VORHER — verboten:
<input type="file" accept="video/*" onChange={...} />

// NACHHER:
// Datei-Input bleibt nativ (hidden), da kein @/components/ui-Primitive für file inputs
// Die sichtbare Aktionsfläche nutzt Button-Primitive
```

---

### `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` + `useReleaseVersionMedia.ts` (Surface 4)

**Analog:** sich selbst

**Bestehender Kategorie-Dropdown-State** (Zeilen 80–85 der Section):
```tsx
const [selectedCategory, setSelectedCategory] = useState<ReleaseVersionMediaCategory | ''>('')
```

**Bestehender Upload-Aufruf** (Zeilen 185–197):
```tsx
async function handleUploadClick() {
  if (!selectedCategory || selectedFiles.length === 0) {
    return
  }
  await media.startUpload(
    selectedCategory,
    selectedFiles,
    defaultCaption,
    canShowPreviewToggle ? isPreviewCandidate : false,
  )
  setSelectedFiles([])
}
```

Nach Phase 79: `startUpload` in `useReleaseVersionMedia.ts` bekommt zusätzlich `visibilityCode`/`reviewStatusCode` (aus `MediaOwnershipContext`), die an `uploadReleaseVersionMedia` weitergegeben werden.

**Hook-Signatur** (`useReleaseVersionMedia.ts` Zeilen 41–46):
```ts
startUpload: (
  category: ReleaseVersionMediaCategory,
  files: File[],
  defaultCaption?: string,
  isPreviewCandidate?: boolean,
) => Promise<void>
```
Nach Phase 79 — erweitertes Interface:
```ts
startUpload: (
  category: ReleaseVersionMediaCategory,
  files: File[],
  defaultCaption?: string,
  isPreviewCandidate?: boolean,
  visibilityCode?: string,    // NEU
  reviewStatusCode?: string,  // NEU
) => Promise<void>
```

---

### `frontend/src/app/me/profile/components/MemberAvatarCard.tsx` + `ProfileBackgroundCard.tsx` (Surface 5)

**Analog:** gegenseitig (beide bereits nahezu identisch strukturiert)

**Gemeinsames Muster: Capability-Gate + Callback-Delegation** (`MemberAvatarCard.tsx` Zeilen 86–88, 112–124):
```tsx
const canUpload = profile.capabilities.can_upload_own_avatar

async function handleSelectedFile(file: File) {
  if (!canUpload || isUploading) return
  setLocalError(null)
  // ... Crop-Logik oder direkt:
  try {
    await onAvatarSelected({ sourceFile: file, croppedFile: file })
  } catch (error) {
    setLocalError(error instanceof Error ? error.message : 'Avatar-Bild konnte nicht hochgeladen werden.')
  }
}
```

**`Button`-Primitive bereits vorhanden** (Zeilen 135–145):
```tsx
<Button
  type="button"
  variant="secondary"
  leftIcon={<ImageUp size={16} aria-hidden="true" />}
  loading={isUploading}
  disabled={isUploading || isPreparingExistingAvatar || !canUpload}
  onClick={() => inputRef.current?.click()}
>
  {isUploading ? 'Bild lädt...' : avatarURL ? 'Bild ändern' : 'Bild hochladen'}
</Button>
```

**Fehlerzustand** (Zeile 175):
```tsx
{localError ? <p role="alert" className={styles.inlineError}>{localError}</p> : null}
```

Nach Phase 79: Der Upload-Aufruf in der aufrufenden Page (`me/profile/page.tsx`) wird um `visibilityCode: 'public', reviewStatusCode: 'approved'` erweitert (Branding-Slots-Sonderregel D-09). Die Cards selbst delegieren weiterhin via Callback.

---

### `frontend/src/lib/api.ts` — Upload-Helfer-Erweiterungen

**Analog:** sich selbst — alle 4 bestehenden Upload-Helfer folgen dem exakt gleichen Muster

**Muster für `uploadFansubMedia`** (Zeilen 2253–2273):
```ts
export async function uploadFansubMedia(
  options: FansubMediaUploadOptions,
): Promise<FansubMediaUploadResponse> {
  if (typeof window === "undefined") {
    throw new ApiError(500, "Upload ist nur im Browser verfügbar.");
  }
  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/admin/fansubs/${options.fansubID}/media`;
  return authorizedUploadXhr<FansubMediaUploadResponse>({
    endpoint,
    onProgress: options.onProgress,
    retryEligibility: "never",
    buildBody: () => {
      const body = new FormData();
      body.set("kind", options.kind);
      body.set("file", options.file);
      return body;
    },
  });
}
```

Nach Phase 79 — Erweiterungsmuster (Option-Interface + buildBody):
```ts
interface FansubMediaUploadOptions {
  fansubID: number;
  kind: FansubMediaKind;
  file: File;
  onProgress?: (percent: number) => void;
  visibilityCode?: string;    // NEU — optional; Default im Backend gesetzt
  reviewStatusCode?: string;  // NEU — optional; Default im Backend gesetzt
}

buildBody: () => {
  const body = new FormData();
  body.set("kind", options.kind);
  body.set("file", options.file);
  if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
  if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
  return body;
},
```

**Muster für `uploadAdminAnimeMedia`** (Zeilen 4218–4240):
```ts
export async function uploadAdminAnimeMedia(
  options: AdminAnimeMediaUploadOptions,
): Promise<AdminMediaUploadResponse> {
  // ...
  buildBody: () => {
    const body = new FormData();
    body.set("entity_type", "anime");
    body.set("entity_id", String(options.animeID));
    body.set("asset_type", options.assetType);
    body.set("file", options.file);
    return body;
  },
}
```
Erweiterung analog zu `uploadFansubMedia` oben.

**Muster für `uploadAdminReleaseThemeAsset`** (Zeilen 4421–4441):
```ts
buildBody: () => {
  const body = new FormData();
  body.set("theme_id", String(options.themeID));
  body.set("file", options.file);
  return body;
},
```

**Muster für `uploadReleaseVersionMedia`** (Zeilen 6255–6279):
```ts
buildBody: () => {
  const body = new FormData();
  body.set("category", options.category);
  for (const file of options.files) {
    body.append("files[]", file);
  }
  return body;
},
```

---

### `shared/contracts/openapi.yaml` — Request-Body-Erweiterungen

**Analog:** sich selbst

**Bestehendes Schema `uploadFansubMedia`** (Zeilen 3488–3500):
```yaml
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        required: [kind, file]
        properties:
          kind:
            $ref: "#/components/schemas/FansubMediaKind"
          file:
            type: string
            format: binary
```

Nach Phase 79 — Erweiterungsmuster:
```yaml
        properties:
          kind:
            $ref: "#/components/schemas/FansubMediaKind"
          file:
            type: string
            format: binary
          visibility_code:
            type: string
            nullable: true
            description: "Sichtbarkeits-Code (z.B. 'public', 'private'). Default im Backend: 'public' für Branding-Slots."
          review_status_code:
            type: string
            nullable: true
            description: "Reviewstatus-Code (z.B. 'approved', 'in_review'). Default im Backend: 'approved' für Branding-Slots."
```

**Bestehendes Schema `uploadReleaseVersionMedia`** (Zeilen 5150–5174):
```yaml
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        required:
          - category
          - files[]
        properties:
          category:
            $ref: "#/components/schemas/ReleaseVersionMediaCategory"
          caption:
            type: string
            nullable: true
          is_preview_candidate:
            type: boolean
            default: false
          files[]:
            type: array
            ...
```
Erweiterung: `visibility_code` + `review_status_code` als optionale properties hinzufügen; kein required.

---

### `backend/internal/models/media.go` — `MediaAssetCreateInput`

**Analog:** sich selbst (Zeilen 28–37):
```go
type MediaAssetCreateInput struct {
    Kind        MediaKind
    Filename    string
    StoragePath string
    PublicURL   string
    MimeType    string
    SizeBytes   int64
    Width       *int
    Height      *int
}
```

Nach Phase 79 — Erweiterung:
```go
type MediaAssetCreateInput struct {
    Kind               MediaKind
    Filename           string
    StoragePath        string
    PublicURL          string
    MimeType           string
    SizeBytes          int64
    Width              *int
    Height             *int
    VisibilityCode     *string  // NEU — z.B. "public", "private"; nil = Backend-Default
    ReviewStatusCode   *string  // NEU — z.B. "approved", "in_review"; nil = Backend-Default
}
```

---

### `backend/internal/repository/media_repository.go` + `release_version_media_repository.go`

**Analog:** sich selbst — bestehende UPDATE-Pfade mit Code-Lookup zeigen das exakte Muster

**Bestehender Code-Lookup-Muster für `UPDATE`** (media_repository.go Zeilen 522–527):
```go
tag, err := r.db.Exec(ctx, `
    UPDATE media_assets ma
    SET
        visibility_id    = (SELECT id FROM visibilities WHERE name = $1 LIMIT 1),
        review_status_id = (SELECT id FROM review_statuses WHERE code = $2 LIMIT 1)
    WHERE ma.id = $3
    ...
`, visibilityCode, reviewStatusCode, assetID, ...)
```

Dieses Muster wird für INSERT in `CreateMediaAsset` übernommen. Die bestehende `CreateMediaAsset`-Funktion (Zeilen 93–146) führt heute keinen `visibility_id`/`review_status_id`-INSERT durch. Der INSERT erweitert sich wie folgt:

**Vorhandener INSERT** (media_repository.go Zeile 123–127):
```go
if err := r.db.QueryRow(ctx, `
    INSERT INTO media_assets (media_type_id, file_path, mime_type, format, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING id, file_path, mime_type, created_at
`, mediaTypeID, storagePath, input.MimeType, mediaFormatForKind(input.Kind)).Scan(...)
```

Nach Phase 79 — erweiterter INSERT (wenn VisibilityCode/ReviewStatusCode gesetzt):
```go
// Analog zum UPDATE-Pattern in media_repository.go Z. 522–527:
INSERT INTO media_assets (
    media_type_id, file_path, mime_type, format,
    visibility_id, review_status_id,
    created_at
)
VALUES (
    $1, $2, $3, $4,
    (SELECT id FROM visibilities WHERE name = $5 LIMIT 1),
    (SELECT id FROM review_statuses WHERE code = $6 LIMIT 1),
    NOW()
)
RETURNING id, file_path, mime_type, created_at
```

**`CreateMediaAssetWithStatusTx`** (release_version_media_repository.go Zeilen 121–154) wird analog erweitert.

---

### `backend/internal/handlers/fansub_media_upload.go`

**Analog:** sich selbst

**Bestehender FormData-Parse** (Zeilen 43–47):
```go
kind, err := parseMediaKind(c.PostForm("kind"))
if err != nil {
    badRequest(c, "ungültiger media-kind")
    return
}
```

**Neues Lese-Muster nach Phase 79** (Einfügen nach Zeile 47):
```go
visibilityCode := strings.TrimSpace(c.PostForm("visibility_code"))
reviewStatusCode := strings.TrimSpace(c.PostForm("review_status_code"))

// D-09: Branding-Slot-Default sofort sichtbar/freigegeben
if visibilityCode == "" {
    visibilityCode = "public"
}
if reviewStatusCode == "" {
    reviewStatusCode = "approved"
}
```

**Analog für Weitergabe an `CreateInput`:** Die `createInput`-Erstellung in `saveFansubMediaUpload` (Zeile 103, via `mediaService.SaveUpload`) muss `VisibilityCode`/`ReviewStatusCode` aus dem Handler bekommen. Das erfordert, dass `readFansubMediaUpload`/`storeFansubMediaUpload` diese Werte als Parameter erhalten.

**Fehlermuster bei ungültigem Code** (analog zu `parseMediaKind` Zeile 43–46):
```go
validCodes := map[string]bool{"public": true, "private": true, "registered": true, "fansubber": true, "staff": true}
if !validCodes[visibilityCode] {
    badRequest(c, "ungültiger visibility_code")
    return
}
```

---

### `backend/internal/handlers/admin_content_release_version_media.go`

**Analog:** sich selbst

**`processOneRVMFile` Signatur** (Zeilen 265–272):
```go
func (h *AdminContentHandler) processOneRVMFile(
    c *gin.Context,
    fileHeader *multipart.FileHeader,
    versionID int64,
    category string,
    sortOrder int,
    uploadedByUserID int64,
) rvmFileResult {
```

Nach Phase 79 — Signatur-Erweiterung:
```go
func (h *AdminContentHandler) processOneRVMFile(
    c *gin.Context,
    fileHeader *multipart.FileHeader,
    versionID int64,
    category string,
    sortOrder int,
    uploadedByUserID int64,
    visibilityCode string,    // NEU
    reviewStatusCode string,  // NEU
) rvmFileResult {
```

**`CreateMediaAssetWithStatusTx`-Aufruf** (Zeile 397):
```go
mediaAsset, err := h.mediaRepo.CreateMediaAssetWithStatusTx(ctx, tx, createInput, "processing")
```

`createInput` (Zeilen 387–395) bekommt nach Phase 79:
```go
createInput := models.MediaAssetCreateInput{
    Kind:             models.MediaKindImage,
    MimeType:         mimeType,
    Filename:         "original." + ext,
    StoragePath:      originalPath,
    SizeBytes:        int64(len(data)),
    Width:            &meta.Width,
    Height:           &meta.Height,
    VisibilityCode:   &visibilityCode,     // NEU
    ReviewStatusCode: &reviewStatusCode,   // NEU
}
```

---

## Shared Patterns

### Authentifizierung + 401-Retry (alle Upload-Surfaces)

**Quelle:** `frontend/src/lib/api.ts` Zeilen 2179–2251

Alle Upload-Helfer rufen `authorizedUploadXhr` auf, das intern:
1. `ensureFreshRuntimeSession()` aufruft
2. Token via `resolveAuthToken()` holt
3. Bei 401 + gültigem Refresh-Token einmalig retried

**Kein neuer Transport** (Lock G). Der einzige Änderungsort ist `buildBody()` in jedem Helfer.

```ts
return authorizedUploadXhr<T>({
  endpoint,
  onProgress: options.onProgress,
  retryEligibility: "never",
  buildBody: () => {
    const body = new FormData();
    // ... bestehende Felder ...
    if (options.visibilityCode) body.set("visibility_code", options.visibilityCode);
    if (options.reviewStatusCode) body.set("review_status_code", options.reviewStatusCode);
    return body;
  },
});
```

---

### Fehlerbehandlung Frontend (alle Surfaces)

**Quelle:** `frontend/src/components/admin/MediaUpload.tsx` Zeilen 45–53

```tsx
function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return `(${error.status}) ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return fallback
}
```

Identisches Muster in `GroupMediaReviewSection.tsx` Zeilen 41–45 und `useReleaseVersionMedia.ts` Zeilen 77–80.

Fehleranzeige-Primitives:
- Im JSX: `<ErrorState title="…" description={error} />` (aus `@/components/ui`)
- Als Inline-Alert: `<p role="alert" className={styles.inlineError}>{error}</p>`

---

### Fehlerbehandlung Backend — Go (alle Handler)

**Quelle:** `backend/internal/handlers/fansub_media_upload.go` Zeilen 104–115

```go
if err != nil {
    var validationErr *services.MediaValidationError
    if errors.As(err, &validationErr) {
        badRequest(c, validationErr.Message)
        return nil, false
    }
    log.Printf("fansub media upload: save upload failed (user_id=%d, fansub_id=%d): %v", userID, fansubID, err)
    c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "upload fehlgeschlagen"}})
    return nil, false
}
```

**Ungültige Code-Strings:** `badRequest(c, "ungültiger visibility_code")` — analog zu `badRequest(c, "ungültiger media-kind")` Zeile 45.

---

### Capability-Gate-Muster (alle Surfaces)

**Quelle:** `backend/internal/handlers/fansub_media_upload.go` Zeilen 18–37

```go
identity, actor, ok := permissionActorFromContext(c)
if !ok {
    return
}
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, permissions.ActionFansubGroupEdit, fansubID)
if err != nil {
    writePermissionInternalError(c, err, "Fansub-Media-Berechtigung konnte nicht geprüft werden.")
    return
}
if !result.Allowed {
    auditPermissionDenied(...)
    writePermissionDenied(c, result)
    return
}
```

Dieses Muster ist für alle 5 Upload-Handler identisch — kein neues Capability-System nötig.

---

### Code-Lookup-Muster Backend (repository)

**Quelle:** `backend/internal/repository/media_repository.go` Zeilen 522–527 und 548–550

```go
visibility_id    = (SELECT id FROM visibilities WHERE name = $1 LIMIT 1),
review_status_id = (SELECT id FROM review_statuses WHERE code = $2 LIMIT 1)
```

Dieses Sub-SELECT-Muster wird im INSERT in `CreateMediaAsset` und `CreateMediaAssetWithStatusTx` übernommen. Es vermeidet BIGSERIAL-ID-Hardcoding (RESEARCH Pitfall 1).

---

### Deutsche Umlaute + UI-Primitives (alle neuen UI-Dateien)

**Quelle:** CLAUDE.md, 79-UI-SPEC.md

- Alle user-facing Strings deutsch mit Umlauten (ä/ö/ü/ß)
- Pflicht: `Select`, `FormField`, `Badge`, `Card`, `ErrorState`, `EmptyState`, `Button`, `Textarea`, `Input` aus `@/components/ui`
- Verboten: natives `<select>`, `<input>`, `<textarea>` in user-facing Flächen
- `ReleaseThemeAssetsSection.tsx` Zeile 119 und 131 müssen beim Einbinden der gemeinsamen Komponente auf Primitives migriert werden

---

## No Analog Found

| Datei | Rolle | Data Flow | Grund |
|-------|-------|-----------|-------|
| `frontend/src/components/admin/media/MediaOwnershipContext.module.css` | config/style | — | Kein direktes CSS-Modul für Owner-Kontext-Karte vorhanden; am nächsten: `GroupMediaReviewSection.module.css` (existiert, aber nicht gelesen — Planner liest bei Bedarf) |

---

## Metadata

**Analog-Suchbereich:** `frontend/src/`, `backend/internal/handlers/`, `backend/internal/repository/`, `backend/internal/models/`, `shared/contracts/`
**Gelesene Dateien:** 18
**Pattern-Extraktions-Datum:** 2026-06-06
