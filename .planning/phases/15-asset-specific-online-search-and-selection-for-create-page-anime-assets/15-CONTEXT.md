# Phase 15: Asset-Specific Online Search And Selection For Create-Page Anime Assets - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 15 extends `/admin/anime/create` so asset slots can search external artwork sources directly from the create page instead of relying only on manual upload or whatever Jellyfin already has.

This phase covers:
1. adding an `Online suchen` path beside the existing upload/preparation flow for `cover`, `banner`, `logo`, and `background`
2. defining a curated source strategy per asset type instead of pretending one site covers every asset well
3. searching external sources for the current AniSearch-specific anime entry, including OVA/OAD/bonus/web/special cases that do not map cleanly to media-server season buckets
4. showing candidate results in an operator-driven chooser with visible source attribution, preview images, and loading state
5. adopting selected external results into the unsaved create draft while keeping the current upload-first/manual-authority model

This phase does not replace the existing upload seam, does not redesign the edit route, and does not require one provider to solve every asset type. It also does not attempt broad free-crawl scraping across arbitrary sites; the first delivery should use a curated initial provider set with explicit request discipline.

</domain>

<decisions>
## Implementation Decisions

### Product Shape
- **D-01:** Each asset area keeps the current upload/preparation path and gains a parallel `Online suchen` action instead of replacing upload.
- **D-02:** Asset search is per slot, not one global search field for all media.
- **D-03:** The search UI should open as a modal/dialog or equivalent focused chooser instead of permanently expanding four noisy search forms on the page.
- **D-04:** The create route still updates only the draft first; external asset adoption remains unsaved until the operator explicitly creates the anime.

### Selection Rules
- **D-05:** `cover`, `banner`, and `logo` remain single-select assets.
- **D-06:** `background` supports selecting multiple results into the draft.
- **D-07:** If multiple backgrounds are selected, the UX may optionally mark one as the primary/default background, but multi-select support matters more than primary-marking polish in this phase.

### Result Presentation
- **D-08:** Search results from multiple sources may appear in one combined chooser, but each result must show its source clearly.
- **D-09:** Source visibility matters; operators should not see one blind wall of 100 images with no source attribution.
- **D-10:** Each result row/card should show at least image preview, source, and enough metadata to compare candidates sensibly.
- **D-11:** Source filters are optional, but source badges or labels are mandatory.

### Busy And Request State
- **D-12:** Asset search must show a busy/loading state while crawling or querying external sources.
- **D-13:** Search actions should disable repeated clicks while the active request is running.
- **D-14:** The operator should be able to tell that the system is busy even when results are not yet available.

### Source Strategy
- **D-15:** The system should use different preferred sources per asset type instead of forcing one source for everything.
- **D-16:** Cover and background are expected to be easier to automate than logo and banner.
- **D-17:** For OVA/OAD/bonus/web/special entries, AniSearch identity stays the canonical match anchor; external media-server grouping must not collapse those entries back into generic `Specials`.
- **D-18:** The first implementation should support a curated initial provider set and leave room to add more providers later through one shared adapter/orchestrator seam.
- **D-19:** Sources that behave more like imageboards than structured asset databases may still be useful for cover/background fallback, but should not be treated as equally strong for logo/banner.

### Current Source Direction
- **D-20:** `fanart.tv` is the leading structured candidate for `logo` and often `banner`.
- **D-21:** `TMDB` remains a strong candidate for `cover` and `background`.
- **D-22:** Anime-specific image pools such as `Zerochan` are worth considering for cover/background fallback, especially for niche OVA/OAD/bonus entries.
- **D-23:** Source evaluation is part of this phase; the final initial source list should be locked before crawler implementation is treated as complete.

### the agent's Discretion
- Exact modal layout, as long as the slot-specific search remains clearly separate from upload and visibly source-aware
- Exact metadata shown on each result, as long as source and preview remain obvious
- Exact background multi-select UX, as long as multiple results can be adopted intentionally

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and project guardrails
- `.planning/ROADMAP.md` - Phase ordering, current milestone direction, and Phase 15 success criteria
- `.planning/REQUIREMENTS.md` - current upload/enrichment requirement baseline that Phase 15 extends without replacing
- `.planning/PROJECT.md` - admin workflow principles and operator-control guardrails
- `.planning/STATE.md` - milestone and roadmap evolution history
- `AGENTS.md` - current project workflow notes and v1.1 focus

### Prior create-route foundations to preserve
- `.planning/phases/07-generic-upload-and-linking/07-04-PLAN.md` - existing create-route manual asset upload reachability and slot model
- `.planning/phases/12-create-anisearch-intake-reintroduction-and-draft-merge-control/12-CONTEXT.md` - create draft precedence and AniSearch-specific create identity rules
- `.planning/phases/14-create-provider-search-separation-and-result-selection/14-CONTEXT.md` - recent provider-search separation decisions on `/admin/anime/create`
- `.planning/phases/14-create-provider-search-separation-and-result-selection/14-UI-SPEC.md` - current create-page provider UI contract style

### Current create-route code seams
- `frontend/src/app/admin/anime/create/page.tsx` - create-page composition and current asset panels
- `frontend/src/app/admin/anime/create/page.module.css` - existing styling for create-page cards and modal-like surfaces
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx` - create workspace shell and card placement
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` - create controller state and current provider actions
- `frontend/src/lib/api/admin-anime-intake.ts` - existing create-route API helper family
- `frontend/src/types/admin.ts` - shared DTOs for create and asset-related admin payloads

### Backend seams to extend
- `backend/cmd/server/admin_routes.go` - current admin route registration
- `backend/internal/handlers/admin_content_handler.go` - handler dependency wiring
- `backend/internal/models/admin_content.go` - DTOs for admin create/intake payloads
- `backend/internal/services/anime_create_enrichment.go` - create-time enrichment orchestration patterns worth mirroring for asset search orchestration

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 07 already established the create-route asset-slot model and the manual upload seam that Phase 15 must preserve.
- Phase 12 and Phase 14 proved the current create route prefers draft-first provider actions over hidden persistence side effects.
- The create route is already card-oriented and controller-driven, which gives Phase 15 a clean place to add slot-specific search actions without inventing a second page.

### Established Patterns
- Operators choose an action, review the result locally, and save explicitly later.
- Provider or search activity should stay card-local and operator-visible rather than silently mutating the draft.
- Shared helper modules and typed DTOs are preferred over ad hoc per-card fetch logic.

### Integration Points
- Each asset slot already has a visible staging area; `Online suchen` should live next to those slot actions instead of in a disconnected toolbar.
- The controller should own search/query/loading state so the page remains a composition layer.
- The backend needs one adapter-friendly asset search seam rather than bespoke fetch code in multiple handlers.

</code_context>

<specifics>
## Specific Ideas

- `cover`, `banner`, `logo`, and `background` each get an `Online suchen` action that opens a focused chooser.
- Search results may be mixed into one list, but every result keeps a visible source badge such as `TMDB`, `fanart.tv`, or `Zerochan`.
- A busy spinner or similar loading state should be shown while the system is searching, so the operator knows the app is still working.
- Background search should support adopting more than one result into the draft because a single anime entry may need a small background set.
- Logo and banner sources for niche OVA/bonus entries may return no good results; the UX should handle empty or weak result sets cleanly rather than pretending a result always exists.

</specifics>

<deferred>
## Deferred Ideas

- Full-source support for every candidate website discussed so far; Phase 15 can ship with a smaller curated initial set and grow later
- Fully automated crawling of official publisher sites or social posts
- Edit-route asset search parity

</deferred>

---

*Phase: 15-asset-specific-online-search-and-selection-for-create-page-anime-assets*
*Context gathered: 2026-04-13*
