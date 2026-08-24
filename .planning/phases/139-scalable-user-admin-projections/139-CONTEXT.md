---
phase: 139-scalable-user-admin-projections
type: context
status: ready-for-plan-execute
depends_on: [137-central-effective-rights-resolver-overrides, 138-effective-rights-administration-impact-ux]
requirements: [UADM-02, UADM-03, UADM-04, UADM-05, UADM-06, UADM-07, UADM-08, QUAL-06]
---

# Phase 139 Context — Scalable User-Admin Projections

## Roadmap goal

Admins can understand large user contribution and media histories as bounded, domain-correct groups instead of release-version noise.

Phase 139 is limited to the roadmap scope:
- server-side projections,
- grouping,
- real override detection,
- standard-range collapse,
- filtering,
- coherent counts/pagination,
- canonical workspace links,
- responsive/keyboard-safe presentation,
- query-count/high-volume gates.

Do NOT expand this phase into:
- Claims,
- Änderungen/Audit redesign,
- role/capability redesign,
- review delegation,
- Streaming,
- new media editing,
- new contribution editing,
- Metabase integration,
- technical storage-health dashboards.

A later follow-up idea may use Metabase for deep technical media/storage analysis. Phase 139 must not build that dashboard inside Team4s.

## Binding discussion decisions

### Contributions

The admin user contribution projection is:

`Anime → Projekt/Fansubgruppe → Projektstandard → Release-/Episodenkontext`

Rules:
1. Anime is the outer grouping.
2. Project is the `(anime_id, fansub_group_id)` context.
3. Project standard is always directly visible.
4. Standard ranges are collapsed compactly.
5. Real deviations are shown as clear individual exceptions, not hidden inside large ranges.
6. A non-null `release_version_id` alone is NOT proof of a real override.
7. `release_crew_snapshots.snapshot_mode='inherited'` means project-standard inheritance.
8. `snapshot_mode='independent'` must be compared against the confirmed project standard; only a real semantic difference is highlighted as an override.
9. Episode ordering/range construction uses canonical episode ordering (`episodes.sort_index`, with existing safe fallback where needed), never internal database IDs.
10. Pagination unit is a complete Anime+Project block. A project must never be split across pages.
11. Count reports the number of filtered projected project blocks, not raw contribution rows.
12. Filtering happens server-side before grouping/pagination.
13. Required contribution filters:
   - Anime
   - project/group
   - contribution role/type
   - `nur Abweichungen`
   - time range
14. No client-side regrouping after pagination.

### Media

The admin user media projection is:

`Anime → Projekt/Fansubgruppe → Release/Episode → Medien`

Rules:
1. Pagination unit is a Release-/Episode block, not a whole project.
2. Count reports filtered projected Release-/Episode blocks, not raw media rows.
3. Each block contains small/lazy previews and compact fachliche context.
4. The Team4s view is informational; it does not become a second media editor.
5. Each release/episode block has one clear action such as `Release-Medien öffnen`.
6. That action must target the existing canonical ownership-specific workspace.
7. Do not put deep storage diagnostics in Team4s:
   - physical path,
   - storage id,
   - derivative file inventory,
   - detailed image-size/format analysis,
   - missing-file health dashboard.
   Those are explicitly reserved for a later Metabase/reporting idea.
8. Do not show the current fake `Berechtigung aktiv/fehlt` signal derived only from `owner_context`.
9. Do not use raw `release_version:<id>` as visible domain context.
10. Required media filters:
   - Anime
   - project/group
   - Release/Episode
   - media type
   - time range

### Rights — UADM-06 only

Phase 138 owns rights semantics and UX. Phase 139 may touch the rights tab ONLY for scale:
- avoid fetching effective rights for every membership at once,
- server-side bounded/filterable group membership selection,
- stable selected-group navigation,
- bounded rights projection where the existing complete catalog would become unbounded,
- coherent counts,
- no change to resolver semantics, Guided Revoke/Grant, role assignment impact, or provenance UX.

### UADM-07

Affected user tabs must explicitly say whether they are:
- informational/read-only, or
- actionable through an existing canonical workspace.

Contributions and media remain informational in the user-admin projection. Where action exists, link to the existing workspace rather than cloning edit logic.

### UADM-08 / QUAL-06

Mandatory:
- desktop-first shared pattern,
- CSS/container-query based graceful degradation,
- keyboard-operable controls,
- no page-level horizontal overflow,
- bounded APIs,
- no N+1,
- high-volume fixtures,
- pagination-drift tests,
- counts derived from the same filtered server-side dataset as page items.

## Existing Phase-138 baseline debt

The Phase-138 verifier documented pre-existing failures unrelated to Phase 139:
- backend: approximately 29 failing tests caused by nil `permissions.Service.LoadCache` in `testmain_test.go` (Phase 137 debt),
- frontend: four failing test files caused by `useRoleCatalog must be used within RoleCatalogProvider` (Phase 136 debt).

Before Phase-139 execution, executor must capture the exact current baseline and must not attribute unchanged pre-existing failures to Phase 139. Any new failure in a touched Phase-139 file is a Phase-139 regression and must be fixed.

## Current canonical code seams

Backend:
- `backend/internal/models/admin_users.go`
- `backend/internal/repository/admin_users_tab_repository.go`
- `backend/internal/handlers/admin_users_handler.go`
- `backend/cmd/server/admin_routes.go`
- `database/migrations/0137_phase108_contribution_sources.up.sql`
- release/media repositories under `backend/internal/repository/`

Frontend:
- `frontend/src/types/admin-users.ts`
- `frontend/src/lib/api.ts`
- `frontend/src/app/admin/users/tabs/UserContributionsTab.tsx`
- `frontend/src/app/admin/users/tabs/UserMediaTab.tsx`
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx`
- `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx`
- `frontend/src/components/contributions/AnimeGroupCard.tsx` may be used as a visual reference only; its client-side range grouping is NOT the Phase-139 server-side implementation.

## Existing data confirmed usable

Contribution source:
- `anime_contributions`
- project standard: `release_version_id IS NULL`
- release-specific records: `release_version_id IS NOT NULL`
- role assignments: `anime_contribution_roles`
- `release_crew_snapshots(snapshot_mode inherited|independent)`
- `release_versions.version`
- `episodes.episode_number`
- `episodes.sort_index`

Media source:
- `release_version_media`
- `media_assets`
- existing release/version/anime/group joins
- existing canonical workspace `/me/releases/{releaseVersionId}/workspace` and admin release-version media components

Phase 139 should project existing facts. Do not invent a new contribution or media ownership model.
