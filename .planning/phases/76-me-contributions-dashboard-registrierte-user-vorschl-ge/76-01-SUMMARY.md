---
phase: 76-me-contributions-dashboard-registrierte-user-vorschl-ge
plan: "01"
subsystem: contributions
tags: [schema, contracts, types, tdd, wave-0, member-suggestions, reject-reason]
dependency_graph:
  requires: []
  provides:
    - database/migrations/0098_member_suggestions.up.sql
    - shared/contracts/openapi.yaml (neue Suggestion-Endpoints + reject-reason)
    - frontend/src/types/contributions.ts (MeAnimeContribution-Erweiterung + MeSuggestion)
    - Wave-0-Testgerüste (5 rote Test-Dateien)
  affects:
    - backend/internal/handlers/contributions_me_handler.go (Test vorhanden)
    - frontend/src/lib/api.ts (Test vorhanden, Funktion kommt in Plan 02)
tech_stack:
  added: []
  patterns:
    - PostgreSQL CHECK-Constraints für generische Vorschlags-Tabelle (Lock H)
    - OpenAPI requestBody mit required member_reason + minLength (Lock K)
    - TDD Wave-0 (rote Gerüste vor Implementierung)
    - is_own_proposal als server-berechnetes boolean-Feld (analog can_self_publish)
key_files:
  created:
    - database/migrations/0098_member_suggestions.up.sql
    - database/migrations/0098_member_suggestions.down.sql
    - frontend/src/components/contributions/ContributionInbox.test.tsx
    - frontend/src/components/contributions/ContributionSummary.test.tsx
    - backend/internal/handlers/contributions_me_handler_test.go
    - backend/internal/handlers/suggestions_me_handler_test.go
    - frontend/src/lib/api.test.ts
  modified:
    - shared/contracts/openapi.yaml
    - frontend/src/types/contributions.ts
decisions:
  - "Migrationsnummer 0098 statt geplanter 0097 (0097 durch Phase-72 v12_status_foundation belegt)"
  - "contributions_me_handler_test.go TestRejectContributionRequiresReason schreibt t.Fatal-freie Assert-Zeile als rotes Gerüst (kein Panic-Stop nötig)"
  - "suggestions_me_handler_test.go nutzt t.Fatal('...noch nicht implementiert') als klare Rot-Markierung bis Plan 02/03 fertig ist"
metrics:
  duration: "~30min"
  completed_date: "2026-06-05"
  tasks_completed: 3
  files_changed: 9
---

# Phase 76 Plan 01: Schema-/Contract-/Typ-Fundament + Wave-0-Tests Summary

Migration 0098 legt `member_suggestions`-Tabelle (Lock H: kein FK auf `anime_contributions`/`member_claims`) + additive `member_reason TEXT NULL`-Spalte auf `anime_contributions` an; OpenAPI-Contract dokumentiert POST/GET `/me/suggestions` und erweiterten reject-Endpoint mit Pflicht-`member_reason`; Frontend-Typen und 5 rote Testgerüste fixieren das erwartete Verhalten vor der Implementierung in Plan 02/03.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Migration 0098 — member_suggestions + member_reason | `0d5d9ea9` |
| 2 | OpenAPI-Contract + Frontend-Typen (Lock K) | `a6bc5095` |
| 3 | Wave-0-Testgerüste (5 rote Tests) | `b35ecd68` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migrationsnummer 0097 bereits belegt**
- **Found during:** Task 1
- **Issue:** Plan 01 nennt `0097_member_suggestions`, aber `0097_v12_status_foundation` ist durch Phase 72 belegt (RESEARCH.md Pitfall 1 antizipiert dieses Problem)
- **Fix:** Migrationsnummer auf `0098` angepasst; Dateinamen entsprechend umbenannt
- **Files modified:** `database/migrations/0098_member_suggestions.up.sql`, `database/migrations/0098_member_suggestions.down.sql`
- **Commit:** `0d5d9ea9`

## Verification Results

### TypeScript
- `types/contributions.ts` ohne Fehler (geprüft via `tsc --noEmit`)
- Pre-existing Fehler in anderen Dateien (fehlende node_modules im Worktree) sind nicht durch Plan 01 verursacht

### Go
- `go build ./internal/handlers/...` — sauber, kein Fehler
- `go vet ./internal/handlers/...` — sauber, keine Warnungen

### Tests (Wave-0 — ROT wie erwartet)
- `ContributionInbox.test.tsx` — ROT: `ContributionInbox` existiert noch nicht (Plan 02)
- `ContributionSummary.test.tsx` — ROT: `ContributionSummary` existiert noch nicht (Plan 02)
- `api.test.ts` — ROT: `rejectAnimeContributionWithReason` nicht in api.ts (Plan 02)
- `contributions_me_handler_test.go` — ROT: Handler gibt 200 statt 422 (kein Body-Parsing)
- `suggestions_me_handler_test.go` — ROT: `SuggestionsMeHandler` existiert nicht (Plan 02/03)

### Migration
- Syntaktisch korrekt (go build migrate sauber)
- Live-Ausführung nicht möglich ohne laufende DB (Docker Compose erforderlich)

## Known Stubs

Keine. Plan 01 liefert nur Schema, Contracts, Typen und rote Testgerüste — keine UI-Komponenten mit Placeholder-Daten.

## Threat Flags

Keine neuen Trust-Boundaries außerhalb des `<threat_model>` des Plans.

## Self-Check: PASSED

- `database/migrations/0098_member_suggestions.up.sql` — FOUND
- `database/migrations/0098_member_suggestions.down.sql` — FOUND
- `shared/contracts/openapi.yaml` — modifiziert, FOUND
- `frontend/src/types/contributions.ts` — modifiziert, FOUND
- `frontend/src/components/contributions/ContributionInbox.test.tsx` — FOUND
- `frontend/src/components/contributions/ContributionSummary.test.tsx` — FOUND
- `backend/internal/handlers/contributions_me_handler_test.go` — FOUND
- `backend/internal/handlers/suggestions_me_handler_test.go` — FOUND
- `frontend/src/lib/api.test.ts` — FOUND
- Commits `0d5d9ea9`, `a6bc5095`, `b35ecd68` — vorhanden in git log
