---
phase: 62-fansub-contributions-admin-api
plan: "03"
subsystem: backend/handlers
tags: [admin-api, fansub, contributions, gin, handlers]
dependency_graph:
  requires: [62-01, 62-02]
  provides: [admin-api-endpoints-62]
  affects: [backend/cmd/server/main.go, backend/cmd/server/admin_routes.go]
tech_stack:
  added: []
  patterns: [gin-handler, dependency-injection, role-code-validation]
key_files:
  created:
    - backend/internal/handlers/fansub_hist_group_members_handler.go
    - backend/internal/handlers/fansub_hist_group_member_roles_handler.go
    - backend/internal/handlers/fansub_group_history_handler.go
    - backend/internal/handlers/fansub_anime_contributions_handler.go
  modified:
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
decisions:
  - "Neue Handler als eigenständige Structs implementiert (nicht als Methoden auf FansubHandler), um Dependency-Grenzen klar zu halten"
  - "Auth-Prüfung via Middleware in admin_routes.go — kein requireAdmin()-Aufruf in neuen Handlern nötig"
  - "FansubAnimeContributionsHandler erhält rolesRepo als zweite Dependency für role_code-Validierung"
  - "adminRouteHandlers-Struct erweitert statt flatten in main.go, um Konsistenz mit bestehendem Muster zu wahren"
metrics:
  duration: "~20min"
  completed: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 2
---

# Phase 62 Plan 03: Admin Handler für Fansub Contributions — Summary

**One-liner:** Vier neue Gin-Handler für group-members, member-roles, history und anime-contributions mit role_code-Kontextvalidierung (422) und vollständiger Route-Verdrahtung in main.go.

## Was wurde gebaut

### Task 1: Handler für group-members, member-roles und history

**fansub_hist_group_members_handler.go** (165 Zeilen)
- `FansubHistGroupMembersHandler` mit `HistGroupMembersRepository`
- `ListHistGroupMembers`, `CreateHistGroupMember` (409 bei Duplikat), `UpdateHistGroupMember`, `DeleteHistGroupMember` (204 bei Erfolg)
- Alle Methoden: `parseFansubID`, `badRequest`/`internalError`, `gin.H`-Antworten

**fansub_hist_group_member_roles_handler.go** (197 Zeilen)
- `FansubHistGroupMemberRolesHandler` mit `HistGroupMemberRolesRepository`
- `ListHistGroupMemberRoles` (erfordert `?member_id=N`), `CreateHistGroupMemberRole` (422 bei unbekanntem role_code im `group_history`-Kontext), `UpdateHistGroupMemberRole`, `DeleteHistGroupMemberRole`

**fansub_group_history_handler.go** (158 Zeilen)
- `FansubGroupHistoryHandler` mit `FansubGroupHistoryRepository`
- `ListGroupHistory`, `CreateGroupHistory` (422 bei ungültigem event_type), `UpdateGroupHistory`
- Erlaubte event_type-Werte: `founding`, `disbanding`, `hiatus`, `rebranding`, `milestone`, `other`

### Task 2: Anime-Contributions-Handler und Verdrahtung in main.go

**fansub_anime_contributions_handler.go** (213 Zeilen)
- `FansubAnimeContributionsHandler` mit zwei Repos: `AnimeContributionsRepository` + `HistGroupMemberRolesRepository`
- `parseAnimeIDParam` Hilfsfunktion analog zu `parseFansubID`
- `ListAnimeContributions`, `CreateAnimeContribution` (422 pro ungültigem role_code im `anime_contribution`-Kontext), `UpdateAnimeContribution` (role_code-Revalidierung wenn gesetzt), `DeleteAnimeContribution`

**admin_routes.go**: 15 neue Routen unter `/admin/fansubs/:id/...`:
- 4x group-members, 4x member-roles, 3x history, 4x contributions
- Alle unter dem bestehenden `auth`-Middleware-Argument

**main.go**: 4 neue Repo-Instanziierungen + 4 neue Handler-Instanziierungen, übergeben an `registerAdminRoutes` via erweitertem `adminRouteHandlers`-Struct.

## Verifikation

- `go build ./...` im backend-Verzeichnis: kein Fehler
- `grep -c "group-members" backend/cmd/server/admin_routes.go` → 4
- `grep -c "member-roles" backend/cmd/server/admin_routes.go` → 5 (inkl. release-versions member-roles)
- `grep "anime_contribution"` in contributions handler → vorhanden
- `grep "group_history"` in roles handler → vorhanden
- HTTP 422 bei ungültigem role_code: implementiert
- HTTP 204 bei Delete: implementiert
- HTTP 404 bei ErrNotFound: implementiert

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- backend/internal/handlers/fansub_hist_group_members_handler.go: FOUND
- backend/internal/handlers/fansub_hist_group_member_roles_handler.go: FOUND
- backend/internal/handlers/fansub_group_history_handler.go: FOUND
- backend/internal/handlers/fansub_anime_contributions_handler.go: FOUND
- Commits: 2cb0a78d (Task 1), d170dcbe (Task 2)
- go build: PASSED

## Known Stubs

None.

## Threat Flags

None — alle Threat-Register-Einträge aus Plan 62-03 sind umgesetzt:
- T-62-06: Alle neuen Routen laufen unter `auth`-Middleware in admin_routes.go
- T-62-07: role_code-Validierung mit `anime_contribution`-Kontext in CreateAnimeContribution und UpdateAnimeContribution
- T-62-08: role_code-Validierung mit `group_history`-Kontext in CreateHistGroupMemberRole
