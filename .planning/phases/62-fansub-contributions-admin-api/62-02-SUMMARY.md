---
phase: 62-fansub-contributions-admin-api
plan: "02"
subsystem: repository
tags: [go, repository, anime-contributions, fansub-group-history, transactions]
dependency_graph:
  requires: [phase-61-migrations]
  provides: [AnimeContributionsRepository, FansubGroupHistoryRepository]
  affects: [wave-2-handlers, wave-3-public-handlers]
tech_stack:
  added: []
  patterns: [pgx-transaction, dynamic-set-clause, public-visibility-sql-filter]
key_files:
  created:
    - backend/internal/repository/anime_contributions_repository.go
    - backend/internal/repository/anime_contributions_public_repository.go
    - backend/internal/repository/fansub_group_history_repository.go
  modified: []
decisions:
  - Public queries split into anime_contributions_public_repository.go to keep each file under 450 lines
  - AnimeContributionPatchInput uses pointer-to-pointer for nullable fields (nil = no update, *nil = set NULL)
  - FansubGroupHistory Update uses dynamic SET clause since the table has no updated_at column
metrics:
  duration: "15m"
  completed: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 62 Plan 02: AnimeContributionsRepository und FansubGroupHistoryRepository Summary

Zwei Repository-Dateien für Wave-1 der Fansub-Contributions-Admin-API — bereit als Dependency für Handler in Wave 2 und 3.

## Tasks

| Task | Beschreibung | Commit |
|------|-------------|--------|
| 1 | AnimeContributionsRepository mit CRUD und Public-Queries | c9384d54 |
| 2 | FansubGroupHistoryRepository mit List, GetByID, Create, Update, Delete | 2cffa015 |

## Erstellte Dateien

**backend/internal/repository/anime_contributions_repository.go** (296 Zeilen)
- Typen: `AnimeContributionRow`, `AnimeContributionInput`, `AnimeContributionPatchInput`, `PublicContributionRow`
- Methoden: `ListByFansubAndAnime`, `GetByID`, `Create` (TX), `Update` (TX für Rollen), `Delete`
- `Create` nutzt explizite pgx-Transaktion: INSERT anime_contributions + INSERT anime_contribution_roles pro role_code

**backend/internal/repository/anime_contributions_public_repository.go** (120 Zeilen)
- Methoden: `ListPublicByAnime`, `ListPublicByFansub`, `ListPublicByMemberSlug`
- Alle drei mit `LIMIT 50` und SQL-seitigem Sichtbarkeitsfilter (kein Post-Filter im Handler)
- `ListPublicByAnime` und `ListPublicByFansub`: `is_public_on_anime_page = true` + `hfgm.visibility = 'public'`
- `ListPublicByMemberSlug`: `is_public_on_member_profile = true`

**backend/internal/repository/fansub_group_history_repository.go** (206 Zeilen)
- Typen: `GroupHistoryRow`, `GroupHistoryInput`, `GroupHistoryPatchInput`
- Methoden: `ListByFansub`, `GetByID`, `Create`, `Update`, `Delete`
- `Update` hat kein `updated_at` (Tabelle hat keins) — dynamische SET-Klausel

## Deviations from Plan

None - plan executed exactly as written. Public-Queries wurden als Extension-Methoden auf AnimeContributionsRepository in separate Datei ausgelagert (Plan sah das als Option vor, wenn Zeilenlimit erreicht).

## Threat Surface

Sichtbarkeitsfilter aus Threat Register T-62-03 korrekt implementiert:
- `is_public_on_anime_page = true` direkt in SQL (kein Post-Filter)
- `is_public_on_member_profile = true` direkt in SQL (kein Post-Filter)
- `hfgm.visibility = 'public'` direkt in SQL

Transaktionsschutz T-62-05 implementiert: `Create` und `Update` (Rollen-Replacement) nutzen atomare Transaktionen.

## Self-Check: PASSED

- [x] anime_contributions_repository.go existiert
- [x] anime_contributions_public_repository.go existiert
- [x] fansub_group_history_repository.go existiert
- [x] go build ./backend/... — kein Fehler
- [x] Alle Dateien unter 450 Zeilen
- [x] LIMIT 50 in allen drei Public-Queries
- [x] Transaktionen in Create und Update (Rollen)
- [x] Commits c9384d54 und 2cffa015 vorhanden
