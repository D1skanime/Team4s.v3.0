# Phase 05 Research - Relations And Reliability

**Researched:** 2026-04-01
**Domain:** Admin anime relation CRUD on the existing edit route
**Confidence:** HIGH

## Summary

The current codebase already has the normalized database tables for anime relations and a public read seam, but it does not have an admin-safe write contract, no admin relation search helper, and no edit-route UI for relation maintenance. Phase 5 should therefore be planned as a focused admin CRUD layer on top of the existing `anime_relations` and `relation_types` tables, not as a schema phase and not as a public-facing relation redesign.

The safest path is:
- add a dedicated admin relation repository + handler seam for list/search/create/update/delete
- keep relation editing inside `/admin/anime/{id}/edit`
- use a collapsible admin section with live search, inline edit/delete, and explicit validation feedback
- keep the V1 taxonomy narrow in the UI even though the database supports more raw relation types

## Locked Decisions From Context

- Relations stay in the existing admin anime edit screen.
- The UI gets a dedicated collapsible `Relationen` section.
- The section starts collapsed by default.
- Relation direction is from the current anime toward the selected target anime.
- `Fortsetzung` means: the selected target anime is the sequel of the current anime.
- Target selection uses live search results, not raw ID entry.
- Existing relations are managed inline with edit and delete actions.
- Validation errors are shown inline plus in a persistent section-level error box.
- Only these four operator labels are allowed in V1:
  - `Hauptgeschichte`
  - `Nebengeschichte`
  - `Fortsetzung`
  - `Zusammenfassung`

## Relevant Existing Seams

### Database and Repository

- `database/migrations/0021_add_normalized_metadata_tables.up.sql`
  - already defines `anime_relations(source_anime_id, target_anime_id, relation_type_id)`
  - already enforces `source_anime_id != target_anime_id`
  - stores relations directionally
- `database/migrations/0020_add_metadata_reference_tables.up.sql`
  - seeds `relation_types` with raw DB names including `sequel`, `prequel`, `side-story`, `summary`, `full-story`, plus extra types outside V1
- `backend/internal/repository/anime_relations.go`
  - already exposes a public read seam
  - currently returns relations from either direction but does not expose perspective-aware admin semantics
  - currently returns raw relation type names, not the narrowed V1 operator labels

### Handlers and Admin Patterns

- `backend/internal/handlers/admin_content_anime.go`
  - shows the preferred admin create/update/delete error pattern
  - already uses admin auth, explicit validation, and operator-safe German messages
- `backend/internal/handlers/anime.go`
  - public anime list already supports `q` and `include_disabled` filtering, but the frontend helper is public-oriented and unauthenticated

### Frontend

- `frontend/src/app/admin/anime/[id]/edit/page.tsx`
  - already hosts the persisted anime edit experience
- `frontend/src/app/admin/anime/components/AnimeEditPage/AdminAnimeEditPageClient.tsx`
  - already owns page-level success/error handling for the edit route
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
  - already establishes the admin edit surface and is the right nearby placement for a relation section
- `frontend/src/app/admin/anime/components/AnimeBrowser/AnimeBrowser.tsx`
  - demonstrates the current admin search/filter interaction style
- `frontend/src/lib/api.ts`
  - is the required frontend seam for typed admin requests
- `frontend/src/types/anime.ts`
  - currently defines the public relation response shape only
- `frontend/src/components/anime/AnimeRelations.tsx`
  - is public-facing and uses a broader label set than the approved V1 admin taxonomy

## Main Gaps

1. No admin relation CRUD endpoints exist today.
2. No admin-safe relation repository methods exist today.
3. No admin search endpoint/helper exists for live target selection on the edit route.
4. The current public relation query does not preserve the current-anime perspective needed for admin editing.
5. The current public label mapping is broader than the approved V1 taxonomy.
6. No edit-route UI exists for adding, editing, or deleting relations.

## Important Data-Contract Findings

### Directionality matters

`anime_relations` is directional. That fits the user decision well, because `A -> B` with type `sequel` can naturally mean "B is the sequel of A".

However, the existing public read query in `backend/internal/repository/anime_relations.go` reads both directions and returns the raw stored type unchanged. That means it is not a safe source-of-truth for admin editing from the current anime's perspective. Phase 5 should therefore introduce a dedicated admin relation read/write contract instead of reusing the public response shape.

### V1 labels do not match raw DB names 1:1

The database seeds more relation types than V1 allows. For Phase 5, the admin contract should expose only the approved operator labels and map them internally to the existing normalized relation tables.

The likely V1 mapping is:
- `Fortsetzung` -> `sequel`
- `Nebengeschichte` -> `side-story`
- `Zusammenfassung` -> `summary`
- `Hauptgeschichte` -> `full-story`

`prequel`, `related`, `spin-off`, `alternative-version`, and `adaptation` should stay out of the admin picker in this phase.

### Search should be admin-specific

There is already a general anime list endpoint with `q`, but the frontend helper `getAnimeList(...)` is public-oriented and has no auth header path. Because the edit route is admin-only and relation target search may need disabled anime filtering decisions later, Phase 5 should plan a narrow admin relation target search seam instead of overloading the public helper.

## Constraints

- Do not introduce a second relation store.
- Do not widen the label set beyond the four approved V1 labels.
- Do not move relation editing to a separate route.
- Do not rely on raw numeric ID entry as the primary operator flow.
- Keep admin feedback explicit and immediately visible in the section UI.
- Keep production files below the 450-line project threshold by introducing a dedicated relation component/hook if needed.

## Recommended Planning Shape

### Plan 05-01

Backend and typed-client contract:
- admin repository methods for relation list/search/create/update/delete
- handler routes with German operator-safe errors
- mapping between V1 labels and normalized relation tables
- focused frontend API client helpers and tests

### Plan 05-02

Create flow and collapsible UI shell:
- collapsible `Relationen` section on edit route
- default-collapsed summary state
- directional helper copy
- live target search and relation creation form
- persistent section error box and inline validation

### Plan 05-03

Existing relation maintenance:
- inline list of current relations
- edit existing relation type
- delete with confirmation
- page-level success/error refresh behavior and integration tests

## Validation Implications

Phase validation must prove:
- create/update/delete all work through the admin UI
- the picker only offers the four approved labels
- self-link and duplicate attempts fail clearly
- relation writes hit `anime_relations` / `relation_types`, not a new store
- the collapsible edit-route section starts closed and stays understandable on mobile

## Historical Note

This directory still carries the old name `05-reference-metadata-groundwork` because the GSD phase resolver currently points Phase 5 here. The current Phase 5 content in this directory is for **Relations And Reliability**, and the previous metadata-groundwork plan files should be treated as legacy residue only.
