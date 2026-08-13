---
phase: 79-medien-ownership-in-ui-durchsetzen
plan: "04"
subsystem: frontend-admin-media
tags: [media-ownership, surface-2, surface-4, d06, d07, d08, d09, 450-split]
dependency_graph:
  requires: [79-01, 79-02]
  provides: [surface-4-ownership, surface-2-ownership]
  affects:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx
tech_stack:
  added: []
  patterns:
    - helpers.tsx-Split für 450-Zeilen-Limit (ReleaseVersionMediaSection)
    - MediaOwnershipContext categoryMode='dropdown' für Surface 4 (Prozessmedien)
    - MediaOwnershipContext categoryMode='slot' + statusPolicy='immediate' für Surface 2 (Branding)
    - D-06-Guard in allen Upload-Handlern vor authorizedUploadXhr-Aufruf
    - optionale visibilityCode/reviewStatusCode Parameter in startUpload-Hook-Signatur
key_files:
  created:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx
decisions:
  - "ReleaseVersionMediaSection.tsx: CATEGORY_OPTIONS + alle reinen Utilities in helpers.tsx ausgelagert (450-Zeilen-Limit: 396 Z. nach Split)"
  - "CATEGORY_OPTIONS als readonly const in helpers.tsx, spread-cast [...CATEGORY_OPTIONS] an MediaOwnershipContext-Prop"
  - "media.isUploading existiert nicht — isBusy (lokal berechnet) als disabled-Prop für MediaOwnershipContext"
  - "AnimeJellyfinAssetUploadControls.tsx: 662 Zeilen (Pre-existing 632 Z. vor Plan 04) — Split als deferred-item dokumentiert"
  - "animeTitle als optionaler Prop für ownerLabel in AnimeJellyfinAssetUploadControls ergänzt"
metrics:
  duration: "9 Minuten"
  completed_date: "2026-06-06"
  tasks: 3
  files: 4
---

# Phase 79 Plan 04: Surface 4 + Surface 2 MediaOwnershipContext-Integration — SUMMARY

**One-liner:** Surface 4 (Release-Version Process Media) mit vollem Pflichtfeld-Formular (categoryMode='dropdown', statusPolicy='in_review') und Surface 2 (Anime-Assets) mit Branding-Slot (statusPolicy='immediate') an MediaOwnershipContext angebunden — D-06-Guard, visibilityCode/reviewStatusCode in allen Upload-Handlern.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | useReleaseVersionMedia.ts startUpload-Erweiterung | `492dc514` | useReleaseVersionMedia.ts |
| 2 | Surface 4 — ReleaseVersionMediaSection.tsx MediaOwnershipContext + helpers.tsx Split | `2a512e33` | ReleaseVersionMediaSection.tsx (396 Z.), ReleaseVersionMediaSection.helpers.tsx (neu, 63 Z.) |
| 3 | Surface 2 — AnimeJellyfinAssetUploadControls.tsx MediaOwnershipContext | `0da8dbf3` | AnimeJellyfinAssetUploadControls.tsx |

## What Was Built

### Task 1: useReleaseVersionMedia.ts startUpload-Signatur erweitert

- `UploadConfig`-Interface: `visibilityCode?` + `reviewStatusCode?` ergänzt
- `startUpload`-Signatur: zwei optionale Parameter am Ende der Parameterliste (`visibilityCode?`, `reviewStatusCode?`)
- `runUpload`-Funktion: `uploadReleaseVersionMedia`-Aufruf leitet beide Codes weiter
- `UseReleaseVersionMediaResult`-Interface: startUpload-Typ entsprechend aktualisiert
- Bestehende Aufrufstellen bleiben kompatibel (optionale Parameter)

### Task 2: ReleaseVersionMediaSection.tsx — Surface 4 (Prozessmedien)

**helpers.tsx (neu, 63 Zeilen):** Reine Utilities ohne State/Hooks/JSX ausgelagert:
- `CATEGORY_OPTIONS` Konstante (D-08 Kategorie-Optionen für release_version_media)
- `fileKey`, `buildLocalPreviewURL`, `statusLabel`, `statusClassName`, `isTerminalStatus`

**ReleaseVersionMediaSection.tsx (396 Zeilen, ≤450 ✓):**

Per D-07/D-09 UI-SPEC Surface-Matrix:
- `MediaOwnershipContext` mit `ownerType="release_version"`, `ownerID={versionId}`, `ownerLabel="Version {versionId}"`, `categoryMode="dropdown"`, `categoryOptions={[...CATEGORY_OPTIONS]}`, `statusPolicy="in_review"`
- `onContextChange`: setzt `ownerCtx` State + überträgt `ctx.categoryValue` als `selectedCategory` (D-08: Kategorie-Dropdown von MediaOwnershipContext übernommen)
- D-06-Guard in `handleUploadClick`: wenn `!ownerCtx?.ownerResolved` → setzt deutsche Fehlermeldung + return
- `media.startUpload` erhält `ownerCtx.visibilityCode` + `ownerCtx.reviewStatusCode` als letzte Parameter
- Upload-Button zusätzlich `disabled` wenn `!ownerCtx?.ownerResolved`
- Alter nativer `<select>` Kategorie-Block entfernt (Dopplung vermieden)

### Task 3: AnimeJellyfinAssetUploadControls.tsx — Surface 2 (Branding-Slot)

Per D-07/D-09 UI-SPEC Surface-Matrix:
- `MediaOwnershipContext` mit `ownerType="anime"`, `ownerID={animeID}`, `ownerLabel="Anime «{animeTitle}»"` (Fallback: `"Anime {animeID}"`), `categoryMode="slot"`, `categoryValue="anime-asset"`, `statusPolicy="immediate"`
- `animeTitle?: string` als optionaler Prop ergänzt
- Gemeinsamer `ownerCtx`-State für alle Asset-Slots (alle teilen denselben animeID-Owner-Kontext)
- D-06-Guard in `handleCoverUpload` + `handleManualUpload`: `!ownerCtx?.ownerResolved` → `onError(...)` + return
- `uploadAdminAnimeMedia` erhält `visibilityCode` + `reviewStatusCode` aus `ownerCtx` (D-09: `approved/public` durch `immediate`-Policy)

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

**1. [Rule 1 - Bug] media.isUploading nicht auf UseReleaseVersionMediaResult vorhanden**
- **Found during:** Task 2 — tsc-Lauf
- **Issue:** `media.isUploading` existiert nicht auf dem Hook-Result; korrekte Entsprechung ist der lokal berechnete `isBusy` (uploadItems mit status='uploading'|'processing')
- **Fix:** `disabled={isBusy}` statt `disabled={media.isUploading || isBusy}`
- **Files modified:** `ReleaseVersionMediaSection.tsx`
- **Commit:** `2a512e33`

**2. [Rule 1 - Bug] CATEGORY_OPTIONS `as const` inkompatibel mit `Array<{ value: string; label: string }>`**
- **Found during:** Task 2 — tsc-Lauf
- **Issue:** TypeScript verwirft `as const`-Cast zu mutablem Array-Typ (`readonly [...]` ist nicht zuweisbar zu `{ value: string; label: string }[]`)
- **Fix:** Spread-Operator `[...CATEGORY_OPTIONS]` erzeugt mutablees Array bei Aufruf — typkorrekt ohne Informationsverlust
- **Files modified:** `ReleaseVersionMediaSection.tsx`
- **Commit:** `2a512e33`

### Bekannte Abweichungen (dokumentiert, nicht geblockt)

**AnimeJellyfinAssetUploadControls.tsx: 662 Zeilen (>450)**
- **Ursache:** Pre-existing — Datei war bereits vor Plan 79-04 mit 632 Zeilen über dem CLAUDE.md-Limit
- **Aktion:** In `deferred-items.md` dokumentiert; Split (AnimeAssetRenderHelpers.tsx) als Follow-up-Quick-Task empfohlen
- **Impact:** Kein Functional-/Type-Fehler; Plan-Ziel vollständig erreicht

## Known Stubs

Keine. Alle Ownership-Codes fließen in echte API-Aufrufe (visibilityCode/reviewStatusCode an uploadReleaseVersionMedia und uploadAdminAnimeMedia).

## Threat Flags

Keine neuen Threat-Oberflächen über den Plan-Threat-Register hinaus. Implementierte Threats:
- T-79-04-01 (versionId als ownerID): Backend bleibt Authority, Frontend ownerID rein informativ ✓
- T-79-04-02 (reviewStatusCode Tampering): Backend-Handler-Whitelist (Plan 79-02) ist Guard ✓
- T-79-04-03 (Anime-Assets immediate): Admin-Capability-Gate bestehend ✓
- T-79-04-04 (categoryValue → setSelectedCategory): TypeScript-Cast + Backend CHECK-Constraint (Migration 0059) ✓

## Self-Check: PASSED

Dateien vorhanden:
- frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts ✓ (visibilityCode/reviewStatusCode in startUpload)
- frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx ✓ (396 Zeilen, ≤450)
- frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx ✓ (63 Zeilen, neu)
- frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx ✓ (MediaOwnershipContext eingebunden)

Commits vorhanden:
- 492dc514 (feat(79-04): useReleaseVersionMedia startUpload-Erweiterung) ✓
- 2a512e33 (feat(79-04): Surface 4 — ReleaseVersionMediaSection) ✓
- 0da8dbf3 (feat(79-04): Surface 2 — AnimeJellyfinAssetUploadControls) ✓

Verifikation:
- tsc --noEmit: kein Fehler ✓
- vitest run src/components/admin/media/: 16/16 Tests grün ✓
- ReleaseVersionMediaSection.tsx ≤ 450 Zeilen (396 Z.) ✓
- MediaOwnershipContext in beiden Zieldateien eingebunden ✓
- categoryMode="dropdown" in ReleaseVersionMediaSection.tsx ✓
- Kein natives <select> in ReleaseVersionMediaSection.tsx (Kategorie-Dropdown entfernt, MediaOwnershipContext übernimmt) ✓
