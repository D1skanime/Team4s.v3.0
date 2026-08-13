---
phase: 82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri
plan: "02"
subsystem: backend
tags:
  - backend
  - repository
  - handler
  - contributions
  - member_id
  - default-crew
dependency_graph:
  requires:
    - 82-01
  provides:
    - member_id-Anker in anime_contributions (Repository + Handler)
    - GET /admin/fansubs/:id/unified-members
    - GET/PUT/DELETE /admin/fansubs/:id/default-crew
    - POST /admin/fansubs/:id/default-crew/apply
  affects:
    - frontend-Plan 03 (unified-members Endpoint)
    - frontend-Plan 05 (default-crew apply Button)
tech_stack:
  added:
    - FansubDefaultCrewRepository
    - FansubDefaultCrewHandler
    - hist_group_members_unified_repository.go (ListUnifiedByFansub)
    - anime_contributions_write_repository.go (Create/Update ausgelagert)
    - fansub_anime_contributions_unified_handler.go (ListUnifiedGroupMembers)
    - fansub_anime_contributions_delete_handler.go (DeleteAnimeContribution ausgelagert)
  patterns:
    - Permission-Guard-Stack (permissionActorFromContext + CanForFansubGroup + auditPermissionDenied)
    - Cross-Group-Guard via MemberBelongsToFansub UNION ALL (hist + app)
    - Idempotent Upsert (ON CONFLICT DO NOTHING)
key_files:
  created:
    - backend/internal/repository/hist_group_members_unified_repository.go
    - backend/internal/repository/fansub_default_crew_repository.go
    - backend/internal/repository/anime_contributions_write_repository.go
    - backend/internal/handlers/fansub_default_crew_handler.go
    - backend/internal/handlers/fansub_anime_contributions_unified_handler.go
    - backend/internal/handlers/fansub_anime_contributions_delete_handler.go
  modified:
    - backend/internal/repository/anime_contributions_repository.go
    - backend/internal/repository/anime_contributions_upsert_repository.go
    - backend/internal/repository/anime_contributions_inputs.go
    - backend/internal/repository/anime_contributions_proposal_repository.go
    - backend/internal/handlers/fansub_anime_contributions_handler.go
    - backend/internal/handlers/fansub_contributions_validation.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
decisions:
  - AnimeContributionDisplayRow.MemberID statt FansubGroupMemberID (Breaking Change — Frontend-Typen im Plan 03 anpassen)
  - MemberBelongsToFansub nutzt UNION ALL über hist + app (nicht nur hist)
  - Badge-Recompute: ComputeAndStoreBadges statt ComputeAndStoreBadgesByMembership (member_id ist nun direkt members.id)
  - DeleteAnimeContribution + ListUnifiedGroupMembers in eigene Dateien ausgelagert (450-Zeilen-Grenze)
  - ApplyDefaultCrewToEmptyProjects: leere Projekte via anime_fansub_groups (nicht fansub_group_anime)
metrics:
  duration: "~75min"
  completed: "2026-06-11"
  tasks_completed: 3
  tasks_total: 3
  files_created: 6
  files_modified: 8
---

# Phase 82 Plan 02: Repository-Umstellung member_id-Semantik + Standard-Team-Backend

Alle Contribution-Seams auf `member_id` (= `members.id`) umgestellt, Cross-Group-Guard auf UNION ALL ausgeweitet, vereinheitlichter Personenlisten-Endpoint `/unified-members` implementiert und vollständiges Standard-Team-Backend (`/default-crew` CRUD + apply) angelegt.

## Tasks

### Task 1 — Repository-Umstellung (commit: 60db81ab)

- `AnimeContributionDisplayRow.FansubGroupMemberID` → `MemberID` (json: `member_id`)
- `AnimeContributionRow.FansubGroupMemberID` → `MemberID`; `AnimeContributionInput.FansubGroupMemberID` → `MemberID`
- `MemberBelongsToFansub`: SQL-Query auf UNION ALL über `hist_fansub_group_members` UND `fansub_group_members` per `member_id` (T-82-02-02, T-82-02-03)
- `ListByFansubAndAnimeWithDisplay` + `GetByIDWithDisplay`: JOIN direkt auf `members` via `ac.member_id`
- `animeContributionSelectCols`: `ac.fansub_group_member_id` → `ac.member_id`
- `CreateOrUpdate`-Upsert: INSERT-Spalte + ON CONFLICT auf `member_id`
- `GetMemberIDForContribution`: vereinfacht (SELECT member_id FROM anime_contributions)
- `Create`/`Update` nach `anime_contributions_write_repository.go` ausgelagert (450-Zeilen-Limit)
- `UnifiedGroupMember`-Struct + `ListUnifiedByFansub` in `hist_group_members_unified_repository.go`

### Task 2 — Handler-Umstellung (commit: 8befabe8)

- `animeContributionCreateRequest.FansubGroupMemberID` → `MemberID` (json: `member_id`)
- Cross-Group-Guard: `req.MemberID` statt `req.FansubGroupMemberID`
- Badge-Recompute: `ComputeAndStoreBadgesByMembership` → `ComputeAndStoreBadges` (item.MemberID ist nun `members.id`)
- `FansubAnimeContributionsHandler`: `histMembersRepo`-Feld + `WithHistMembersRepo`-Setter
- `ListUnifiedGroupMembers` in `fansub_anime_contributions_unified_handler.go` (T-82-02-01/04)
- `DeleteAnimeContribution` in `fansub_anime_contributions_delete_handler.go` ausgelagert
- Route `GET /admin/fansubs/:id/unified-members` registriert
- `main.go`: `WithHistMembersRepo(histGroupMembersRepo)` ergänzt

### Task 3 — Standard-Team-Backend (commit: db5c6900)

- `fansub_default_crew_repository.go`: `DefaultCrewEntry`-Struct; `ListDefaultCrew`, `UpsertDefaultCrewEntry` (idempotent), `DeleteDefaultCrewEntry`, `ApplyDefaultCrewToEmptyProjects`
- `fansub_default_crew_handler.go`: `GetDefaultCrew` (MembersView), `PutDefaultCrew` (MembersManage + Cross-Group-Guard T-82-02-05), `DeleteDefaultCrewEntry` (MembersManage, T-82-02-07), `ApplyDefaultCrew` (MembersManage, T-82-02-06)
- Vier Routen in `admin_routes.go` registriert (GET/PUT/DELETE/POST /default-crew)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] anime_contributions_proposal_repository.go Scan auf MemberID aktualisiert**
- **Found during:** Task 1 — `go build` nach AnimeContributionRow-Umbenennung
- **Issue:** `MemberContributionWithProposalRow` bettet `AnimeContributionRow` ein; Scan-Zeile referenzierte `row.FansubGroupMemberID` das nach der Umbenennung nicht mehr existierte
- **Fix:** Scan-Referenz auf `row.MemberID` geändert
- **Files modified:** `backend/internal/repository/anime_contributions_proposal_repository.go`
- **Commit:** 60db81ab

**2. [Rule 1 - Bug] fansub_group_anime existiert nicht — anime_fansub_groups korrekt**
- **Found during:** Task 3 — Tabellenname in ApplyDefaultCrewToEmptyProjects
- **Issue:** Plan nannte `fansub_group_anime`, tatsächliche Tabelle ist `anime_fansub_groups` (aus AdminContentRepository.ListFansubAnime)
- **Fix:** Tabellenname in SQL-Query korrigiert
- **Files modified:** `backend/internal/repository/fansub_default_crew_repository.go`
- **Commit:** db5c6900

**3. [Rule 2 - Auslagerung] Mehrere Handler-Dateien für 450-Zeilen-Limit aufgeteilt**
- `DeleteAnimeContribution` → `fansub_anime_contributions_delete_handler.go`
- `Create`/`Update` → `anime_contributions_write_repository.go`
- `ListUnifiedGroupMembers` → `fansub_anime_contributions_unified_handler.go`

### Known Limitations

**Proposal-Repository SQL (out of scope):** `ListByMemberIDWithProposalFields` in `anime_contributions_proposal_repository.go` verwendet noch `JOIN hist_fansub_group_members hfgm ON hfgm.id = ac.fansub_group_member_id` — nach Migration 0105 ist `fansub_group_member_id` nullable, Contributions nur mit `member_id` werden von diesem Join nicht gefunden. Fix liegt außerhalb von Plan 82-02 (Proposal-Flow ist eigene Domain).

Entsprechende Stellen in `contributions_me_handler.go` und `anime_contributions_public_repository.go` ebenfalls noch auf altem Join — diese werden in separatem Folge-Slice bereinigt.

## Known Stubs

Keine. Alle implementierten Endpunkte sind vollständig verdrahtet.

## Threat Flags

Keine neuen Sicherheits-Flächen über den `<threat_model>` hinaus.

## Self-Check: PASSED

- [x] `backend/internal/repository/hist_group_members_unified_repository.go` — existiert
- [x] `backend/internal/repository/fansub_default_crew_repository.go` — existiert
- [x] `backend/internal/handlers/fansub_default_crew_handler.go` — existiert
- [x] Commit 60db81ab — `feat(82-02): Repository-Umstellung member_id-Semantik + UnifiedGroupMember`
- [x] Commit 8befabe8 — `feat(82-02): Handler-Umstellung member_id, ListUnifiedGroupMembers-Endpoint`
- [x] Commit db5c6900 — `feat(82-02): Standard-Team-Backend — /default-crew CRUD + apply (D-04)`
- [x] `go build ./...` — grün
- [x] 4 /default-crew Routen in admin_routes.go
- [x] GET /admin/fansubs/:id/unified-members in admin_routes.go
