---
phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
plan: "03"
subsystem: auth
tags: [go, postgresql, permissions, authorization, review, transactions]

requires:
  - phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus
    provides: Additive Review-Foundation mit drei Actions und direkten Membership-Grants aus Plan 107-02
provides:
  - Drei typisierte Review-Actions in der bestehenden Permission Engine
  - Fail-closed direkte Review-Autorisierung mit aktiver, verifizierter Same-Group-Member-Identität
  - Tx-bindbares AuthzRepository und membership-unabhängige verified Actor-Member-Auflösung
affects: [107-04, 107-05, 107-06, 107.1-release-pruefworkspace]

tech-stack:
  added: []
  patterns:
    - Separates ReviewContextResolver-Zusatzinterface bei unverändertem permissions.Resolver
    - Fokussiertes AuthzDBTX für identische Pool- und pgx.Tx-Lesepfade
    - Membership-Row-Lock vor Rollen- oder Direct-Grant-Entscheidung

key-files:
  created: []
  modified:
    - backend/internal/permissions/permissions.go
    - backend/internal/permissions/permissions_test.go
    - backend/internal/permissions/capability_registry_test.go
    - backend/internal/permissions/permissions_reload_test.go
    - backend/internal/repository/authz.go
    - backend/internal/repository/authz_permissions.go
    - backend/internal/repository/authz_permissions_test.go

key-decisions:
  - "Der etablierte permissions.Resolver bleibt unverändert; nur Review-Actions verlangen per exakter Type Assertion den separaten ReviewContextResolver."
  - "Jeder Nicht-Plattform-Reviewpfad, einschließlich fansub_lead, erhält MembershipID und MemberID aus demselben aktiv-verifizierten, gesperrten Gruppenmitgliedschaftskontext."
  - "Self-Review-Identität wird unabhängig von Gruppenmitgliedschaften ausschließlich aus allen verified member_claims des Actors aufgelöst."

patterns-established:
  - "CanForFansubGroup delegiert ausschließlich die drei review.*.decide-Actions an CanReviewForFansubGroup; alle bisherigen Actions behalten ihren bestehenden Pfad."
  - "AuthzRepository.WithDB bindet Caller-Transaktionen ohne Begin, Commit, Rollback oder Lifecycle-Ownership im Repository."

requirements-completed: [P107-SC1, P107-SC3, P107-SC6]

duration: 12min
completed: 2026-07-23
---

# Phase 107 Plan 03: Typisierte Review-Autorisierung Summary

**Drei getrennte Review-Capabilities nutzen jetzt die bestehende Permission Engine mit gesperrter Same-Group-Member-Identität, exakten Direct Grants und tx-gebundener Authz-Auflösung.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-23T13:55:43Z
- **Completed:** 2026-07-23T14:08:01Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `review.text.decide`, `review.image.decide` und `review.contribution.decide` sind getrennte bekannte Actions, werden `fansub_lead` gewährt und bleiben für direkte Grants strikt unabhängig.
- `CanReviewForFansubGroup` hält den globalen, memberlosen `platform_admin`-Bypass aufrecht; alle anderen Reviewer benötigen denselben aktiven, verifizierten Membership-/Member-Kontext.
- Das bestehende `permissions.Resolver`-Interface blieb unverändert, sodass vorhandene Handler- und Test-Stubs ohne Phase-107-Methode weiter kompilieren.
- `AuthzRepository` arbeitet über ein fokussiertes `AuthzDBTX` identisch mit Pool und Caller-`pgx.Tx`, sperrt die Membership `FOR SHARE` und besitzt keinen Transaktions-Lifecycle.
- `ResolveVerifiedActorMemberIDs` liefert für jeden Actor alle verified Member-Claims deterministisch und ohne Join oder Statusfilter auf `fansub_group_members`.

## Task Commits

TDD-Aufgaben wurden mit getrennten RED- und GREEN-Commits ausgeführt:

1. **Task 1 RED: Review-Permission-Verträge** - `2e9203e1` (test)
2. **Task 1 GREEN: Typisierte direkte Review-Autorisierung** - `2e6d261c` (feat)
3. **Task 2 RED: AuthzRepository-Verträge** - `93ea28f4` (test)
4. **Task 2 GREEN: Tx-gebundene Authz- und Identity-Auflösung** - `4c87a228` (feat)

**Plan metadata:** committed with this summary.

## Files Created/Modified

- `backend/internal/permissions/permissions.go` - Definiert drei Review-Actions, das separate ReviewContextResolver-Interface und die fokussierte Review-Autorisierung.
- `backend/internal/permissions/permissions_test.go` - Prüft Fansub-Lead, exakte Direct Grants, nicht-transitive Rechte, Plattform-Bypass und Resolver-Kompatibilität.
- `backend/internal/permissions/capability_registry_test.go` - Erweitert den bekannten Katalog und beweist fail-closed Vollständigkeit ohne platform_admin-Rollenzeile.
- `backend/internal/permissions/permissions_reload_test.go` - Hält den bestehenden vollständigen Cache-Fixture mit den drei neuen Pflichtaktionen synchron.
- `backend/internal/repository/authz.go` - Führt `AuthzDBTX` und `WithDB` ein, ohne den bestehenden Konstruktor-Aufrufpfad zu brechen.
- `backend/internal/repository/authz_permissions.go` - Lädt gesperrte aktive Review-Kontexte und membership-unabhängige verified Actor-Member-IDs.
- `backend/internal/repository/authz_permissions_test.go` - Enthält die fünf exakt benannten DB-backed Phase-107-Verträge.

## Decisions Made

- Eine direkte Review-Action ist keine Rolle und impliziert weder eine andere Review-Art noch `fansub_group.members.manage`.
- Der Review-Kontext bleibt auch ohne Direct Grant vorhanden, damit `fansub_lead` dieselbe serveraufgelöste Member-Identität für spätere Review-Credits verwendet.
- Plattform-Admins erhalten ihre globale Review-Erlaubnis weiterhin vor Membership-Auflösung und liefern dabei bewusst MembershipID/MemberID `0`; die separate Self-Review-Identitätsauflösung bleibt für den späteren ReviewService verfügbar.
- Permission- und Identity-Reads schreiben absichtlich keine Auditzeile.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Bestehenden vollständigen Cache-Fixture um neue Pflichtaktionen ergänzt**
- **Found during:** Task 1 (Drei Review-Actions in der zentralen Permission Engine auswerten)
- **Issue:** `permissions_reload_test.go` modellierte einen vollständigen Cache, enthielt aber die drei neuen `allKnownActions` noch nicht. Der korrekte fail-closed LoadCache-Check ließ dadurch die vollständige betroffene Testsuite scheitern.
- **Fix:** Ausschließlich die drei neuen Review-Actions wurden dem vorhandenen Fansub-Lead-Fixture hinzugefügt.
- **Files modified:** `backend/internal/permissions/permissions_reload_test.go`
- **Verification:** `go test ./internal/permissions ./internal/repository -count=1`, die vollständige Backend-Suite und `go vet ./...` sind grün.
- **Committed in:** `2e6d261c`

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** Die Korrektur hält einen bestehenden Test-Fixture mit dem erweiterten Pflichtkatalog synchron; Produktionsscope und Autorisierungsarchitektur bleiben unverändert.

## Issues Encountered

None.

## Verification

- Fokussierter Task-1-Gate: `go test ./internal/permissions ./internal/repository -run 'TestPhase107.*(ReviewAction|PermissionCatalog|PlatformAdmin|DirectGrant|ResolverCompatibility)' -count=1` - PASS.
- Exakt benannte Task-2-Tests wurden vor Ausführung vollständig aufgelistet und anschließend gegen eine disposable PostgreSQL-16-Datenbank ausgeführt - 5/5 PASS.
- Live-Wiederholung: `go test ./internal/permissions ./internal/repository -run 'TestPhase107' -count=10` - PASS.
- Vollständige betroffene Pakete: `go test ./internal/permissions ./internal/repository -count=1` - PASS.
- Vollständiges Backend: `go test ./...` - PASS.
- Statische Prüfung: `go vet ./...` - PASS.
- Commit-Range-`git diff --check` und `git show --check` für alle vier Task-Commits - PASS.
- Keine Handler-, UI-, Contract-, Domainadapter- oder Phase-107.1-Datei wurde verändert.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 107-04 kann Grant/Revoke-Mutationen gegen dieselbe Membership-Lock-Reihenfolge implementieren.
- Plan 107-06 kann `AuthzRepository.WithDB(tx)`, `CanReviewForFansubGroup` und `ResolveVerifiedActorMemberIDs` im atomaren ReviewService verwenden.
- Es bestehen keine offenen Blocker; Plattform-Admin-, Same-Group-, Claim-, Status- und No-Audit-Grenzen sind real PostgreSQL-verifiziert.

## Self-Check: PASSED

- Alle sieben Implementierungs-/Testdateien und diese Summary existieren.
- Die vier Task-Commits `2e9203e1`, `2e6d261c`, `93ea28f4` und `4c87a228` sind in der Git-Historie vorhanden.
- `grep.exe.stackdump` blieb unverändert und Phase 107.1 wurde nicht berührt.

---
*Phase: 107-best-tigung-delegation-und-ablehnungslebenszyklus*
*Completed: 2026-07-23*
