# Media Upload Service - Testing Guide

## Phase 1: Image Upload Testing

### Prerequisites

1. Backend server running on port 8092
2. Database migrations applied
3. Auth token (use dev mode or get from /api/v1/auth/issue)
4. Test image file (JPEG, PNG, or WebP)

### Test Scenarios

#### 1. Upload Image

```bash
# Upload a poster image for anime with ID 123
curl -X POST http://localhost:8092/api/v1/admin/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@test-image.jpg" \
  -F "entity_type=anime" \
  -F "entity_id=123" \
  -F "asset_type=poster"
```

**Expected Response:**
```json
{
  "id": "uuid-here",
  "status": "completed",
  "files": [
    {
      "variant": "original",
      "path": "/media/anime/123/poster/uuid/original.webp",
      "width": 1920,
      "height": 1080
    },
    {
      "variant": "thumb",
      "path": "/media/anime/123/poster/uuid/thumb.webp",
      "width": 300,
      "height": 450
    }
  ],
  "url": "http://localhost:8092/media/anime/123/poster/uuid/original.webp"
}
```

#### 2. Verify Files Exist

```bash
# Check if files were created
ls -la ./storage/media/anime/123/poster/uuid/

# Expected:
# - original.webp
# - thumb.webp
```

#### 3. Verify Database Entries

```sql
-- Check media_assets
SELECT * FROM media_assets WHERE entity_type = 'anime' AND entity_id = 123;

-- Check media_files
SELECT * FROM media_files WHERE media_id = 'uuid-from-response';

-- Check join table
SELECT * FROM anime_media WHERE anime_id = 123;
```

#### 4. Delete Media

```bash
# Delete uploaded media
curl -X DELETE http://localhost:8092/api/v1/admin/media/uuid-here \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "success": true
}
```

#### 5. Verify Deletion

```bash
# Check if files were deleted
ls -la ./storage/media/anime/123/poster/uuid/
# Should not exist or be empty

# Check database
SELECT * FROM media_assets WHERE id = 'uuid-here';
# Should return 0 rows
```

### Validation Gates (from spec)

- [x] JPEG wird zu WebP konvertiert
- [x] PNG wird zu WebP konvertiert
- [ ] Animated GIF bleibt GIF, Thumb ist WebP
- [x] Thumbnail ist 300px breit
- [x] Ungueltige Dateien werden rejected (400)
- [x] DB-Eintraege sind korrekt
- [x] Delete loescht Dateien + DB

### Error Cases to Test

#### Invalid Entity Type
```bash
curl -X POST http://localhost:8092/api/v1/admin/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@test-image.jpg" \
  -F "entity_type=invalid" \
  -F "entity_id=123" \
  -F "asset_type=poster"
```
Expected: 400 Bad Request

#### Invalid Asset Type
```bash
curl -X POST http://localhost:8092/api/v1/admin/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@test-image.jpg" \
  -F "entity_type=anime" \
  -F "entity_id=123" \
  -F "asset_type=invalid"
```
Expected: 400 Bad Request

#### File Too Large
```bash
# Create a large test file (>50MB)
dd if=/dev/zero of=large.jpg bs=1M count=51

curl -X POST http://localhost:8092/api/v1/admin/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@large.jpg" \
  -F "entity_type=anime" \
  -F "entity_id=123" \
  -F "asset_type=poster"
```
Expected: 400 Bad Request with "bild zu gross" message

#### Invalid File Type
```bash
# Create a text file
echo "not an image" > test.txt

curl -X POST http://localhost:8092/api/v1/admin/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@test.txt" \
  -F "entity_type=anime" \
  -F "entity_id=123" \
  -F "asset_type=poster"
```
Expected: 400 Bad Request with "ungueltiger dateityp" message

#### Missing File
```bash
curl -X POST http://localhost:8092/api/v1/admin/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "entity_type=anime" \
  -F "entity_id=123" \
  -F "asset_type=poster"
```
Expected: 400 Bad Request with "keine datei hochgeladen" message

### Next Steps (Phase 2)

- [ ] Video upload (MP4, WebM)
- [ ] Video thumbnail extraction via FFmpeg
- [ ] Video size limit (300MB)
