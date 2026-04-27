---
phase: 25
gathered: 2026-04-27
status: ready_for_planning
---

# Phase 25: Segmente UI Mockup-Alignment — Kontext

## Ziel

Die Segmente-Seite (`/admin/episode-versions/:id/edit` → Tab "Segmente") wird vollständig an das bereitgestellte Mockup angeglichen.

## Referenz-Mockup

Das Mockup zeigt folgende UI-Elemente (alle müssen exakt umgesetzt werden):

### Linke Seite (Hauptinhalt)

**Breadcrumb-Navigation:**
```
Anime › Attack on Titan › Episode 3 › Group XYZ v2
```
- Jeder Teil ist ein klickbarer Link
- Anime-Name aus contextData.anime_title
- Episode-Nummer aus contextData.version.episode_number
- Gruppe + Version aus release_version_groups

**Seiten-Header:**
- Anime-Cover (klein, links)
- Anime-Titel groß
- "Episode 3 · Release: Group XYZ v2 · Aktiv" Badge

**5-Tab-Navigation:**
| Tab | Inhalt |
|-----|--------|
| Übersicht | Episode-Übersicht (vorhanden) |
| Dateien | Dateien/Varianten (vorhanden) |
| Informationen | Metadaten (= aktuelles Formular "Allgemein") |
| **Segmente** | SegmenteTab (Phase 24) |
| Changelog | Änderungshistorie (deferred) |

**Tabelle (Segmente-Tab):**
- Spalten: Typ | Name | Episoden | Zeitbereich | Quelle | Aktionen
- Typ: farbiger Badge mit kurzem Code (OP grün, ED lila, IN orange, PV grau)
- Name: Theme-Name (z.B. "Opening 1") oder "—"
- Episoden: "1 – 12" oder bei Einzelepisode nur "3" (nicht "3 – 3")
- Zeitbereich: "00:00:30 – 00:01:45 **(01:15)**" mit Dauer in Klammern
- Quelle: Jellyfin-Icon + "Jellyfin Item #12345" oder "–"
- Aktionen: ✏️ (Bearbeiten) + ⋮ (Mehr-Menü mit "Löschen")

**Vorschläge-Leiste** (unter Tabelle):
```
⚡ Vorschläge für diese Episode
   Basierend auf anderen Releases dieses Animes
   [Opening 1 (Ep. 1–12) übernehmen]  [Ending 1 (Ep. 1–12) übernehmen]
```
- Zeigt Segmente aus ANDEREN Release-Versionen desselben Anime
- "Übernehmen" Button kopiert das Segment in die aktuelle Release-Version
- Nur sichtbar wenn andere Releases Segmente haben

**Timeline Vorschau – Episode [N]:**
- Zeitachse: 00:00:00 bis max(end_time) als Gesamtbreite
- Untere Spur: OP-Block | Hauptinhalt-Label | ED-Block (proportional)
- Insert Songs / PV: als schwebende Elemente oberhalb der Hauptspur
- Zeitstempel an relevanten Grenzen
- Segment-Label innerhalb der Blöcke (OP, ED, etc.)

### Rechte Seite (Seitenleisten-Formular)

**"Neues Segment hinzufügen" / "Segment bearbeiten":**
- Titel + X-Schließen-Button

**Typ-Dropdown:**
- Format: "Opening **(OP)**" — Name + farbiger Code-Badge
- Alle verfügbaren theme_types

**Name** (optional): Text-Input

**Episodenbereich:**
```
[  1  ] bis [  12  ]
Für welche Episoden gilt dieses Segment?
```

**Zeitbereich im Video:**
```
Start          Ende
[00:00:30] ⏱  [00:01:45] ⏱
Zeitangaben im Format HH:MM:SS
```

**Quelle** (optional — klickbar):
```
[Jellyfin-Icon] Jellyfin Item auswählen        >
                Wähle ein vorhandenes Video/Audio aus
```
- Klick öffnet Jellyfin-Suche (Items aus dem konfigurierten Jellyfin-Server)
- Zeigt gefundene Items mit Titel und Media-ID
- Ausgewähltes Item wird gespeichert als source_jellyfin_item_id

**Video-Vorschau:**
- Eingebetteter Player wenn Jellyfin-Item ausgewählt
- Spielt das Video über den bestehenden Proxy-Endpoint ab
- Zeigt start_time / end_time als Zeitanzeige
- Play/Pause-Button und Fortschrittsbalken

**Abbrechen | Speichern** Buttons

## Technische Details

### Breadcrumb-Daten
Aus `contextData` (bereits im `useEpisodeVersionEditor`-Hook geladen):
- `anime_id`, `anime_title` → Anime-Link
- `episode_id`, `episode_number` → Episode-Link
- `fansub_group_id`, `fansub_group_name` → Gruppe
- `version` → Version-Label

### Vorschläge-Endpoint (neu)
```
GET /api/v1/admin/anime/:animeId/segments/suggestions?episode=N&exclude_group_id=X&exclude_version=v1
```
Gibt Segmente aus anderen Releases zurück die Episode N abdecken.

### Jellyfin-Item-Suche (neu)
```
GET /api/v1/admin/jellyfin/items?q=opening&type=Audio,Video
```
Sucht im Jellyfin-Server nach Items (nutzt bestehende Jellyfin-Client-Infra).

### Video-Proxy (vorhanden)
`/api/episodes/:id/play` oder direkt Jellyfin-URL — für Vorschau im Formular.

## Scope V1

- ✅ Breadcrumb-Navigation
- ✅ 5-Tab-Layout (Übersicht stub, Dateien stub, Informationen = aktuell Allgemein, Segmente, Changelog stub)
- ✅ Typ-Dropdown mit Badge-Format "Name (CODE)"
- ✅ Zeitbereich mit Dauer in Klammern
- ✅ Einzelepisode als "3" statt "3 – 3"
- ✅ Quelle-Spalte mit Jellyfin-Icon
- ✅ ⋮-Mehr-Menü (Löschen-Aktion darin)
- ✅ Vorschläge-Leiste mit Übernehmen-Button
- ✅ Verbesserter Timeline (Hauptinhalt-Label, schwebende Insert Songs)
- ✅ Jellyfin-Item-Suche im Formular
- ✅ Video-Vorschau-Player im Formular
- ❌ Changelog-Tab Inhalt (deferred)
- ❌ Übersicht/Dateien-Tab Inhalt (stubs, echte Inhalte deferred)
