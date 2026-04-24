# DECISIONS

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
