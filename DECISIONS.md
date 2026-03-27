# DECISIONS

## 2026-03-26 - Phase 3 Is Closed As Verified Complete

### Decision
Treat Phase 3 (`Jellyfin-Assisted Intake`) as complete and verified, and move active execution focus to Phase 4.

### Context
The repo had stale closeout context and older root planning references. Before continuing, the actual test/runtime evidence needed to be checked so the next phase would not rest on assumptions.

### Options Considered
- Keep treating Phase 3 as still open
- Verify it now and close it honestly

### Why This Won
The tests and runtime checks passed, so continuing to treat Phase 3 as unresolved would only create planning drift.

### Consequences
- Phase 4 is now the real active lane
- Handoff files must stop describing the older create/edit hardening story as the main work

### Follow-ups Required
- keep the validation evidence visible in planning/handoff files

---

## 2026-03-26 - Anime Image Assets Must Be DB-Backed And Ownership-Aware

### Decision
Persist anime `cover`, `banner`, and `backgrounds` through a DB-backed asset-slot model with explicit `manual|provider` ownership.

### Context
Loose provider URLs cannot safely support replace/remove/protected resync behavior, especially once manual edits and provider refreshes must coexist.

### Options Considered
- keep relying on provider URLs and UI-only state
- move anime image assets into explicit backend persistence

### Why This Won
The DB-backed model is the only stable way to preserve ownership, precedence, and later resync behavior.

### Consequences
- repository and runtime paths gain more structure
- frontend can reason about real persisted state instead of inferred provider state
- the phase scope becomes larger but technically coherent

### Follow-ups Required
- finish the edit UI for manual upload/remove/apply

---

## 2026-03-26 - Manual Persisted Assets Always Beat Jellyfin Fallback

### Decision
At runtime, locally persisted anime assets take precedence over Jellyfin fallback assets. Manual assets remain in force until explicitly removed.

### Context
Without this rule, a user could set a manual banner or background and still see Jellyfin content win visually, which would make the ownership model meaningless.

### Options Considered
- let Jellyfin remain the primary source
- treat persisted anime assets as authoritative and Jellyfin only as fallback

### Why This Won
It matches operator expectations and makes the persistence model trustworthy.

### Consequences
- public runtime reads must consult persisted assets first
- resync logic must respect manual ownership and never silently replace it

### Follow-ups Required
- validate the edit route against the same precedence rule end to end

---

## 2026-03-26 - Background Videos Stay Provider-Only

### Decision
Do not add local persistence/upload support for anime background/theme videos in this phase.

### Context
The current scope is image-asset ownership and safe resync. Mixing video persistence into the same slice would expand storage, upload, and playback responsibilities unnecessarily.

### Options Considered
- persist both image and video assets together
- keep videos provider-only and persist only image slots now

### Why This Won
It keeps Phase 4 focused and aligns with the product expectation that background videos come from Jellyfin.

### Consequences
- `cover`, `banner`, and `backgrounds` are the persisted scope
- background/theme videos remain Jellyfin-only for now

### Follow-ups Required
- revisit video persistence only if a later phase explicitly needs it

---

## 2026-03-26 - Phase 4 Edit Route Does Not Rebuild Create-Style Jellyfin Intake

### Decision
Keep Phase 4 edit-route scope focused on existing provenance, preview/apply, and protected slot actions. Do not treat missing-anime-data lookup or create-style Jellyfin asset selection on edit as in-scope here.

### Context
Operator expectation drift appeared while testing the edit route: an anime with no persisted Jellyfin link can still exist in Jellyfin and have images, but Phase 4 does not promise a fresh intake/search flow on edit.

### Options Considered
- expand Phase 4 edit to behave like anime create
- keep Phase 4 edit narrowly focused on existing linked/provenance state

### Why This Won
The phase plan is about safe resync and protected asset actions for existing anime state. Expanding into a new intake/search flow would blur scope and make completion criteria unstable.

### Consequences
- `Jellyfin Provenance` on edit is expected to be sparse when no persisted link exists
- future work can add richer edit-time lookup or asset picking, but that should be a later phase/slice

### Follow-ups Required
- audit the current Phase 4 implementation against this narrower scope before opening new edit-route work

---

## 2026-03-27 - Cover Joins The Same Persisted Slot Model As Banner And Backgrounds

### Decision
Move `cover` onto the same persisted slot/ownership model as `banner` and `backgrounds`, instead of narrowing `04-03` to exclude it.

### Context
User-visible cover behavior already worked through `cover_image`, but internally it remained a special case outside the new ownership-aware persistence layer.

### Options Considered
- narrow `04-03` so cover stays on the old path
- migrate cover into the same slot model and keep `cover_image` only as compatibility output

### Why This Won
The new schema exists specifically to unify old asset storage paths. Leaving cover behind would preserve a needless architectural exception and keep resync/ownership behavior inconsistent.

### Consequences
- `0040_add_anime_cover_asset_slots` is part of the active migration chain
- cover now participates in `manual|provider` ownership and protected apply behavior
- `cover_image` remains mirrored so older read paths do not all need to change immediately

### Follow-ups Required
- close the remaining planning gap by marking the verified cover requirements accordingly
