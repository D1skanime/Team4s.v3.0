---
phase: 65-member-vorschlaege-review-queue
plan: "03"
subsystem: backend/handlers
tags: [handler, review-queue, permissions, audit, tdd, security]
dependency_graph:
  requires:
    - AnimeContributionsRepository.ListProposedByGroup
    - AnimeContributionsRepository.Confirm
    - AnimeContributionsRepository.Reject
  provides:
    - GET /api/v1/admin/fansubs/:id/contribution-proposals
    - POST /api/v1/admin/fansubs/:id/contribution-proposals/:cid/confirm
    - POST /api/v1/admin/fansubs/:id/contribution-proposals/:cid/reject
  affects:
    - backend/internal/handlers
    - backend/cmd/server
tech_stack:
  added: []
  patterns:
    - ReviewRepository-Interface fuer Stub-Tests (analog Plan 65-02 Interfaces)
    - reviewPermissionChecker-Interface fuer permissions.Service-Stub
    - TDD RED/GREEN: rote Tests vor Handler-Implementierung committed
    - CanForFansubGroup auf allen drei Endpunkten (D-09, IDOR-Schutz)
    - Audit-Log nach Confirm und Reject (D-14)
key_files:
  created:
    - backend/internal/handlers/contribution_review_handler.go
    - backend/internal/handlers/contribution_review_handler_test.go
  modified:
    - backend/cmd/server/main.go
decisions:
  - "reviewPermissionChecker als eigenes Interface extrahiert — permissions.Service implementiert es, Stub-Tests nutzen reviewPermissionSvcStub"
  - "ShouldBindJSON fuer RejectRequest ignoriert leeren Body (kein Fehler) — review_note bleibt nil wenn nicht gesetzt (D-08)"
  - "Routen ausserhalb von registerAdminRoutes registriert (analog Plan 65-02) — reviewHandler direkt verdrahtet, adminRouteHandlers-Struct nicht erweitert"
metrics:
  duration: "~10min"
  completed_date: "2026-06-02"
  tasks_completed: 2
  files_modified: 3
---

# Phase 65 Plan 03: ContributionReviewHandler + Review-Routen Summary

**One-liner:** Neuer ContributionReviewHandler liefert drei Leader/Admin-Review-Endpunkte (ListProposals, ConfirmProposal, RejectProposal) mit vollständiger CanForFansubGroup-Autorisierung und Audit-Attribution für Confirm/Reject-Aktionen; alle acht Tests grün per TDD RED/GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 RED | Rote Tests für ContributionReviewHandler | 8abe35c6 | backend/internal/handlers/contribution_review_handler_test.go |
| 1 GREEN | ContributionReviewHandler — 3 Endpunkte | d137f8d3 | backend/internal/handlers/contribution_review_handler.go |
| 2 | Admin Review-Routen in main.go registriert | f58aa858 | backend/cmd/server/main.go |

## Decisions Made

- **reviewPermissionChecker-Interface:** `permissions.Service` implementiert `CanForFansubGroup` direkt — um Stub-Tests zu ermöglichen, wurde ein schmales Interface `reviewPermissionChecker` definiert (nur `CanForFansubGroup`). Produktionscode übergibt `permissionSvc *permissions.Service`, das dieses Interface erfüllt.
- **ShouldBindJSON für RejectRequest:** Leerer Body / kein Content-Type → `ShouldBindJSON` gibt Fehler zurück, der ignoriert wird; `req.ReviewNote` bleibt `nil`. Kein `400` bei fehlendem Body (D-08: review_note ist optional).
- **Routen-Registrierung außerhalb registerAdminRoutes:** `reviewHandler` wird direkt nach `proposalsMeHandler` registriert (analog Plan 65-02). Die `adminRouteHandlers`-Struct bleibt unverändert.

## What Was Built

### ContributionReviewHandler (215 Zeilen, < 450-Limit)

- **Interfaces:** `ReviewRepository` (ListProposedByGroup, Confirm, Reject), `reviewPermissionChecker` (CanForFansubGroup)
- **ListProposals:** Identity → fansubID → CanForFansubGroup (MembersManage) → auditPermissionDenied bei 403 → ListProposedByGroup → 200 + {data: [...]}
- **ConfirmProposal:** Identity → fansubID + cid → CanForFansubGroup → Confirm (ErrNotFound→404) → Audit 'anime_contribution.confirmed' → 200 + {message: "Vorschlag wurde bestätigt."}
- **RejectProposal:** Identity → fansubID + cid → CanForFansubGroup → ShouldBindJSON (optional) → Reject (ErrNotFound→404) → Audit 'anime_contribution.rejected' mit has_note-Payload → 200 + {message: "Vorschlag wurde abgelehnt."}

### Tests (309 Zeilen, < 450-Limit)

- 8 Tests, alle grün
- `reviewRepoStub`, `reviewPermissionSvcStub`, `auditReviewStub` als Inline-Stubs
- `setReviewTestAuth` setzt UserID > 0 (Legacy-Pflichtfeld)

### main.go (4 Zeilen hinzugefügt)

- `reviewHandler` nach `groupHistoryHandler` instanziiert
- 3 neue Admin-Routen: GET + POST /confirm + POST /reject

## Deviations from Plan

Keine. Plan exakt wie beschrieben implementiert.

## Threat Surface Scan

Neue Netzwerkendpunkte wurden eingeführt:

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-endpoint | contribution_review_handler.go | GET /admin/fansubs/:id/contribution-proposals — T-65-03-01 (CanForFansubGroup) mitigiert |
| threat_flag: new-endpoint | contribution_review_handler.go | POST .../confirm — T-65-03-01 (CanForFansubGroup), T-65-03-02 (IDOR via fansubID-Prüfung), T-65-03-04 (Audit) mitigiert |
| threat_flag: new-endpoint | contribution_review_handler.go | POST .../reject — T-65-03-01, T-65-03-02, T-65-03-04, T-65-03-05 (kein Hard-Delete) mitigiert |

Alle Threats aus dem Plan-Threat-Register sind adressiert.

## Known Stubs

Keine. Alle Endpunkte delegieren an echte Repository-Methoden (aus Plan 65-01).

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED | 8abe35c6 | test(65-03) — 8 rote Tests (build failed wegen undefined ContributionReviewHandler) |
| GREEN | d137f8d3 | feat(65-03) — 8 Tests grün |

## Self-Check: PASSED

- [x] backend/internal/handlers/contribution_review_handler.go existiert (215 Zeilen < 450)
- [x] backend/internal/handlers/contribution_review_handler_test.go existiert (309 Zeilen < 450)
- [x] go test ./internal/handlers/ -run "TestListProposals|TestConfirmProposal|TestRejectProposal" → 8/8 grün
- [x] go build ./cmd/server/ → erfolgreich
- [x] grep "CanForFansubGroup" contribution_review_handler.go → 7 Treffer (≥ 3)
- [x] grep "auditLogRepo.Write" contribution_review_handler.go → 2 Treffer (≥ 2)
- [x] grep "contribution-proposals" backend/cmd/server/main.go → 4 Zeilen (3 Admin-Routen + 1 Me-Route aus Plan 65-02)
- [x] Commit 8abe35c6 existiert (RED)
- [x] Commit d137f8d3 existiert (GREEN)
- [x] Commit f58aa858 existiert (Task 2)
- [x] Keine ASCII-Umlaut-Ersetzungen in deutschen Strings (ä, ö, ü, ß korrekt)
- [x] CanForFansubGroup auf allen drei Endpunkten (IDOR-Schutz T-65-03-02)
- [x] Reject: kein Hard-Delete, status='disputed' via Repository (T-65-03-05)
