# Phase 70: TipTap-Bilder fuer Member-Profilgeschichte - Research

**Researched:** 2026-06-02
**Domain:** TipTap Image Node / Member-eigener Upload / Cleanup-on-Save / Bluemonday-Policy-Erweiterung
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Bild-Referenz & Datenvertrag**
- D-01: TipTap-Image-Node speichert ausschliesslich eine stabile `media_asset_id`. Die `/media`-URL wird serverseitig beim HTML-Rendering aufgeloest.
- D-02: Layout-Attribute: Bildbreite (relativ in %) und Block-Ausrichtung. Kein Alt-Text, keine Caption.
- D-03: Backend prueft beim Save jede `media_asset_id` auf Existenz und Member-Eigentuemer-Bindung. Fremde Asset-IDs werden abgelehnt.
- D-04: Fehlendes Asset beim HTML-Render → Node still ueberspringen.
- D-05: Alt-Text und Caption in Phase 70 nicht umgesetzt. Bewusste Reduktion, als Contract-Gap zu markieren.

**Upload-Flow & Speicher-Seam**
- D-06: Bild-Upload gesammelt beim Profil-Save (Batch), nicht sofort bei Dateiauswahl.
- D-07: Im Editor lokale Browser-Object-URL als Vorschau; temporaerer Marker im Node; beim Save hochladen, Marker→echte `media_asset_id`, dann body_json persistieren.
- D-08: Story-Bilder via member-eigenem Profil-Upload (analog `UploadOwnProfileAvatar`), Speicherung unter `/media/profile/{memberID}/story/{mediaID}`. Jedes Bild bekommt eine Zeile in `media_assets` mit Member-Owner-Bindung.

**Editor- & Reader-UX**
- D-09: Bild-Icon Toolbar → Dateiauswahl → Cursor-Position. Breite relativ in % per Drag.
- D-10: Block-Level, kein Float. Links/Mitte/Rechts als Node-Attribut.
- D-11: Bild-Feature opt-in per Prop nur fuer Profilgeschichte-Instanz. Editor nicht forken.
- D-12: `/me/profile`-Lesemodus rendert wie Public-Darstellung.

**Asset-Lifecycle / Cleanup-on-Save**
- D-13: Beim Save physisches Cleanup dereferenzierter Story-Bilder (Datei + DB). Override von ROADMAP-SC5.
- D-14: Bild vor Save entfernt → kein Orphan (nie hochgeladen, kein media_assets-Eintrag).

**Public-Profil-Integration**
- D-15: Phase 70 verifiziert, dass Story-Bilder im oeffentlichen Member-Profil korrekt erscheinen (gleiche body_html).

**Validierung & Sicherheit**
- D-16: Erlaubte Formate JPG, PNG, WebP. Kein GIF.
- D-17: Max 10 MB pro Bild.
- D-18: Keine harte Bildanzahl-Obergrenze.
- D-19: Serverseitige Optimierung (Resize, EXIF-Strip, Dekompression-Bomb-Schutz aus 260510-t7j) zwingend.
- D-20: Bluemonday-Policy: `<img>` erlaubt nur serverseitig erzeugtes `src` aus `media_asset_id`, Breite in `%`, kontrollierte Ausrichtungs-Klasse.

**Test- & UAT-Schwerpunkte**
- D-21: Round-Trip Save/Reload.
- D-22: Cleanup-on-Save.
- D-23: Sicherheit/IDOR + Sanitizing.
- D-24: Public-Darstellung.

### Claude's Discretion
- Exakter Mechanismus der opt-in-Aktivierung fuer den geteilten Editor.
- Konkrete Maximalbreite fuer serverseitige Optimierung und 10-MB-Hardening-Detail.
- Genaues DB-/Migrationsdetail der Member-Owner-Bindung.
- Ob grosszuegige technische Schutzgrenze gegen Missbrauch gesetzt wird.

### Deferred Ideas (OUT OF SCOPE)
- Alt-/Caption-Text fuer Story-Bilder.
- Textumfluss (float) um Bilder.
- Animierte GIFs in der Profilgeschichte.
</user_constraints>

---

## Summary

Phase 70 erweitert den bestehenden Phase-41-TipTap-Stack um einen sicheren Image-Node fuer die member-eigene Profilgeschichte. Die Architektur ist klar: body_json als einzige Wahrheit, `media_asset_id` als stabiler Anker, URL-Aufloesung serverseitig beim HTML-Rendering. Der Stack (Go-Backend mit `bluemonday`, `disintegration/imaging`, pgx; Next.js App Router mit TipTap) ist vollstaendig vorhanden und muss erweitert — nicht ersetzt — werden.

Kritischer Befund: **govips ist nicht im Produktions-`go.mod`**. Die CONTEXT.md-Referenz auf "govips" (D-19) ist irreführend — die Produktion verwendet `github.com/disintegration/imaging` fuer Resize, EXIF-Strip und GIF-Behandlung. Das Upload-Security-Hardening aus Quick-Task 260510-t7j (EXIF-Strip via `imaging.Save`, Pixel-Bomb-Guard via Width×Height-Check) ist in `admin_content_release_version_media.go` implementiert und direkt auf den Story-Bild-Upload uebertragbar. Die Session stellt fest, dass die CONTEXT.md D-19-Formulierung "govips" als Markenzeichen eines früheren Worktree-Experiments staemmt, nicht der Produktion entspricht.

Die member-eigene Upload-Seam (`UploadOwnProfileAvatar`) ist ein vollstaendiges Vorbild: Eigentuemer-Binding ueber `profile.MemberID`, UUID-basiertes Verzeichnis, `os.MkdirAll`, `imaging`-basiertes Re-Encoding. Fuer Story-Bilder wird derselbe Pattern mit neuem Pfad `/media/profile/{memberID}/story/{mediaID}` und einem neuen Backend-Endpunkt angewandt. Die `media_assets`-Tabelle benoetigt eine neue Spalte `owner_member_id` (oder nutzung des bestehenden `uploaded_by`-Feldes mit Member-FK) als Eigentuemer-Bindung — derzeit hat die Tabelle nur `uploaded_by BIGINT` (FK auf `users`), aber keinen dedizierten Member-Owner-Column.

Die Frontend-Seite ist sauber: `RichTextEditor` empfaengt neue Extensions per Props, `ColorTokenExtension.ts` ist das Muster fuer die Image-Extension. Die deferred-Batch-Upload-Mechanik (D-06/D-07) erfordert lokalen State in `ProfileStoryCard` und ein pre-save-Hook in `page.tsx`. Cleanup-on-Save gehoert in den `UpdateOwnProfile`-Handler via Referenz-Diff.

**Primaere Empfehlung:** Umsetzung in 5 Waves: (1) Backend-Migration + Upload-Endpunkt, (2) TipTap-Service-Erweiterung (Allowlist + Renderer + Sanitizer), (3) Frontend-Image-Extension + NodeView, (4) deferred-Save-Flow + Cleanup-on-Save, (5) Verifikation Public-Profil + UAT.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Story-Bild hochladen | API / Backend | — | Auth, MIME-Validierung, EXIF-Strip, Pixel-Bomb-Guard, `media_assets`-Persistenz, Pfadbau |
| IDOR/Owner-Pruefung beim Save | API / Backend | — | Backend prueft jede `media_asset_id` gegen `owner_member_id` == savenden Member |
| URL-Aufloesung media_asset_id → src | API / Backend | — | Niemals Client-HTML als Wahrheit; Renderer-Walker loest intern auf |
| Bluemonday-Policy (`<img>`) | API / Backend | — | Sanitizing darf kein Attribut durchlassen das der Renderer nicht explizit gesetzt hat |
| Cleanup-on-Save (Referenz-Diff) | API / Backend | — | Datei-Delete und DB-Delete liegen auf Backend-Seite |
| TipTap Image-Extension + NodeView | Browser / Client | — | Drag-Resize, Ausrichungs-Buttons, Object-URL-Vorschau, Editor-Kommandos |
| Deferred-Batch-Upload bei Save | Browser / Client | API / Backend | Client sammelt pending Bilder, laedt hoch, tauscht Marker→ID; Backend nimmt body_json erst danach entgegen |
| TipTap-Validator (Allowlist) | API / Backend | — | ValidateJSON prueft Node-Typen; Image-Node muss dort erlaubt werden |
| Public-Rendering (body_html) | API / Backend | — | Gleiche server-side-gerenderte body_html wie /me/profile Lesemodus |

---

## Standard Stack

### Core — Backend [VERIFIED: codebase grep]

| Library | Version (go.mod) | Purpose | Why Standard |
|---------|-----------------|---------|--------------|
| `github.com/microcosm-cc/bluemonday` | v1.0.27 | HTML-Sanitizing | Bereits in TipTapService, Policy-Erweiterung fuer `<img>` |
| `github.com/disintegration/imaging` | v1.6.2 | Image-Decode, Re-Encode, Resize, EXIF-Strip | Bereits in Produktion fuer Avatar, Background, RVM-Uploads |
| `github.com/gabriel-vasile/mimetype` | v1.4.3 | MIME-Erkennung | Bereits in allen Upload-Handlern |
| `github.com/google/uuid` | v1.6.0 | UUID fuer mediaID | Bereits in UploadOwnProfileAvatar |
| `github.com/jackc/pgx/v5` | v5.7.1 | DB-Queries | Bestehende Persistenz-Seam |

**WICHTIG: govips ist NICHT in `backend/go.mod` (v1.25.0 Produktion).** [VERIFIED: codebase read] Nur in Worktrees aus Phase-35-Experimenten vorhanden. Alle Optimierungen (Resize, EXIF-Strip) laufen ueber `disintegration/imaging`. D-19-Formulierung in CONTEXT.md nennt "govips" als Herkunftsbeschreibung, nicht als Bibliothek fuer Phase 70.

### Core — Frontend [VERIFIED: codebase read]

| Library | Version (package.json) | Purpose | Why Standard |
|---------|----------------------|---------|--------------|
| `@tiptap/react` | aktuelle (existiert in Editor) | Editor-Core | Bereits installiert Phase 41 |
| `@tiptap/starter-kit` | aktuelle | Extension-Basis | Bereits installiert |
| Kein neues npm-Package noetig | — | Image-Extension als eigenes `.ts` | Folgt ColorTokenExtension-Pattern |

**Keine neuen npm-Packages notwendig.** [VERIFIED: codebase read] TipTap-Resize-Handles: per React-NodeView mit mouse-event-basierten Drag-Handlern (kein externes DnD-Paket, analog Phase 38 native HTML5 DnD-Entscheidung).

---

## Package Legitimacy Audit

> Keine neuen externen Packages werden in dieser Phase installiert. Alle Bibliotheken sind bereits im Produktions-`go.mod` und `package.json` vorhanden.

| Package | Registry | Disposition |
|---------|----------|-------------|
| `disintegration/imaging` | npm/go — bereits installiert | Approved — existing |
| `bluemonday` | go — bereits installiert | Approved — existing |
| TipTap (alle Extensions) | npm — bereits installiert | Approved — existing |

**Packages removed due to slopcheck [SLOP] verdict:** keine  
**Packages flagged as suspicious [SUS]:** keine

---

## Architecture Patterns

### System Architecture Diagram

```
Browser                     Backend                      Filesystem + DB
──────                      ───────                      ───────────────
[File picker]               POST /me/profile/story-images
  │ File → Object URL         │ MIME-Check (jpg/png/webp)
  │ preview in NodeView        │ Size-Check (≤10MB)
  │                            │ Pixel-Bomb-Guard (W×H)
  │                            │ imaging.Decode + imaging.Resize
  │                            │ imaging.Save (EXIF-Strip)
  │                            │ INSERT media_assets (owner_member_id)
  │                            │ ──────────────────────────────────────►
  │◄── {media_asset_id} ───────┤                               /media/profile/{id}/story/{uuid}/original.{ext}
  │ Marker → media_asset_id    │
  │                            │
[Save button]                 │
  │ uploadPendingImages()      │
  │ swap markers → IDs         │
  │ PUT /me/profile             │
  │  body_json (mit media_asset_id nodes)
  │                            │ ValidateJSON (allowedTipTapNodes incl. "image")
  │                            │ IDOR-Check: foreach image-node: owner_member_id == actor
  │                            │ renderNode("image"): SELECT /media URL FROM media_assets
  │                            │ bluemonday.Sanitize (img: only server-resolved src, width%, align-class)
  │                            │ Referenz-Diff: alte IDs vs. neue IDs
  │                            │ DELETE dereferenzierte: os.Remove + DELETE media_assets
  │◄── {body_html mit <img>} ──┤
  │
[RichTextRenderer]            GET /api/v1/members/{slug}/profile
  dangerouslySetInnerHTML        │ Gleiche body_html
  (server-sanitisiert)           │◄───────────────────────────────────
```

### Recommended Project Structure

```
backend/internal/services/
  tiptap_service.go          # +image case in renderNode, +allowedTipTapNodes["image"], +bluemonday img-policy

backend/internal/handlers/
  app_profile.go             # +UploadOwnProfileStoryImage handler + Cleanup-on-Save in UpdateOwnProfile
                             # (split noetig wenn >450 Zeilen: app_profile_story_image.go)

backend/internal/models/
  member_profile.go          # +StoryImageUploadInput DTO (analog AvatarUploadInput)
  media.go                   # +MediaKindStoryImage constant

backend/internal/repository/
  member_profile_repository.go  # +StoryImageRefs helper (before/after diff query)
                                 # (split noetig: member_profile_story_cleanup.go)

database/migrations/
  0089_member_story_images.up.sql    # ALTER TABLE media_assets ADD COLUMN owner_member_id BIGINT ...
  0089_member_story_images.down.sql

frontend/src/components/editor/
  StoryImageExtension.ts     # TipTap Node Extension (analog ColorTokenExtension)
  StoryImageNodeView.tsx     # React NodeView: Drag-Resize + Ausrichtungs-Buttons + Object-URL-Preview
  RichTextEditor.tsx         # +enableImages prop, +StoryImageExtension in extensions wenn true

frontend/src/app/me/profile/
  page.tsx                   # +uploadPendingImages() vor updateOwnProfile(), +Cleanup-Koordination
  components/ProfileStoryCard.tsx  # +enableImages={true} prop an RichTextEditor
  components/profileFormTypes.ts   # +pendingImages state type

frontend/src/lib/
  api.ts                     # +uploadOwnProfileStoryImage() Funktion (analog uploadOwnProfileAvatar)
  storyImageUpload.ts        # Deferred-Batch-Upload-Logik (Extraktion fuer Testbarkeit)
```

### Pattern 1: TipTap-Node-Case-Erweiterung (Backend)

**Was:** Neuer `case "image"` in `renderNode()` + `allowedTipTapNodes["image"] = true` + bluemonday-Policy fuer `<img>`.

**Exakte Fundstellen:** [VERIFIED: codebase read]

```go
// tiptap_service.go — bestehende Allowlist (Zeilen 37-42):
var allowedTipTapNodes = map[string]bool{
    "doc": true, "paragraph": true, "text": true,
    "heading": true, "bulletList": true, "orderedList": true,
    "listItem": true, "blockquote": true, "horizontalRule": true,
    "table": true, "tableRow": true, "tableCell": true, "tableHeader": true,
    // NEU hinzufügen:
    "image": true,
}

// NEU: validateNode muss image-spezifische Attribut-Pruefung ergaenzen:
case "image":
    // media_asset_id muss vorhanden und numerisch sein
    if id, ok := node.Attrs["media_asset_id"]; !ok || id == nil {
        return fmt.Errorf("image-node fehlt media_asset_id")
    }
    // width muss 0.0–1.0 float oder 1–100 percent-string sein
    // alignment muss "left", "center" oder "right" sein

// NEU renderNode image case:
case "image":
    mediaAssetID := extractMediaAssetID(node.Attrs)
    if mediaAssetID <= 0 {
        return // D-04: still skip
    }
    // mediaURL via Lookup-Callback oder direkt aus DB (wird beim RenderHTML-Aufruf via
    // geschlossene renderFunc mitgegeben — Planner entscheidet ob direkte DB-Abfrage
    // oder 2-Pass: erst ValidateJSON, dann renderHTML mit pre-loaded URL-Map)
    width := extractWidthPercent(node.Attrs)  // z.B. "60%"
    align := extractAlignment(node.Attrs)     // "left"|"center"|"right"
    alignClass := fmt.Sprintf("story-img-align-%s", align)
    sb.WriteString(fmt.Sprintf(
        `<img src="%s" style="width:%s" class="%s">`,
        template.HTMLEscapeString(mediaURL),
        template.HTMLEscapeString(width),
        alignClass,
    ))
```

**bluemonday-Policy-Erweiterung:** [VERIFIED: codebase read]

```go
// newTipTapSanitizerPolicy() in tiptap_service.go — bestehend (Zeilen 361-370):
// NEU ergaenzen:
p.AllowElements("img")
// src: nur exakt die Domain/Pfad des eigenen Media-Servers — keine externen URLs
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
```

**Wichtiger Hinweis fuer Planner:** Der Renderer-Walker generiert `src` serverseitig. Bluemonday laeuft DANACH als Sanitizer-Sicherheitsnetz. Die src-Regex muss zum exakten Pfad-Format des Upload-Handlers passen (`/media/profile/{memberID}/story/{mediaID}/original.{ext}`).

### Pattern 2: Member-eigener Story-Bild-Upload (Backend)

**Was:** Neuer Handler `UploadOwnProfileStoryImage` in `app_profile.go` (oder Split-Datei `app_profile_story_image.go` wenn >450 Zeilen — CLAUDE.md-Limit pruefen).

**Vorbild:** `UploadOwnProfileAvatar` — exakt gleiche Struktur. [VERIFIED: codebase read]

```go
// app_profile.go Zeilen 338–497 als Vorlage:
func (h *AppAuthHandler) UploadOwnProfileStoryImage(c *gin.Context) {
    identity, ok := middleware.CommentAuthIdentityFromContext(c)
    // ... auth check wie Avatar ...

    // Datei lesen (single file "image" field, kein source_file noetig)
    fileHeader, err := c.FormFile("image")

    // MIME-Detect: nur jpg/png/webp (kein GIF — D-16)
    storyImageAllowedMimeTypes = map[string]bool{
        "image/jpeg": true, "image/png": true, "image/webp": true,
    }
    // Groessen-Check: max 10MB (D-17)
    const storyImageMaxSize = 10 * 1024 * 1024

    // Pixel-Bomb-Guard (aus 260510-t7j Pattern): W×H > 40_000_000 → reject
    if width * height > 40_000_000 { ... }

    // imaging.Decode + imaging.Resize (max 1600px Breite, Planner entscheidet Zielbreite)
    // imaging.Save → EXIF-Strip automatisch

    // Pfad: /media/profile/{memberID}/story/{mediaID}/original.{ext}
    profile, _ := h.profileRepo.GetOwnProfile(c.Request.Context(), identity.AppUserID)
    mediaID := uuid.New().String()
    relativeDir := fmt.Sprintf("/media/profile/%d/story/%s", profile.MemberID, mediaID)
    absoluteDir := filepath.Join(h.mediaStorageDir, "profile",
        fmt.Sprintf("%d", profile.MemberID), "story", mediaID)

    // INSERT media_assets mit owner_member_id = profile.MemberID
    // Rueckgabe: {media_asset_id, public_url} an Frontend

    // Audit-Log analog Avatar
}
```

### Pattern 3: media_assets Owner-Bindung (Migration)

**Was:** Neue Spalte `owner_member_id BIGINT REFERENCES members(id) ON DELETE SET NULL` in `media_assets`. Append-only.

**Naechste Migrationsnummer:** 0089 [VERIFIED: migration dir scan — letztes File ist 0088]

```sql
-- 0089_member_story_images.up.sql
ALTER TABLE media_assets
    ADD COLUMN IF NOT EXISTS owner_member_id BIGINT REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_owner_member
    ON media_assets(owner_member_id)
    WHERE owner_member_id IS NOT NULL;
```

**Wichtig:** Bestehende Zeilen erhalten `NULL` → korrekt fuer alte Assets die keine Member-Owner-Bindung haben. Die Spalte wird beim Story-Bild-INSERT gesetzt, nicht bei Avatar/Background (die brauchen es nicht zwingend, der Handler schreibt es aber optional).

### Pattern 4: Frontend-Image-Extension (TipTap NodeView)

**Was:** Neue `StoryImageExtension.ts` + `StoryImageNodeView.tsx`, analog zu `ColorTokenExtension.ts` aber als Block-Node mit React-NodeView.

**Vorbild:** `ColorTokenExtension.ts` (Zeilen 1-31). [VERIFIED: codebase read]

```typescript
// StoryImageExtension.ts
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { StoryImageNodeView } from './StoryImageNodeView'

export const StoryImageExtension = Node.create({
  name: 'image',
  group: 'block',
  atom: true, // nicht editierbar als Inline-Text
  draggable: true,

  addAttributes() {
    return {
      media_asset_id: { default: null },
      // Vor dem Upload: temporaerer lokaler Marker (z.B. "pending:{uuid}")
      pending_key: { default: null },
      // Object-URL fuer Editor-Vorschau (nicht in body_json persistiert — nur in-memory)
      preview_url: { default: null },
      width_percent: { default: 60 }, // 1-100
      alignment: { default: 'center' }, // 'left'|'center'|'right'
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-story-image]' }]
  },

  renderHTML({ HTMLAttributes }) {
    // Fuer Export/Paste-Scenarios — minimale sichere Ausgabe
    return ['img', mergeAttributes(HTMLAttributes, { 'data-story-image': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(StoryImageNodeView)
  },
})
```

```typescript
// StoryImageNodeView.tsx — React-NodeView mit Resize-Handle + Ausrichtungs-Buttons
// Zeigt preview_url (Object-URL) oder eine aufgeloeste public_url
// Drag-Handle an der rechten Kante → onMouseDown → onMouseMove → updateAttributes({ width_percent })
// Ausrichtungs-Buttons: L/M/R Toolbar-Buttons oben am Node
// NodeViewWrapper als Wrapper-Div mit data-drag-handle
```

### Pattern 5: Deferred-Batch-Upload + Marker-Swap

**Was:** In `page.tsx` vor dem `updateOwnProfile()`-Call werden alle Nodes mit `pending_key` hochgeladen.

**Fundstelle:** `handleSubmit()` in `page.tsx` Zeilen 249-280. [VERIFIED: codebase read]

```typescript
// page.tsx handleSubmit() — Erweiterung:
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  // ... bestehende Validierung ...

  // NEU: Pending-Bilder hochladen und body_json updaten
  const resolvedStory = await uploadPendingStoryImages(form.memberStory, uploadOwnProfileStoryImage)
  // resolvedStory: body_json mit media_asset_id statt pending_key

  const response = await updateOwnProfile({
    // ...
    member_story_json: resolvedStory,
  })
  // ...
}
```

```typescript
// storyImageUpload.ts — extrahierte Helper-Funktion (Planner kann auch inline in page.tsx)
export async function uploadPendingStoryImages(
  doc: TipTapDocument | null,
  uploadFn: (file: File) => Promise<{ media_asset_id: number; public_url: string }>
): Promise<TipTapDocument | null> {
  // Tiefen-Traversal des TipTap-JSON-Trees
  // Fuer jeden Node type='image' mit pending_key != null:
  //   - Blob aus pendingImagesMap[pending_key] holen
  //   - uploadFn aufrufen
  //   - media_asset_id ersetzen, pending_key leeren, preview_url leeren
  // Fehler bei einem Bild → gesamter Save schlaegt fehl (kein Partial-Save)
}
```

**State-Design:** `pendingImagesMap: Map<string, File>` in `ProfileStoryCard` oder `page.tsx`, separiert vom TipTap-JSON-Dokument. Der TipTap-Node enthaelt nur den Key (String), nicht die Datei selbst — das ist korrekt fuer Serialisierbarkeit.

### Pattern 6: Cleanup-on-Save (Backend)

**Was:** In `UpdateOwnProfile`-Handler: Referenz-Diff der `media_asset_id`-Werte im alten vs. neuen body_json, gefolgt von physischem Delete.

**Fundstelle:** `app_profile.go` Zeilen 94-161. [VERIFIED: codebase read]

```go
// In UpdateOwnProfile, nach dem ValidateJSON + IDOR-Check, vor UpdateOwnProfile-Repo-Call:
func extractStoryImageIDs(bodyJSON []byte) []int64 {
    // Parsen des TipTap-JSON, Sammeln aller image-nodes' media_asset_id
}

// Cleanup-Logik:
oldIDs := extractStoryImageIDs(before.MemberStoryJSON)
newIDs := extractStoryImageIDs(newBodyJSON)
toDelete := setDiff(oldIDs, newIDs)

for _, id := range toDelete {
    asset, err := h.mediaRepo.GetMediaAssetByID(ctx, id)
    if err != nil { continue } // already gone — ok
    // Safety: nur loeschen wenn owner_member_id == identity.MemberID
    if asset.OwnerMemberID != nil && *asset.OwnerMemberID == profile.MemberID {
        os.Remove(asset.StoragePath) // physisches File
        h.mediaRepo.DeleteMediaAsset(ctx, id) // DB-Zeile
    }
}
```

**Achtung 450-Zeilen-Limit:** `app_profile.go` ist bereits 906 Zeilen lang. [VERIFIED: codebase read — Datei endet bei Zeile 906] Der neue Upload-Handler + Cleanup-Logik werden in eine **neue Datei** `app_profile_story_image.go` ausgelagert (auch Handler-Methode auf `AppAuthHandler` wie alle anderen Profile-Handler).

### Anti-Patterns to Avoid

- **Base64-Einbettung im body_json:** Explizit verboten (D-01). Kein `data:`-URL im Node.
- **Client-seitig erzeugtes `src` im body_json:** Verboten (D-01). Nur `media_asset_id`.
- **Object-URL in persistiertem body_json:** `preview_url` und `pending_key` dürfen NICHT im gespeicherten body_json vorhanden sein. Vor dem Save-Call müssen sie entfernt/ersetzt werden.
- **Editor-Fork:** `RichTextEditor.tsx` darf nicht dupliziert werden (D-11). Opt-in via Prop.
- **GIF akzeptieren:** Verboten (D-16). `storyImageAllowedMimeTypes` darf kein `image/gif` enthalten.
- **Ungeprueftes `src` in bluemonday:** Bluemonday muss `src` auf exaktes Pfad-Format beschraenken.
- **govips als neue Dependency:** govips ist NICHT in Produktion. Alle Bild-Ops mit `disintegration/imaging`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EXIF-Strip | Eigenen EXIF-Parser | `imaging.Save()` re-enkodiert ohne EXIF | Identisch zu Quick-Task 260510-t7j Pattern |
| Pixel-Bomb-Guard | Eigene Dimension-Analyse | Bestehender `image.DecodeConfig()` Pattern + W×H-Check | Exakt aus `admin_content_release_version_media.go` |
| HTML-Sanitizing | Eigene Regex auf `<img>` | Bluemonday-Policy-Erweiterung | Bluemonday hat ASVS-relevante Edge-Cases abgedeckt |
| TipTap-JSON-Traversal | Eigenen Traversal | Bestehender `validateNode`/`renderNode`-Pattern | Rekursive Struktur bereits implementiert |
| Resize fuer Optimierung | Eigener Resize | `imaging.Resize(src, maxWidth, 0, imaging.Lanczos)` | Gleicher Aufruf wie in RVM-Thumbnail-Generierung |
| UUID-basierte Media-IDs | Eigener ID-Generator | `uuid.New().String()` | Gleich wie `UploadOwnProfileAvatar` |
| Ownership-Pruefung | Separates Auth-Modell | `owner_member_id`-Spalte + Query in Update-Handler | Einfach, direkt, kein neues System |

**Kernaussage:** Die Phase ist ein Muster-Reuse-Projekt. Jede Sub-Aufgabe hat ein exaktes Vorbild im Codebase.

---

## Runtime State Inventory

> Diese Phase ist eine Neuimplementierung (kein Rename/Refactor). Daher ist kein Runtime-State-Inventory erforderlich. Die neue `owner_member_id`-Spalte erhaelt NULL fuer bestehende Zeilen — kein Backfill noetig.

---

## Common Pitfalls

### Pitfall 1: app_profile.go ueberschreitet 450 Zeilen

**Was schiefgeht:** Der neue Upload-Handler + Cleanup-Logik werden in `app_profile.go` ergaenzt, was die Datei weit ueber 450 Zeilen bringt (aktuell 906 Zeilen).

**Warum es passiert:** Datei ist bereits ueber dem Limit, neuer Code erhoeht es weiter.

**Wie zu vermeiden:** Vor dem Implementieren pruefen: `app_profile.go` ist 906 Zeilen. Neuer Code gehoert in `app_profile_story_image.go`. Die Handler-Methode `UploadOwnProfileStoryImage` und alle Story-Image-Helpers werden dort definiert. Methode ist auf `*AppAuthHandler` — kein neuer Handler-Typ noetig.

**Warnsignal:** Plan-Aufgabe, die `app_profile.go` direkt modifiziert, ohne Split zu erwaehnen.

### Pitfall 2: Object-URL in persistiertem body_json

**Was schiefgeht:** `preview_url` (Object-URL fuer Browser-Vorschau) wird nicht vor dem Save bereinigt und landet im gespeicherten body_json.

**Warum es passiert:** TipTap-NodeView setzt `preview_url`-Attribut, das Reload funktioniert nicht weil Object-URLs sitzungsgebunden sind.

**Wie zu vermeiden:** `uploadPendingStoryImages()` loescht `preview_url` und `pending_key` aus jedem Image-Node vor der Rueckgabe des bereinigten body_json.

**Warnsignal:** body_json nach Reload enthaelt `preview_url: "blob:..."`.

### Pitfall 3: bluemonday `src`-Regex zu permissiv oder falsch

**Was schiefgeht:** Regex matcht nicht exakt auf Pfad-Format, entweder zu eng (legitime URLs blockiert) oder zu weit (externe URLs durch).

**Warum es passiert:** Pfad-Format in Renderer vs. Regex in Policy stimmen nicht ueberein.

**Wie zu vermeiden:** Renderer erzeugt `src` als `/media/profile/{memberID}/story/{mediaID}/original.{ext}`. Bluemonday-Regex muss exakt dieses Format matchen: `^/media/profile/\d+/story/[a-z0-9-]+/original\.(jpg|jpeg|png|webp)$`. Regex in Tests pruefen.

**Warnsignal:** Sanitisiertes HTML enthaelt leeres `src=""` (Regex hat nicht gematcht) oder externen URL.

### Pitfall 4: Renderer-Walker muss media_asset_id → URL aufloesen

**Was schiefgeht:** `renderNode()` ist eine reine Funktion ohne DB-Zugang. Der Image-Node braucht aber die `/media`-URL des Assets.

**Warum es passiert:** Bestehende `renderNode()`-Funktion hat keinen DB-Kontext.

**Wie zu vermeiden:** Zwei Ansaetze moeglich (Planner entscheidet):
- **(a) Pre-load Map:** Vor `RenderHTML()` alle `media_asset_id`-Werte aus body_json extrahieren, URLs batch-laden, dann als `map[int64]string` an `renderNode()` uebergeben via closure.
- **(b) Service-Methode mit Kontext:** `TipTapService.RenderHTMLWithMediaResolver(input string, resolver func(int64) string)` — Resolver-Callback wird an renderNode durchgereicht.

Ansatz (b) ist sauberer (keine globale Mutation an `TipTapService`). Der IDOR-Check und die URL-Aufloesung koennten in einem einzigen DB-Query erfolgen.

**Warnsignal:** Compile-Fehler weil `renderNode` keine DB-Abfrage machen kann, oder Test scheitert weil `src=""` in HTML.

### Pitfall 5: IDOR bei Save — body_json enthaelt fremde media_asset_id

**Was schiefgeht:** Member B sendet body_json mit `media_asset_id` von Member A. Backend rendert Bild von Member A im Profil von Member B.

**Warum es passiert:** Kein Eigentuemer-Check bei ValidateJSON/RenderHTML.

**Wie zu vermeiden:** In `UpdateOwnProfile`-Handler (nach ValidateJSON): alle `media_asset_id`-Werte extrahieren, per Batch-Query `owner_member_id` pruefen. Jede ID, die nicht `owner_member_id == savender Member` hat, fuehrt zu HTTP 422 mit klarer Fehlermeldung. Dies ist **vor** dem Cleanup-Diff zu pruefen.

**Warnsignal:** Test D-23 schlaegt fehl — fremde ID wird nicht abgelehnt.

### Pitfall 6: Cleanup loescht Asset das in einem anderen Save referenziert wird

**Was schiefgeht:** Cleanup-on-Save loescht ein Asset, obwohl es noch in einem anderen Profil (oder einem anderen Kontext) referenziert wird.

**Warum es passiert:** Story-Bilder sind member-eigen und einmalig genutzt — laut D-13 sicher. Aber die Implementierung muss das explizit pruefen.

**Wie zu vermeiden:** Cleanup nur ausfuehren wenn `owner_member_id == savender Member` UND keine andere Referenz in body_json anderer Member-Profiles existiert. Da Story-Bilder exklusiv pro Member sind (Pfad `/media/profile/{memberID}/story/...`), reicht der `owner_member_id`-Check als Sicherheitsnetz. Dennoch: vor dem physischen Delete `owner_member_id` pruefen — keine Blanko-Deletes.

### Pitfall 7: Deferred Upload schlaegt fuer ein Bild fehl — unklarer Zustand

**Was schiefgeht:** Drei Bilder pending, Bild 2 schlaegt beim Upload fehl. Bild 1 ist bereits hochgeladen (media_assets-Eintrag existiert), body_json noch nicht persistiert → Orphan.

**Wie zu vermeiden:** Atomic-or-nothing-Strategie: Wenn ein Bild-Upload fehlschlaegt, werden bereits hochgeladene Bilder dieses Save-Versuchs per Rollback-Delete bereinigt, body_json wird nicht persistiert. Fehlermeldung dem User zeigen. Planner entscheidet Granularitaet.

---

## Code Examples

### Bestehender renderNode (Vorbild fuer image case)

```go
// Source: backend/internal/services/tiptap_service.go:139-224
case "paragraph":
    sb.WriteString("<p>")
    for _, child := range node.Content {
        renderNode(child, sb)
    }
    sb.WriteString("</p>")
```

### Bestehende bluemonday-Policy (Erweiterungskontext)

```go
// Source: backend/internal/services/tiptap_service.go:361-370
func newTipTapSanitizerPolicy() *bluemonday.Policy {
    p := bluemonday.NewPolicy()
    p.AllowElements("p", "h1", "h2", "h3", "strong", "em",
        "ul", "ol", "li", "blockquote",
        "table", "thead", "tbody", "tr", "th", "td", "hr", "span")
    p.AllowAttrs("class").OnElements("span", "td", "th")
    p.AllowAttrs("colspan", "rowspan").OnElements("td", "th")
    p.AllowAttrs("data-color-token").OnElements("span")
    // NEU: "img" + erlaubte Attribute
    return p
}
```

### Avatar-Upload Pfad-Konstruktion (Vorbild fuer Story-Image)

```go
// Source: backend/internal/handlers/app_profile.go:401-408
mediaID := uuid.New().String()
relativeDir := fmt.Sprintf("/media/profile/%d/avatar/%s", profile.MemberID, mediaID)
filename := "original." + ext
relativePath := relativeDir + "/" + filename
absoluteDir := filepath.Join(h.mediaStorageDir, "profile",
    fmt.Sprintf("%d", profile.MemberID), "avatar", mediaID)
absolutePath := filepath.Join(absoluteDir, filename)
```

### EXIF-Strip + Pixel-Bomb-Guard (aus 260510-t7j)

```go
// Source: backend/internal/handlers/admin_content_release_version_media.go (Pattern)
// Pixel-Bomb-Guard:
if meta.Width*meta.Height > 40_000_000 {
    return fileResult("IMAGE_TOO_MANY_PIXELS", ...)
}
// EXIF-Strip via imaging.Save (kein GIF):
decoded, _, err := image.Decode(bytes.NewReader(data))
if err := imaging.Save(decoded, outputPath); err != nil { ... }
// GIF: os.WriteFile unveraendert (imaging kann Animation nicht erhalten)
```

### ColorTokenExtension als Pattern fuer StoryImageExtension

```typescript
// Source: frontend/src/components/editor/ColorTokenExtension.ts
export const ColorTokenExtension = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colorToken: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-color-token') ?? null,
        renderHTML: (attributes: Record<string, unknown>) => { ... },
      },
    }
  },
})
```

### Public Profile Handler (D-15-Verifikation)

```go
// Source: backend/internal/handlers/app_public_profile.go:28-61
// Rendert PublicMemberProfile mit member_story_html — gleiche body_html wie /me/profile
// Kein separater Rendering-Schritt: body_html wird bei jedem Save einmal berechnet
// und dann sowohl fuer /me/profile als auch public profile ausgeliefert.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| govips (Phase-35-Experiment) | `disintegration/imaging` in Produktion | Phase 35 — govips nur in Worktrees | Kein CGO noetig, kein libvips in Docker |
| Bluemonday UGCPolicy | Custom TipTap Policy | Phase 41 | Engere Allowlist fuer TipTap-spezifische Elemente |
| body_json fehlt in media_assets member-owner | Neue `owner_member_id`-Spalte (Phase 70) | Neu | IDOR-Schutz, Cleanup-Grundlage |

**Deprecated/outdated:**
- govips-Referenz in CONTEXT.md D-19: "govips" ist Beschreibung des Phase-35-Experiments, nicht der aktuellen Bibliothek. Die Implementierung muss `disintegration/imaging` verwenden.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `app_profile.go` ist 906 Zeilen und ueberschreitet bereits das 450-Zeilen-Limit | Architecture Patterns | Gering — Split bleibt richtig |
| A2 | Render-Walker benoetigt URL-Resolver-Callback fuer image case (kein DB-Kontext in renderNode) | Common Pitfalls | Mittel — alternativer Ansatz (Pre-load-Map) funktioniert auch |
| A3 | Serverseitige Optimierung via Resize auf max. ~1600px Breite ist sinnvoller Default | Architecture Patterns / Claude's Discretion | Gering — Planner entscheidet konkreten Wert |
| A4 | `pendingImagesMap` im Frontend als `Map<string, File>` in page.tsx oder ProfileStoryCard | Architecture Patterns | Gering — Implementierungsdetail |
| A5 | Inline `style="width:60%"` (vs. `data-width`-Attribut + CSS-Variable) fuer Width-Persistenz im HTML | Architecture Patterns | Mittel — Planner muss konsistent zwischen Renderer, NodeView und bluemonday-Policy entscheiden |

---

## Open Questions

1. **URL-Resolver-Strategie in RenderHTML**
   - Was wir wissen: `renderNode()` hat keinen DB-Zugang; Image-Nodes brauchen `/media`-URL aus `media_asset_id`.
   - Was unklar: Pre-load-Map vs. Resolver-Callback — beide funktionieren.
   - Empfehlung: Resolver-Callback als neues optionales Argument an `RenderHTML()` — rueckwaertskompatibel wenn kein Image-Node vorhanden.

2. **Serverseitige Maximalbreite fuer Story-Bilder**
   - Was wir wissen: D-19 fordert Downscale "auf eine sinnvolle Maximalbreite", gibt keinen Wert vor. RVM-Upload nutzt 400px Thumbnail, Avatar-Upload skaliert nicht explizit.
   - Was unklar: Konkreter Wert (1200px? 1600px? 2000px?).
   - Empfehlung: 1600px — typische Content-Breite, reduziert Storage ohne sichtbaren Qualitaetsverlust.

3. **Inline-style vs. data-Attribut fuer width_percent im gerendertem HTML**
   - Was wir wissen: Bluemonday kann `style="width:X%"` erlauben via Regex-Match. Alternativ: `data-width-percent="60"` + CSS.
   - Was unklar: Welche Variante ist fuer den Public-Profil-Consumer einfacher.
   - Empfehlung: `style="width:60%"` — direkt, kein CSS-Klassenname noetigt, Regex auf `^\d{1,3}%$` reicht.

4. **ROADMAP-SC1-Gap und SC5-Override dokumentieren**
   - Was wir wissen: SC1 nennt Alt/Caption (gestrichen D-05), SC5 war "deferred" (jetzt in Phase 70 per D-13).
   - Empfehlung: Planner traegt in ROADMAP.md ein: SC1-Gap als Contract-Gap markieren, SC5 als "In Phase 70 umgesetzt".

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `disintegration/imaging` | EXIF-Strip, Resize | ✓ | v1.6.2 | — |
| `bluemonday` | HTML-Sanitizing | ✓ | v1.0.27 | — |
| `github.com/google/uuid` | mediaID-Generierung | ✓ | v1.6.0 | — |
| `github.com/gabriel-vasile/mimetype` | MIME-Detection | ✓ | v1.4.3 | — |
| TipTap (alle Extensions) | Editor | ✓ | existiert in package.json | — |
| PostgreSQL 16 (local Docker) | Migrationen | ✓ | via docker-compose | — |

**Missing dependencies with no fallback:** keine

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (Backend) | `github.com/stretchr/testify` v1.9.0 |
| Framework (Frontend) | Vitest 3 |
| Config file (Backend) | keine separate Datei — `go test ./...` |
| Config file (Frontend) | `frontend/vitest.config.ts` |
| Quick run Backend | `go test ./internal/services/... ./internal/handlers/... -run Story -count=1` |
| Quick run Frontend | `npm test -- --run storyImage` |
| Full suite Backend | `go test ./... -count=1` |
| Full suite Frontend | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01/D-20 | Image-Node speichert nur media_asset_id; Renderer loest URL serverseitig auf | unit | `go test ./internal/services/... -run TestTipTap.*Image -count=1` | ❌ Wave 0 |
| D-03/D-23 | IDOR-Check: fremde media_asset_id beim Save abgelehnt | unit/integration | `go test ./internal/handlers/... -run TestUpdateOwnProfile.*IDOR -count=1` | ❌ Wave 0 |
| D-20/D-23 | Sanitizing: manipuliertes Client-HTML / fremde src / script-Tags werden verworfen | unit | `go test ./internal/services/... -run TestTipTap.*Sanitize.*Image -count=1` | ❌ Wave 0 |
| D-21 | Round-Trip: Insert, Save, Reload → media_asset_id, width_percent, alignment erhalten | integration | `go test ./internal/handlers/... -run TestStoryImageRoundTrip -count=1` | ❌ Wave 0 |
| D-22 | Cleanup-on-Save: Bild entfernt + gespeichert → Datei + DB-Zeile physisch weg | integration | `go test ./internal/handlers/... -run TestStoryImageCleanup -count=1` | ❌ Wave 0 |
| D-24 | Public-Profil rendert body_html mit Image korrekt | smoke/UAT | Manuell: `GET /api/v1/members/{slug}/profile` | — |
| D-16/D-17 | GIF abgelehnt, Dateien >10MB abgelehnt | unit | `go test ./internal/handlers/... -run TestStoryImageUpload.*Validation -count=1` | ❌ Wave 0 |
| D-19 | EXIF-Strip: hochgeladenes JPEG enthaelt nach Save keine GPS-Metadaten | unit | `go test ./internal/handlers/... -run TestStoryImageUpload.*ExifStrip -count=1` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `go test ./internal/services/... ./internal/handlers/... -run StoryImage -count=1`
- **Per wave merge:** `go test ./... -count=1 && npm test`
- **Phase gate:** Full suite green vor `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/internal/services/tiptap_service_test.go` erweitern — Image-Node-Faelle (ValidateJSON, RenderHTML, ExtractText)
- [ ] `backend/internal/handlers/app_profile_story_image_test.go` — Upload + Cleanup + IDOR-Tests
- [ ] `frontend/src/components/editor/StoryImageExtension.test.ts` — Attribut-Serialisierung, pending_key-Bereinigung
- [ ] `frontend/src/lib/storyImageUpload.test.ts` — uploadPendingStoryImages-Logik

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Bestehende `CommentAuthIdentityFromContext`-Middleware |
| V3 Session Management | nein | Token-freie UI, bestehende Auth-Seam |
| V4 Access Control (IDOR) | yes | `owner_member_id`-Check bei Save und Cleanup |
| V5 Input Validation | yes | MIME-Detect, Size-Check, Pixel-Bomb-Guard, ValidateJSON |
| V6 Cryptography | nein | Kein neues Crypto |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR (fremde media_asset_id einbetten) | Elevation of Privilege | owner_member_id-Check in UpdateOwnProfile vor body_json-Persistenz |
| XSS via manipuliertem src-Attribut | Tampering | Bluemonday-Policy: src-Regex matcht nur eigene /media-Pfade |
| Decompression Bomb (grosse PNG/JPEG) | DoS | image.DecodeConfig W×H-Check vor Decode (40MP-Limit aus 260510-t7j) |
| EXIF-Daten (GPS-Koordinaten etc.) | Info Disclosure | imaging.Save re-enkodiert ohne EXIF fuer JPEG/PNG/WebP |
| Pfad-Traversal im Storage | Tampering | filepath.Join mit mediaStorageDir + isUploadPathWithinBase-Check (aus UploadOwnProfileAvatar) |
| Orphan-Assets nach failed Upload | Integrity | Rollback-Delete bei Teil-Fehlern im Batch-Upload |

---

## Sources

### Primary (HIGH confidence)
- `backend/internal/services/tiptap_service.go` — vollstaendig gelesen, Allowlist + Renderer + Sanitizer exakt dokumentiert
- `backend/internal/handlers/app_profile.go` — vollstaendig gelesen, UploadOwnProfileAvatar + UpdateOwnProfile exakt dokumentiert
- `backend/internal/services/media_service.go` — vollstaendig gelesen, SaveUpload + detectMimeType + validateMimeForKind dokumentiert
- `backend/internal/handlers/admin_content_release_version_media.go` — 260510-t7j-Pattern (EXIF-Strip + Pixel-Bomb-Guard) verifiziert
- `backend/go.mod` — govips NICHT vorhanden in Produktion, nur disintegration/imaging
- `database/migrations/0088_anime_contributions_constraints.up.sql` — letztes Migration-File, naechste Nummer: 0089
- `frontend/src/components/editor/ColorTokenExtension.ts` — vollstaendig gelesen, Vorbild-Pattern fuer StoryImageExtension
- `frontend/src/components/editor/RichTextEditor.tsx` — vollstaendig gelesen, Extensions-Liste + Props-Struktur
- `frontend/src/app/me/profile/page.tsx` — vollstaendig gelesen, handleSubmit + Save-Flow exakt dokumentiert
- `backend/internal/models/member_profile.go` — vollstaendig gelesen, DTOs dokumentiert
- `backend/internal/repository/member_profile_repository.go` — gelesen, publicMemberProfileBaseRow + UpdateOwnProfile

### Secondary (MEDIUM confidence)
- `.planning/quick/260510-t7j-SUMMARY.md` — EXIF-Strip und Pixel-Bomb-Guard Implementierungsdetails verifiziert
- `.planning/phases/55-sichere-tiptap-persistenz/55-CONTEXT.md` — body_json/html/text-Pattern und Render-Invariante bestaetigt

### Tertiary (LOW confidence)
- keine LOW-confidence-Quellen

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — alle Bibliotheken im go.mod verifiziert; govips-Abweichung von CONTEXT.md explizit dokumentiert
- Architecture: HIGH — alle Seams direkt im Code verifiziert; Pattern-Uebertragungen sind direkte Analogien zu bestehenden Handlern
- Pitfalls: HIGH — direkt aus Code-Analyse (Dateilaenge, missing DB-Kontext in renderNode, Object-URL-Persistenz)
- Migrationsdetail: HIGH — Verzeichnis gescannt, 0088 als letztes File bestaetigt

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (Stack ist stabil; govips-Hinweis in CONTEXT.md bleibt nach Phase 70 ggf. zu korrigieren)

---

## ROADMAP-Abweichungen fuer Planner

> Diese Hinweise muessen im PLAN oder ROADMAP.md adressiert werden.

1. **SC1-Gap:** ROADMAP-Success-Criterion 1 nennt "optionalen Alt-/Caption-Text". User hat Alt/Caption per D-05 gestrichen. Planner soll SC1 in ROADMAP.md als Contract-Gap markieren oder SC1-Text anpassen.

2. **SC5-Override:** ROADMAP-SC5 stellt physisches Cleanup als "bewusst separat geplant". User hat per D-13 entschieden: Cleanup-on-Save ist in Phase 70. Planner soll SC5 in ROADMAP.md von "deferred" auf "In Phase 70 umgesetzt" aendern.

3. **govips-Klarstellung:** CONTEXT.md D-19 erwaehnt "govips" — das stimmt nicht mit der Produktions-Bibliothek ueberein. Korrekte Bibliothek: `github.com/disintegration/imaging`. Kein Aenderungsbedarf fuer die Implementierung (imaging ist vorhanden), aber CONTEXT.md-Formulierung ist unpraezise.
