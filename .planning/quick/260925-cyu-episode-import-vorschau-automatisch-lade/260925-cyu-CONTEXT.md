# Quick Task 260925-cyu: Episode-Import Vorschau automatisch laden und redundante Quellenkarte entfernen - Context

**Gathered:** 2026-09-25
**Status:** Ready for implementation

<domain>
## Task Boundary

Beim Öffnen von /admin/anime/:id/episodes/import soll die Import-Vorschau automatisch geladen werden. Die bisherige Quellen-Konfigurationskarte mit erneutem AniSearch-Feld und Season Offset entfällt aus dem normalen Ablauf. Die Kontextanzeige wird auf die für den Import relevanten Identitäten reduziert.

</domain>

<decisions>
## Implementation Decisions

- Vorschau beim erfolgreichen Laden des Import-Kontexts automatisch mit der vorhandenen AniSearch-ID, Season Offset 0 und dem Haupt-Jellyfin-Ordner starten.
- Die doppelte AniSearch-/Season-Offset-Karte und der Button „Vorschau laden“ werden aus dem normalen Ablauf entfernt.
- Jellyfin-Serien-ID ist die verständliche Bezeichnung für die konkrete Jellyfin-Referenz.
- Der rohe Quellschlüssel jellyfin:<id> wird nicht zusätzlich angezeigt, weil er dieselbe Jellyfin-ID redundant wiederholt.
- Mehrere Jellyfin-Ordner bleiben möglich; die Ordnerauswahl bleibt als kompakter separater Selektor erhalten und lädt bei Wechsel automatisch eine neue Vorschau.
- Mehrserver-Unterstützung wird nicht in diesem Quick Task erfunden. Die spätere eindeutige Identität muss server_key/Jellyfin-Instanz plus Item-ID verwenden; die aktuelle Einzelserver-Semantik bleibt unverändert.
- Fehlt eine Jellyfin-Verknüpfung, wird keine erfundene Quelle angezeigt. Fansub-Releases ohne Jellyfin gehören in den release-/fansubbezogenen Flow.

</decisions>

<specifics>
## Specific Ideas

- Der Nutzer möchte beim Klick auf „Import & Mapping“ direkt die geladenen Episoden-/Datei-Daten sehen, ohne einen Zwischenschritt.
- Die kleine AniSearch-ID soll nicht in einer übergroßen gleichbreiten Kontextkarte dargestellt werden.

</specifics>

<canonical_refs>
## Canonical References

- .planning/phases/168-episoden-import-ui-flow-und-kartenbereinigung-vorschau-beim-/.gitkeep
- .planning/phases/167-fansub-gruppenerkennung-beim-import/167-CONTEXT.md
- .planning/phases/165-library-discovery-assisted-anime-creation/165-CONTEXT.md — Mehrserver-Unterstützung als spätere Phase; server_key als Vorsorge
- frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
- frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts

</canonical_refs>
