# Phase 5: Relations And Reliability - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers admin-managed anime relation CRUD inside the existing anime edit workflow. Scope is limited to creating, updating, and deleting links between existing anime records with the narrow V1 relation taxonomy, clear validation, and operator-usable error feedback.

This phase is not the older backend-only metadata normalization slice that still exists in this directory as historical planning residue.
</domain>

<decisions>
## Implementation Decisions

### Admin Surface
- **D-01:** Anime relations are managed inside the existing admin anime edit route instead of a separate admin screen.
- **D-02:** The relation UI lives in its own dedicated, collapsible section within the anime edit screen.
- **D-03:** The relations section starts collapsed by default to keep the broader edit route calm unless the operator explicitly opens relation maintenance.

### Relation Semantics
- **D-04:** When editing anime `A`, the selected relation type always describes the target anime `B` from the perspective of `A`.
- **D-05:** `Fortsetzung` therefore means "the selected target anime is the sequel to the currently edited anime."
- **D-06:** The same directional rule applies consistently to the other V1 labels so the operator always chooses what the target record is relative to the current anime.

### Target Selection
- **D-07:** The related anime target is chosen through a search field with live results rather than by raw numeric ID entry.
- **D-08:** Relation creation remains limited to linking against already existing anime records.

### Editing Behavior
- **D-09:** Existing relations are shown as an inline list inside the relations section.
- **D-10:** Each existing relation supports inline edit and inline delete actions from that same section.

### Validation And Reliability
- **D-11:** The relations form uses clear inline validation for local/operator-correctable issues such as self-links, invalid target selection, and duplicate relation attempts.
- **D-12:** Save and backend failures are also surfaced in a persistent error box inside the relations section instead of only as page-global or toast-only feedback.
- **D-13:** Phase 5 must preserve the existing project rule that admin-facing failures stay operator-usable and explicit rather than collapsing into generic error text.

### Locked Taxonomy
- **D-14:** Phase 5 remains limited to the four approved V1 relation labels: `Hauptgeschichte`, `Nebengeschichte`, `Fortsetzung`, and `Zusammenfassung`.

### the agent's Discretion
- The exact inline row layout, iconography, and whether relation rows use explicit edit mode toggles or always-editable controls are left to planning and UI design.
- Search debounce timing, result count limits, and whether existing relations auto-expand their editor row are left to planning as long as the live-search requirement and inline editing model remain intact.
- Backend storage direction, reverse-display handling, and validation layering may be chosen during planning as long as they preserve the directional semantics above and continue using the existing normalized relation tables.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap And Requirements
- `.planning/ROADMAP.md` - Current Phase 5 goal, dependency order, and success criteria for `Relations And Reliability`
- `.planning/REQUIREMENTS.md` - Canonical requirement definitions for `RELA-01` through `RELA-07` and `RLY-01`
- `.planning/PROJECT.md` - Project-level scope guardrails, relation taxonomy decision, and admin reliability expectations
- `.planning/STATE.md` - Current project position after Phase 4 completion

### Existing Runtime And Read Seams
- `backend/internal/repository/anime_relations.go` - Existing public read path for anime relations against normalized relation tables
- `backend/internal/handlers/anime.go` - Existing public anime relation endpoint wiring via `GetAnimeRelations`
- `frontend/src/lib/api.ts` - Existing public client seam for `getAnimeRelations(...)`
- `frontend/src/types/anime.ts` - Existing frontend relation response shape
- `frontend/src/components/anime/AnimeRelations.tsx` - Existing public relation rendering component and current relation-type labeling behavior

### Existing Admin Edit Surface
- `frontend/src/app/admin/anime/[id]/edit/page.tsx` - Existing anime edit route composition where the new relations section must integrate
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx` - Shared admin anime edit workspace patterns adjacent to the new relation section

### Historical But Out-Of-Scope Phase Residue
- `.planning/phases/05-reference-metadata-groundwork/05-01-PLAN.md` - Historical backend-only metadata normalization plan; not the current Phase 5 scope
- `.planning/phases/05-reference-metadata-groundwork/05-CONTRACT-ANALYSIS.md` - Historical contract analysis for the old metadata groundwork scope; keep only as archive context
- `.planning/phases/05-reference-metadata-groundwork/CONTRACT-FREEZE.md` - Historical freeze note for the old metadata groundwork scope; not binding on the current relations phase
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/internal/repository/anime_relations.go`: already reads anime relations from `anime_relations` plus `relation_types`, so Phase 5 can extend an existing normalized relation seam instead of inventing a second store.
- `frontend/src/components/anime/AnimeRelations.tsx`: already displays public relation cards and establishes a visible relation-label mapping seam that Phase 5 should keep consistent with admin-managed data.
- `frontend/src/app/admin/anime/[id]/edit/page.tsx`: already hosts provenance-first maintenance UI for persisted anime, making it the natural integration point for a relation-maintenance block.

### Established Patterns
- Recent phases prefer putting anime-maintenance controls into the shared admin edit route instead of creating parallel management screens.
- Admin workflows now favor explicit inline operator copy, section-scoped actions, and persistent structured error feedback over hidden state or generic toasts.
- Validation-heavy admin changes are expected to fail closed and explain themselves clearly in the UI.

### Integration Points
- The new relation-maintenance section should attach to the existing anime edit screen rather than a fresh route tree.
- Backend write paths should extend the existing anime relation domain instead of bypassing it with ad hoc direct SQL in handlers.
- Frontend live target search will likely need an admin-safe anime lookup seam if no suitable existing admin search endpoint already matches the requirement.
</code_context>

<specifics>
## Specific Ideas

- The operator mental model is intentionally directional: while editing anime `A`, every choice describes what the selected target `B` is relative to `A`.
- The admin surface should feel like maintenance, not intake: open the relations block when needed, search an existing anime, set the relation, save, and continue editing inline.
- The project already has a public relation display, so admin-created relations should remain consistent with what the public side later renders.
</specifics>

<deferred>
## Deferred Ideas

- The old "reference and metadata groundwork" Phase 5 material in this directory is not part of the current roadmap Phase 5 and should not be revived during relation planning.
- Broader relation taxonomy beyond the four approved V1 labels remains out of scope.
- Any standalone relations admin screen, separate route family, or generalized cross-content relationship manager remains out of scope for this phase.

Reviewed historical residue:
- `.planning/phases/05-reference-metadata-groundwork/05-01-PLAN.md` - Deferred as legacy planning residue; the current roadmap repurposed Phase 5 to `Relations And Reliability`
- `.planning/phases/05-reference-metadata-groundwork/05-CONTRACT-ANALYSIS.md` - Deferred as legacy analysis for a different phase goal
- `.planning/phases/05-reference-metadata-groundwork/CONTRACT-FREEZE.md` - Deferred as legacy analysis artifact, not active scope guidance
</deferred>

---

*Phase: 05-relations-and-reliability*
*Context gathered: 2026-04-01*
