# Phase 11: AniSearch Edit Enrichment And Relation Persistence - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 covers AniSearch follow-up work after the create tags refactor:

1. AniSearch enrichment on the existing edit route (`/admin/anime/[id]/edit`) with explicit override behavior and field protection.
2. Persistence of resolved AniSearch relations so create-time relation matches are written to the database instead of remaining draft-only data.

This phase does not add free AniSearch search, does not redesign the public anime pages, and does not introduce new create-route tag schema work beyond what Phase 10 already established.

</domain>

<decisions>
## Implementation Decisions

### AniSearch Edit Enrichment
- **D-01:** AniSearch in the edit route uses override mode. Existing values are overwritten unless the admin explicitly protects them.
- **D-02:** Locked fields remain untouched during edit-route AniSearch loads.
- **D-03:** Field changes from AniSearch enrichment update the edit draft first. The admin still saves explicitly through the existing save flow.
- **D-04:** The existing source priority rule continues to apply: values manually changed after an AniSearch load are not overwritten again by a later AniSearch load unless the admin intentionally unlocks and reloads them.

### AniSearch Relation Persistence
- **D-05:** Relations resolved from AniSearch during edit are auto-applied to `anime_relations` immediately when the enrichment request succeeds.
- **D-06:** Existing relations are not duplicated.
- **D-07:** Unresolvable AniSearch relations are skipped silently.
- **D-08:** Relation matching continues to prefer `source = anisearch:{id}` first, then title-based fallback.
- **D-09:** The dedicated edit endpoint remains `POST /admin/anime/:id/enrichment/anisearch`.
- **D-10:** The create flow must also persist resolved AniSearch relations after anime creation instead of leaving them as draft-only data.

### API And Reuse Strategy
- **D-11:** The already existing AniSearch backend service stack (`AniSearchClient` plus `AnimeCreateEnrichmentService`) is the reuse baseline for this phase, not a new crawler implementation.
- **D-12:** Relation persistence should reuse the same AniSearch source lookup and approved-relation filtering rules already established in the create enrichment service.

### Code Quality Guardrails
- **D-13:** No single page component should exceed 700 lines after this phase. If needed, logic must be split into focused components, hooks, or helper modules.
- **D-14:** New or substantially touched code should include short explanatory comments for major sections and non-obvious helper functions so future maintainers understand purpose, not just mechanics.
- **D-15:** Frontend work for this phase must include a lightweight UI contract before implementation details sprawl. The planner should treat that contract as required input for the edit-page AniSearch placement and result presentation.

### the agent's Discretion
- Exact lock-model representation for edit-field protections as long as the override semantics stay clear
- Exact helper text wording and placement of the edit-route AniSearch controls
- Exact distribution of responsibilities between edit page, local hooks, and enrichment helper modules as long as the 700-line page limit is respected

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and planning
- `.planning/ROADMAP.md` - Phase 11 goal and roadmap ordering after the split
- `.planning/REQUIREMENTS.md` - create-time enrichment requirements that still govern AniSearch behavior until new edit-phase requirements are added
- `.planning/phases/09-controlled-anisearch-id-enrichment-before-create-with-fill-only-jellysync-follow-up/09-CONTEXT.md` - prior AniSearch create-flow decisions that this phase must stay consistent with
- `.planning/phases/10-create-tags-and-metadata-card-refactor/10-CONTEXT.md` - create metadata structure that must already exist before this AniSearch follow-up lands

### AniSearch backend reuse
- `backend/internal/services/anisearch_client.go` - existing AniSearch crawler and parser with rate limiting, metadata extraction, and relation parsing
- `backend/internal/services/anime_create_enrichment.go` - existing create enrichment service, fill-only merge rules, and relation resolution logic
- `backend/internal/handlers/admin_content_handler.go` - current AniSearch service wiring in the admin handler stack
- `backend/internal/models/admin_content.go` - create and enrichment DTOs including relation payload fields

### Edit-route integration points
- `frontend/src/app/admin/anime/[id]/edit/page.tsx` - edit page composition and AniSearch insertion point
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx` - existing edit metadata workspace and likely host for AniSearch controls
- `frontend/src/app/admin/anime/create/anisearchCreateEnrichment.ts` - current create-side enrichment helper patterns to adapt

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AniSearchClient.FetchAnime(...)` and `AnimeCreateEnrichmentService.Enrich(...)` already cover AniSearch crawling, normalization, and relation matching.
- The current edit-route metadata workspace already has the right visual neighborhood for an AniSearch control surface without inventing a separate admin page.

### Established Patterns
- Create-time AniSearch enrichment already established strict merge ordering and source-based duplicate detection in Phase 9.
- The edit route should stay explicit and operator-controlled: load enrichment into draft state first, then save through the normal mutation path.
- Relation persistence should happen only for locally resolvable approved relation types, matching the create-flow constraints.

### Integration Points
- Edit-route AniSearch work should plug into the already instantiated `enrichmentService` instead of creating a parallel AniSearch backend path.
- Create-route relation persistence should connect to the post-create save path so AniSearch matches become durable once the anime exists.

</code_context>

<specifics>
## Specific Ideas

- Edit-route AniSearch should feel like an intentional enrichment tool, not a hidden debug form. The UI should clearly communicate overwrite behavior and any protected-field behavior.
- Relation persistence should fail soft for unresolved AniSearch relations and should never block the operator from completing a normal save.
- Section comments should explain what a block is responsible for, and helper comments should explain why a function exists or when it should be used. Avoid noisy line-by-line comments.

</specifics>

<deferred>
## Deferred Ideas

- Free AniSearch search or browse UX on create or edit - still out of scope
- Public-facing AniSearch source display or browse tools - separate phase
- Broader metadata taxonomy expansion beyond the approved relation and enrichment use cases

</deferred>

---

*Phase: 11-anisearch-edit-enrichment-and-relation-persistence*
*Context gathered: 2026-04-08*
