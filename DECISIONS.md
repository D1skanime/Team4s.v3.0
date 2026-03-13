# DECISIONS

## 2026-03-13

### Decision
Treat the checked-in OpenAPI contract as a release-blocking part of the live group-assets lane, not as optional follow-up documentation.

### Context
The public group-assets endpoint had already shipped richer payload fields than `shared/contracts/openapi.yaml` described, which meant docs and future consumers could implement against the wrong response despite the live route working.

### Options Considered
- Leave the contract drift in place until a later docs sweep
- Update the OpenAPI contract immediately to mirror the shipped response before continuing adjacent work

### Why This Won
The contract is part of the interface, not an afterthought. Fixing it now removes ambiguity for frontend work, future clients, and any generated schema consumers.

### Consequences
- `shared/contracts/openapi.yaml` now reflects the current group-assets payload shape
- Future payload changes on this endpoint should be updated in the contract in the same work slice
- The remaining group-assets follow-up shifts from schema drift to operational error mapping

### Decision
Paginate Jellyfin root-folder discovery for group assets instead of assuming the first 500 root items are sufficient.

### Context
The live group-assets lookup only fetched one Jellyfin `/Items` page with `Limit=500`, so valid group folders would eventually disappear once the library grew beyond that first page.

### Options Considered
- Keep single-page discovery and accept the implicit 500-folder ceiling
- Add paginated iteration for root-folder lookup and cover it with a regression test

### Why This Won
It fixes a real scaling limit without changing the public contract and makes the existing folder-matching approach viable for larger libraries.

### Consequences
- Group root discovery now walks multiple Jellyfin result pages when needed
- A regression test now protects the later-page lookup path
- Naming drift remains a separate risk even though paging is fixed

### Decision
Keep Team4s repo-local docs canonical for daily project state while using `.planning/` as the migration planning and execution layer.

### Context
The GSD pilot became useful once the schema brief and pilot handoff existed, but the repo already had a reliable day-start/day-closeout loop that covered more than the migration lane.

### Options Considered
- Move the migration lane and daily project state fully into GSD
- Keep GSD as a loose mirror with no clear ownership boundary
- Keep repo-local docs canonical for daily state and use `.planning/` specifically for migration planning, execution, verification, and handoff

### Why This Won
It preserves the existing Team4s workflow while giving the migration lane an execution-ready GSD spine instead of scattered planning notes.

### Consequences
- Team4s repo-local docs remain the source of truth for live product priorities and risks
- `.planning/` now carries migration-lane continuation, verification, and next-action routing
- Future migration execution phases should be added in GSD without duplicating repo-local day status files

### Decision
Treat the first concrete post-brief migration slice as the next proof point for GSD, not the creation of more planning structure.

### Context
The pilot now has a completed migration brief and handoff, so the next uncertainty is no longer "can GSD plan this?" but "can GSD guide the first real execution slice cleanly?"

### Options Considered
- Keep extending planning artifacts before any concrete migration slice exists
- Stop the pilot after the migration brief and handoff
- Add and plan the first explicit migration execution phase after the brief

### Why This Won
It is the smallest next step that can prove the pilot adds value beyond documentation.

### Consequences
- The next migration action should be a roadmap change plus a real phase plan, not more pilot framing
- Phase ordering is now intentionally non-linear in the pilot because Phases 3 and 4 completed before open product-delivery phases 1 and 2
- The pilot remains provisional until that first execution-facing phase exists

### Decision
Install GSD locally in the workspace as a pilot planning tool for the DB schema migration only.

### Context
The proposed normalized schema is broad and cross-cutting, while the existing Team4s workflow already has effective daily context management through `day-start` and `day-closeout`.

### Options Considered
- Replace the existing workflow with GSD across the repo
- Skip GSD entirely and keep schema planning only in ad hoc notes
- Install GSD locally and use it selectively for brownfield planning around the migration

### Why This Won
It preserves the working daily loop while giving the schema migration a more structured planning system to test on a high-complexity initiative.

### Consequences
- GSD artifacts now exist in workspace `.codex/` and `.planning/codebase/`
- The Team4s repo remains the canonical source for project state and decisions
- The pilot still needs to prove that it adds value beyond the existing planning documents

### Decision
Store the normalized DB schema draft in-repo at `docs/architecture/db-schema-v2.md`.

### Context
The migration discussion had become large enough that keeping it only in chat would make restarts and handoffs unreliable.

### Options Considered
- Keep the schema only in chat history
- Store it in workspace-only planning files outside the repo
- Store it in Team4s docs as the canonical target-model draft

### Why This Won
The schema needs to survive restarts, be reviewable in git, and stay close to the codebase it will eventually reshape.

### Consequences
- Future migration planning can reference one canonical file
- The schema still needs phased rollout documentation before implementation
- Changes to the target model can now be versioned like other architecture decisions

## 2026-03-07

### Decision
Prefer Jellyfin `Groups` over `Subgroups` for public anime-group asset resolution, with `Subgroups` retained as fallback.

### Context
The same underlying folder structure is visible through multiple Jellyfin libraries, but `Groups` exposes richer root artwork metadata (`Banner`, `Primary`, `Backdrop`) for the anime-group folder than the earlier `Subgroups` path.

### Options Considered
- Keep resolving from `Subgroups` only
- Prefer `Groups`, then fall back to `Subgroups` when `Groups` is missing or incomplete

### Why This Won
`Groups` provides the richer hero surface the page actually needs, while fallback preserves resilience if the preferred library is unavailable.

### Consequences
- The public route now has access to `banner_url` and `thumb_url`
- The group-detail page can use root banner artwork for the info panel instead of reusing Episode 1 imagery
- Library discovery still needs pagination and better error states

### Decision
Treat episode-folder `BackdropImageTags` as normal gallery images in the public group-detail payload.

### Context
Jellyfin was not exposing the desired episode visuals as normal `Photo` children, but it did expose them as folder-level `BackdropImageTags`.

### Options Considered
- Wait for Jellyfin to surface them as `Photo` items
- Promote episode-folder backdrops into the gallery payload explicitly

### Why This Won
It matches the user’s intended editorial model: multiple images per episode should appear in the gallery regardless of whether Jellyfin stored them as folder backdrops or discrete photos.

### Consequences
- Episode galleries now render the expected visuals
- Episode backdrops remain gallery content, not hero content
- The contract now includes more image sources and must be documented precisely

### Decision
Cache the resolved Jellyfin group-library ID in the backend handler to reduce repeated `Library/MediaFolders` timeouts.

### Context
The group-assets endpoint repeatedly hit a slow Jellyfin `Library/MediaFolders` call, causing transient 15-second failures during normal page reloads and UI iteration.

### Options Considered
- Keep resolving the library ID on every request
- Cache the resolved library ID with a bounded TTL

### Why This Won
The library ID is stable enough for local runtime, and caching removes the most painful repeated upstream lookup without changing the public contract.

### Consequences
- Repeated requests are now fast and stable in the common case
- Cache invalidation remains time-based rather than event-driven
- If Jellyfin library IDs ever change during runtime, there may be a short stale window until TTL expiry

## 2026-03-06

### Decision
Use Jellyfin `Subgroups` as the live source for anime-group presentation assets on `/anime/:animeId/group/:groupId`.

### Context
The public group detail page needed real visual and media assets tied to a specific anime/group combination. Release-scoped placeholder flows were not enough for the intended group-detail presentation, and the user already maintains dedicated Jellyfin subgroup folders such as `25_11 eyes_strawhat-subs`.

### Options Considered
- Keep the group page text-first and defer all real assets until an app-owned persistence layer exists
- Read the dedicated Jellyfin subgroup folder now and use it as the source for public group-detail presentation

### Why This Won
The subgroup library already expresses the right editorial grouping: one anime/group root folder plus episode subfolders. Using it now unlocked the intended public experience without inventing temporary duplicate storage.

### Consequences
- The initial public group-detail route depended on Jellyfin subgroup discovery/matching
- Group pages could render real backgrounds, galleries, and media tiles immediately
- Contract/documentation hardening became required because the payload was live

### Decision
Separate root-folder artwork from episode-folder imagery in the group-detail presentation rules.

### Context
The user clarified that the Jellyfin subgroup root backdrop is page-level presentation, while images inside `Episode N` folders are content assets. Treating them the same would collapse the intended visual hierarchy.

### Options Considered
- Let any discovered backdrop-like image override hero sections heuristically
- Define explicit semantics for root artwork vs episode-folder imagery

### Why This Won
The page structure becomes stable and predictable:
- root backdrop controls the full-page background
- episode-specific imagery controls section-level treatment
- episode backdrops/images remain gallery content

### Consequences
- The UI matches the intended hierarchy more closely
- Episode-folder images are preserved for lightbox/gallery usage instead of being consumed by hero logic
