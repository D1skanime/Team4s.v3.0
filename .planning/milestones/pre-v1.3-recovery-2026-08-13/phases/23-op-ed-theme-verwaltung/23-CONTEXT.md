---
phase: 23
gathered: 2026-04-25
status: ready_for_planning
---

# Phase 23: OP/ED Theme Verwaltung — Kontext

## Ziel

Admins können Opening- und Ending-Themes pro Anime verwalten und Fansub-Gruppen können die zugehörigen Videos hochladen.

## Architektur-Entscheidungen

### Zwei getrennte Konzepte

**1. Theme-Definition (Anime-Ebene)**
- Welche OP/EDs existieren für ein Anime
- Titel des Songs (z.B. "R★O★C★K★S")
- Theme-Typ (OP1, OP2, ED1, ED2, Insert, Outro)
- Episodenbereich (von Episode X bis Episode Y) — **optional**

**2. Video-Datei (Release-Ebene via Fansub)**
- Jede Fansub-Gruppe lädt ihre Version des OP/ED-Videos hoch
- Verknüpfung über `release_theme_assets` (release_id → theme_id → media_id)
- Verschiedene Gruppen können verschiedene Encodings haben

### UI-Flow

**Theme verwalten:**
`Admin → Anime-Edit-Seite → Abschnitt "Openings & Endings"` → CRUD für Themes mit Episodenbereich

**Video hochladen:**
`Admin → Fansub-Edit-Seite → Tab "Releases" → Anime auswählen → OP/ED Video hochladen + Theme zuweisen`

### Fansub-Release-Ableitung (automatisch)

**Entscheidung:** Fansub-Releases werden **nicht manuell angelegt**. Die Anime-Liste auf der Fansub-Seite ergibt sich automatisch aus `anime_fansub_groups` — wenn eine Gruppe bereits Episoden für ein Anime importiert hat, erscheint dieses Anime in der Release-Liste.

**Implementierung:**
- Fansub-Releases Tab: `SELECT DISTINCT anime_id FROM anime_fansub_groups WHERE fansub_group_id = ?`
- Beim ersten Video-Upload für Gruppe+Anime: `fansub_releases`-Eintrag wird automatisch per `INSERT ... ON CONFLICT DO NOTHING` angelegt
- `release_theme_assets.release_id` referenziert diesen auto-erstellten `fansub_releases`-Eintrag

**UI-Mockup:**
```
Tab: Releases
──────────────────────────────────────────
  Naruto                    [+ OP/ED hinzufügen]
  ├── OP1 "R★O★C★K★S"  Ep.1–25  🎬 video.mp4  [✕]
  ├── OP2 "Haruka Kanata" Ep.26–48  (kein Video)  [↑ Upload]
  └── ED1 "Wind"  Ep.1–25   🎬 video.mp4  [✕]

  Bleach                    [+ OP/ED hinzufügen]
  └── (noch keine Themes definiert)
```

**„+ OP/ED hinzufügen" Dialog:**
```
  Theme:   [ OP1 "R★O★C★K★S" ▼ ]  (aus Anime-Themes)
  Video:   [ Datei wählen...   ]
  [ Speichern ]
```

### Upload-Mechanismus

Der **bestehende** Upload-Endpoint `POST /api/admin/upload` wird wiederverwendet:
- `asset_type=theme_video` (neu zu registrieren in `normalizeUploadAssetType`)
- `entity_type=fansub_release`
- `entity_id=<fansub_release_id>`

Danach `POST /api/v1/admin/releases/:releaseId/theme-assets` um `media_id` mit `theme_id` zu verknüpfen.

### Scope V1

- ✅ Theme-CRUD auf Anime-Edit-Seite
- ✅ Episodenbereich optional (für Insert Songs, Clean OPs, etc.)
- ✅ theme_types seeden: OP1, OP2, ED1, ED2, Insert, Outro
- ✅ Fansub-Releases Tab auf Fansub-Edit-Seite (auto aus anime_fansub_groups)
- ✅ Video-Upload + Theme-Zuweisung pro Fansub+Anime
- ✅ `theme_video` in normalizeUploadAssetType registrieren
- ❌ Öffentliche Anzeige / Playback (deferred — DB-Verbindungen erst aufbauen)
- ❌ Jellyfin-Integration für Videos (deferred)
- ❌ episode_theme_overrides (Sonderfälle pro Episode, deferred)

### Episodenbereich optional — Warum

- Insert Song in Episode 133 → kein regulärer Bereich
- Clean OP / Creditless → Extra, kein Bereich
- Normaler OP1 → Episode 1 bis 25

## DB-Schema (bereits vorhanden)

```sql
themes               -- anime_id, theme_type_id, title
theme_segments       -- theme_id, start_episode_id, end_episode_id (NULL = kein Bereich)
theme_types          -- id, name (leer → muss geseedet werden)
fansub_releases      -- id, fansub_group_id, anime_id (auto-erstellt beim ersten Upload)
release_theme_assets -- release_id, theme_id, media_id
```

## Offene Fragen (alle gelöst)

| Frage | Entscheidung |
|-------|-------------|
| Wo werden Videos hochgeladen? | Fansub-Edit-Seite, Tab "Releases" |
| Fansub-Releases manuell anlegen? | Nein, automatisch aus anime_fansub_groups |
| Upload-Mechanismus | Bestehender /api/admin/upload mit asset_type=theme_video |
| Jellyfin-Integration? | Nein, deferred |
| Episodenbereich Pflicht? | Nein, optional |
| Wo werden Themes verwaltet? | Anime-Edit-Seite |
| Öffentliche Anzeige? | Deferred — erst DB-Verbindungen aufbauen |
| theme_video in Upload registrieren? | Ja, in normalizeUploadAssetType |
