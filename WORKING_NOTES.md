# WORKING_NOTES

## Current Workflow Phase
- Phase: Generic Media Upload Service Implementation
- Focus: Core infrastructure complete, debugging cover upload button, migration verification

## Project State
- Done:
  - Generic media upload service backend implementation
  - Image processing (WebP conversion, thumbnails) with Go `imaging` library
  - Video processing (FFmpeg thumbnail extraction)
  - Database schema (MediaAsset, MediaFile, join tables)
  - Cover migration script executed (2231 covers migrated)
  - Frontend media serving route (`/media/[...path]/route.ts`)
  - Frontend upload mutation with FormData and auth token
  - Transaction handling for atomic DB writes
  - Path traversal protection (security)
  - Auth middleware integration (admin gate)
  - Docker config updated (volume mount, env vars, Go 1.25, FFmpeg)
  - All builds passing (Go, Next.js, Docker)
- In progress:
  - Cover upload button debugging (ref.current null issue)
  - End-to-end upload smoke testing
- Blocked:
  - None

## Key Decisions & Context
- Intent & Constraints:
  - Keep closeout repo-local
  - Do not disturb foreign worktree changes (`server.exe`, tsconfig artifacts)
  - Generic upload service for all media types (no specialized endpoints)
  - No separate microservice (Go-native implementation)
  - No Redis/queue (synchronous processing sufficient)
- Design / Approach:
  - **Upload Endpoint:** Single `/api/v1/admin/upload` for images + videos
  - **Image Processing:** Go-native `imaging` library (no libvips dependency)
  - **Video Processing:** FFmpeg CLI via `os/exec` (no Go bindings)
  - **Security:** MIME magic bytes, path traversal protection, admin auth middleware
  - **Transactions:** Atomic writes for MediaAsset + MediaFile + join tables
  - **Migration:** UUID-based paths, backward-compatible URL resolution
- Assumptions:
  - Synchronous processing fast enough for current file sizes (<50MB images, <300MB videos)
  - Go `imaging` library performance sufficient vs. libvips (simpler deployment preferred)
  - FFmpeg always available in Docker environment (startup check warns if missing)
  - Cover migration safe to execute without staged rollout (tested with dry-run)
  - Schema deviation from `db-schema-v2.md` acceptable if documented (inline entity_type vs. FK)
- Quality Bar:
  - Go build passes
  - Next.js build passes
  - Docker deployment succeeds
  - Runtime health checks pass
  - Critical review blockers resolved (7/7 for Media Upload Service)
  - Security validations implemented (MIME, path, auth)
  - Transaction integrity maintained
  - Migration tested with dry-run before live execution

## Parking Lot
- Documentation cleanup: Archive/correct outdated UX handoff docs
- Separate cleanup for repo-wide frontend lint errors
- Optional accessibility audit for anime detail page
- Implement proper GIF animation detection (current: assumes all GIFs animated)
- Add rate limiting middleware for upload endpoint
- Add upload progress indicator for large files
- Add admin UI for media gallery management

### Day 2026-03-22
- Phase: Generic Media Upload Service Implementation
- Accomplishments:
  - Backend upload endpoint implemented (`/api/v1/admin/upload`)
  - Image processing with Go `imaging` library (WebP conversion, 300px thumbnails)
  - Video processing with FFmpeg (thumbnail extraction at 5s, black placeholder fallback)
  - Database schema migrations (MediaAsset, MediaFile, AnimeMedia, EpisodeMedia, etc.)
  - Cover migration script created and executed (2231 covers -> `/media/anime/{id}/poster/{uuid}/`)
  - Frontend media serving route implemented (`/media/[...path]/route.ts`)
  - Frontend upload mutation with FormData and auth token
  - Backward-compatible `getCoverUrl()` (supports `/covers/` and `/media/`)
  - Resolved 6 of 7 Critical Review blockers (auth, transactions, path traversal, FFmpeg check, cleanup)
  - Fixed Go version conflict (1.23 -> 1.25), docker-compose duplicate env section
  - Added debug logging for cover upload button click handler
- Key Decisions:
  - Generic upload endpoint architecture (single endpoint for all media types)
  - Go-native `imaging` vs. libvips (chose simplicity over speed)
  - FFmpeg CLI vs. Go bindings (chose stability and simplicity)
  - Transaction boundary for atomic DB writes (data integrity)
  - Path traversal protection with `filepath.Clean()` (security)
  - Inline `entity_type`/`asset_type` fields vs. `media_type_id` FK (pragmatic deviation from schema)
- Risks/Unknowns:
  - Cover upload button click handler not firing (ref.current null issue - debugging in progress)
  - Migration rollback procedure not yet documented (Critical Review blocker C6 pending)
  - End-to-end upload smoke test not yet completed (UI path untested)
  - Schema deviation from `db-schema-v2.md` may cause issues in future phases (needs documentation)
- Next Steps:
  - Debug cover upload button ref lifecycle issue
  - Document migration rollback procedure (SQL + filesystem cleanup)
  - Run end-to-end upload smoke test (image + video via UI)
  - Verify cover display on anime detail page after migration
  - Add unit tests for upload handler validation logic
- First task tomorrow: Debug cover upload button ref.current null issue with component mount order inspection
- Mental Unload: Dense implementation day with a lot of moving parts. Core infrastructure is solid - upload endpoint works via API, migration script executed successfully, all critical review blockers resolved except rollback docs. Cover upload button issue is frustrating but not blocking - API works, just UI convenience missing. FFmpeg integration was smoother than expected. Schema mismatch discussion was enlightening - pragmatic deviations from specs are okay if documented. Tomorrow should be lighter - debug ref issue, write rollback docs, smoke test, and we're done with this epic.

### Day 2026-03-18 (END OF DAY - COMPLETE)
- Phase: Genre Array Contract + Related Section Final Corrections
- Accomplishments:
  - Implemented full genre array contract (backend + frontend + OpenAPI)
  - Backend parses genre CSV into `Genres []string` in repository layer
  - Frontend uses type-safe `anime.genres` without workarounds
  - Corrected Related section placement (inside infoCard, not standalone)
  - Fixed AnimeEdgeNavigation positioning (heroContainer level)
  - Added overflow handling and scroll buttons for Related section
  - Improved preview cards (title + type, white background, glass effect)
  - All builds passing, Docker deployment successful
  - Runtime verification complete
  - Day closeout completed: all docs updated, git committed
- Key Decisions:
  - Dual-field strategy for genres (backward compatible)
  - Related section belongs INSIDE infoCard (previous docs incorrect)
  - CSV parsing acceptable for current dataset size
  - Documentation inconsistency documented and flagged for tomorrow
- Risks/Unknowns:
  - Previous UX documentation needs correction (flagged for tomorrow)
  - Repo-wide lint debt remains unaddressed (inventory planned)
  - Foreign worktree files require careful git staging (pattern working)
- Next Steps:
  - Clean up outdated UX handoff documentation
  - Inventory frontend lint debt for separate pass
  - Consider accessibility audit
- First task tomorrow: Add correction notice to outdated UX handoff docs
- Mental Unload: Clean day, moved from workarounds to proper implementations. Genre array contract is exactly right. Related section correction proves importance of validating design docs during implementation. All systems green, no blockers.

### Day 2026-03-15
- Phase: Glassmorphism redesign and initial Related section work
- Note: Related section placement described in day-15 docs was later found to be incorrect
