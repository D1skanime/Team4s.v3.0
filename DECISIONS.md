# DECISIONS

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
