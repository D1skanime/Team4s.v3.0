---
phase: quick-260916-emd
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
---

# Quick 260916-emd — Episoden-Metadaten manuell pflegbar

## Ziel

Canon/Filler (`episodes.filler_type_id`) und technischer Episodentyp (`episodes.episode_type_id`)
im Admin an zwei Stellen bearbeitbar machen: Episoden-Übersicht und Versionseditor („Informationen“).
Beide Werte existieren genau einmal pro Episode. Manuelle Werte haben Vorrang vor aniSearch.

## Voranalyse (vor Umsetzung)

| Frage | Befund |
|---|---|
| filler_type_id gelesen | nirgends außer Import-Upsert |
| filler_type_id geschrieben | `episode_import_repository_apply.go` (Insert + Update, immer `COALESCE($5, …)` mit Default `unknown` → überschreibt bei jedem Reimport) |
| episode_type_id gelesen | Import sucht bestehende Episode über `episode_type_id = episode` |
| episode_type_id geschrieben | `CreateEpisode`, `UpdateEpisode` (Nummernänderung setzt hart `episode`), Import-Insert |
| aniSearch | liefert Filler (canon/filler/mixed/recap), Episodentyp nie (immer `episode`) |
| Update-Endpunkt | `PATCH /api/v1/admin/episodes/:id` existiert → wird erweitert |
| DTOs | keine Einstufung in Admin-DTOs; Editor-Context kennt die Episode nicht (Weg: `release_versions → fansub_releases.episode_id`) |
| Provenienz | `filler_source` existiert (Import schreibt `anisearch`); für Episodentyp nichts |
| DB-Constraint | `uq_episodes_anime_number_type (anime_id, number, episode_type_id)` |

Risiko: Ein manuell auf `special` gesetztes EP 01 würde beim Reimport nicht wiedergefunden und dupliziert.

## Tasks

1. Migration 0167 `episodes.episode_type_source` (additiv, keine Datenänderung).
2. PATCH erweitert um `filler_type`/`episode_type` (exakte Allowlist, 4xx, keine Fallbacks), setzt Quelle `manual`,
   `modified_at`/`modified_by`; Nummernänderung erhält manuellen Typ; Unique-Konflikt → 409.
3. Lesepfade: `GET /admin/anime/:id/episode-classifications` (Übersicht), `episode` im Editor-Context.
4. Import: manuelle Filler-Werte nicht überschreiben; Episode auch mit manuellem Typ wiederfinden.
5. Frontend: gemeinsame `EpisodeClassificationFields` in Übersicht-Zeile und Editor-Abschnitt.
6. Tests Backend (Postgres + Handler), Frontend (Komponente + Cross-View), 11eyes-Abnahme.
