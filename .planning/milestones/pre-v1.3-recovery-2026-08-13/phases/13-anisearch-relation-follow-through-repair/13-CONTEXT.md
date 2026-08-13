# Phase 13: AniSearch Relation Follow-Through Repair - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 13 repairs the missing AniSearch relation follow-through in the create flow.

This phase covers:
1. Making sure AniSearch-resolved relations from the create draft survive until the final create submit
2. Making sure those relations are actually persisted after anime creation
3. Making sure operator-visible feedback matches the real persisted relation outcome

This phase does not reopen the verified Phase 12 AniSearch intake UI, duplicate redirect behavior, or broader edit-route refactor work.

</domain>

<decisions>
## Implementation Decisions

### Relation Source And Meaning
- **D-01:** AniSearch relations for Phase 13 come from the AniSearch dataset of the anime that is currently being loaded in the create flow.
- **D-02:** The system must not invent relations locally; it may only persist relations that AniSearch actually delivered for the newly loaded anime.
- **D-03:** The system should first try to resolve relation targets locally via `anisearch:{id}` and only then fall back to title matching, following the existing service behavior.

### Relation Persistence Contract
- **D-04:** The missing part in Phase 13 is the real create-time relation follow-through, not just warning text polish.
- **D-05:** After `AniSearch laden`, locally resolvable approved relations must remain attached to the create draft and be carried through the final create submit.
- **D-06:** After the anime row is created, those carried relations must be persisted through the existing normalized relation persistence seam instead of staying draft-only.
- **D-07:** Anime creation must remain non-blocking even if relation follow-through partially fails; failures degrade to warning metadata instead of aborting the new anime.

### Allowed Relation Behavior
- **D-08:** Only the already approved relation labels are in scope; Phase 13 does not expand the relation taxonomy.
- **D-09:** Only locally resolvable relation targets are persisted; unresolved targets are skipped and must not trigger local auto-creation of missing anime.
- **D-10:** Phase 13 stores only the directed relation that AniSearch actually provides for the newly loaded anime.
- **D-11:** Phase 13 must not automatically create a reverse relation or infer a mirrored counter-relation.

### Operator Feedback
- **D-12:** Operator feedback must describe the real persistence outcome after create, not only draft-time assumptions.
- **D-13:** `skipped_existing` should be treated as a clean idempotent outcome, not as an automatic failure, when the attempted relations are otherwise fully accounted for.
- **D-14:** Browser/UAT verification for this phase must confirm that the relation exists after save, not only that a summary message was shown during create.

### Scope Guardrails
- **D-15:** Phase 13 is a create-follow-through repair phase, not another create-UI redesign phase.
- **D-16:** Phase 13 must not add AniSearch title search, free browsing, or any broader provider UX changes.
- **D-17:** Phase 13 must not reopen duplicate redirect behavior from Phase 12 unless relation repair directly requires it.

### the agent's Discretion
- Exact wording of success and warning copy, as long as it reflects the real attempted/applied/skipped relation outcome
- Exact placement of regression coverage between frontend helper/controller tests and backend handler/repository tests
- Exact UAT steps used to confirm persisted relations, as long as they prove post-save reality rather than draft-only state

</decisions>

<specifics>
## Specific Ideas

- Example discussed: if `11eyes` already exists locally and the user creates a `11eyes` OVA via AniSearch, then AniSearch may deliver a relation from the OVA to the existing main series.
- In that case, the system should resolve the existing `11eyes` anime locally, keep that relation in the draft, and persist it after the OVA is created.
- The persisted relation should be the directed relation from the newly created anime to the existing target anime.
- The system should not auto-create the reverse direction on its own.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` - Phase 13 goal, requirements, and ordering after verified Phase 12
- `.planning/REQUIREMENTS.md` - ENR-05 and ENR-10 scope that Phase 13 must actually close
- `.planning/STATE.md` - current project state and durable decisions leading into the repair phase

### Verified predecessor state
- `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-VERIFICATION.md` - verified create AniSearch intake baseline that Phase 13 must preserve
- `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-HUMAN-UAT.md` - live browser confirmation of the current create flow before the relation repair
- `.planning/phases/11-anisearch-edit-enrichment-and-relation-persistence/11-02-PLAN.md` - prior relation persistence design and backend seam expectations

### Existing code seams
- `backend/internal/services/anime_create_enrichment.go` - AniSearch relation resolution and draft shaping
- `backend/internal/handlers/admin_content_handler.go` - create request contract, including `relations`
- `backend/internal/handlers/admin_content_anime.go` - create follow-through seam and AniSearch summary generation
- `backend/internal/repository/anime_relations_admin.go` - idempotent relation persistence helper and counters
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` - create controller holding AniSearch draft result and final create submit flow
- `frontend/src/app/admin/anime/create/createPageHelpers.ts` - final payload linkage and create success/warning copy
- `frontend/src/types/admin.ts` - shared create payload and AniSearch DTO contracts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AnimeCreateEnrichmentService.resolveRelations(...)` already resolves only approved, locally matchable AniSearch relations.
- `ApplyAdminAnimeEnrichmentRelationsDetailed(...)` already provides idempotent apply semantics and attempted/applied/skipped counts.
- `applyAniSearchCreateFollowThrough(...)` already exists as the backend create-side follow-through seam.

### Established Patterns
- Create remains draft-first until explicit save.
- AniSearch provenance continues to use `source='anisearch:{id}'`.
- The project prefers repairing existing seams instead of introducing alternate routes or relation stores.

### Integration Points
- The likely seam to repair is the final create payload path from `useAdminAnimeCreateController.ts` through `createPageHelpers.ts`.
- The backend follow-through should continue to consume `req.Relations` through the existing create handler and repository helper.
- Verification must include post-save relation existence, not only draft summaries.

</code_context>

<deferred>
## Deferred Ideas

- Automatic reverse-relation creation
- Expanded relation taxonomy beyond the four approved labels
- AniSearch title search and popup selection UX
- Broader create or edit UX redesign unrelated to relation follow-through

</deferred>

---

*Phase: 13-anisearch-relation-follow-through-repair*
*Context gathered: 2026-04-10*
