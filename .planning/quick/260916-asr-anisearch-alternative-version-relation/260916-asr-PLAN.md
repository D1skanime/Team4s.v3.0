---
phase: quick-260916-asr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/internal/services/anisearch_relation_labels.go
  - backend/internal/services/anisearch_relation_labels_test.go
  - backend/internal/services/anisearch_client.go
  - backend/internal/services/anime_create_enrichment.go
  - backend/internal/services/anime_create_enrichment_test.go
  - backend/internal/repository/anime_relations_admin_postgres_test.go
  - frontend/src/app/admin/anime/components/AnimeEditPage/AnimeRelationsSection.test.tsx
  - .planning/quick/260916-asr-anisearch-alternative-version-relation/260916-asr-SUMMARY.md
  - .planning/STATE.md
autonomous: true
---

# Quick 260916-asr — aniSearch-Relation „Alternative Version“ korrekt importieren

## Ziel

aniSearch liefert für `11eyes` (aniSearch 5468) und `11eyes: Pink Phantasmagoria` (aniSearch 6123)
die Relation „Alternative Version“. Team4s verwirft sie; im Admin von `11eyes` stehen 0 Relationen.
Fachliche Vorgabe: `Alternative Version -> Nebengeschichte`, keine neue UI-Relationsart, keine
Canon-/Filler-Ableitung.

## Voranalyse (vor Umsetzung)

- `alternative-version` stammt ausschließlich aus dem Seed von Migration
  `0020_add_metadata_reference_tables.up.sql` (Commit 09701c2d, 13.03.2026).
- Kein Schreibpfad nutzt ihn: alle Schreibzugriffe laufen über
  `adminAnimeRelationTypeToDB` (nur full-story/side-story/sequel/summary).
- Admin-Leser (`ListAdminAnimeRelations`) verwirft ihn; das öffentliche
  `AnimeRelations.tsx` kennt nur einen Schlüssel `alternative` (nicht `alternative-version`).
- `team4s_v2`: 0 Zeilen mit diesem Typ (wie bei allen Relationstypen vor dem Fix).
- Ergebnis: ungenutzter historischer Modellbestand, keine kanonische Semantik. Migration bleibt
  unverändert.

## Ursache

`mapAniSearchGraphRelation` (Parser der aniSearch-Relationsseite, die eigentliche Datenquelle)
kannte nur Sequel/Nebengeschichte/Hauptgeschichte/Zusammenfassung und lieferte für
„Alternative Version“ `""` → Kante verworfen. Die nachgelagerte Normalisierung
`normalizeAniSearchRelationLabel` kannte „Alternative Version“ zwar schon, bekam den Begriff aber
nie zu sehen. Echte Kante: `a6123 -> a5468`, Legendenindex 5.

## Tasks

1. Zentrales Mapping `aniSearchRelationLabels` (Begriff → Label je Kantenrichtung) in
   `anisearch_relation_labels.go`; Parser und Normalisierung delegieren dorthin. Bestehende
   Zuordnungen bytegleich übernehmen; „Alternative Version“ in beide Richtungen → Nebengeschichte.
   Unbekannte Begriffe → keine Relation.
2. Tests: Parser beide Richtungen mit echter Legende, unbekannte Begriffe, Mapping-Tabelle,
   Normalisierung, 11eyes-Regression über Titel-Fallback, Postgres-Integration (speichern,
   Admin-Liste, Re-Import ohne Duplikat, keine Gegenrelation, manuelle Relation bleibt,
   Filler bleibt `unknown`), Admin-UI-Rendering.
3. Backend neu bauen, 11eyes live über denselben Codepfad wie der Enrich-Endpunkt abgleichen.
