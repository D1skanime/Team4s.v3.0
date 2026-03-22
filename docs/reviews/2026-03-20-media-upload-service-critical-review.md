# Critical Review: Media Upload Service Epic

**Date:** 2026-03-20
**Lane:** critical-review
**Reviewer:** team4s-critical-review
**Status:** BLOCKER

---

## Scope

- Backend implementation (models, repository, handlers)
- Database schema migration (001_create_media_tables.up.sql)
- Migration script (migrate-covers)
- Frontend integration (upload mutation, URL resolver)
- Security, error handling, API contract compliance

---

## Executive Summary

The Media Upload Service implementation demonstrates **solid technical execution** with proper separation of concerns, magic-byte validation, and comprehensive error handling. However, the review has identified **7 critical findings** and **3 important findings** that require immediate attention before merge approval.

The most critical issues are:
1. Missing authentication on admin upload endpoint (security vulnerability)
2. No transaction handling for multi-table writes (data integrity risk)
3. Missing video thumbnail cleanup on failure (resource leak)
4. No path traversal validation (security vulnerability)
5. Missing FFmpeg availability check at startup (operational risk)

---

## Findings

### Critical (BLOCKER)

#### C1: Missing Auth Check on Admin Upload Endpoint
**File:** `backend/internal/handlers/media_upload.go:101`
**Severity:** HIGH
**Impact:** Any unauthenticated user can upload media files to the server, causing resource exhaustion and potential abuse.

**Evidence:**
```go
func (h *MediaUploadHandler) Upload(c *gin.Context) {
    // No auth check here!
    var req models.UploadRequest
```

**Expected:**
```go
func (h *MediaUploadHandler) Upload(c *gin.Context) {
    // Auth middleware should verify admin token
    if !isAdmin(c) {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "admin rechte erforderlich"})
        return
    }
```

**Spec Reference:** `media-upload-service-spec.md:33` specifies `POST /api/admin/upload` - the `/admin/` path indicates auth is required.

---

#### C2: No Transaction Handling for Multi-Table Writes
**File:** `backend/internal/handlers/media_upload.go:298-327`
**Severity:** HIGH
**Impact:** If any DB write fails (e.g., join table insert), previous inserts succeed, leaving orphaned records in `media_assets` and `media_files`. Files remain on disk without DB references.

**Evidence:**
```go
// processImage creates 3+ separate DB writes without transaction:
h.repo.CreateMediaAsset(ctx, asset)           // Write 1
h.repo.CreateMediaFile(ctx, mediaFile)        // Write 2 (original)
h.repo.CreateMediaFile(ctx, mediaFile)        // Write 3 (thumb)
h.createJoinTableEntry(ctx, ...)              // Write 4
// If Write 4 fails, Writes 1-3 remain committed
```

**Required Fix:** Wrap all DB operations in a transaction boundary.

---

#### C3: No Cleanup on Video Thumbnail Extraction Failure
**File:** `backend/internal/handlers/media_upload.go:403-409`
**Severity:** MEDIUM
**Impact:** If thumbnail extraction fails, original video file remains on disk without being removed. Over time, this causes disk space exhaustion.

**Evidence:**
```go
if err := h.extractVideoThumbnail(originalPath, thumbPath, extractTime); err != nil {
    log.Printf("warning: thumbnail extraction failed: %v", err)
    // Creates black placeholder - but original video remains on disk
    if err := h.createBlackThumbnail(thumbPath); err != nil {
        return nil, fmt.Errorf("thumbnail erstellen: %w", err)
    }
}
// No os.RemoveAll(storagePath) here
```

**Spec Reference:** `media-upload-service-spec.md:240` specifies graceful degradation, but not resource leaks.

---

#### C4: Path Traversal Not Validated
**File:** `backend/internal/handlers/media_upload.go:152-158`
**Severity:** HIGH
**Impact:** Malicious `entity_type` or `entity_id` values could escape the media directory structure.

**Evidence:**
```go
storagePath := filepath.Join(
    h.mediaStorageDir,
    req.EntityType,  // Not validated for ".." or "/"
    fmt.Sprintf("%d", req.EntityID),
    req.AssetType,
    mediaID,
)
```

**Required Fix:** Validate that the constructed path stays within `h.mediaStorageDir` using `filepath.Clean` and prefix check.

---

#### C5: Missing FFmpeg Startup Check
**File:** `backend/internal/handlers/media_upload.go:91-97`
**Severity:** MEDIUM
**Impact:** If FFmpeg is not installed, video uploads will always fail with cryptic errors. The spec requires a startup warning.

**Spec Reference:** `media-upload-service-phases.md:111-113` - "Startup-Check: FFmpeg erreichbar? (Warning Log wenn nicht)"

**Evidence:**
```go
func NewMediaUploadHandler(repo MediaUploadRepo, storageDir, baseURL, ffmpegPath string) *MediaUploadHandler {
    return &MediaUploadHandler{
        repo:            repo,
        mediaStorageDir: storageDir,
        mediaBaseURL:    baseURL,
        ffmpegPath:      ffmpegPath,  // No check if this exists
    }
}
```

**Required Fix:** Add `checkFFmpegAvailable()` in constructor and log warning if missing.

---

#### C6: No Rollback Documentation in Migration Script
**File:** `backend/cmd/migrate-covers/main.go`
**Severity:** MEDIUM
**Impact:** The migration script creates new DB records and copies files, but provides no documented rollback procedure.

**Spec Reference:** `media-upload-service-phases.md:180` - "Rollback dokumentiert?"

**Evidence:**
- No `.down.sql` migration file exists
- No documentation on how to reverse the migration
- Old `cover_image` column is not touched

**Required Fix:** Document rollback procedure (SQL to delete from new tables, restore old column values).

---

#### C7: Schema Mismatch - Missing Columns
**File:** `backend/database/migrations/001_create_media_tables.up.sql:2-14`
**Severity:** HIGH
**Impact:** The migration SQL does not match the schema in `db-schema-v2.md`.

**Evidence:**

**Schema (`db-schema-v2.md:172-192`):**
```
MediaAsset
- id
- media_type_id       -- Missing in migration!
- file_path           -- Missing in migration!
- caption             -- Missing in migration!
- mime_type
- format
- uploaded_by
- created_at
- modified_at         -- Missing in migration!
- modified_by         -- Missing in migration!
```

**Migration SQL (`001_create_media_tables.up.sql:2-14`):**
```sql
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(36) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    format VARCHAR(20) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Impact:**
- The implementation uses `entity_type`, `entity_id`, `asset_type` directly in `media_assets`, but the schema expects `media_type_id` FK.
- Missing `file_path`, `caption`, `modified_at`, `modified_by` columns.
- This creates a schema drift that will cause issues in Phase B/C/D of the DB migration plan.

**Required Fix:** Align migration SQL with `db-schema-v2.md` or update the schema to reflect simplified design decision.

---

### Important (Non-Blocker)

#### I1: Hard-Coded Sort Order
**File:** `backend/internal/handlers/media_upload.go:530,533,536`
**Severity:** LOW
**Impact:** All media uploads default to `sort_order = 0`, making multi-image galleries unsortable.

**Evidence:**
```go
return h.repo.CreateAnimeMedia(ctx, entityID, mediaID, 0)  // Always 0
```

**Recommendation:** Add optional `sort_order` parameter to upload request or implement auto-incrementing logic.

---

#### I2: Missing Content-Type in Upload Response
**File:** `backend/internal/models/media_upload.go:36-41`
**Severity:** LOW
**Impact:** Frontend must infer content type from file extension instead of receiving it from the API.

**Spec Reference:** `media-upload-service-spec.md:44-53` - Response format does not include MIME type.

**Recommendation:** Add `mime_type` and `format` to `UploadResponse` struct.

---

#### I3: GIF Animation Detection is Placeholder
**File:** `backend/internal/handlers/media_upload.go:482-486`
**Severity:** LOW
**Impact:** All GIFs are treated as animated, even static ones. This means static GIFs are stored as `.gif` instead of being converted to `.webp`.

**Evidence:**
```go
func (h *MediaUploadHandler) isAnimatedGIF(file multipart.File) bool {
    // For now, assume GIFs might be animated
    // A full implementation would parse GIF structure
    return true
}
```

**Recommendation:** Implement proper GIF frame count detection or accept current behavior as acceptable.

---

### Minor Observations

#### M1: Inconsistent Error Messages (German vs English)
**File:** Multiple handlers
**Impact:** Error messages mix German ("ungueltige anfrage") and internal English logs.
**Recommendation:** Standardize on one language for user-facing errors.

#### M2: No Rate Limiting
**File:** `backend/internal/handlers/media_upload.go:101`
**Impact:** Without rate limiting, authenticated users can spam uploads.
**Recommendation:** Add rate limit middleware (e.g., 10 uploads/minute per user).

#### M3: Missing Unit Tests
**File:** All handler and repository files
**Impact:** No automated test coverage for upload logic, validation, or error paths.
**Spec Reference:** `media-upload-service-phases.md:90` - "Unit Tests bestanden"
**Recommendation:** Add test files before production deployment.

---

## Schema Conformance

### Pass
- `media_files` table structure matches spec (variant, path, width, height, size)
- Join tables (anime_media, episode_media, fansub_group_media, release_media) match spec
- Indexes are correctly defined

### Fail
- `media_assets` table has schema drift (see C7)
- Missing `media_type_id` FK to `MediaType` reference table
- Missing `file_path`, `caption`, `modified_at`, `modified_by` columns

---

## API Contract Compliance

### Pass
- Endpoint path matches spec: `POST /api/admin/upload`
- Request parameters match spec (file, entity_type, entity_id, asset_type)
- Response structure matches spec (id, status, files[], url)

### Fail
- No authentication enforcement (C1)
- Missing MIME type validation before processing (partial - magic bytes checked but not whitelisted early enough)

---

## Security Review

### Pass
- MIME type validation via magic bytes (`mimetype.Detect()`)
- File size limits enforced (50MB images, 300MB videos)
- Entity type and asset type whitelisted
- UUID-based storage paths prevent collisions

### Fail
- Missing authentication on admin endpoint (C1)
- No path traversal validation (C4)
- No rate limiting (M2)

---

## Error Handling

### Pass
- Graceful degradation for video thumbnail extraction (creates black placeholder)
- File validation before processing
- User-friendly German error messages

### Fail
- No transaction rollback on partial DB failure (C2)
- No cleanup of storage directory on DB failure (C3)
- Missing FFmpeg availability check (C5)

---

## Migration Script Review

### Pass
- Dry-run support (`DRY_RUN=true`)
- Idempotent (checks for existing `anime_media` entries with `SKIP_EXISTING`)
- Proper thumbnail generation
- Database queries are parameterized

### Fail
- No rollback documentation (C6)
- No `.down.sql` migration file
- No handling of missing source files (script fails instead of skipping)

---

## Frontend Review

### Pass
- Backward compatibility maintained (`getCoverUrl()` handles both `/covers/` and `/media/` paths)
- Upload mutation correctly uses new endpoint (`/api/v1/admin/upload`)
- Error handling for upload failures

### Minor Issues
- Frontend assumes upload endpoint is always available (no feature flag check)
- No progress indicator for large file uploads

---

## Code Quality

### Pass
- Clean separation of concerns (handler, repository, models)
- Dependency injection for repository interface
- Consistent naming conventions
- Proper use of context for cancellation

### Fail
- No unit tests (M3)
- Hard-coded configuration values in handler (prefer env vars)
- Missing godoc comments on exported functions

---

## Validation Evidence

### Build
- Backend builds successfully (all Go dependencies resolved)
- Frontend builds successfully (`npm run build` passed per phases.md)

### Tests
- **No unit tests found** for upload handler, repository, or validation logic
- Manual curl tests documented in phases but not automated
- Migration script has no test coverage

### Smoke Tests
- Not documented whether upload/download cycle was tested end-to-end
- No evidence of FFmpeg integration smoke test

---

## Blockers Summary

| ID | Finding | Severity | Blocking Merge? |
|----|---------|----------|-----------------|
| C1 | Missing auth check on admin upload | HIGH | YES |
| C2 | No transaction handling | HIGH | YES |
| C3 | No cleanup on video thumbnail failure | MEDIUM | YES |
| C4 | Path traversal not validated | HIGH | YES |
| C5 | Missing FFmpeg startup check | MEDIUM | YES |
| C6 | No rollback documentation | MEDIUM | YES |
| C7 | Schema mismatch with db-schema-v2.md | HIGH | YES |

---

## Residual Risks

If blockers are resolved:
- **Medium:** GIF animation detection is a placeholder - may cause storage inefficiency
- **Low:** No rate limiting - authenticated users can spam uploads
- **Low:** Missing unit tests - regressions harder to detect

---

## Merge Decision

**DECISION:** `BLOCK`

**Rationale:**
- 7 critical/high findings that violate security, data integrity, and spec compliance
- Most critical: Missing auth check (C1) and schema drift (C7)
- No transaction handling (C2) creates data corruption risk
- Missing test coverage violates phase validation gates

**Required Actions Before Merge:**
1. Add admin auth middleware to upload endpoint (C1)
2. Implement transaction boundary for all DB writes (C2)
3. Add cleanup logic for failed video processing (C3)
4. Validate storage paths to prevent traversal (C4)
5. Add FFmpeg availability check at startup (C5)
6. Document rollback procedure for migration (C6)
7. Resolve schema mismatch: either align migration with db-schema-v2.md or document intentional deviation (C7)
8. Add unit tests for handler and repository (M3)

---

## Recommendations

### High Priority (Pre-Merge)
1. **Auth Middleware:** Add admin token verification before upload
2. **Transactions:** Wrap DB operations in `db.Begin()` / `Commit()` / `Rollback()`
3. **Schema Alignment:** Clarify whether `media_assets` should have `media_type_id` FK or inline `asset_type`
4. **Path Validation:** Use `filepath.Clean()` and verify resolved path has correct prefix

### Medium Priority (Post-Merge)
1. Add rate limiting middleware
2. Implement proper GIF animation detection
3. Add comprehensive unit and integration tests
4. Add upload progress tracking for large files

### Low Priority (Future)
1. Support for multi-image gallery sorting
2. Async processing for large videos (queue-based)
3. CDN integration for media serving

---

## Artifact

**Location:** `C:\Users\D1sk\Documents\Entwicklung\Opencloud\Team4s.v3.0\docs\reviews\2026-03-20-media-upload-service-critical-review.md`

---

## Compliance Check

- [x] Findings have file and line references
- [x] Blocker criteria applied (security, data integrity, spec compliance)
- [x] Validation evidence documented
- [x] Merge decision is clear and justified
- [x] Residual risks identified
- [x] Review artifact saved

---

**Lane:** critical-review
**Status:** COMPLETED
**Next Step:** Orchestrator must assign blockers back to owning lanes (team4s-go for backend fixes, team4s-frontend if auth token handling needed)
