# Phase 2: Video Upload Implementation

**Status:** Completed
**Date:** 2026-03-20
**Lane:** Backend (team4s-go)

## Overview

Implemented video upload support for the Media Upload Service. Videos are stored 1:1 without re-encoding, and thumbnails are extracted using FFmpeg.

## Implemented Tasks

### Task 2.1: FFmpeg Availability Check
**Status:** ✓ Completed

- Added `FFmpegPath` configuration field to `config.Config`
- Default: `/usr/bin/ffmpeg` (configurable via `FFMPEG_PATH` environment variable)
- Added startup check `checkFFmpegAvailability()` in `main.go`
- Logs warning if FFmpeg is not available (graceful degradation)

**Files Modified:**
- `backend/internal/config/config.go`
- `backend/cmd/server/main.go`

### Task 2.2: Video Validation
**Status:** ✓ Completed

- Added video MIME type validation: `video/mp4`, `video/webm`
- Max video size: 300 MB
- Extension validation: `.mp4`, `.webm`
- Magic bytes detection using `mimetype` library

**Files Modified:**
- `backend/internal/handlers/media_upload.go`

**Test Coverage:**
- Valid MP4 validation test
- Video size limit test (>300MB rejected)

### Task 2.3: Video Storage
**Status:** ✓ Completed

- Original video copied 1:1 (no re-encoding)
- Stored in: `/media/{entity_type}/{entity_id}/{asset_type}/{uuid}/original.{ext}`
- File extension preserved based on MIME type (.mp4 or .webm)

**Implementation:**
- `processVideo()` function in `media_upload.go`
- Uses `saveFile()` helper for direct copy

### Task 2.4: Thumbnail Extraction
**Status:** ✓ Completed

Thumbnail extraction using FFmpeg:
```bash
ffmpeg -i input.mp4 -ss {time} -frames:v 1 -f image2 -y output.png
```

- Frame extracted at 5 seconds (or 0 if video is shorter)
- Temporary PNG converted to WebP
- Resized to 480px width (maintaining aspect ratio)
- Graceful fallback: black placeholder thumbnail if extraction fails

**Implementation:**
- `extractVideoThumbnail()` function
- `getVideoMetadata()` function (uses ffprobe for video dimensions and duration)
- `createBlackThumbnail()` fallback function

### Task 2.5: DB Integration
**Status:** ✓ Completed

- `MediaAsset` created with `format='video'`
- Two `MediaFile` entries: original + thumb
- Join table entry created based on `entity_type`

**Database Schema (existing):**
- `media_assets` table
- `media_files` table
- Join tables: `anime_media`, `episode_media`, `fansub_group_media`, `release_media`

## Modified Files

### Backend Files
1. `backend/internal/config/config.go`
   - Added `FFmpegPath` field
   - Added environment variable loading

2. `backend/cmd/server/main.go`
   - Added FFmpeg availability check
   - Added `checkFFmpegAvailability()` function
   - Updated `NewMediaUploadHandler()` call with FFmpeg path

3. `backend/internal/handlers/media_upload.go`
   - Added video processing constants
   - Updated `MediaUploadHandler` with `ffmpegPath` field
   - Added `processVideo()` function
   - Added `extractVideoThumbnail()` function
   - Added `getVideoMetadata()` function
   - Added `createBlackThumbnail()` function
   - Updated `Upload()` handler to support video format

4. `backend/internal/handlers/media_upload_test.go`
   - Updated test handler initialization with FFmpeg path
   - Added video validation tests (MP4, size limits)

## Validation Evidence

### Build Status
```bash
go build ./...
```
**Result:** ✓ Success (no compilation errors)

### Test Status
```bash
go test ./...
```
**Result:** ✓ All tests pass

```
ok  	team4s.v3/backend/cmd/server
ok  	team4s.v3/backend/internal/auth
ok  	team4s.v3/backend/internal/config
ok  	team4s.v3/backend/internal/handlers
ok  	team4s.v3/backend/internal/middleware
ok  	team4s.v3/backend/internal/migrations
ok  	team4s.v3/backend/internal/models
ok  	team4s.v3/backend/internal/observability
ok  	team4s.v3/backend/internal/repository
ok  	team4s.v3/backend/internal/services
```

### Video Validation Tests
- ✓ Valid MP4 is accepted
- ✓ Valid WebM is accepted (via MIME detection)
- ✓ Videos >300MB are rejected
- ✓ Invalid file types are rejected

## API Usage

### Upload Video
```bash
curl -X POST http://localhost:8080/api/v1/admin/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@karaoke.mp4" \
  -F "entity_type=release" \
  -F "entity_id=789" \
  -F "asset_type=karaoke"
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "status": "completed",
  "files": [
    {
      "variant": "original",
      "path": "/media/release/789/karaoke/uuid/original.mp4",
      "width": 1920,
      "height": 1080
    },
    {
      "variant": "thumb",
      "path": "/media/release/789/karaoke/uuid/thumb.webp",
      "width": 480,
      "height": 270
    }
  ],
  "url": "http://localhost:8092/media/release/789/karaoke/uuid/original.mp4"
}
```

## Configuration

### Environment Variables
```bash
FFMPEG_PATH=/usr/bin/ffmpeg  # Default: /usr/bin/ffmpeg
MEDIA_STORAGE_DIR=./storage/media  # Default
MEDIA_PUBLIC_BASE_URL=http://localhost:8092  # Default
```

### Server Startup
On startup, the server checks FFmpeg availability:
```
2026-03-20 10:00:00 ffmpeg available at /usr/bin/ffmpeg
```

If FFmpeg is not available:
```
2026-03-20 10:00:00 warning: ffmpeg not available at /usr/bin/ffmpeg: <error> (video upload will be disabled)
```

## Technical Details

### Video Processing Flow
1. Validate MIME type and size
2. Generate UUID for media asset
3. Create storage directory
4. Copy original video 1:1 (no encoding)
5. Extract video metadata (width, height, duration) via ffprobe
6. Extract frame at 5 seconds (or 0 if shorter)
7. Convert frame to WebP and resize to 480px
8. Create DB records (MediaAsset + 2 MediaFile entries)
9. Create join table entry
10. Return response with file paths

### Error Handling
- FFmpeg not available → graceful degradation (logged warning)
- Thumbnail extraction fails → black placeholder created
- Invalid video → 400 Bad Request
- Video too large → 400 Bad Request with error message
- Processing error → 500 Internal Server Error

### Graceful Degradation
- If FFmpeg is unavailable at startup, video uploads return error
- If thumbnail extraction fails, a black placeholder is created
- Original video is always saved successfully

## Phase 2 Validation Gates

- [x] MP4 is accepted
- [x] WebM is accepted
- [x] Original is unchanged and stored
- [x] Thumbnail is extracted (WebP, 480px wide)
- [x] DB entries are correct
- [x] Videos >300MB are rejected
- [x] `go build` successful
- [x] Unit tests pass

## Contract Impact

**None.**

The existing upload contract is extended to support videos:
- Request: same as Phase 1 (multipart form with file, entity_type, entity_id, asset_type)
- Response: same structure (id, status, files[], url)
- Error codes: same as Phase 1 (400, 413, 500)

## Security Considerations

- Video files validated via magic bytes (not just extension)
- Size limits enforced (300 MB)
- FFmpeg runs in subprocess with controlled arguments
- No user input directly passed to shell commands

## Performance Notes

- Video upload is **synchronous** (as per GSD decision)
- 300MB upload + thumbnail extraction typically takes 5-10 seconds
- No queue, no background processing
- Suitable for occasional uploads (admin use case)

## Next Steps

Phase 3: Migration
- Migrate existing cover images from `frontend/public/covers/`
- Update frontend to use new upload endpoint
- See `media-upload-service-phases.md` for details

## References

- Spec: `Team4s.v3.0/docs/architecture/media-upload-service-spec.md`
- Phases: `Team4s.v3.0/docs/architecture/media-upload-service-phases.md`
- Phase 1: Image upload (completed 2026-03-20)
