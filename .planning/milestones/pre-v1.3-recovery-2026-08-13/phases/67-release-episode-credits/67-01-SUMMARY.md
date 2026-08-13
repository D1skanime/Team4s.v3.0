---
phase: 67-release-episode-credits
plan: 01
subsystem: database-schema
tags: [migration, anime-contributions, release-version, unique-constraint, postgres]
requires:
  - "anime_contributions (0086)"
  - "uq_anime_contribution_member (0088)"
  - "release_versions (0035)"
provides:
  - "anime_contributions.release_version_id (nullable FK -> release_versions ON DELETE SET NULL)"
  - "uq_anime_contribution_member 4-Spalten UNIQUE NULLS NOT DISTINCT"
  - "idx_anime_contributions_release_version (partiell)"
affects:
  - "anime_contributions_upsert_repository.go (ON CONFLICT-Target, Folgeplan)"
  - "anime_contributions Create/Update (release_version_id, Folgeplan)"
tech-stack:
  added: []
  patterns:
    - "Additive nullable FK-Migration (append-only up/down)"
    - "UNIQUE NULLS NOT DISTINCT (PG15+) fuer NULL-koexistente Eindeutigkeit"
    - "Migration-Contract-Test (string-contract, readMigrationFile/assertContainsAll)"
key-files:
  created:
    - database/migrations/0091_anime_contributions_release_version.up.sql
    - database/migrations/0091_anime_contributions_release_version.down.sql
    - backend/internal/migrations/phase67_release_version_credits_test.go
  modified: []
decisions:
  - "Migrationsnummer 0091 statt 0090: 0090 ist bereits durch Phase 70 (member_story_images) belegt (Pitfall 4)."
  - "ON DELETE SET NULL: historisches Faktum bleibt erhalten, faellt auf anime-weit zurueck (kein CASCADE/RESTRICT)."
  - "UNIQUE NULLS NOT DISTINCT: derselbe Member je Version genau einmal UND anime-weit genau einmal."
metrics:
  duration: ~17min
  completed: 2026-06-02
---

# Phase 67 Plan 01: Release- und Episode-Credits Schema-Fundament Summary

Migration 0091 ergaenzt `anime_contributions` um eine optionale `release_version_id` (FK -> `release_versions`, ON DELETE SET NULL), legt einen partiellen Index an und ersetzt den 3-Spalten-UNIQUE aus 0088 durch eine vierspaltige `UNIQUE NULLS NOT DISTINCT`-Variante; ein Migration-Contract-Test sichert die Form, die Migration wurde auf der lokalen DB angewendet und verifiziert.

## Was umgesetzt wurde

- **Task 1** (feat, 0b6a53a6): Migrationspaar `0091_anime_contributions_release_version.{up,down}.sql`.
  - UP: nullable FK `release_version_id BIGINT NULL REFERENCES release_versions(id) ON DELETE SET NULL`; partieller Index `idx_anime_contributions_release_version`; DROP + ADD `uq_anime_contribution_member UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)`.
  - DOWN: Constraint zurueck auf 3-Spalten-Form, Index drop, Spalte drop. Composite-FK `fk_anime_contributions_member_group` aus 0088 unberuehrt.
- **Task 2** (test, 6dc511d7): `TestPhase67ReleaseVersionCreditsMigrationContract` in `backend/internal/migrations/phase67_release_version_credits_test.go`. Wiederverwendung der vorhandenen Helper `readMigrationFile`/`assertContainsAll` (nicht dupliziert). Test gruen.
- **Task 3** (Checkpoint, autonom ausgefuehrt): Migration via Migrate-Binary angewendet (`docker compose run --rm --no-deps team4sv30-backend ./migrate up`). 3 pending Migrationen sauber angewendet (0089, 0090, 0091), kein UNIQUE-Kollisionsfehler (A1 bestaetigt).

## Verifikation (live DB, team4sv30-db / team4s_v2)

- Spalte: `release_version_id` | `bigint` | nullable=YES — vorhanden.
- Constraint: `uq_anime_contribution_member = UNIQUE NULLS NOT DISTINCT (fansub_group_id, anime_id, fansub_group_member_id, release_version_id)` — vierspaltig, korrekt.
- FK: `anime_contributions_release_version_id_fkey = FOREIGN KEY (release_version_id) REFERENCES release_versions(id) ON DELETE SET NULL` — vorhanden.
- Index: `idx_anime_contributions_release_version` — vorhanden.
- `go test ./internal/migrations/... -run Phase67 -count=1` — ok.

## Deviations from Plan

### [Rule 3 - Blocking] Migrationsnummer 0090 -> 0091

- **Gefunden bei:** Vorbereitung Task 1.
- **Problem:** Der Plan und die success_criteria schreiben Migrationsnummer **0090** vor (Research-Stand: hoechste vorhandene Migration war 0089). Zur Ausfuehrungszeit existiert jedoch bereits `0090_member_story_images.{up,down}.sql` (Phase 70) auf der Platte. Zwei Migrationsdateien mit Nummer 0090 wuerden das Migrate-Tool brechen (Pitfall 4 der Research).
- **Fix:** Naechste freie Nummer **0091** gewaehlt. Alle Dateinamen, Test-Referenzen und der Status-Check verwenden konsistent 0091. Inhalt/Form der Migration ist unveraendert gegenueber Plan-Vorgabe.
- **Dateien:** `database/migrations/0091_anime_contributions_release_version.{up,down}.sql`, `backend/internal/migrations/phase67_release_version_credits_test.go`.
- **Hinweis fuer Folgeplaene:** Repository/Upsert-Code muss auf das vierspaltige ON-CONFLICT-Target umgestellt werden; Migrationsdatei-Referenz ist 0091 (nicht 0090).

### Nebeneffekt: Mit-Anwendung fremder Pending-Migrationen

- Beim `migrate up` wurden zusaetzlich `0089_anime_contributions_review_note` (Phase 65) und `0090_member_story_images` (Phase 70) angewendet, da das Migrate-Tool alle pending Migrationen sequentiell anwendet. Beide sind rein additiv (`ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`) und unkritisch; kein Datenverlust, keine Kollision. Dies ist eine unvermeidbare Folge des sequentiellen Migrate-Mechanismus auf einer DB, die bei v88 stand.

## Known Stubs

Keine. Reine DDL-Migration + Contract-Test; keine UI-/Datenpfade mit Platzhaltern.

## Self-Check: PASSED

- FOUND: database/migrations/0091_anime_contributions_release_version.up.sql
- FOUND: database/migrations/0091_anime_contributions_release_version.down.sql
- FOUND: backend/internal/migrations/phase67_release_version_credits_test.go
- FOUND: commit 0b6a53a6 (Task 1)
- FOUND: commit 6dc511d7 (Task 2)
- DB-Verifikation: Spalte + 4-Spalten-Constraint + FK SET NULL + Index praesent.
