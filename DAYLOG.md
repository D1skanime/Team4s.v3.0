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
