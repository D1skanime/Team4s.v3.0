# TOMORROW - 2026-03-23

**Date:** 2026-03-23
**Context:** Media Upload Service debugging + verification phase
**Goal:** Complete cover upload UI integration, document rollback, verify end-to-end workflow

---

## Top 3 Priorities

### 1. Debug Cover Upload Button Click Handler
**Why:** Admin UI feature broken - click handler not triggering file input (ref.current null issue)

**Action:**
- Inspect component mount order and ref lifecycle in `AnimeCoverField.tsx`
- Check if file input is conditionally rendered (delayed mount)
- Test with direct file input click (bypass button wrapper)
- Add defensive null check before `ref.current.click()`
- Consider useCallback for click handler stability

**Success Criteria:**
- Click on "Cover hochladen" button triggers file input dialog
- User can select file and upload completes successfully

**Time Estimate:** 1-2 hours

---

### 2. Document Migration Rollback Procedure
**Why:** Critical Review blocker C6 - required for production readiness

**Action:**
- Create `docs/architecture/media-upload-rollback.md`
- Document SQL to delete from `media_assets`, `media_files`, `anime_media` (where created_at > migration start)
- Document filesystem cleanup (`rm -rf /media/anime/*/poster/`)
- Document `anime.cover_image` restoration (backup old values first)
- Add rollback verification checklist
- Test rollback procedure on local dev environment

**Success Criteria:**
- Rollback documentation complete with step-by-step instructions
- Rollback tested locally (migrate forward, rollback, verify state)
- Critical Review blocker C6 resolved

**Time Estimate:** 2-3 hours

---

### 3. Run End-to-End Upload Smoke Test
**Why:** Verify complete workflow from UI upload to file serving

**Action:**
- Test image upload via admin UI (JPEG -> WebP original + thumbnail)
- Test video upload via admin UI (MP4 -> 1:1 copy + FFmpeg thumbnail)
- Verify DB records created correctly (MediaAsset, MediaFile, AnimeMedia)
- Verify files written to correct paths (`/media/anime/{id}/poster/{uuid}/`)
- Test media serving route (`http://localhost:3002/media/...`)
- Verify cover display on anime detail page
- Test upload failure scenarios (invalid MIME, oversized file, auth missing)

**Success Criteria:**
- Image upload succeeds, cover displays on detail page
- Video upload succeeds (if time permits)
- Error handling works correctly

**Time Estimate:** 1-2 hours

---

## Dependencies to Unblock Early

### FFmpeg Availability
- Verify FFmpeg installed in Docker container (startup check should log warning if missing)
- If missing: update Dockerfile to install FFmpeg

### Docker Volume Permissions
- Verify `./media` directory has correct permissions for backend writes
- If permission denied errors: `chmod -R 755 ./media` or fix Docker user mapping

---

## First 15-Minute Task (Tiny and Unambiguous)

**Task:** Add defensive null check to cover upload button click handler

**Steps:**
1. Open `frontend/src/app/admin/anime/components/AnimePatchForm/AnimeCoverField.tsx`
2. Locate click handler function (around line with `coverFileInputRef.current?.click()`)
3. Add null check and console.log:
   ```typescript
   const handleUploadClick = () => {
     console.log('Upload button clicked, ref:', coverFileInputRef.current);
     if (!coverFileInputRef.current) {
       console.error('File input ref is null!');
       return;
     }
     coverFileInputRef.current.click();
   };
   ```
4. Save, rebuild frontend container: `docker compose up -d --build frontend`
5. Test click, check browser console for logs

**Success:** Log message appears in console when button clicked, indicating ref state

---

## Nice-to-Have If Ahead of Schedule

### Update db-schema-v2.md
- Document schema deviation (inline `entity_type`/`asset_type` vs. `media_type_id` FK)
- Add rationale for deviation (query simplicity, validation clarity)
- Update MediaAsset table definition to match implementation

### Add Unit Tests
- `backend/internal/handlers/media_upload_test.go` - validation logic tests
- Test cases: valid upload, invalid MIME, oversized file, path traversal attempt, transaction rollback

### Add .gitignore Entries
- `backend/server.exe`
- `backend/migrate.exe`
- `backend/migrate-covers.exe`
- `frontend/tsconfig.tsbuildinfo`

### Verify Cover Display on Anime Detail Page
- Navigate to `/anime/{id}` for migrated anime
- Verify cover image loads from `/media/anime/{id}/poster/{uuid}/original.webp`
- Check network tab for correct Content-Type header
- Test thumbnail variant loading

---

## Blockers to Watch

### Browser CORS Issues
- If media serving route returns CORS errors, check Next.js route handler headers
- May need to add `Access-Control-Allow-Origin: *` for local dev

### FFmpeg Missing in Container
- If video thumbnail extraction fails, check startup logs for FFmpeg warning
- Fallback: black placeholder should still work (verify this path)

### Transaction Deadlocks
- If concurrent uploads fail with DB deadlocks, may need to add retry logic
- Low priority (unlikely with current load)

---

## Context for Tomorrow

### Where We Are
- Media upload service core implementation complete
- Cover migration executed (2231 covers)
- API-level upload functional
- UI integration has ref lifecycle bug
- Critical Review blockers: 6/7 resolved (C6 pending)

### What Changed Yesterday (2026-03-22)
- Implemented generic upload endpoint (`/api/v1/admin/upload`)
- Image processing with Go `imaging` library
- Video processing with FFmpeg
- Database schema migrations deployed
- Cover migration script executed successfully
- Frontend media serving route implemented
- Resolved Critical Review blockers C1, C2, C3, C4, C5
- Fixed Go version, docker-compose syntax, auth token integration

### First Action
Debug cover upload button ref lifecycle issue - add defensive null check and logging to isolate mount timing problem.

---

## Success Metrics for Tomorrow

- [ ] Cover upload button working (UI workflow complete)
- [ ] Migration rollback documented and tested
- [ ] End-to-end smoke test passing (image upload via UI)
- [ ] All Critical Review blockers resolved (7/7)
- [ ] Media Upload Service epic ready for merge

**Stretch Goals:**
- [ ] db-schema-v2.md updated with actual implementation
- [ ] Unit tests added for upload validation
- [ ] .gitignore updated for build artifacts
- [ ] Video upload smoke test passing

---

**Estimated Time:** 4-7 hours (full day if including stretch goals)
**Priority:** HIGH (epic completion blocked on these tasks)
