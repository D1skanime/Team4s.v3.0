# DECISIONS

## 2026-04-28 - Segment Types Stay Generic And Naming Carries The Human Distinction

### Decision
Use generic segment types (`OP`, `ED`, `Insert`, `Outro`) and let the free name field carry distinctions such as `Naruto OP 1`, `Naruto Final OP`, or `Creditless Ending`.

### Context
The earlier segment/type work exposed rigid values like `OP1`, `OP2`, `ED1`, and `ED2`. That matched an internal seeded theme-type model more than the real operator workflow and made later cases feel artificial.

### Options Considered
- keep fixed enumerations like `OP1`, `OP2`, `ED1`, `ED2`
- switch to generic types plus free naming in the UI and normalized generic types in the DB

### Why This Won
Generic types fit both the reference UI and real usage better. They avoid artificial limits and let the operator decide how to distinguish variants while the system still keeps a simple type axis for timeline and filtering.

### Consequences
- UI type selectors should stay generic
- DB/runtime mappings should not drift back into operator-facing `OP1/ED1` semantics
- segment identity becomes `type + optional free name + release context + episode range`

### Follow-ups Required
- keep later segment-file and playback work aligned with the generic type model

## 2026-04-28 - Segment Structure Lives On Episode-Version Edit, Not On A Separate Anime Themes Screen

### Decision
Treat the anime-level `/admin/anime/:id/themes` screen as legacy/redirected and keep active segment structure work on `/admin/episode-versions/:id/edit`.

### Context
The earlier OP/ED/theme work had drifted into a mixed anime-theme/fansub-theme flow that was not the real operator context. The actual behavior needed to be tied to a concrete release combination: anime, episode, group, and version.

### Options Considered
- keep a parallel anime-level themes management surface
- retire it from the active workflow and anchor segment work on episode-version edit

### Why This Won
Segment timing and applicability only really make sense in release context. Keeping two competing admin surfaces would confuse operators and split the truth.

### Consequences
- the anime themes page should not remain an active maintenance screen
- segment range logic must be validated on episode-version routes
- later file-upload and playback work should build from the episode-version context

### Follow-ups Required
- if future fansub-self-service upload surfaces are added, they should still reuse this release-context model

## 2026-04-28 - Segment Files Are Team4s-Owned Release Assets, Not Primarily Jellyfin Upload Targets

### Decision
Store OP/ED/Insert files as Team4s-owned assets referenced by `release_asset`, with the segment holding only the source metadata/reference.

### Context
There was open uncertainty whether segment files should be selected from Jellyfin, stored in Jellyfin conventions, or managed directly by Team4s. The release-context segment workflow and later fansub rights model pointed toward Team4s-managed assets instead.

### Options Considered
- make Jellyfin the primary upload/storage model for segment sources
- treat Jellyfin only as optional context and store segment files as Team4s assets

### Why This Won
Team4s-owned assets fit the permission model better, are easier to name/control, and do not depend on Jellyfin-specific folder or API assumptions for the core workflow.

### Consequences
- Phase 26 upload/persistence work should target Team4s assets first
- source labels should expose concrete uploaded file information in the admin UI
- future playback can build on the same media/asset references without changing the storage truth

### Follow-ups Required
- later fansub-self-service upload should reuse the same underlying asset/reference seam

## 2026-04-24 - Collaboration Records Stay Persisted But Do Not Belong In The Default Fansub Group List

### Decision
Keep persisted collaboration records such as `AnimeOwnage & Project Messiah` for release/version wiring, but hide them from the standard `/admin/fansubs` management list so that default list stays focused on real fansub groups.

### Context
Phase 21 introduced deterministic collaboration persistence when multiple fansub groups are attached to one release version. That behavior is correct for release modeling, but in the regular fansub admin list those collaboration rows looked like ordinary groups and confused the operator.

### Options Considered
- show collaborations in the same default group list as normal fansub groups
- keep collaborations persisted but remove them from the default everyday group-management view

### Why This Won
The normal fansub list is primarily an operator surface for real groups. Collaboration rows are a release-level modeling detail and become misleading when presented as if they were first-class standalone groups in the same everyday list.

### Consequences
- collaboration rows can continue to exist in `fansub_groups` with `group_type='collaboration'`
- default fansub admin listing now hides them
- release/version wiring can still use the collaboration record internally

### Follow-ups Required
- if collaboration administration is needed later, give it a separate explicit view instead of reusing the normal group list

## 2026-04-24 - Anime Edit Must Copy The Create Interaction Model Instead Of Preserving Legacy Edit-Specific UI

### Decision
Anime edit should reuse the create-flow interaction model directly and remove stale edit-specific helper surfaces instead of wrapping the old edit experience in a new shell.

### Context
The first Phase-22 implementation still left too much of the old edit route behavior intact. Live operator feedback showed that the page still felt like the old editor, just rearranged.

### Options Considered
- keep adapting the old edit page incrementally
- take create as the real foundation and subtract legacy-only edit clutter aggressively

### Why This Won
Create already reflects the intended operator workflow. Reusing that model is simpler, easier to learn, and less likely to keep dragging old assumptions forward.

### Consequences
- top provenance banners and duplicate save affordances are not worth keeping by default
- Jellyfin reselection in edit should behave like create rather than like a special sync tool
- future edit refinements should start from shared create-style sections, not from old edit-only widgets

### Follow-ups Required
- finish Phase 22 by deciding whether the remaining source/context card is now lean enough to verify and close
