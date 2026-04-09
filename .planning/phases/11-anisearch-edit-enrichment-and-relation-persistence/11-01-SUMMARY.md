---
phase: 11-anisearch-edit-enrichment-and-relation-persistence
plan: 01
subsystem: api
tags: [anisearch, contracts, go, nextjs, vitest, go-test]
requires:
  - phase: 10-create-tags-and-metadata-card-refactor
    provides: create-route metadata structure and the current admin anime contract surface
provides:
  - explicit Phase 11 requirement mapping and Wave 0 AniSearch decisions
  - shared Go and TypeScript contracts for edit AniSearch enrichment and create follow-through summaries
  - red backend and frontend regression scaffolds for edit enrichment, relation idempotency, and lock semantics
affects: [11-02, 11-03, anisearch, admin-anime]
tech-stack:
  added: []
  patterns: [draft-first edit enrichment contract, PATCH provenance persistence, red-first AniSearch regression scaffolds]
key-files:
  created:
    - backend/internal/handlers/admin_content_anime_enrichment_edit_test.go
    - frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.test.ts
    - frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.test.tsx
  modified:
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - backend/internal/models/admin_content.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
    - frontend/src/types/admin.ts
    - backend/internal/services/anime_create_enrichment_test.go
    - backend/internal/repository/anime_relations_admin_test.go
    - frontend/src/lib/api.admin-anime.test.ts
    - frontend/src/app/admin/anime/hooks/useManualAnimeDraft.test.ts
key-decisions:
  - "Duplicate edit AniSearch IDs are modeled as 409 conflicts with redirect metadata instead of provenance reassignment."
  - "AniSearch provenance remains part of the regular edit PATCH contract through source='anisearch:{id}' and folder_name."
  - "Phase 11 starts from a reserved 501 edit-enrichment route plus red tests rather than silent partial behavior."
patterns-established:
  - "Pattern 1: Edit AniSearch enrichment is draft-first and save-later."
  - "Pattern 2: Relation persistence follow-through is best-effort and reported through anisearch response metadata."
requirements-completed: [ENR-06, ENR-07, ENR-08, ENR-10]
duration: 24min
completed: 2026-04-09
---

# Phase 11 Plan 01: AniSearch contract mapping, shared DTOs, and red regression seams Summary

**Explicit Phase 11 AniSearch edit/create contracts with redirect-based duplicate handling, PATCH provenance fields, and red regression scaffolds for the missing edit enrichment and idempotent relation seams**

## Performance

- **Duration:** 24 min
- **Started:** 2026-04-09T11:40:00Z
- **Completed:** 2026-04-09T12:04:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Replaced the stale Phase 11 placeholder mapping with explicit `ENR-06` through `ENR-10` coverage and Wave 0 contract rules in roadmap and requirements.
- Added shared Go and TypeScript DTOs for edit AniSearch requests/results, PATCH `source` and `folder_name`, and create response `anisearch` follow-through summaries.
- Added backend and frontend red tests for edit enrichment success/conflict behavior, `redirect_path`, `anisearch:{id}` provenance, field protection payloads, and the `AniSearch Daten laden` / `Felder schuetzen` UI contract.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock the Phase 11 requirements and Wave 0 contract decisions** - `f7b4282` (feat)
2. **Task 2: Add failing regression scaffolds for edit enrichment, idempotent relation apply, and lock semantics** - `182de6b` (test)

**Additional deviation fix:** `178da4e` (fix) - restore `gin` import for the reserved edit-enrichment route stub

## Files Created/Modified
- `.planning/ROADMAP.md` - Added explicit Phase 11 requirement IDs and the locked duplicate/provenance decisions.
- `.planning/REQUIREMENTS.md` - Added the `Edit-Time AniSearch Enrichment` Wave 0 contract rules.
- `backend/internal/models/admin_content.go` - Added shared edit AniSearch DTOs, PATCH provenance fields, and create AniSearch summary models.
- `backend/internal/handlers/admin_content_handler.go` - Reserved the edit AniSearch endpoint as a placeholder `501` seam for the next plan.
- `backend/cmd/server/admin_routes.go` - Registered `POST /api/v1/admin/anime/:id/enrichment/anisearch`.
- `frontend/src/types/admin.ts` - Added matching TypeScript edit AniSearch and create summary contracts.
- `backend/internal/handlers/admin_content_anime_enrichment_edit_test.go` - Added red handler tests for draft success, conflict redirects, and relation summary serialization.
- `backend/internal/services/anime_create_enrichment_test.go` - Added source-first relation resolution coverage.
- `backend/internal/repository/anime_relations_admin_test.go` - Added the red idempotent relation-apply scaffold.
- `frontend/src/lib/api.admin-anime.test.ts` - Added edit AniSearch API helper and create warning metadata expectations.
- `frontend/src/app/admin/anime/hooks/useManualAnimeDraft.test.ts` - Added provisional-title overwrite coverage.
- `frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.test.ts` - Added a red payload-builder test for `protected_fields`.
- `frontend/src/app/admin/anime/components/AnimeEditPage/AniSearchEnrichmentSection.test.tsx` - Added the red accessibility/copy contract test for the new edit card.

## Decisions Made
- Duplicate AniSearch edit conflicts are now explicitly redirect-driven and non-destructive.
- Persisted AniSearch provenance for edit saves is part of the PATCH surface, not an enrichment side effect.
- Create success responses can carry optional `anisearch` warning metadata for best-effort relation follow-through.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Restored missing `gin` import for the reserved edit-enrichment stub**
- **Found during:** Task 2 red verification
- **Issue:** The placeholder route added in Task 1 compiled the new method body but did not import `github.com/gin-gonic/gin`.
- **Fix:** Added the missing import so the red backend state reflects the intended missing AniSearch behavior instead of a trivial compile error.
- **Files modified:** `backend/internal/handlers/admin_content_handler.go`
- **Verification:** Targeted `go test` progressed to the intended red failures (`501` handler response and missing repository helper).
- **Committed in:** `178da4e`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix was required to keep the reserved route usable as a contract seam. No scope creep.

## Issues Encountered
- The current repo does not yet contain `loadAdminAnimeAniSearchEdit`, `useAniSearchEditEnrichment`, `AniSearchEnrichmentSection`, or `ApplyAniSearchRelationsIdempotently`. The new tests fail against those missing seams as intended.
- The source-first relation test in `anime_create_enrichment_test.go` already passes, which confirms the Phase 09 relation lookup baseline is reusable for Phase 11.

## Known Stubs

- `backend/internal/handlers/admin_content_handler.go:142` - `anisearch edit enrichment noch nicht implementiert` placeholder. Intentional reserved `501` seam for Plan 11-02 backend implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 11-02 can implement against fixed request/response names, route reservation, and red regression coverage without re-deciding duplicate handling or provenance persistence.
- Remaining expected red targets are the edit enrichment handler behavior, the idempotent relation apply helper, the frontend edit API helper/hook/component, and wiring the new create response metadata through runtime code.

---
*Phase: 11-anisearch-edit-enrichment-and-relation-persistence*
*Completed: 2026-04-09*

## Self-Check: PASSED

- Found summary file: `.planning/phases/11-anisearch-edit-enrichment-and-relation-persistence/11-01-SUMMARY.md`
- Found commits: `f7b4282`, `178da4e`, `182de6b`
