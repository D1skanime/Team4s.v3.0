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

---

## 2026-03-30 - Anime Runtime Moves To A Fresh v2 DB Instead Of Extending The Hybrid Schema

### Decision
Use a fresh normalized anime DB/runtime path (`team4s_v2`) as the active local target for anime create/read/delete work instead of continuing to extend the older hybrid anime schema.

### Context
The running backend code and the older local DB had drifted apart, and the old schema still mixed flat anime columns with normalized side tables. Continuing to patch that hybrid path would keep creating mismatches and make every new route harder to reason about.

### Options Considered
- keep evolving the old hybrid anime DB in place
- stand up a fresh v2 schema and pull routes over slice by slice

### Why This Won
The fresh v2 path is cleaner, better aligned with the intended architecture, and avoids spending more effort on a schema the team already wants to replace.

### Consequences
- local backend runtime now points to `team4s_v2`
- anime create/read/delete/backdrops needed explicit v2-aware repository paths
- some compatibility shims remain temporarily while edit/update and adjacent routes are still being migrated

### Follow-ups Required
- migrate `UpdateAnime` / edit save next
- audit the remaining anime routes for legacy flat-column assumptions

---

## 2026-03-30 - Keep Anime Delete Audits After Hard Delete

### Decision
Anime hard deletes must leave behind audit entries even after the anime row itself is removed.

### Context
Once delete became a real admin action, removing the anime row without preserving audit would make destructive changes hard to trace and harder to trust operationally.

### Options Considered
- let delete audits disappear with the anime row
- preserve delete audits independently from the anime record

### Why This Won
Hard delete without durable audit is too opaque for an admin workflow.

### Consequences
- `admin_anime_mutation_audit` must not cascade away on anime delete
- delete responses and repo logic need to keep enough context to record the destructive action

### Follow-ups Required
- keep delete verification part of future v2 route checks

---

## 2026-03-31 - Protect Active Cover Flows Server-Side For Stale Clients

### Decision
Keep server-side compatibility for the active anime cover upload/assign/delete flow while the frontend/runtime transition to v2 is still in progress.

### Context
The core edit route is now v2-aware, but a stale browser bundle could still hit the older `/api/v1/admin/upload` and `/api/v1/admin/anime/:id/assets/cover` endpoints. On `team4s_v2` those old endpoints were failing hard on removed legacy asset columns, turning an otherwise healthy edit flow into a generic 500.

### Options Considered
- require every client to hard-refresh before cover edits work
- add targeted backend compatibility so stale clients stop crashing during the cutover

### Why This Won
Protecting the active cover path on the server removes a fragile operational dependency on browser cache state and makes the cutover more tolerant in real usage.

### Consequences
- the backend now accepts old cover client behavior on v2 without restoring legacy schema authority
- compatibility work should stay narrow and focused on genuinely active operator flows
- banner/background parity is still a separate follow-up, not silently included by this decision

### Follow-ups Required
- extend or retire the remaining legacy anime asset APIs deliberately once banner/background parity is handled

---

## 2026-03-31 - Phase 3 Jellyfin Draft Title Seeds From Folder Name And Takeover Collapses Review

### Decision
For Phase 3 Jellyfin-assisted intake, the initial draft title is seeded from the Jellyfin folder name, and once preview hydration succeeds the draft becomes the only active source view until the admin explicitly reopens candidate review.

### Context
Late Phase 3 clarifications were added after the earlier Jellyfin intake plans were already mostly done. Without storing this decision durably, the UI could drift back toward display-title seeding or leaving competing candidates visible after takeover.

### Options Considered
- keep using the Jellyfin display title and leave candidate review visible after hydration
- seed from the folder name and collapse candidate review into the shared draft until explicit restart

### Why This Won
The folder name is the stronger operator signal for anime intake, and collapsing the UI after takeover keeps the shared draft focused and less error-prone.

### Consequences
- the intake preview contract now exposes `folder_name_title_seed`
- draft hydration can intentionally replace the initial query title once, while still staying editable
- alternate Jellyfin matches stay hidden after takeover unless the admin explicitly chooses `Anderen Treffer waehlen`

### Follow-ups Required
- keep future AniSearch/source-merge work compatible with the folder-seed and takeover-first draft model

---

## 2026-04-01 - Generic Admin Upload And Asset Lifecycle Must Be One Contract

### Decision
Future asset work should converge on one generic admin upload contract instead of adding more endpoint-specific image flows.

### Context
The current anime/admin work is functionally complete through Phase 5, but the next operational thread is asset provisioning and upload lifecycle hardening. During closeout we clarified that replacement and delete behavior only stay safe if upload, linking, and cleanup semantics are defined together.

### Options Considered
- keep extending special-case cover-style upload paths
- define one generic upload and asset lifecycle contract before further asset work

### Why This Won
The generic contract is the only approach that scales cleanly across `anime`, `fansub`, `release`, `user`, `episode`, and `article` without repeating path logic and delete semantics in many places.

### Consequences
- the target upload shape is:
  - endpoint: `POST /api/admin/upload`
  - params: `file`, `entity_type`, `entity_id`, `asset_type`
  - storage path: `/media/{entity_type}/{entity_id}/{asset_type}/{uuid}.{ext}`
- `{ext}` is derived server-side from the validated real image format, not copied blindly from the original filename
- upload planning must define filesystem save, DB record creation, entity linking, replacement behavior, and delete cleanup together
- future upload work should avoid new per-asset specialized endpoints unless there is a deliberate exception recorded

### Follow-ups Required
- turn this into the next planned slice before adding more asset upload code
- trace the current upload implementation against this contract to identify the real migration seam

---

## 2026-04-03 - Phase 06 Is The Verified Baseline For Phase 07

### Decision
Treat the verified anime manual cover seam from Phase 06 as the required baseline for Phase 07 planning.

### Context
Today's work closed the real integration gaps between manual create/edit, V2 media linking, cover removal, and anime delete cleanup. The next phase should build on that seam rather than reopening the just-verified behavior.

### Options Considered
- reopen the just-fixed Phase-06 behavior while planning broader upload work
- freeze the verified seam and use it as the Phase-07 starting contract

### Why This Won
It gives Phase 07 a stable foundation and avoids mixing new generic-upload scope with bugs that are already resolved and verified.

### Consequences
- Phase 07 should extend the verified seam to more anime asset types
- legacy cover-only paths should not re-enter active flows
- `$gsd-execute-phase 7` should not be used until Phase 07 is actually planned

### Follow-ups Required
- create the Phase-07 plan files
- sync roadmap/requirements drift around completed Phase-06 status

---

## 2026-04-05 - Asset Actions Belong In The Provenance Cards

### Decision
Keep upload, remove, and open actions inside the edit-route provenance cards instead of splitting them into separate management cards.

### Context
During Phase-07 human UAT, the earlier UI split provider previews from the actual asset actions. That made it easy to mistake the provider image for the currently active persisted asset and made the edit flow harder to trust.

### Options Considered
- keep separate management cards below the provenance view
- move actions directly into the asset cards where provider and active states are already shown

### Why This Won
The provenance cards are where the user already decides what asset is available and what is active. Keeping the actions there reduces scrolling, removes duplicate mental mapping, and makes the active-vs-provider distinction easier to understand.

### Consequences
- cover management now lives directly in the cover card
- non-cover asset actions stay coupled to the visible provider/active state
- future polish should improve those cards rather than reintroducing detached management panels

### Follow-ups Required
- keep regression checks on create/edit/delete behavior if the cards get more UI polish later

---

## 2026-04-05 - Backgrounds Use Gallery Semantics In Edit

### Decision
Treat anime `backgrounds` as a gallery-style additive asset surface in the edit UI, not as a singular provider-vs-active comparison card.

### Context
Unlike `cover`, `banner`, `logo`, and `background_video`, the `background` slot is additive and can hold multiple persisted assets. The initial comparison-card pattern did not fit that behavior well.

### Options Considered
- force backgrounds into the same singular compare-card layout as other assets
- show provider previews and active persisted backgrounds as separate galleries

### Why This Won
It matches the actual slot semantics and makes the UI communicate that backgrounds are accumulated assets, not a one-for-one replacement slot.

### Consequences
- the background card uses gallery sections for provider and active assets
- per-background remove/open actions stay attached to each active thumbnail
- future work should preserve additive semantics instead of regressing toward a singular-slot mental model

### Follow-ups Required
- keep background create/edit/delete regression coverage tied to additive behavior
