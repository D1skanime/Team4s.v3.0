---
phase: 82-mitwirkende-projektweit-zuordnen-und-leader-abdeckungs-matri
plan: "03"
subsystem: frontend
tags:
  - frontend
  - types
  - api-helper
  - member_id
  - default-crew
  - unified-members
dependency_graph:
  requires:
    - 82-02
  provides:
    - AnimeContribution.member_id (TypeScript-Typ)
    - UpsertAnimeContributionRequest.member_id
    - UnifiedGroupMember Interface
    - DefaultCrewEntry Interface
    - listUnifiedGroupMembers API-Helper
    - listDefaultCrew API-Helper
    - upsertDefaultCrewEntry API-Helper
    - deleteDefaultCrewEntry API-Helper
    - applyDefaultCrew API-Helper
  affects:
    - frontend-Plan 04 (AnimeContributionModal member_id-Migration)
    - frontend-Plan 05 (Standard-Team-Button)
tech_stack:
  added: []
  patterns:
    - authorizedFetch-Pattern für alle neuen API-Helper
    - .data-Array-Extraktion bei List-Endpoints
key_files:
  created: []
  modified:
    - frontend/src/types/fansub.ts
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx
decisions:
  - AnimeContribution.member_id statt fansub_group_member_id (Breaking Change aus Plan 82-02 übernommen)
  - listUnifiedGroupMembers extrahiert .data aus Response-Body (konsistent mit anderen List-Helpers)
  - applyDefaultCrew sendet anime_ids als leeres Array wenn nicht angegeben (Backend-Konvention)
metrics:
  duration: "~20min"
  completed: "2026-06-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 3
---

# Phase 82 Plan 03: Frontend-Typen + API-Helper — member_id-DTOs, unified members, default-crew

TypeScript-Interfaces auf `member_id`-Semantik umgestellt und alle fünf neuen API-Helper für unified-members und default-crew-Endpoints über `authorizedFetch` angelegt.

## Tasks

### Task 1 — Frontend-Typen migrieren (commit: fd5dc429)

- `AnimeContribution.fansub_group_member_id` → `member_id: number` (D-01)
- `UpsertAnimeContributionRequest.fansub_group_member_id` → `member_id: number` (D-01)
- Neues Interface `UnifiedGroupMember` exportiert (member_id, display_name, source, has_app_account, group_roles) (D-02)
- Neues Interface `DefaultCrewEntry` exportiert (id, fansub_group_id, member_id, role_code, created_by, created_at) (D-04)
- `AnimeContributionModal.tsx`: alle `fansub_group_member_id`-Verwendungsstellen auf `member_id` umgestellt (Rule 1 — Folge-Fehler behoben)

### Task 2 — API-Helper anlegen (commit: 3f8d7bc5)

- Import `UnifiedGroupMember` + `DefaultCrewEntry` aus `@/types/fansub` in `api.ts` ergänzt
- `listUnifiedGroupMembers(fansubId, authToken?)`: GET `/unified-members` → `UnifiedGroupMember[]` (D-02, D-14)
- `listDefaultCrew(fansubId, authToken?)`: GET `/default-crew` → `DefaultCrewEntry[]` (D-04, D-14)
- `upsertDefaultCrewEntry(fansubId, memberID, roleCode, authToken?)`: PUT `/default-crew` (D-04, D-14)
- `deleteDefaultCrewEntry(fansubId, memberID, roleCode, authToken?)`: DELETE `/default-crew/:memberId/:roleCode` (D-04, D-14)
- `applyDefaultCrew(fansubId, animeIds?, authToken?)`: POST `/default-crew/apply` → `{ applied_count }` (D-04, D-14)
- Alle Helper nutzen ausschließlich `authorizedFetch` (kein raw fetch, kein manueller Bearer — D-14)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AnimeContributionModal.tsx — fansub_group_member_id-Referenzen auf member_id umgestellt**
- **Found during:** Task 1 — `npm run typecheck` nach Typ-Umbenennung
- **Issue:** `AnimeContributionModal.tsx` referenzierte `contribution.fansub_group_member_id` an 5 Stellen und sendete `fansub_group_member_id` im Upsert-Body — nach der Interface-Umbenennung TypeScript-Fehler
- **Fix:** Alle 5 Stellen in der Modal-Datei auf `member_id` umgestellt; Upsert-Body-Key angepasst
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/AnimeContributionModal.tsx`
- **Commit:** fd5dc429

## Known Stubs

Keine. Alle Typen und Helper sind vollständig und typsicher.

## Threat Flags

Keine neuen Sicherheitsflächen über den `<threat_model>` hinaus.

## Self-Check: PASSED

- [x] `AnimeContribution.member_id` — vorhanden in `frontend/src/types/fansub.ts`
- [x] `UpsertAnimeContributionRequest.member_id` — vorhanden
- [x] `UnifiedGroupMember` Interface — exportiert
- [x] `DefaultCrewEntry` Interface — exportiert
- [x] `listUnifiedGroupMembers` — in `api.ts` Z. 7272
- [x] `listDefaultCrew` — in `api.ts` Z. 7304
- [x] `upsertDefaultCrewEntry` — in `api.ts` Z. 7334
- [x] `deleteDefaultCrewEntry` — in `api.ts` Z. 7368
- [x] `applyDefaultCrew` — in `api.ts` Z. 7401
- [x] Commit fd5dc429 — `feat(82-03): Frontend-Typen auf member_id migrieren + UnifiedGroupMember/DefaultCrewEntry`
- [x] Commit 3f8d7bc5 — `feat(82-03): API-Helper listUnifiedGroupMembers + default-crew-Block in api.ts`
- [x] `npm run typecheck` — grün (0 Fehler)
- [x] `fansub_group_member_id` in `AnimeContribution` und `UpsertAnimeContributionRequest` — 0 Treffer
