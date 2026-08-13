---
phase: 40-text-und-notizsystem-fuer-fansub-plattform
plan: "07"
subsystem: frontend-types-api
tags: [typescript, api-client, fansub-notes, release-version-notes, types]

dependency_graph:
  requires:
    - phase: 40-05
      provides: Handler-Routes für fansub-seitige Note-Typen
    - phase: 40-06
      provides: Handler-Routes für release_version_notes
  provides:
    - frontend/src/types/fansubNotes.ts (FansubGroupNote, MemberGroupStory, AnimeFansubProjectNote + Request-Shapes)
    - frontend/src/types/releaseVersionNotes.ts (ReleaseVersionNote, MemberRoleForVersion, BulkNoteInput)
    - 14 API-Funktionen in frontend/src/lib/api.ts für alle 4 Note-Typen
  affects:
    - 40-08 (FansubGroupNotes UI)
    - 40-09 (MemberGroupStories UI)
    - 40-10 (ReleaseVersionNotes UI)

tech-stack:
  added: []
  patterns:
    - Typen in eigene Dateien pro Domäne (fansubNotes.ts, releaseVersionNotes.ts)
    - API-Funktionen folgen bestehendem withAuthHeader + parseApiErrorPayload-Pattern
    - response.data-Extraktion für alle JSON-Antworten

key-files:
  created:
    - frontend/src/types/fansubNotes.ts
    - frontend/src/types/releaseVersionNotes.ts
  modified:
    - frontend/src/lib/api.ts

decisions:
  - "Imports in api.ts per Domain-Datei gruppiert, nicht einzeln — konsistent mit anderen Import-Blöcken"
  - "getAnimeFansubProjectNote gibt null zurück bei 404 (statt Exception) — passend für optionales MVP-Einzeltext-Modell"
  - "authToken-Parameter optional an allen Funktionen — konsistent mit bestehendem api.ts-Pattern"

metrics:
  duration: 8min
  completed: "2026-05-11"
  tasks_completed: 3
  files_changed: 3
---

# Phase 40 Plan 07: Frontend — TypeScript-Typen und API-Client-Funktionen für alle 4 Note-Typen

**TypeScript-Typen für alle 4 Note-Entitäten plus 14 API-Client-Funktionen, alle Endpunkte aus Plan 40-05 und 40-06 abgedeckt.**

## Performance

- **Duration:** 8 min
- **Tasks:** 3/3
- **Files changed:** 3

## What Was Built

### Task 1: frontend/src/types/fansubNotes.ts (neu)

7 TypeScript-Interfaces für die 3 fansub-seitigen Note-Typen:

- `FansubGroupNote` — offizielle Gruppennotizen mit allen DB-Feldern (id, fansubGroupId, title, bodyMarkdown, bodyHtml, visibility, status, sortOrder, created/updated/deletedAt, userId-Felder)
- `MemberGroupStory` — persönliche Member-Geschichten, zusätzlich memberId + roleId (nullable)
- `AnimeFansubProjectNote` — Projekttexte mit animeId + fansubGroupId
- `CreateFansubGroupNoteRequest` — Pflichtfelder für POST
- `UpdateFansubGroupNoteRequest` — alle Felder optional für PATCH
- `CreateMemberGroupStoryRequest` — mit memberId (required) und roleId (optional)
- `UpdateMemberGroupStoryRequest` — alle Felder optional
- `UpsertAnimeFansubProjectNoteRequest` — für PUT (bodyMarkdown required)

### Task 2: frontend/src/types/releaseVersionNotes.ts (neu)

4 TypeScript-Interfaces für release_version_notes:

- `ReleaseVersionNote` — vollständiges Datenbankmodell (id, releaseVersionId, memberId, roleId, title nullable, bodyMarkdown, bodyHtml, visibility, status, sortOrder, userId-Felder, timestamps)
- `MemberRoleForVersion` — Member+Rollen-Hilfsobjekt für die UI-Anzeige (memberId, memberName, roleId, roleName, roleLabel)
- `BulkNoteInput` — Eingabeformat für Bulk-Save (id=0 = neu erstellen)
- `BulkUpsertReleaseVersionNotesRequest` — Array-Wrapper: `{ notes: BulkNoteInput[] }`

### Task 3: 14 API-Funktionen in frontend/src/lib/api.ts

**Fansub Group Notes (4 Funktionen):**
- `listFansubGroupNotes(fansubId)` → GET /admin/fansubs/:id/notes → `FansubGroupNote[]`
- `createFansubGroupNote(fansubId, data)` → POST → `FansubGroupNote`
- `updateFansubGroupNote(fansubId, noteId, data)` → PATCH → `FansubGroupNote`
- `deleteFansubGroupNote(fansubId, noteId)` → DELETE → `void`

**Member Group Stories (4 Funktionen):**
- `listMemberGroupStories(fansubId)` → GET /admin/fansubs/:id/member-stories → `MemberGroupStory[]`
- `createMemberGroupStory(fansubId, data)` → POST → `MemberGroupStory`
- `updateMemberGroupStory(fansubId, storyId, data)` → PATCH → `MemberGroupStory`
- `deleteMemberGroupStory(fansubId, storyId)` → DELETE → `void`

**Anime Fansub Project Notes (3 Funktionen):**
- `getAnimeFansubProjectNote(fansubId, animeId)` → GET /admin/fansubs/:id/anime/:animeId/notes → `AnimeFansubProjectNote | null` (404 → null)
- `upsertAnimeFansubProjectNote(fansubId, animeId, data)` → PUT → `AnimeFansubProjectNote`
- `deleteAnimeFansubProjectNote(fansubId, animeId, noteId)` → DELETE → `void`

**Release Version Notes (4 Funktionen):**
- `listReleaseVersionNotes(versionId)` → GET /admin/release-versions/:versionId/notes → `ReleaseVersionNote[]`
- `getMemberRolesForVersion(versionId)` → GET /admin/release-versions/:versionId/member-roles → `MemberRoleForVersion[]`
- `bulkUpsertReleaseVersionNotes(versionId, data)` → POST → `ReleaseVersionNote[]`
- `deleteReleaseVersionNote(versionId, noteId)` → DELETE → `void`

## Verification

- `npx tsc --noEmit` — kein Output, keine Fehler
- `npx eslint src/types/fansubNotes.ts src/types/releaseVersionNotes.ts src/lib/api.ts --max-warnings 0` — kein Output, keine Fehler

## Deviations from Plan

None — Plan wurde exakt wie beschrieben ausgeführt.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1-3 (alle drei Tasks) | 7b910bc8 | frontend/src/types/fansubNotes.ts, frontend/src/types/releaseVersionNotes.ts, frontend/src/lib/api.ts |

## Self-Check: PASSED
