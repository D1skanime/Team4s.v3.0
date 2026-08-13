# Phase 1: Ownership Foundations - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the shared ownership-aware anime editing foundation that later manual intake and Jellyfin-assisted intake will reuse. This phase defines the common editor surface, the baseline ownership visibility, the audit attribution expectations, and the modular save model for anime editing. It does not yet deliver the full manual create workflow, full Jellyfin provenance behavior, or relation CRUD.

</domain>

<decisions>
## Implementation Decisions

### Shared editor scope
- **D-01:** Phase 1 should lock in a single shared anime editor foundation that is reused for existing anime edit, later manual create, and later Jellyfin-backed draft flows.
- **D-02:** The UI should differ by context and prefilling state, not by maintaining separate edit and create screens with diverging form logic.

### Ownership baseline
- **D-03:** Phase 1 should already show lightweight ownership visibility in the editor, such as simple manual versus external/source hints.
- **D-04:** Full provenance, per-slot asset behavior, and resync-specific ownership detail remain deferred to Phase 4.

### Audit attribution
- **D-05:** All anime-related mutations that belong to the shared editor foundation in Phase 1 must be attributable to the acting admin user ID.
- **D-06:** Audit attribution should cover more than plain field saves; it should include all editor-borne mutations that Phase 1 exposes on the anime ownership surface.

### Save model
- **D-07:** The shared editor should use one central save model with a primary save bar for the whole anime draft/context rather than multiple isolated save sections.
- **D-08:** The unified save model should remain compatible with both existing-anime editing and future preview-before-save draft creation flows.

### the agent's Discretion
- Exact placement and styling of lightweight ownership badges or labels within the shared editor.
- Precise audit event shape and storage details, as long as acting admin attribution is durable.
- Internal component boundaries and hook splits needed to keep the foundation modular and below the project file-size limit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Planning sources
- `.planning/PROJECT.md` - Product intent, admin-only audience, ownership rules, and brownfield constraints for anime intake.
- `.planning/REQUIREMENTS.md` - Phase-mapped requirements, especially `INTK-06`, `RLY-03`, and `RLY-04` for Phase 1.
- `.planning/ROADMAP.md` - Phase boundary and success criteria for Ownership Foundations.
- `.planning/STATE.md` - Current milestone positioning and carry-forward decisions already recorded for the roadmap.

### Existing codebase guidance
- `.planning/codebase/CONVENTIONS.md` - Existing backend/frontend patterns, API client conventions, and modularity expectations.
- `.planning/codebase/STRUCTURE.md` - Repo layout and where the anime admin foundation already lives.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`: Existing anime edit workspace already provides the rough section layout, central save bar, and cover-management surface to evolve into the shared editor foundation.
- `frontend/src/app/admin/anime/hooks/internal/useAnimePatchImpl.ts`: Central anime patch state, dirty tracking, reset behavior, genre helpers, and cover upload entry point are already isolated enough to become the common editor state layer.
- `frontend/src/app/admin/anime/components/AnimePatchForm/AnimePatchForm.tsx`: Older patch form shows an alternative composition of the same editing concerns and is useful as a reference during consolidation.
- `frontend/src/lib/api.ts`: Shared frontend API layer already exposes create, patch, Jellyfin preview, and Jellyfin sync seams that the common editor can build around.
- `backend/internal/handlers/admin_content_anime.go`: Existing admin anime create/update endpoints provide the current backend mutation seams for the editor foundation.
- `backend/internal/handlers/admin_content_anime_validation.go`: Current validation rules show the existing anime field contract and allowed enumerations.

### Established Patterns
- Frontend admin work is split into route-local components, hooks, and utility helpers rather than one monolithic screen file.
- API access is centralized through `frontend/src/lib/api.ts` instead of embedding raw fetch calls in UI components.
- Backend handler validation is explicit and request-shaped, with small feature-specific files under `backend/internal/handlers/`.
- The current anime admin UI already leans toward a sectioned editor with one global save action, which supports the chosen single-surface/single-save direction.

### Integration Points
- Shared editor changes will primarily connect through the existing admin anime workspace under `frontend/src/app/admin/anime/`.
- Backend audit attribution will extend the existing admin anime handler mutation path in `backend/internal/handlers/admin_content_anime.go` and the underlying repository path it calls.
- Ownership visibility will sit in the same editor state and rendering path that already manages patch values and clear flags in `useAnimePatch`.

</code_context>

<specifics>
## Specific Ideas

- The shared editor model should make `edit`, `neu manuell`, and later `neu aus Jellyfin` feel like the same product surface with different starting contexts.
- The user explicitly preferred lightweight ownership visibility in Phase 1, not a purely invisible technical foundation.
- The user explicitly preferred a single save bar over per-section save buttons.

</specifics>

<deferred>
## Deferred Ideas

- Full manual create workflow and preview-before-save creation behavior - covered in Phase 2.
- Jellyfin source selection, draft prefilling, and type suggestion behavior - covered in Phase 3.
- Full provenance UI, per-slot asset ownership, and fill-only resync behavior - covered in Phase 4.
- Relation CRUD and relation validation surface - covered in Phase 5.

</deferred>

---

*Phase: 01-ownership-foundations*
*Context gathered: 2026-03-24*
