# DAYLOG

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
