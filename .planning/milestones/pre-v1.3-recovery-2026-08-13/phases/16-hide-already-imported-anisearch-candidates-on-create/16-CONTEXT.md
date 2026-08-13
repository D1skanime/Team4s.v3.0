# Phase 16: Hide Already Imported AniSearch Candidates On Create - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 16 hardens the AniSearch title-search branch on `/admin/anime/create`.

This phase covers:
1. Filtering AniSearch title-search candidates so entries whose `anisearch:{id}` source already exists locally do not appear as normal new-create hits.
2. Reusing the existing local AniSearch ownership seam instead of inventing a second duplicate policy just for title search.
3. Keeping the create UI honest when AniSearch found raw hits but every usable candidate was hidden because those anime already exist locally.

This phase does not change the exact-ID draft load, duplicate redirect after explicit load, or the save/create seam.
This phase also does not reopen AniSearch relation follow-through or Phase-15 asset-search work.

</domain>

<decisions>
## Implementation Decisions

### Duplicate Visibility Rule
- **D-01:** AniSearch title-search candidates whose `anisearch:{id}` source already belongs to a local anime must not appear as ordinary selectable create candidates.
- **D-02:** The authoritative filtering point is the backend AniSearch search seam, not a frontend-only cosmetic hide rule.
- **D-03:** The filter should reuse the existing local source-ownership lookup behavior already used by AniSearch duplicate redirect handling.

### Create-Flow Behavior
- **D-04:** Explicit exact-ID load keeps the current redirect behavior when an AniSearch ID already exists locally; this phase only changes the earlier title-search candidate list.
- **D-05:** AniSearch title search remains a chooser, but the chooser must never imply an already-owned AniSearch entry is safe to create as new.
- **D-06:** If AniSearch returns raw results but all are filtered as already imported, the create surface should explain that existing local anime were intentionally hidden.

### Scope Discipline
- **D-07:** Keep the change narrow to AniSearch create title search; do not widen into edit-route duplicate UX, relation work, or asset-search changes.
- **D-08:** Prefer batch-oriented source resolution so one title search does not degrade into avoidable per-candidate duplicate lookups.
- **D-09:** Existing DTO and controller seams should only widen if needed to support operator-visible filtered-result feedback.

### the agent's Discretion
- Exact naming of any helper that resolves existing AniSearch ownership for a candidate batch
- Exact empty-state wording, as long as it distinguishes "no AniSearch hits" from "hits existed but were hidden because they already exist locally"
- Whether filtered-result feedback uses a dedicated count field or another equally explicit backend-to-frontend signal

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and roadmap context
- `.planning/ROADMAP.md` - current milestone order and new Phase 16 placement
- `.planning/STATE.md` - current project position after Phase 15 and the new follow-up planning target
- `AGENTS.md` - repo-local rules and current open thread

### Existing AniSearch create seams
- `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-CONTEXT.md` - locked AniSearch create decisions and duplicate redirect policy
- `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-01-PLAN.md` - create AniSearch helper and precedence contract
- `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-03-PLAN.md` - current AniSearch create UI and duplicate-card behavior

### Current create-route implementation
- `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` - AniSearch title-search controls and candidate chooser
- `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx` - current AniSearch create card regressions
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` - create-route AniSearch search state and candidate handling
- `frontend/src/app/admin/anime/create/page.test.tsx` - rendered create-route expectations
- `frontend/src/lib/api/admin-anime-intake.ts` - typed AniSearch search helper used by the create route
- `frontend/src/types/admin.ts` - AniSearch create search DTOs

### Backend ownership and search seams
- `backend/internal/handlers/admin_content_anime_enrichment_search.go` - AniSearch title-search HTTP handler
- `backend/internal/services/anime_create_enrichment.go` - AniSearch create service including duplicate redirect and title-search candidate shaping
- `backend/internal/services/anime_create_enrichment_test.go` - service regressions around duplicate ownership and AniSearch search behavior
- `backend/internal/repository/admin_content_anisearch.go` - source ownership lookup helpers including batched source resolution
- `backend/internal/models/admin_content.go` - AniSearch create search models and source-match DTOs

</canonical_refs>

<specifics>
## Specific Ideas

- The current service method `SearchAniSearchCandidates(...)` maps raw AniSearch crawler results straight into API candidates without filtering against local `anisearch:{id}` ownership.
- The repository already has a batched source lookup seam (`ResolveAdminAnimeRelationTargetsBySources(...)`) that can anchor duplicate suppression without inventing a new storage path.
- The create AniSearch card already distinguishes duplicate redirect after explicit load; Phase 16 should make the earlier title-search step consistent with that ownership rule.

</specifics>

<deferred>
## Deferred Ideas

- Showing hidden duplicates as a separate advanced review list with redirect CTAs
- Reworking AniSearch requirements or broader search UX beyond this narrow duplicate-visibility correction
- Broader create-route search improvements unrelated to existing AniSearch ownership

</deferred>

---

*Phase: 16-hide-already-imported-anisearch-candidates-on-create*
*Context gathered: 2026-04-15*
