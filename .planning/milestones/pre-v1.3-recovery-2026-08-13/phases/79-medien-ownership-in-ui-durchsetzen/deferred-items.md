# Zurückgestellte Punkte — Phase 79 Pläne 02 + 04

## Pre-existing TypeScript-Fehler in MediaOwnershipContext.test.tsx

**Gefunden während:** Task 3 (api.ts TypeCheck)
**Datei:** `frontend/src/components/admin/media/MediaOwnershipContext.test.tsx`
**Fehler:** TS2558 / TS2322 — `Mock<[MediaOwnershipContextValue]>` Typ-Kompatibilitätsfehler
**Ursache:** Pre-existing aus Plan 79-01 (Vitest-Mock-Typ-API-Änderung)
**Aktion:** Außerhalb des Scopes von Plan 79-02; keine neuen Fehler durch meine api.ts-Änderungen
**Fix:** Gehört zu Plan 79-01 oder einem Follow-up-Quick-Task

## AnimeJellyfinAssetUploadControls.tsx über 450 Zeilen (662 Z.)

**Gefunden während:** Task 3 (79-04)
**Datei:** `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinAssetUploadControls.tsx`
**Situation:** Die Datei war bereits vor Plan 79-04 mit 632 Zeilen über dem CLAUDE.md-Limit (450 Z.). Plan 79-04 fügte ~30 Zeilen hinzu.
**Ursache:** Pre-existing — renderPersistedBody, renderStateFrame, renderPersistedStatus sind große interne Render-Funktionen die einen Split benötigen.
**Aktion:** Außerhalb des Scopes von Plan 79-04 (die Kernaufgabe — MediaOwnershipContext-Einbindung — ist vollständig und korrekt).
**Fix-Plan:** Extrahiere AnimeAssetRenderHelpers.tsx mit den drei internen Render-Funktionen als separater Follow-up-Quick-Task.
