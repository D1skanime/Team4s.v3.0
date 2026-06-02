# Phase 70: TipTap-Bilder fuer Member-Profilgeschichte - Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 11 new/modified files
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/handlers/app_profile_story_image.go` (NEU) | handler | request-response (file upload) | `app_profile.go` lines 338-497 (`UploadOwnProfileAvatar`) | exact |
| `backend/internal/services/tiptap_service.go` (MODIFY) | service | transform | `tiptap_service.go` selbst — bestehende `case`-Patterns + bluemonday-Policy | exact (self-analog) |
| `backend/internal/services/media_service.go` (reuse only) | service | file-I/O | `admin_content_release_version_media.go` Pixel-Bomb-Guard + `app_profile.go` MIME-Detect | role-match |
| `database/migrations/0089_member_story_images.{up,down}.sql` (NEU) | migration | CRUD | `database/migrations/0088_anime_contributions_constraints.up.sql` | exact |
| `backend/internal/models/member_profile.go` (MODIFY) | model | — | selbe Datei — `MemberProfileAvatarUploadInput` als Vorbild fuer `StoryImageUploadInput` | exact (self-analog) |
| `backend/internal/repository/member_profile_repository.go` (MODIFY) | repository | CRUD | selbe Datei + `media_upload.go`-Handler-Muster fuer Delete-Pfad | role-match |
| `frontend/src/components/editor/StoryImageExtension.ts` (NEU) | component / editor extension | event-driven | `frontend/src/components/editor/ColorTokenExtension.ts` | exact |
| `frontend/src/components/editor/StoryImageNodeView.tsx` (NEU) | component | event-driven | `RichTextEditor.tsx` EditorToolbar-Pattern + bestehende toolbarBtn-Konventionen | role-match |
| `frontend/src/components/editor/RichTextEditor.tsx` (MODIFY) | component | event-driven | sich selbst — Extensions-Array + Props-Muster | exact (self-analog) |
| `frontend/src/components/editor/RichTextRenderer.tsx` (MODIFY) | component | request-response | sich selbst — `dangerouslySetInnerHTML` passthrough | exact (self-analog) |
| `frontend/src/lib/storyImageUpload.ts` (NEU) | utility | batch / transform | `api.ts` `authorizedUploadXhr` + FormData-Pattern (`uploadFansubMedia`, `uploadAdminAnimeMedia`) | role-match |
| `frontend/src/app/me/profile/page.tsx` (MODIFY) | route/page | request-response | sich selbst — `handleSubmit` lines 249-280 | exact (self-analog) |
| `frontend/src/app/me/profile/components/ProfileStoryCard.tsx` (MODIFY) | component | event-driven | sich selbst — Props-Muster, `RichTextEditor`-Integration | exact (self-analog) |
| `frontend/src/app/me/profile/components/profileFormTypes.ts` (MODIFY) | utility / type | — | sich selbst — `MemberProfileFormState` | exact (self-analog) |

---

## Pattern Assignments

### `backend/internal/handlers/app_profile_story_image.go` (NEU — handler, request-response)

**Analog:** `backend/internal/handlers/app_profile.go` lines 338-497 (`UploadOwnProfileAvatar`) und lines 745-755 (`cleanupPreviousAvatarFiles`)

**Warum split:** `app_profile.go` hat 906 Zeilen und ueberschreitet das 450-Zeilen-Limit aus CLAUDE.md bereits deutlich. Der neue Handler und alle Story-Image-Helpers gehoeren ausschliesslich in `app_profile_story_image.go`. Die Methode bleibt auf `*AppAuthHandler`.

**Imports pattern** (aus `app_profile.go` lines 1-25):
```go
package handlers

import (
    "context"
    "encoding/json"
    "fmt"
    "image"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "strings"

    "team4s.v3/backend/internal/middleware"
    "team4s.v3/backend/internal/models"
    "team4s.v3/backend/internal/repository"

    "github.com/disintegration/imaging"
    "github.com/gabriel-vasile/mimetype"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)
```

**Auth/Guard pattern** (aus `app_profile.go` lines 339-351):
```go
func (h *AppAuthHandler) UploadOwnProfileStoryImage(c *gin.Context) {
    identity, ok := middleware.CommentAuthIdentityFromContext(c)
    if !ok {
        c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
        return
    }
    if h.profileRepo == nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"message": "interner serverfehler"}})
        return
    }
    if strings.TrimSpace(identity.AppUserStatus) == models.AppUserStatusDisabled {
        c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "deaktivierte benutzer dürfen keine story-bilder hochladen"}})
        return
    }
    // ...
}
```

**MIME-Validierungs- und Size-Check-Pattern** (aus `app_profile.go` lines 51-56, 817-844):
```go
// Eigene MIME-Allowlist fuer Story-Bilder (kein GIF — D-16):
var storyImageAllowedMimeTypes = map[string]bool{
    "image/jpeg": true,
    "image/png":  true,
    "image/webp": true,
}
// Groessen-Limit D-17:
const storyImageMaxSize = 10 * 1024 * 1024 // 10 MB

// Detect-Funktion (analog detectAvatarImage, app_profile.go:817):
func detectStoryImage(file multipart.File, size int64) (string, int, int, string, error) {
    if size <= 0 {
        return "", 0, 0, "", fmt.Errorf("bild-datei ist leer")
    }
    if size > storyImageMaxSize {
        return "", 0, 0, "", fmt.Errorf("story-bild ist zu groß (max 10 MB)")
    }
    detectedMime, err := mimetype.DetectReader(file)
    if err != nil {
        return "", 0, 0, "", fmt.Errorf("bild-typ konnte nicht erkannt werden")
    }
    mimeType := strings.ToLower(strings.TrimSpace(detectedMime.String()))
    if !storyImageAllowedMimeTypes[mimeType] {
        return "", 0, 0, "", fmt.Errorf("nur jpg, png und webp sind erlaubt")
    }
    if _, err := file.Seek(0, 0); err != nil {
        return "", 0, 0, "", fmt.Errorf("bild konnte nicht vorbereitet werden")
    }
    cfg, _, err := image.DecodeConfig(file)
    if err != nil {
        return "", 0, 0, "", fmt.Errorf("bild konnte nicht gelesen werden")
    }
    if cfg.Width <= 0 || cfg.Height <= 0 {
        return "", 0, 0, "", fmt.Errorf("bild ist ungültig")
    }
    return mimeType, cfg.Width, cfg.Height, imageExtFromMime(mimeType), nil
}
```

**Pixel-Bomb-Guard pattern** (aus `admin_content_release_version_media.go` line 317):
```go
// Nach image.DecodeConfig: Pixelzahl-Limit 40 MP
if cfg.Width*cfg.Height > 40_000_000 {
    c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "bild enthält zu viele pixel (max 40 MP)"}})
    return
}
```

**Core upload + path-construction + EXIF-Strip pattern** (aus `app_profile.go` lines 401-434):
```go
// Profil laden (fuer MemberID):
profile, err := h.profileRepo.GetOwnProfile(c.Request.Context(), identity.AppUserID)

// UUID-basierter Pfad:
mediaID := uuid.New().String()
relativeDir := fmt.Sprintf("/media/profile/%d/story/%s", profile.MemberID, mediaID)
filename := "original." + ext
relativePath := relativeDir + "/" + filename
absoluteDir := filepath.Join(h.mediaStorageDir, "profile",
    fmt.Sprintf("%d", profile.MemberID), "story", mediaID)
absolutePath := filepath.Join(absoluteDir, filename)

if err := os.MkdirAll(absoluteDir, 0755); err != nil {
    writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Bild-Verzeichnis konnte nicht erstellt werden.")
    return
}

// Resize auf max. 1600px Breite + EXIF-Strip via imaging.Save:
if _, err := file.Seek(0, 0); err != nil { /* ... */ }
img, _, err := image.Decode(file)
if err != nil {
    _ = os.RemoveAll(absoluteDir)
    c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "bild konnte nicht gelesen werden"}})
    return
}
if cfg.Width > 1600 {
    img = imaging.Resize(img, 1600, 0, imaging.Lanczos)
}
if err := imaging.Save(img, absolutePath); err != nil { // EXIF-Strip automatisch
    _ = os.RemoveAll(absoluteDir)
    writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Bild konnte nicht gespeichert werden.")
    return
}
```

**Path-Traversal-Guard** (aus `media_upload.go` lines 226-232, via `app_profile.go` lines 752, 764):
```go
// Sicherheits-Check vor jedem os.RemoveAll:
if ok, err := isUploadPathWithinBase(mediaStorageDir, targetDir); err == nil && ok {
    _ = os.RemoveAll(targetDir)
}
// isUploadPathWithinBase ist in media_upload.go definiert — direkt aus demselben Package nutzbar.
```

**Audit-Log pattern** (aus `app_profile.go` lines 476-494):
```go
if h.auditLogRepo != nil {
    actorAppUserID := identity.AppUserID
    actorLegacyUserID := identity.UserID
    memberID := profile.MemberID
    _ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
        ActorAppUserID:    &actorAppUserID,
        ActorLegacyUserID: &actorLegacyUserID,
        EventType:         "member_profile.story_image.uploaded",
        ScopeType:         "member_profile",
        ScopeID:           &memberID,
        TargetType:        "member",
        TargetID:          &memberID,
        Action:            "member_profile.story_image.upload",
        Outcome:           "success",
        Payload: map[string]any{
            "mime_type":      mimeType,
            "size_bytes":     sizeBytes,
            "media_asset_id": newAssetID,
        },
    })
}
c.JSON(http.StatusCreated, gin.H{"data": gin.H{
    "media_asset_id": newAssetID,
    "public_url":     strings.TrimRight(h.mediaBaseURL, "/") + relativePath,
}})
```

**Cleanup-on-Save helper** (analog `cleanupPreviousAvatarFiles`, `app_profile.go` lines 745-755):
```go
// cleanupStoryImageAsset loescht Datei + Verzeichnis fuer ein einzelnes Asset.
// Wird von UpdateOwnProfile nach dem Referenz-Diff aufgerufen.
func cleanupStoryImageAsset(mediaStorageDir string, storagePath string) {
    if strings.TrimSpace(storagePath) == "" {
        return
    }
    trimmed := strings.TrimPrefix(strings.TrimSpace(storagePath), "/")
    trimmed = strings.TrimPrefix(trimmed, "media/")
    targetDir := filepath.Dir(filepath.Join(mediaStorageDir, trimmed))
    if ok, err := isUploadPathWithinBase(mediaStorageDir, targetDir); err == nil && ok {
        _ = os.RemoveAll(targetDir)
    }
}
```

---

### `backend/internal/services/tiptap_service.go` (MODIFY — service, transform)

**Analog:** Die Datei selbst. Alle neuen Additions folgen dem exakt gleichen Muster wie die bestehenden Nodes.

**Allowlist-Erweiterung** (bestehend lines 37-42, NEU: eine Zeile ergaenzen):
```go
var allowedTipTapNodes = map[string]bool{
    "doc": true, "paragraph": true, "text": true,
    "heading": true, "bulletList": true, "orderedList": true,
    "listItem": true, "blockquote": true, "horizontalRule": true,
    "table": true, "tableRow": true, "tableCell": true, "tableHeader": true,
    // NEU Phase 70:
    "image": true,
}
```

**validateNode image-case** (ergaenzen in der switch-Struktur ab line 70, analog `tableRow`-Case):
```go
case "image":
    // media_asset_id muss vorhanden und positiv sein
    rawID, ok := node.Attrs["media_asset_id"]
    if !ok || rawID == nil {
        return fmt.Errorf("image-node fehlt media_asset_id")
    }
    id, isFloat := rawID.(float64)
    if !isFloat || id <= 0 {
        return fmt.Errorf("image-node hat ungültige media_asset_id")
    }
    // alignment: nur erlaubte Werte
    if align, ok := node.Attrs["alignment"].(string); ok && align != "" {
        if align != "left" && align != "center" && align != "right" {
            return fmt.Errorf("image-node hat ungültige ausrichtung: %q", align)
        }
    }
    // width_percent: 1-100
    if wp, ok := node.Attrs["width_percent"].(float64); ok {
        if wp < 1 || wp > 100 {
            return fmt.Errorf("image-node hat ungültige breite: %v", wp)
        }
    }
```

**RenderHTML-Signatur-Erweiterung** (fuer URL-Resolver-Callback — Pitfall 4 aus RESEARCH):
```go
// Neue Signatur — rueckwaertskompatibel wenn resolver nil:
func (s *TipTapService) RenderHTML(input string) (string, error) {
    return s.RenderHTMLWithResolver(input, nil)
}

func (s *TipTapService) RenderHTMLWithResolver(
    input string,
    mediaResolver func(mediaAssetID int64) (string, bool),
) (string, error) {
    var doc TipTapNode
    if err := json.Unmarshal([]byte(input), &doc); err != nil {
        return "", fmt.Errorf("ungültiges JSON: %w", err)
    }
    var sb strings.Builder
    renderNodeWithResolver(doc, &sb, mediaResolver)
    safe := s.sanitizer.SanitizeBytes([]byte(sb.String()))
    return string(safe), nil
}
```

**renderNode image-case** (ergaenzen in der switch, analog `case "horizontalRule"` lines 194-195):
```go
case "image":
    if mediaResolver == nil {
        return // D-04: kein Resolver — still ueberspringen
    }
    rawID, _ := node.Attrs["media_asset_id"].(float64)
    mediaAssetID := int64(rawID)
    if mediaAssetID <= 0 {
        return // D-04: ungueltige ID — still ueberspringen
    }
    mediaURL, ok := mediaResolver(mediaAssetID)
    if !ok {
        return // D-04: Asset nicht gefunden — still ueberspringen
    }
    widthPercent := 60.0
    if wp, ok := node.Attrs["width_percent"].(float64); ok && wp >= 1 && wp <= 100 {
        widthPercent = wp
    }
    align := "center"
    if a, ok := node.Attrs["alignment"].(string); ok && (a == "left" || a == "center" || a == "right") {
        align = a
    }
    alignClass := fmt.Sprintf("story-img-align-%s", align)
    sb.WriteString(fmt.Sprintf(
        `<img src="%s" style="width:%.0f%%" class="%s">`,
        template.HTMLEscapeString(mediaURL),
        widthPercent,
        alignClass,
    ))
```

**ExtractText — image-node ueberspringen** (in `extractTextFromNode`, lines 342-348):
```go
// image-nodes haben keinen Text — kein Code noetig, da der bestehende Pattern
// nur node.Type == "text" und node.Content traversiert. Image hat weder Text
// noch Content-Kinder. Keine Aenderung an extractTextFromNode erforderlich.
```

**bluemonday-Policy-Erweiterung** (ergaenzen in `newTipTapSanitizerPolicy`, lines 361-370):
```go
func newTipTapSanitizerPolicy() *bluemonday.Policy {
    p := bluemonday.NewPolicy()
    p.AllowElements("p", "h1", "h2", "h3", "strong", "em",
        "ul", "ol", "li", "blockquote",
        "table", "thead", "tbody", "tr", "th", "td", "hr", "span",
        // NEU Phase 70:
        "img")
    p.AllowAttrs("class").OnElements("span", "td", "th")
    p.AllowAttrs("colspan", "rowspan").OnElements("td", "th")
    p.AllowAttrs("data-color-token").OnElements("span")
    // NEU Phase 70 — img-Attribute:
    // src: nur exakt der eigene /media/profile/.../story/... Pfad
    p.AllowAttrs("src").Matching(
        regexp.MustCompile(`^/media/profile/\d+/story/[a-z0-9-]+/original\.(jpg|jpeg|png|webp)$`),
    ).OnElements("img")
    // style: nur width in %
    p.AllowAttrs("style").Matching(
        regexp.MustCompile(`^width:\s*\d{1,3}%$`),
    ).OnElements("img")
    // class: nur kontrollierte Ausrichtungs-Klassen
    p.AllowAttrs("class").Matching(
        regexp.MustCompile(`^story-img-align-(left|center|right)$`),
    ).OnElements("img")
    return p
}
// regexp muss importiert werden: "regexp"
```

---

### `database/migrations/0089_member_story_images.{up,down}.sql` (NEU — migration, CRUD)

**Analog:** `database/migrations/0088_anime_contributions_constraints.up.sql` — append-only ALTER TABLE, Kommentar-Header, IF NOT EXISTS-Schutz.

**Up-Migration pattern** (analog 0088 Stil):
```sql
-- Migration 0089: owner_member_id-Spalte auf media_assets fuer Story-Bild-Eigentuemerbindung.

ALTER TABLE media_assets
    ADD COLUMN IF NOT EXISTS owner_member_id BIGINT REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_owner_member
    ON media_assets(owner_member_id)
    WHERE owner_member_id IS NOT NULL;
```

**Down-Migration pattern:**
```sql
-- Rollback Migration 0089

DROP INDEX IF EXISTS idx_media_assets_owner_member;

ALTER TABLE media_assets
    DROP COLUMN IF EXISTS owner_member_id;
```

**Hinweis fuer Executor:** Vor dem Anlegen der Migration pruefen ob zwischen 0088 und dem aktuellen Stand weitere untracked Migrations-Dateien im Verzeichnis liegen (analog Phase-55 D-13). Aktuell verifiziert: 0088 ist die letzte Datei (Stand 2026-06-02).

---

### `backend/internal/models/member_profile.go` (MODIFY — model)

**Analog:** Selbe Datei — `MemberProfileAvatarUploadInput` (lines 113-123) als direktes Vorbild.

**Neues DTO** (ergaenzen nach `MemberProfileBackgroundUploadInput`):
```go
// StoryImageUploadInput haelt die Daten fuer einen neuen media_assets-Eintrag
// fuer ein Story-Bild (analog MemberProfileAvatarUploadInput).
type StoryImageUploadInput struct {
    FilePath      string
    PublicURL     string
    StoragePath   string // identisch FilePath, fuer Cleanup-Lookup
    MimeType      string
    SizeBytes     int64
    Width         int
    Height        int
    OwnerMemberID int64
}

// StoryImageAssetRef ist die schlanke Referenz, die der Handler fuer den Referenz-Diff nutzt.
type StoryImageAssetRef struct {
    ID          int64
    StoragePath string
    OwnerMemberID int64
}
```

---

### `backend/internal/repository/member_profile_repository.go` (MODIFY — repository, CRUD)

**Analog:** Selbe Datei — `GetOwnProfile` und `UpdateOwnProfile` als Muster fuer Context + pgxpool-Queries. `cleanupPreviousAvatarFiles` in `app_profile.go` als Muster fuer den Cleanup-Pfad.

**Neue Repository-Methoden (Signaturen)**:
```go
// InsertStoryImageAsset schreibt einen neuen media_assets-Eintrag mit owner_member_id.
func (r *MemberProfileRepository) InsertStoryImageAsset(
    ctx context.Context,
    input models.StoryImageUploadInput,
) (int64, error)

// GetStoryImageAssetsByMember laed alle media_assets mit owner_member_id == memberID
// fuer den Referenz-Diff in UpdateOwnProfile.
func (r *MemberProfileRepository) GetStoryImageAssetsByMember(
    ctx context.Context,
    memberID int64,
) ([]models.StoryImageAssetRef, error)

// DeleteStoryImageAsset loescht eine media_assets-Zeile nach ID.
// Wird nur aufgerufen wenn owner_member_id-Check bestanden (Cleanup-on-Save).
func (r *MemberProfileRepository) DeleteStoryImageAsset(
    ctx context.Context,
    assetID int64,
    ownerMemberID int64, // Safety: DELETE WHERE id = $1 AND owner_member_id = $2
) error
```

**Query-Pattern** (aus `member_profile_repository.go` lines 52-79 — pgxpool.Pool, context):
```go
func (r *MemberProfileRepository) InsertStoryImageAsset(
    ctx context.Context,
    input models.StoryImageUploadInput,
) (int64, error) {
    var id int64
    err := r.db.QueryRow(ctx,
        `INSERT INTO media_assets (file_path, public_url, storage_path, mime_type,
                                   size_bytes, width, height, owner_member_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        input.FilePath, input.PublicURL, input.StoragePath, input.MimeType,
        input.SizeBytes, input.Width, input.Height, input.OwnerMemberID,
    ).Scan(&id)
    if err != nil {
        return 0, err
    }
    return id, nil
}
```

---

### `frontend/src/components/editor/StoryImageExtension.ts` (NEU — extension, event-driven)

**Analog:** `frontend/src/components/editor/ColorTokenExtension.ts` (lines 1-31) — exaktes Muster fuer eigene TipTap-Extension im Projekt.

**Full pattern** (aus `ColorTokenExtension.ts` lines 1-31, adaptiert auf Block-Node):
```typescript
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { StoryImageNodeView } from './StoryImageNodeView'

export const StoryImageExtension = Node.create({
  name: 'image',
  group: 'block',
  atom: true,      // nicht als Inline-Text editierbar
  draggable: true, // TipTap-native Drag-to-Reorder

  addAttributes() {
    return {
      media_asset_id: { default: null },
      // Temporaerer Marker vor dem Upload (z.B. "pending:uuid") — darf NICHT im
      // gespeicherten body_json landen; wird von uploadPendingStoryImages() geleert.
      pending_key: { default: null },
      // Object-URL fuer Browser-Vorschau — sitzungsgebunden, nie persistiert.
      preview_url: { default: null },
      width_percent: { default: 60 }, // 1-100
      alignment: { default: 'center' }, // 'left' | 'center' | 'right'
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-story-image]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(HTMLAttributes, { 'data-story-image': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(StoryImageNodeView)
  },
})
```

---

### `frontend/src/components/editor/StoryImageNodeView.tsx` (NEU — component, event-driven)

**Analog:** `RichTextEditor.tsx` EditorToolbar-Buttons (lines 106-341) als Vorbild fuer Toolbar-Button-Stil; UI-SPEC Component & Interaction Inventory Sections 2-4 als Verhaltensvertrag.

**NodeView-Wrapper-Pattern** (aus TipTap `ReactNodeViewRenderer`-Konvention, via ColorTokenExtension-Analogie):
```typescript
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { useRef, useState } from 'react'
import styles from './StoryImageNodeView.module.css'

export function StoryImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const { media_asset_id, preview_url, width_percent, alignment } = node.attrs
  const imgSrc = preview_url ?? null  // Object-URL fuer Vorschau vor Save
  const containerRef = useRef<HTMLDivElement>(null)

  // Resize per onMouseDown + onMouseMove (native, kein externes DnD-Paket — RESEARCH Pattern 4)
  function handleResizeStart(event: React.MouseEvent) {
    // ... delta tracking → updateAttributes({ width_percent: newPercent })
  }

  if (!imgSrc && !media_asset_id) return null // D-04: kommentarlos ueberspringen

  return (
    <NodeViewWrapper
      className={`${styles.storyImageWrapper} ${styles[`align-${alignment}`]}`}
      data-drag-handle
    >
      {selected && (
        <div className={styles.nodeToolbar}>
          {/* Ausrichtungs-Buttons L/M/R — UI-SPEC Section 4 */}
          <button
            type="button"
            className={`${styles.toolbarBtn} ${alignment === 'left' ? styles.toolbarBtnActive : ''}`}
            onClick={() => updateAttributes({ alignment: 'left' })}
            aria-label="Links ausrichten"
            title="Links ausrichten"
          >
            <AlignLeft size={14} />
          </button>
          {/* ... center, right analog ... */}
        </div>
      )}
      <div className={styles.imageContainer} style={{ width: `${width_percent}%` }}>
        {imgSrc && <img src={imgSrc} alt="" className={styles.storyImage} />}
        {selected && (
          <div
            className={styles.resizeHandle}
            onMouseDown={handleResizeStart}
            aria-label="Bildbreite anpassen"
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}
```

**CSS-Token-Konventionen** (aus `RichTextEditor.module.css` via UI-SPEC):
```css
/* Selektions-Outline analog .editorShell:focus-within */
.storyImageWrapper.selected {
  outline: 2px solid color-mix(in srgb, var(--accent-primary) 42%, var(--text-secondary));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary) 12%, transparent);
}
/* Resize-Ziehgriff: 12px quadratisch, accent-farben — UI-SPEC Section 3 */
.resizeHandle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: var(--accent-primary);
  border-radius: var(--radius-sm);
  cursor: se-resize;
}
/* Node-Toolbar-Buttons analog .toolbarBtn aus RichTextEditor.module.css */
.toolbarBtn {
  /* gleiche Werte: height 28px, min-width 28px, padding 0 5px, gap 2px */
}
.toolbarBtnActive {
  /* gleich .toolbarBtnActive: color-mix accent 18% bg, accent 44% border */
}
```

---

### `frontend/src/components/editor/RichTextEditor.tsx` (MODIFY — component, event-driven)

**Analog:** Selbe Datei — `RichTextEditorProps` (lines 17-25) und `extensions`-Array (lines 358-372).

**Props-Erweiterung** (analog bestehende `mode`, `disabled` Props — lines 17-25):
```typescript
type RichTextEditorProps = {
  value: unknown | null
  onChange: (value: unknown) => void
  placeholder?: string
  helperText?: string
  mode?: 'longform' | 'shortnote'
  disabled?: boolean
  minHeight?: number
  // NEU Phase 70 — opt-in Bild-Feature (D-11):
  enableImages?: boolean
  onPendingImageAdded?: (pendingKey: string, file: File) => void
}
```

**Extensions-Array-Erweiterung** (analog lines 358-372):
```typescript
const editor = useEditor({
  immediatelyRender: false,
  extensions: [
    StarterKit.configure({ codeBlock: false, code: false, strike: false, hardBreak: false }),
    Table.configure({ resizable: false }),
    TableRow, TableCell, TableHeader,
    ColorTokenExtension,
    Placeholder.configure({ placeholder: placeholder ?? 'Hier schreiben…' }),
    CharacterCount,
    // NEU Phase 70 — nur wenn enableImages={true}:
    ...(enableImages ? [StoryImageExtension] : []),
  ],
  // ...
})
```

**Toolbar-Bild-Button** (ergaenzen in `EditorToolbar` — analog lines 251-258 Horizontal-Rule-Button, aber mit lucide Image-Icon und verstecktem file-input):
```typescript
// Bild-Icon — nur wenn enableImages (via Prop durchgereicht):
{enableImages && (
  <>
    <span className={styles.toolbarSep} />
    <button
      type="button"
      className={styles.toolbarBtn}
      onClick={() => fileInputRef.current?.click()}
      aria-label="Bild einfügen"
      title="Bild einfügen"
    >
      <Image size={14} strokeWidth={1.75} />  {/* lucide-react Image */}
    </button>
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      style={{ display: 'none' }}
      onChange={handleImageFileSelected}
    />
  </>
)}
```

---

### `frontend/src/components/editor/RichTextRenderer.tsx` (MODIFY — component, request-response)

**Analog:** Selbe Datei (lines 1-20). Die Komponente ist bereits korrekt: Sie rendert `body_html` via `dangerouslySetInnerHTML`. Fuer Story-Bilder wird kein Zusatzcode benoetigt — `<img>`-Tags kommen bereits sanitisiert aus dem Backend.

**Keine funktionale Aenderung noetig.** Sicherheits-Invariante (Zeile 10) bleibt:
```typescript
// SICHERHEITSINVARIANTE: dangerouslySetInnerHTML NUR mit body_html (serverseitig sanitisiert).
// Niemals body_json direkt rendern ohne serverseitiges Sanitizing.
export function RichTextRenderer({ bodyHtml }: RichTextRendererProps) {
  if (!bodyHtml?.trim()) return null
  return (
    <div
      className={styles.richTextOutput}
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  )
}
```

Moegliche Ergaenzung: CSS in `RichTextRenderer.module.css` fuer `img.story-img-align-left/center/right` (Block-Ausrichtung via Klasse, keine inline-style-Aenderungen noetig im TSX).

---

### `frontend/src/lib/storyImageUpload.ts` (NEU — utility, batch/transform)

**Analog:** `frontend/src/lib/api.ts` — `authorizedUploadXhr` (lines 2161-2233) als Upload-Mechanik; `uploadFansubMedia` (lines 2235-2255) als Beispiel fuer einen konkreten XHR-Upload-Call; `uploadAdminAnimeMedia` (lines 3576-3598) als weiteres Beispiel mit `buildBody`/`FormData`-Pattern.

**AuthorizedUploadXhr-Interface** (aus `api.ts` lines 2104-2110):
```typescript
// Diese Typen werden intern in api.ts verwendet — uploadOwnProfileStoryImage
// exportiert eine saubere oeffentliche Schnittstelle darauf.
interface AuthorizedUploadXhrOptions<T> {
  endpoint: string;
  buildBody: () => FormData;
  onProgress?: (percent: number) => void;
  retryEligibility: 'never' | 'auth-before-persistence' | 'idempotent';
  parsePayload?: (payload: unknown) => T;
}
```

**Neue api.ts-Funktion** (analog `uploadFansubMedia`, lines 2235-2255):
```typescript
// In api.ts ergaenzen:
export interface StoryImageUploadResponse {
  media_asset_id: number;
  public_url: string;
}

export async function uploadOwnProfileStoryImage(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<StoryImageUploadResponse> {
  if (typeof window === 'undefined') {
    throw new ApiError(500, 'Upload ist nur im Browser verfügbar.');
  }
  const API_BASE_URL = getApiBaseUrl();
  const endpoint = `${API_BASE_URL}/api/v1/me/profile/story-images`;
  return authorizedUploadXhr<StoryImageUploadResponse>({
    endpoint,
    onProgress,
    retryEligibility: 'never',
    buildBody: () => {
      const body = new FormData();
      body.set('image', file);
      return body;
    },
    parsePayload: (payload) => {
      // payload.data.media_asset_id, payload.data.public_url
      const data = (payload as { data: StoryImageUploadResponse }).data;
      return data;
    },
  });
}
```

**storyImageUpload.ts Kern-Logik** (deferred-Batch-Upload + Marker-Swap):
```typescript
import type { StoryImageUploadResponse } from './api'

export type TipTapImageNode = {
  type: 'image';
  attrs: {
    media_asset_id?: number | null;
    pending_key?: string | null;
    preview_url?: string | null;
    width_percent?: number;
    alignment?: string;
  };
}

// Traversiert TipTap-JSON-Baum, laedt alle pending Nodes hoch, tauscht Marker.
// Fehler bei einem Bild → wirft Exception; Aufrufer muss bereits hochgeladene
// Bilder dieses Versuchs zurueckrollen (Pitfall 7 aus RESEARCH).
export async function uploadPendingStoryImages(
  doc: unknown,
  pendingFiles: Map<string, File>,
  uploadFn: (file: File, onProgress?: (n: number) => void) => Promise<StoryImageUploadResponse>,
  onProgress?: (pendingKey: string, percent: number) => void,
): Promise<unknown> {
  return traverseAndResolve(doc, pendingFiles, uploadFn, onProgress);
}

async function traverseAndResolve(
  node: unknown,
  pendingFiles: Map<string, File>,
  uploadFn: (file: File, onProgress?: (n: number) => void) => Promise<StoryImageUploadResponse>,
  onProgress?: (pendingKey: string, percent: number) => void,
): Promise<unknown> {
  if (!node || typeof node !== 'object') return node;
  const n = node as Record<string, unknown>;

  if (n['type'] === 'image') {
    const pendingKey = n['attrs'] && (n['attrs'] as Record<string, unknown>)['pending_key'];
    if (pendingKey && typeof pendingKey === 'string') {
      const file = pendingFiles.get(pendingKey);
      if (!file) throw new Error(`Bild-Datei fuer Marker "${pendingKey}" nicht gefunden.`);
      const result = await uploadFn(file, (pct) => onProgress?.(pendingKey, pct));
      return {
        ...n,
        attrs: {
          ...(n['attrs'] as object),
          media_asset_id: result.media_asset_id,
          pending_key: null,   // Marker bereinigen — darf nicht im gespeicherten body_json landen
          preview_url: null,   // Object-URL bereinigen (Pitfall 2 aus RESEARCH)
        },
      };
    }
    // Schon aufgeloest — preview_url dennoch bereinigen
    return {
      ...n,
      attrs: { ...(n['attrs'] as object), pending_key: null, preview_url: null },
    };
  }

  if (Array.isArray(n['content'])) {
    const resolvedContent = await Promise.all(
      (n['content'] as unknown[]).map((child) =>
        traverseAndResolve(child, pendingFiles, uploadFn, onProgress)
      )
    );
    return { ...n, content: resolvedContent };
  }
  return node;
}
```

---

### `frontend/src/app/me/profile/page.tsx` (MODIFY — route/page, request-response)

**Analog:** Selbe Datei — `handleSubmit` (lines 249-280) als direktes Erweiterungsziel.

**handleSubmit-Erweiterung** (Einschub vor `updateOwnProfile`-Call, analog lines 262-270):
```typescript
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  if (!hasAuthSession || !profile) return
  if (hasYearErrors) {
    setError('Bitte korrigiere die markierten Jahresfelder, bevor du speicherst.')
    setSuccess(null)
    return
  }

  try {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    // NEU Phase 70: Pending-Bilder hochladen und body_json updaten (D-06/D-07)
    let resolvedStory = form.memberStory
    if (pendingImages.size > 0) {
      resolvedStory = await uploadPendingStoryImages(
        form.memberStory,
        pendingImages,
        uploadOwnProfileStoryImage,
        (key, pct) => setUploadProgress((prev) => new Map(prev).set(key, pct)),
      ) as typeof form.memberStory
    }

    const response = await updateOwnProfile({
      fansub_name: form.fansubName.trim() || null,
      bio: form.bio.trim() || null,
      member_story_json: resolvedStory,  // marker-freies body_json
      active_from_date: normalizedDateFromYear(form.activeFromYear),
      active_until_date: form.isCurrentlyActive ? null : normalizedDateFromYear(form.activeUntilYear),
      is_currently_active: form.isCurrentlyActive,
      profile_visibility: form.profileVisibility,
    })
    pendingImages.clear() // Cleanup nach erfolgreichem Save
    applyProfile(response.data, { syncForm: true, resetDirty: true })
    setIsStoryEditing(false)
    setSuccess('Profil wurde gespeichert.')
  } catch (saveError) {
    // Fehlertext aus UI-SPEC Copywriting Contract:
    const msg = saveError instanceof Error && saveError.message.includes('Bild')
      ? 'Mindestens ein Bild konnte nicht hochgeladen werden. Die Geschichte wurde nicht gespeichert. Bitte erneut versuchen.'
      : readErrorMessage(saveError, 'Profil konnte nicht gespeichert werden.')
    setError(msg)
    setSuccess(null)
  } finally {
    setIsSaving(false)
    setUploadProgress(new Map())
  }
}
```

**Neuer State** (ergaenzen analog `isUploadingAvatar`, line 129):
```typescript
const [pendingImages] = useState(() => new Map<string, File>())
const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map())
```

---

### `frontend/src/app/me/profile/components/ProfileStoryCard.tsx` (MODIFY — component, event-driven)

**Analog:** Selbe Datei (lines 1-43) — Props-Erweiterung analog bestehende Props.

**Props-Erweiterung** (ergaenzen in `ProfileStoryCardProps`):
```typescript
type ProfileStoryCardProps = {
  value: MemberProfileFormState['memberStory']
  bodyHtml?: string | null
  plainText?: string | null
  disabled: boolean
  isEditing: boolean
  onEdit: () => void
  onChange: (updater: (current: MemberProfileFormState) => MemberProfileFormState) => void
  // NEU Phase 70 — Bild-Feature opt-in (D-11):
  onPendingImageAdded?: (pendingKey: string, file: File) => void
  uploadProgress?: Map<string, number>
}
```

**RichTextEditor-Aufruf-Erweiterung** (lines 20-26):
```typescript
<RichTextEditor
  value={value}
  onChange={(nextValue) => onChange((current) => ({ ...current, memberStory: nextValue as MemberProfileFormState['memberStory'] }))}
  placeholder="Wie bist du zur Gruppe gekommen, woran hast du gearbeitet und was bleibt?"
  minHeight={170}
  disabled={disabled}
  // NEU Phase 70:
  enableImages={true}
  onPendingImageAdded={onPendingImageAdded}
/>
```

---

### `frontend/src/app/me/profile/components/profileFormTypes.ts` (MODIFY — utility/type)

**Analog:** Selbe Datei (lines 1-11).

**Erweiterung** (keine Aenderung an `MemberProfileFormState` erforderlich — pendingImages liegt als separater `Map`-State in `page.tsx`, nicht im Form-State. Die TipTap-JSON-Struktur erhaelt temporaer `pending_key`-Attribute, die vor dem Save bereinigt werden.):
```typescript
// KEINE Aenderung an MemberProfileFormState noetig.
// pendingImages: Map<string, File> lebt als eigener useState in page.tsx.
// uploadProgress: Map<string, number> lebt als eigener useState in page.tsx.
// Dies haelt den Form-State serialisierbar.
```

---

## Shared Patterns

### Authentifizierung / Guard
**Quelle:** `backend/internal/middleware` via `middleware.CommentAuthIdentityFromContext(c)`
**Anwenden auf:** `app_profile_story_image.go` — alle Handler-Methoden
```go
identity, ok := middleware.CommentAuthIdentityFromContext(c)
if !ok {
    c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"message": "anmeldung erforderlich"}})
    return
}
if strings.TrimSpace(identity.AppUserStatus) == models.AppUserStatusDisabled {
    c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"message": "deaktivierte benutzer dürfen keine story-bilder hochladen"}})
    return
}
```

### Error Handling (Backend)
**Quelle:** `backend/internal/handlers/app_profile.go` — `writeInternalErrorResponse` + lokale `fmt.Errorf`-Muster
**Anwenden auf:** `app_profile_story_image.go`, neue Repository-Methoden
```go
// Fuer 5xx-Fehler (immer mit Cleanup):
_ = os.RemoveAll(absoluteDir)
writeInternalErrorResponse(c, "interner serverfehler", err, "Story-Bild konnte nicht gespeichert werden.")
return
// Fuer 4xx-Fehler:
c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"message": "fehlermeldung auf deutsch"}})
return
```

### Audit-Log
**Quelle:** `backend/internal/handlers/app_profile.go` lines 476-494 (Avatar-Audit) und lines 769-815 (Profile-Update-Audit)
**Anwenden auf:** `app_profile_story_image.go` — Upload-Handler und Cleanup-on-Save in UpdateOwnProfile
```go
if h.auditLogRepo != nil {
    _ = h.auditLogRepo.Write(c.Request.Context(), repository.AuditLogEntry{
        ActorAppUserID:    &actorAppUserID,
        ActorLegacyUserID: &actorLegacyUserID,
        EventType:         "member_profile.story_image.AKTION",
        // ...
    })
}
```

### Frontend Upload mit Progress
**Quelle:** `frontend/src/lib/api.ts` lines 2104-2233 (`authorizedUploadXhr`, `AuthorizedUploadXhrOptions`)
**Anwenden auf:** `storyImageUpload.ts`, neue `uploadOwnProfileStoryImage`-Funktion in `api.ts`
```typescript
return authorizedUploadXhr<StoryImageUploadResponse>({
  endpoint,
  onProgress,
  retryEligibility: 'never', // Upload nicht idempotent — kein Retry
  buildBody: () => {
    const body = new FormData();
    body.set('image', file);
    return body;
  },
});
```

### Umlaut-Sprachqualitaet
**Quelle:** CLAUDE.md Sprachqualitaet-Sektion
**Anwenden auf:** Alle Go-Response-Strings, alle TypeScript-JSX-Textknoten, aria-labels, Button-Labels, Toast-/Error-Nachrichten
```
Korrekt:   "Story-Bild konnte nicht hochgeladen werden."
Korrekt:   "Bild einfügen", "Links ausrichten", "Zentriert ausrichten"
Verboten:  "Story-Bild konnte nicht hochgeladen werden." (ae → ae statt ae — hier kein Umlaut benoetigt)
Verboten:  "Bild einfuegen" (ue statt ü in user-facing Strings)
```

### IDOR-Schutz Pattern
**Quelle:** RESEARCH Pitfall 5 + D-03
**Anwenden auf:** `UpdateOwnProfile`-Handler in `app_profile_story_image.go` (nach ValidateJSON, vor Cleanup)
```go
// Alle media_asset_id-Werte aus dem neuen body_json extrahieren
newIDs := extractStoryImageIDsFromJSON(newBodyJSON)
// Batch-Query: alle muessen owner_member_id == identity.MemberID haben
assets, err := h.profileRepo.GetStoryImageAssetsByMember(ctx, profile.MemberID)
assetOwnerMap := make(map[int64]bool, len(assets))
for _, a := range assets {
    if a.OwnerMemberID == profile.MemberID {
        assetOwnerMap[a.ID] = true
    }
}
for _, id := range newIDs {
    if !assetOwnerMap[id] {
        c.JSON(http.StatusUnprocessableEntity, gin.H{"error": gin.H{
            "message": "story-bild gehört nicht diesem profil",
        }})
        return
    }
}
```

---

## No Analog Found

Kein File in dieser Phase ist ohne Analog. Alle Implementierungen haben direkte Vorbilder im Codebase.

---

## Metadata

**Analog-Suchbereich:** `backend/internal/handlers/`, `backend/internal/services/`, `backend/internal/models/`, `backend/internal/repository/`, `database/migrations/`, `frontend/src/components/editor/`, `frontend/src/lib/`, `frontend/src/app/me/profile/`
**Gescannte Dateien:** 14 direkt gelesen, ~20 via Grep-Pattern
**Pattern-Extraktion:** 2026-06-02

### Kritische Implementierungshinweise fuer den Planner

1. **app_profile.go Split ist zwingend**: Die Datei hat 906 Zeilen. Neuer Code gehoert ausschliesslich in `app_profile_story_image.go`. Kein direkter Edit an `app_profile.go` ausser Route-Registrierung in `main.go`.

2. **renderNode muss einen optionalen Resolver-Callback erhalten**: `renderNode()` hat derzeit keinen DB-Zugang. Empfohlene Loesung: neue Methode `RenderHTMLWithResolver(input, func(int64)(string,bool))` — bestehende `RenderHTML`-Aufrufer rufen diese weiterhin mit `nil`-Resolver auf (kein Breaking Change).

3. **Object-URL und pending_key muessen vor dem Save bereinigt werden**: `uploadPendingStoryImages()` muss beide Felder auf `null` setzen. Warnsignal: `body_json` enthaelt nach Reload `preview_url: "blob:..."`.

4. **govips ist NICHT im Produktions-go.mod**: Ausschliesslich `github.com/disintegration/imaging` verwenden. Verifiziert in RESEARCH.

5. **Cleanup-on-Save: IDOR-Check vor Delete**: `cleanupStoryImageAsset` darf nur aufgerufen werden wenn `owner_member_id == savender Member` verifiziert ist. Blanko-Delete ist verboten.

6. **Bluemonday src-Regex muss exakt zum Renderer-Pfadformat passen**: Renderer erzeugt `/media/profile/{memberID}/story/{mediaID}/original.{ext}` — Regex muss dieses Format matchen. In Tests pruefen.

7. **Migration 0089 — aktuelle Nummer verifiziert**: 0088 ist das letzte Migration-File (Stand 2026-06-02). Vor dem Anlegen pruefen ob weitere untracked Files im `database/migrations/`-Verzeichnis liegen.
