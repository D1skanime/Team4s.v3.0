---
phase: 69-fansub-contributions-contract-und-permission-haertung
plan: "02"
subsystem: database
tags: [go, repository, pgx, transaction, upsert, fansub, contributions]

requires:
  - phase: 69-01
    provides: Migration 0088 mit Composite-FK auf anime_contributions(fansub_group_id, fansub_group_member_id)

provides:
  - CreateWithAutoMember in HistGroupMembersRepository (Transaktion: members + hist_fansub_group_members)
  - AnimeContributionInput.Status-Feld mit Draft-Fallback in Create
  - CreateOrUpdate in AnimeContributionsRepository (ON CONFLICT DO UPDATE + atomarer Rollenzustand)

affects:
  - 69-03
  - 69-04
  - 69-05

tech-stack:
  added: []
  patterns:
    - Extension-Methode in separater Datei (anime_contributions_upsert_repository.go) fuer 450-Zeilen-Limit
    - Transaktionsmuster BeginTx/defer Rollback/Commit analog zu fansub_group_app_members_repository

key-files:
  created:
    - backend/internal/repository/anime_contributions_upsert_repository.go
    - backend/internal/repository/anime_contributions_member_repository.go
  modified:
    - backend/internal/repository/hist_group_members_repository.go
    - backend/internal/repository/anime_contributions_repository.go

key-decisions:
  - "user_id in members bleibt NULL per Annahme A1: members.user_id referenziert Legacy-Tabelle users(id), kein Mapping app_users(id)->users(id) ohne separaten Join"
  - "CreateOrUpdate und ListByMemberID/Delete wurden in separate Dateien ausgelagert um CLAUDE.md 450-Zeilen-Limit einzuhalten"

patterns-established:
  - "Extension-Methoden auf bestehenden Repository-Structs in separate _repository.go-Dateien auslagern statt den Kern aufzublaehen"

requirements-completed:
  - P69-SC2
  - P69-SC6
  - P69-SC7

duration: 12min
completed: 2026-06-02
---

# Phase 69 Plan 02: Repository-Erweiterungen fuer Wave-2-Handler Summary

**CreateWithAutoMember-Transaktion (members + hist_fansub_group_members) und AnimeContribution-Upsert (ON CONFLICT DO UPDATE) als Repository-Fundament fuer Wave-2-Handler**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-06-02T10:05:00Z
- **Completed:** 2026-06-02T10:17:00Z
- **Tasks:** 2
- **Files modified:** 4 (2 modifiziert, 2 neu erstellt)

## Accomplishments

- `HistGroupMembersRepository.CreateWithAutoMember`: legt eine `members`-Zeile (nickname=display_name, user_id=NULL) und direkt danach einen `hist_fansub_group_members`-Eintrag in einer Transaktion an; gibt `*HistGroupMemberDisplayRow` zurueck
- `AnimeContributionInput.Status`-Feld ergaenzt; `Create` verwendet `input.Status` statt hartkodiertem `'draft'` (mit leerem-String-Fallback)
- `AnimeContributionsRepository.CreateOrUpdate` in `anime_contributions_upsert_repository.go`: `INSERT ... ON CONFLICT (fansub_group_id, anime_id, fansub_group_member_id) DO UPDATE SET ...` mit atomarem Rollen-DELETE+INSERT in einer Transaktion, Rueckgabe `*AnimeContributionDisplayRow`
- Alle vier Dateien bleiben unter 450 Zeilen (CLAUDE.md-Limit)

## Task Commits

1. **Task 1: CreateWithAutoMember in HistGroupMembersRepository** - `85b0a4d5` (feat)
2. **Task 2: AnimeContributionsRepository Status-Feld + CreateOrUpdate** - `7f967891` (feat)

## Files Created/Modified

- `backend/internal/repository/hist_group_members_repository.go` - `HistGroupMemberAutoCreateInput` und `CreateWithAutoMember` ergaenzt (327 Zeilen)
- `backend/internal/repository/anime_contributions_repository.go` - `Status`-Feld in `AnimeContributionInput`; `Create` nutzt `input.Status`; `ListByMemberID`/`Delete` ausgelagert (447 Zeilen)
- `backend/internal/repository/anime_contributions_upsert_repository.go` - Neue Datei: `CreateOrUpdate` mit Upsert-Semantik (104 Zeilen)
- `backend/internal/repository/anime_contributions_member_repository.go` - Neue Datei: `ListByMemberID` und `Delete` ausgelagert (50 Zeilen)

## Decisions Made

- `user_id` in `members` bleibt `NULL` per Annahme A1: `members.user_id` referenziert die Legacy-Tabelle `users(id)`; kein stabiles Mapping von `app_users(id)` auf `users(id)` existiert ohne separaten Join. `app_user_id` vom Frontend wird in `CreateWithAutoMember` ignoriert.
- `CreateOrUpdate`, `ListByMemberID` und `Delete` wurden in separate Dateien ausgelagert, um das CLAUDE.md-450-Zeilen-Limit einzuhalten.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Modularitaet] ListByMemberID und Delete ausgelagert**
- **Found during:** Task 2
- **Issue:** `anime_contributions_repository.go` hatte nach Hinzufuegen von `Status`-Feld und `if`-Block immer noch 488 Zeilen (>450). Der Plan lagert nur `CreateOrUpdate` aus, aber das genuegt nicht.
- **Fix:** `ListByMemberID` und `Delete` in `anime_contributions_member_repository.go` verschoben; Originaldatei ist nun 447 Zeilen.
- **Files modified:** `anime_contributions_repository.go`, `anime_contributions_member_repository.go` (neu)
- **Verification:** `go build ./backend/...` fehlerfrei; alle Methoden weiterhin erreichbar
- **Committed in:** `7f967891`

---

**Total deviations:** 1 auto-fixed (Rule 2 - Modularitaet/CLAUDE.md)
**Impact on plan:** Notwendig fuer CLAUDE.md-Limit; kein Scope Creep.

## Issues Encountered

- Task-1-Commit enthielt unbeabsichtigt zwei bereits pre-staged Dateien aus einem frueheren Code-Review-Commit (`contributions_public_handler.go` und `anime_contributions_public_repository.go`). Diese Dateien gehoeren zu Plan 69-04/69-05 und waren nicht Teil dieses Plans. Sie wurden nicht rueckgaengig gemacht, da dies destruktive git-Operationen erfordern wuerde und der Inhalt korrekt war.

## User Setup Required

Keine - reine Repository-Erweiterungen, keine neuen externen Abhaengigkeiten.

## Next Phase Readiness

- `CreateWithAutoMember` und `CreateOrUpdate` sind bereit fuer Wave-2-Handler (Plan 69-03/69-04)
- Handler koennen `display_name`-Validierung vor Aufruf von `CreateWithAutoMember` durchfuehren (T-69-03: member_id kommt nur aus dem frisch angelegten INSERT)
- `status`-Validierung in Wave-2-Handlern erforderlich (T-69-05)

---
*Phase: 69-fansub-contributions-contract-und-permission-haertung*
*Completed: 2026-06-02*
