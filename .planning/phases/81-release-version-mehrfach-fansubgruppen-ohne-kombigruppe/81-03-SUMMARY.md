---
phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
plan: 03
subsystem: api
tags: [go, postgres, fansub, release-version, junction, n-to-n]

# Dependency graph
requires:
  - phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
    plan: 01
    provides: Wave-0-RED-Tests (P81-SC1, P81-SC3, P81-SC6)
  - phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe
    plan: 02
    provides: Schema-Migrationen (release_version_groups N-fach, collaboration-Tabellen entfernt)
provides:
  - N-junction-Schreibpfad fuer release_version_groups (DELETE NOT IN + INSERT ON CONFLICT DO NOTHING)
  - FansubGroups []FansubGroupSummary DTO-Feld (kein Singular mehr)
  - resolvedImportFansubGroup ohne EffectiveGroup-Wrapper
  - fansub_helpers.go Helper-Split (CLAUDE.md Konformitaet)
  - Collaboration-Typen komplett entfernt (FansubGroupTypeCollaboration, CollaborationMember, upsertImportCollaborationGroup)
affects:
  - 81-04
  - frontend-fansub-groups-display
  - admin-episode-version-editor

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "N-junction-Upsert: DELETE WHERE NOT IN new_ids + INSERT ON CONFLICT DO NOTHING"
    - "Helper-Split fuer CLAUDE.md <=450-Zeilen-Grenze: fansub_helpers.go + release_helpers.go"
    - "resolvedImportFansubGroup als flache Struct (kein EffectiveGroup-Wrapper)"

key-files:
  created:
    - backend/internal/repository/episode_import_repository_fansub_helpers.go
  modified:
    - backend/internal/models/episode_version.go
    - backend/internal/models/fansub.go
    - backend/internal/repository/episode_import_repository_release_helpers.go
    - backend/internal/repository/episode_version_repository_write_helpers.go
    - backend/internal/repository/episode_version_repository_read_helpers.go
    - backend/internal/handlers/admin_content_episode_version_editor_helpers.go
    - backend/internal/handlers/fansub_collaborations.go
    - backend/internal/handlers/fansub_group_create_validation.go
    - backend/internal/handlers/fansub_group_patch_validation.go
    - backend/internal/repository/fansub_repository.go
    - backend/internal/repository/episode_import_repository_test.go
    - backend/internal/repository/episode_version_repository_write_helpers_test.go
    - backend/internal/repository/fansub_repository_test.go
    - backend/internal/handlers/fansub_test.go

key-decisions:
  - "D-02 umgesetzt: upsertImportCollaborationGroup und buildImportCollaborationName vollstaendig entfernt"
  - "D-05 umgesetzt: write path schreibt N Junction-Zeilen statt einem einzigen EffectiveGroup-Eintrag"
  - "D-06 umgesetzt: unbekannte fansub_group_id fuehrt zu ErrNotFound (Validierung vor Upsert)"
  - "D-07 umgesetzt: buildAnimeFansubLinkGroupIDs nimmt []resolvedImportFansubGroup (kein EffectiveGroup)"
  - "D-08 umgesetzt: EpisodeVersion.FansubGroups ist []FansubGroupSummary, Singular-Feld entfernt"
  - "fansub_collaborations.go: 410 Gone als Ueberbruecke bis Route-Deregistrierung in Plan 04"
  - "resolvedImportFansubSelection komplett entfernt — alle Callsites auf []resolvedImportFansubGroup migriert"

patterns-established:
  - "N-junction-Upsert-Pattern: DELETE WHERE fansub_group_id <> ALL($2::bigint[]) + INSERT ON CONFLICT DO NOTHING"
  - "Source-Scan-Tests aktualisieren wenn Datei verschoben: neue Quelldatei in os.ReadFile angeben"

requirements-completed:
  - P81-SC1
  - P81-SC3
  - P81-SC6

# Metrics
duration: 120min
completed: 2026-06-09
---

# Phase 81 Plan 03: Backend-Schreibpfad auf N-Junction-Upsert + Collaboration-Typen entfernt

**Go-Schreibpfad auf N-Junction-Upsert umgestellt (DELETE NOT IN + INSERT ON CONFLICT DO NOTHING), Collaboration-Typen komplett entfernt, Helper-Split fuer CLAUDE.md-Konformitaet, alle Wave-0-RED-Tests gruen**

## Performance

- **Duration:** ~120 min
- **Started:** 2026-06-09T07:30:00Z
- **Completed:** 2026-06-09T09:41:23Z
- **Tasks:** 2
- **Files modified:** 14 (inkl. 1 neue Datei)

## Accomplishments

- N-Junction-Schreibpfad: `upsertReleaseVersionGroup` schreibt jetzt N Zeilen fuer N echte Gruppen (DELETE NOT IN + INSERT ON CONFLICT DO NOTHING)
- `resolvedImportFansubGroup`-Struct ohne EffectiveGroup-Wrapper; `resolvedImportFansubSelection` komplett entfernt
- `upsertImportCollaborationGroup` und `buildImportCollaborationName` vollstaendig geloescht (D-02)
- Helper-Split: `episode_import_repository_fansub_helpers.go` (138 Zeilen) + `episode_import_repository_release_helpers.go` (372 Zeilen) — beide <= 450 Zeilen (CLAUDE.md)
- `EpisodeVersion.FansubGroups []FansubGroupSummary` statt `FansubGroup *FansubGroupSummary` (D-08)
- `FansubGroupTypeCollaboration`, `CollaborationMember`, `CollaborationMembers`-Felder aus Models entfernt
- Alle 3 Wave-0-RED-Tests gruen: `TestSyncEpisodeVersionSelectedGroups_WritesNJunctionRows`, `TestResolveImportFansubMemberGroups_RejectsUnknownGroupID`, `TestBuildAnimeFansubLinkGroupIDs_UsesOnlyMemberGroupsNoEffectiveGroup`

## Task Commits

1. **Task 1: Go-Models umstellen** - `015a9565` (feat)
2. **Task 2: Write-Path Refaktor + Helper-Split + Test-Rewrites** - `50972996` (refactor)

## Files Created/Modified

- `backend/internal/repository/episode_import_repository_fansub_helpers.go` - NEU: resolvedImportFansubGroup, lookupImportFansubGroupByID, resolveImportFansubMemberGroups, upsertImportFansubGroup, canonicalize-Helfer
- `backend/internal/models/episode_version.go` - FansubGroup -> FansubGroups [], CollaborationGroupID entfernt
- `backend/internal/models/fansub.go` - FansubGroupTypeCollaboration, CollaborationMember, CollaborationMembers entfernt
- `backend/internal/repository/episode_import_repository_release_helpers.go` - N-junction-Upsert, Collaboration-Funktionen entfernt, Fansub-Helfer in neues File ausgelagert (372 Zeilen)
- `backend/internal/repository/episode_version_repository_write_helpers.go` - resolveMemberGroupsForSync, upsertReleaseVersionGroupsForSync
- `backend/internal/repository/episode_version_repository_read_helpers.go` - FansubGroup -> FansubGroups []
- `backend/internal/handlers/admin_content_episode_version_editor_helpers.go` - collaborationID entfernt, resolveEpisodeVersionSelectedGroups vereinfacht
- `backend/internal/handlers/fansub_collaborations.go` - 410 Gone fuer alle drei Collaboration-Handler
- `backend/internal/handlers/fansub_group_create_validation.go` - collaboration aus erlaubten group_type-Werten entfernt
- `backend/internal/handlers/fansub_group_patch_validation.go` - collaboration aus erlaubten group_type-Werten entfernt
- `backend/internal/repository/fansub_repository.go` - ListCollaborationMembers/Add/Remove entfernt, GetPublicProfileBySlug bereinigt
- `backend/internal/repository/episode_import_repository_test.go` - TestBuildAnimeFansubLinkGroupIDs und TestEpisodeImportApply_UsesReleaseNativeTablesOnly aktualisiert
- `backend/internal/repository/episode_version_repository_write_helpers_test.go` - TestResolveImportFansubMemberGroups_RejectsUnknownGroupID auf fansub_helpers.go umgestellt
- `backend/internal/handlers/fansub_test.go` - FansubGroupTypeCollaboration -> FansubGroupTypeGroup in Tests

## Decisions Made

- `fansub_collaborations.go` gibt 410 Gone zurueck statt Handlers zu loeschen — Route-Deregistrierung ist Plan-04-Aufgabe
- Source-Scan-Test `TestResolveImportFansubMemberGroups_RejectsUnknownGroupID` liest nach Helper-Split gezielt `fansub_helpers.go` statt `release_helpers.go` (Rule 1 Auto-Fix: falsche Quelldatei nach Split)
- `fansub_test.go` testet `"group"` statt `"collaboration"` — collaboration ist nun ungueltig (Rule 1 Auto-Fix nach Model-Entfernung)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Source-Scan-Test TestResolveImportFansubMemberGroups_RejectsUnknownGroupID las falsche Quelldatei**
- **Found during:** Task 2 (Test-Suite nach Helper-Split)
- **Issue:** Test suchte `ErrNotFound` in `episode_import_repository_release_helpers.go`, aber `lookupImportFansubGroupByID` (mit `ErrNotFound`) wurde in `episode_import_repository_fansub_helpers.go` ausgelagert
- **Fix:** `os.ReadFile` in Test auf `episode_import_repository_fansub_helpers.go` geaendert
- **Files modified:** `backend/internal/repository/episode_version_repository_write_helpers_test.go`
- **Verification:** `go test ./internal/repository/... -run TestResolveImportFansubMemberGroups_RejectsUnknownGroupID` PASS
- **Committed in:** 50972996 (Task 2 Commit)

**2. [Rule 1 - Bug] fansub_test.go referenzierte entfernten FansubGroupTypeCollaboration-Wert**
- **Found during:** Task 2 (`go test ./internal/...`)
- **Issue:** `TestValidateFansubGroupCreateRequest` und `TestValidateFansubGroupPatchRequest_GroupTypeOnly` verwendeten `"collaboration"` und `models.FansubGroupTypeCollaboration` — beide in Task 1 entfernt
- **Fix:** Beide Tests auf `"group"` und `models.FansubGroupTypeGroup` umgestellt
- **Files modified:** `backend/internal/handlers/fansub_test.go`
- **Verification:** `go test ./internal/handlers/...` PASS
- **Committed in:** 50972996 (Task 2 Commit)

---

**Total deviations:** 2 auto-fixed (beide Rule 1 - Bug)
**Impact on plan:** Beide Auto-Fixes waren notwendige Folge des Helper-Splits und der Model-Bereinigung. Kein Scope-Creep.

## Issues Encountered

- `episode_import_repository_release_helpers.go` war nach initialer Bereinigung noch bei ~474 Zeilen (ueber dem 450-Limit). Behoben durch Auslagerung von `resolvedImportFansubGroup`, `lookupImportFansubGroupByID`, `resolveImportSelectedFansubGroup`, `upsertImportFansubGroup`, `canonicalizeResolvedImportFansubGroups`, `normalizedImportFansubIdentity` in `episode_import_repository_fansub_helpers.go`. Ergebnis: 372 Zeilen (release_helpers) + 138 Zeilen (fansub_helpers).

## Next Phase Readiness

- Write-Pfad vollstaendig auf N-Junction-Upsert umgestellt
- Collaboration-Schema vollstaendig entfernt (DB-Migrationen in Plan 02, Code in diesem Plan)
- Wave-0-RED-Tests gruen: P81-SC1, P81-SC3, P81-SC6
- Plan 04: Route-Deregistrierung fuer Collaboration-Endpoints (fansub_collaborations.go 410-Stub entfernen)

## Known Stubs

- `fansub_collaborations.go`: Alle drei Handler geben 410 Gone zurueck. Dies ist ein intentionaler Uebergangszustand bis Plan 04 die Routes aus `main.go` entfernt. Kein UI-Impact (Admin-Oberflaeche nutzt diese Endpoints nicht mehr).

---
*Phase: 81-release-version-mehrfach-fansubgruppen-ohne-kombigruppe*
*Completed: 2026-06-09*

## Self-Check: PASSED

- [x] `backend/internal/repository/episode_import_repository_fansub_helpers.go` — erstellt
- [x] `backend/internal/models/episode_version.go` — FansubGroups [] vorhanden
- [x] `backend/internal/models/fansub.go` — FansubGroupTypeCollaboration entfernt
- [x] Commit `015a9565` — vorhanden (Task 1)
- [x] Commit `50972996` — vorhanden (Task 2)
- [x] `go build ./...` — PASS
- [x] `go test ./internal/...` — PASS (alle Pakete)
- [x] `release_helpers.go` 372 Zeilen (<= 450)
- [x] `fansub_helpers.go` 138 Zeilen (<= 450)
