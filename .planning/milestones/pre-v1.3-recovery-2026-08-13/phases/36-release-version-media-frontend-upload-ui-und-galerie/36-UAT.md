---
status: partial
phase: 36-release-version-media-frontend-upload-ui-und-galerie
source:
  - 36-01-SUMMARY.md
  - 36-02-SUMMARY.md
  - 36-03-SUMMARY.md
  - 36-04-SUMMARY.md
  - 36-06-SUMMARY.md
started: 2026-05-08T13:22:00Z
updated: 2026-05-08T15:25:00Z
---

## Current Test

[image-ratio gap fixed in source, fresh runtime retest still pending]

## Tests

### 1. Fresh Runtime Media Endpoint
expected: After rebuilding the local runtime, `GET /api/v1/admin/release-versions/41/media` should load successfully without manual schema intervention so the drawer and editor can open the media surface.
result: pass

### 2. Drawer Summary Entry
expected: Opening `/admin/fansubs/88/edit` -> `Anime & Releases` -> Release 41 drawer -> `Media` shows a compact summary with counts/mini-thumbnails/preview badge plus `Media verwalten`, and no upload controls.
result: pass

### 3. Editor Deep-Link To Media Tab
expected: Visiting `/admin/episode-versions/41/edit?tab=media` lands on `Media / Assets`, shows the fansub/release context card, and keeps the editor shell intact.
result: pass

### 4. Category Gating + Preview Toggle
expected: The upload controls stay disabled until a category is selected, and the preview toggle appears only for `Release-Screenshot` / `Typesetting-/Karaoke-Beispiel`, not for `Spaßbild / Outtake` or `Sonstiges`.
result: pass

### 5. Upload Queue + Gallery Placement
expected: Uploading one image shows per-file progress, persists it under the chosen category, and renders the card inside the matching gallery section.
result: pass

### 6. Detail Panel + Cross-Tab Stability
expected: Selecting a gallery card opens the detail panel with caption/sort/preview/delete controls, and the surrounding editor tabs remain usable after media interactions.
result: pass

### 7. Nicht-quadratische Bildproportion bleibt sichtbar
expected: Ein Hoch- oder Querformat-Bild wird in Galerie und Detail-Preview nicht mehr als harter 1:1-Ausschnitt gezeigt; spaetestens im Detailpanel bleibt die volle Bildproportion sichtbar.
result: pending
notes: Der Source-Fix ist implementiert und durch `ReleaseVersionMediaSection.test.tsx` abgesichert. Die laufende Runtime auf `http://127.0.0.1:3002` hing beim frischen Frontend-Rebuild noch auf einem alten Bundle, deshalb steht der abschliessende Live-Retest gegen den aktualisierten Browser-Stand noch aus.

## Summary

total: 7
passed: 6
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

- Galerie-Thumbnail und Detail-Preview sind im Quellstand auf `contain`/non-crop umgestellt, aber der frische Live-Retest gegen die aktualisierte Frontend-Runtime auf `:3002` fehlt noch.
