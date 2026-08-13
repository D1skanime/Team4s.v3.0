---
phase: 64-fansub-contributions-member-dashboard-public-pages
plan: "01"
subsystem: backend
tags: [badges, repository, service, handler, gin]
dependency_graph:
  requires:
    - "Phase 61 (member_badges-Tabelle via Migration 0087)"
    - "Phase 62 (hist_fansub_group_members, hist_group_member_roles, member_claims)"
  provides:
    - "BadgeRepository: UpsertMemberBadge, SetBadgeVisibility, GetMemberBadges, ResolveMemberIDForAppUser"
    - "BadgeService: ComputeAndStoreBadges (founding_member, historical_leader, long_term_member)"
    - "PATCH /api/v1/me/badges/:badgeId/visibility"
  affects:
    - "backend/cmd/server/main.go"
tech_stack:
  added: []
  patterns:
    - "Repository-Konstruktor NewX(db *pgxpool.Pool)"
    - "Service-Schicht mit geloggten Nicht-kritischen-Fehlern"
    - "Gin-Handler mit Auth-Identity aus middleware.CommentAuthIdentityFromContext"
key_files:
  created:
    - backend/internal/repository/badge_repository.go
    - backend/internal/services/badge_service.go
    - backend/internal/handlers/member_badges_handler.go
  modified:
    - backend/cmd/server/main.go
decisions:
  - "Tabellennamen korrigiert: Plan referenzierte fansub_group_members/fansub_group_member_roles, tatsaechlich existieren hist_fansub_group_members/hist_group_member_roles (Phase-62-Schema)"
  - "ResolveMemberIDForAppUser im BadgeRepository statt duplizierter DB-Pool-Logik im Handler"
  - "BadgeService-Fehler werden geloggt aber nicht propagiert (Contribution-Save soll nicht fehlschlagen)"
  - "BadgeService-Instanz in main.go mit _ zugewiesen (Vorbereitung fuer Integration in Contribution-Handler)"
metrics:
  duration: "12min"
  completed: "2026-06-02"
  tasks: 2
  files: 4
---

# Phase 64 Plan 01: Backend Badge-Service und member_badges-Befüllung — Summary

Backend Badge-Service mit drei abgeleiteten Badges (founding_member, historical_leader, long_term_member) und PATCH-Endpoint für Member-Sichtbarkeitssteuerung via SQL-Ownership-Prüfung.

## Tasks

| Task | Name | Commit | Dateien |
|------|------|--------|---------|
| 1 | BadgeRepository und BadgeService | 178ad98b | badge_repository.go, badge_service.go |
| 2 | Badge-Sichtbarkeits-Endpoint und DI-Integration | 0d72883d | member_badges_handler.go, main.go |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Falsche Tabellennamen im Plan**
- **Found during:** Task 1
- **Issue:** Plan.md referenzierte `fansub_group_members` und `fansub_group_member_roles` in den Badge-SQL-Queries. Die tatsächlichen Tabellen aus Phase 62 heißen `hist_fansub_group_members` und `hist_group_member_roles`.
- **Fix:** Alle SQL-Queries im BadgeService verwenden die korrekten Tabellennamen.
- **Files modified:** backend/internal/services/badge_service.go

## Known Stubs

Keine. BadgeService ist vollständig implementiert, wird aber noch nicht von Contribution-Handlern aufgerufen. Die Integration ist als Vorbereitung in main.go registriert (`_ = services.NewBadgeService(...)`). Folge-Pläne dieser Phase verdrahten den Service mit Contribution-Speicher-Events.

## Threat Surface Scan

Keine neuen unerwarteten Trust-Boundaries. T-64-01-01 (SQL WHERE id=$1 AND member_id=$2) und T-64-01-02 (Enum-Validierung im Handler) sind plangemäß implementiert.

## Self-Check: PASSED

- backend/internal/repository/badge_repository.go: FOUND
- backend/internal/services/badge_service.go: FOUND
- backend/internal/handlers/member_badges_handler.go: FOUND
- Commit 178ad98b: FOUND
- Commit 0d72883d: FOUND
