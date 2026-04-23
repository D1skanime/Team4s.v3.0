# DECISIONS

## 2026-04-21 - Parallel Releases Must Stay Valid In Episode Import UI

### Decision
Do not treat multiple media files targeting the same canonical episode as a frontend mapping conflict. Parallel releases are valid and should remain confirmable in the episode import workbench.

### Context
Phase 19 removed the exclusive-episode-claim rule from apply planning, and Phase 20 backend tests explicitly allow parallel releases for the same episode. During the Wave-3 code check, the frontend reducer still downgraded that case to `conflict`, which contradicted the backend contract and blocked the intended operator workflow.

### Options Considered
- Keep frontend overlap detection and make the operator resolve valid parallel releases manually
- Align the frontend reducer with the backend contract and keep valid parallel releases confirmed

### Why This Won
The release-native model is supposed to support multiple distinct real files for the same canonical episode. Surfacing that as a conflict in the workbench creates fake operator friction and misrepresents the persistence model.

### Consequences
- `episodeImportMapping.ts` no longer auto-flags overlapping episode claims as conflicts.
- Frontend mapping tests must assert that parallel releases remain confirmed.
- Future conflict handling in this workbench should be reserved for genuinely invalid states, not for valid multi-release coverage.

### Follow-ups Required
- Prove the behavior in the live Naruto replay during Phase 20 UAT.

## 2026-04-18 - AniSearch Owns Canonical Anime Episodes While Jellyfin Owns Media Evidence

### Decision
For the anime episode create flow, AniSearch defines canonical episode numbers and titles. Jellyfin is treated as the local media/file source only, and admins must approve a preview mapping before episodes and episode versions are persisted.

### Context
Jellyfin and TVDB expose anime through season/file structures such as `Bleach S03E11`, while Team4s needs a continuous anime episode order. Some anime releases also combine multiple canonical episodes into one media file, for example a Naruto file covering episodes 9 and 10.

### Options Considered
- Let Jellyfin season/episode numbering define Team4s episode numbers
- Import AniSearch canonical episodes and map Jellyfin files onto them
- Duplicate one Jellyfin media item into several episode-version rows when a file covers multiple episodes
- Add an authoritative coverage join table for one media/version covering multiple canonical episodes

### Why This Won
Separating canonical episode identity from local media identity preserves operator control and avoids hiding mismatches behind automation. A join table models multi-episode files directly without creating ambiguous duplicate media identities.

### Consequences
- Phase 18 starts with a preview/apply episode mapping builder rather than another automatic Jellyfin sync.
- `episode_version_episodes` should become the authoritative coverage model while `episode_versions.episode_number` remains a compatibility/display primary episode.
- Apply must preserve existing manually curated episode data unless a later explicit edit flow changes it.

### Follow-ups Required
- Execute Phase 18 Wave 0 contract/red tests before implementing persistence or UI.
- Verify AniSearch episode-list parsing with fixtures before relying on live markup.

---

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

---

## 2026-04-09 - Tags Follow The Same Normalized Persistence Model As Genres

### Decision
Persist anime tags through normalized `tags` and `anime_tags` tables, with authoritative write-on-save behavior analogous to genres.

### Context
Phase 10 added visible create-page tag editing. To keep that feature durable, tags needed real DB-backed normalization instead of hidden draft-only state or ad-hoc free-text storage.

### Options Considered
- keep tags as UI-only draft tokens
- store tags as denormalized text on `anime`
- model tags like genres with a reference table plus a junction table

### Why This Won
It matches the genre pattern the team already trusts, keeps dedupe/normalization manageable, and makes create/delete behavior easier to reason about.

### Consequences
- schema now includes `tags` and `anime_tags`
- create persistence writes tags authoritatively after normalization
- anime delete removes `anime_tags` links but leaves shared `tags` reference rows in place

### Follow-ups Required
- keep future edit/AniSearch enrichment work aligned with the same authoritative tag model

---

## 2026-04-09 - Recovery Branch Replaces The Broken Remote Baseline

### Decision
Promote the tested recovery branch to GitHub `main` and delete the older broken remote branches instead of continuing to patch them in place.

### Context
The real Git repo had drifted away from the validated local recovery workspace, and the old remote branches were no longer trustworthy as the active baseline.

### Options Considered
- keep repairing the old broken branch history
- open a long-lived side branch and leave `main` stale
- replace `main` with the tested recovery baseline and keep one recovery branch as rollback rope

### Why This Won
It gives the project a single trustworthy baseline again and stops future work from starting from known-bad branch state.

### Consequences
- GitHub `main` now points at recovery commit `9f54a3a`
- broken remote branches were deleted
- local work should continue in `C:\Users\admin\Documents\Team4s`

### Follow-ups Required
- keep the recovery branch around temporarily until the new baseline proves stable

---

## 2026-04-12 - AniSearch Relation Graph Parsing Must Tolerate Mixed Node Container Types

### Decision
When parsing AniSearch relation pages, treat mixed node container types in `data-graph` as valid input. Empty `manga` or `movie` arrays must not invalidate the anime relation graph.

### Context
The real AniSearch page for `Ace of the Diamond: Staffel 2` (`10250`) clearly exposed valid anime relations to Staffel 1 and Act II, but the local import still showed zero relation candidates. The root cause was not missing local anime data and not the relation URL itself; it was the graph decoder assuming every `nodes.*` group was always a JSON object.

### Options Considered
- keep strict decoding and fail the whole graph whenever any node group has an unexpected shape
- decode node groups more defensively and only require the `anime` node group needed by the current import path

### Why This Won
AniSearch can legitimately emit empty arrays for non-anime node groups while still including a valid anime relation graph. Failing the full decode on that shape silently discards correct relations and creates misleading "no local relations" symptoms.

### Consequences
- relation parsing now tolerates mixed node container shapes
- valid anime relations survive even when `manga` and `movie` groups are empty arrays
- the create relation baseline now correctly covers real cases like `10250`

### Follow-ups Required
- keep a regression test for the mixed-type graph shape
- if future relation-label expansion is added, test it against the same real AniSearch graph inputs

---

## 2026-04-12 - Edit-Route Relation UX Comes Before Broader Relation Label Expansion

### Decision
After the verified Phase-13 create relation baseline, the next AniSearch/admin slice is edit-route relation UX. Broader relation-label normalization stays deferred until that UX slice is scoped and delivered.

### Context
Phase 13 closed the create-side relation persistence gap and fixed the last known AniSearch parser bug. The remaining open work split into at least two plausible directions: making the existing edit route's relation experience clearer for operators, or expanding how AniSearch relation labels map into local semantics. Doing both together would blur the seam that was just verified.

### Options Considered
- move straight into broader relation-label normalization
- do more general AniSearch polish without choosing a concrete thread
- choose edit-route relation UX first and keep taxonomy work separate

### Why This Won
Edit-route relation UX builds directly on the now-proven persistence baseline and can be scoped around operator-visible behavior without changing product semantics. It keeps the next slice concrete while avoiding unnecessary churn in mapping rules.

### Consequences
- the next planning step is to write down the exact edit-route relation UX gaps
- Phase 13 create relation persistence becomes the regression baseline for the new slice
- broader relation-label normalization remains explicitly out of scope until revisited

### Follow-ups Required
- capture the exact edit-route relation UX scope before implementation starts
- record any future taxonomy expansion as a separate decision before code changes

---

## 2026-04-15 - Provider-Selected Create Assets Must Persist Through The Same Authoritative Create Seam

### Decision
Keep create-page remote asset adoption on the existing authoritative create/upload seam by carrying the selected provider asset URLs and background provenance through the normal create contract, instead of inventing a second provider-specific persistence path.

### Context
Phase 15 already let admins search online sources per asset slot and adopt remote candidates into the create draft. The follow-through gap was that the authoritative create payload still only handled `cover_image`, which left non-cover provider selections and background provenance partially outside the trusted save path.

### Options Considered
- keep remote chooser adoption as a mostly frontend-only staging trick and patch special cases later
- extend the standard create contract so provider-selected assets flow through the same backend validation and V2 media attachment as the rest of create

### Why This Won
The project already trusts one generic create/upload/link seam. Extending that seam keeps the behavior durable, avoids new slot-specific provider branches, and preserves provenance where it matters.

### Consequences
- create requests can now carry `banner_image`, `logo_image`, `background_video_url`, and additive `background_image_urls`
- backend create handling must stay responsible for turning those URLs into `media_assets` / `anime_media`
- create-side background imports may persist `provider_key` into `media_external` when the provider identity is known

### Follow-ups Required
- verify the live browser create flow for remote-selected non-cover assets
- keep future asset-search follow-ups inside the same create/upload contract

---

## 2026-04-18 - Anime Create Background Videos Are Additive And Operator Diagnostics Stay Hidden

### Decision
Treat Anime Create as complete for the current UX/UI follow-through slice. Background videos are additive in the create flow, while old singular `background_video` behavior remains only as compatibility fallback. Development-only AniSearch draft diagnostics stay hidden from the operator UI.

### Context
The create page had converged functionally but still had two recurring issues: background videos behaved like a single oversized slot, and operator-facing cards still exposed test/debug details that were useful during development but noisy in real use. The reference UI also made clear that assets should be visually source-aware and compact, with backgrounds and videos presented as bounded galleries.

### Options Considered
- keep background video singular and only shrink the card visually
- add a new video-specific legacy slot model
- make background videos additive through the same V2 media/link seam and only preserve singular fallback for old callers
- keep AniSearch draft details visible as reassurance after load
- hide AniSearch diagnostics and rely on actionable duplicate/error feedback plus the final review section

### Why This Won
Additive background videos match how backgrounds already work and avoid another legacy slot branch. Hiding diagnostics keeps the create page operator-focused while preserving the actual error/conflict states needed for safe work.

### Consequences
- create staging stores `background_video` as an array
- backend exposes a plural admin route for appending background videos
- runtime backdrop resolution prefers `BackgroundVideos` and falls back to singular `BackgroundVideo`
- the create page shows folder linkage through readonly `Ordnerpfad` instead of debug/status details
- future create-page polish should start from this completed baseline, not from the earlier test/debug UI

### Follow-ups Required
- do one short human smoke after push to confirm the final visual density on the target screen
- keep any future multi-video edit-page expansion separate unless users explicitly need it next

---

## 2026-04-22 - Jellyfin Rename Detection Is Not Stable Enough To Treat File Renames As The Same Imported Release

### Decision
Treat imported release identity as keyed by Jellyfin `media_item_id`, and assume a filesystem rename may cause Jellyfin to emit a new item ID. For already-imported releases, handle pure rename/path corrections through targeted per-episode or per-version resync/edit flows instead of rerunning the broad import workbench and expecting in-place identity preservation.

### Context
During live Naruto import verification, we tested Jellyfin behavior before and after renaming a single episode file. `Naruto.S01E05-AnimeOwnage.avi` initially appeared in import preview with Jellyfin item ID `22da2a926ab7ab59dc18989f6205ae3b`. After renaming the file and rescanning Jellyfin, the same logical episode appeared as `Naruto.S01E05-AnimenOwnage.avi` with a different Jellyfin item ID `b12ada24800e12b8296cf825ec7fce70`. That means the current import seam cannot safely assume a filename-only correction will preserve Jellyfin identity.

### Options Considered
- treat filename/path equality as the authoritative identity for already imported releases
- assume Jellyfin item IDs survive renames and let broad re-import update existing rows implicitly
- treat Jellyfin `media_item_id` as authoritative for import identity, and use targeted resync/edit flows for rename corrections

### Why This Won
The current persistence seam already keys imported release variants through `stream_sources.external_id = media_item_id`. The live Naruto rename test showed that Jellyfin can replace the item ID after a rename, so relying on filename matching would blur true identity and risk accidental duplicate or cross-wired variants. A targeted correction workflow is safer until a dedicated rename-reconciliation slice is designed.

### Consequences
- a renamed already-imported file may appear as a new candidate in the import preview
- broad replay imports should be treated as additive workflows for new media, not as the primary correction path for renamed existing media
- correcting an already imported renamed file should go through a narrow per-episode/per-version Jellyfin resync or edit path
- any future incremental-import UX should surface "already imported" versus "new Jellyfin item" explicitly instead of assuming stable rename identity

### Follow-ups Required
- when the incremental-import/correction slice is scoped, include rename reconciliation rules explicitly
- consider exposing stored `media_item_id` / existing coverage in the import UI so operators can see why a rename is being treated as new evidence
# 2026-04-22 - Anime Create Persists Explicit Jellyfin Linkage Over AniSearch Source

- Context: Anime create can hydrate fields from both AniSearch and a manually selected Jellyfin series, but the final create payload currently has only one `source` field.
- Decision: When a Jellyfin series was explicitly selected in the create flow, `source` remains `jellyfin:<series-id>` as the authoritative runtime link, and all normalized provider tags are additionally persisted in `anime_source_links`. AniSearch draft relations still flow into create, but AniSearch no longer overwrites the Jellyfin linkage in the primary `anime.source` field.
- Why: Episode import, later Jellyfin resync, and provider-based tooling rely on a stable Jellyfin series ID on the anime record. At the same time, AniSearch IDs still need durable lookup coverage for duplicate prevention, relation resolution, and import context. A dedicated source-link table solves the “single field, two providers” conflict cleanly.
- Follow-up: Source-based lookups should prefer `anime_source_links` as the canonical multi-provider store and treat `anime.source` as the primary runtime source rather than the only persisted provenance.
