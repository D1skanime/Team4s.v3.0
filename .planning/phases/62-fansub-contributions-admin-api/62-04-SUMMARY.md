---
phase: 62-fansub-contributions-admin-api
plan: "04"
subsystem: backend-handlers
tags: [contributions, public-routes, me-routes, fansub, member]
dependency_graph:
  requires: [62-02, 62-03]
  provides: [contributions-public-handler, contributions-me-handler, public-routes, me-routes]
  affects: [main.go, anime_contributions_repository, hist_group_member_roles_repository]
tech_stack:
  added: []
  patterns: [gin-handler, repository-injection, ownership-check, member-claims]
key_files:
  created:
    - backend/internal/handlers/contributions_public_handler.go
    - backend/internal/handlers/contributions_me_handler.go
  modified:
    - backend/cmd/server/main.go
    - backend/internal/repository/anime_contributions_repository.go
    - backend/internal/repository/hist_group_member_roles_repository.go
decisions:
  - Repo-Methoden ListByMemberID statt Inline-Queries im Handler (Trennung DB-Logik)
  - ContributionsMeHandler erhält groupRolesRepo zusaetzlich zur contributionsRepo
metrics:
  duration: ~20min
  completed: "2026-06-01"
  tasks_completed: 2
  files_changed: 5
---

# Phase 62 Plan 04: Public- und Me-Contributions-Handler Summary

**One-liner:** Public Contributions-Endpunkte (3 Routes ohne Auth) und Me-Routen (4 Routes mit Auth + Ownership-Check) via ContributionsPublicHandler und ContributionsMeHandler.

## Was wurde gebaut

### Task 1: ContributionsPublicHandler

Neue Datei `backend/internal/handlers/contributions_public_handler.go` mit:

- `GetFansubContributions` — GET /api/v1/fansubs/:id/contributions, kein Auth, nutzt `ListPublicByFansub` (is_public_on_anime_page + visibility='public')
- `GetAnimeContributions` — GET /api/v1/anime/:id/contributions, kein Auth, nutzt `ListPublicByAnime`
- `GetMemberContributions` — GET /api/v1/members/:slug/contributions, kein Auth, nutzt `ListPublicByMemberSlug`
- Leeres Array (nicht 404) wenn keine Eintraege gefunden
- 74 Zeilen (weit unter 450-Limit)

### Task 2: ContributionsMeHandler + Verdrahtung

Neue Datei `backend/internal/handlers/contributions_me_handler.go` mit:

- `resolveVerifiedMemberID` — prueft `member_claims.claim_status = 'verified'`; gibt 404 zurueck wenn kein Claim
- `ListMyAnimeContributions` — GET /api/v1/me/anime-contributions, nutzt `AnimeContributionsRepository.ListByMemberID`
- `ListMyGroupContributions` — GET /api/v1/me/group-contributions, nutzt `HistGroupMemberRolesRepository.ListByMemberID`
- `UpdateMyAnimeContributionVisibility` — PATCH mit Ownership-Check (403 bei fremden Eintraegen)
- `UpdateMyGroupContributionVisibility` — PATCH mit Ownership-Check, validiert visibility-Wert ('public'/'internal')
- 263 Zeilen (unter 450-Limit)

Repository-Erweiterungen:
- `AnimeContributionsRepository.ListByMemberID` — member-gefilterte Contributions (LIMIT 50)
- `HistGroupMemberRolesRepository.ListByMemberID` — member-gefilterte Gruppen-Rollen (LIMIT 50)

main.go Verdrahtung:
- 3 oeffentliche Routen ohne authMiddleware
- 4 Me-Routen mit authMiddleware

## Deviations from Plan

### Auto-added: groupRolesRepo im Constructor

Die Plan-Spezifikation sah nur `(contributionsRepo, db)` vor. Tatsaechlich wurde `(contributionsRepo, groupRolesRepo, db)` verwendet, damit `ListMyGroupContributions` eine saubere Repository-Methode (`ListByMemberID`) aufrufen kann statt Inline-SQL. Entspricht der bevorzugten Plan-Empfehlung ("Repo-Methode bevorzugt").

## Security Mitigations (Threat Model)

| Threat ID | Status | Massnahme |
|-----------|--------|-----------|
| T-62-10 | mitigiert | Public-Routen delegieren direkt an ListPublic*-Methoden mit eingebautem is_public_on_anime_page/is_public_on_member_profile-Filter |
| T-62-11 | mitigiert | Ownership-Check in UpdateMy*Visibility: hfgm.member_id wird gegen eingeloggten memberID geprueft; 403 bei Mismatch |
| T-62-12 | mitigiert | resolveVerifiedMemberID filtert explizit auf claim_status='verified' |
| T-62-13 | akzeptiert | Nur is_public_on_member_profile=true-Daten; MVP-Design |

## Known Stubs

Keine. Alle Endpunkte delegieren direkt an echte Repository-Methoden mit echten SQL-Abfragen.

## Self-Check: PASSED

- contributions_public_handler.go: vorhanden (74 Zeilen)
- contributions_me_handler.go: vorhanden (263 Zeilen)
- anime_contributions_repository.go: ListByMemberID hinzugefuegt
- hist_group_member_roles_repository.go: ListByMemberID hinzugefuegt
- main.go: alle 7 Routen registriert
- go build ./... laeuft fehlerfrei
