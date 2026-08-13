---
phase: 79-medien-ownership-in-ui-durchsetzen
plan: "03"
subsystem: frontend-admin-media
tags: [media-ownership, surface-1, surface-3, split, native-select-migration, d06, d07, d09]
dependency_graph:
  requires: [79-01, 79-02]
  provides: [surface-1-ownership, surface-3-ownership]
  affects:
    - frontend/src/components/admin/MediaUpload.tsx
    - frontend/src/components/admin/MediaUploadCore.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx
tech_stack:
  added: []
  patterns:
    - Koordinator/Kern-Split für 450-Zeilen-Limit (CLAUDE.md Modularity)
    - MediaOwnershipContext-Integration via onContextChange-Callback
    - D-06-Guard in submitUpload/handleUpload vor authorizedUploadXhr-Aufruf
    - Select-Primitive aus @/components/ui statt nativem <select>
key_files:
  created:
    - frontend/src/components/admin/MediaUploadCore.tsx
  modified:
    - frontend/src/components/admin/MediaUpload.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx
decisions:
  - "MediaUploadCore.tsx erhält MutableRefObject<HTMLInputElement | null> statt RefObject für React-18-Kompatibilität"
  - "ownerLabel in ReleaseThemeAssetsSection: 'Release «Anime {animeID} · Fansub {fansubID}»' — kein fansubName-Prop vorhanden"
  - "categoryValue für MediaOwnershipContext in ReleaseThemeAssetsSection: aktuell gewähltes Theme-Label (dynamisch aus themes-Array)"
  - "Upload-Button in ReleaseThemeAssetsSection zusätzlich disabled wenn !ownerCtx.ownerResolved"
metrics:
  duration: "9 Minuten"
  completed_date: "2026-06-06"
  tasks: 3
  files: 3
---

# Phase 79 Plan 03: Surface 1 + Surface 3 MediaOwnershipContext-Integration — SUMMARY

**One-liner:** MediaUpload.tsx auf ≤450 Zeilen gesplittet (MediaUploadCore.tsx extrahiert), Surface 1 (Fansub-Branding) und Surface 3 (Release-Theme-Assets) an MediaOwnershipContext angebunden — D-06-Guard, visibilityCode/reviewStatusCode aus ownerCtx, native-select-Migration.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | MediaUpload.tsx splitten → MediaUploadCore.tsx | `7ace1e8a` | MediaUpload.tsx (427Z), MediaUploadCore.tsx (neu) |
| 2 | Surface 1 — MediaOwnershipContext in MediaUpload.tsx | `68f13b69` | MediaUpload.tsx (441Z) |
| 3 | Surface 3 — ReleaseThemeAssetsSection native-select + MediaOwnershipContext | `ec80439b` | ReleaseThemeAssetsSection.tsx (212Z) |

## What Was Built

### Task 1: MediaUploadCore.tsx (Render-Kern)
Neue Datei mit dem gesamten Dropzone/Preview/Aktions-Rendering als Props-gesteuerter Komponente (`MediaUploadCoreProps`). `MediaUpload.tsx` delegiert das Rendering an den Kern und behält State-Management, Upload-Logik und ownerCtx-State.

- `MediaUpload.tsx`: 427 → 441 Zeilen nach Task 2 (≤450, CLAUDE.md Modularity)
- `MediaUploadCore.tsx`: 197 Zeilen — rein deklarativ, keine eigene Logik

### Task 2: Surface 1 — MediaOwnershipContext in MediaUpload.tsx

Per D-07/D-09 UI-SPEC Surface-Matrix:
- `MediaOwnershipContext` mit `ownerType="fansub_group"`, `ownerID={fansubID}`, `ownerLabel="Gruppe «{groupName}»"`, `categoryMode="slot"`, `categoryValue={type}` (='logo'/'banner'), `statusPolicy="immediate"`
- D-06-Guard: `submitUpload` prüft `!ownerCtx?.ownerResolved` → setzt deutsche Fehlermeldung und bricht ab
- `uploadFansubMedia` erhält `visibilityCode` + `reviewStatusCode` direkt aus `ownerCtx` (D-09: immer `public/approved` für Branding-Slots)
- `MediaUploadCore.disabled` wird bei `ownerCtx.ownerResolved === false` gesetzt

### Task 3: Surface 3 — ReleaseThemeAssetsSection

Native-select-Migration (CLAUDE.md Pflicht):
- `<select>` (Z.119) durch `Select`-Primitive aus `@/components/ui` in `FormField` ersetzt
- `<input type="file">` bleibt hidden (kein @/components/ui-Primitive für file inputs; Kommentar dokumentiert Ausnahme)

MediaOwnershipContext (D-07/D-09 UI-SPEC Surface 3):
- `ownerType="release_theme"`, `ownerID={fansubID}`, `statusPolicy="immediate"` (D-09: Theme-Assets = Branding-ähnlich)
- D-06-Guard in `handleUpload`: prüft `!fansubID || !animeID` und `!ownerCtx?.ownerResolved`
- `uploadAdminReleaseThemeAsset` erhält `visibilityCode` + `reviewStatusCode` aus `ownerCtx`
- Upload-Button erhält zusätzliche `disabled`-Bedingung `!ownerCtx?.ownerResolved`

## Test Results

```
✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > hat exakt 6 Einträge
✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > öffentlich mappt auf public + approved
✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > intern mappt auf private + approved
✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > in Prüfung mappt auf private + in_review
✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > abgelehnt mappt auf private + rejected
✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > archiviert mappt auf private + archived
✓ mediaStatusMapping.test.ts > STATUS_LABEL_MAPPING > entfernt mappt auf private + removed
✓ mediaStatusMapping.test.ts > STATUS_LABELS_ORDERED > enthält alle 6 Labels
✓ MediaOwnershipContext.test.tsx > D-06 > ownerID=null → ErrorState sichtbar
✓ MediaOwnershipContext.test.tsx > D-06 > ownerID=0 → ownerResolved=false
✓ MediaOwnershipContext.test.tsx > D-06 > ownerID=5 → ownerResolved=true; ErrorState NICHT gerendert
✓ MediaOwnershipContext.test.tsx > D-03/D-09 > statusPolicy=in_review → reviewStatusCode=in_review + visibilityCode=private
✓ MediaOwnershipContext.test.tsx > D-03/D-09 > statusPolicy=immediate → reviewStatusCode=approved + visibilityCode=public
✓ MediaOwnershipContext.test.tsx > D-05 > ownerLabel=Gruppe X als read-only Text
✓ MediaOwnershipContext.test.tsx > D-08 > categoryMode=slot → Badge; kein Select
✓ MediaOwnershipContext.test.tsx > D-08 > categoryMode=dropdown → Select gerendert
Test Files: 2 passed | Tests: 16 passed
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RefObject-Typ-Inkompatibilität in MediaUploadCore.tsx**
- **Found during:** Task 1 — erster tsc-Lauf
- **Issue:** `RefObject<HTMLInputElement | null>` ist nicht zuweisbar zu `LegacyRef<HTMLInputElement>` (React 18 `useRef`-Rückgabe ist `MutableRefObject<T | null>`)
- **Fix:** Prop-Typ in `MediaUploadCore.tsx` auf `MutableRefObject<HTMLInputElement | null>` geändert
- **Files modified:** `MediaUploadCore.tsx`
- **Commit:** `7ace1e8a`

## Known Stubs

Keine. Alle Ownership-Codes fließen in echte API-Aufrufe (visibilityCode/reviewStatusCode an uploadFansubMedia und uploadAdminReleaseThemeAsset).

## Threat Flags

Keine neuen Threat-Oberflächen. Die implementierten Threats T-79-03-01 bis T-79-03-04 wurden wie im Threat-Register definiert behandelt:
- T-79-03-04 (DoS via ownerless upload): D-06-Guard in beiden Surfaces implementiert.

## Self-Check: PASSED

Dateien vorhanden:
- frontend/src/components/admin/MediaUploadCore.tsx ✓ (197 Zeilen)
- frontend/src/components/admin/MediaUpload.tsx ✓ (441 Zeilen, ≤450)
- frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx ✓ (212 Zeilen)

Commits vorhanden:
- 7ace1e8a (feat(79-03): split MediaUpload.tsx) ✓
- 68f13b69 (feat(79-03): Surface 1) ✓
- ec80439b (feat(79-03): Surface 3) ✓

Verifikation:
- tsc --noEmit: kein Fehler ✓
- vitest run src/components/admin/media/: 16/16 Tests grün ✓
- Kein natives <select> in ReleaseThemeAssetsSection.tsx ✓
- MediaOwnershipContext in beiden Zieldateien eingebunden ✓
