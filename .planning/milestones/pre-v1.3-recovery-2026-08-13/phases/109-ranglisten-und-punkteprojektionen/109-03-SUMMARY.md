---
phase: 109-ranglisten-und-punkteprojektionen
plan: 03
subsystem: api
tags: [go, gin, openapi, typescript, ranking, gamification]

# Dependency graph
requires:
  - phase: 109-ranglisten-und-punkteprojektionen (Plan 02)
    provides: MemberPointTotalsRepository.ListRanking (reines Lese-Repository ueber die persistierte member_point_totals-Tabelle, mit snake_case JSON-Struct-Tags auf MemberPointRankingRow)
provides:
  - Dünner GET-Handler MemberPointRankingHandler.GetMemberPointRanking, registriert als eigener Top-Level-Endpunkt GET /api/v1/member-point-ranking
  - OpenAPI-Contract-Eintrag /api/v1/member-point-ranking mit MemberPointRankingRow/MemberPointRankingResponse-Schemas
  - Frontend-Typen MemberPointRankingRow/MemberPointRankingResponse + getMemberPointRanking(page?)-API-Helper in frontend/src/lib/api.ts
affects: [110-ranglisten-ui-und-badges]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dünner GET-Handler, der ausschließlich ein bestehendes Read-Repository aufruft, ohne eigene Feld-Transformation (Response-Envelope {data, total, page} identisch zu SearchArchive)"
    - "Eigener Top-Level-Routenpfad statt Unterpfad eines bestehenden Parameter-Segments zur Vermeidung von Gin-Routenkollisionen"

key-files:
  created:
    - backend/internal/handlers/member_point_totals_handler.go
  modified:
    - backend/cmd/server/main.go
    - shared/contracts/openapi.yaml
    - frontend/src/lib/api.ts

key-decisions:
  - "Response-Envelope bewusst {data, total, page} (analog SearchArchive) statt der im RESEARCH.md-Entwurf abweichenden {members, total, page}-Form — Konsistenz mit dem einzigen bereits existierenden paginierten Public-Endpunkt hat Vorrang, exakt wie im Plan vorgegeben."
  - "Route GET /api/v1/member-point-ranking als eigener Top-Level-Pfad registriert, unmittelbar neben /members/:slug/contributions in main.go — kein Unterpfad von /members/:slug (Pitfall 3 vermieden)."
  - "Kein UI-Konsument dieser Phase: getMemberPointRanking existiert nur als Definition in api.ts, kein Import in einer Komponente (per grep verifiziert) — D-03/D-04 bleiben fuer Phase 110."

patterns-established:
  - "Pattern 3 (aus RESEARCH.md uebernommen): Seitenweise Lese-Query mit festem page-Bounds-Check (page<1->1, page>1000->1000), kein 400 bei ungueltigem Wert."

requirements-completed: [GAM-01, GAM-04, GAM-05]

# Metrics
duration: 25min
completed: 2026-07-27
---

# Phase 109 Plan 03: Lese-Endpunkt, Contract und Frontend-API-Helper Summary

**GET /api/v1/member-point-ranking ist als eigener, unauthentifizierter Top-Level-Endpunkt erreichbar, liefert die in Plan 109-02 persistierte, absteigend sortierte Punkte-Rangliste als reine Lese-Projektion, und ist über OpenAPI-Contract sowie einen typisierten Frontend-API-Helper (ohne UI-Konsumenten) synchronisiert.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-07-27T13:05:00Z
- **Completed:** 2026-07-27T13:30:00Z
- **Tasks:** 2 / 2 completed
- **Files modified:** 4 (1 neu, 3 bestehend erweitert)

## Accomplishments
- `backend/internal/handlers/member_point_totals_handler.go`: Neuer `MemberPointRankingHandler` mit Konstruktor `NewMemberPointRankingHandler`, dünnem `GetMemberPointRanking`-Handler (page-Bounds-Check exakt nach `member_archive_handler.go`-Muster, Response-Envelope `{data, total, page}`, deutsche Fehlermeldung "interner serverfehler" mit korrekten Umlauten bei Repository-Fehler).
- `backend/cmd/server/main.go`: `memberPointTotalsRepo`/`memberPointRankingHandler` im bestehenden Konstruktionsblock instanziiert; Route `v1.GET("/member-point-ranking", ...)` als eigener Top-Level-Pfad direkt neben den anderen unauthentifizierten Public-Read-Routen registriert — explizit kein Unterpfad von `/members/:slug` (Zeile 352), keine Kollision.
- `shared/contracts/openapi.yaml`: Neuer Pfad `/api/v1/member-point-ranking` (Tag `Ranking`, `operationId: getMemberPointRanking`, `page`-Query-Parameter im Stil von `/api/v1/anime`) sowie `MemberPointRankingRow`/`MemberPointRankingResponse`-Schemas in `components.schemas`. YAML bleibt gültig (per `js-yaml`-Fallback-Parse verifiziert, da `@redocly/cli` in dieser Umgebung nicht installierbar war ohne Bestätigungsprompt).
- `frontend/src/lib/api.ts`: Co-lokalisierte Interfaces `MemberPointRankingRow`/`MemberPointRankingResponse` sowie `getMemberPointRanking(page?)` nach exaktem `searchArchive`-Muster (URLSearchParams nur bei `page > 1`, `ApiError`/`parseApiErrorPayload` bei `!response.ok`). Kein Aufrufer in einer UI-Komponente (per grep bestätigt: nur ein Definitionsort in `api.ts`).
- `go build ./... && go vet ./...` fehlerfrei; vollständige Backend-Testsuite (`go test ./...`) grün, inklusive `TestPointServicePhase106Boundary` und `TestPhase107ReviewServiceBoundary` (Boundary-Regressionsschutz intakt). `cd frontend && npm run typecheck` fehlerfrei.

## Task Commits

Each task was committed atomically:

1. **Task 1: Handler + Routenregistrierung** - `dec6875b` (feat)
2. **Task 2: OpenAPI-Contract + Frontend-Typen/API-Helper** - `66235e72` (feat)

**Plan metadata:** (dieser Commit folgt separat nach diesem Summary)

## Files Created/Modified
- `backend/internal/handlers/member_point_totals_handler.go` - Neuer dünner GET-Handler `GetMemberPointRanking`
- `backend/cmd/server/main.go` - Repository-/Handler-Konstruktion + Routenregistrierung `GET /api/v1/member-point-ranking`
- `shared/contracts/openapi.yaml` - Neuer Pfad + `MemberPointRankingRow`/`MemberPointRankingResponse`-Schemas
- `frontend/src/lib/api.ts` - Typen + `getMemberPointRanking(page?)`-Helper

## Decisions Made
- Response-Envelope `{data, total, page}` (nicht `{members, total, page}` aus dem älteren Research-Entwurf) — Plan legt dies explizit final fest, Konsistenz mit `SearchArchive` hat Vorrang.
- Route als eigener Top-Level-Pfad `/member-point-ranking`, registriert direkt neben `/members/:slug/contributions`, um die dokumentierte Gin-Kollisionsregel (Pitfall 3) strukturell zu vermeiden.
- Kein UI-Konsument in diesem Plan — `getMemberPointRanking` bleibt unreferenziert außerhalb seiner eigenen Definition (Phase 110 baut die UI).

## Deviations from Plan

None - plan executed exactly as written. Handler-Struktur, Routenregistrierung, OpenAPI-Schema-Form und Frontend-Helper folgen wortgetreu den in PLAN.md/PATTERNS.md/RESEARCH.md vorgegebenen Code-Fragmenten.

## Issues Encountered
- **Docker/Live-Backend war in dieser Ausführungsumgebung nicht erreichbar** (`docker ps` schlägt fehl, konsistent mit dem bereits in 109-02-SUMMARY.md dokumentierten Verhalten). Der im Plan vorgesehene Fallback wurde genutzt: `go build ./... && go vet ./...` fehlerfrei plus vollständige Testsuite grün als Minimalnachweis, dass kein Gin-Routenkonflikt-Panic auftritt (kein `curl` gegen einen laufenden Server möglich).
- **`@redocly/cli` war nicht vorinstalliert** und `npx` bricht ohne interaktive Bestätigung ab (kein automatisches Nachinstallieren nicht verifizierter Pakete, siehe Threat-Register T-109-SC). Der dokumentierte `js-yaml`-Fallback aus dem Verify-Kommando wurde genutzt und bestätigt gültiges YAML.

## User Setup Required
None für den Code selbst. Für eine vollständige Live-Verifikation (`curl http://localhost:PORT/api/v1/member-point-ranking` gegen eine laufende Docker-Backend-Instanz) muss Docker Desktop in einer künftigen Session erreichbar sein — wie bereits in 109-02-SUMMARY.md empfohlen.

## Next Phase Readiness
- `GET /api/v1/member-point-ranking` ist vollständig verdrahtet (Handler, Route, Contract, Frontend-Helper) und bereit für Phase 110 (Ranglisten-UI und Badges).
- Boundary-Schutz für Phase 106/107 bleibt vollständig intakt; keine geschützte Datei wurde berührt.
- Empfehlung: Vor Abschluss der gesamten Phase 109 (falls noch nicht geschehen) einmal mit erreichbarem Docker die vollständige Testsuite inklusive Live-Postgres-Tests aus 109-01/109-02 sowie ein echter `curl`-Smoke-Test gegen den neuen Endpunkt nachträglich ausführen.

---
*Phase: 109-ranglisten-und-punkteprojektionen*
*Completed: 2026-07-27*

## Self-Check: PASSED

- FOUND: backend/internal/handlers/member_point_totals_handler.go
- FOUND: .planning/phases/109-ranglisten-und-punkteprojektionen/109-03-SUMMARY.md
- FOUND commit: dec6875b (Task 1)
- FOUND commit: 66235e72 (Task 2)
