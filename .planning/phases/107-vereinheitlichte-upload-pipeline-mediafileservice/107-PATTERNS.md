# Phase 107: Vereinheitlichte Upload-Pipeline (MediaFileService) - Pattern Map

**Mapped:** 2026-07-22
**Files classified:** 42 likely new/modified files or file families
**Strong analog families:** 5
**Repository state mapped:** Pre-Phase-106 execution; rebase gate required before implementation

## Mapping Boundary

Phase 107 must extend the single instance created by `services.NewMediaService`; it must not add a second independently constructed service or leave handler-local validation/storage pipelines alive behind a wrapper. The six upload entries are:

1. Release-version media — `UploadReleaseVersionMedia` / `processOneRVMFile`
2. Fansub branding and gallery — `UploadFansubMedia` / `processOneFansubGroupMediaFile`
3. Release theme assets — both upload functions in `admin_content_release_theme_assets.go`
4. Generic admin anime upload — `MediaUploadHandler.Upload` plus image/video helpers
5. Own-profile avatar/background — both upload functions in `app_profile.go`
6. Own-profile story image — `UploadOwnProfileStoryImage`

`SaveSegmentAsset` is deliberately outside these six entries and must remain working when `media_service.go` is split.

## Post-Phase-106 Readiness Gate

The live tree on 2026-07-22 is still pre-106:

- `database/migrations` ends at `0130_release_content_source_groups.*.sql`; planned `0131_media_core_schema.*.sql` does not exist.
- No `106-*-SUMMARY.md` or Phase-106 verification artifact exists.
- `media` / `media_variant` Go repository/model files are not present.
- `git status --short` contains only untracked `107-RESEARCH.md`; there are no untracked migrations now.
- Phase 106 plans will change files Phase 107 also needs, including `backend/internal/repository/media_upload.go`, `backend/internal/handlers/media_upload.go`, `media_upload_image.go`, `media_upload_video.go`, `backend/internal/models/media_upload.go`, `backend/cmd/server/main.go`, `frontend/src/lib/api.ts`, and `shared/contracts/openapi.yaml`.
- Phase 106 plans add `scripts/media-core-contract-check.ps1`, `scripts/media-core-legacy-grep.ps1`, `backend/internal/migrations/media_core_schema_test.go`, and the actual media-core migration. These become mandatory analogs after execution.

Therefore the first plan action must re-read Phase-106 summaries/verification, `git status`, migration tail, the actual media-core DDL, the post-106 `MediaService`/repository/handler files, and run the Phase-106 contract gates. If Phase 106 is not complete, Phase 107 implementation is blocked. Never reserve migration number `0132` until the post-106 tail is verified, and stop if multiple untracked migrations exist.

## File Classification

| New/Modified File | Role | Data Flow | Closest Existing Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/services/media_service.go` | service/config | streaming + file-I/O | same file, constructor and unaffected `SaveSegmentAsset` seam | exact extension anchor |
| `backend/internal/services/media_file_service.go` | service | streaming + file-I/O + request-response | `media_service.go`; `processOneRVMFile` orchestration | composite exact |
| `backend/internal/services/media_file_profiles.go` | config/validation | transform | RVM constants/MIME maps in `admin_content_release_version_media.go` | exact behavior source |
| `backend/internal/services/media_file_image.go` | service/utility | transform + file-I/O | RVM image inspection/thumbnail + story sanitization | composite role-match |
| `backend/internal/services/media_file_av.go` | service/utility | process execution + transform | `media_upload_video.go` ffprobe/ffmpeg helpers | role-match; security hardening required |
| `backend/internal/services/media_file_storage.go` | service/utility | streaming + file-I/O | `media_upload_storage.go` path guard and handler compensation | partial; staging/promotion is new |
| `backend/internal/services/media_file_compatibility.go` | service interface | request-response + CRUD | transaction callback pattern in `MediaUploadRepository.WithTx` | partial; explicit Phase-108 seam is new |
| `backend/internal/services/media_file_service_test.go` | test | transform + file-I/O | RVM/media-upload/story fixture tests | role-match |
| `backend/internal/services/media_file_service_failure_test.go` | test | event/failure-driven | RVM rollback contract + theme compensation tests | partial; failpoint matrix is new |
| `backend/internal/repository/media_repository.go` | repository | CRUD | same `MediaRepository` type/constructor | exact extension anchor |
| `backend/internal/repository/media_core_repository.go` | repository | transactional CRUD | `release_version_media_repository.go` transaction methods | exact role/data-flow |
| `backend/internal/repository/media_compatibility_repository.go` | repository/adapter | transactional CRUD | RVM/fansub relation insert methods receiving `pgx.Tx` | exact role-match |
| `backend/internal/repository/media_core_repository_test.go` | test | concurrent CRUD | repository integration tests plus migration structure tests | partial; concurrent hash race is new |
| `database/migrations/<next>_media_file_pipeline.up.sql` | migration | schema CRUD | actual post-106 media-core migration; current `0130` additive migration | role-match |
| `database/migrations/<next>_media_file_pipeline.down.sql` | migration | schema CRUD | `0130_release_content_source_groups.down.sql` | role-match |
| `backend/internal/migrations/media_file_pipeline_schema_test.go` | test | file-I/O/source contract | `release_content_source_groups_test.go`; `phase103_release_playback_entitlements_test.go` | exact role-match |
| `backend/internal/handlers/admin_content_release_version_media.go` | controller/context adapter | batch request-response | same handler auth/context/batch shell | exact modification |
| `backend/internal/handlers/fansub_media_upload.go` | controller/context adapter | batch request-response | same handler auth/context shell | exact modification |
| `backend/internal/handlers/admin_content_release_theme_assets.go` | controller/context adapter | request-response | same handler permission/theme-resolution shell | exact modification |
| `backend/internal/handlers/media_upload.go` | controller/context adapter | request-response | same handler anime-context parsing shell | exact modification |
| `backend/internal/handlers/media_upload_image.go` | legacy helper removal/adapter | transform -> request-response | `media_file_image.go` target core | extraction target |
| `backend/internal/handlers/media_upload_video.go` | legacy helper removal/adapter | transform -> request-response | `media_file_av.go` target core | extraction target |
| `backend/internal/handlers/media_upload_storage.go` | legacy helper removal/adapter | file-I/O | `media_file_storage.go` target core | extraction target |
| `backend/internal/handlers/app_auth.go` | controller composition | request-response | `AdminContentHandler.WithMediaDeps`; `FansubHandler.WithMedia` | exact DI pattern |
| `backend/internal/handlers/app_profile.go` | controller/context adapter | request-response | own existing auth/member/disabled checks | exact modification |
| `backend/internal/handlers/app_profile_story_image.go` | controller/context adapter | request-response | own existing owner/IDOR shell | exact modification |
| `backend/internal/handlers/admin_content_handler.go` | controller composition | request-response | existing `WithMediaDeps` | exact reuse |
| `backend/internal/handlers/fansub_media_config.go` | controller composition | request-response | existing `WithMedia` | exact reuse |
| `backend/internal/handlers/media_upload_result_contract_test.go` | test | request-response serialization | RVM per-file result tests | exact role-match |
| `backend/internal/handlers/media_upload_delegation_test.go` | test/source contract | batch source scan | theme source tests; frontend no-token boundary scanner | exact role-match |
| existing six handler test files | test | request-response + file-I/O | their current fixtures and route harnesses | exact extension |
| `backend/cmd/server/main.go` | composition/config | request-response + event-driven cleanup | single `mediaService` construction and existing cleanup goroutine | exact modification |
| `backend/cmd/server/media_static_security_test.go` | test/security | request-response + file-I/O | Gin router tests and `/media` registration | role-match |
| `shared/contracts/openapi.yaml` | API contract | request-response | existing six endpoint entries and upload schemas | exact modification |
| `shared/contracts/admin-content.yaml` | API contract | request-response | RVM upload entry/schema | exact modification; missing surfaces must be reconciled |
| `frontend/src/types/mediaFile.ts` (or one existing shared media type file) | DTO | transform | `releaseVersionMedia.ts` per-file result | exact role-match |
| `frontend/src/types/releaseVersionMedia.ts` | DTO | transform | existing `ReleaseVersionMediaUploadResult/Response` | exact modification |
| `frontend/src/types/fansub.ts` | DTO | transform | existing `FansubMediaUploadResponse` | exact modification |
| `frontend/src/types/admin.ts` | DTO | transform | existing generic/theme response types | exact modification |
| `frontend/src/types/profile.ts` | DTO | transform | existing `MemberProfileResponse`; shared upload result should be imported, not duplicated | role-match |
| `frontend/src/lib/api.ts` | API client | streaming upload request-response | `authorizedUploadXhr` | exact modification |
| `frontend/src/lib/api.auth-refresh.test.ts` | test/security | event-driven retry | existing upload preflight/XHR tests | exact extension |
| `frontend/src/lib/api.no-token-boundary.test.ts` | test/source contract | batch source scan | same file scanner/allowlist | exact extension |

The exact split names are discretionary. If post-106 introduces equivalent core files, extend those names rather than creating the suggested files in parallel.

## Strong Analog 1: Extend the Existing MediaService Instance

**Source:** `backend/internal/services/media_service.go`

**Constructor/type pattern** (lines 54-82):

```go
type MediaService struct {
	storageDir    string
	publicBaseURL string
}

func NewMediaService(storageDir, publicBaseURL string) *MediaService {
	dir := strings.TrimSpace(storageDir)
	if dir == "" {
		dir = "./storage/media"
	}
	baseURL := strings.TrimRight(strings.TrimSpace(publicBaseURL), "/")
	if baseURL == "" {
		baseURL = "http://localhost:8092"
	}
	return &MediaService{storageDir: dir, publicBaseURL: baseURL}
}
```

**Assignment:** keep this constructor as the one composition root. New processor/storage/repository/executor/audit dependencies may be options or fields on this service, but `main.go` must still construct one media service. Do not create `NewMediaFileService` alongside it.

**Unaffected method boundary** (lines 252-334):

```go
type SegmentAssetContext struct {
	AnimeID          int64
	StableProvider   string
	StableExternalID string
	GroupID          int64
	Version          string
	SegmentTypeName  string
}

func (s *MediaService) SaveSegmentAsset(ctx SegmentAssetContext, originalName string, data []byte) (*MediaSaveResult, error) {
	// Existing segment/playback storage seam; outside the six upload entries.
}
```

**Assignment:** preserve `SaveSegmentAsset` behavior and tests while extracting the six user-upload paths. The old `SaveUpload`, `SaveUploadSourceOriginal`, and `SaveReleaseThemeVideoUpload` mechanisms are migration sources, not permanent parallel APIs.

## Strong Analog 2: Per-File Transaction and Compensation

**Sources:**

- `backend/internal/handlers/admin_content_release_version_media.go`
- `backend/internal/repository/release_version_media_repository.go`
- `backend/internal/repository/media_upload.go`

**Per-file batch shell** (`admin_content_release_version_media.go`, lines 302-323):

```go
results := make([]rvmFileResult, 0, len(files))
for i, fileHeader := range files {
	sortOrder := maxSortOrder + (i+1)*10
	result := h.processOneRVMFile(c, fileHeader, versionID, sourceGroupID, category,
		sortOrder, uploadedByUserID, rvmVisibilityCode, rvmReviewStatusCode)
	results = append(results, result)
}
c.JSON(http.StatusOK, gin.H{"results": results})
```

**Assignment:** retain one result per file and per-file atomics; replace only `processOneRVMFile` technical work with the shared service. Never wrap the whole multipart batch in one transaction.

**Transaction pattern** (`release_version_media_repository.go`, lines 84-128):

```go
func (r *MediaRepository) BeginTx(ctx context.Context) (pgx.Tx, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin rvm transaction: %w", err)
	}
	return tx, nil
}

func (r *MediaRepository) CreateReleaseVersionMediaAsset(
	ctx context.Context,
	tx pgx.Tx,
	input ReleaseVersionMediaCreateInput,
) (int64, error) {
	// INSERT ... RETURNING id through the caller transaction.
}
```

**Callback alternative** (`media_upload.go`, lines 81-103):

```go
func (r *MediaUploadRepository) WithTx(ctx context.Context, fn func(repo MediaUploadRepo) error) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	txRepo := &MediaUploadRepository{db: r.db, tx: tx}
	if err := fn(txRepo); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}
```

**Assignment:** Phase 107 should put `media` upsert, `media_variant` upsert, compatibility alias/relation, usage-idempotency, and ready transition through one `pgx.Tx`. Filesystem work needs a separate attempt-owned compensation set because DB and files do not share a native transaction.

**Current compensation behavior to centralize** (`admin_content_release_version_media.go`, lines 443-522):

```go
tx, err := h.mediaRepo.BeginTx(ctx)
if err != nil {
	_ = removeFileQuietly(originalPath)
	_ = removeFileQuietly(thumbPath)
	return failedResult
}
defer func() { _ = tx.Rollback(ctx) }()

// processing rows + relation are written through tx

if err := tx.Commit(ctx); err != nil {
	_ = removeFileQuietly(originalPath)
	_ = removeFileQuietly(thumbPath)
	return failedResult
}
```

Do not copy the repeated deletes literally. Replace them with staging plus an explicit `createdByAttempt` set. Cleanup must never infer or recursively delete a shared hash target.

## Strong Analog 3: Context Adapters Keep Auth, Ownership, and Slots

### Release-version media

**Source:** `admin_content_release_version_media.go`, lines 162-256.

Keep:

```go
identity, actor, ok := permissionActorFromContext(c)
result, err := h.permissionSvc.CanForReleaseVersion(
	c.Request.Context(), actor, permissions.ActionReleaseVersionMediaUpload, versionID,
)
exists, err := h.mediaRepo.ReleaseVersionExistsForRVM(c.Request.Context(), versionID)
participatingGroups, err := h.mediaRepo.ListReleaseVersionGroupIDs(...)
actorGroups, err := h.mediaRepo.ListReleaseVersionMediaContributorGroupIDsForUser(...)
```

The adapter must attach to `release_version_media` with the real `versionID` and selected participating `sourceGroupID`. `episode_media` and `release_media` are forbidden substitutes.

### Fansub branding/gallery

**Source:** `fansub_media_upload.go`, lines 42-92 and 325-415.

Keep:

```go
result, err := h.permissionSvc.CanForFansubGroup(c.Request.Context(), actor, action, fansubID)
if kind == models.MediaKindImage {
	h.uploadFansubGroupMedia(c, identity, fansubID)
	return
}
```

Gallery context remains `fansub_group_media`; logo/banner remain the existing group slots through the compatibility adapter. Current `SaveUpload` calls, thumbnail generation, direct writes, and asset/file inserts move to the core.

### Theme assets

**Source:** `admin_content_release_theme_assets.go`, lines 148-278 and 333-443.

Keep the two route-specific context shells:

```go
result, err := h.permissionSvc.CanForFansubGroup(..., fansubID)
releaseID, err := h.themeRepo.GetCanonicalFansubAnimeRelease(...)
lockedByGlobalSegment, err := h.themeRepo.HasGlobalThemeSegmentCoverageForRelease(...)
blockedBySegmentAnchor, err := h.themeRepo.HasReleaseAssetSegmentUploadBlockedForRelease(...)
```

and:

```go
result, err := h.permissionSvc.CanForRelease(..., releaseID)
```

Replace unbounded `io.ReadAll`, `SaveReleaseThemeVideoUpload`, and pool-level three-step persistence with `ProcessOne`. Compatibility still attaches `release_theme_assets`; it must not substitute `release_media`.

### Generic admin anime upload

**Source:** `media_upload.go`, lines 91-188.

Keep authentication, `entity_type == "anime"`, asset-slot normalization, and canonical-layout context resolution. Remove `validateFile`, UUID/path creation, and dispatch to handler-local `processImage`/`processVideo`. The `MediaUploadRepository` becomes context-only after Phase 106/107 and must not remain a second technical persistence owner.

### Avatar/background

**Source:** `app_profile.go`, lines 375-440 and 540-603.

Keep:

```go
identity, ok := middleware.CommentAuthIdentityFromContext(c)
if strings.TrimSpace(identity.AppUserStatus) == models.AppUserStatusDisabled { ... }
profile, err := h.profileRepo.GetOwnProfile(c.Request.Context(), identity.AppUserID)
if !hasConcreteMemberProfile(profile) { ... }
```

The adapter derives `memberID` from the authenticated profile, never from FormData. The cropped/display bytes and `source_file` contract need the explicit Phase-107 compatibility decision from research; do not hash source bytes while storing a user-specific crop as variants of that hash.

### Story image

**Source:** `app_profile_story_image.go`, lines 38-118 and 210-244.

Keep own-session/disabled/member checks and the existing ID-based resolver/IDOR semantics. Move MIME, dimensions, EXIF stripping, resize, storage, and asset/file creation into the core. The old `media_asset_id` resolver stays available through the temporary alias until Phase 108/109.

## Strong Analog 4: Central Browser Upload/Auth Seam

**Source:** `frontend/src/lib/api.ts`, lines 2249-2383.

```ts
type UploadRetryEligibility =
  | "never"
  | "auth-before-persistence"
  | "idempotent";

async function authorizedUploadXhr<T>(
  options: AuthorizedUploadXhrOptions<T>,
): Promise<T> {
  await ensureFreshRuntimeSession();
  const initialToken = resolveAuthToken();
  const initialResult = await sendAuthorizedUploadXhrOnce(options, initialToken);
  // exactly one auth-related retry when eligibility permits
}
```

All affected helpers must continue to use this one wrapper. Once backend hash+usage idempotency is proven, change their `retryEligibility` from `"never"` to `"idempotent"`. Avatar/background currently use `authorizedFetch` with `retryAuth401: false`; migrate them to the central upload wrapper rather than adding another retry loop.

**Current helper analogs:**

- Fansub branding/gallery: `api.ts` lines 2385-2435
- Avatar/background: lines 3315-3395
- Generic anime: lines 4693-4726
- Theme: lines 4891-4956
- RVM: lines 6885-6920
- Story: lines 9343-9389

`buildBody: () => FormData` is critical: a retry must build a fresh body. Components/hooks must not read tokens, create bearer headers, or retry independently.

**Auth-refresh test pattern** (`api.auth-refresh.test.ts`, lines 570-630):

```ts
seedRuntimeSessionExpiringSoon()
refreshKeycloakTokenMock.mockResolvedValue(freshKeycloakBundle())
vi.stubGlobal('XMLHttpRequest', MockUploadXhr)

await expect(uploadAdminAnimeMedia({...})).resolves.toMatchObject({ id: 'media-42' })
expect(refreshKeycloakTokenMock).toHaveBeenCalledTimes(1)
expect(MockUploadXhr.instances[0]?.headers.Authorization).toBe('Bearer new-access-token')
expect(progress).toEqual([0, 25, 100])
```

Extend this pattern with:

- missing access token + valid refresh token;
- first XHR `401`, one refreshed replay, success with rebuilt FormData;
- lost successful response/retry returning `reused: true`;
- no more than one replay;
- all six helper families, preferably table-driven against the shared wrapper.

The existing no-token source scanner (`api.no-token-boundary.test.ts`, lines 59-116 and 226-233) is the analog for enforcing that XHR/auth remains centralized.

## Strong Analog 5: Contracts, DTOs, Migrations, and Source Gates

### Shared result type

**Existing DTO analog:** `frontend/src/types/releaseVersionMedia.ts`, lines 53-65.

```ts
export interface ReleaseVersionMediaUploadResult {
  client_file_name: string
  status: 'ready' | 'processing' | 'failed'
  media_asset_id?: number
  release_version_media_id?: number
  thumbnail_url?: string | null
  error_code?: string
}

export interface ReleaseVersionMediaUploadResponse {
  results: ReleaseVersionMediaUploadResult[]
}
```

Promote this concept to one shared upload result/response type with `reused`, canonical `media_id`, useful variant URLs, optional compatibility IDs, and nested machine-readable error. Do not define six structurally similar result types. Single-file routes also return a one-element `results` array if D-18 is implemented literally.

### OpenAPI synchronization

Exact current contract owners:

- Profile avatar/background/story: `shared/contracts/openapi.yaml` lines 342-500
- Generic admin upload: lines 1414-1469
- Fansub upload: lines 3661-3750
- RVM upload: lines 5860-5927 and schema lines 11547-11575
- RVM focused contract: `shared/contracts/admin-content.yaml` lines 442-464 and 943-952
- Frontend legacy shapes: `types/fansub.ts` lines 516-522; `types/admin.ts` lines 687-706 and 819-821; `types/profile.ts` lines 124-126

The theme upload routes are not discoverable as upload operations in the current shared-contract searches. Treat that as existing contract drift: locate their intended owner after Phase 106 and add/update the relevant canonical contract instead of leaving runtime-only behavior.

### Migration/source-contract tests

**Migration structure pattern:** `backend/internal/migrations/release_content_source_groups_test.go`, lines 9-35.

```go
up, err := os.ReadFile("../../../database/migrations/0130_release_content_source_groups.up.sql")
down, err := os.ReadFile("../../../database/migrations/0130_release_content_source_groups.down.sql")
for _, needle := range []string{/* required DDL */} {
	if !strings.Contains(string(up), needle) { t.Fatalf("UP missing %q", needle) }
}
if !strings.Contains(string(down), "DROP INDEX IF EXISTS") { ... }
```

Use `runtime.Caller` + repo-root resolution from `phase103_release_playback_entitlements_test.go` lines 11-25 if the new test needs stable execution from different working directories.

The Phase-107 migration test must assert post-106 schema prerequisites, partial UNIQUE `media(content_hash) WHERE content_hash IS NOT NULL`, uniqueness of `(media_id, variant)`, the exact temporary bridge chosen after the architecture decision, and reversible removal of Phase-107-only additions. Add a real disposable-Postgres up/down and concurrent insert test; string inspection alone is insufficient for D-05/D-07.

**Source-contract scanner analog:** `frontend/src/lib/api.no-token-boundary.test.ts`, lines 59-116.

```ts
function walkFiles(directory: string): string[] { ... }
function scan(files: string[], pattern: RegExp): SourceMatch[] { ... }
function rejectAllowed(matches: SourceMatch[], allowlist: Set<string>): SourceMatch[] { ... }
```

Backend can implement the same deterministic walk/regex/allowlist pattern in Go. Allow exactly one named compatibility adapter file, carry `TODO phase-108 remove compatibility adapter`, and fail when technical tokens (`mimetype.Detect`, image decode/encode, FFmpeg, hashing, direct upload writes) remain in the six adapters or legacy relation writes exist outside the adapter allowlist. Do not rely only on brittle `strings.Contains` tests of one handler.

## Shared Patterns

### Dependency Injection and Composition

**Sources:**

- `backend/cmd/server/main.go` lines 83-85 constructs `mediaRepo` and one `mediaService`.
- Lines 232-245 pass them to `AdminContentHandler.WithMediaDeps`.
- Lines 264-281 pass them to `FansubHandler.WithMedia`.
- `admin_content_handler.go` lines 241-246 and `fansub_media_config.go` lines 8-12 show fluent dependency injection.

Add the same service instance to `AppAuthHandler` and `MediaUploadHandler`; do not construct inside handlers. Prefer a focused `WithMedia` method for `AppAuthHandler` over extending an already long constructor if consistent with the post-106 code.

### Static Serving and Staging Privacy

**Source:** `backend/cmd/server/main.go`, lines 59-69.

```go
mediaGroup := router.Group("/media")
mediaGroup.Use(func(c *gin.Context) {
	c.Header("X-Content-Type-Options", "nosniff")
	// ...
	c.Next()
})
mediaGroup.StaticFS("", http.Dir(cfg.MediaStorageDir))
```

This currently exposes every child of the media root. Add an explicit `.staging`/dot-path deny wrapper before `StaticFS`, and test direct and traversal-shaped requests return 404 while a ready hash path still serves. Staging cleanup must resolve and verify exact children under the configured media staging root and must never touch `frontend/public/history-event-badges-transparent/`.

### Validation Core

The authoritative existing minimum is in `admin_content_release_version_media.go` lines 31-45 and 348-392:

```go
const (
	rvmMaxFileSizeBytes = 15 * 1024 * 1024
	rvmMaxImageWidth    = 8000
	rvmMaxImageHeight   = 8000
	rvmMaxGIFFrames     = 300
	rvmThumbnailWidth   = 400
)

detected := mimetype.Detect(data)
if meta.Width > rvmMaxImageWidth || meta.Height > rvmMaxImageHeight { ... }
if meta.Width*meta.Height > 40_000_000 { ... }
if mimeType == "image/gif" && meta.GIFFrames > rvmMaxGIFFrames { ... }
```

Move these limits to profiles and use `int64(width) * int64(height)`. Do not copy `gif.DecodeAll` as the frame preflight: the current code decodes all frames before enforcing 300. The core API should accept a stream/seekable staged file, not `[]byte`.

### Audit and Error Mapping

Keep context permission/domain audit in handlers (for example RVM upload lines 309-319 and fansub upload lines 398-410). Add one technical audit sink at the core for created/reused/rejected/compensated outcomes. Audit failure after commit must not delete a ready shared medium.

Use one typed core error with machine code and German user-facing message. Handler-level auth, permission, context-not-found, and invalid-slot errors remain context-owned. The result mapper must be shared; no handler-specific probing of different core error types.

### Dedup and Metadata Ownership

The post-106 repository is the only valid base. Extend `MediaRepository` with transaction methods that:

- use a DB UNIQUE arbiter for non-null `content_hash` and `ON CONFLICT`;
- select the winning row without updating `owner_user_id`, original filename, source, credit, or rights;
- upsert useful variants under `(media_id, variant)` uniqueness;
- serialize promotion by full hash/advisory lock or an equivalent DB-backed proof;
- distinguish global medium reuse from identical usage reuse;
- attach later-uploader credit only through the compatibility usage relation.

## Exact `read_first` Candidates for Plans

### Readiness / schema plan

- `.planning/phases/106-medienkern-schema-legacy-abbau/106-CONTEXT.md`
- all produced `106-*-SUMMARY.md` and Phase-106 verification artifact
- actual post-106 `database/migrations/*media_core_schema*.up.sql` and `.down.sql`
- actual post-106 `backend/internal/migrations/media_core_schema_test.go`
- `scripts/media-core-contract-check.ps1`
- `scripts/media-core-legacy-grep.ps1`
- `AGENTS.md`
- `.planning/notes/260721-medienmodell-neubau-architektur-DECISION.md`

### Core service/repository plan

- `backend/internal/services/media_service.go`
- `backend/internal/repository/media_repository.go`
- `backend/internal/repository/release_version_media_repository.go`
- `backend/internal/repository/media_upload.go` (post-106 version)
- `backend/internal/handlers/admin_content_release_version_media.go` lines 31-140 and 328-534
- `backend/internal/handlers/media_upload_video.go` (post-106 version)
- `backend/internal/handlers/app_profile_story_image.go` lines 38-208
- `backend/cmd/server/main.go` lines 59-85 and composition/cleanup block

### Six-adapter migration plans

- each exact handler being edited
- its existing focused test file(s)
- `backend/internal/services/media_file_service.go` (actual chosen name)
- `backend/internal/services/media_file_compatibility.go` (actual chosen name)
- `backend/internal/repository/media_core_repository.go` (actual chosen name)
- relevant relation repository: RVM `release_version_media_repository.go`; fansub `media_repository.go`; theme repository owner; profile `member_profile_repository.go`
- `docs/architecture/db-schema-fansub-domain.md`

### API/auth plan

- `docs/api/api-contracts.md`
- `docs/frontend/auth-api-client.md`
- `shared/contracts/openapi.yaml` exact six route/schema sections
- `shared/contracts/admin-content.yaml` relevant RVM/fansub/theme sections
- `frontend/src/lib/api.ts` lines 2249-2383 and each affected helper
- `frontend/src/lib/api.auth-refresh.test.ts` lines 1-121 and 528-659
- `frontend/src/lib/api.no-token-boundary.test.ts`
- `frontend/src/types/releaseVersionMedia.ts`
- `frontend/src/types/fansub.ts`, `admin.ts`, `profile.ts` relevant response types

### Required docs on every auth/media ownership plan

- `docs/engineering/implementation-contract.md`
- `docs/api/api-contracts.md`
- `docs/frontend/auth-api-client.md`
- `docs/architecture/db-schema-fansub-domain.md`

## No Close Analog Found

| Planned Capability/File | Why no exact analog exists | Planner direction |
|---|---|---|
| private staging + hash promotion + crash reconciliation (`media_file_storage.go`) | Existing paths write directly to final context paths | Use research state machine; require injected storage/failpoints and same-filesystem/private guarantees |
| deterministic metadata-safe GIF/WebP/AV sanitization (`media_file_image.go`, `media_file_av.go`) | Existing GIF path preserves raw metadata and ffmpeg calls lack timeout/protocol confinement | Use container-backed fixtures and fail closed; do not retain black-placeholder behavior |
| concurrent global hash dedup (`media_core_repository.go`) | Pre-106 tree has neither `media` nor unique `content_hash` arbiter | Build only on actual post-106 schema; real Postgres concurrency test required |
| named compatibility writer/removal gate | Legacy writes are scattered across current handlers/repositories | Centralize in one allowlisted file with explicit Phase-108 TODO and source gate |
| technical audit sink spanning DB/filesystem saga | Current audit is handler/domain-oriented | Inject a small sink; specify pre-/post-commit failure behavior |

## Files That Must Not Be Reintroduced or Misused

- Never use `release_version_groups.fansubgroup_id`; only `fansub_group_id` is canonical.
- Never attach release-version process media to `episode_media` or substitute `release_media`.
- Never restore Phase-106 legacy schema detection/dual write behavior after its removal.
- Never add a second browser XHR/auth wrapper.
- Never add new relation tables in Phase 107; final relations are Phase 108.
- Never migrate or delete `SaveSegmentAsset` as part of the six upload entries.

## Metadata

**Analog search scope:** `backend/internal/services`, `backend/internal/repository`, `backend/internal/handlers`, `backend/internal/migrations`, `backend/cmd/server`, `database/migrations`, `frontend/src/lib`, `frontend/src/types`, `shared/contracts`

**Primary analog families:** existing MediaService/composition; RVM per-file transaction pipeline; MediaRepository transaction methods; central XHR/auth-refresh seam; migration/source-contract tests

**Pattern extraction date:** 2026-07-22

**Important invalidation rule:** Re-map paths and line numbers immediately after Phase 106 execution because it intentionally modifies overlapping upload, repository, contract, frontend API, and server composition files.
