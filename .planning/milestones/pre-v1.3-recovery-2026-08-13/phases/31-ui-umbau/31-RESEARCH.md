---
phase: 31
researched: 2026-04-30
status: complete
---

# Phase 31: UI Umbau - Research

## Relevante bestehende Codepfade

- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`
  - aktuelle Fansub-Edit-Seite
  - bereits mit Profilkopf, Formularsektionen und neuem `Anime & Releases`-Abschnitt
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseThemeAssetsSection.tsx`
  - bestehender UI-Pfad fuer release-nahe Theme-Assets
  - wichtig als Referenz fuer Upload-/Asset-Pflege im Theme-Kontext
- `frontend/src/app/admin/fansubs/[id]/edit/FansubOpEdSection.tsx`
  - bestehende OP/ED-nahe Verwaltung
  - nicht in generisches Release-Media verschieben
- `frontend/src/lib/api.ts`
  - `getAdminFansubAnime`
  - `getAdminFansubAnimeReleases`
  - `getAdminCanonicalFansubRelease`
  - `getAdminRelease`
  - `getAdminReleaseThemeAssets`
  - `uploadAdminReleaseThemeAsset`
  - `deleteAdminReleaseThemeAsset`
- `backend/internal/repository/admin_content_fansub_releases.go`
  - explizite Release-Reads aus Phase 30
- `backend/internal/repository/admin_content_anime_themes.go`
  - Theme-/Segment- und Release-Theme-Asset-Daten
- `backend/internal/repository/episode_version_repository.go`
  - public `ListReleaseAssets` fuer generisches Release-Media

## UI-Architektur-Empfehlung

### Kein globaler Release-Drawer als erster Schritt

Ein globaler Drawer wirkt im Mockup gut, aber der besprochene Workflow ist staerker, wenn die Release selbst die Arbeitsflaeche oeffnet. Ausklappbare Zeilen halten den Admin im Anime-/Release-Kontext und zeigen sofort, welche Release betroffen ist.

### Ausklappbare Release-Zeilen

Jede Release-Zeile bekommt:

- Chevron zum Auf-/Zuklappen
- Release-ID
- Episode
- Titel/Dateiname
- Version
- Status
- Asset-/Segment-Indikatoren
- kompakte Aktionen wie `Ansehen` und `Versionen`

Im aufgeklappten Bereich:

- Theme-/Segment-Karten
- Zustand pro Segment: `global`, `release`, `fehlt`
- Klickbare Karte fuer Bearbeitung
- Hinweis, dass generisches Prozess-Media getrennt von OP/ED/Theme-Segmenten ist

### Segment-Karten statt generische Upload-Kacheln

Die Hauptfrage beim Release-Admin ist nicht zuerst "welche Datei lade ich hoch?", sondern "welches Segment/Theme braucht fuer diese Release Pflege?". Darum sollten Segment-Karten der Einstieg sein.

## Daten-/API-Bedarf

Bereits vorhanden:

- Fansub-Anime-Liste
- Releases pro Fansub-Anime
- Release-Detail
- Release-Theme-Assets lesen/schreiben/loeschen
- Public Release-Assets lesen

Noch noetig oder zu pruefen:

- Ein kompakter Endpoint/Helper fuer Segment-Status je Release, falls bestehende Theme-/Segment-Endpoints zu breit sind.
- Frontend Aggregation: globale/admin gesetzte Segmentdaten plus release-spezifische Assets zusammenfuehren.
- Admin APIs fuer generisches Release-Prozess-Media, falls Prozess-Media in dieser Phase schon schreibend umgesetzt wird.

## Validierungsarchitektur

Phase 31 muss in drei Ebenen verifiziert werden:

1. Daten: Fansub 17 / Anime 13 / Anime 14 / Release 92 erscheinen aus echten API-Daten.
2. UI: Release-Zeilen sind ausklappbar und zeigen Segment-Kontext statt nur Links.
3. Scope: OP/ED/Karaoke/Insert werden nicht in generisches `release_media` verschoben.

## Risiken

- Die Fansub-Edit-Seite kann ueberladen werden, wenn alle Release-Details inline erscheinen.
- Bestehende OP/ED-Flows duerfen nicht doppelt dargestellt oder fachlich umgebogen werden.
- Es besteht Verwechslungsgefahr zwischen Theme-/Segment-Assets (`release_theme_assets`) und generischem Prozess-Media (`release_media`).
- Bei vielen Releases braucht die UI eine lazy-loading Strategie pro aufgeklappter Release.
