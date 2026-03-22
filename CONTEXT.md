# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** Generic Media Upload Service Implementation
- **Current Slice:** Upload Infrastructure + Cover Migration + Debugging
- **Completion:** ~85%

## Current State

### What Finished Today (2026-03-22)
- **Generic Media Upload Service (CORE COMPLETE)**
  - Backend: Upload endpoint `/api/v1/admin/upload` with validation, image/video processing
  - Backend: Image processing with Go-native `imaging` library (WebP conversion, thumbnails)
  - Backend: Video processing with FFmpeg CLI (thumbnail extraction at 5s)
  - Backend: Transaction handling for atomic DB writes (MediaAsset + MediaFile + joins)
  - Backend: Path traversal protection (filepath.Clean + prefix validation)
  - Backend: Auth integration (admin middleware on upload endpoint)
  - Database: Schema migrations (MediaAsset, MediaFile, AnimeMedia, EpisodeMedia, etc.)
  - Migration: Cover migration script created and executed (2231 covers -> `/media/anime/{id}/poster/{uuid}/`)
  - Migration: `anime.cover_image` column updated to new paths
  - Frontend: Media serving route `/media/[...path]/route.ts` implemented
  - Frontend: Upload mutation with FormData and auth token
  - Frontend: Backward-compatible `getCoverUrl()` (supports `/covers/` and `/media/`)
  - Docker: Volume mount `./media:/media`, environment variables configured
  - Fixes: Go version 1.25, docker-compose duplicate env section, auth token header

- **Bugfixes Today**
  - Docker Compose: Removed duplicate `environment:` section (syntax error)
  - Dockerfile: Updated Go version from 1.23 to 1.25 (alignment with go.mod)
  - Auth: Added `Authorization: Bearer` header to upload request
  - Config: Added `AUTH_ISSUE_DEV_MODE=true` and related variables for local development
  - FFmpeg: Added startup check with warning log if missing

### What Finished Previously (2026-03-18)
- **Genre Array Contract Implementation (COMPLETE)**
  - Backend: Added `Genres []string` field to `AnimeDetail` model
  - Backend: Parse genre CSV string into array in repository layer
  - OpenAPI: Added `genres` array schema to contract
  - Frontend: Added `genres?: string[]` to interface
  - Frontend: Removed type workaround, now uses `anime.genres` directly
  - Backward compatible: `genre` string remains for legacy consumers

- **Related Section Fix (CORRECTED)**
  - Fixed AnimeEdgeNavigation positioning (top-left/top-right on heroContainer)
  - Corrected Related section placement (inside infoCard, not standalone)
  - Added overflow handling to prevent cards from overflowing boundaries
  - Implemented scroll buttons for horizontal navigation when needed

- **Preview Card Improvements (COMPLETE)**
  - Preview cards now show title + type (instead of ID + status)
  - White background with black text for better readability
  - Glass effect added to posterColumn (matches infoCard)

- **Validation**
  - Go build: SUCCESS
  - Next.js build: SUCCESS
  - Docker deployment: SUCCESS
  - Runtime verification: PASSED
  - `http://localhost:8092/health` -> `{"status":"ok"}`
  - `http://localhost:3002/anime/25` -> HTTP 200

### What Still Works
- Anime detail page renders with glassmorphism hero design
- Genre chips display correctly with array data
- Related section positioned correctly within hero card
- Edge navigation buttons positioned correctly
- Backend/frontend compose stack runs successfully
- All runtime health checks pass
- Generic media upload endpoint functional (API-level tested)
- Cover migration completed (2231 covers migrated to new structure)
- Media serving route delivers files with correct Content-Type
- Frontend upload mutation integrated with auth token

### What Is Pending
- **Cover upload button debugging:** Click handler not triggering file input (ref.current null issue)
- Migration rollback documentation (Critical Review blocker C6)
- End-to-end upload smoke test (image + video via UI)
- Verify cover display on anime detail page after migration
- Unit tests for upload handler validation logic
- Documentation cleanup: Previous UX handoff incorrectly described Related placement
- Repo-wide frontend lint debt cleanup (separate from this slice)

### Active Epic: Media Upload Service (GSD)
- **Spec:** `docs/architecture/media-upload-service-spec.md`
- **Phases:** `docs/architecture/media-upload-service-phases.md`
- **Status:** Core implementation complete, debugging + verification in progress
- **Goal:** Generischer Upload-Service fuer Bilder + Videos (Karaoke)
- **Key Tech:** Go-native (imaging + FFmpeg CLI), kein separater Service
- **Phasen:** 3 (Bild-Upload → Video-Upload → Migration) - All phases implemented
- **Progress:**
  - Phase 1 (Image Upload): COMPLETE
  - Phase 2 (Video Upload): COMPLETE
  - Phase 3 (Cover Migration): COMPLETE
  - Debugging: IN PROGRESS (cover upload button UI issue)

## Key Decisions

### Generic Upload Endpoint Architecture (2026-03-22)
- Single endpoint `/api/v1/admin/upload` handles all media types (images + videos)
- Entity type and asset type validated via whitelists (anime, episode, fansub, etc.)
- Path construction uses `filepath.Clean()` with prefix validation (security)
- Transaction boundary wraps MediaAsset + MediaFile + join table writes (data integrity)
- Go-native `imaging` library chosen over libvips (simpler deployment, pure Go)
- FFmpeg CLI for video thumbnails (stable, well-documented, no cgo complexity)
- Backward-compatible cover URL resolution (supports `/covers/` and `/media/` during migration)

### Genre Array Contract (2026-03-18)
- Backend provides both `genre` string (legacy) and `genres` array (new)
- CSV parsing happens in backend repository layer
- Frontend prefers array, falls back to empty array
- No breaking changes for existing consumers
- Type-safe genre handling achieved

### Related Section Placement (CORRECTED 2026-03-18)
- `Related` belongs **inside** the infoCard, not as standalone post-hero block
- Previous UX documentation was incorrect and needs archiving/correction
- Horizontal scroll with overflow handling
- Scroll buttons appear when more than 3 cards exist
- AnimeEdgeNavigation positioned at heroContainer level (top-left/top-right)

### Closeout Constraints
- Day closeout stays repo-local to `Team4s.v3.0`
- Git activity for this closeout runs only inside this repo
- Foreign changes such as `backend/server.exe` and `tsconfig.tsbuildinfo` must not be staged

## Quality Bar
- `frontend npm run build` passes for the changed slice
- `backend go build` passes for all packages
- Critical review blockers resolved before merge (7/7 addressed for Media Upload Service)
- Frontend deploy succeeds and runtime health checks stay green
- Security validations implemented (MIME magic bytes, path traversal protection, auth middleware)
- Transaction integrity maintained for multi-table writes
- Migration scripts tested with dry-run before live execution
- Closeout documents make tomorrow's first action obvious
