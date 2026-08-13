---
phase: 70-tiptap-bilder-fuer-member-profilgeschichte
plan: "05"
subsystem: tiptap/story-images/frontend
tags: [tiptap, story-images, frontend, editor-extension, nodeview, upload, wave-3]
dependency_graph:
  requires:
    - 70-01 (Wave-0-Tests fuer Extension + storyImageUpload)
    - 70-03 (Backend Image-Node-Contract: media_asset_id, width_percent, alignment)
  provides:
    - frontend/src/components/editor/StoryImageExtension.ts
    - frontend/src/components/editor/StoryImageNodeView.tsx
    - frontend/src/components/editor/StoryImageNodeView.module.css
    - frontend/src/components/editor/StoryImageToolbarButton.tsx
    - frontend/src/lib/storyImageUpload.ts
    - frontend/src/lib/api.ts (uploadOwnProfileStoryImage)
    - frontend/src/components/editor/RichTextEditor.tsx (enableImages-Prop)
    - frontend/src/components/editor/RichTextRenderer.module.css (story-img-align-*)
    - frontend/src/app/me/profile/components/ProfileStoryCard.tsx (enableImages, Progress)
  affects:
    - frontend/src/app/me/profile/page.tsx (muss uploadPendingStoryImages einbinden — Plan 70-06)
tech_stack:
  added: []
  patterns:
    - TipTap Node.create() fuer Block-Node mit ReactNodeViewRenderer
    - Native HTML5-Resize via onMouseDown/onMouseMove (kein DnD-Paket — analog Phase 38)
    - Deferred-Batch-Upload mit sequentiellem await statt Promise.all (single-failure-stop)
    - D-14: Iteration ueber Dokument-Nodes, nicht pendingFiles.keys()
    - Praeventiever Split: StoryImageToolbarButton.tsx haelt RichTextEditor.tsx unter 450 Zeilen
key_files:
  created:
    - frontend/src/components/editor/StoryImageExtension.ts
    - frontend/src/components/editor/StoryImageNodeView.tsx
    - frontend/src/components/editor/StoryImageNodeView.module.css
    - frontend/src/components/editor/StoryImageToolbarButton.tsx
    - frontend/src/lib/storyImageUpload.ts
  modified:
    - frontend/src/lib/api.ts (uploadOwnProfileStoryImage + StoryImageUploadResponse)
    - frontend/src/components/editor/RichTextEditor.tsx (enableImages-Prop, 449 Zeilen)
    - frontend/src/components/editor/RichTextRenderer.module.css (story-img-align-*)
    - frontend/src/app/me/profile/components/ProfileStoryCard.tsx (enableImages, Progress)
    - frontend/src/components/editor/StoryImageExtension.test.ts (Stub durch Import ersetzt)
    - frontend/src/lib/storyImageUpload.test.ts (Stub durch Import ersetzt)
decisions:
  - "StoryImageNodeView.tsx-Stub in Task 1 erstellt damit Extension-Tests kompilieren ohne NodeView-Implementierung zu blockieren"
  - "Test-Hilfsfunktion getExtensionAttrs() mit Unknown-Cast eingefuehrt um TipTap-NodeConfig-Attribut-Typen fuer Tests zugaenglich zu machen (TS-Kompatibilitaet)"
  - "StoryImageToolbarButton.tsx ausgelagert — praeventiever Split; RichTextEditor.tsx hat 449 Zeilen (war 408, Erweiterungen +41)"
  - "Sequentieller await statt Promise.all in traverseAndResolve — eindeutiger Fehlerzustand, D-06/D-07"
  - "D-14: Traversal laeuft ueber Nodes im Dokument, nicht pendingFiles.keys() — Orphan-Upload-Schutz"
  - "ProfileStoryCard-Fortschritts-UI mit inline-style implementiert da kein CSS-Modul fuer diese Komponente existiert und das Primitiv bereits im bestehenden Stil passt"
metrics:
  duration: "35min"
  completed_date: "2026-06-03"
  tasks: 2
  files: 11
---

# Phase 70 Plan 05: TipTap-Bilder Frontend-Schicht Summary

**One-liner:** TipTap StoryImageExtension mit Block-Node, ReactNodeView (Resize + L/M/R Ausrichtung), deferred-Batch-Upload-Utility, api.ts-Ergaenzung und opt-in RichTextEditor-Integration.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | StoryImageExtension + storyImageUpload.ts + api.ts | 2ebc854d | StoryImageExtension.ts, StoryImageNodeView.tsx (Stub), storyImageUpload.ts, api.ts, StoryImageExtension.test.ts, storyImageUpload.test.ts |
| 2 | StoryImageNodeView + CSS + StoryImageToolbarButton + RichTextEditor-opt-in + RichTextRenderer-CSS | 72b3fffd | StoryImageNodeView.tsx, StoryImageNodeView.module.css, StoryImageToolbarButton.tsx, RichTextEditor.tsx, RichTextRenderer.module.css, ProfileStoryCard.tsx |

## What Was Built

**StoryImageExtension.ts:**
- `Node.create({ name: 'image', group: 'block', atom: true, draggable: true })`
- 5 Attribute: `media_asset_id` (null), `pending_key` (null), `preview_url` (null), `width_percent` (60), `alignment` ('center') — kein alt_text, keine caption (D-02)
- parseHTML: `img[data-story-image]`; renderHTML: mergeAttributes + data-story-image
- addNodeView: ReactNodeViewRenderer(StoryImageNodeView)

**StoryImageNodeView.tsx:**
- NodeViewWrapper als Wrapper mit data-drag-handle fuer TipTap-Drag-to-Reorder
- D-04: `if (!imgSrc && !media_asset_id) return null` — silent-skip ohne Platzhalter
- D-02: kein alt-Attribut auf dem img-Tag
- Native Resize via onMouseDown/onMouseMove, Math.min(100, Math.max(10, newPercent))
- L/M/R Ausrichtungs-Toolbar (AlignLeft/AlignCenter/AlignRight aus lucide-react) nur bei `selected`
- style={{ width: `${width_percent}%` }} fuer Breite; CSS-Klassen fuer Block-Ausrichtung

**StoryImageNodeView.module.css:**
- CSS-Tokens aus bestehenden globalen Variablen (NICHT neu definiert)
- .selected: identisch zu .editorShell:focus-within (2px Accent-Border + 3px Glow)
- .resizeHandle: 12px quadratisch, accent-farben, se-resize Cursor
- .toolbarBtn/.toolbarBtnActive: exakt wie RichTextEditor.module.css
- .align-left/.align-center/.align-right: Block-Level-Ausrichtung via margin (D-10)

**StoryImageToolbarButton.tsx:**
- Props: onFileSelected(file: File), disabled, className, btnClassName
- accept="image/jpeg,image/png,image/webp" — kein GIF (D-16, T-70-05-04)
- aria-label="Bild einfügen", title="Bild einfügen" (korrekte Umlaute)
- Versteckter file-input mit value-Reset fuer Wiederauswahl derselben Datei

**storyImageUpload.ts:**
- `uploadPendingStoryImages(doc, pendingFiles, uploadFn, onProgress)` — sequentielles await
- Traversiert TipTap-JSON-Baum; `pending_key != null` → Upload → media_asset_id + Marker-Bereinigung
- Bereinigt preview_url auch bei Nodes ohne pending_key (Pitfall 2)
- D-14: Iteration ueber Dokument-Nodes, nicht pendingFiles.keys() — Orphan-Schutz
- D-06/D-07: Exception bei Fehler, kein Partial-Save

**api.ts (Ergaenzung):**
- `StoryImageUploadResponse` Interface: `{ media_asset_id: number; public_url: string }`
- `uploadOwnProfileStoryImage(file, onProgress)` via `authorizedUploadXhr`, Endpoint `/api/v1/me/profile/story-images`
- `retryEligibility: 'never'` — Upload nicht idempotent
- Server-Side-Guard: `typeof window === 'undefined'` Pruefung

**RichTextEditor.tsx:**
- Props: `enableImages?: boolean`, `onPendingImageAdded?: (pendingKey: string, file: File) => void`
- Extensions-Array: `...(enableImages ? [StoryImageExtension] : [])` (D-11, T-70-05-03)
- EditorToolbar: StoryImageToolbarButton nach Undo/Redo-Gruppe
- 449 Zeilen — unter 450-Zeilen-Limit (war 408, +41 Zeilen Netto)

**RichTextRenderer.module.css:**
- 3 neue Klassen fuer server-gerenderte img-Tags: `.story-img-align-left/center/right`
- Block-Level-Ausrichtung via display:block + margin-auto (D-10)

**ProfileStoryCard.tsx:**
- Props: `onPendingImageAdded?`, `uploadProgress?: Map<string, number>`
- RichTextEditor-Aufruf: `enableImages={true}`, `onPendingImageAdded={onPendingImageAdded}`
- Upload-Fortschritts-UI pro pending_key mit Fortschritts-Balken (accent-Fuellung)

## Test-Ergebnisse

```
src/lib/storyImageUpload.test.ts  — 5 Tests: PASS
src/components/editor/StoryImageExtension.test.ts — 12 Tests: PASS
npm run typecheck — sauber (keine Fehler)
RichTextEditor.tsx: 449 Zeilen (unter 450)
Volle Test-Suite: 588 pass (13 vorbestehende Fehler in admin/anime/* + api.no-token-boundary)
```

## Deviations from Plan

### Auto-implemented Additions

**1. [Rule 1 - Bug] StoryImageNodeView-Stub fuer Task-1-Test-Kompilierung**
- Found during: Task 1
- Issue: Vitest versuchte den `./StoryImageNodeView`-Import aus StoryImageExtension.ts aufzuloesen, auch wenn der Test die Extension nur laed. Der Import fehlte → `Cannot find module` Fehler
- Fix: Minimaler Stub `StoryImageNodeView.tsx` in Task 1 erstellt; Task 2 ersetzt ihn vollstaendig
- Files modified: frontend/src/components/editor/StoryImageNodeView.tsx (neu in Task 1, vollstaendig in Task 2)
- Commit: 2ebc854d (Stub), 72b3fffd (Vollimplementierung)

**2. [Rule 1 - Bug] Test-Adapter getExtensionAttrs() fuer TipTap-NodeConfig-Typkompatibilitaet**
- Found during: Task 1
- Issue: Die Wave-0-Tests griffen auf `StoryImageExtension.config?.addAttributes?.()` zu und casteten das Ergebnis auf `{ default?: unknown }`. TipTap 3.x gibt `{} | Attributes$1` zurueck, was TS-Fehler `TS2684`/`TS7053` erzeugte
- Fix: Hilfsfunktion `getExtensionAttrs()` in der Testdatei eingefuehrt mit `as unknown as () => Record<string, { default?: unknown }>` Cast — testet dasselbe Verhalten ohne TS-Fehler
- Files modified: frontend/src/components/editor/StoryImageExtension.test.ts
- Commit: 2ebc854d

## Known Stubs

Keine — alle in diesem Plan versprochenen Implementierungen sind vollstaendig.

Verbleibende Abhaengigkeit: `page.tsx` muss `uploadPendingStoryImages` und `pendingImages`-State einbinden (geplant in Plan 70-06).

## Threat Flags

Keine neuen Threat-Surfaces jenseits des Plans. Alle STRIDE-Threats aus dem Plan sind implementiert:
- T-70-05-01: preview_url=null vor Save (uploadPendingStoryImages)
- T-70-05-02: pending_key=null vor Save (uploadPendingStoryImages)
- T-70-05-03: enableImages als opt-in Prop (Default undefined/false)
- T-70-05-04: accept="image/jpeg,image/png,image/webp" auf file-input

## Self-Check: PASSED

- [x] StoryImageExtension.ts: name='image', atom=true, draggable=true, 5 Attribute (media_asset_id, pending_key, preview_url, width_percent, alignment)
- [x] StoryImageNodeView.tsx: NodeViewWrapper, Resize-Handle, L/M/R Toolbar, Object-URL-Vorschau, D-04-silent-skip, kein alt-Attribut
- [x] StoryImageNodeView.module.css: CSS-Tokens aus globalen Variablen, 12px Resize-Handle, Selektions-Ring
- [x] StoryImageToolbarButton.tsx: accept="image/jpeg,image/png,image/webp", aria-label="Bild einfügen"
- [x] RichTextEditor.tsx: enableImages-Prop, StoryImageExtension-Conditional, 449 Zeilen (unter 450)
- [x] RichTextRenderer.module.css: 3 story-img-align-*-Klassen
- [x] storyImageUpload.ts: uploadPendingStoryImages, sequentiell, D-14, D-06/D-07
- [x] api.ts: uploadOwnProfileStoryImage via authorizedUploadXhr
- [x] ProfileStoryCard.tsx: enableImages={true}, onPendingImageAdded, Upload-Fortschritt
- [x] npm run typecheck: sauber
- [x] Alle Wave-0-Tests: 17/17 gruen
- [x] Commit 2ebc854d vorhanden
- [x] Commit 72b3fffd vorhanden
