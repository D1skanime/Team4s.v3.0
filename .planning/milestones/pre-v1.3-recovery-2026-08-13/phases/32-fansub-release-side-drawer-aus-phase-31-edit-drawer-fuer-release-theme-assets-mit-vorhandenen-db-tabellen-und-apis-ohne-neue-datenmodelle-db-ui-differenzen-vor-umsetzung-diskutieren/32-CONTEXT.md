---
phase: 32
gathered: 2026-05-01
status: ready_for_planning
source: product discussion after Phase 31 UAT
---

# Phase 32: Fansub Release Side Drawer - Context

## Phase Boundary

Phase 31 prepared the Fansub `Anime & Releases` tab and inline release segment editor. Phase 32 turns that prepared edit entry into the Side Drawer workflow from the reference UI.

This phase does not create a new media truth. It uses the existing Theme-/Segment and `release_theme_assets` seam where it fits.

## Locked Decisions

### Entry Point

- The Side Drawer opens from the `Edit` button on a concrete release row in the Fansub group's `Anime & Releases` tab.
- The subtle row chevron can keep opening the inline release/timeline preview.
- Clicking OP/ED/IN timeline segments may select a segment inside the drawer once the drawer exists, but the primary entry for this phase is the release row `Edit` button.

### Permissions And Scope

- A Fansub group must not edit Anime data from this page.
- No `Anime bearbeiten` action belongs in this Fansub Release Drawer.
- The Fansub group must not change timeline timings.
- The first editable action is asset upload/delete for a selected Theme segment only when that slot is not locked by Jellyfin/global/admin source.

### Data Model

- OP/ED/Karaoke/Insert belong to Theme-/Segment assets.
- Release-process media such as WIP screenshots, GIFs, tool screenshots, notes, or funny process images belongs to `release_media`/`media_assets`, not to this Theme Drawer slice.
- `fansub_group_media` is not the runtime source for release media in this phase.
- Do not add new DB tables for the drawer.

### Stop-And-Discuss Gate

If implementation needs data that the current DB/API cannot provide without inventing a new concept, execution must stop and ask before adding schema or a parallel model.

Known gap found during planning:

- DB/repository can write direct `release_id + theme_id + media_id` rows into `release_theme_assets`.
- Existing upload HTTP path only uploads by `fansubID + animeID` and resolves a canonical release anchor.
- Phase 32 may add the smallest direct HTTP upload route for `POST /api/v1/admin/releases/:releaseId/theme-assets` because it reuses the existing table, repository method, and media service. It must not add a new table or use `fansub_group_media`.

## Current UX Target

1. Admin opens `/admin/fansubs/17/edit`.
2. Admin opens `Anime & Releases`.
3. Anime cards remain compact and collapsed by default.
4. Admin expands `11eyes`.
5. Admin clicks `Edit` on a concrete release row.
6. A right Side Drawer opens.
7. Drawer header shows the concrete release context without emphasizing internal release ID.
8. Drawer shows tabs/sections for Details and Theme Assets first; other tabs can be placeholders if not yet backed by existing DB/API.
9. Drawer shows a Timeline preview.
10. Drawer allows selecting OP/ED/IN only as asset context, not as timeline edit.
11. Upload/delete writes through existing `media_assets`, media files, and `release_theme_assets`.

## Canonical References

- `.planning/phases/31-ui-umbau/31-CONTEXT.md` - Phase 31 product decisions and media boundary.
- `.planning/phases/31-ui-umbau/31-03-SUMMARY.md` - Current inline editor state and known direct-upload gap.
- `frontend/src/app/admin/fansubs/[id]/edit/page.tsx` - Current Fansub Edit page and release timeline state.
- `frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css` - Current styling for release rows and timeline.
- `frontend/src/lib/api.ts` - Current frontend admin release/theme asset helpers.
- `backend/internal/handlers/admin_content_release_theme_assets.go` - Current Theme Asset HTTP handlers.
- `backend/internal/repository/admin_content_anime_themes.go` - Current Theme Asset repository methods.
- `backend/internal/models/admin_release_theme_assets.go` - Current DTOs for Fansub releases and release theme assets.
- `database/migrations/0044_add_db_schema_v2_target_tables.up.sql` - `release_theme_assets` schema.
- `database/migrations/0045_reconcile_db_schema_v2_columns.up.sql` - `release_media` FK hardening.

## Deferred

- Generic release-process media drawer tab.
- Release member/role mapping.
- Timeline editing.
- New DB tables or new asset authority layers.
- Final tab contents beyond what existing tables/APIs can safely back.
