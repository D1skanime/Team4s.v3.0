# Asset Stream Proxy Implementation

## Overview
The Asset Stream Proxy endpoint provides authenticated streaming of media assets from Jellyfin without exposing Jellyfin credentials to the browser.

## Endpoint
```
GET /api/v1/assets/:assetId/stream
```

## Authentication
- **Required**: Portal-Login (session-based authentication via Bearer token)
- **Middleware**: `CommentAuthMiddlewareWithState`
- **Error Response**: `401 Unauthorized` if not authenticated

## Parameters

### Path Parameters
- `assetId` (string, required): The Jellyfin item ID
  - Can be numeric (e.g., `12345`)
  - Can be GUID format (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
  - Maximum length: 100 characters

## Behavior

### Request Flow
1. Client sends authenticated request with Bearer token
2. Backend validates session via auth middleware
3. Backend constructs Jellyfin stream URL using:
   - Base URL from `JELLYFIN_BASE_URL` config
   - Stream path template from `JELLYFIN_STREAM_PATH_TEMPLATE` config (default: `/Videos/%s/stream`)
   - API key from `JELLYFIN_API_KEY` config
4. Backend forwards request to Jellyfin with:
   - Original Range headers (for video seeking)
   - Original User-Agent
5. Backend streams response to client

### Range Request Support
The proxy forwards HTTP Range headers to Jellyfin, enabling:
- Video seeking/scrubbing
- Partial content downloads
- Resumable streams

### Response Headers
The following headers are copied from Jellyfin to client:
- `Content-Type` (e.g., `video/mp4`, `video/x-matroska`)
- `Content-Length`
- `Content-Range` (for partial content)
- `Accept-Ranges` (typically `bytes`)
- `Content-Disposition`
- `Cache-Control`
- `ETag`
- `Last-Modified`

## Response Codes

| Code | Description | Example Message |
|------|-------------|----------------|
| 200 | Stream successfully proxied | (binary stream) |
| 206 | Partial content (range request) | (binary stream) |
| 401 | Not authenticated | `anmeldung erforderlich` |
| 404 | Asset not found in Jellyfin | `asset nicht gefunden` |
| 500 | Upstream error or internal error | `stream fehler` |

## Configuration

### Environment Variables
```bash
JELLYFIN_API_KEY=your-jellyfin-api-key
JELLYFIN_BASE_URL=https://jellyfin.example.com
JELLYFIN_STREAM_PATH_TEMPLATE=/Videos/%s/stream  # optional, default shown
```

### Config Structure
```go
AssetStreamConfig{
    JellyfinAPIKey:     cfg.JellyfinAPIKey,
    JellyfinBaseURL:    cfg.JellyfinBaseURL,
    JellyfinStreamPath: cfg.JellyfinStreamPathTemplate,
}
```

## Security

### API Key Protection
- Jellyfin API key is **never** exposed to the client
- API key is added server-side to outbound requests
- Client only needs Portal session token

### Authentication Flow
1. Client authenticates via `/api/v1/auth/issue`
2. Client receives Bearer token
3. Client includes token in `Authorization: Bearer <token>` header
4. Backend validates token before proxying stream

### Session Validation
- Every request validates active session via Redis
- Revoked or expired tokens return `401 Unauthorized`
- No direct Jellyfin access from browser

## Performance

### Connection Handling
- HTTP client timeout set to `0` (unlimited) for long-running streams
- Uses `io.Copy` for efficient streaming (no buffering entire file)
- Supports concurrent streams (limited by system resources)

### Resource Usage
- Memory: Minimal (streaming, not buffering)
- CPU: Low (passthrough proxy)
- Network: Proportional to concurrent streams

## Error Handling

### Client Errors (4xx)
- `400 Bad Request`: Invalid or missing assetId parameter
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Asset does not exist in Jellyfin

### Server Errors (5xx)
- `500 Internal Server Error`:
  - Failed to build Jellyfin URL (config missing)
  - Failed to create HTTP request
  - Jellyfin returned 5xx status
- Upstream errors are logged with context for debugging

### Logging
All errors include contextual information:
```go
log.Printf("asset stream: upstream request failed (asset_id=%q, user_id=%d): %v", assetID, identity.UserID, err)
```

## Implementation Files

### Handler
- **File**: `backend/internal/handlers/asset_stream_handler.go`
- **Struct**: `AssetStreamHandler`
- **Method**: `StreamAsset(c *gin.Context)`

### Tests
- **File**: `backend/internal/handlers/asset_stream_handler_test.go`
- **Coverage**:
  - Unauthorized access
  - Invalid asset IDs
  - Default stream path configuration
  - Custom stream path configuration

### Routes
- **File**: `backend/cmd/server/main.go`
- **Route Registration**:
  ```go
  v1.GET(
      "/assets/:assetId/stream",
      middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
      assetStreamHandler.StreamAsset,
  )
  ```

### Contract
- **File**: `shared/contracts/asset-stream.yaml`
- **OpenAPI**: Integrated into `shared/contracts/openapi.yaml`

## Testing

### Unit Tests
```bash
cd backend
go test ./internal/handlers -run TestAssetStreamHandler
```

### Manual Testing
```bash
# 1. Get auth token
curl -X POST http://localhost:8092/api/v1/auth/issue \
  -H "X-Auth-Issue-Key: dev-key"

# 2. Stream asset
curl -X GET http://localhost:8092/api/v1/assets/12345/stream \
  -H "Authorization: Bearer <token>" \
  --output video.mp4

# 3. Range request (partial content)
curl -X GET http://localhost:8092/api/v1/assets/12345/stream \
  -H "Authorization: Bearer <token>" \
  -H "Range: bytes=0-1023" \
  --output video-chunk.mp4
```

### Integration Testing
1. Ensure Jellyfin is running and accessible
2. Configure `JELLYFIN_API_KEY` and `JELLYFIN_BASE_URL`
3. Create test asset in Jellyfin and note item ID
4. Authenticate and request stream
5. Verify video plays correctly in browser

## Comparison with Existing Endpoints

### `/api/v1/releases/:id/stream`
- **Similarity**: Both proxy video streams from Jellyfin
- **Difference**: `/releases/:id/stream` validates episode version ID in database
- **Difference**: `/releases/:id/stream` supports grant-based access control

### `/api/v1/media/video`
- **Similarity**: Both proxy video content
- **Difference**: `/media/video` accepts query params (`provider`, `item_id`)
- **Difference**: `/media/video` supports multiple providers (Emby/Jellyfin)
- **Difference**: `/assets/:assetId/stream` uses path param and Jellyfin-only

## Future Enhancements

### Potential Improvements
1. **Rate Limiting**: Add per-user stream rate limits
2. **Analytics**: Track stream requests for usage metrics
3. **Caching**: Add CDN-friendly cache headers
4. **Multi-Provider**: Extend to support Emby/Plex
5. **Transcoding**: Add quality/format selection parameters
6. **Subtitles**: Support separate subtitle track requests

### Database Integration
If asset metadata needs tracking:
```sql
CREATE TABLE asset_streams (
    id BIGSERIAL PRIMARY KEY,
    jellyfin_item_id VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255),
    content_type VARCHAR(50),
    size_bytes BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Troubleshooting

### Stream not working
1. Verify Jellyfin is accessible: `curl $JELLYFIN_BASE_URL`
2. Check API key is valid
3. Verify asset ID exists in Jellyfin
4. Check authentication token is valid
5. Review backend logs for upstream errors

### Range requests failing
1. Verify Jellyfin supports range requests (usually enabled by default)
2. Check firewall/proxy doesn't strip Range headers
3. Ensure client sends valid Range header format

### Performance issues
1. Check network bandwidth between backend and Jellyfin
2. Verify Jellyfin server load
3. Review concurrent stream limits
4. Consider adding CDN/caching layer
