# DECISIONS

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
