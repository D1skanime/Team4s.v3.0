# DAYLOG

## 2026-04-28
- Project: `Team4s.v3.0`
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Today's focus: close the segment/theme follow-through honestly by moving from theme-global ideas to release-context segment work, wiring real segment asset persistence, and making the operator UI show segment/file status instead of hiding it

### Workstreams Touched
- Phase 23/24/25 review and correction loop
- Phase 25 segment editor mockup alignment and live UAT
- Phase 26 segment source asset upload/persistence execution
- Segment asset lifecycle hardening after review findings
- Episode overview segment/file status surfacing
- Codex local config/agent cleanup for the `agents` startup error

### Goals Intended vs Achieved
- Intended: stop the OP/ED work from drifting into the wrong data model, make segment work happen in the real release context, and get segment assets to a practical stored-file state
- Achieved: the old anime-level themes detour was retired, segment editing now lives on episode-version edit, generic segment types (`OP`, `ED`, `Insert`, `Outro`) replaced the brittle `OP1/ED1` mental model, segment source assets can now be uploaded and persisted as Team4s assets, and the UI now shows both uploaded segment file names and per-version segment/file status badges in the episodes overview

### Problems Solved
- Root cause: the OP/ED work had drifted into a mixed anime-theme/fansub-theme screen that did not match the real release-context workflow
- Fix: removed the anime themes route from the active operator flow and verified the segment/range logic directly on `/admin/episode-versions/:id/edit`
- Root cause: segment source persistence was still half-legacy and missing a real upload/delete lifecycle
- Fix: added the real segment asset upload path, deterministic storage semantics, source metadata persistence, cleanup on source changes, and safer replace behavior
- Root cause: operators could not tell from the UI whether a segment already had an uploaded file or whether a version already had any segments at all
- Fix: source labels now surface the uploaded file name in the segment table, and the grouped episode overview now exposes `segment_count` plus `has_segment_asset` as visible badges per version row
- Root cause: new Codex threads were failing to start because stale local agent config under `.codex/agents` deserialized with invalid absolute path expectations
- Fix: cleaned `.codex/config.toml`, moved legacy agent `.toml` files out of the active agents folder, and confirmed `$day-start` resumed working in-repo

### Decisions
- Segment types are generic (`OP`, `ED`, `Insert`, `Outro`) and the free name field carries distinctions like `Naruto OP 1` or `Final OP`
- Segment structure belongs to the episode-version/release context, not to a separate anime-level themes management page
- Segment files are Team4s-owned assets behind `release_asset`; Jellyfin is not the primary upload/storage model for this flow

### Blockers
- No hard product blocker remains on the segment admin slice
- Phase 26 still needs one honest live verification pass focused on the asset lifecycle and the new status badges
- Cross-AI review remains unavailable locally because no independent reviewer CLI is installed
- The worktree still contains many untracked local cache/tmp/debug/screenshot artifacts that are not intended history

### Next Step
- Open `http://localhost:3002/admin/episode-versions/5/edit` and `http://localhost:3002/admin/anime/4/episodes`, then verify that the segment row shows the uploaded file name and the episode overview shows correct segment/file badges for the same version

## 2026-04-24
- Project: `Team4s.v3.0`
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Today's focus: pull Phase 22 anime-edit work onto the real create-flow foundation, simplify the operator UI aggressively from live feedback, and close one real release-version delete backend bug

### Workstreams Touched
- Phase 21 UAT completion and planning carry-through
- Phase 22 anime edit/create-flow foundation execution and live UI correction loop
- Jellyfin relink/resync simplification in anime edit
- edit-route asset merge behavior for Jellyfin + manual assets
- episode-version delete backend implementation
- fansub admin list cleanup for collaboration visibility
- repo-local closeout and push preparation

### Goals Intended vs Achieved
- Intended: make anime edit feel like anime create instead of a legacy side tool, verify it live in Docker, and remove the misleading admin/UI leftovers that still pointed operators into old flows
- Achieved: anime edit now uses the shared create-style workspace, Jellyfin relink works through a simpler create-like selection flow, Jellyfin/manual assets can coexist visibly in edit, duplicate save/provenance noise was removed, the old per-episode `Korrektur-Sync` action is gone, collaboration pseudo-groups are hidden from the normal fansub list, and episode-version delete no longer fails with a hard 500

### Problems Solved
- Root cause: the earlier Phase-22 execution only wrapped the old edit route in a new shell instead of actually replacing the legacy operator experience
- Fix: rewired anime edit around the create-style workspace and then iterated live on the route until the stale AniSearch/Jellyfin/provenance clutter was removed
- Root cause: Jellyfin asset fallbacks disappeared as soon as one manual background or background video existed
- Fix: edit asset rendering now merges persisted manual assets with Jellyfin fallback assets instead of replacing the whole set
- Root cause: operators had no way to reject individual Jellyfin assets in edit when the linked Jellyfin source was only partially correct
- Fix: added draft-level Jellyfin asset dismissal in anime edit without dropping the overall Jellyfin linkage
- Root cause: deleting an episode version still hit a deferred repository placeholder and returned `500`
- Fix: implemented actual release-variant delete cleanup for linked streams, version-group rows, empty parent release records, and orphaned stream sources
- Root cause: collaboration groups such as `AnimeOwnage & Project Messiah` looked like normal fansub groups in the default admin list
- Fix: the normal fansub management list now hides collaboration records so the everyday group list only shows real groups

### Decisions
- Anime edit should copy the create interaction model directly and remove stale helper panels instead of preserving legacy edit-specific UI
- The per-episode `Korrektur-Sync` action is no longer part of the normal episode admin workflow because import mapping already owns that correction path
- Collaboration records may stay persisted for release wiring, but they should not appear in the standard fansub group list

### Blockers
- No hard product blocker remains on the current anime edit slice
- Cross-AI review is still unavailable locally because no independent reviewer CLI is installed
- The worktree still contains many untracked local temp/cache/debug artifacts that are not part of the intended commit

### Next Step
- Finish the next honest Phase-22 pass by deciding whether the remaining anime edit source/context section still needs trimming or whether the current create-style baseline is sufficient to close and verify formally

## 2026-04-23
- Project: `Team4s.v3.0`
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Today's focus: finish Phase 20 live verification, harden episode-import/create edge cases, and close the day with a restartable verified baseline

### Workstreams Touched
- Phase 20 live Docker UAT and SQL evidence capture
- Episode import preview/apply fixes for AniSearch and multi-episode mapping
- Anime create/provider persistence for Jellyfin + AniSearch dual linkage
- Delete/import cleanup and handoff closeout

### Goals Intended vs Achieved
- Intended: finish the release-native import seam with one honest live replay and stop carrying Phase 20 as "almost done"
- Achieved: Phase 20 is now verified complete, live Docker replay evidence exists, dual-provider anime linkage persists durably, and handoff files now point at the next post-Phase-20 slice instead of old Naruto-open notes

### Problems Solved
- Root cause: anime create could only keep one provider in `anime.source`, so explicit Jellyfin linkage and AniSearch provenance fought each other
- Fix: kept Jellyfin as authoritative runtime `anime.source` and added `anime_source_links` so both provider tags persist durably
- Root cause: episode import for special title variants like `3x3 Eyes` still relied on brittle Jellyfin title/path re-resolution
- Fix: strengthened the resolver and then removed the dependency on later guessing by persisting both provider links at create time
- Root cause: import apply status was easy to mistrust because the UI stayed actionable even after a successful idempotent replay
- Fix: verified directly in DB that apply really wrote the normalized release graph and recorded that as Phase 20 closure evidence

### Decisions
- Phase 20 is closed based on live Docker evidence from a disposable `3x3 Eyes` replay
- `anime.source` stays the authoritative runtime provider link, while `anime_source_links` is the durable multi-provider provenance store
- The post-apply still-clickable workbench state is a UX follow-up, not a Phase 20 blocker

### Blockers
- No hard blocker for Phase 20 anymore
- Cross-AI review is still unavailable locally because no independent reviewer CLI is installed

### Next Step
- Pick the next narrow follow-up slice from the verified import baseline, with the post-apply workbench UX as the strongest candidate

## 2026-04-21
- Project: `Team4s.v3.0`
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Today's focus: Phase 20 wave-3 code check, wave-4 verification, and an honest UAT/handoff state for release-native episode import

### Workstreams Touched
- Phase 20 wave-3 frontend reducer audit
- Phase 20 targeted backend/frontend verification
- Frontend production build verification
- Docker rebuild/redeploy for backend/frontend
- Phase 20 UAT and handoff documentation refresh

### Goals Intended vs Achieved
- Intended: verify that Wave 3 really matched the release-native contract and continue Wave 4
- Achieved: found and fixed one real Wave-3 mismatch, refreshed automated verification evidence, rebuilt Docker, and wrote the missing Wave-4 UAT/summary artifacts

### Problems Solved
- Root cause: Wave-3 UI still marked parallel releases for the same canonical episode as conflicts even though Phase 19/20 backend logic explicitly allows them
- Fix: simplified `detectMappingConflicts` so overlapping episode claims no longer downgrade valid parallel releases; updated frontend tests accordingly
- Root cause: Wave-4 had no current UAT artifact or summary, so the closure state was easy to misread
- Fix: created `20-UAT.md` and `20-04-SUMMARY.md` with explicit automated evidence and the remaining live Naruto replay steps
- Root cause: sandbox execution blocked Vitest and Docker verification commands
- Fix: reran the blocked commands with the required escalated permissions

### Open Follow-ups
- Create or recreate a disposable Naruto record on the local stack
- Run the live replay in `.planning/phases/20-release-native-episode-import-schema/20-UAT.md`
- Capture SQL evidence from normalized tables before closing Phase 20

## 2026-03-26
- Project: `Team4s.v3.0`
- Milestone: `Phase 4 - Provenance, Assets, And Safe Resync`
- Today's focus: verify Phase 3 honestly, define the asset-ownership model, execute the Phase 4 edit-route slice, and prepare durable Codex closeout tooling
- Repo-local project files live in `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0`

### Workstreams Touched
- Phase 3 verification and planning-state cleanup
- Phase 4 planning and scope refinement
- Backend anime asset persistence and runtime precedence
- Frontend Phase 4 edit-route provenance UI, asset actions, and preview rendering
- Runtime and browser verification for upload/remove/apply flows
- Migration-number conflict cleanup
- Codex skill/worker setup for day closeout

### Goals Intended vs Achieved
- Intended: determine whether Phase 3 was really done, then move into the next real phase instead of relying on stale closeout notes
- Achieved: Phase 3 is verified complete, Phase 4 is the active lane, backend asset-slot persistence groundwork exists, the edit-route UI slice is now implemented and verified, and the repo closeout flow is being made directly callable in Codex

### Problems Solved
- Root cause: the local planning/handoff layer still described an older anime create/edit story and was no longer a trustworthy resume point
- Fix: re-established the true current state around Phase 3 completion and Phase 4 activation
- Root cause: the migration set contained duplicate numbering for unrelated schema lines
- Fix: moved the conflicting files to `0037` and `0038` and added `0039` for anime asset slots so local `migrate up` works again
- Root cause: public asset reads still depended too heavily on Jellyfin fallback behavior
- Fix: backend runtime now prefers persisted anime banner/background assets over provider fallback when local assets exist
- Root cause: the Phase 4 edit route kept reloading Jellyfin context because effect dependencies changed on every render
- Fix: stabilized the callback usage in `AnimeJellyfinMetadataSection.tsx` with refs so the context fetch no longer loops
- Root cause: provider asset previews rendered blank even when Jellyfin had images because relative `/api/v1/media/...` paths were resolving against the frontend host
- Fix: added centralized API URL resolution and routed provider/persisted asset previews to `http://localhost:8092`

### Open Follow-ups
- Decide whether Phase 4 needs any additional focused frontend regression coverage beyond the helper test and browser smoke already run
- Decide whether to install `day-closeout` globally only as a skill or also expose it through a preferred worker calling convention
- Keep an eye on the untracked repository tests and docs that are outside today's change slice

## 2026-03-27
- Project: `Team4s.v3.0`
- Milestone: `Phase 4 - Provenance, Assets, And Safe Resync`
- Today's focus: close the remaining `04-03` architectural gap by moving `cover` into the persisted slot model, then verify it in Docker, DB, API, and the real admin UI

### Workstreams Touched
- Phase 4 plan-vs-ist audit
- Cover slot schema and repository work
- Jellyfin metadata apply/runtime protection
- Admin edit-route cover controls
- Docker/runtime migration and DB validation
- Browser smoke for real cover remove/upload/preview flow

### Goals Intended vs Achieved
- Intended: decide whether to narrow the phase or actually unify cover with the new asset model
- Achieved: cover now uses the same persisted slot and ownership model as banner/backgrounds, migration `0040` is applied in Docker, and the admin UI flow is verified end to end

### Problems Solved
- Root cause: `cover` still worked through the older `cover_image` path and remained an architectural exception
- Fix: added `cover_asset_id`, `cover_source`, `cover_resolved_url`, and `cover_provider_key` to `anime` and backfilled existing `cover_image` rows into the new model
- Root cause: Jellyfin apply responses could report an incoming provider state even when the DB correctly preserved a manual cover
- Fix: apply response now reflects the re-read persisted asset state after protected apply
- Root cause: only API/DB evidence existed for the new cover path, not the actual admin UI flow
- Fix: executed a browser smoke that removed the cover, re-uploaded the original file, and confirmed preview protection messaging

### Decisions
- Do not narrow `04-03` to exclude cover
- Keep `cover_image` as compatibility mirror while the new persisted slot model becomes authoritative
- Treat the temporary Playwright cover smoke as evidence for now, not yet as a permanent automated lane

### Blockers
- No product blocker
- Remaining blocker is formal phase closeout and deciding whether the ad-hoc cover smoke should be promoted into durable regression coverage

### Next Step
- Update the formal `04-03` plan/progress notes so cover is no longer tracked as still-open work

## 2026-03-30
- Project: `Team4s.v3.0`
- Milestone: `Anime v2 schema cutover (fresh DB path)`
- Today's focus: stop extending the legacy hybrid anime schema, stand up `team4s_v2`, move live anime create/read/delete onto it, and simplify the admin create/overview UI while keeping Jellyfin-backed public assets working

### Workstreams Touched
- Admin anime create page UX reduction and card cleanup
- Admin anime overview cleanup and delete action
- Delete audit retention and orphaned local-cover cleanup
- Fresh v2 schema bootstrap and runtime DB switch
- Backend anime create/read/backdrop/delete adaptation for v2
- Public Jellyfin cover rendering fix in frontend
- UTF-8 normalization for Jellyfin metadata payloads

### Goals Intended vs Achieved
- Intended: stop patching the old hybrid anime model and move the live anime path onto the new normalized schema
- Achieved: `team4s_v2` exists, backend runtime now points at it, anime create/list/detail/backdrops/delete work against v2, public Jellyfin covers render again, and the admin UI entry/create pages were stripped down to the functional core

### Problems Solved
- Root cause: the running anime code expected newer schema pieces than the local DB actually had
- Fix: created `database/migrations_v2`, bootstrapped a fresh normalized anime/media foundation, and switched the dev backend runtime to `team4s_v2`
- Root cause: anime create was still coupled to flat legacy columns
- Fix: added a v2 create path that writes `anime`, `anime_titles`, `anime_genres`, and cover media/external links while keeping the legacy path available when needed
- Root cause: public anime reads and backdrops still assumed the older anime table/asset-slot shape
- Fix: added v2 repository reads for list/detail/media lookup and a v2 asset resolver based on `anime_media` + `media_assets`
- Root cause: anime delete still loaded title/cover from legacy `anime.title` and `anime.cover_image`
- Fix: moved delete to load title from `anime_titles`, cover from `anime_media`/`media_assets`, delete normalized associations, and remove unreferenced media assets
- Root cause: public poster images from Jellyfin were rendered through paths that broke in the frontend/container setup
- Fix: normalized `/api/v1/media/...` cover URLs to the backend host and disabled Next image optimization for backend media proxy URLs
- Root cause: some Jellyfin metadata came back with broken umlauts / Windows-1252 style bytes
- Fix: normalized invalid Jellyfin response encodings to UTF-8 before JSON unmarshal

### Decisions
- Do not keep evolving the old hybrid anime schema as the main path
- Use a fresh v2 DB/runtime cutover for anime instead of trying to complete the migration in place first
- Keep legacy paths only as compatibility shims while the v2 slice is being pulled through route by route

### Blockers
- `UpdateAnime` / edit persistence is still legacy-only and is the next required v2 backend slice
- Broader public/admin routes outside anime create/read/delete are not yet fully on v2

### Next Step
- Move `UpdateAnime` in `backend/internal/repository/admin_content_anime_metadata.go` off legacy flat anime columns and onto v2 normalized writes

## 2026-03-31
- Project: `Team4s.v3.0`
- Milestone: `Phase 04.1 - Anime v2 Cutover Stabilization`
- Today's focus: stabilize the live anime v2 create/edit path, repair operator-facing errors, verify the real browser/runtime flow, and make stale legacy cover endpoints stop crashing on v2

### Workstreams Touched
- Phase `04.1` planning/state alignment
- v2 anime create/read/update/source persistence
- admin error-context surfacing in backend and frontend
- live edit/load/save verification on Docker
- local cover upload persistence and orphan cleanup
- stale legacy cover endpoint compatibility on the backend
- end-of-day review of remaining anime asset edit gaps

### Goals Intended vs Achieved
- Intended: make anime create/edit stable enough on `team4s_v2` that admins can create, load, save, cover-upload, and delete without generic 500s
- Achieved: v2 create/edit/read/save now behave reliably for the core anime flow, operator-visible error context is richer, stale legacy cover endpoints no longer 500 on v2, the remaining actionable gap is narrowed to banner/background asset actions still using legacy paths, and Phase 3 was re-executed/closed cleanly after its late Jellyfin intake clarifications landed

### Problems Solved
- Root cause: v2 create accepted `source`, `status`, `content_type`, and `max_episodes` without persisting them
- Fix: create and read paths now persist and reload those runtime fields on v2
- Root cause: admin edit/read/save still drifted into removed legacy anime columns and failed with generic internal errors
- Fix: schema-aware v2 update/read handling now carries the active edit flow and surfaces better operator error details
- Root cause: local cover upload could write a file without reliably becoming the persisted active anime cover
- Fix: v2 update logic now persists the chosen cover through the anime media model and verified reload shows the same cover again
- Root cause: a stale frontend bundle still hit `/api/v1/admin/upload` and `/api/v1/admin/anime/:id/assets/cover`, which hard-crashed on removed legacy asset columns
- Fix: old anime-cover upload and cover-assign/delete endpoints now degrade safely on v2 by returning a usable media path and routing cover mutation through v2-compatible logic
- Root cause: Phase 3 planning drift left late Jellyfin intake clarifications unexecuted even though the earlier phase had mostly been finished
- Fix: executed the remaining Phase 3 slices for candidate-review UI closeout, folder-name title seeding, and takeover-only draft view; added fresh summaries, verification, and UI review artifacts
- Root cause: the shared create shell still weakened the otherwise solid Phase 3 Jellyfin UX with mixed labels and stale upload wording
- Fix: localized the key shared-draft labels, aligned candidate CTA copy with the Phase 03 contract, and removed the local-dev framing from the cover help text

### Decisions
- Treat the current anime work as `Phase 04.1` stabilization, not as generic unfinished Phase 4 provenance work
- Keep `team4s_v2` as the runtime source of truth and add targeted compatibility shims only where they protect the active admin flow
- Cover compatibility on stale clients is worth keeping server-side so browser cache state does not turn routine edits into 500s

### Blockers
- No hard product blocker on the core anime create/edit/cover flow
- Remaining blocker: banner/background asset actions in the edit metadata panel still rely on legacy upload/slot endpoints and remain a real v2 regression
- Process blocker: `$gsd-review` could not run as a real cross-AI review because no independent external reviewer CLI (`gemini` or `claude`) is installed on this machine

### Next Step
- Extend the new v2 asset compatibility from cover to banner/background by tracing `AnimeJellyfinMetadataSection.tsx` through `AssignManualBanner`, `ClearBanner`, and background add/remove

## 2026-04-01
- Project: `Team4s.v3.0`
- Milestone: `anime intake/provenance/relation milestone closeout`
- Today's focus: finish the open verification tail, close the milestone honestly, and capture the next upload/provisioning thread clearly enough that tomorrow does not reopen finished work by accident

### Workstreams Touched
- Phase 5 execution and verification closeout
- Phase 2 human verification follow-through
- upload and asset lifecycle clarification
- end-of-day handoff refresh

### Goals Intended vs Achieved
- Intended: finish the remaining verification debt and leave the repo on a clean resume point
- Achieved: Phase 5 is complete, Phase 2 human verification is now fully green, the old backend compile-blocker note is cleared, and the next thread is reframed around a generic upload/provisioning contract instead of unfinished intake behavior

### Problems Solved
- Root cause: the milestone still looked open because Phase 2 had a lingering human-verification tail
- Fix: completed the browser/manual checks plus the backend package re-run and updated the verification artifacts
- Root cause: discussion about upload/replace/delete behavior was still implicit and easy to rediscover repeatedly
- Fix: recorded a durable decision that future asset work should use one generic upload and asset lifecycle contract

### Decisions
- Do not interrupt finished milestone verification by silently retrofitting the new upload contract into old Phase 2 scope
- Treat generic upload, linking, replacement, and cleanup as the next planning thread

### Blockers
- No hard product blocker
- Process blocker remains the missing independent reviewer CLI for true `$gsd-review`

### Next Step
- Start the next slice by tracing the existing upload seam in `media_upload_image.go` and `media_upload.go` against the new generic contract

## 2026-04-03
- Project: `Team4s.v3.0`
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Today's focus: finish honest browser verification for Phase 06, close the remaining create/edit/delete asset lifecycle gaps, and leave the repo ready for Phase 07 planning

### Workstreams Touched
- Phase 06 browser UAT and artifact closeout
- manual anime create/edit cover upload integration
- V2 asset remove/delete cleanup
- historical test artifact cleanup in DB and filesystem
- handoff and planning-state refresh

### Goals Intended vs Achieved
- Intended: verify the real manual upload lifecycle before widening scope into generic upload work
- Achieved: Phase 06 passed browser UAT, the remaining integration bugs were fixed, historical test debris was cleaned up, and the next real step is now clearly Phase-07 planning

### Problems Solved
- Root cause: manual create/edit still had paths falling back to `frontend/public/covers` and `/api/admin/upload-cover`
- Fix: both flows now use the verified V2 upload seam
- Root cause: `Cover entfernen` only cleared visible state and left V2 media rows/files behind
- Fix: cover removal now clears DB ownership and the concrete asset directory
- Root cause: anime delete in the hybrid schema state could remove the anime row but leave media artifacts behind
- Fix: delete detection and cleanup were hardened, then the historical test leftovers were manually cleared

### Decisions
- Treat the verified Phase-06 seam as the baseline for Phase 07
- Do not execute Phase 07 before it exists as real phase files under `.planning/phases`

### Blockers
- No product blocker on Phase 06 anymore
- Process blocker: Phase 07 is not planned yet, so execution cannot start

### Next Step
- Plan Phase 07 from the verified anime-first V2 upload/linking seam

## 2026-04-05
- Project: `Team4s.v3.0`
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Today's focus: execute and verify Phase 07 end to end, close the remaining generic-upload UI gaps, and leave a clean handoff after human UAT approval

### Workstreams Touched
- Phase 07 execution, gap-closure planning, and verification
- backend V2 persisted-asset resolution for manual non-cover uploads
- edit-route asset provenance UI refactor
- create/edit/delete browser UAT on the local Docker stack
- handoff and phase-closeout bookkeeping

### Goals Intended vs Achieved
- Intended: make the verified cover seam work generically for more anime asset types without reintroducing slot-specific legacy behavior
- Achieved: Phase 07 is now approved, manual `banner`, `logo`, `background`, and `background_video` flows run through the shared V2 seam, the edit UI was reworked to manage assets directly in the provenance cards, and delete cleanup was rechecked after real manual uploads

### Problems Solved
- Root cause: Phase 07 initially passed automation but still left edit/create reachability gaps for some non-cover asset controls
- Fix: executed the gap plans, exposed the missing asset controls, and verified the create/edit path in the browser
- Root cause: manual `banner` and `logo` uploads were stored and linked correctly but still rendered as if no persisted assets existed
- Fix: patched `backend/internal/repository/anime_assets.go` so V2 asset resolution no longer failed on `NULL modified_at`
- Root cause: the edit UI split asset viewing from asset actions, which made the active-vs-provider state hard to understand
- Fix: merged upload/remove/open actions into the actual provenance cards, moved cover management into the cover card, and adapted backgrounds to a gallery-style multi-asset presentation
- Root cause: follow-up UI tweaks for cover/banner presentation and button placement were still needed after the first refactor
- Fix: tightened the card layout, used poster-style rendering for cover, kept banner wide, and reduced copy/noise in the active state panels

### Decisions
- Treat Phase 07 as closed after browser approval; do not reopen it for additional polish unless a real regression appears
- Keep asset actions in the provenance cards instead of separate management cards
- Treat backgrounds as a multi-image gallery problem, not as a singular slot-comparison card

### Blockers
- No product blocker on the verified Phase-07 seam
- Process blocker remains the missing independent reviewer CLI for true `$gsd-review`
- Planning blocker for tomorrow: the next post-Phase-07 phase is not selected yet

### Next Step
- Sync remaining roadmap/requirements/milestone tracking to the now-approved Phase-07 state and choose the next phase

## 2026-04-09
- Project: `Team4s.v3.0`
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Today's focus: finish Phase 10 honestly, close the tag-schema gap, verify create/delete behavior in the browser, and replace the broken GitHub baseline with the validated local recovery state

### Workstreams Touched
- Phase 10 planning, execution-state sync, and UAT
- tag schema repair migration and backend create persistence
- local dev startup scripts for backend/frontend without Docker rebuilds
- browser/runtime verification for tags, assets, create, and delete cleanup
- Git recovery branch creation, `main` replacement, and bad branch cleanup
- repo-local handoff refresh

### Goals Intended vs Achieved
- Intended: confirm the current create flow still works, close the remaining Phase-10 gap cleanly, and make the current validated workspace the new trustworthy GitHub baseline
- Achieved: Phase 10 is now complete with tags persisted through DB-backed `tags`/`anime_tags`, the browser flow was rechecked for create/delete and asset cleanup, local non-Docker dev scripts are in place, and GitHub `main` now points at the validated recovery commit

### Problems Solved
- Root cause: the running DB did not actually contain `tags` / `anime_tags` even though planning and code assumed they existed
- Fix: added forward-only migration `0042_add_tag_tables_forward_fix` and applied it instead of mutating historical applied migrations
- Root cause: create validation dropped `req.Tags` before authoritative persistence, so tag input could silently vanish even after the schema fix
- Fix: passed `Tags` through validation and added a regression test to lock that behavior
- Root cause: local backend startup without Docker rebuilds failed because Redis was not reachable and Jellyfin env values were not loaded
- Fix: exposed Redis on `6379`, added `start-backend-dev.ps1` / `start-frontend-dev.ps1`, and loaded Jellyfin settings from `.env`
- Root cause: the create page could throw a hydration mismatch because auth state differed between server render and client token rehydration
- Fix: introduced a neutral auth-loading state until client hydration completes
- Root cause: the real Git repo had drifted away from the validated `Team4sV2` state and GitHub still pointed at a broken baseline
- Fix: created `codex/recovery-valid-v2-20260409`, mirrored the validated workspace into the Git repo, tested it, moved `main` to commit `9f54a3a`, and deleted the old broken remote branches

### Decisions
- Keep `Team4s` as the canonical local Git repo and treat `Team4sV2` as disposable recovery workspace material
- Replace bad remote history by promoting the tested recovery branch to `main` instead of continuing to patch the broken old branch
- Keep the recovery branch temporarily as rollback rope even after `main` is updated

### Blockers
- No current product blocker on Phase 10
- Process blocker remains the missing independent reviewer CLI for a real `$gsd-review`

### Next Step
- Start Phase 11 planning from the now-clean `main` baseline and keep any new work inside `C:\Users\admin\Documents\Team4s`

## 2026-04-12
- Project: `Team4s.v3.0`
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Today's focus: finish AniSearch create relation follow-through, verify the real persistence path, fix the last parser bug on AniSearch relation pages, and push the corrected Phase-13 baseline to GitHub

### Workstreams Touched
- Phase 13 execution, verification, and closeout
- AniSearch create relation carry-through in frontend and backend
- create success/warning semantics for idempotent relation outcomes
- AniSearch relation-page parser repair
- live local verification against the running backend and database
- repo-local handoff refresh

### Goals Intended vs Achieved
- Intended: prove whether AniSearch relations really survive create/save and remove the remaining uncertainty around missing relation imports
- Achieved: Phase 13 is now effectively complete, create-side AniSearch relations persist through save into the DB, the last real blocker was identified as a parser bug in AniSearch `data-graph` decoding, and the fix is committed and pushed

### Problems Solved
- Root cause: the create route previously dropped AniSearch relations before the final anime create request
- Fix: the final create payload now carries AniSearch `relations` alongside `source`
- Root cause: idempotent `relations_skipped_existing` outcomes were being surfaced like operator-visible failures
- Fix: create success messaging now treats `applied + skipped_existing` as accounted successful follow-through
- Root cause: AniSearch relation pages with mixed node container types (`anime` object plus empty `manga` / `movie` arrays) caused the graph JSON decode to fail silently
- Fix: the parser now decodes node groups tolerantly and no longer discards valid anime relations when non-anime groups are empty arrays
- Root cause: the misleading "keine lokalen Relationen" symptom obscured that the real failure was earlier in graph parsing
- Fix: traced the issue with the concrete `Ace of the Diamond: Staffel 2` case and verified the repaired parser now yields the expected Staffel-1 and Act-II relations

### Decisions
- Treat Phase 13 as closed based on automated verification plus live local DB-backed confirmation
- Keep the AniSearch parser tolerant of mixed graph node types instead of assuming every node group is always an object
- Preserve directed relation follow-through only; no automatic reverse relation was added
- Choose edit-route relation UX as the next AniSearch/admin slice before any broader relation-label normalization

### Blockers
- No product blocker remains on the Phase-13 create relation path
- Process blocker remains the missing independent reviewer CLI for true `$gsd-review`
- Workspace note: root handoff files and some older Phase-11 artifacts were already dirty before closeout and remain unstaged user/worktree context
- Procedural blocker: the next slice is chosen, but the exact edit-route relation UX scope still needs to be written down before implementation

### Next Step
- Scope the edit-route relation UX slice explicitly before touching broader relation taxonomy changes

## 2026-04-15
- Project: `Team4s.v3.0`
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Today's focus: harden the Phase-15 create-page asset-search follow-through so provider-selected assets survive the authoritative create path, keep provider provenance on imported backgrounds, refresh the root handoff files, and push the current state to GitHub

### Workstreams Touched
- Phase 15 follow-through on create payload and repository persistence
- background provider provenance carry-through for staged remote assets
- asset-search provider tuning (`fanart.tv` backgrounds and Safebooru pagination)
- root handoff/state refresh and end-of-day closeout

### Goals Intended vs Achieved
- Intended: close the gap between create-page remote asset selection and the authoritative create/save seam without reopening older slot-specific behavior
- Achieved: create now carries provider-selected `banner`, `logo`, `background_video`, and `background` URLs into the backend create input, the V2 repository attaches those URLs into `media_assets`/`anime_media`, background uploads can retain their `provider_key`, and the repo-local closeout files now reflect the real Phase-15-plus-follow-through state

### Problems Solved
- Root cause: Phase 15 could stage remote search results into local files, but the authoritative create payload still only carried `cover_image`, which left non-cover provider selections at risk during create/save
- Fix: extended the create request/model/validation path so `banner_image`, `logo_image`, `background_video_url`, and `background_image_urls` flow into backend create handling and V2 media attachment
- Root cause: background assets adopted from online search lost their upstream source context after upload/link, which weakened later provenance reasoning
- Fix: threaded optional `provider_key` through create-side background upload/linking and upserted matching `media_external` rows during background linking
- Root cause: `fanart.tv` backgrounds were not exposed through the provider matrix and Safebooru's deterministic offset could skip small result sets too aggressively
- Fix: enabled `background` support for `fanart.tv`, mapped `showbackground`, and reduced the Safebooru starting-offset variance
- Root cause: root handoff files still described the older Phase-13 relation thread while `main` had already moved through Phase 14 and Phase 15
- Fix: refreshed the closeout files to match the actual `main` baseline plus today's dirty follow-through work

### Decisions
- Treat today's work as Phase-15 follow-through, not as a return to the older edit-route relation thread
- Keep remote create-page asset adoption on the same upload/link seam by carrying the selected provider URLs and provenance through the normal create contract

### Blockers
- Verification blocker: local Go tests could not download missing modules inside the sandboxed network path, and Vitest failed on sandbox `spawn EPERM`, so today's code remains unverified in this session
- Process blocker: live browser UAT for the Phase-15 remote-asset adoption flow is still pending

### Next Step
- Run one live create-page smoke for remote banner/background adoption and confirm the created anime keeps those assets plus provider provenance after save

## 2026-04-18
- Project: `Team4s.v3.0`
- Milestone: `v1.1 Asset Lifecycle Hardening`
- Today's focus: finish the anime-create UX/UI follow-through, close the create asset persistence/provenance gaps, verify multi background-video handling, deploy Docker for testing, and leave the workspace ready to push.

### Workstreams Touched
- Anime create Section 1 AniSearch/Jellyfin intake UX
- Anime create Section 2 asset layout and online asset search presentation
- Multi background-video staging, upload, linking, persistence, and runtime manifest resolution
- Create metadata card consolidation and visible Jellyfin folder path
- Provider provenance for TMDB/Zerochan/Fanart/Konachan/Safebooru/Jellyfin/manual assets
- Docker deploy and repo-local handoff refresh

### Goals Intended vs Achieved
- Intended: make `/admin/anime/create` match the reference UI closely enough for operator testing and remove temporary test/debug surfaces.
- Achieved: Anime create is considered complete for this slice. The asset area now uses the reference-style primary cards, right-side background grid, compact 2-column background-video grid, source badges, image-overlay remove/edit/upload actions, hidden AniSearch diagnostics, and a readonly `Ordnerpfad` field.

### Problems Solved
- Root cause: background videos were modeled as a singular slot in several frontend/backend seams.
- Fix: staged background videos are now additive in the create flow, uploaded and linked through the plural backend route, and runtime backdrop resolution exposes all videos.
- Root cause: provider-selected create assets could lose source identity or fail to persist through the final save seam.
- Fix: create-side upload/link planning keeps provider keys where available and backend V2 attachment paths preserve provenance for additive backgrounds.
- Root cause: the asset section layout drifted from the reference design and made videos/backgrounds visually too large or misaligned.
- Fix: rebuilt Section 2 around primary Cover/Banner/Logo cards, a separated background grid, and compact two-column video cards inside the primary asset width.
- Root cause: AniSearch test/status details were useful during development but noisy for real use.
- Fix: removed the rendered technical summary block while keeping duplicate/error feedback.
- Root cause: operators could not see which Jellyfin folder was linked after adoption.
- Fix: exposed the Jellyfin series path as readonly `Ordnerpfad` in Basisdaten.

### Decisions
- Treat Anime Create as complete for the current v1.1 UX/UI follow-through slice.
- Keep background videos additive, not a single replace-only slot, while preserving the existing `background_video` naming at API boundaries where already established.
- Keep AniSearch diagnostics hidden in the operator UI; only actionable duplicate/error states remain visible.
- Keep the folder link visible as metadata (`Ordnerpfad`) rather than a separate debug/status card.

### Verification
- `cd frontend && npm test -- src/app/admin/anime/create/CreateAniSearchIntakeCard.test.tsx src/app/admin/anime/create/page.test.tsx`
- `cd frontend && npm test -- createAssetUploadPlan.test.ts`
- `cd frontend && npm run build`
- `cd backend && go test ./internal/repository ./internal/handlers ./internal/services`
- `docker compose up -d --build team4sv30-frontend`
- Smoke: `http://127.0.0.1:3002/admin/anime/create` returned `200`.
- Smoke: `http://127.0.0.1:8092/api/v1/anime` returned `200`.

### Blockers
- No known product blocker remains for Anime Create.
- Cross-AI review remains unavailable because no independent reviewer CLI is installed locally.

### Next Step
- Do one short human browser pass on `/admin/anime/create` after the pushed build: create a small test anime, confirm assets/folder path look correct, then delete the test record if needed.
