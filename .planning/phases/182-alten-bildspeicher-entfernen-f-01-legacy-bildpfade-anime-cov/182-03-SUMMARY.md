---
phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov
plan: 03
subsystem: database
tags: [go, pgx, postgres, migration, anime-cover, openapi, contracts]

# Dependency graph
requires:
  - phase: 182-02
    provides: "anime.cover_image ist funktional inert -- kein Backend-Code liest oder schreibt die Spalte noch als Seiteneffekt (OpenPhase182Postgres-Testhelfer direkt wiederverwendet)"
provides:
  - "Migration 0184 (reversibel, mit DO-Block/RAISE EXCEPTION-Schutzabfrage) ist auf der LIVEN team4s_v2-Datenbank angewendet -- anime.cover_image existiert nicht mehr"
  - "animeCoverImageSelectSQL/animeCoverAvailableSQL und die zwei verbliebenen Inline-Duplikate (loadCurrentProjects, ListFansubAnime) referenzieren cover_image nirgends mehr"
  - "shared/contracts/*.yaml dokumentiert cover_image als V2-Poster-URL-Wert (Required-Flag-Widerspruch entfernt, 8 Property-Beschreibungen ergaenzt, 5 veraltete Beispielwerte ersetzt)"
  - "Plain-SQL-Backup von team4s_v2 vor der Live-Anwendung (.planning/debug/backups/team4s_v2-before-182-2026-10-14.sql, 1.4M, nicht committet)"
affects: [182-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reversible Spalten-Drop-Migration mit vorgeschalteter DO-Block/RAISE-EXCEPTION-Schutzabfrage (Muster fuer zukuenftige riskante DROP COLUMN-Migrationen in diesem Repo)"
    - "SQL-Snippet-Extraktion aus Go-Quelldateien per Python-Skript + Live-Ausfuehrung gegen eine disposable Phase182-Postgres-Instanz, um COALESCE/GROUP-BY-Aenderungen vor dem Commit syntaktisch zu beweisen, ohne einen dauerhaften Testfall je betroffener Repository-Funktion anzulegen"

key-files:
  created:
    - database/migrations/0184_drop_anime_cover_image.up.sql
    - database/migrations/0184_drop_anime_cover_image.down.sql
    - backend/internal/repository/anime_cover_image_drop_migration_postgres_test.go
  modified:
    - backend/internal/repository/anime_v2.go
    - backend/internal/repository/member_profile_projects_repository.go
    - backend/internal/repository/admin_content_release_theme_assets.go
    - backend/internal/repository/anime_test.go
    - shared/contracts/openapi.yaml
    - shared/contracts/anime-list.yaml
    - shared/contracts/anime-detail.yaml
    - shared/contracts/watchlist.yaml
    - shared/contracts/admin-content.yaml

key-decisions:
  - "shared/contracts/{anime-list,anime-detail,watchlist,admin-content}.yaml verwenden ein kompaktes 'feld: typ'-Format ohne description-Sibling fuer IRGENDEIN Feld (nicht nur cover_image) -- statt dieses Format allein fuer cover_image stilistisch zu durchbrechen, wurden dort nur die veralteten Beispielwerte korrigiert; die vom Plan geforderten description-Ergaenzungen wurden auf openapi.yaml konzentriert, wo das type:+description:-Format bereits durchgaengig fuer andere Felder existiert"
  - "anime_test.go wurde zusaetzlich zu den im Plan gelisteten Dateien angepasst (Rule 1 -- Bugfix fuer veraltete Testerwartung): zwei bestehende Tests (TestAnimeCoverImageSelectSQL_UsesProviderFallbacks, TestBuildAnimeListWhereV2_UsesPersistedFieldsAndFilters) behaupteten woertlich das jetzt absichtlich entfernte cover_image-Fragment und wurden aktualisiert plus um eine explizite Abwesenheitspruefung ergaenzt"
  - "Vor dem Live-Apply in Task 3 wurden die beiden Go-Code-Aenderungen aus Task 2 (loadCurrentProjects' GROUP BY, ListFansubAnime) zusaetzlich per direkter psql-Ausfuehrung gegen eine disposable team4s_phase182_test_*-Datenbank syntaktisch bewiesen -- nicht nur per go build/vet, da ein PostgreSQL-GROUP-BY-Fehler beim Entfernen von a.cover_image sonst erst zur Laufzeit gegen team4s_v2 aufgefallen waere"

requirements-completed: [D-02, D-03]

# Metrics
duration: ~18min
completed: 2026-10-14
---

# Phase 182 Plan 3: Migration 0184 (Spalten-Drop mit Schutzabfrage), COALESCE-Kuerzung, Vertrags-Bereinigung, Live-Anwendung Summary

**Migration 0184 droppt `anime.cover_image` reversibel mit einer DO-Block/RAISE-EXCEPTION-Schutzabfrage, ist gegen eine disposable Postgres-Instanz bewiesen und wurde anschliessend echt auf der LIVEN `team4s_v2`-Datenbank angewendet -- `\d anime` listet die Spalte nicht mehr, der Backend-Container laeuft weiter gesund.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-10-14T23:28:00Z
- **Completed:** 2026-10-14T23:39:50Z
- **Tasks:** 3 von 3
- **Files modified:** 12 (3 neu erstellt, 9 geaendert) + 1 nicht committeter Backup-Dump

## Accomplishments
- `database/migrations/0184_drop_anime_cover_image.up.sql` enthaelt einen `DO $$ ... END $$;`-Block, der mit `RAISE EXCEPTION 'anime.cover_image drop blocked: ...'` abbricht, falls ein Anime ein Legacy-Cover ohne passende V2-Poster-Zeile hat, gefolgt von `ALTER TABLE anime DROP COLUMN cover_image;`. `down.sql` stellt die Spalte als nullable TEXT wieder her (Reversibilitaet ohne Datenwiederherstellung, D-03).
- Beide Pfade sind per echtem Postgres-Test bewiesen (`TestAnimeCoverImageDropMigration`, zwei Subtests gegen eine disposable `team4s_phase182_test_*`-Datenbank, niemals `team4s_v2`): der Erfolgspfad inkl. nachgelagerter `down.sql`-Reversibilitaetspruefung (Spalte existiert wieder, ist nullable), und der Abbruchpfad (Fehlermeldung nennt die betroffene Anime-ID, Spalte existiert danach weiterhin).
- `animeCoverImageSelectSQL`/`animeCoverAvailableSQL` (`anime_v2.go`) sind von 5 auf 4 `%s`-Platzhalter/Argumente gekuerzt -- das `cover_image`-COALESCE-Glied ist vollstaendig entfernt, der Fallback laeuft direkt auf den V2-Poster-Join bzw. den Jellyfin-Fallback.
- `loadCurrentProjects` (`member_profile_projects_repository.go`) verliert `a.cover_image` sowohl aus dem COALESCE als auch aus der `GROUP BY`-Klausel (beide zusammen, sonst waere die Query nach dem Spalten-Drop kaputt gewesen) -- live gegen eine disposable Postgres-Instanz bewiesen, dass die gekuerzte Query weiterhin korrekt laeuft.
- `ListFansubAnime` (`admin_content_release_theme_assets.go`) verliert `a.cover_image` aus seinem COALESCE (keine GROUP BY in dieser Query, per `SELECT DISTINCT`) -- ebenfalls live bewiesen.
- `shared/contracts/openapi.yaml`: der widerspruechliche `required: [..., cover_image, ...]`-Eintrag auf `AnimeRelation` ist entfernt (das Feld ist auf derselben Schema bereits `nullable: true`); die `has_cover`-Filterbeschreibung ist auf die tatsaechliche V2-Herkunft umformuliert; alle 8 vorher beschreibungslosen `cover_image`-Property-Definitionen (AnimeListItem, AnimeDetail, AnimeRelation, WatchlistItem, AdminAnimeCreateRequest, AdminAnimePatchRequest, AdminAnimeItem, PublicFansubProject) haben jetzt eine Beschreibung, die den V2-Medienspeicher/Jellyfin-Fallback-Ursprung erklaert.
- `shared/contracts/{anime-list,anime-detail,watchlist,admin-content}.yaml`: alle 5 vorkommenden veralteten `cover_image: "attack-on-titan.jpg"`-Beispielwerte sind durch einen realistischen V2-Poster-Pfad (`/media/anime/3/cover/f20a224e-.../original.jpg`, passend zum echten Beispiel-Anime id=3 aus `182-CONTEXT.md`) ersetzt.
- **Migration 0184 wurde auf der echten, LIVEN `team4s_v2`-Datenbank angewendet** (nicht nur gegen die disposable Testdatenbank): `docker compose exec team4sv30-backend go run ./cmd/migrate up -dir /app/database/migrations` meldete `migrations applied: 1`; die Schutzabfrage griff nicht (0 betroffene Anime, wie von `182-CONTEXT.md`'s Inventur vorhergesagt). Live-Verifikation: `\d anime` listet `cover_image` nicht mehr, `schema_migrations` zeigt Version 184/`drop_anime_cover_image`, `migrate status` zeigt `184 applied`, `/health` liefert weiterhin 200. Ein manueller Stichproben-Check von `GET /api/v1/anime` und `GET /api/v1/anime/3` bestaetigt: die 3 vormals Legacy-Cover-tragenden Anime zeigen weiterhin ihr Cover (ueber den V2-Poster-Join), Jellyfin-Anime zeigen weiterhin den Jellyfin-Fallback -- keine sichtbare Aenderung (D-04).
- Vor dem Live-Apply wurde ein Plain-SQL-Backup von `team4s_v2` erstellt: `.planning/debug/backups/team4s_v2-before-182-2026-10-14.sql`, **1,4 MB**, per `pg_dump --no-owner` (nicht `-Fc`). Nicht committet (liegt unter dem bereits ignorierten `.planning/debug/backups/`-Pfad).

## Task Commits

Beide Code-Tasks wurden atomar committet; Task 3 (operativ, keine Dateien) hat keinen eigenen Code-Commit:

1. **Task 1: Write the reversible migration with a pre-flight legacy-cover safety check** - `346ba39d4` (test)
2. **Task 2: Shrink the shared COALESCE helpers, fix the two inline duplicates, and clean up contracts (D-02)** - `fa5165fb3` (refactor)
3. **Task 3: Apply migration 0184 to the live team4s_v2 database and verify the column is gone (D-03)** - operativ, kein Code-Commit (nur die DB-Migration selbst, die `schema_migrations`-Zeile ist der Audit-Trail)

_Hinweis: Die Plan-Metadaten (SUMMARY.md, STATE.md, ROADMAP.md) werden separat committet._

## Files Created/Modified
- `database/migrations/0184_drop_anime_cover_image.up.sql` (neu) - DO-Block-Schutzabfrage + `DROP COLUMN cover_image`
- `database/migrations/0184_drop_anime_cover_image.down.sql` (neu) - `ADD COLUMN cover_image TEXT` (nullable, kein Default)
- `backend/internal/repository/anime_cover_image_drop_migration_postgres_test.go` (neu) - Zwei-Subtest-Beweis (Erfolg+Reversibilitaet, Abbruch) gegen disposable Postgres
- `backend/internal/repository/anime_v2.go` - `animeCoverImageSelectSQL`/`animeCoverAvailableSQL` von 5 auf 4 Platzhalter/Argumente gekuerzt
- `backend/internal/repository/member_profile_projects_repository.go` - `loadCurrentProjects`'s COALESCE und GROUP BY beide um `a.cover_image` gekuerzt
- `backend/internal/repository/admin_content_release_theme_assets.go` - `ListFansubAnime`'s COALESCE um `a.cover_image` gekuerzt
- `backend/internal/repository/anime_test.go` - zwei Tests aktualisiert, die das jetzt absichtlich entfernte `cover_image`-SQL-Fragment behauptet hatten, plus explizite Abwesenheitspruefungen ergaenzt
- `shared/contracts/openapi.yaml` - `required`-Widerspruch entfernt, 8 Property-Beschreibungen ergaenzt, Filterbeschreibung korrigiert
- `shared/contracts/{anime-list,anime-detail,watchlist,admin-content}.yaml` - veraltete Beispielwerte ersetzt (5 Vorkommen)

## Decisions Made
- Die vier kompakten Contract-Dateien (`anime-list.yaml`, `anime-detail.yaml`, `watchlist.yaml`, `admin-content.yaml`) nutzen durchgaengig ein `feld: typ`-Kurzformat ohne `description`-Sibling fuer JEDES Feld -- nicht nur `cover_image`. Statt dieses Format allein fuer `cover_image` zu durchbrechen (und damit eine stilistische Inkonsistenz einzufuehren, die keine andere Feld-Dokumentation in diesen Dateien hat), wurden dort ausschliesslich die veralteten Beispielwerte korrigiert. Die vom Plan geforderten Beschreibungs-Ergaenzungen wurden vollstaendig in `openapi.yaml` umgesetzt, wo das `type:`+`description:`-Format bereits durchgaengig fuer andere Felder (z. B. `banner_url`, `source`) existiert -- das ist die kanonische, tatsaechlich von Backend-Entwicklern konsultierte Vertragsdatei.
- Vor dem Live-Apply auf `team4s_v2` wurden die beiden Go-SQL-Aenderungen aus Task 2 (die nicht durch den neuen Postgres-Test aus Task 1 abgedeckt sind) zusaetzlich per direkter `psql`-Ausfuehrung gegen eine eigens dafuer angelegte disposable `team4s_phase182_test_*`-Datenbank bewiesen -- nicht nur per `go build`/`go vet`. Grund: ein kaputtes `GROUP BY` (die urspruengliche Sorge bei `loadCurrentProjects`) ist ein reiner Laufzeit-SQL-Fehler, den `go vet` nicht erkennt; es waere sonst erst beim ersten echten Request gegen die bereits-migrierte `team4s_v2` aufgefallen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zwei bestehende Tests behaupteten das absichtlich entfernte `cover_image`-SQL-Fragment**
- **Found during:** Task 2 (`go test ./internal/repository/...` nach der COALESCE-Kuerzung)
- **Issue:** `TestAnimeCoverImageSelectSQL_UsesProviderFallbacks` und `TestBuildAnimeListWhereV2_UsesPersistedFieldsAndFilters` behaupteten per `strings.Contains`-Fragment-Pruefung woertlich `"NULLIF(BTRIM(anime.cover_image), '')"` bzw. `"anime.cover_image"` -- beide Fragmente sind nach der im Plan geforderten COALESCE-Kuerzung nicht mehr vorhanden, beide Tests schlugen fehl.
- **Fix:** Die veralteten Fragment-Erwartungen entfernt, jeweils eine explizite Abwesenheitspruefung (`cover_image` darf im zurueckgegebenen SQL-String nirgends mehr vorkommen) ergaenzt -- das ist eine nach CLAUDE.md's Teststil-Regel zulaessige Abwesenheits-Pruefung, keine Quelltext-grep-Scheinpruefung (beide Tests rufen weiterhin die reale Funktion auf und pruefen deren Rueckgabewert).
- **Files modified:** `backend/internal/repository/anime_test.go`
- **Verification:** `go test ./internal/repository/... -run 'TestBuildAnimeListWhereV2_UsesPersistedFieldsAndFilters|TestAnimeCoverImageSelectSQL_UsesProviderFallbacks' -v` -- beide gruen; voller Paket-Lauf vorher/nachher 48→46 FAIL (die 2 behobenen Faelle sind exakt diese beiden; die verbleibenden 46 sind vorbestehende, umgebungsbedingte Fehlschlaege wie in 182-01/182-02-SUMMARY.md dokumentiert).
- **Committed in:** `fa5165fb3` (Teil des Task-2-Commits)

---

**Total deviations:** 1 auto-fixed (1 Bug-Fix an bestehenden Tests)
**Impact on plan:** Notwendig, um eine durch den Plan selbst beabsichtigte Verhaltensaenderung (COALESCE-Kuerzung) nicht als falsche Testregression stehen zu lassen. Kein Scope-Creep -- beide betroffenen Tests pruefen exakt die zwei Funktionen, die der Plan explizit kuerzen laesst.

## Issues Encountered
- Der volle `go test ./internal/repository/...`-Lauf zeigt weiterhin das bereits in `182-01-SUMMARY.md`/`182-02-SUMMARY.md`/`deferred-items.md` dokumentierte vorbestehende Fehlerbild (jetzt 46 statt vorher 48 Faelle, da die zwei plan-eigenen Testfaelle oben behoben wurden) -- `TEAM4S_PHASE128_TEST_DSN` fehlt, Keycloak/Live-Netzwerk (`192.168.235.196:18093`) ist aus dieser Sandbox nicht erreichbar. Keine der verbleibenden 46 Fehlschlaege referenziert eine von diesem Plan geaenderte Datei oder Funktion (per `grep` auf die Fehlerausgabe bestaetigt).
- Die im Plan genannten Postgres-Tests fuer `loadCurrentProjects` (`TestPhase129...`, `member_profile_public_repository_postgres_test.go`) benoetigen eine dedizierte `TEAM4S_PHASE129_TEST_DSN`-Datenbank mit VOLLEM `pg_dump --schema-only`-Schema (nicht die schlanke Phase182-Stand-in-Fixture) -- diese war in dieser Sitzung nicht verfuegbar und die Tests skippen sauber (kein Fail). Als Ersatznachweis wurde die exakte, aus der geaenderten Go-Datei extrahierte SQL-Query live gegen eine eigens angelegte disposable `team4s_phase182_test_*`-Datenbank mit einem minimalen Stand-in-Schema ausgefuehrt und lieferte das erwartete Ergebnis (siehe "Decisions Made").
- Das Backup (`pg_dump --no-owner`, Plain-SQL, 1,4 MB) wurde vor dem Live-Apply erstellt und die Groesse vor der Migration bestaetigt; `team4s_v2` wurde erst NACH der Bestaetigung des Backups und nach der Pre-Flight-Pruefung (0 betroffene Anime) angefasst.
- Die disposable Test-Datenbanken (`team4s_phase182_test_1792020795`, `team4s_phase182_test_1792020834`, `team4s_phase182_test_1792020957`) wurden nach jedem Testlauf per `DROP DATABASE` entfernt; `team4s_v2` wurde fuer keinen Testlauf verwendet (nur fuer den beabsichtigten Live-Apply in Task 3).

## User Setup Required

None - keine externe Service-Konfiguration erforderlich.

## Next Phase Readiness
- `anime.cover_image` existiert nicht mehr in `team4s_v2` -- D-03 ist vollstaendig erfuellt (Spalte entfernt, Migration reversibel und bewiesen, Bilddateien auf der Platte unangetastet, kein Backend-Code referenziert die Spalte mehr).
- D-02 ist erfuellt: das API-Feld `cover_image` behaelt seinen Namen und Wertformat, nur die Herkunft (jetzt ausschliesslich V2-Medienspeicher/Jellyfin-Fallback) ist korrekt dokumentiert.
- Historische Skripte/Tools (`backend/cmd/migrate-covers/`, `scripts/report-cover-image-state.ps1`, `scripts/remediate-cover-image.ps1`) sind laut `182-CONTEXT.md` Schritt 4 noch zu entfernen -- das bleibt, wie von Plan 182-03 nicht adressiert, fuer Plan 182-04 (naechster und letzter Plan dieser Phase, laut `STATE.md` "Plan: 3 of 4").
- Kein Blocker fuer 182-04.

---
*Phase: 182-alten-bildspeicher-entfernen-f-01-legacy-bildpfade-anime-cov*
*Completed: 2026-10-14*

## Self-Check: PASSED

- FOUND: `database/migrations/0184_drop_anime_cover_image.up.sql`
- FOUND: `database/migrations/0184_drop_anime_cover_image.down.sql`
- FOUND: `backend/internal/repository/anime_cover_image_drop_migration_postgres_test.go`
- FOUND: `backend/internal/repository/anime_v2.go`
- FOUND: `backend/internal/repository/member_profile_projects_repository.go`
- FOUND: `backend/internal/repository/admin_content_release_theme_assets.go`
- FOUND: `backend/internal/repository/anime_test.go`
- FOUND: `shared/contracts/openapi.yaml`
- FOUND: commit `346ba39d4` (git log --oneline --all)
- FOUND: commit `fa5165fb3` (git log --oneline --all)
- FOUND: `.planning/debug/backups/team4s_v2-before-182-2026-10-14.sql` (1.4M, not committed)
- CONFIRMED: live `team4s_v2` -- `schema_migrations` version 184 applied, `\d anime` has 0 cover_image matches, `/health` returns 200
