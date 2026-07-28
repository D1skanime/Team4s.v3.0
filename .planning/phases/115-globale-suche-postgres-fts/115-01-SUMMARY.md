---
phase: 115-globale-suche-postgres-fts
plan: 01
subsystem: database
tags: [go, pgx, anime-titles, admin-intake, fts-prerequisite]

# Dependency graph
requires:
  - phase: 05-metadata-reference-tables (Migration 0020)
    provides: Seeds languages (ja/en/de …) und title_types (main/official/romaji/japanese/synonym/short)
provides:
  - Korrektes (language,title_type)-Mapping in allen drei Anime-Titel-Write-Sites
  - Neuer AltTitles-Persistenzpfad (Create/Patch-Input → upsertAuthoritativeAnimeTitle)
  - Romaji-/Japanisch-Titel landen tatsächlich in anime_titles (Voraussetzung für FTS-Suche)
affects: [115-globale-suche-postgres-fts, search_anime, anime_titles, re-import-115-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AltTitle-Slot-Verkettung: appendAltTitleSlots hängt gültige (lang,type)-Slots an, strenger upsert-JOIN verwirft ungültige Codes weiterhin still"
    - "Repository-Split: AltTitle-Logik in eigene Datei ausgelagert, um 450-Zeilen-Limit zu halten"

key-files:
  created:
    - backend/internal/repository/admin_content_anime_alt_titles.go
  modified:
    - backend/internal/models/admin_content.go
    - backend/internal/repository/admin_content_anime_metadata.go
    - backend/internal/services/anime_create_enrichment.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_content_anime_validation.go
    - backend/internal/repository/admin_content_test.go
    - backend/internal/services/anime_create_enrichment_test.go

key-decisions:
  - "Haupttitel-Slot als (ja, main) statt LanguageCode 'romaji' — deckt sich mit backfill-Gegenbeispiel und rankt im Read-Kontrakt (pickNormalizedTitle lang-Pref [ja,romaji]) höher"
  - "OriginalTitle → (ja, japanese), RomajiTitle → (ja, romaji); ungültige Codes ja-Latn/romanized entfernt"
  - "AltTitles-Feld ohne Request-DTO-Verdrahtung wäre totes Feld → adminAnimeCreateRequest.alt_titles + hasAnyAdminAnimePatchField mitgezogen (Rule 2)"

patterns-established:
  - "Pattern: Alt-Titel fließen als eigenständige authoritativeAnimeTitleSlotWrite durch denselben Upsert-Seam wie die Basistitel — keine zweite Persistenz-Codebahn"

requirements-completed: [D-11, D-12]

# Metrics
duration: 18min
completed: 2026-07-28
---

# Phase 115 Plan 01: D-12 Titel-Speicher-Fix Summary

**Romaji-/Japanisch-Anime-Titel werden über einen neuen AltTitles-Persistenzpfad tatsächlich in `anime_titles` gespeichert, und alle drei Write-Sites mappen konsistent auf gültige `(ja, romaji)` / `(ja, japanese)` / `(ja, main)`-Codes statt der ungültigen `romaji`/`ja-Latn`/`romanized`-Codes, die der strenge Upsert-JOIN bislang still verwarf.**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-07-28T20:31:16Z
- **Completed:** 2026-07-28T20:49:01Z
- **Tasks:** 2 (beide tdd="true", je RED→GREEN)
- **Files modified:** 8 (1 erstellt, 7 geändert)

## Accomplishments
- **Persistenzlücke geschlossen:** `AltTitles []AdminAnimeAltTitle` auf `AdminAnimeCreateInput` und `AdminAnimePatchInput`; `appendAltTitleSlots` verkettet jeden vollständigen Alt-Titel als Slot-Write, der durch `upsertAuthoritativeAnimeTitle` läuft.
- **Mapping-Defekt in drei Write-Sites behoben:** Haupttitel-Slot Create/Patch `romaji`→`ja`; `buildAniSearchAltTitles` `("ja","official")`/`("ja-Latn","romanized")` → `("ja","japanese")`/`("ja","romaji")`.
- **Request-Pfad verdrahtet:** `adminAnimeCreateRequest.alt_titles` und Patch-Feldprüfung, damit der Persistenzpfad vom echten API-Input erreichbar ist (nicht nur Draft-Preview).
- **Dateigrößen eingehalten:** `admin_content_anime_metadata.go` 437, `admin_content_anime_alt_titles.go` 40 (beide ≤450).

## Task Commits

Jede Task folgte dem TDD-Zyklus (test → feat/fix):

1. **Task 1 (RED): failing tests AltTitles-Persistenzpfad** - `9cbc6935` (test)
2. **Task 1 (GREEN): AltTitles-Persistenzpfad durch upsertAuthoritativeAnimeTitle** - `6286f45c` (feat)
3. **Task 2 (RED): erzwinge gültiges (ja)-Titel-Mapping** - `231ae812` (test)
4. **Task 2 (GREEN): Write-Sites auf gültige (ja)-Sprachcodes** - `a0e6e2b9` (fix)

## Files Created/Modified
- `backend/internal/repository/admin_content_anime_alt_titles.go` (neu) - `appendAltTitleSlots`: verkettet vollständige Alt-Titel als Slot-Writes, überspringt unvollständige Einträge.
- `backend/internal/models/admin_content.go` - `AltTitles`-Feld auf Create-/Patch-Input.
- `backend/internal/repository/admin_content_anime_metadata.go` - Haupttitel-Slot `(ja,main)`; Alt-Titel-Verkettung in Create/Patch-Builder; Slot-Literale kompaktiert (Zeilenbudget).
- `backend/internal/services/anime_create_enrichment.go` - `buildAniSearchAltTitles`-Mapping korrigiert.
- `backend/internal/handlers/admin_content_handler.go` - `alt_titles` auf `adminAnimeCreateRequest`.
- `backend/internal/handlers/admin_content_anime_validation.go` - `req.AltTitles` → Input; `hasAnyAdminAnimePatchField` berücksichtigt AltTitles.
- `backend/internal/repository/admin_content_test.go` - Alt-Titel-Slot-Tests, `(ja)`-Mapping-Assertions, Zeilenbudget-Liste erweitert.
- `backend/internal/services/anime_create_enrichment_test.go` - `TestBuildAniSearchAltTitles_MapsToValidLanguageAndTitleTypeCodes`.

## Decisions Made
- **Haupttitel → (ja, main):** Der Read-Kontrakt `pickNormalizedTitle` bevorzugt Sprache `[ja, romaji]` und Typ `[main, romaji, official]`; `(ja, main)` rankt den Haupttitel höher als das alte (romaji, main) und deckt sich mit dem korrekten Backfill-Gegenbeispiel (`anime_metadata_backfill.go:162`). `title_type` bleibt `main`.
- **OriginalTitle → (ja, japanese)** (statt `official`), damit der japanische Originaltitel vom en/de-`official` unterscheidbar bleibt; RomajiTitle → (ja, romaji).
- **Site 2 (`upsertAuthoritativeAnimeTitle`) unverändert:** Der strenge JOIN bleibt die Sicherung — er nimmt jetzt gültige Codes an, statt sie still zu verwerfen.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Request-DTO-Verdrahtung für alt_titles**
- **Found during:** Task 1 (AltTitles-Persistenzpfad)
- **Issue:** Der Plan listet nur `models`/`repository` als Task-1-Dateien. Ein `AltTitles`-Feld allein auf `AdminAnimeCreateInput` bleibt tot, weil der API-Pfad über `adminAnimeCreateRequest` → `validateAdminAnimeCreateRequest` bindet und dort kein `alt_titles` durchreicht — die must_haves-Wahrheit „nicht nur Draft-Payload" wäre nicht erfüllt.
- **Fix:** `alt_titles` auf `adminAnimeCreateRequest` ergänzt, in `validateAdminAnimeCreateRequest` → `input.AltTitles` gemappt, `hasAnyAdminAnimePatchField` um `len(req.AltTitles) > 0` erweitert (Patch mit nur alt_titles wird gültig).
- **Files modified:** backend/internal/handlers/admin_content_handler.go, backend/internal/handlers/admin_content_anime_validation.go
- **Verification:** `go test ./internal/handlers/...` grün; `go build ./...` fehlerfrei.
- **Committed in:** `6286f45c` (Task 1 GREEN)

**2. [Rule 3 - Blocking] Slot-Literale kompaktiert zur Einhaltung des 450-Zeilen-Limits**
- **Found during:** Task 1 (Builder-Verdrahtung)
- **Issue:** `admin_content_anime_metadata.go` lag bei 449 Zeilen; das Anhängen der Alt-Titel-Verkettung hätte 450 überschritten (CLAUDE.md).
- **Fix:** Create-Builder-Slot-Literale auf einzeilige Composite-Literale reduziert; Datei jetzt 437 Zeilen. AltTitle-Logik ohnehin in neuer Split-Datei.
- **Files modified:** backend/internal/repository/admin_content_anime_metadata.go
- **Verification:** `wc -l` = 437; `TestAdminContentRepository_Task1FilesStayWithinLineBudget` grün (neue Datei zur Budget-Liste ergänzt).
- **Committed in:** `6286f45c` (Task 1 GREEN)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Beide Auto-Fixes sind für die Korrektheit des Write-Pfads erforderlich (Feld sonst tot / Zeilenlimit verletzt). Kein Scope-Creep — keine neue Suchlogik, keine neuen Referenzzeilen, Site 2 unangetastet.

## Issues Encountered
- Der erste Go-Compile im Sandbox lief mehrfach in das 120s-Timeout; Tests wurden im Hintergrund ausgeführt und via Warteschleife eingesammelt. Kein Code-Problem.

## Known Stubs / Follow-ups
- **Frontend-Save-Payload (A3):** Der AniSearch-Enrichment-Draft trägt `alt_titles`, aber das Frontend muss diese im Create/Patch-Save-Request tatsächlich mitsenden, damit neu über die UI angelegte Anime den Romaji/Japanisch-Titel persistieren. Backend akzeptiert `alt_titles` nun; die Frontend-Verdrahtung liegt außerhalb der Plan-Dateien (kein Frontend in `files_modified`) und ist offener Folgeschritt.
- **Bestandsdaten:** Kein Backfill-Zwang (bewusste Entscheidung D-12). Datenkorrektur bereits importierter Anime erfolgt per Re-Import in Plan 115-08.
- **Live-DB-Beweis:** „Romaji-Zeile erscheint in anime_titles" ist hier nicht beweisbar (kein Live-DB-Harness) — Verifikation in Plan 115-08 (Re-Import + Smoke/UAT, VALIDATION.md).

## Next Phase Readiness
- Write-Path-Korrektur abgeschlossen; die späteren FTS-/Trigram-Wellen können `anime_titles` über alle Typen (inkl. `romaji`, `japanese`) lesen, ohne den Defekt kompensieren zu müssen (D-11(2) gewahrt: Suche liest nur).
- Blocker für die Kern-Suche „Koe no Katachi → A Silent Voice" ist code-seitig entfernt; verbleibende Sichtbarkeit hängt an Frontend-Payload + Re-Import (siehe Follow-ups).

---
*Phase: 115-globale-suche-postgres-fts*
*Completed: 2026-07-28*

## Self-Check: PASSED
