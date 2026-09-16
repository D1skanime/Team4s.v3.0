---
phase: quick-260916-emd
plan: 01
subsystem: admin-episodes
tags: [episodes, filler, episode-type, anisearch, admin]

key-files:
  created:
    - database/migrations/0167_episode_type_source.up.sql
    - database/migrations/0167_episode_type_source.down.sql
    - backend/internal/models/episode_classification.go
    - backend/internal/repository/episode_classification.go
    - backend/internal/repository/episode_classification_postgres_test.go
    - backend/internal/handlers/admin_content_episode_classification.go
    - backend/internal/handlers/admin_content_episode_classification_test.go
    - frontend/src/types/episodeClassification.ts
    - frontend/src/components/episodes/EpisodeClassificationFields/
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeClassificationSection.tsx
  modified:
    - backend/cmd/server/admin_routes.go
    - backend/internal/handlers/admin_content_episode.go
    - backend/internal/handlers/admin_content_episode_validation.go
    - backend/internal/handlers/admin_content_episode_version_editor_helpers.go
    - backend/internal/handlers/admin_content_episode_version_editor_context_test.go
    - backend/internal/models/admin_content.go
    - backend/internal/models/episode_version.go
    - backend/internal/repository/admin_content_episode.go
    - backend/internal/repository/episode_import_repository_apply.go
    - frontend/src/app/admin/anime/[id]/episodes/page.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/components/episodes/EpisodesOverview/EpisodeAccordion.tsx
    - frontend/src/components/episodes/EpisodesOverview/EpisodeAccordion.module.css
    - frontend/src/components/episodes/EpisodesOverview/EpisodesOverview.tsx
    - frontend/src/lib/api.ts
    - frontend/src/types/admin.ts
    - frontend/src/types/episodeVersion.ts
    - shared/contracts/openapi.yaml
    - shared/contracts/admin-content.yaml
    - shared/contracts/episode-versions.yaml

key-decisions:
  - "Kanonisch bleiben episodes.filler_type_id und episodes.episode_type_id; keine parallele Struktur, Lookups unverändert."
  - "Provenienz: filler_source (bestehend, anisearch|manual) + neue Spalte episode_type_source (NULL|manual). manual schützt vor Reimport."
  - "Ein Update-Pfad: bestehendes PATCH /admin/episodes/:id erweitert; beide UIs speichern sofort bei Änderung."
  - "Import findet Episoden mit manuellem Typ wieder (sonst Duplikat über uq_episodes_anime_number_type)."
---

# Quick 260916-emd — Zusammenfassung

## Kanonische Felder und Pfad

- Canon/Filler: `episodes.filler_type_id` → `episode_filler_types`, Herkunft `episodes.filler_source`.
- Episodentyp: `episodes.episode_type_id` → `episode_types`, Herkunft `episodes.episode_type_source` (Migration 0167, additiv).
- Schreiben: `PATCH /api/v1/admin/episodes/:id` mit `filler_type` und/oder `episode_type`
  → `AdminContentRepository.UpdateEpisode` → `appendEpisodeClassificationAssignments`.
  Exakte Allowlist im Handler (400 bei ungültig/leer/null/falscher Schreibweise), Lookup im Repository
  (kein Fallback), Unique-Konflikt → 409, setzt `modified_at`/`modified_by`.
- Lesen Übersicht: `GET /api/v1/admin/anime/:id/episode-classifications`.
- Lesen Versionseditor: `episode` im Editor-Context, aufgelöst über `release_versions → fansub_releases.episode_id`.

## Trennung und recap

Jede Dimension wird nur geändert, wenn ihr Feld im PATCH gesetzt ist. Keine Ableitung zwischen
Filler, Episodentyp, Anime-Typ oder Relationen. `recap` ist in beiden Allowlists und wird unabhängig
gespeichert (Tests: recap+episode, canon+recap).

## Schutz manueller Werte

- Import überschreibt `filler_type_id`/`filler_note`/`filler_source` nicht, wenn `filler_source = manual`.
- Import findet bestehende Episoden über `episode_type_id = episode` **oder** `episode_type_source = manual`
  (Typ-Treffer bevorzugt); ohne das hätte ein manuell auf special gesetztes EP 01 beim Reimport ein
  Duplikat erzeugt (RED gegen alten Code bestätigt).
- Nummernänderung per PATCH setzt einen manuellen Episodentyp nicht mehr auf `episode` zurück.

## UI

- Übersicht: `EpisodeClassificationFields` pro Episode-Zeile unter dem Aufklapp-Button, nicht pro Version.
- Versionseditor, Tab Informationen: Abschnitt „Episode N“ (nur Plattform-Admin) mit Hinweis, dass die Werte
  für alle Versionen gelten. Gleiche Komponente, gleicher Endpunkt, sofortiges Speichern mit Statusmeldung,
  Rücksetzen + Fehlermeldung bei Fehler. Nur `@/components/ui` (`FormField`, `Select`).

## Tests

- Backend Postgres (`TEAM4S_EPISODE_METADATA_TEST_DSN`, DB `team4s_episode_metadata_test`): 5 Tests —
  unknown→canon, episode→special, mixed+ova, recap-Trennung, ungültiger Lookup = Konflikt, drei Versionen /
  eine Episode / Cross-View, Nummernänderung, Reimport-Override. Alle grün.
- Backend Handler: 8 ungültige Payloads → 400, alle gültigen Werte akzeptiert, Allowlists = Lookup-Seeds.
  Editor-Context-Fixture um Lookup-Spalten ergänzt; Editor-Context-Tests grün. `go test ./internal/handlers/` grün.
- Frontend: `EpisodeClassificationFields.test.tsx` (6) inkl. Cross-View Übersicht ↔ drei Versionseditoren.
  `vitest src/components/episodes src/app/admin/episode-versions` 309/309. tsc ohne neue Fehler, eslint 0 Fehler,
  `docker compose build team4sv30-frontend` erfolgreich.
- Vorbestehend/fremd: `cssCustomProperties.guard.test.ts` (`--surface-muted` in roleCatalog-Test),
  Repository-Tests ohne `TEAM4S_PHASE128_TEST_DSN`, YAML-Parsefehler in admin-content.yaml/episode-versions.yaml
  bereits auf HEAD; openapi.yaml valide.

## Live 11eyes (team4s_v2, 16.09.2026)

Migration 0167 beim Backend-Neubau angewendet. Über die echten Handler (PATCH, Übersichtsliste, Editor-Context)
mit Plattform-Admin-Identität, ohne Browser-Login:
- ungültige Werte → 400, Datensatz unverändert
- Übersicht: Canon + Special → Versionen 50 (Bloody-Shadow), 51 (FlameHaze-subs), 52 (Strawhat Subs) zeigen canon/special
- Editor: Mixed + Episode → Übersicht und alle drei Editoren zeigen mixed/episode
- DB: EP 01 (id 40) = mixed/manual + episode/manual; EP 02/03 unverändert.
Browser-Sichtprüfung offen (Panel ohne Login).

## Offene Punkte

- Browser-UAT beider Oberflächen durch den Nutzer.
- Kein „zurück auf automatisch“: einmal manuell, übernimmt Reimport nie wieder aniSearch-Werte.
- aniSearch liefert keinen Episodentyp; `episode_type_source` kennt daher nur NULL/manual.
- Übersicht gruppiert nach Episodennummer; gleiche Nummer mit verschiedenen Typen fällt zusammen (vorbestehend).
- Nicht-Admin-Contributors sehen die Felder im Editor nicht.
- EpisodeVersionEditorPage.tsx und models/admin_content.go lagen schon über 450 Zeilen (je wenige Zeilen ergänzt).
