# Phase 14: Create Provider Search Separation And Result Selection - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 14 separates provider search from final form data on `/admin/anime/create`.

This phase covers:
1. giving Jellyfin its own dedicated search input instead of reusing the final title field
2. adding AniSearch title search alongside exact-ID entry
3. showing AniSearch candidate results before any detail crawl is performed
4. loading the chosen Jellyfin or AniSearch result into the create draft only after explicit operator selection
5. keeping the create-page provider UX consistent and understandable while preserving the existing draft-first, save-later flow

This phase does not redesign the edit route, does not change the existing Jellyfin preview/review behavior beyond separating its search input, and does not broaden AniSearch relation taxonomy or crawler scope beyond the create-page search/select flow.

</domain>

<decisions>
## Implementation Decisions

### Provider Search Separation
- **D-01:** The final anime title field on `/admin/anime/create` must no longer double as provider search state.
- **D-02:** Jellyfin gets its own dedicated search input inside the Jellyfin card.
- **D-03:** AniSearch gets its own dedicated search surface instead of depending only on the final title field or a hidden lookup path.
- **D-04:** Search terms, interim lookup text, and final form values are separate state and must not overwrite each other accidentally.

### Jellyfin Create Flow
- **D-05:** The existing Jellyfin review flow remains the product baseline for Phase 14.
- **D-06:** Phase 14 changes Jellyfin only by moving query entry into a dedicated Jellyfin card input; the rest of the search/review/preview flow should stay aligned with the current create experience.
- **D-07:** The Jellyfin search input sits directly inside the Jellyfin card rather than in the shared title area or a separate top-level toolbar.

### AniSearch Title Search
- **D-08:** AniSearch keeps explicit ID entry, but Phase 14 also adds title-based search by name.
- **D-09:** AniSearch title search must return a candidate list first; it must not immediately load one guessed record into the draft.
- **D-10:** AniSearch candidate selection opens through a popup/modal-style chooser rather than an always-expanded inline list.
- **D-11:** Each AniSearch candidate row must show at least title, type, year, and AniSearch ID so the operator can distinguish similar entries cleanly.
- **D-12:** The detailed AniSearch crawl happens only after the operator explicitly chooses one candidate from the result popup.

### Draft Handoff And Operator Feedback
- **D-13:** Once the operator chooses a Jellyfin or AniSearch result, the chosen provider data writes directly into the create draft.
- **D-14:** Even after provider data is written into the draft, the UI must continue to make it clear that nothing is saved yet.
- **D-15:** The chosen provider's resolved title becomes the actual draft title value; temporary search text must not survive as the stored title unless the operator edits it manually afterwards.

### Request Safety And Crawl Discipline
- **D-16:** AniSearch title search must avoid aggressive fan-out crawling and unnecessary detail requests.
- **D-17:** General title queries such as `Bleach` should fetch only a candidate list first; full detail fetch is reserved for the single chosen candidate.
- **D-18:** Phase 14 must preserve the existing guarded AniSearch posture from earlier phases instead of creating a free-crawl experience.

### Visual And UX Consistency
- **D-19:** Jellyfin and AniSearch must read as clearly separated provider areas with their own labels, controls, and state messaging.
- **D-20:** The create-page provider UX should feel consistent across both cards even though Jellyfin keeps its existing review flow and AniSearch uses a popup candidate chooser.

### the agent's Discretion
- Exact popup presentation for AniSearch candidate selection, as long as it is clearly operator-driven and shows title, type, year, and ID.
- Exact copy and inline helper wording, as long as the UI clearly separates provider search from final draft fields and continues to signal “not yet saved”.
- Exact component split between create page, provider cards, modal, controller hooks, and helper modules, as long as the create route stays modular and consistent with existing patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and project guardrails
- `.planning/ROADMAP.md` - Phase 14 scope, ordering, and success criteria
- `.planning/REQUIREMENTS.md` - current AniSearch and create-flow requirement baseline that Phase 14 extends
- `.planning/PROJECT.md` - admin workflow principles, operator-control rules, and modularity constraints
- `.planning/STATE.md` - current phase ordering and roadmap evolution context

### Prior create-route AniSearch decisions
- `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-CONTEXT.md` - current create AniSearch surface, merge priority, and reuse rules
- `.planning/phases/11-anisearch-edit-enrichment-and-relation-persistence/11-CONTEXT.md` - provisional lookup text rule and shared AniSearch reuse constraints
- `.planning/phases/13-anisearch-relation-follow-through-repair/13-CONTEXT.md` - verified Phase-13 create relation baseline that should not be reopened casually

### Current create-route code seams
- `frontend/src/app/admin/anime/create/page.tsx` - current create-page composition, title actions, and provider panel placement
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` - create controller state, Jellyfin query coupling, AniSearch create load, and draft application flow
- `frontend/src/app/admin/anime/create/createPageHelpers.ts` - current source action helper text, create payload linkage, and AniSearch/Jellyfin draft semantics
- `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` - current AniSearch create card that only supports exact-ID load
- `frontend/src/app/admin/anime/create/CreateJellyfinResultsPanel.tsx` - current Jellyfin candidate review panel
- `frontend/src/lib/api/admin-anime-intake.ts` - existing create intake API helpers for Jellyfin search/preview and AniSearch draft load

### Shared create workspace integration points
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx` - create workspace receiving title actions and provider hints
- `frontend/src/app/admin/anime/components/JellyfinIntake/JellyfinCandidateReview.tsx` - existing Jellyfin candidate review UI pattern to preserve or adapt
- `frontend/src/app/admin/anime/hooks/useManualAnimeDraft.ts` - create draft hydration behavior and provider merge touchpoints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CreateAniSearchIntakeCard.tsx` already provides the AniSearch card shell, operator feedback area, and dedicated exact-ID action seam.
- `CreateJellyfinResultsPanel.tsx` and `JellyfinCandidateReview.tsx` already provide the current Jellyfin candidate review experience that should remain largely intact.
- `useAdminAnimeCreateController.ts` already centralizes Jellyfin query state, AniSearch draft loading, draft hydration, and create submission, so Phase 14 can extend one controller seam instead of scattering search state across the page.
- `admin-anime-intake.ts` already contains the provider API helper family for Jellyfin search/preview and AniSearch draft load; AniSearch title search should likely live beside those helpers.

### Established Patterns
- The create route is controller-driven and draft-first: provider actions update the unsaved draft, then the operator still saves explicitly.
- Provider results are already shown as card-local/operator-visible status instead of silent background changes.
- Jellyfin currently derives its query from `createTitle`, which is the exact coupling Phase 14 must break.
- AniSearch currently only supports exact-ID create intake; title search is new, but it should reuse the same downstream draft-load seam after candidate selection.

### Integration Points
- Jellyfin search state currently enters through `jellyfinIntake.setQuery(createTitle)` in `useAdminAnimeCreateController.ts`; that coupling should be replaced with dedicated Jellyfin query state.
- `ManualCreateWorkspace` already exposes `titleActions` and `titleHint`, so provider card placement can stay within the current create-page composition.
- AniSearch title search needs a new candidate-list step before calling the existing `loadAdminAnimeCreateAniSearchDraft(...)` detail flow.
- The chosen provider result should still flow through the existing draft-application functions rather than inventing a second create-draft path.

</code_context>

<specifics>
## Specific Ideas

- Jellyfin should keep behaving like the current create route, but with its own search field inside the Jellyfin card rather than borrowing the final title field.
- AniSearch should open a popup chooser with rows that show title, type, year, and ID before any detail crawl is triggered.
- A general AniSearch query like `Bleach` should feel safe and deliberate: list candidates first, then fetch one chosen record.
- The final title field should represent the actual draft title only; search text belongs to provider-local inputs.

</specifics>

<deferred>
## Deferred Ideas

- Broader edit-route relation UX after the create-page provider search work
- Broader AniSearch crawler expansion or browse-style search beyond the controlled candidate-list flow
- Relation taxonomy expansion beyond the existing approved labels

</deferred>

---

*Phase: 14-create-provider-search-separation-and-result-selection*
*Context gathered: 2026-04-12*
