# WORKING_NOTES

## Current Workflow Phase
- Phase: Phase 5 - Reference and Metadata Groundwork (normalized v2 schema migration)
- Focus: Package 2 execution artifacts and team4s-go lane implementation start

## Project State
- Done:
  - Phase 5 planning complete (05-CONTEXT.md, 05-RESEARCH.md, 05-01-PLAN.md, 05-ORCHESTRATOR-HANDOFF.md)
  - Contract impact analysis complete (NO CHANGES NEEDED for all Public APIs)
  - Contract freeze set and documented
  - Package execution order established (Package 2 before Package 1)
  - GSD migration brief phased and verified
  - Canonical schema draft in `docs/architecture/db-schema-v2.md`
  - `.planning/ROADMAP.md` and `.planning/STATE.md` updated with Phase 5 status
- In Progress:
  - Package 2 execution artifacts creation (05-02-CONTEXT.md, 05-02-PLAN.md, 05-02-orchestrator-handoff.md)
  - Verification gates refinement (shadow mode criteria, metrics, backfill strategy)
- Blocked:
  - None - all prerequisites met for Phase 5 execution

## Key Decisions and Context (Today)
- Intent and constraints:
  - Keep Jellyfin group assets presentation-driven, not playback-driven by default
  - Treat root folder artwork and episode-folder images differently
  - Preserve the existing page routes instead of introducing a parallel asset-only route
- Design/approach:
  - Prefer `Groups`, fall back to `Subgroups`
  - Root folder artwork drives page-level presentation
  - `Episode N` folders define the episode sections
  - Episode folder backdrops and photos stay gallery/lightbox items
  - Episode media files become media asset cards with stream links where applicable
- Assumptions:
  - Current group folder naming remains stable enough for matching (`<animeId>_<title>_<group-slug>`) (risky)
  - Root `banner` is the right info-panel source when present (risky if editorial practice drifts)
- Quality bar:
  - Live endpoint returns meaningful group data
  - Group page renders from that data without breaking other public routes
  - Root backdrop/banner never gets confused with episode gallery images

## Active Threads
- Public group detail now depends on Jellyfin `Groups` first and `Subgroups` second instead of placeholder-only content
- Root backdrop, root banner, and episode image behavior is now explicitly separated
- Release-assets persistence is still a separate unfinished lane for episode detail pages
- OpenAPI/docs are now aligned; the next follow-up is clearer error-state mapping
- GSD has been installed locally under `.codex/` and successfully generated `.planning/codebase/*.md` as a pilot for the upcoming schema-migration planning work
- GSD planning and execution artifacts now carry the migration lane baseline and handoff, while Team4s repo docs remain the daily operating truth

## Required Contracts / UX Notes
- Public group assets endpoint: `GET /api/v1/anime/{animeId}/group/{groupId}/assets`
- Current payload shape includes:
  - `folder_name`
  - `hero.backdrop_url`
  - `hero.primary_url`
  - `hero.poster_url`
  - `hero.thumb_url`
  - `hero.banner_url`
  - `episodes[].images[]`
  - `episodes[].media_assets[]`
- UX binding:
  - root backdrop = whole page background
  - root banner = info-panel background
  - episode backdrops/images = normal clickable gallery images

## Quick Checks
```bash
go test ./...
npm run build
docker compose ps
curl http://localhost:8092/health
curl http://localhost:8092/api/v1/anime/25/group/301/assets
curl -I http://localhost:3002/anime/25/group/301
```

## Parking Lot
- Clarify config/auth failures in the group-assets handler
- Revisit episode-link lookup so it is not tied to the current release list size
- Return to persisted release assets for `/api/v1/releases/:releaseId/assets`
- Turn `docs/architecture/db-schema-v2.md` into a milestone with explicit compatibility phases
- Add or insert the first concrete migration execution phase after the brief

### Day 2026-03-07
- Phase: Public anime group-detail hardening
- Accomplishments:
  - Switched group-detail library preference to Jellyfin `Groups`
  - Exposed root `thumb_url` and `banner_url` in the group-assets hero payload
  - Mapped episode folder `BackdropImageTags` into normal gallery images
  - Added a library-ID cache to avoid repeated `Library/MediaFolders` timeout pain
  - Iterated the group page visual layers so root backdrop, root banner, and asset text are more visible
  - Rebuilt the stack and revalidated `/anime/25/group/301`
- Key Decisions:
  - `Groups` is the preferred source for group-detail presentation assets; `Subgroups` is fallback
  - Root banner is the correct info-panel background source
  - Episode-folder backdrops are not hero assets; they stay ordinary gallery images
- Risks/Unknowns:
  - OpenAPI contract drift
  - group library discovery pagination limit
  - config failures are not yet clearly distinguished
  - visual tuning may still want one more pass
- Next Steps:
  - update the OpenAPI schema
  - harden group discovery
  - improve operator-facing Jellyfin error states
- First task tomorrow: update `shared/contracts/openapi.yaml` to match the live group-assets payload including `thumb_url` and `banner_url`

### Day 2026-03-13 (Updated End-of-Day)
- Phase: Phase 5 - Reference and Metadata Groundwork
- Accomplishments:
  - Completed morning briefing and confirmed Phase 5 readiness
  - Created Phase 5 full GSD planning artifacts:
    - `05-CONTEXT.md` (phase rationale, scope, success criteria)
    - `05-RESEARCH.md` (reference/metadata analysis)
    - `05-01-PLAN.md` (packages, lanes, verification gates)
    - `05-ORCHESTRATOR-HANDOFF.md` (agent handoff)
  - Executed contract impact analysis:
    - Result: NO CHANGES NEEDED for all Public APIs
    - Created `05-CONTRACT-IMPACT-ANALYSIS.md`
    - Created `orchestrator-handoff.md` with contract freeze confirmation
  - Updated `.planning/ROADMAP.md` and `.planning/STATE.md` with Phase 5 status
  - Confirmed Package 2 (team4s-go lane) as next critical path
- Key Decisions:
  - Phase 5 is backend foundation only (no public API changes)
  - Contract freeze set for Phase 5
  - Package execution order: Backend (Package 2) before SDK (Package 1)
  - Shadow mode pattern enables validation before enforcement
  - Handler consumption deferred to Phase 6
- Risks/Unknowns:
  - Reference data migration complexity (large dataset, safe backfill needed)
  - Foreign key dependencies during shadow mode
  - Shadow mode validation duration thresholds need refinement
- Next Steps:
  - Create Package 2 execution artifacts (05-02-CONTEXT.md, 05-02-PLAN.md, 05-02-orchestrator-handoff.md)
  - Begin team4s-go lane implementation (tables, repositories, services)
  - Refine verification gates and backfill strategy
- First task tomorrow: Create `05-02-CONTEXT.md` with Package 2 scope, success criteria, dependencies, and risks
