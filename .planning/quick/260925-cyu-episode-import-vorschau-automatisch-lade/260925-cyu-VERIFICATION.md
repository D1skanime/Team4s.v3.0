---
status: human_needed
---

# Verification: 260925-cyu

## Automated

- Builder- und Layout-Tests: 7/7 bestanden.
- TypeScript-Check: bestanden.
- ESLint auf den geänderten Dateien: bestanden.
- Diff-Whitespace-Check: bestanden.

## Must-haves

- [x] Initiale Vorschau wird aus dem geladenen Import-Kontext gestartet.
- [x] Doppelte AniSearch-/Season-Offset-Konfigurationskarte ist entfernt.
- [x] Rohes `jellyfin:<id>` wird nicht zusätzlich angezeigt.
- [x] Mehrordner-Auswahl bleibt erhalten und lädt bei Wechsel neu.
- [x] Keine Änderung an Release-/Fansub-Quellen oder der späteren `server_key`-Architektur.

## Human UAT offen

- Authentifiziert `/admin/anime/8/episodes/import` öffnen.
- Prüfen, dass Mapping-Daten ohne Klick auf „Vorschau laden“ erscheinen.
- Prüfen, dass `Jellyfin-Serien-ID` nur einmal und ohne separate Quellenkarte erscheint.
- Bei mehreren Jellyfin-Ordnern den Selektor wechseln und die neue Vorschau prüfen.
