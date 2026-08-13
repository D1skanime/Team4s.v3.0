# Phase 10: Create Tags And Metadata Card Refactor - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 covers the create-route metadata work only:

1. Add normalized tag persistence for anime create, analogous to the existing normalized genre model.
2. Make tags visibly editable on `/admin/anime/create` through their own metadata card with manual input and suggestion-based filling.
3. Refactor the create metadata composition so the page stays maintainable and no single page file grows beyond 700 lines.

This phase does not implement AniSearch edit enrichment, does not persist AniSearch relations beyond existing create behavior, and does not add public-facing tag browsing.

</domain>

<decisions>
## Implementation Decisions

### Create Tags Data Model
- **D-01:** Tags are added as a normalized metadata store, structurally analogous to genres.
- **D-02:** The database must get dedicated `tags` and `anime_tags` tables, with constraints and indexes equivalent in spirit to `genres` and `anime_genres`.
- **D-03:** Tag persistence is authoritative like genre persistence: saving create metadata replaces the anime's tag links with the submitted normalized set.
- **D-04:** Tag normalization must deduplicate, trim, and sort values the same way the genre pipeline already does.
- **D-05:** The create and delete paths must treat `anime_tags` as first-class metadata so tag links are created and removed together with the anime lifecycle.

### Create Tags UI
- **D-06:** Tags must be visibly editable on the create page as their own metadata card, not as a hidden payload-only field.
- **D-07:** The create tags UI must support both manual free-text entry and click-based filling from suggestions, analogous to the current genre workflow.
- **D-08:** The tags card should visually match the genre card pattern closely enough that the metadata section feels consistent, but it must remain a separate card so genres and tags are distinct concepts.
- **D-09:** Existing provider preview tags should hydrate into the same create tag tokens so imported metadata and manual additions converge in one UI.

### API And Reuse Strategy
- **D-10:** Backend tag handling should reuse the authoritative genre write pattern as the primary reference implementation instead of inventing a second metadata persistence style.
- **D-11:** Frontend create-page tags should reuse or extract from the existing genre chip and suggestion card pattern instead of introducing a one-off control.
- **D-12:** If a token endpoint is needed for tags, it should mirror the genre token endpoint shape so frontend state management stays parallel.

### Code Quality Guardrails
- **D-13:** No single page component should exceed 700 lines after this phase. If needed, logic must be split into focused components, hooks, or helper modules.
- **D-14:** New or substantially touched code should include short explanatory comments for major sections and non-obvious helper functions so future maintainers understand purpose, not just mechanics.
- **D-15:** Frontend work for this phase must include a lightweight UI contract before implementation details sprawl. The planner should treat that contract as required input for the create-page tags card.

### the agent's Discretion
- Exact naming of the new tag token endpoint and repository helpers
- Whether the tags card is implemented by extracting a generic token-card component or by composing a sibling card around the current genre building blocks
- Exact helper text wording and card placement inside the create metadata section
- Exact distribution of responsibilities between page component, local hook, and metadata card components as long as the 700-line page limit is respected

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and planning
- `.planning/ROADMAP.md` - milestone ordering and new Phase 10 goal
- `.planning/REQUIREMENTS.md` - current milestone requirement set and the remaining requirement-mapping gap for tags
- `.planning/STATE.md` - active phase pointer after the AniSearch deferral split

### Authoritative metadata patterns
- `backend/internal/repository/admin_content.go` - authoritative genre persistence pattern to mirror for tags
- `backend/internal/repository/admin_content_anime_metadata.go` - normalized metadata merge and write behavior for create and patch flows
- `backend/internal/repository/admin_content_anime_delete.go` - delete lifecycle cleanup path that must include tag links
- `database/migrations/0019_add_reference_data_tables.up.sql` - normalized `genres` reference-table precedent
- `database/migrations/0022_add_junction_tables.up.sql` - normalized `anime_genres` junction-table precedent

### Create-page UI reuse
- `frontend/src/app/admin/anime/create/page.tsx` - current create-page composition and known size pressure that must be reduced
- `frontend/src/app/admin/anime/components/CreatePage/AnimeCreateGenreField.tsx` - create-side genre chip and suggestion card pattern to mirror for tags
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx` - metadata card layout where the tags card must live
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditGenreSection.tsx` - richer token-input pattern for reusable autocomplete behavior

### Supporting models
- `backend/internal/models/admin_content.go` - create DTOs that already carry tag-related fields
- `frontend/src/types/admin.ts` - admin create and edit draft types to keep aligned with the new tags card

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AnimeCreateGenreField` already provides the create-page card, chip, and suggestion interaction model that tags should mirror.
- `AnimeEditGenreSection` and `AnimeEditWorkspace` already implement a more advanced token autocomplete flow that can inform reusable tag interactions if the create pattern needs keyboard refinement.
- `replaceAuthoritativeAnimeGenres(...)` in `backend/internal/repository/admin_content.go` is the clearest backend reference for how normalized tags should be inserted and re-linked.

### Established Patterns
- Normalized anime metadata in this codebase currently uses reference tables plus junction tables (`genres` / `anime_genres`) rather than inline JSON blobs.
- Create-page metadata is drifting too large inside one page component, so this phase should prefer extracting focused UI sections and hooks instead of adding more inline state to the page file.
- Admin metadata inputs use chip and token interfaces with dedupe and suggestion lists rather than plain comma-separated textareas when the values are intended to be curated.

### Integration Points
- Backend create persistence must extend the same metadata write path that currently handles genres.
- Backend delete cleanup must remove `anime_tags` relations when anime rows are deleted.
- Frontend create metadata section in `ManualCreateWorkspace` is the intended home for the new tags card.

</code_context>

<specifics>
## Specific Ideas

- Tags should feel like genres in the create flow: visible card, chip list, suggestion clicks, and manual add in one place.
- The current create page should be treated as a refactor boundary during implementation. Adding tags without splitting structure would violate the agreed page-size guardrail.
- Section comments should explain what a block is responsible for, and helper comments should explain why a function exists or when it should be used. Avoid noisy line-by-line comments.

</specifics>

<deferred>
## Deferred Ideas

- AniSearch edit enrichment and relation persistence - moved to Phase 11
- Public-facing tag browsing and filtering - separate phase
- Generalized metadata token system for genres, tags, studios, themes, and more - future refactor once genres and tags are both stable

</deferred>

---

*Phase: 10-create-tags-and-metadata-card-refactor*
*Context gathered: 2026-04-08*
