# Phase 07: Generic Upload And Linking - Research

**Researched:** 2026-04-04
**Domain:** Anime-first V2 admin media upload and asset-slot linking
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Phase 7 stays anime-first; it does not expand generic upload/linking to non-anime entities.
- The verified `cover` seam from Phase 06 is the baseline pattern for all newly supported anime asset types.
- In-scope asset types for this phase are `cover`, `banner`, `logo`, `background`, and `background_video`.
- Manual create and edit flows must use one generic V2 upload and linking contract instead of slot-specific special cases.
- The phase should cover upload, linking, and the UI/API wiring needed to use the generic seam for the supported anime asset types.
- Cleanup semantics should stay aligned with the verified V2 ownership model and must not reintroduce `frontend/public/covers` or `/api/admin/upload-cover` into active flows.

### Claude's Discretion
- How to split backend, frontend, and test work across plan files as long as all Phase 7 requirements remain covered.
- Whether helper abstractions should live in existing upload/linking modules or move into new shared utility files.
- The narrowest safe test set needed to prove generic slot support without reopening already-verified Phase 06 behavior beyond regression coverage.

### Deferred Ideas (OUT OF SCOPE)
- Extending the generic upload/linking contract to non-anime entities
- Broader operator UX redesign beyond what is needed to expose the supported asset types
- Cleanup and replacement semantics beyond what is necessary to preserve Phase 06 behavior and prepare for Phase 8
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPLD-01 | Admin can upload manual assets through one generic admin upload contract instead of slot-specific special cases. | Keep `/api/v1/admin/upload` as the only multipart entrypoint and add one generic anime link contract/service so UI code stops calling per-slot special cases directly. |
| UPLD-02 | The generic upload contract supports at least `cover`, `banner`, `logo`, `background`, and `background_video`. | Extend the existing anime-only alias/policy table and UI slot metadata to all five supported asset types; reuse image/video validation already present in the upload handler. |
| UPLD-03 | Uploaded anime assets are linked to the correct anime and asset slot through one reusable V2 persistence path. | Route all slot assignment through one V2 linking repository/service keyed by slot policy: singular slots replace existing links, plural slots append with sort order. |
</phase_requirements>

## Summary

Phase 6 already established the correct foundation: anime-only uploads go through `/api/v1/admin/upload`, asset folder provisioning is centralized in `AssetLifecycleService`, uploads persist real V2 media rows, and cover create/edit flows are verified end to end. The codebase is no longer blocked on storage or provisioning. The Phase 7 problem is that linking still fans back out into slot-specific branches after upload.

Today the backend has one generic multipart upload transport, but linking remains fragmented across separate admin routes and repository methods for cover, banner, and backgrounds. The frontend mirrors that split: manual create is still cover-only, the edit surface has a semi-generic upload helper for `cover|banner|background`, and logo/background-video are visible in Jellyfin/provider types but remain provider-only in manual upload UX. Planning should treat Phase 7 as a contract-consolidation phase, not a new storage phase.

The best plan is to keep the verified Phase 6 upload transport and provisioning logic intact, add one reusable anime slot-linking service on top of the V2 repository, and make both manual create and edit flows call that shared contract for `cover`, `banner`, `logo`, `background`, and `background_video`. Also plan explicit contract-sync work: the current upload/link endpoints are used by code but are missing from `shared/contracts/openapi.yaml`.

**Primary recommendation:** Preserve the existing anime-only V2 upload endpoint, but introduce one generic anime asset-link contract and slot-policy table so every supported slot uses the same backend path, same frontend helper, same tests, and same documentation surface.

## Project Constraints (from CLAUDE.md)

- Improve the existing brownfield backend/frontend/admin stack rather than replacing it.
- Preserve existing Team4s routes, repository patterns, and database evolution model.
- Keep manual/admin-authored data authoritative over imported/provider data.
- Keep admin actions attributable by user ID and operational errors visible immediately in the UI.
- Keep production files below roughly 450 lines; split larger implementations.
- Prefer documented APIs and avoid undocumented behavior.
- Do not bypass the existing GSD workflow discipline for repo edits.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Go | `1.25.0` module target, `go1.26.1` installed | Backend handlers, services, repositories | Existing backend stack; no new server framework is warranted. |
| `github.com/gin-gonic/gin` | `v1.10.0` | Multipart binding and admin HTTP routes | Current upload and admin asset handlers already use Gin binding and JSON error envelopes. |
| `github.com/jackc/pgx/v5` | `v5.7.1` | V2 media persistence and transactional slot linking | Existing anime asset repository logic already uses pgx transactions and row locking. |
| Next.js | `16.1.6` | Admin create/edit UI surfaces | Existing admin tooling already lives in the App Router frontend. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `github.com/gabriel-vasile/mimetype` | `v1.4.3` | Magic-byte upload validation | Keep for generic slot uploads; it already handles image/video detection. |
| `github.com/disintegration/imaging` | `v1.6.2` | Thumbnail generation and image persistence | Keep for image slots such as cover/banner/logo/background. |
| `github.com/google/uuid` | `v1.6.0` | Upload-scoped storage directories | Keep for asset folder isolation under each slot. |
| Vitest | `3.2.4` | Frontend regression coverage | Existing admin upload/edit tests already use it. |
| `github.com/stretchr/testify` | `v1.9.0` | Backend assertions | Existing handler/service/repository tests already use it. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Slot-specific link handlers (`cover`, `banner`, `backgrounds`) | One generic `link anime asset` contract | Slightly more refactor now, but it eliminates repeat logic and unlocks `logo` and `background_video` cleanly. |
| Frontend per-surface upload functions | One shared `uploadAndLinkAnimeAsset` helper | Less duplicated UI logic and one place to map slot kinds to upload/link actions. |
| Extending legacy `/api/admin/upload-cover` behavior | Staying on the verified Phase 6 V2 seam | Required by locked decisions; reviving legacy seams would reintroduce exactly the behavior Phase 6 removed. |

**Installation:**
```bash
# No new dependencies recommended for Phase 7.
cd backend && go test ./internal/handlers ./internal/repository ./internal/services -count=1
cd frontend && npm test -- src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts
```

**Version verification:** No new third-party packages are recommended. Versions above were verified from `backend/go.mod` and `frontend/package.json` on 2026-04-04.

## Architecture Patterns

### Recommended Project Structure
```text
backend/internal/
|-- handlers/
|   |-- media_upload.go                 # Keep generic multipart upload transport
|   `-- admin_content_anime_assets.go   # Collapse slot-specific HTTP branches behind one generic path/helper
|-- services/
|   |-- asset_lifecycle_service.go      # Keep provisioning and path policy
|   `-- anime_asset_link_service.go     # New generic slot-link orchestration
|-- repository/
|   `-- anime_assets.go                 # Reuse V2 slot persistence helpers
frontend/src/
|-- lib/api.ts                          # One upload helper + one generic link helper
|-- app/admin/anime/create/page.tsx     # Reuse generic asset upload/link flow after create
`-- app/admin/anime/...                 # Edit UI uses the same helper for all supported slots
```

### Pattern 1: Generic Upload, Generic Link
**What:** Keep upload and linking as two explicit steps, but make each step generic. Upload returns a persisted media asset ID; link accepts `anime_id`, `slot`, and `media_id`.
**When to use:** All manual create/edit slot uploads.
**Example:**
```typescript
const upload = await uploadAdminAnimeMedia({
  animeID,
  assetType: slotToUploadAssetType(slot),
  file,
  authToken,
})

await linkAdminAnimeAsset({
  animeID,
  slot,
  mediaID: upload.id,
  authToken,
})
```
Source: repo fit from existing upload usage in `frontend/src/lib/api.ts` and `AnimeJellyfinMetadataSection.tsx`.

### Pattern 2: Slot Policy Table Drives V2 Persistence
**What:** Map admin slot names to media types and cardinality in one place.
**When to use:** Backend link service and frontend helpers.
**Example:**
```go
type AnimeAssetSlotPolicy struct {
	Slot      string
	MediaType string
	Mode      string // single | multi
}

var animeSlotPolicies = map[string]AnimeAssetSlotPolicy{
	"cover":            {Slot: "cover", MediaType: "poster", Mode: "single"},
	"banner":           {Slot: "banner", MediaType: "banner", Mode: "single"},
	"logo":             {Slot: "logo", MediaType: "logo", Mode: "single"},
	"background":       {Slot: "background", MediaType: "background", Mode: "multi"},
	"background_video": {Slot: "background_video", MediaType: "video", Mode: "single"},
}
```
Source: existing mappings in `backend/internal/services/asset_lifecycle_service.go` and `backend/internal/handlers/media_upload.go`.

### Pattern 3: Singular Slots Replace, Multi Slots Append
**What:** `cover`, `banner`, `logo`, and `background_video` should remove existing links of the same media type before linking the uploaded asset; `background` should append with next sort order.
**When to use:** Generic V2 linking service.
**Example:**
```go
if policy.Mode == "single" {
	if err := removeAnimeMediaLinksByType(ctx, tx, animeID, policy.MediaType); err != nil {
		return err
	}
	return upsertAnimeMediaLink(ctx, tx, animeID, mediaID, 0)
}

nextSort, err := loadNextAnimeMediaSortOrderByType(ctx, tx, animeID, policy.MediaType)
if err != nil {
	return err
}
return upsertAnimeMediaLink(ctx, tx, animeID, mediaID, nextSort)
```
Source: existing V2 behavior in `backend/internal/repository/anime_assets.go`.

### Pattern 4: Upload Transport Stays Thin
**What:** `media_upload.go` should continue owning multipart validation, file processing, and media row creation. It should not become the place where slot business rules explode.
**When to use:** Any Phase 7 refactor of upload behavior.
**Example:**
```go
// Keep upload concerned with:
// 1. auth
// 2. request bind + asset type normalization
// 3. provisioning
// 4. file validation and persistence
// 5. returning media asset ID + URLs
```
Source: existing thin-transport direction in `backend/internal/handlers/media_upload.go`.

### Anti-Patterns to Avoid
- **Per-slot HTTP contracts:** Do not add `upload-logo`, `upload-background-video`, or other new special-case routes.
- **UI-only genericity:** A shared frontend helper that still fans out into backend slot-specific branches does not satisfy UPLD-03.
- **Reopening legacy seams:** Do not route any new work through `/api/admin/upload-cover` or `frontend/public/covers`.
- **Embedding slot policy in multiple files:** The current asset-type aliases, media-type mapping, and route branching already drift; Phase 7 should reduce that duplication.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Generic slot semantics | Ad hoc `if slot == "cover"` branches across UI and handler code | One slot-policy table shared by the generic link service | Prevents banner/logo/video from becoming one-off exceptions. |
| Upload validation | Separate validators for each asset slot | Existing `mimetype` + image/video processing pipeline | The repo already has working validation and derivative generation. |
| Persistence shape | New custom per-slot tables or custom file metadata schema | Existing V2 `media_assets`, `media_files`, and `anime_media` join path | The V2 repository already expresses singular vs multi-slot behavior. |
| API error format | Custom slot-specific error payloads | Existing `{ error: { message, code, details } }` envelope | Frontend already parses this consistently through `ApiError`. |
| Documentation workaround | Leaving Phase 7 endpoints undocumented because code already compiles | Sync `shared/contracts/openapi.yaml` | The repo explicitly treats contracts as part of system truth. |

**Key insight:** The hard part is no longer file storage. The hard part is making upload and slot-linking one authoritative contract instead of a transport layer that becomes fragmented immediately after returning a media ID.

## Common Pitfalls

### Pitfall 1: Treating Upload Success As Final Linking
**What goes wrong:** The file uploads successfully, but the intended slot is not deterministically active because upload and slot-linking are still separate behaviors.
**Why it happens:** `media_upload` already creates a V2 `anime_media` join row, while active-slot semantics for singular slots still live in separate repository methods.
**How to avoid:** Plan an explicit generic linking layer and decide whether upload should keep creating the provisional join row or whether Phase 7 should narrow linking responsibility to the dedicated link path.
**Warning signs:** UI says upload succeeded but the wrong banner/background/video remains active.

### Pitfall 2: Extending Only The Edit Screen
**What goes wrong:** Edit supports generic slots but manual create remains cover-only, so the phase misses the locked requirement that create and edit share one reusable seam.
**Why it happens:** Manual create currently stages and uploads only cover.
**How to avoid:** Plan shared create/edit helper logic and shared slot metadata.
**Warning signs:** Research or plan files talk about `AnimeJellyfinMetadataSection` only and ignore `frontend/src/app/admin/anime/create/page.tsx`.

### Pitfall 3: Leaving Logo And Background Video Provider-Only
**What goes wrong:** The types and provisioning policy include `logo` and `background_video`, but the actual manual upload path still exposes only cover/banner/background.
**Why it happens:** Current edit UI defines `UploadTarget = 'cover' | 'banner' | 'background'`.
**How to avoid:** Treat logo and background video as real Phase 7 implementation scope, not "already covered" because they appear in type definitions.
**Warning signs:** Plans mention only existing manual buttons and never add new slot actions.

### Pitfall 4: OpenAPI Drift
**What goes wrong:** Code and frontend helpers move forward, but the shared contract remains incomplete, causing future planning and client work to reason from stale docs.
**Why it happens:** `/api/v1/admin/upload` and anime asset link routes are currently used by code but not present in `shared/contracts/openapi.yaml`.
**How to avoid:** Include contract sync as an explicit Phase 7 task.
**Warning signs:** Planner treats docs as optional follow-up instead of part of the phase.

### Pitfall 5: Regressing The Verified Cover Seam
**What goes wrong:** Genericization accidentally breaks the already-verified cover flow from Phase 6.
**Why it happens:** Cover is currently the only end-to-end verified slot and the easiest path to destabilize while extracting helpers.
**How to avoid:** Keep cover regression tests in both backend and frontend while adding the new slots.
**Warning signs:** Refactor removes cover-specific tests without replacing them with generic slot-matrix coverage.

## Code Examples

Verified patterns from official sources and current repo seams:

### Gin Multipart Binding For Minimal Upload Fields
```go
type UploadRequest struct {
	EntityType string `form:"entity_type" binding:"required"`
	EntityID   int64  `form:"entity_id" binding:"required"`
	AssetType  string `form:"asset_type" binding:"required"`
}

var req UploadRequest
if err := c.ShouldBind(&req); err != nil {
	// map to operator-safe error
}
```
Source: `backend/internal/models/media_upload.go`; Gin multipart binding docs: https://gin-gonic.com/en/docs/examples/multipart-urlencoded-binding/

### Safer Path Containment
```go
rel, err := filepath.Rel(filepath.Clean(base), filepath.Clean(target))
if err != nil {
	return false, err
}
if rel == ".." || strings.HasPrefix(rel, ".."+string(os.PathSeparator)) {
	return false, nil
}
```
Source: `backend/internal/services/asset_lifecycle_service.go`; Go filepath docs: https://pkg.go.dev/path/filepath

### Existing V2 Singular Link Pattern
```go
mediaID, err := loadV2AnimeMediaIDByRef(ctx, tx, strings.TrimSpace(mediaRef), mediaType)
if err != nil {
	return err
}
if err := removeAnimeMediaLinksByType(ctx, tx, animeID, mediaType); err != nil {
	return err
}
if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, 0); err != nil {
	return err
}
```
Source: `backend/internal/repository/anime_assets.go`

### Existing Frontend Two-Step Seam To Generalize
```typescript
const upload = await uploadAdminAnimeMedia({
  animeID,
  assetType: target === 'cover' ? 'poster' : target === 'banner' ? 'banner' : 'gallery',
  file,
  authToken,
})

await assignAdminAnimeCoverAsset(animeID, upload.id, authToken)
```
Source: `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy local cover upload path and slot-specific fallback behavior | Verified anime-first V2 upload seam with canonical provisioning | Phase 06, verified 2026-04-03 | Phase 7 should extend this seam, not replace it. |
| Cover-only verified edit upload behavior | Semi-generic edit behavior for cover/banner/background plus slot-specific link calls | Late Phase 06 work | The remaining Phase 7 job is to remove the post-upload fragmentation and add the missing slots. |
| Legacy slot columns as primary runtime authority | V2 `anime_media` link path with repository helpers for singular and multi-slot semantics | Existing migrations `0039` and `0040` plus V2 repo path | Reuse V2 media/link helpers rather than inventing a new slot persistence layer. |

**Deprecated/outdated:**
- `/api/admin/upload-cover` and `frontend/public/covers` in active flows.
- Cover-only edit helper naming and UX as the sole manual upload abstraction.
- Leaving admin upload/link endpoints undocumented in `shared/contracts/openapi.yaml`.

## Open Questions

1. **Should upload keep creating an immediate `anime_media` link before explicit slot-linking?**
   - What we know: `processImage` and `processVideo` currently call `CreateAnimeMedia` during upload.
   - What's unclear: whether Phase 7 should preserve that provisional link or move all active linking into the new generic link path.
   - Recommendation: decide this explicitly in planning. If retained, document it as provisional and keep the generic link service authoritative for active-slot semantics.

2. **Is `background_video` supposed to be singular in runtime behavior?**
   - What we know: requirements list it as a supported slot, provisioning gives it its own folder, and current media-type mapping points it to `video`.
   - What's unclear: whether runtime consumers expect exactly one active background video.
   - Recommendation: plan it as singular unless contrary consumer code is found during implementation.

3. **How should `logo` surface in the admin UI?**
   - What we know: types, provisioning policy, and provider preview already know about logos, but manual upload/remove flows do not.
   - What's unclear: whether edit and create should mirror cover/banner UX or expose a lighter version.
   - Recommendation: keep it simple and parallel to banner for Phase 7; avoid bespoke UX.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Go | Backend implementation and tests | Yes | `go1.26.1` | None |
| Node.js | Frontend implementation and tests | Yes | available | None |
| npm | Frontend test/build commands | Yes | available | None |
| Docker | Local browser verification stack | Yes | compose `v5.1.0` | Existing direct local commands for targeted tests |
| ffmpeg | Background video processing path | Not verified directly in this audit | unknown | Planner should keep existing config assumptions and verify before executing video-path UAT |

**Missing dependencies with no fallback:**
- None identified for planning.

**Missing dependencies with fallback:**
- `ffmpeg` executable path was not independently probed here; backend unit tests can still cover most non-runtime linking work without it.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Go test + Testify; Vitest 3.2.4 |
| Config file | `frontend/vitest.config.ts`; Go uses package-native test discovery |
| Quick run command | `cd backend && go test ./internal/handlers ./internal/repository ./internal/services -count=1` |
| Full suite command | `cd backend && go test ./... -count=1` and `cd frontend && npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UPLD-01 | One generic admin upload/link seam is used instead of slot-specific special cases | backend unit + frontend unit | `cd backend && go test ./internal/handlers ./internal/repository -count=1` | Yes |
| UPLD-02 | Supported slots include `cover`, `banner`, `logo`, `background`, `background_video` | backend service/handler + frontend helper tests | `cd backend && go test ./internal/services ./internal/handlers -count=1` | Partial |
| UPLD-03 | Uploaded asset links through one reusable V2 persistence path | backend repository/handler + frontend API/helper tests | `cd backend && go test ./internal/repository ./internal/handlers -count=1` | Partial |

### Sampling Rate
- **Per task commit:** `cd backend && go test ./internal/handlers ./internal/repository ./internal/services -count=1`
- **Per wave merge:** `cd frontend && npm test -- src/app/admin/anime/hooks/internal/anime-patch/useAnimePatchMutations.test.ts src/app/admin/anime/create/page.test.tsx`
- **Phase gate:** Backend targeted tests, frontend targeted tests, then real browser smoke on create/edit for all supported slots before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Backend tests for generic link service covering `logo` and `background_video`
- [ ] Backend handler tests proving upload+link slot matrix beyond current cover/banner/background coverage
- [ ] Frontend shared helper tests for generic `slot -> upload type -> link action` mapping
- [ ] Frontend create-page tests for non-cover slot uploads after anime creation
- [ ] Contract sync checks for `shared/contracts/openapi.yaml`

## Sources

### Primary (HIGH confidence)
- Official Go filepath docs: https://pkg.go.dev/path/filepath
- Official Gin multipart binding docs: https://gin-gonic.com/en/docs/examples/multipart-urlencoded-binding/
- Repo code: `backend/internal/handlers/media_upload.go`
- Repo code: `backend/internal/services/asset_lifecycle_service.go`
- Repo code: `backend/internal/repository/anime_assets.go`
- Repo code: `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeJellyfinMetadataSection.tsx`
- Repo code: `frontend/src/app/admin/anime/create/page.tsx`
- Repo evidence: `.planning/phases/06-provisioning-and-lifecycle-foundations/06-UAT.md`

### Secondary (MEDIUM confidence)
- Repo planning docs: `.planning/phases/07-generic-upload-and-linking/07-CONTEXT.md`
- Repo planning docs: `.planning/REQUIREMENTS.md`
- Repo status docs: `STATUS.md`, `CONTEXT.md`

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo stack is clear and no new dependencies are recommended.
- Architecture: HIGH - recommendations are anchored to verified Phase 6 behavior and current repo seams.
- Pitfalls: HIGH - they are directly evidenced by current code fragmentation and documentation drift.

**Research date:** 2026-04-04
**Valid until:** 2026-05-04
