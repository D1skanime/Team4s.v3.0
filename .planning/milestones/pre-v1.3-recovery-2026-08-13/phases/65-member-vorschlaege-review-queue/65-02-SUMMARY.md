---
phase: 65-member-vorschlaege-review-queue
plan: "02"
subsystem: backend/handlers
tags: [handler, proposals, self-publish, memberships, tdd, security]
dependency_graph:
  requires:
    - migration-0089-review-note
    - AnimeContributionsRepository.CreateProposal
    - AnimeContributionsRepository.SelfPublish
    - AnimeContributionsRepository.ListByMemberIDWithProposalFields
  provides:
    - POST /api/v1/me/contribution-proposals
    - POST /api/v1/me/anime-contributions/:id/self-publish
    - GET /api/v1/me/memberships
    - ListMyAnimeContributions-mit-ProposalFields (can_self_publish + review_note)
  affects:
    - backend/internal/handlers
    - backend/cmd/server
tech_stack:
  added: []
  patterns:
    - Interface-Abstraktion fuer DB-Operationen (MemberResolver, OwnershipChecker, MembershipsLister)
    - TDD RED/GREEN mit Stub-Interfaces statt DB-Mocks
    - Delegations-Muster: Handler delegiert 90-Tage-Check vollstaendig an Repository (D-11)
    - Additive Routen-Registrierung in main.go (plan-uebergreifend sauber erweiterbar)
key_files:
  created:
    - backend/internal/handlers/contribution_proposals_me_handler.go
    - backend/internal/handlers/contribution_proposals_me_test.go
  modified:
    - backend/internal/handlers/contributions_me_handler.go
    - backend/cmd/server/main.go
decisions:
  - "MemberResolver/OwnershipChecker/MembershipsLister als Interfaces extrahiert — ermoeglicht Stub-Tests ohne DB-Verbindung ohne architekturellen Umbau"
  - "ListByMemberIDWithProposalFields gibt MemberContributionWithProposalRow zurueck (nicht AnimeContributionRow) — Plan-Text war ungenau, korrekte Signatur aus Plan 65-01 verwendet"
  - "SelfPublish delegiert Status-Verwaltung vollstaendig an Repository — Handler schreibt kein 'confirmed' (D-11, D-15, T-65-02-04)"
  - "AUTH-Guard-Test: UserID muss > 0 sein (Pflichtfeld in CommentAuthIdentityFromContext) — Tests setzen UserID=AppUserID als Legacy-Bridge"
metrics:
  duration: "~5min"
  completed_date: "2026-06-02"
  tasks_completed: 3
  files_modified: 4
---

# Phase 65 Plan 02: ContributionProposalsMeHandler + Me-Routen Summary

**One-liner:** Neuer ContributionProposalsMeHandler liefert CreateProposal (Auth+Ownership+Duplikat-Schutz+Audit), SelfPublish (90-Tage-Delegation an Repository, Status bleibt 'proposed') und ListMemberships; contributions_me_handler.go umgestellt auf ListByMemberIDWithProposalFields fuer can_self_publish und review_note im Dashboard.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ListByMemberIDWithProposalFields verdrahten | aa4447f0 | backend/internal/handlers/contributions_me_handler.go |
| 2 RED | Rote Tests fuer ContributionProposalsMeHandler | 8a6e0694 | backend/internal/handlers/contribution_proposals_me_test.go |
| 2 GREEN | ContributionProposalsMeHandler + Handler-Datei | a43bb387 | backend/internal/handlers/contribution_proposals_me_handler.go (+test-fix) |
| 3 | main.go Routen-Registrierung | cf05cf99 | backend/cmd/server/main.go |

## Decisions Made

- **Interface-Abstraktion statt direkter DB-Abhaengigkeit:** `MemberResolver`, `OwnershipChecker` und `MembershipsLister` als Interfaces im Handler-File definiert. Ermoeglicht vollstaendige Stub-Tests ohne DB-Verbindung — wichtig da ContributionsMeHandler direkt `pgxpool.Pool` nutzt und nicht testbar ist. Deviaition Rule 2 (fehlende Testbarkeit = Korrektheitsproblem).
- **MemberContributionWithProposalRow (nicht AnimeContributionRow):** `ListByMemberIDWithProposalFields` gibt einen anderen Typ zurueck als der Plan-Text andeutete. Der Handler akzeptiert das korrekt — Rueckgabetyp ist kompatibel mit `gin.H{"data": items}`.
- **TDD Gate-Sequenz eingehalten:** RED-Commit (8a6e0694) vor GREEN-Commit (a43bb387); alle 11 Tests gruen.
- **AUTH-Guard-Korrektur:** `CommentAuthIdentityFromContext` prueft `UserID > 0` als Legacy-Pflichtfeld. Tests mussten `UserID: appUserID` setzen — kein Architektur-Problem, nur Test-Konvention.

## What Was Built

### Task 1: contributions_me_handler.go — ListByMemberIDWithProposalFields
- Einzeilige Aenderung: `ListByMemberID` → `ListByMemberIDWithProposalFields`
- JSON-Response enthaelt jetzt `can_self_publish` und `review_note` (P65-SC3, D-08, D-12)

### Task 2: ContributionProposalsMeHandler (393 Zeilen, < 450-Limit)
- **Interfaces:** `ProposalRepository`, `RolesRepository`, `MemberResolver`, `OwnershipChecker`, `MembershipsLister`
- **DB-Implementierungen:** `dbMemberResolver`, `dbOwnershipChecker`, `dbMembershipsLister` — kapseln alle pgxpool.Pool-Aufrufe
- **CreateProposal:** requireMeIdentity → min-1-Rollen-Check (D-04, 422) → resolveVerifiedMemberID → Ownership-Check via OwnershipChecker (D-03, 403) → Rollenvalidierung → proposalRepo.CreateProposal (ErrConflict→409 mit Umlaut-Text D-05) → Audit "anime_contribution.proposed" (D-14)
- **SelfPublish:** requireMeIdentity → Parse contributionId → resolveVerifiedMemberID → Ownership-Check → proposalRepo.SelfPublish (ErrConflict→409 "90 Tage") → Audit "anime_contribution.self_published"; KEIN direkter Status-Write (D-11, D-15, T-65-02-04)
- **ListMemberships:** requireMeIdentity → resolveVerifiedMemberID → membershipsLister.ListMembershipsForMember → 200 + {data: [MembershipEntry]}
- **Tests (386 Zeilen, < 450-Limit):** 11 Tests gruen; alle P65-SC1 und P65-SC3 Behaviors abgedeckt

### Task 3: main.go Routen-Registrierung
- `proposalsMeHandler` nach Zeile 385 eingefuegt
- 3 neue Routen: GET /me/memberships, POST /me/contribution-proposals, POST /me/anime-contributions/:contributionId/self-publish
- Bestehende Routen unveraendert; Plan 65-03 kann Zeile 392+ addieren

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Fehlende Testbarkeit] Interface-Abstraktion fuer DB-Operationen**
- **Found during:** Task 2 — Analyse der Testbarkeit
- **Issue:** `resolveVerifiedMemberID` und Ownership-Checks erfordern direkte `pgxpool.Pool`-Aufrufe, die in Unit-Tests nicht stubbbar sind ohne Interface-Schicht
- **Fix:** `MemberResolver`, `OwnershipChecker`, `MembershipsLister` als Interfaces extrahiert; `dbMemberResolver`, `dbOwnershipChecker`, `dbMembershipsLister` als DB-Implementierungen; Tests nutzen Stubs
- **Files modified:** contribution_proposals_me_handler.go (Interfaces + DB-Impl), contribution_proposals_me_test.go (Stubs)
- **Commit:** a43bb387

**2. [Rule 1 - Bug] AUTH-Guard-Korrektur in Tests**
- **Found during:** Task 2 GREEN — Testlauf mit UserID=0
- **Issue:** `CommentAuthIdentityFromContext` prueft `identity.UserID > 0` — Tests mit `UserID: 0` loesten 401 aus
- **Fix:** `setTestAuthIdentity` setzt `UserID: appUserID` als Legacy-Bridge neben `AppUserID`
- **Files modified:** contribution_proposals_me_test.go
- **Commit:** a43bb387 (im selben Task-Commit)

**3. [Rule 1 - Abweichung Rueckgabetyp] MemberContributionWithProposalRow statt AnimeContributionRow**
- **Found during:** Task 1 — Pruefung der Signatur von `ListByMemberIDWithProposalFields`
- **Issue:** Plan-Text schrieb "Der Rueckgabetyp ist identisch ([]AnimeContributionRow)" — tatsaechlich gibt Plan 65-01 `[]MemberContributionWithProposalRow` zurueck
- **Fix:** Handler akzeptiert den korrekten Typ; `gin.H{"data": items}` serialisiert `MemberContributionWithProposalRow` korrekt mit `can_self_publish` und `review_note`
- **Files modified:** contributions_me_handler.go (einzeilig)
- **Commit:** aa4447f0

## Threat Surface Scan

Neue Netzwerkendpunkte wurden eingeführt:

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-endpoint | contribution_proposals_me_handler.go | POST /me/contribution-proposals — T-65-02-01 bis T-65-02-05 per Plan-Threat-Register mitigiert |
| threat_flag: new-endpoint | contribution_proposals_me_handler.go | POST /me/anime-contributions/:id/self-publish — T-65-02-03, T-65-02-04 mitigiert |
| threat_flag: new-endpoint | contribution_proposals_me_handler.go | GET /me/memberships — T-65-02-06 akzeptiert (nur eigene Daten) |

Alle drei Endpunkte sind durch `authMiddleware` gesichert und erfordern einen verifizierten Member-Account (`resolveVerifiedMemberID`). Threat-Register aus Plan 65-02 vollstaendig implementiert.

## Known Stubs

Keine. Alle Endpunkte liefern echte Daten aus der DB; kein Placeholder-Text oder hartcodierte Arrays in Produktionspfaden.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | 8a6e0694 | test(65-02) — 11 rote Tests |
| GREEN | a43bb387 | feat(65-02) — 11 Tests gruen |

## Self-Check: PASSED

- [x] backend/internal/handlers/contribution_proposals_me_handler.go existiert (393 Zeilen < 450)
- [x] backend/internal/handlers/contribution_proposals_me_test.go existiert (386 Zeilen < 450)
- [x] backend/internal/handlers/contributions_me_handler.go — ListByMemberIDWithProposalFields auf Zeile 93
- [x] backend/cmd/server/main.go — GET /me/memberships, POST /me/contribution-proposals, POST /me/anime-contributions/:contributionId/self-publish registriert
- [x] go build ./cmd/server/ gruen
- [x] go test ./internal/handlers/ -run "TestCreateProposal|TestSelfPublish|TestListMemberships" → 11 Tests gruen
- [x] Commit aa4447f0 existiert (Task 1)
- [x] Commit 8a6e0694 existiert (Task 2 RED)
- [x] Commit a43bb387 existiert (Task 2 GREEN)
- [x] Commit cf05cf99 existiert (Task 3)
- [x] SelfPublish-Handler schreibt kein status='confirmed'
- [x] Alle deutschen Fehlermeldungen mit korrekten Umlauten (ä, ö, ü, ß)
