# Phase 19: Episode Import Operator Workbench - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning
**Source:** Blocked Phase-18 live UAT and operator follow-up discussion

<domain>

## Phase Boundary

Phase 18 proved the technical import baseline: AniSearch canonical episodes, Jellyfin media candidates, preview/apply routes, and coverage persistence all exist.

What remains is operator practicality on real libraries:

- mapping rows are not readable enough during conflict resolution
- parallel real releases of the same episode are treated like conflicts instead of usable versions
- large candidate sets require too many repetitive skip clicks
- the source context shown before and after preview does not yet make diagnosis and correction practical enough

Phase 19 must harden the import workbench so a human can finish a real import session without guessing which file is which.

It is not a general redesign of anime edit, public playback, or the full episode domain.

</domain>

<decisions>

## Locked Product Decisions

### Readable File Evidence Is Mandatory
- Mapping rows must identify Jellyfin candidates with readable evidence first: file name, release/fansub hint where available, and folder path or relative path.
- Opaque IDs such as raw Jellyfin media IDs may remain available as secondary diagnostics, but they must not be the primary label.

### Parallel Releases Are Versions, Not Automatic Conflicts
- If multiple Jellyfin files represent the same canonical episode from different groups or releases, the flow must allow them to coexist as separate episode versions.
- A true conflict is only when one file's target coverage is ambiguous or structurally incompatible, not when several distinct files all map cleanly to the same canonical episode.

### Bulk Resolution Must Be Practical
- The operator must be able to resolve many rows without clicking `Überspringen` dozens of times one by one.
- Phase 19 may use batch actions, per-episode grouping, auto-confirm/auto-skip helpers, or other practical controls.
- Drag-and-drop is optional; practicality is the requirement, not the interaction gimmick.

### Context Must Stay Visible
- The import page must clearly show linked AniSearch source, Jellyfin series identity, and folder path before apply.
- If Jellyfin linkage is missing or inconsistent, the operator should be able to see that immediately.

### Canonical Titles Stay AniSearch-Led
- AniSearch canonical episode titles should display the German title when available, otherwise English, otherwise Japanese.
- Persisting all title languages in the database is desirable later, but Phase 19 only needs the operator-facing import flow to show the correct preferred title reliably.

## the agent's Discretion

- Exact grouping model for the workbench, as long as it reduces manual friction and preserves version semantics.
- Whether batch controls are global, per-episode, or per-release-group.
- Whether diagnostics live inline on the main page or in an expandable secondary surface, provided the main operator path stays compact and readable.

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Live Phase-18 Artifacts
- `.planning/phases/18-episode-import-and-mapping-builder/18-CONTEXT.md` - original Phase-18 boundary and locked import model
- `.planning/phases/18-episode-import-and-mapping-builder/18-UAT.md` - blocked live-UAT evidence and practical operator gaps
- `.planning/phases/18-episode-import-and-mapping-builder/18-GAP-SUMMARY.md` - already-closed follow-through fixes before the remaining blockers

### Backend Episode Import Seams
- `backend/internal/services/anisearch_episode_import.go` - AniSearch canonical episode parsing and title selection
- `backend/internal/handlers/admin_episode_import.go` - import context, preview, and apply handler contracts
- `backend/internal/handlers/admin_episode_import_validation.go` - preview/apply validation rules
- `backend/internal/repository/episode_import_repository.go` - persistence and mapping apply semantics
- `backend/internal/models/episode_import.go` - DTOs for canonical episodes, media candidates, mappings, preview, and apply

### Frontend Episode Import Seams
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx` - operator-facing import workbench
- `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` - page state, preview, mapping, and apply behavior
- `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` - mapping conflict and summary helpers
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css` - current layout density and section language
- `frontend/src/types/episodeImport.ts` - frontend DTOs

### Supporting Baselines
- `.planning/ROADMAP.md` - phase goals and success criteria
- `.planning/STATE.md` - current project state
- `.planning/PROJECT.md` - project constraints including operator-facing copy rules

</canonical_refs>

<specifics>

## Specific Ideas

### 11eyes Real-Library Example
- One anime can have three real files for the same episode from different release groups.
- The workbench should make that feel like "three selectable versions for episode 1", not "33 unrelated conflicts with unreadable IDs".

### Mapping Builder Direction
- Show canonical episode title and number beside any proposed target.
- Show the actual Jellyfin file name directly in the row.
- Show enough path context to distinguish similar releases.
- Give fast actions for "confirm all obvious matches", "skip alternates", or similar batch handling.

### Diagnostics
- The top summary cards are useful, but the actionable context should be closer to the actual files and episode targets.
- If a Jellyfin series ID is missing or repaired from folder path fallback, the operator should see the resolved linkage honestly.

</specifics>

<deferred>

## Deferred Ideas

- Full multilingual episode-title persistence in the database
- Rich drag-and-drop mapping UI if simpler batch controls solve the practical problem
- Full episode-edit redesign after import

</deferred>

---

*Phase: 19-episode-import-operator-workbench*
*Context gathered: 2026-04-20 via blocked Phase-18 verification*
