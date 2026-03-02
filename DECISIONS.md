# DECISIONS

## 2026-03-02

### Decision
Keep the general Jellyfin sync action as the bulk season-wide import path; use single-episode sync only for corrective reruns.

### Context
The question today was whether operators would need to sync episodes one by one manually. The existing bulk sync path already imports every accepted episode/version for the selected Jellyfin series + season, while the new single-episode endpoint exists for targeted corrections.

### Options Considered
- Shift operators toward manual per-episode sync as the normal flow
- Keep the existing bulk sync as the default path and reserve single-episode sync for corrective use

### Why This Won
The bulk path already does the right write behavior for accepted episodes and matching Jellyfin links. Making per-episode sync the normal path would add unnecessary operator work and create avoidable repetition.

### Consequences
- UI copy should make the distinction between bulk sync and corrective sync explicit
- Operators should not need to sync each episode manually in the normal workflow
- Future UX work should preserve the bulk-first mental model

### Decision
The public anime detail should show exactly one active fansub-group context at a time.

### Context
The current public anime view can show every fansub description/history together, which overloads the page and makes it harder to understand which versions belong to which group.

### Options Considered
- Keep all fansub histories/descriptions and all visible versions on screen at once
- Treat one fansub group as the active context and let users switch explicitly

### Why This Won
One active context keeps the page readable and makes the relationship between group history and visible versions obvious. It also creates a cleaner mental model for public users.

### Consequences
- The page needs an explicit group switcher
- Changing the active group must swap both the visible history/description and the public episode versions
- The initial group can be preselected automatically, but the implementation should stay stable and predictable

## 2026-03-01

### Decision
Make provider and Jellyfin sync preview-first workflows with separate search and sync endpoints.

### Context
The current search action provides no visible response, no explicit error handling, and no safe preview step before syncing. That makes provider operations hard to trust and harder to diagnose.

### Options Considered
- Keep the existing opaque sync flow and only add minimal UI feedback
- Split search from sync, show preview results first, and require explicit user confirmation before the write action

### Why This Won
Operators need to see what the backend found before any sync mutates provider mappings. Separating read and write paths also makes backend diagnostics, HTTP contracts, and frontend states easier to reason about.

### Consequences
- Frontend must handle loading, disabled, empty, auth-failure, and unreachable-server states explicitly
- Backend must return structured preview payloads and structured error JSON for search failures
- Sync must remain idempotent and should not run directly from the initial search action

### Decision
Extend the standard error envelope with optional machine-readable `code` and operator-facing `details` for the Jellyfin admin lane.

### Context
The original `error.message` shape was not enough for stable frontend mapping or for distinguishing configuration, connectivity, and auth failures during runtime validation.

### Options Considered
- Keep `error.message` only and infer behavior from free-text strings
- Keep the existing envelope but add optional `code` and `details`

### Why This Won
This keeps the global contract shape stable while giving the frontend enough structure to map user-visible states without brittle string parsing.

### Consequences
- The frontend can render precise step-specific feedback
- Existing clients that only read `error.message` remain compatible
- New error paths must keep codes stable once relied on by UI logic

### Decision
Treat a preview with zero accepted episodes as a hard stop for sync.

### Context
Allowing sync to proceed after an empty preview risks misleading operators into thinking a safe import ran when the selected Jellyfin candidate or season was wrong.

### Options Considered
- Allow sync to run and effectively no-op
- Block sync until the operator fixes the candidate, season, or path assumptions

### Why This Won
An explicit stop is safer than a silent no-op in an admin write flow.

### Consequences
- Operators get a clear correction point before any write action
- The confirm path now depends on a valid, non-empty preview
- Preview validation becomes a stronger part of the workflow

### Decision
Keep `/admin/anime/{id}/episodes` focused on the episode list, but include expandable version and fansub context inline.

### Context
The current episodes overview does not expose version details or fansub assignments clearly enough. That forces extra navigation and makes it harder to understand what will be edited.

### Options Considered
- Keep the overview minimal and require deeper navigation to inspect version details
- Extend the overview endpoint and UI so operators can see versions and fansub groups before choosing a deeper edit path

### Why This Won
The route can stay focused on episode browsing while still giving enough context to make the correct next edit decision. This preserves the route-based workflow without hiding critical version metadata.

### Consequences
- Backend needs a joined response shape that can optionally include versions and fansub groups
- Frontend needs expandable rows or accordions plus clear edit entry points
- Fansub associations become visible earlier, which should reduce mistaken edits

## 2026-02-27

### Decision
Treat the leaked root `.env` as compromised and move to template-only env handling.

### Context
The repository contained a tracked `.env` with live secrets. Removing the file only from the current tree would still leave the values visible in Git history.

### Options Considered
- Keep `.env` ignored going forward but leave history unchanged
- Replace the tracked file with `.env.example` and rewrite the repository history

### Why This Won
History rewrite plus key rotation is the only honest response once secrets were exposed. A template file keeps local setup clear without reintroducing the risk.

### Consequences
- The normal GitHub history no longer exposes the old `.env`
- All previously exposed secrets still must be rotated because they were already compromised
- Contributors with old clones need to resync against rewritten history

### Decision
Replace the old admin anime 3-column surface with a route-based step flow.

### Context
The previous admin anime surface mixed anime context, episodes, and versions in one page. The layout was dense, harder to scan, and repeatedly created UX overlap.

### Options Considered
- Keep the 3-column layout and continue incremental UI cleanup
- Split responsibilities into dedicated routes per task

### Why This Won
The information architecture problem was bigger than styling. Route-level separation reduces cognitive load and makes each page easier to maintain and test.

### Consequences
- Admin flows are clearer and closer to a SaaS-style editing model
- More routes now need regression coverage and navigation consistency checks

### Decision
Keep the Anime bearbeiten route focused on general anime context only, with technical controls collapsed and genre suggestions loaded from a public read endpoint.

### Context
The edit page still felt like a developer form, and the genre field was not reliably showing DB-backed suggestions during typing.

### Options Considered
- Leave technical controls inline and keep using the admin-only genre endpoint
- Move technical controls into a collapsed advanced panel and read suggestions from a stable unauthenticated endpoint

### Why This Won
The main route should optimize for routine editorial work, not debugging. Removing auth coupling from the suggestion path reduces one common failure mode for autocomplete.

### Consequences
- The main form is cleaner and more task-focused
- There is now a clearer separation between operator UI and developer/debug actions
- The backend suggestion transport is fixed, but the browser dropdown still needs one final live validation pass
