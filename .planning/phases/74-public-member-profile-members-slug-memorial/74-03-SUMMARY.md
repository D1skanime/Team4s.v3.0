---
phase: 74-public-member-profile-members-slug-memorial
plan: "03"
subsystem: member-correction
tags: [correction, audit, review-bound, migration, openapi, api-ts]
dependency_graph:
  requires: ["74-00", "74-01", "74-02"]
  provides: [member_correction_reports table, member_correction_reports repo, POST /me/members/:id/correction, openapi MemberCorrectionRequest/Response, submitMemberCorrection api.ts]
  affects: [backend/cmd/server/main.go, shared/contracts/openapi.yaml, frontend/src/lib/api.ts]
tech_stack:
  added: []
  patterns:
    - requireMeIdentity-Gate (analog ContributionProposalsMeHandler)
    - Interface-getriebenes Repo (MemberCorrectionRepo) für Handler-Stub-Tests
    - audit_logs Write (fehlertolerant, D-15)
    - review-gebundener INSERT mit DEFAULT 'in_review' (D-18)
key_files:
  created:
    - database/migrations/0098_member_correction_reports.up.sql
    - database/migrations/0098_member_correction_reports.down.sql
    - backend/internal/repository/member_correction_repository.go
    - backend/internal/handlers/member_correction_handler.go
  modified:
    - backend/cmd/server/main.go
    - shared/contracts/openapi.yaml
    - frontend/src/lib/api.ts
decisions:
  - "Migration 0098 für member_correction_reports gewählt — höchste belegte Nummer vor diesem Plan war 0097 (Phase 72, Kollision aufgelöst laut 74-MIGRATION-COLLISION-NOTE.md)"
  - "MemberCorrectionRepository nutzt *pgxpool.Pool (statt DBTX-Interface aus audit_logs.go) — DBTX hat nur Exec, QueryRow fehlt; Muster aller anderen Repos"
  - "Handler-Konstruktion in main.go direkt nach MemberMemorialHandler platziert — sichergestellt, dass Konstruktion vor den Route-Registrierungen erfolgt"
  - "pre-existing TypeScript-Fehler MemberContributionFilters (Plan 74-00 Wave-0 RED-Stub) unverändert — nicht durch diesen Plan verursacht"
metrics:
  duration: "~20min"
  completed: "2026-06-05"
  tasks: 2
  files: 7
---

# Phase 74 Plan 03: member_correction_reports + Korrektur-Handler Summary

**One-liner:** Review-gebundener Korrektur-Melden-Endpoint (POST /me/members/:id/correction) mit eigener member_correction_reports-Tabelle (Lock H), requireMeIdentity-Gate, audit_logs-Schreibung und OpenAPI/api.ts-Verdrahtung.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Migration member_correction_reports + Repo | 5f19bade | 0098_*.up.sql, 0098_*.down.sql, member_correction_repository.go |
| 2 | Korrektur-Handler + Route + OpenAPI + api.ts | a906964e | member_correction_handler.go, main.go, openapi.yaml, api.ts |

## Verification Results

- `go build ./...`: grün (beide Tasks)
- `go vet ./internal/repository/...`: grün (Task 1)
- `npm run typecheck`: grün für neue Änderungen; pre-existing Fehler `MemberContributionFilters` (Plan 74-00 Wave-0 RED-Stub, Komponente wird in Plan 74-04 erstellt) unverändert vorhanden
- Migration: `0098_member_correction_reports.up.sql` SQL inspektionsgeprüft; `go run ./cmd/migrate up` erfordert Live-DB (Docker Compose) — deferred to runtime verification (laut migration_and_db_note in Execution-Context)
- OpenAPI-Inspektion: Endpoint `/api/v1/me/members/{id}/correction` mit target_type-Enum (Lock K), deutschen Beschreibungen und Umlauten, MemberCorrectionRequest/Response Schemas korrekt

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DBTX-Interface hat kein QueryRow — *pgxpool.Pool verwendet**
- **Found during:** Task 1
- **Issue:** Das `DBTX`-Interface aus `audit_logs.go` bietet nur `Exec`, nicht `QueryRow`. `CreateCorrectionReport` braucht aber `QueryRow` für RETURNING-Insert.
- **Fix:** `MemberCorrectionRepository.db` als `*pgxpool.Pool` (Muster aller anderen Repositories z. B. MemberMemorialRepository).
- **Files modified:** backend/internal/repository/member_correction_repository.go
- **Commit:** 5f19bade

**2. [Rule 1 - Bug] Handler-Konstruktion in main.go vor Route-Registrierung platziert**
- **Found during:** Task 2
- **Issue:** Erster Platzierungsversuch nach `contributionsMeHandler` (Zeile ~405) war nach der Route-Registrierung — Go-Compile-Fehler "undefined: memberCorrectionHandler".
- **Fix:** Konstruktion direkt nach `memberMemorialHandler` (~Zeile 136) verschoben — vor dem v1-Routen-Block.
- **Files modified:** backend/cmd/server/main.go
- **Commit:** a906964e (beide Builds grün)

## Known Stubs

Keine. Alle Pflichtfelder verdrahtet; Frontend-Modal (CorrectionReportModal) folgt in Plan 06.

## Threat Flags

Keine neuen Security-relevanten Surfaces über den Plan-`<threat_model>` hinaus:
- Alle 6 STRIDE-Threats (T-74-03-EOP/SPOOF/DOM/REP/INPUT/SC) durch Implementation mitigiert.
- T-74-03-SC: keine neuen Pakete (verifiziert).

## Self-Check: PASSED

- database/migrations/0098_member_correction_reports.up.sql — FOUND
- database/migrations/0098_member_correction_reports.down.sql — FOUND
- backend/internal/repository/member_correction_repository.go — FOUND
- backend/internal/handlers/member_correction_handler.go — FOUND
- Commits 5f19bade und a906964e — FOUND in git log
