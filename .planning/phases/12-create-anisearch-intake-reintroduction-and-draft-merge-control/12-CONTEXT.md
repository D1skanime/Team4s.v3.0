# Phase 12: Create AniSearch Intake Reintroduction And Draft Merge Control - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 brings AniSearch back as a first-class action in the create flow.

This phase covers:
1. Reintroducing an explicit AniSearch create UI on `/admin/anime/create`
2. Reusing the existing AniSearch fetch, provenance, duplicate, and relation-follow-through seams already established in Phases 9 and 11
3. Making the create-route draft merge behavior explicit again, especially the precedence between manual values, AniSearch values, and Jellyfin values

This phase does not include a broader edit-route refactor. If a duplicate AniSearch ID is found during create, the flow may switch to the existing edit route, but edit behavior itself is out of scope for this phase.

This phase also does not add AniSearch title search or browse UX yet. That idea is deferred until the ID-based create flow is working cleanly again.

</domain>

<decisions>
## Implementation Decisions

### Create AniSearch Entry Surface
- **D-01:** AniSearch must be visible again in the current create route instead of being absent from the live UI.
- **D-02:** The AniSearch create controls sit directly above the current `Jellyfin suchen` button area.
- **D-03:** The create AniSearch surface contains an explicit AniSearch ID input and a dedicated action button to trigger the crawl/load.
- **D-04:** AniSearch is a first-class create action, not a hidden debug path and not a deferred placeholder.

### Create Draft Merge Priority
- **D-05:** AniSearch always overrides Jellyfin-derived values in the create draft.
- **D-06:** The merge priority for Phase 12 is `manual > AniSearch > Jellyfin`.
- **D-07:** If AniSearch is loaded first and Jellyfin is loaded later, the AniSearch values must survive.
- **D-08:** If Jellyfin is loaded first and AniSearch is loaded later, the AniSearch values must overwrite the Jellyfin values.
- **D-09:** Provisional lookup text typed only to find a source is not an authoritative manual value and may be replaced by AniSearch data.

### Duplicate Handling
- **D-10:** If the entered AniSearch ID already exists on a local anime, the create flow should switch directly to that anime's edit route.
- **D-11:** Phase 12 should reuse the existing duplicate-detection seam instead of inventing a second duplicate policy just for create.
- **D-12:** After redirecting into edit, no broader edit refactor is part of this phase.

### Operator Feedback
- **D-13:** After AniSearch loads in create, the operator should see a clearly visible summary instead of only silent field changes.
- **D-14:** That summary should include which fields were updated, relation-related notes, and a clear reminder that nothing is saved yet.
- **D-15:** The AniSearch loading result should feel operator-safe and explicit, not automatic or hidden.

### Reuse Strategy
- **D-16:** Phase 12 should reuse the already-implemented AniSearch crawl/fetch backend path instead of rebuilding crawler behavior.
- **D-17:** Phase 12 should reuse the existing AniSearch provenance format `source='anisearch:{id}'`.
- **D-18:** Phase 12 should reuse the existing source-first relation resolution and best-effort relation follow-through logic where possible.
- **D-19:** The current create route structure should be extended, not replaced with a separate page or a major workflow reset.

### the agent's Discretion
- Exact copy wording of the create AniSearch card, as long as the summary clearly says the draft is not saved yet
- Exact component split between create page, controller, and helper modules, as long as the create route stays modular
- Exact visual emphasis of AniSearch vs Jellyfin actions, as long as AniSearch is clearly present above the Jellyfin action seam

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and product baseline
- `.planning/ROADMAP.md` - Phase 12 entry and milestone ordering
- `.planning/REQUIREMENTS.md` - existing AniSearch create/edit requirements and current traceability baseline
- `.planning/PROJECT.md` - project-level admin workflow principles and operator-control constraints
- `.planning/STATE.md` - current milestone/session state and roadmap evolution

### Prior AniSearch create behavior to restore
- `.planning/phases/09-controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up/09-01-PLAN.md` - original create AniSearch contract surface
- `.planning/phases/09-controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up/09-02-PLAN.md` - backend AniSearch fetch, duplicate, merge, and relation rules already implemented
- `.planning/phases/09-controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up/09-UAT.md` - verified create AniSearch behavior baseline from the earlier shipped flow

### Phase 11 behavior and reuse seams
- `.planning/phases/11-anisearch-edit-enrichment-and-relation-persistence/11-CONTEXT.md` - AniSearch reuse decisions, provisional-text rule, and source-first relation policy
- `.planning/phases/11-anisearch-edit-enrichment-and-relation-persistence/11-VERIFICATION.md` - latest verified AniSearch backend/frontend seams and create follow-through reporting behavior

### Current create-route code
- `frontend/src/app/admin/anime/create/page.tsx` - live create page where AniSearch must be reintroduced
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` - current create orchestration and the existing Jellyfin-only action flow
- `frontend/src/app/admin/anime/create/createPageHelpers.ts` - existing create success/warning messaging and source action helpers
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx` - create workspace surface receiving title actions and hints

### Reusable AniSearch backend/code seams
- `frontend/src/lib/api/admin-anime-intake.ts` - current create-route intake API helper module
- `frontend/src/types/admin.ts` - shared AniSearch/create DTOs used by frontend
- `backend/internal/services/anime_create_enrichment.go` - AniSearch fetch orchestration, duplicate redirect, merge rules, and relation resolution helpers
- `backend/internal/services/anisearch_client.go` - controlled AniSearch fetch client
- `backend/internal/models/admin_content.go` - backend AniSearch request/response models and create summary DTOs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AnimeCreateEnrichmentService` already knows how to fetch AniSearch data, normalize `anisearch:{id}`, redirect duplicates, merge draft data, and resolve approved relations.
- `buildCreateSuccessMessage(...)` already formats AniSearch follow-through warnings for the create route after persistence.
- `ManualCreateWorkspace` already accepts pluggable `titleActions` and `titleHint`, which gives Phase 12 a clean insertion seam above the current Jellyfin action.

### Established Patterns
- The create route is controller-driven through `useAdminAnimeCreateController.ts`, not page-local state.
- Provider data stays reviewable before persistence; the UI should update the draft first and save only on explicit create.
- The admin surface prefers extending current seams over spinning up parallel pages or workflows.

### Integration Points
- AniSearch create UI should plug into the existing create workspace/title-action area rather than inventing a separate route.
- AniSearch create requests should reuse the existing create intake API/helper surface or a sibling helper in that same module family.
- Duplicate redirects should flow out of the create AniSearch action into the existing edit route path.

</code_context>

<specifics>
## Specific Ideas

- AniSearch should be visibly present in create again, directly above the Jellyfin action, with an ID field and a dedicated crawl/load button.
- The Create flow should make it obvious that AniSearch updated the draft but did not save anything yet.
- AniSearch must consistently beat Jellyfin in both loading orders, because AniSearch is treated as the higher-quality metadata source.
- The create redirect for duplicate AniSearch IDs should be immediate and pragmatic: switch to edit, then leave edit cleanup for a later phase.

</specifics>

<deferred>
## Deferred Ideas

- AniSearch title search with result popup and selectable IDs - valuable product direction, but a separate capability beyond the Phase 12 ID-based reintroduction
- Broader edit-route redesign after duplicate redirect lands - intentionally deferred to a later edit-focused phase

</deferred>

---

*Phase: 12-create-anisearch-intake-reintroduction-and-draft-merge-control*
*Context gathered: 2026-04-10*
