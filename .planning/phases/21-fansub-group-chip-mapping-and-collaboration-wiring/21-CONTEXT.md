# Phase 21: Fansub Group Chips And Collaboration Wiring - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning
**Source:** Post-Phase-20 follow-up discussion plus live `11eyes` collaboration persistence check

<domain>

## Phase Boundary

Phase 20 proved that release-native episode import now persists real normalized release data correctly. The next practical gap is no longer schema integrity; it is how operators choose and reuse fansub groups while importing or manually editing release versions.

Today the import workbench still uses a flat text field for `Gruppe`, plus patch actions like `Episode` and `Ab hier` that copy that text value forward. That works as a fallback for unknown groups, but it is weak for real libraries where many groups already exist locally and where operators need to reuse them quickly without introducing typos or duplicates.

The product direction for this phase is:

- operators choose individual existing groups as chips
- they can still type a new group name when nothing exists yet
- if more than one group is selected, the backend builds or reuses the collaboration group behind the UI
- the same selection semantics must work in the import workbench and in the manual episode-version editor

This is not a general redesign of the episode domain, the public playback UI, or the whole fansub admin area.

</domain>

<decisions>

## Locked Product Decisions

### UI Uses Individual Group Chips, Not Explicit Collaboration Chips
- The operator should select individual groups such as `FlameHazeSubs` and `TestGruppe` as separate chips.
- The UI should not require a separate manually chosen chip `FlameHazeSubs & TestGruppe`.
- If several group chips are selected, the backend derives the effective collaboration group.

### Existing Groups Must Be Reusable First
- Import mapping should search and reuse already persisted `fansub_groups` before the operator creates more names.
- The operator should not have to retype a known group just to patch it across multiple rows.

### Free Text Remains A First-Class Fallback
- If a group is not yet in the database, the operator can type it directly in the same chip flow.
- Apply must create that group during persistence instead of forcing a detour into another admin screen.

### Collaboration Creation Stays Backend-Authoritative
- The backend must own deterministic collaboration resolution.
- The same member-set should always resolve to the same collaboration regardless of chip order.
- Frontend code must not invent per-screen or per-version collaboration slugs as the authoritative identity.

### Anime-Level Group Links Should Stay Consistent
- If an import or manual version save uses a group or collaboration for an anime, the corresponding `anime_fansub_groups` links should be kept in sync.
- This should include the effective collaboration group and the member groups when they are part of the persisted release truth.

## the agent's Discretion

- Exact DTO naming for selected fansub chips, as long as the data shape is explicit and reusable across import and manual version flows.
- Whether group suggestions appear inline under the input, in a dropdown, or another compact admin-friendly pattern.
- Whether compatibility fields such as singular `fansub_group_name` remain temporarily during rollout, provided the new multi-group path becomes authoritative.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Current Import Workbench
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` - current import workbench layout, row actions, and group text input
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` - import state, patch helpers, and apply payload construction
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` - mapping row helpers and row patch semantics
- `frontend/src/types/episodeImport.ts` - frontend DTOs for preview/apply
- `backend/internal/models/episode_import.go` - shared backend DTOs for mapping/apply
- `backend/internal/handlers/admin_episode_import.go` - import preview/apply contract
- `backend/internal/handlers/admin_episode_import_validation.go` - validation rules for import payloads
- `backend/internal/repository/episode_import_repository.go` - import apply planning
- `backend/internal/repository/episode_import_repository_release_helpers.go` - current group parsing, group creation, and collaboration persistence logic

### Existing Chip And Group Patterns
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx` - existing chip + autocomplete pattern used for admin metadata editing
- `frontend/src/app/admin/anime/components/AnimeContext/AnimeContextFansubManager.tsx` - existing fansub-group search/list pattern including group type visibility

### Manual Version Editor Baseline
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` - current selected-group behavior and frontend-created collaboration flow
- `backend/internal/handlers/episode_version_create.go` - manual version create write seam
- `backend/internal/handlers/episode_version_update.go` - manual version update write seam
- `backend/internal/handlers/episode_version_validation.go` - current single-group validation seam
- `backend/internal/models/episode_version.go` - episode-version patch/create payloads

### Fansub Read/Write Model
- `backend/internal/models/fansub.go` - group summary and collaboration member DTOs
- `backend/internal/repository/fansub_repository.go` - anime-fansub linkage and collaboration member repository behavior
- `.planning/ROADMAP.md` - Phase 21 goal and success criteria
- `.planning/STATE.md` - verified Phase-20 baseline and current follow-up context

</canonical_refs>

<specifics>

## Specific Ideas

### `11eyes` Collaboration Example
- The live check showed `FlameHazeSubs & TestGruppe` persisted as a collaboration in `release_version_groups`.
- `fansub_collaboration_members` correctly linked both member groups.
- `anime_fansub_groups` for `11eyes` remained empty, which is the concrete consistency gap to close.

### Import UX Direction
- Reuse existing groups through searchable chips.
- Allow new names in the same control.
- `Episode` and `Ab hier` should patch the full selected-chip set.
- The operator should still be able to remove one chip cleanly without rebuilding the whole field text.

### Manual Version Editor Follow-Through
- The manual episode-version editor already thinks in `selectedGroups`, which is the right UX direction.
- It currently creates collaboration groups from the frontend, which should be replaced by the same backend-authoritative resolver used by import.

</specifics>

<deferred>

## Deferred Ideas

- Rich alias management or merge tooling for fansub duplicates
- Full redesign of the anime-level fansub manager
- Public-site collaboration presentation changes

</deferred>

---

*Phase: 21-fansub-group-chip-mapping-and-collaboration-wiring*
*Context gathered: 2026-04-23 from verified Phase-20 follow-up work*
