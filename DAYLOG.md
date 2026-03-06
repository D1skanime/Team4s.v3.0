# DAYLOG

## 2026-03-06
- Added the public `GET /api/v1/releases/:releaseId/assets` contract/handler and corresponding backend coverage.
- Wired the public episode detail `MediaAssetsSection` to the real assets endpoint and removed the remaining mock release-asset dependency from the live route.
- Re-ran `go test ./...`, `npm test`, and `npm run build`.
- Rebuilt `team4sv30-backend` and `team4sv30-frontend` and validated the live route:
  - `http://localhost:8092/api/v1/releases/311/assets`
  - `http://localhost:3002/episodes/106?releaseId=311&animeId=25&groupId=75`

## 2026-03-05
- Verified local VS Code setup for development: user settings, terminal defaults, and extension inventory.
- Confirmed CPU-only terminal setup is consistent with current environment (`terminal.integrated.gpuAcceleration = off`).
- Installed recommended extension baseline: EditorConfig, Prettier, ESLint, GitLens, Code Spell Checker, Jupyter, Ruff.
- Validated Jellyfin API scope via stable OpenAPI: directory browse/validate and library-path management exist, direct media-folder creation endpoint not documented.
- Validated Emby API scope via official REST reference: directory listing/library virtual folder endpoints exist, direct filesystem folder creation endpoint not documented.
- Captured closeout documentation and next-step plan for implementing one-click anime/group asset folder provisioning through project-owned automation.

## 2026-03-03
- Migrated remaining frontend `img` usage to `next/image` across admin and public surfaces; build + local deploy validated.
- Added explicit sync workflow copy in admin: bulk season sync is now clearly separated from corrective single-episode sync.
- Extracted `SyncEpisodeFromJellyfin` into `backend/internal/handlers/jellyfin_episode_sync.go` as first handler modularization step; backend tests passed and backend redeployed.
- Completed the next handler modularization step for sync lanes: `jellyfin_sync.go` reduced to 144 lines and `jellyfin_episode_sync.go` reduced to 114 lines using focused helper files.
- Added centralized Jellyfin transport diagnostics in `fetchJellyfinJSON` with failure log context (`path`, `elapsed_ms`, `category`) to improve timeout/connectivity triage.
- Documented sync/admin hardening review findings and created operator runbooks for timeout diagnostics, deployment hardening, and search query-plan tracking.
- Re-ran full CI-equivalent checks (`go test ./...`, `npm test`, `npm run build`) and executed `scripts/smoke-admin-content.ps1` (25/25 passed).
- Added deterministic cropper parity coverage by extracting crop math to `mediaUploadCropMath.ts` and adding focused Vitest assertions.
- Benchmarked anime search with/without trigram index at scale and added migration `0017_anime_search_trgm` (applied locally).
- Removed 10 unreferenced broken cover artifacts from `frontend/public/covers` (HTML/GZIP/empty binaries).

## 2026-03-02
- Fixed the backend Gin route conflict for single-episode sync by reusing the existing `:id` prefix on the nested admin anime route.
- Verified the local backend runtime again (`/health`) and live-smoke-tested `POST /api/v1/admin/anime/25/episodes/1/sync` successfully.
- Added focused frontend regression tests for Jellyfin feedback mapping and sync-dialog gating so the step feedback logic is now covered by Vitest.
- Fixed the follow-up Jellyfin sync bug where episode versions were created without `stream_url`; sync now persists visible Jellyfin links automatically.
- Captured the next UX work bundle: run the `team4s-design` agent on episode edit + version edit, then simplify the public anime detail to one active fansub group at a time.
- Locked in the public anime direction: one active group controls the visible description/history and the public episode versions; all groups should never render simultaneously.

## 2026-03-01
- Added focused regression coverage for the admin anime step-flow (145 tests total across frontend and backend), with passing test results.
- Captured the next work bundle for provider sync reliability: separate provider/Jellyfin search and sync endpoints, explicit preview before sync, and visible frontend loading/error states.
- Logged the required JellySync search follow-up: validate the Jellyfin series lookup, add structured error JSON, and render candidate anime folders as preview cards.
- Queued the `/admin/anime/{id}/episodes` refactor so version counts, expandable version details, and fansub group badges are visible before deeper edits.
- Flagged a broader backend/frontend/UX review plus optional audit logging as the next architectural cleanup after the sync flow is repaired.

## 2026-02-27
- Removed the tracked root `.env`, replaced it with `.env.example`, and rewrote the Git history so leaked secrets are no longer present in the normal GitHub commit history.
- Reworked the Admin Anime IA from the old 3-column surface into a step-based flow: `/admin/anime`, `/admin/anime/[id]/edit`, `/admin/anime/[id]/episodes`, `/admin/anime/[id]/episodes/[episodeId]/edit`, and `/admin/anime/[id]/episodes/[episodeId]/versions`.
- Rebuilt the Anime bearbeiten route into a sectioned SaaS-style workspace with a unified header, sticky save bar, advanced developer panel, and restored Jellyfin sync inside a collapsible provider section.
- Repaired the genre suggestion backend path so DB-backed suggestions are reachable through `GET /api/v1/genres?query=...`; backend now returns matching rows, while the browser-side dropdown still needs one final live validation pass.
- Rebuilt and redeployed the local backend/frontend stack; `/health`, `/admin/anime/25/edit`, and the genre API all returned healthy responses.
