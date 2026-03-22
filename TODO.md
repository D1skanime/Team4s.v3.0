# TODO

## Completed (2026-03-22)
- [x] Backend upload endpoint implementation (`/api/v1/admin/upload`)
- [x] Image processing with Go `imaging` library (WebP conversion, 300px thumbnails)
- [x] Video processing with FFmpeg (thumbnail extraction at 5s)
- [x] MIME validation via magic bytes (security)
- [x] Path traversal protection with `filepath.Clean()` (security)
- [x] Admin auth middleware on upload endpoint (security)
- [x] Transaction handling for atomic DB writes (data integrity)
- [x] Database schema migrations (MediaAsset, MediaFile, join tables)
- [x] Cover migration script created (`backend/cmd/migrate-covers/`)
- [x] Cover migration executed (2231 covers -> `/media/anime/{id}/poster/{uuid}/`)
- [x] Frontend media serving route (`/media/[...path]/route.ts`)
- [x] Frontend upload mutation with FormData and auth token
- [x] Backward-compatible `getCoverUrl()` (supports `/covers/` and `/media/`)
- [x] Docker config updated (Go 1.25, FFmpeg, volume mount, env vars)
- [x] Fixed docker-compose duplicate environment section
- [x] Resolved Critical Review blockers C1, C2, C3, C4, C5 (6 of 7)

## Completed (2026-03-18)
- [x] Add `genres: string[]` to backend anime detail contract
- [x] Parse genre CSV into array in backend repository layer
- [x] Update OpenAPI contract with genres array schema
- [x] Add `genres?: string[]` to frontend interface
- [x] Remove frontend type workaround for genres
- [x] Correct Related section placement (inside infoCard, not standalone)
- [x] Fix AnimeEdgeNavigation positioning (top-left/top-right on heroContainer)
- [x] Add overflow handling to prevent Related cards from overflowing
- [x] Implement scroll buttons for Related section horizontal navigation
- [x] Verify Go build, Next.js build, Docker deployment
- [x] Runtime verification: health checks and page smoke tests

## Completed (2026-03-15)
- [x] Implement glassmorphism design for `/anime/[id]`
- [x] Capture UX handoff (NOTE: Later found to be incorrect)
- [x] Re-run critical review and reach `approve`
- [x] Rebuild and redeploy `team4sv30-frontend`

## Active Epic: Media Upload Service (GSD)

**Spec:** `docs/architecture/media-upload-service-spec.md`
**Phases:** `docs/architecture/media-upload-service-phases.md`

### Phase 1: Bild-Upload (Completed 2026-03-22)
- [x] 1.1 Go Dependencies (imaging, uuid, mimetype)
- [x] 1.2 Upload-Handler Grundgeruest
- [x] 1.3 Validierung (MIME, Groesse, Whitelist)
- [x] 1.4 Image Processing (WebP, Thumbnail)
- [x] 1.5 Speicherung (/media/{entity}/{id}/{asset}/{uuid}/)
- [x] 1.6 Datenbank (MediaAsset, MediaFile, Join)
- [x] 1.7 Delete-Handler
- [x] 1.8 Security hardening (auth, path traversal, transactions)

### Phase 2: Video-Upload (Completed 2026-03-22)
- [x] FFmpeg Config (FFMPEG_PATH)
- [x] FFmpeg startup check with warning log
- [x] Video-Validierung (MP4, WebM, 300MB)
- [x] Video-Speicherung (1:1 copy)
- [x] Thumbnail-Extraktion (5s frame, WebP)
- [x] Black placeholder fallback on extraction failure
- [x] DB-Integration

### Phase 3: Migration (Completed 2026-03-22)
- [x] Cover-Inventar erstellt (2231 Cover, 1523 zugeordnet)
- [x] Migration-Script (`backend/cmd/migrate-covers/`)
- [x] Frontend: resolveCoverUrl angepasst (backward compatible)
- [x] Frontend: AnimeCoverField migriert
- [x] DB Migration: Schema deployed (0026-0029)
- [x] Cover-Migration: `DRY_RUN=true` tested
- [x] Cover-Migration: Live migration executed (2231 covers migrated)
- [x] `anime.cover_image` updated to new paths

### Phase 4: Debugging + Documentation (In Progress)
- [ ] Debug cover upload button click handler (ref.current null issue)
- [ ] Document migration rollback procedure (Critical Review blocker C6)
- [ ] Run end-to-end upload smoke test (image + video via UI)
- [ ] Verify cover display on anime detail page after migration
- [ ] Add unit tests for upload handler validation logic
- [ ] Update `db-schema-v2.md` to reflect schema deviation
- [ ] Add `.gitignore` entries for build artifacts (server.exe, migrate*.exe)

---

## Next Up (Post-Epic)
- [ ] Remove legacy `/covers/` path support after 1-week verification period
- [ ] Add rate limiting middleware for upload endpoint
- [ ] Implement proper GIF animation detection (current: assumes all animated)
- [ ] Add upload progress indicator for large files
- [ ] Add admin UI for media gallery management
- [ ] Archive or correct outdated UX handoff documents (incorrect Related placement description)
- [ ] Inventory repo-wide frontend lint failures for separate cleanup pass
- [ ] Consider accessibility audit for anime detail page

## Parking Lot
- [ ] Optional: Async processing for large videos (queue-based)
- [ ] Optional: HLS streaming for karaoke videos
- [ ] Optional: CDN integration for media serving
- [ ] Optional: Multi-image gallery sorting support
- [ ] Optional: Enhanced genre navigation/filtering features
- [ ] Optional: Related section data quality improvements
- [ ] Optional: Performance optimization for large related lists
