# Phase 3: Jellyfin-Assisted Intake - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers Jellyfin-assisted anime creation as a preview-only intake flow. Admins search or select a Jellyfin candidate, inspect enough visual and path evidence to choose the correct match, land in the same shared draft editor used by manual create, and decide what to keep before any Team4s anime record is saved. Full AniSearch enrichment, full provenance behavior, resync ownership logic, and productionized manual upload flows for every asset slot remain outside this phase.

</domain>

<decisions>
## Implementation Decisions

### Jellyfin trigger model
- **D-01:** The create draft keeps the anime-name input as the anchor field and exposes two adjacent source actions: `Jellyfin Sync` and `AniSearch Sync`.
- **D-02:** Both source buttons are disabled until the admin has typed something meaningful into the anime-name field.
- **D-03:** In Phase 3, `AniSearch Sync` is only a prepared button or placeholder. The real AniSearch fetch logic comes later.

### Jellyfin source selection
- **D-04:** Jellyfin candidate selection starts from a lightweight dropdown-style first choice rather than a separate heavy search surface.
- **D-05:** The admin uses the folder or order name as the primary match signal for picking the right Jellyfin source.
- **D-06:** Exact or stronger matches should be shown first when helpful, but the admin still chooses the final candidate manually.

### Candidate evidence and selection UI
- **D-07:** Jellyfin candidates should be presented as a clean, card-based UI rather than a plain list or table because visual confidence is essential here.
- **D-08:** Each candidate must show enough evidence to verify the match: title, Jellyfin ID, full path, library or parent-order context, and type hints.
- **D-09:** Candidate cards must include visual previews for poster, banner, logo, and background so the admin can judge the source quality before import.

### Draft handoff and asset handling
- **D-10:** After the admin chooses a Jellyfin candidate, the existing shared draft screen opens immediately and is already prefilled.
- **D-11:** Asset inclusion or exclusion does not happen on the candidate card. All available Jellyfin assets can flow into the prefilled draft first, and the admin removes unwanted assets there.
- **D-12:** The central save bar from earlier phases remains the only save model for Jellyfin-assisted create as well.
- **D-13:** Once the admin takes over a Jellyfin match, the competing candidate matches should no longer remain visible in the UI.
- **D-14:** The draft title should be initialized from the Jellyfin folder name rather than the Jellyfin display title.
- **D-15:** The folder-name title seed remains editable; the admin can still adjust the title manually before save.

### Type suggestion and cross-source hints
- **D-16:** Jellyfin-derived anime type remains a suggestion only, never a hard assignment.
- **D-17:** The suggested type should include a visible explanation based on path or naming context so the admin understands why it was proposed.
- **D-18:** When multiple sources later disagree, the UI should show the competing source hints while leaving the actual field fully editable by the admin.

### the agent's Discretion
- Exact visual layout of the Jellyfin candidate cards, as long as the evidence and preview density stay high and the interaction remains clear.
- Whether the first-step chooser is implemented as a lightweight dropdown, command palette, or similar compact picker, as long as it still feeds into the richer candidate review and draft handoff.
- Exact ranking rules for stronger vs weaker Jellyfin matches, as long as the admin still has explicit manual control over the final choice.

</decisions>

<specifics>
## Specific Ideas

- The user wants the Jellyfin-assisted intake UX to feel especially polished, with a clean and dependable review flow.
- The user explicitly wants visual previews for poster, banner, logo, and background during source selection, not only metadata text.
- After takeover, the chosen Jellyfin match should become the only active source in view rather than leaving all alternate matches on screen.
- The folder name should seed the draft title, but that title must stay manually editable.
- The user expects AniSearch to later correct or override Jellyfin-derived interpretation for cases like bonus episodes, OVAs, TV specials, and sequels, because Jellyfin thinks in seasons while anime catalog sources think in separate products.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase framing
- `.planning/PROJECT.md` - Core value, admin-only audience, preview-before-save policy, and cross-phase ownership constraints.
- `.planning/REQUIREMENTS.md` - Phase 3 requirement targets: `INTK-03`, `JFIN-01`, `JFIN-02`, `JFIN-04`, `JFIN-05`, `JFIN-06`.
- `.planning/ROADMAP.md` - Phase 3 goal, dependency order, and success criteria.
- `.planning/STATE.md` - Carry-forward decisions and current milestone position.

### Carry-forward context
- `.planning/phases/01-ownership-foundations/01-CONTEXT.md` - Shared editor, central save bar, and lightweight ownership baseline decisions that Phase 3 must reuse.
- `.planning/phases/02-manual-intake-baseline/02-VERIFICATION.md` - Current state of the shared manual draft flow that Jellyfin-assisted intake should build on.

### Existing Jellyfin and intake seams
- `frontend/src/app/admin/anime/create/page.tsx` - Current manual create draft surface that Phase 3 should reuse rather than replace.
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx` - Current shared create workspace composition that will receive Jellyfin-prefilled state.
- `frontend/src/app/admin/anime/components/JellyfinSync/JellyfinSyncPanel.tsx` - Existing Jellyfin-oriented UI seam and prior behavior to reuse or simplify.
- `frontend/src/app/admin/anime/hooks/useJellyfinSync.ts` - Public Jellyfin sync hook seam for the admin anime area.
- `frontend/src/app/admin/anime/hooks/internal/useJellyfinSyncImpl.ts` - Existing Jellyfin implementation details and feedback handling.
- `frontend/src/lib/api.ts` - Admin Jellyfin search, preview, and sync API client seams already available in the frontend.
- `frontend/src/lib/api/admin-anime-intake.ts` - Create-from-draft API seam for Jellyfin-assisted intake saves.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `frontend/src/app/admin/anime/create/page.tsx`: already has the shared create draft state and route entry that Jellyfin-assisted creation can extend.
- `frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx`: already composes the shared create experience and can absorb Jellyfin-prefilled values.
- `frontend/src/app/admin/anime/components/JellyfinSync/JellyfinSyncPanel.tsx`: already contains Jellyfin-oriented interaction ideas, response handling, and UI seams.
- `frontend/src/app/admin/anime/hooks/useJellyfinSync.ts` and `frontend/src/app/admin/anime/hooks/internal/useJellyfinSyncImpl.ts`: existing hook seam for Jellyfin preview or sync behavior and error handling.
- `frontend/src/lib/api.ts`: already exposes `searchAdminJellyfinSeries`, `previewAdminAnimeFromJellyfin`, and `syncAdminAnimeFromJellyfin`.

### Established Patterns
- Create and edit now share one editor shell and one save bar rather than diverging screens.
- Frontend admin behavior is already split into route components, helper hooks, and small reusable sections.
- Shared API calls are routed through `frontend/src/lib/api.ts` rather than scattered raw fetch calls.
- Jellyfin integration already has search, preview, and sync client seams, so Phase 3 should focus on product behavior and UI flow rather than inventing new transport contracts.

### Integration Points
- The phase should plug into the existing `/admin/anime/create` flow instead of creating a fully separate product surface.
- Jellyfin source selection should hand off into the same draft-state model now used for manual create.
- Existing Jellyfin hooks and API functions are the natural integration points for candidate lookup, preview payloads, and later source-linked state.

</code_context>

<deferred>
## Deferred Ideas

- Real AniSearch fetch and merge behavior - deferred to a later phase even though the trigger button should appear now.
- Full source provenance UI and fill-only resync logic - Phase 4.
- Full manual upload parity for non-cover assets - later phase.
- Per-asset manual upload buttons that create contract-compliant asset folders or files named with the anime ID - deferred to a later asset phase.
- Broader source conflict resolution rules between Jellyfin and AniSearch beyond visible hints - later phase.

</deferred>

---

*Phase: 03-jellyfin-assisted-intake*
*Context gathered: 2026-03-31*
