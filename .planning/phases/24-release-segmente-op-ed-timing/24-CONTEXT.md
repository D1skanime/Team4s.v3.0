---
phase: 24
gathered: 2026-04-26
status: ready_for_planning
---

# Phase 24: Release-Segmente (OP/ED Timing) — Kontext

## Ziel

Admins können auf der Episode-Version-Edit-Seite OP/ED-Segmente für eine Fansub-Gruppe und Version verwalten. Segmente definieren Typ (OP/ED/IN/PV), Name, Episodenbereich (plain integers) und Zeitbereich im Video (HH:MM:SS).

## Architektur-Entscheidungen

### Segment-Konzept

- Segmente gehören zu **Release-Ebene** (Gruppe + Version), NICHT zur Anime-Ebene
- Episodenbereich = **plain integers** (start_episode, end_episode) — KEIN FK auf episodes-Tabelle
- Ein Segment gilt für ALLE Episoden im Bereich: "OP1 gilt für Episode 1–12" = 1 Eintrag, nicht 12
- Verschiedene Gruppen können für dieselbe Theme verschiedene Timing-Werte haben

### DB-Anker: (anime_id, fansub_group_id, version)

`fansub_releases` ist per Episode — kein einzelnes Objekt für "B-SH v1 für Anime XX gesamt".
Das Tripel `(anime_id, fansub_group_id, version)` wird aus dem Kontext der Episode-Version-Edit-Seite abgeleitet:
- `fansub_releases.episode_id` → `episodes.anime_id` = anime
- `release_version_groups.fansub_group_id` = gruppe
- `release_versions.version` = version

### Migration: theme_segments erweitern (Option A)

```sql
ALTER TABLE theme_segments
  ADD COLUMN fansub_group_id bigint REFERENCES fansub_groups(id) ON DELETE CASCADE,
  ADD COLUMN version varchar(20) NOT NULL DEFAULT 'v1',
  ADD COLUMN start_episode integer,   -- ersetzt start_episode_id
  ADD COLUMN end_episode integer,     -- ersetzt end_episode_id
  ADD COLUMN start_time interval,     -- 00:00:30 im Video
  ADD COLUMN end_time interval,       -- 00:01:45 im Video
  ADD COLUMN source_jellyfin_item_id text,
  DROP COLUMN start_episode_id,
  DROP COLUMN end_episode_id;

ALTER TABLE theme_segments
  ADD CONSTRAINT chk_episode_range CHECK (end_episode >= start_episode),
  ADD CONSTRAINT chk_time_range CHECK (
    end_time IS NULL OR start_time IS NULL OR end_time > start_time
  );

CREATE INDEX idx_theme_segment_group ON theme_segments(fansub_group_id);
CREATE INDEX idx_theme_segment_ep_range ON theme_segments(fansub_group_id, version, start_episode, end_episode);
```

### Playback-Query

```sql
SELECT t.title, tt.name as type, ts.start_time, ts.end_time
FROM themes t
JOIN theme_types tt ON tt.id = t.theme_type_id
JOIN theme_segments ts ON ts.theme_id = t.id
WHERE t.anime_id = $anime_id
  AND ts.fansub_group_id = $group_id
  AND ts.version = $version
  AND $episode_number BETWEEN ts.start_episode AND ts.end_episode
ORDER BY ts.start_time;
```

### UI-Flow

**Einstieg:** `/admin/episode-versions/:id/edit` → Tab "Segmente"

**Tab-Inhalt (wie Mockup):**
- Tabelle mit Spalten: Typ (Badge), Name, Episoden, Zeitbereich, Quelle, Aktionen (Edit, Delete)
- Button "+ Segment hinzufügen" öffnet Seitenleisten-Formular
- Seitenleisten-Formular: Typ-Dropdown, Name (optional), Episodenbereich (zwei Zahlenfelder), Zeitbereich (HH:MM:SS Start/Ende), Quelle (Jellyfin Item optional)
- Timeline-Vorschau: farbige Blöcke proportional zum Zeitbereich am unteren Seitenrand
- Vorschläge aus anderen Releases desselben Anime (falls vorhanden)

**Typ-Badges (Farben wie Mockup):**
- OP → grün
- ED → lila/violett
- IN → orange
- PV → grau
- weitere: blau

### Segment-Typen (ThemeType-Tabelle)

Aktuell geseedet: OP1, OP2, ED1, ED2, Insert, Outro (aus Phase 23)
Für V1 vereinfachen auf: OP, ED, IN, PV (short codes)
→ Migration prüfen: sind die aktuellen ThemeType-Namen kompatibel?

### Scope V1

- ✅ Migration: theme_segments erweitern
- ✅ Backend: CRUD für Segmente mit neuem Schema
- ✅ Frontend: Tab "Segmente" auf Episode-Version-Edit-Seite
- ✅ Tabelle mit Typ-Badges, Episodenbereich, Zeitbereich, Quelle
- ✅ Seitenleisten-Formular (Add/Edit)
- ✅ Timeline-Visualisierung (proportionale Blöcke)
- ❌ Vorschläge aus anderen Releases (deferred — zu komplex für V1)
- ❌ Video-Vorschau im Formular (deferred)
- ❌ Jellyfin-Item-Suche im Formular (deferred — nur Text-Input für Item-ID)

## DB-Schema (vorhanden)

```sql
themes               -- anime_id, theme_type_id, title (Anime-Ebene)
theme_types          -- id, name (OP1, OP2, ED1, ED2, Insert, Outro)
theme_segments       -- WIRD ERWEITERT (siehe Migration oben)
fansub_releases      -- id, episode_id (per Episode!)
release_versions     -- id, release_id, version
release_version_groups -- release_version_id, fansub_group_id
```

## Offene Fragen (alle gelöst)

| Frage | Entscheidung |
|-------|-------------|
| Episodenbereich als FK oder plain int? | Plain integers (nicht FK auf episodes-Tabelle) |
| Wo sind Segmente gespeichert? | theme_segments (erweitert) mit (fansub_group_id, version) |
| Wo ist die UI? | Tab "Segmente" auf /admin/episode-versions/:id/edit |
| Neue Tabelle oder bestehende erweitern? | Bestehende theme_segments erweitern (Option A) |
| Jellyfin-Source im Formular | Nur Text-Input für Item-ID, kein Search-Dialog in V1 |
| Timeline-Visualisierung | Ja, proportionale farbige Blöcke |
