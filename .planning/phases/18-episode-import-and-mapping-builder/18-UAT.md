---
status: testing
phase: 18-episode-import-and-mapping-builder
source:
  - 18-01-SUMMARY.md
  - 18-02-SUMMARY.md
  - 18-03-SUMMARY.md
  - 18-04-SUMMARY.md
started: "2026-04-19T19:29:28.4501979+02:00"
updated: "2026-04-19T20:06:00.0000000+02:00"
---

## Current Test

number: 5
name: Manual Multi-Episode Mapping
expected: |
  In einer Mapping-Zeile kann ein Jellyfin-Medium auf mehrere kanonische Episoden gesetzt werden, zum Beispiel `9,10`. Die Eingabe wird sortiert/dedupliziert, als bestaetigt markiert und bleibt vor dem Apply editierbar.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Nach einem frischen Docker-Start laufen Backend, Frontend, Datenbank und Redis ohne sichtbare Fehler. Die neue Migration fuer Episode-Coverage ist angewendet, `/admin/anime/1/episodes/import` laedt mit Status 200, `/admin/anime/create` laedt weiterhin mit Status 200, und die Basis-API `/api/v1/anime` antwortet live.
result: pass

### 2. Episode Import Entry Point
expected: Auf der bestehenden Episoden-Uebersicht eines Anime gibt es eine sichtbare Aktion `Import & Mapping`, die zur neuen Import-Seite `/admin/anime/[id]/episodes/import` fuehrt.
result: pass

### 3. Import Context And Source Controls
expected: Die Import-Seite zeigt den Anime-Kontext, inklusive Titel und verknuepftem Ordnerpfad, sowie Quellen-/Steuerfelder fuer AniSearch-Kanon, Jellyfin-Medien und optionale Mapping-Anpassung.
result: issue
reported: "Issue der anime hat den order path"
severity: major

### 4. Preview Keeps Canonical Episodes Separate From Media
expected: Nach `Preview` werden AniSearch-Episoden als kanonische Episodenliste und Jellyfin-Dateien/Medien als separate Kandidaten angezeigt. Jellyfin-SxxExx-Werte dienen nur als Vorschlag und ersetzen nicht die AniSearch-Episodennummern.
result: issue
reported: "Application error: a client-side exception has occurred while loading localhost (see the browser console for more information)."
severity: blocker

### 5. Manual Multi-Episode Mapping
expected: In einer Mapping-Zeile kann ein Jellyfin-Medium auf mehrere kanonische Episoden gesetzt werden, zum Beispiel `9,10`. Die Eingabe wird sortiert/dedupliziert, als bestaetigt markiert und bleibt vor dem Apply editierbar.
result: [pending]

### 6. Conflict And Skip Control
expected: Konflikte zwischen aktiven Mapping-Zeilen sind sichtbar, `Apply` bleibt bei `suggested` oder `conflict` deaktiviert, und einzelne Zeilen koennen bewusst uebersprungen werden.
result: [pending]

### 7. Apply Persists Confirmed Mappings
expected: Nach explizitem Apply werden nur bestaetigte oder uebersprungene Zuordnungen gespeichert. Canonical Episode-Titel werden fill-only behandelt, eine Jellyfin-Datei kann mehrere Episoden ueber Coverage abdecken, und die Episodenuebersicht bleibt danach nutzbar.
result: [pending]

### 8. Existing Create Flow Still Works
expected: Der bereits abgeschlossene Anime-Create-Flow unter `/admin/anime/create` laedt weiterhin und zeigt keine Regression durch die neue Episode-Import-Route.
result: [pending]

## Summary

total: 8
passed: 2
issues: 2
pending: 4
skipped: 0
blocked: 0

## Gaps

- truth: "Die Import-Seite zeigt den Anime-Kontext, inklusive Titel und verknuepftem Ordnerpfad, sowie Quellen-/Steuerfelder fuer AniSearch-Kanon, Jellyfin-Medien und optionale Mapping-Anpassung."
  status: failed
  reason: "User reported: Issue der anime hat den order path"
  severity: major
  test: 3
  root_cause: "Create-Payload bevorzugte AniSearch-Provenienz und uebernahm dabei den aktiven Jellyfin-Vorschaupfad nicht als folder_name."
  artifacts:
    - path: "frontend/src/app/admin/anime/create/createPageHelpers.ts"
      issue: "appendCreateSourceLinkageToPayload setzte folder_name aus dem AniSearch-Draft und fiel nicht auf die Jellyfin-Vorschau zurueck."
  missing:
    - "Bei AniSearch+Jellyfin-Mischanlage source=anisearch behalten, relations behalten, aber folder_name aus jellyfin_series_path persistieren."
- truth: "Nach `Preview` werden AniSearch-Episoden als kanonische Episodenliste und Jellyfin-Dateien/Medien als separate Kandidaten angezeigt. Jellyfin-SxxExx-Werte dienen nur als Vorschlag und ersetzen nicht die AniSearch-Episodennummern."
  status: failed
  reason: "User reported: Application error: a client-side exception has occurred while loading localhost (see the browser console for more information)."
  severity: blocker
  test: 4
  root_cause: "Backend serialisierte fehlende Jellyfin-Kandidaten als null; das Frontend renderte die Preview wie Arrays und crashte clientseitig."
  artifacts:
    - path: "backend/internal/handlers/admin_episode_import.go"
      issue: "buildEpisodeImportPreview normalisierte nil slices nicht."
    - path: "frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts"
      issue: "Preview-Antworten wurden vor dem Rendern nicht defensiv normalisiert."
  missing:
    - "Backend gibt leere Listen statt null zurueck."
    - "Frontend behandelt Preview-Listen defensiv als leere Arrays."
