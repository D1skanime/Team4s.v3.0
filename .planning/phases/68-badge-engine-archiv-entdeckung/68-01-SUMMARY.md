---
phase: 68-badge-engine-archiv-entdeckung
plan: "01"
subsystem: backend-badge-engine
tags:
  - badge-engine
  - contributions
  - backfill
  - go
dependency_graph:
  requires: []
  provides:
    - RevokeMemberBadge (badge_repository)
    - GetMemberIDForContribution (anime_contributions_upsert_repository)
    - computeFirstContribution, computeProductiveTiers, computeAllRounder, computeVerified (badge_service)
    - BadgeBackfillService.BackfillAll
    - FansubAnimeContributionsHandler Badge-Trigger (Create/Update/Delete)
    - migrate backfill-badges CLI-Subbefehl
  affects:
    - badge_service.go
    - badge_repository.go
    - anime_contributions_upsert_repository.go
    - fansub_anime_contributions_handler.go
    - cmd/migrate/main.go
    - cmd/server/main.go
tech_stack:
  added: []
  patterns:
    - Source-Inspection-Tests (Projekt-Standard)
    - WithX-Methode für optionale Service-Dependencies
    - Method-Chaining auf Handler-Konstruktor
key_files:
  created:
    - backend/internal/services/badge_service_test.go
    - backend/internal/services/badge_backfill_service.go
  modified:
    - backend/internal/repository/badge_repository.go
    - backend/internal/repository/anime_contributions_upsert_repository.go
    - backend/internal/services/badge_service.go
    - backend/internal/handlers/fansub_anime_contributions_handler.go
    - backend/internal/handlers/fansub_contributions_validation.go
    - backend/cmd/migrate/main.go
    - backend/cmd/server/main.go
decisions:
  - "Source-Inspection-Tests statt Test-DB — entspricht dem etablierten Projekt-Testmuster"
  - "parseAnimeIDParam nach fansub_contributions_validation.go ausgelagert um 450-Zeilen-Limit zu halten"
  - "computeVerified verwendet claim_status='verified' direkt, kein category-Feld (Pitfall 3)"
metrics:
  duration: "8 Minuten"
  completed: "2026-06-02"
  tasks_completed: 2
  files_changed: 8
---

# Phase 68 Plan 01: Badge-Engine (RevokeMemberBadge, Compute-Funktionen, Backfill, Handler-Trigger) Summary

**One-liner:** Vier neue Badge-Berechnungsfunktionen (first_contribution, productive_bronze/silver/gold, all_rounder, verified) mit RevokeMemberBadge, GetMemberIDForContribution, BadgeBackfillService und event-getriebenen Contribution-Handlern.

## Was wurde gebaut

### Task 1: RevokeMemberBadge + GetMemberIDForContribution + neue Badge-Compute-Funktionen

**badge_repository.go:**
- `RevokeMemberBadge(ctx, memberID, badgeCode)`: UPDATE member_badges SET status='revoked' WHERE ... AND status='active'. visibility wird explizit NICHT gesetzt (D-07).

**anime_contributions_upsert_repository.go:**
- `GetMemberIDForContribution(ctx, contributionID)`: JOIN-basierter Lookup für member_id vor dem Delete (Pitfall 2). Gibt ErrNotFound zurück wenn keine Zeile vorhanden.

**badge_service.go:**
- `computeFirstContribution`: Upsert bei ≥1 confirmed Contribution; RevokeMemberBadge wenn keine vorhanden.
- `computeProductiveTiers`: COUNT(DISTINCT anime_id); Schwellen 10/25/50 für productive_bronze/silver/gold; jede Stufe einzeln Upsert/Revoke (D-05).
- `computeAllRounder`: COUNT(DISTINCT role_code) über confirmed Contributions; Schwelle 3 (D-05).
- `computeVerified`: EXISTS(member_claims WHERE claim_status='verified'); kein category-Feld (Pitfall 3).
- ComputeAndStoreBadges: ruft jetzt alle 7 compute-Funktionen auf (3 bestehende + 4 neue).

**badge_service_test.go (NEU):**
- 8 Source-Inspection-Tests nach Projekt-Standard: TestComputeFirstContribution, TestComputeProductiveTiers, TestComputeAllRounder, TestComputeVerified, TestRecomputeKeepsHiddenVisibility, TestRevokeBadge_RevokesOnlyActive, TestComputeAndStoreBadges_CallsAllFunctions, TestGetMemberIDForContribution_MethodExists.

### Task 2: BadgeBackfillService + CLI-Subbefehl + Contribution-Handler Badge-Trigger

**badge_backfill_service.go (NEU):**
- `BadgeBackfillReport`: MembersProcessed int, Errors []string.
- `BadgeBackfillService.BackfillAll(ctx)`: iteriert alle Members via SELECT id FROM members ORDER BY id; ruft ComputeAndStoreBadges je Member auf; sammelt Fehler ohne Abbruch; prüft rows.Err().

**cmd/migrate/main.go:**
- case "backfill-badges": runBackfillBadges(os.Args[2:]) — vor dem default-case eingefügt.
- Usage-Zeile `migrate backfill-badges [-database-url url]` ergänzt.
- runBackfillBadges: context.WithTimeout(10min), DB-Pool, BadgeRepository, BadgeService, BadgeBackfillService, Report-Logging.

**fansub_anime_contributions_handler.go:**
- Feld `badgeService *services.BadgeService` hinzugefügt.
- `WithBadgeService(svc)` Methode für Method-Chaining.
- CreateAnimeContribution: Badge-Trigger via ComputeAndStoreBadgesByMembership nach Audit-Log.
- UpdateAnimeContribution: Badge-Trigger via ComputeAndStoreBadgesByMembership nach Audit-Log.
- DeleteAnimeContribution: GetMemberIDForContribution VOR dem Delete; ComputeAndStoreBadges mit gesicherter member_id NACH dem Delete (Pitfall 2).
- parseAnimeIDParam nach fansub_contributions_validation.go ausgelagert (450-Zeilen-Limit).

**cmd/server/main.go:**
- NewFansubAnimeContributionsHandler(...).WithBadgeService(badgeService) — badgeService war bereits instanziiert.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 450-Zeilen-Limit: parseAnimeIDParam ausgelagert**
- **Found during:** Task 2
- **Issue:** fansub_anime_contributions_handler.go hatte nach allen Ergänzungen 460 Zeilen — über dem CLAUDE.md-Limit von 450.
- **Fix:** parseAnimeIDParam (package-level Funktion) nach fansub_contributions_validation.go verschoben — semantisch passend, da die Datei bereits andere Handler-Hilfsmittel enthält.
- **Files modified:** backend/internal/handlers/fansub_anime_contributions_handler.go, backend/internal/handlers/fansub_contributions_validation.go
- **Ergebnis:** Handler auf exakt 450 Zeilen.

**2. [Rule 1 - Bug] TestRecomputeKeepsHiddenVisibility — erste Testformulierung zu breit**
- **Found during:** Task 1 Tests
- **Issue:** `strings.Contains(normalized, "set visibility")` traf auch den `SetBadgeVisibility`-Block in badge_repository.go, der legitimerweise `SET visibility = $3` enthält.
- **Fix:** Test auf spezifischere Prüfung umgestellt — prüft, dass RevokeMemberBadge NICHT `set status = 'revoked', visibility` enthält und der Upsert-Block kein `do update set visibility` enthält.
- **Commit:** Teil von 8aca3d3c

## Known Stubs

Keine Stubs. Alle Funktionen sind vollständig implementiert.

## Threat Surface Scan

Keine neuen unerwarteten Trust-Boundary-Flächen. Alle Änderungen sind in der Threat-Model-Tabelle des Plans erfasst:
- RevokeMemberBadge: WHERE status='active' verhindert versehentlichen Eingriff in pending-Badges (T-68-01-01).
- backfill-badges CLI: Nur via DATABASE_URL erreichbar, kein HTTP-Endpunkt (T-68-01-02).
- BackfillAll: context.WithTimeout(10min) als DoS-Schutz (T-68-01-03).

## Self-Check: PASSED

- badge_service_test.go: FOUND
- badge_backfill_service.go: FOUND
- 68-01-SUMMARY.md: FOUND
- Commit 8aca3d3c: FOUND
- Commit b62c7fe3: FOUND
