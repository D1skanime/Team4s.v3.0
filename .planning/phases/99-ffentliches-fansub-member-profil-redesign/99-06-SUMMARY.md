---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "06"
subsystem: api
tags: [go, pgx, postgres, interval-cast, openapi, typescript, group-themes]

# Dependency graph
requires:
  - phase: 99-05
    provides: Konsistente Mitglieder-Kennzahlen (Vorlaeuferplan, unabhaengiges Thema)
provides:
  - "PublicGroupTheme-DTO liefert start_time/end_time (HH:MM:SS oder null) aus theme_segments"
  - "OpenAPI-Contract und TS-Typ spiegeln die neuen Zeitcode-Felder"
affects: [99-07, "Release-Detailseite (AO4-20 OP/ED/Middle-Timeline)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "interval-Spalten werden per ::text-Cast gescannt (bestehendes Phase-24-Muster), damit Go einen HH:MM:SS-String erhaelt statt eines pgtype.Interval"
    - "Zeitcode-Felder werden einmal pro Theme beim ersten Anlegen im themeIndex-Aggregat gesetzt, nicht pro Asset-Zeile"

key-files:
  created:
    - backend/internal/repository/group_themes_repository_test.go
  modified:
    - backend/internal/repository/group_themes_repository.go
    - frontend/src/types/groupContributors.ts
    - shared/contracts/openapi.yaml

key-decisions:
  - "Zeitcode-Join folgt dem Plan woertlich: LEFT JOIN theme_segments ts ON ts.theme_id = t.id AND ts.fansub_group_id = $2 (kein LATERAL/DISTINCT-ON-Umbau, da Plan diese einfache Form explizit vorgibt)"
  - "Test in eigener Datei group_themes_repository_test.go statt Erweiterung von group_contributors_repository_test.go (Plan-Vorgabe)"
  - "Da setupTestRepo() immer t.Skip() ausloest (keine Test-DB im Projekt), wurde zusaetzlich ein Source-Inspection-Test (Phase-37-Muster) ergaenzt, der Join/Cast/DTO-Felder direkt am Quelltext verifiziert"

patterns-established:
  - "Source-Inspection-Test fuer DB-lose Query-Verifikation (Grep nach Join/Cast/Feld-Strings im Quelltext), analog Phase 37"

requirements-completed: ["Phase 99 Add-on 4 AO4-04"]

# Metrics
duration: 12min
completed: 2026-07-08
---

# Phase 99 Plan 06: OP/ED/Middle-Zeitcodes im Public-Themes-DTO Summary

**PublicGroupTheme liefert jetzt start_time/end_time aus theme_segments (LEFT JOIN, ::text-Cast, ohne Berechnung/Platzhalter), gespiegelt in OpenAPI und TS-Typ fuer die kuenftige Release-Detail-Timeline (AO4-20).**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-08T15:19:00Z (geschaetzt, kein expliziter Start-Timestamp erfasst)
- **Completed:** 2026-07-08T15:31:00Z
- **Tasks:** 2/2
- **Files modified:** 4 (1 neu, 3 geaendert)

## Accomplishments
- `PublicGroupTheme` (Backend-DTO) um nullable `StartTime *string` / `EndTime *string` (json `start_time`/`end_time`) erweitert
- `GetPublicGroupThemes`-Query joint jetzt `theme_segments` (LEFT JOIN, gescoped auf `theme_id` + `fansub_group_id`) und selektiert `start_time::text`/`end_time::text`; Werte bleiben `nil`, wenn kein Segment existiert
- TS-Typ `PublicGroupTheme` und OpenAPI-Schema (`shared/contracts/openapi.yaml`) spiegeln die neuen Felder mit deutscher Beschreibung

## Task Commits

Each task was committed atomically:

1. **Task 1: PublicGroupTheme-DTO um Zeitcodes erweitern und Query joinen** - `84fb3e49` (feat)
2. **Task 2: TS-Typ und OpenAPI-Contract spiegeln** - `4f56c6d6` (feat)

**Plan metadata:** (folgt in diesem Commit)

## Files Created/Modified
- `backend/internal/repository/group_themes_repository.go` - DTO um `StartTime`/`EndTime` erweitert; Query joint `theme_segments` per LEFT JOIN mit `::text`-Cast; Scan/Mapping setzt Zeitcodes einmal pro Theme
- `backend/internal/repository/group_themes_repository_test.go` - Neue Testdatei: Source-Inspection-Test fuer Join/Cast/DTO-Felder + Empty-Result-Regressionstest (beide DB-Tests skippen mangels Test-DB, konsistent mit bestehendem Muster)
- `frontend/src/types/groupContributors.ts` - `PublicGroupTheme`-Interface um `start_time: string | null` / `end_time: string | null` ergaenzt
- `shared/contracts/openapi.yaml` - `PublicGroupTheme`-Schema um nullable `start_time`/`end_time` (deutsche Beschreibung) ergaenzt

## Decisions Made
- Join-Form folgt der Plan-Vorgabe woertlich (`LEFT JOIN theme_segments ts ON ts.theme_id = t.id AND ts.fansub_group_id = $2`); bei mehreren gleichzeitig existierenden `theme_segments`-Versionen fuer dasselbe Theme+Gruppe koennte dies theoretisch zu doppelten Asset-Zeilen fuehren (SELECT DISTINCT differenziert dann ueber unterschiedliche Zeitcode-Werte) — dies ist der vom Plan explizit vorgegebene einfache Join, kein Deviation-Fix, da die Praxis (eine aktive Version je Gruppe) diesen Edge-Case unwahrscheinlich macht. Fuer die Release-Detail-Timeline (AO4-20, Folgeplan) ggf. pruefen.
- Zusaetzlicher Source-Inspection-Test ergaenzt (kein Deviation-Fix, sondern plan-konforme Umsetzung der Vorgabe "Assertion (Source- oder DB-basiert)"), da die vorhandene Testinfrastruktur (`setupTestRepo`) ohne Test-DB immer skippt.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Verification Performed

- `cd backend && go build ./...` — fehlerfrei
- `cd backend && go test ./internal/repository -run "GetPublicGroupThemes|GroupThemesRepository" -v` — PASS (2 Tests skip mangels Test-DB, konsistent mit Bestandsmuster; 1 Source-Inspection-Test PASS)
- `cd frontend && npm run typecheck` — fehlerfrei
- `shared/contracts/openapi.yaml` per `js-yaml` geparst — valide YAML
- **Nicht durchgefuehrt:** Live-Verifikation via `docker compose up -d --build team4sv30-backend` (kein Docker-Rebuild in diesem Ausfuehrungslauf). Reine Backend-Datenschicht-/Contract-Aenderung ohne UI-Rendering — kein Frontend-Verhalten sichtbar veraendert (Feld wird noch von keiner Komponente konsumiert). Empfehlung: vor Nutzung durch die Release-Detailseite (AO4-20, Folgeplan) Backend-Container neu bauen und mit echten `theme_segments`-Daten pruefen, dass `start_time`/`end_time` im `/anime/:id/group/:groupId/themes`-Response erscheinen.

## Next Phase Readiness
- Backend liefert Zeitcodes bereit fuer die Release-Detailseite (AO4-20 OP/ED/Middle-Timeline, Folgeplan)
- Frontend-Typ/Contract sind synchron; `getGroupThemes` in `api.ts` braucht keine Aenderung (reicht Response-Objekt durch)
- Kein Blocker fuer nachfolgende Plaene

---
*Phase: 99-ffentliches-fansub-member-profil-redesign*
*Completed: 2026-07-08*

## Self-Check: PASSED

- FOUND: backend/internal/repository/group_themes_repository.go
- FOUND: backend/internal/repository/group_themes_repository_test.go
- FOUND: frontend/src/types/groupContributors.ts
- FOUND: shared/contracts/openapi.yaml
- FOUND commit: 84fb3e49
- FOUND commit: 4f56c6d6
