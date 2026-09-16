---
phase: quick-260916-asr
plan: 01
subsystem: backend
tags: [anisearch, relations, import, admin]

key-files:
  created:
    - backend/internal/services/anisearch_relation_labels.go
    - backend/internal/services/anisearch_relation_labels_test.go
    - backend/internal/repository/anime_relations_admin_postgres_test.go
  modified:
    - backend/internal/services/anisearch_client.go
    - backend/internal/services/anime_create_enrichment.go
    - backend/internal/services/anime_create_enrichment_test.go
    - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.test.tsx

key-decisions:
  - "aniSearch „Alternative Version“ → Team4s „Nebengeschichte“ (DB side-story), in beiden Kantenrichtungen, weil aniSearch die Beziehung symmetrisch führt."
  - "DB-Seed alternative-version (Migration 0020) ist ungenutzter Altbestand; bleibt unverändert, wird nicht freigeschaltet."
  - "Ein zentrales Mapping statt verstreuter switch-Fälle; unbekannte Begriffe erzeugen keine Relation."
---

# Quick 260916-asr — Zusammenfassung

## Warum „Alternative Version“ verloren ging

Der Parser der aniSearch-Relationsseite (`mapAniSearchGraphRelation`) kannte nur Sequel,
Nebengeschichte, Hauptgeschichte und Zusammenfassung. Für die echte Kante
`a6123 -> a5468` (Legende „Alternative Version“) lieferte er `""`, die Kante wurde verworfen.
Die bereits vorhandene Zuordnung in `normalizeAniSearchRelationLabel` kam nie zum Zug; der
vorhandene Unit-Test dafür fütterte das Label direkt ein und übersprang den Parser.

## Herkunft von `alternative-version`

Nur Seed in `database/migrations/0020_add_metadata_reference_tables.up.sql` (13.03.2026). Kein
Schreibpfad, kein Admin-Leser, kein Frontend-Schlüssel nutzt ihn; 0 Zeilen in `team4s_v2`.
Ungenutzter Modellbestand → fachliche Vorgabe gilt.

## Kanonisches Mapping (`aniSearchRelationLabels`)

| aniSearch | Kante vom aktuellen Anime weg | Kante zum aktuellen Anime hin |
|---|---|---|
| Sequel | Fortsetzung | Hauptgeschichte |
| Nebengeschichte | Nebengeschichte | Hauptgeschichte |
| Hauptgeschichte | Hauptgeschichte | Nebengeschichte |
| Zusammenfassung | Zusammenfassung | – |
| Alternative Version | Nebengeschichte | Nebengeschichte |

Weiterhin nicht importiert (ignoriert, keine Relation): „?“, Prequel, Gemeinsames Universum,
Alternative Umgebung, Charakter, Komplette Geschichte, Anderes, Remake, Crossover.
Nebeneffekt: `normalizeAniSearchRelationLabel` akzeptiert jetzt auch den Rohbegriff „Sequel“
(→ Fortsetzung), konsistent zum Parser.

## Richtung und Re-Import

- Gespeichert wird genau eine gerichtete Zeile `source = bearbeitetes Anime -> target`; keine
  Gegenrelation. Die öffentliche Seite leitet die Gegenrichtung dynamisch ab, der Admin zeigt nur
  ausgehende Relationen.
- Re-Import über „aniSearch laden“ im Admin-Edit (`POST /admin/anime/:id/anisearch/enrich`) ergänzt
  fehlende Relationen, dedupliziert per `ON CONFLICT DO NOTHING` und löscht nie etwas; manuelle
  Relationen bleiben unangetastet.
- Ziel-Anime werden über `anisearch:<id>`-Source und sonst über den Titel gefunden. 11eyes und die
  OVA haben Jellyfin-Sources, der Titel-Fallback greift.

## Tests

- `anisearch_relation_labels_test.go`: Parser beide Richtungen mit echter Legende, 10 unbekannte
  Kanten ohne Relation, Mapping-Tabelle inkl. Bestandszuordnungen, nur erlaubte Admin-Labels,
  Normalisierung, 11eyes-Regression über geparsten Graph + Titel-Fallback.
- `anime_relations_admin_postgres_test.go` (DSN `TEAM4S_RELATIONS_TEST_DSN`, DB
  `team4s_relations_test`): speichern als side-story, Admin-Liste „Nebengeschichte“, Re-Import
  Applied 0/Skipped 1, keine Gegenrelation, manuelle Fortsetzung bleibt, Episode bleibt `unknown`.
- `AnimeRelationsSection.test.tsx`: OVA erscheint unter „Bestehende Relationen“ als Nebengeschichte,
  Zusammenfassung „1 Relation“.
- Ergebnis: services (alle Relations-/aniSearch-Tests) grün; einziger Fehlschlag
  `TestFFmpegExecutableAuthenticatedInputRejectsCrossOriginRedirect` (kein FFmpeg im Test-Container,
  unabhängig). repository-Relationstests + handlers grün. vitest 5/5, tsc und eslint ohne Fund für
  die Testdatei. gofmt sauber für die neuen/geänderten Dateien.

## Live-Ergebnis 11eyes (team4s_v2, 16.09.2026)

Gleicher Codepfad wie der Enrich-Endpunkt mit echtem aniSearch-Abruf 5468:
- alter Code (HEAD): 0 aufgelöste Relationen, Admin 0.
- neuer Code: `11eyes (2) -> 11eyes: Pink Phantasmagoria (3)` als Nebengeschichte, Applied 1.
- zweiter Lauf: Applied 0, SkippedExisting 1, weiterhin genau 1 Relation (`side-story`).
- OVA Episode 1: `filler_type = unknown` unverändert.
Backend-Container neu gebaut (`/health` 200). Kein Push, keine Browser-Sichtprüfung durch den Nutzer.
