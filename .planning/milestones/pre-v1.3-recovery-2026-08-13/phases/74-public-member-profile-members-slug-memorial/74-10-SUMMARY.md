---
phase: 74-public-member-profile-members-slug-memorial
plan: 10
subsystem: testing
tags: [go, audit, memorial, member-claims, security, coverage]

# Dependency graph
requires:
  - phase: 74-public-member-profile-members-slug-memorial
    provides: Memorial-Schutzkette (Claim-Guards, Memorial-Setter, denied/allowed-Audit)
provides:
  - GAP-6/7 code-level abgeschlossen — Memorial-Schutzkette via go test abgesichert
  - Verhaltenstest D-13 (kein app_user-Account-Eingriff) im Memorial-Handler
  - Outcome-'denied'-Colocation-Test fuer beide Claim-Pfade (D-15)
affects: [member-claims, memorial-profile, audit-logging]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Recorder-Stub fuer Repo-Interface belegt 'kein Account-Eingriff' verhaltensbezogen (D-13)"
    - "Colocation-Source-Assertion bindet Audit-Outcome an den richtigen Event-Block statt datei-weit"

key-files:
  created: []
  modified:
    - backend/internal/handlers/member_memorial_handler_test.go
    - backend/internal/repository/member_claims_memorial_guard_test.go

key-decisions:
  - "Kein Produktionscode geaendert — Re-Audit bestaetigte alle vier Schutzmechanismen als bereits vorhanden und korrekt"
  - "Coverage nur dort ergaenzt, wo eine echte Luecke bestand (D-13-Verhaltenstest, denied-Outcome-Colocation)"

patterns-established:
  - "Pattern: DB-freie Handler-Verhaltenstests via Recorder-Stub am Repo-Interface"

requirements-completed: [J, K, D-10, D-13, D-14, D-15, D-17]

# Metrics
duration: ~20min
completed: 2026-06-08
---

# Phase 74 Plan 10: Memorial-Schutzkette Audit (GAP-6/7) Summary

**Code-only Audit der Memorial-Schutzkette: alle vier Schutzmechanismen als bereits vorhanden bestaetigt, zwei echte Coverage-Luecken (D-13-Verhaltensnachweis, denied-Outcome-Colocation) per Test geschlossen — kein Produktionscode geaendert.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2 (beide auto)
- **Files modified:** 2 (nur Tests)
- **Produktionscode geaendert:** 0 Dateien

## Per-Protection Verdict

| # | Schutzmechanismus | Datei / Zeilen | Verdict |
|---|---|---|---|
| 1 | SubmitClaim lehnt memorial mit HTTP 409 + `memorial_not_claimable` ab | `member_claims_repository.go` Z.122-149 | **PRESENT** |
| 2 | AcceptInvitation (zweiter Pfad) lehnt memorial mit 409 + `memorial_not_claimable` ab | `member_claim_invitations_repository.go` Z.189-215 | **PRESENT** |
| 3 | Beide Pfade schreiben denied-Audit `member_claim.memorial_blocked` / Outcome `denied` | Z.131-143 bzw. Z.198-209 | **PRESENT + ADDED-TEST** (Colocation) |
| 4 | Memorial-Setter Global-Admin-only (`requirePlatformAdminAppUserIdentity`), allowed-Audit `member_profile.memorial_set` | `member_memorial_handler.go` Z.99-152 | **PRESENT** |
| 5 | Kein app_user-Account-Eingriff (D-13); `SetMemorialStatus` schreibt nur `members.profile_status` | `member_memorial_repository.go` Z.43-57 | **PRESENT + ADDED-TEST** (Verhaltensnachweis) |
| 6 | D-10 Mengen-/Gamification-Badge-Suppression bei memorial | `MemberBadgeHighlights.tsx` (Frontend) | **PRESENT** (Frontend, ausserhalb Backend-Scope dieses Plans) |

## Accomplishments

- **Audit Task 1:** Alle vier Backend-Schutzmechanismen Zeile fuer Zeile gegen die Akzeptanzkriterien geprueft. Befund: vollstaendig vorhanden und korrekt. Bestehende Tests (`member_claims_memorial_guard_test.go`, `member_memorial_handler_test.go`) liefen gruen als Baseline.
- **Coverage Task 2:** Zwei nachweisbare Luecken geschlossen:
  - `TestMemorialSetterNoAccountMutation` (Handler): belegt D-13 verhaltensbezogen via Recorder-Stub — der Handler ruft genau einmal `SetMemorialStatus` und einmal `GetMemberProfileStatus` auf, der Repo-Vertrag bietet ueberhaupt keine Account-Mutationsmethode, Response traegt `profile_status='memorial'`, allowed-Audit vorhanden.
  - `TestClaimBlockDeniedAuditOutcomeColocated` (Repository): bindet `Outcome: "denied"` an den `member_claim.memorial_blocked`-Audit-Block beider Claim-Pfade, statt nur datei-weit auf das Literal `denied` zu pruefen (haette ein versehentlich auf `allowed` gesetztes Block-Outcome nicht erkannt).

## Task Commits

1. **Task 1 + Task 2: Audit + Coverage-Luecken geschlossen** - `b7fe709e` (test)

_Hinweis: Da Task 1 keinen Produktionscode aenderte (Audit bestaetigt korrekt), gibt es keinen separaten fix/feat-Commit. Beide Tasks sind im Test-Commit zusammengefasst._

## Files Created/Modified

- `backend/internal/handlers/member_memorial_handler_test.go` (216 Z.) - `TestMemorialSetterNoAccountMutation` + `recordingMemberMemorialRepo`-Stub ergaenzt
- `backend/internal/repository/member_claims_memorial_guard_test.go` (114 Z.) - `TestClaimBlockDeniedAuditOutcomeColocated` ergaenzt

## Decisions Made

- **Kein Produktionscode geaendert:** Der Re-Audit-Befund ("Code bereits vorhanden und korrekt") wurde verifiziert und bestaetigt. Es wurde bewusst NICHT umgebaut/umgeschrieben (Plan-Vorgabe: nur bei nachgewiesenem Defekt fixen).
- **Coverage minimal gehalten:** Nur die im Re-Audit benannten Luecken (D-13-Verhaltensnachweis, denied-Outcome-Colocation) wurden geschlossen, keine Over-Coverage.

## Deviations from Plan

None - Plan exakt wie geschrieben ausgefuehrt. Keine Defekte gefunden, kein Produktionscode geaendert. Standardfall des Re-Audits ("bereits korrekt") hat sich bestaetigt.

## Issues Encountered

- Der erste Entwurf des Colocation-Tests scheiterte, weil `strings.Index` zuerst das EventType-Literal im Erlaeuterungs-Kommentar traf und das 400-Zeichen-Fenster nicht bis zum `Outcome`-Feld reichte. Behoben durch Umstellung auf `strings.LastIndex("EventType:")` (verifiziert: genau ein `EventType:`-Struct-Literal pro Datei). Danach gruen.

## D-10 Frontend-Suppression (Hinweis)

Die Mengen-/Gamification-Badge-Suppression bei memorial-Profilen liegt im Frontend (`MemberBadgeHighlights.tsx`, `isMemorial`-Filter) und ist laut Plan ausserhalb des Backend-Scopes dieses Plans (Wave/Ownership-Trennung). Sie wurde NICHT hier veraendert. Empfehlung fuer ein Frontend-fokussiertes Folge-Plan: einen Vitest-Test ergaenzen, der die Suppression der Gamification-/Mengen-Badge-Kategorien bei `isMemorial=true` absichert, falls noch keiner existiert.

## Verification

```
cd backend && go test ./internal/repository/ ./internal/handlers/ -run "Memorial|Claim"
ok  team4s.v3/backend/internal/repository
ok  team4s.v3/backend/internal/handlers
```

`go build ./...` clean; volle Pakete `./internal/repository/` und `./internal/handlers/` gruen.

## Next Phase Readiness

- GAP-6/7 code-level abgeschlossen und via `go test` abgesichert (keine Seed-/Live-Daten noetig).
- Live-/UAT-Verifikation bleibt erst moeglich, sobald die DB ein memorial-Profil enthaelt — dann sollten beide 409-Pfade und der Setter zusaetzlich live geprueft werden.

## Self-Check: PASSED

- FOUND: backend/internal/handlers/member_memorial_handler_test.go
- FOUND: backend/internal/repository/member_claims_memorial_guard_test.go
- FOUND: commit b7fe709e

---
*Phase: 74-public-member-profile-members-slug-memorial*
*Completed: 2026-06-08*
