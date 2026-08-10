---
phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel
plan: 03
subsystem: ui
tags: [typescript, nextjs, api-client, cursor-pagination]

requires:
  - phase: 122-02
    provides: OpenAPI-Contract + 4 oeffentliche Endpunkte
provides:
  - frontend/src/types/projectMember.ts (ProjectMemberSummary/Counts/Note/MediaItem/Release)
  - api.ts-Helper getProjectMemberSummary/Notes/Media/Releases (cursor + limit + AbortSignal)
  - fansubProjectRoutes.buildPublicFansubProjectMemberPath
affects: [122-04, 122-05, 122-06, 122-07, 122-08]

tech-stack:
  added: []
  patterns:
    - "Hand-geschriebene Domain-Typen (kein OpenAPI-Codegen im Projekt), gespiegelt zu Backend-DTOs"
    - "Getrennte, abbrechbare Cursor-Helper (plain fetch, public) je Collection"

key-files:
  created:
    - frontend/src/types/projectMember.ts
    - frontend/src/lib/fansubProjectRoutes.test.ts
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/lib/fansubProjectRoutes.ts

key-decisions:
  - "Kein npm run generate — das Projekt hat keinen OpenAPI-Codegen; Typen werden per Konvention hand-geschrieben (wie groupContributors.ts)"
  - "CursorPage<T> aus @/types/releaseDetail wiederverwendet"

patterns-established:
  - "buildProjectMemberListURL kapselt cursor/limit-Query fuer die drei Listen"

requirements-completed: [D-02, D-08]

duration: ~20 min
completed: 2026-08-10
---

# Phase 122 Plan 03: Frontend-Datenschicht Summary

**Hand-geschriebene ProjectMember-Typen, vier getrennte cursor/abbrechbare api.ts-Read-Helper und der Route-Helper fuer die Projekt-Member-Route.**

## Performance
- **Duration:** ~20 min
- **Completed:** 2026-08-10
- **Tasks:** 3 (Typen, api.ts-Helper, Route-Helper+Test)
- **Files:** 2 created, 2 modified

## Accomplishments
- `projectMember.ts`: ProjectMemberSummary/Counts/Note/MediaItem/Release — gespiegelt zu OpenAPI/Go-DTOs.
- `api.ts`: `getProjectMemberSummary` + `getProjectMemberNotes/Media/Releases` (cursor+limit+AbortSignal, plain fetch = public), `CursorPage<T>` wiederverwendet.
- `fansubProjectRoutes.ts`: `buildPublicFansubProjectMemberPath(fansubSlug, animeSlug, memberSlug)` + 3 grüne Tests.
- typecheck sauber fuer die neuen/geaenderten Dateien.

## Task Commits
1. **Task 1-3: Typen + api-Helper + Route-Helper + Test** - `feat(122-03)`
**Plan metadata:** `docs(122-03)`

## Files Created/Modified
- `frontend/src/types/projectMember.ts` - Domain-Typen
- `frontend/src/lib/api.ts` - 4 Read-Helper + Import
- `frontend/src/lib/fansubProjectRoutes.ts` - Route-Helper
- `frontend/src/lib/fansubProjectRoutes.test.ts` - 3 Tests

## Decisions Made
- Kein OpenAPI-Codegen im Projekt → Typen hand-geschrieben (Konvention).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Fehlende Voraussetzung] Kein npm run generate**
- **Found during:** Task 1
- **Issue:** Plan nahm `npm run generate` an; das Projekt hat keinen OpenAPI→TS-Codegen (kein orval/openapi-ts, kein generate-Script).
- **Fix:** Typen hand-geschrieben, exakt an OpenAPI/Go-DTOs ausgerichtet (Konvention wie groupContributors.ts).
- **Verification:** tsc --noEmit sauber; 3 Route-Tests grün.

---

**Total deviations:** 1 auto-fixed (1 fehlende Voraussetzung). **Impact:** Kein Codegen-Setup noetig; Typen korrekt gespiegelt. Kein Scope-Creep.

## Issues Encountered
None. Frontend-Container bind-mountet Host-`frontend/` → typecheck/test via `docker compose exec team4sv30-frontend`.

## User Setup Required
None.

## Next Phase Readiness
- Datenschicht + Route-Helper stehen. Bereit fuer 122-04 (Link-Change) und die Seiten-/Sektions-Plaene 122-05..08.

---
*Phase: 122-ffentliche-projekt-member-seite-mit-beitr-gen-medien-und-rel*
*Completed: 2026-08-10*
