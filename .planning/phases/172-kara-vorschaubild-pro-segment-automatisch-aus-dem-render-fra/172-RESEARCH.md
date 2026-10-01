# Phase 172: Kara-Vorschaubild pro Segment - Research

**Researched:** 2026-10-01
**Domain:** Go/Postgres backend media pipeline (ffmpeg frame extraction) + Next.js admin UI (upload/picker) + public release-story resolution
**Confidence:** HIGH (all claims below are `[VERIFIED: codebase read]` against the current `main` checkout unless marked `[ASSUMED]`)

## Summary

This phase adds a single, server-resolved preview image per Kara-Segment (`theme_segments`), replacing the current ad-hoc resolution that goes through `theme_segment_playback_sources.media_asset_id`. The codebase already contains every primitive needed — no new libraries, no new architecture:

- Frame extraction at an arbitrary offset already exists twice: `MediaService.saveSegmentVideoPreview` (`-ss 0`, no duration awareness) and `MediaUploadHandler.extractVideoThumbnail`/`getVideoMetadata` (arbitrary `-ss`, ffprobe-based duration). The render worker (`executeSegmentRender`) already computes `durationSeconds` of the *rendered* clip before calling `MarkThemeSegmentRenderCacheReady` — this is exactly the number needed for "35% of segment duration," no ffprobe required at that call site.
- The manual-upload path (`saveSegmentVideoPreview`, called from `SaveSegmentAsset`) does NOT know the video duration today — it must ffprobe the uploaded file first, following `getVideoMetadata`'s exact pattern (`ffprobePath := strings.Replace(h.ffmpegPath, "ffmpeg", "ffprobe", 1)`, or better: use the already-configured `SegmentRenderFFprobePath` if threading it through, or just derive from `h.ffmpegPath` the same way `media_upload_video.go` does).
- `media_assets.status` defaults to `'ready'` (migration 0059) — no async "processing" pipeline is required for a synchronously-created preview image, matching the existing `UploadSegmentAsset` pattern (create asset → `InsertMediaFile(asset.ID, "original", ...)`, done, no second step).
- `MediaKindImage` already has the exact validation (PNG/JPG/WEBP/GIF, 15 MB max) that UI-SPEC Design-Entscheidung 12 independently (and correctly) matched to `admin_content_release_version_media.go`'s `rvmMaxFileSizeBytes = 15 * 1024 * 1024`.
- A "pick an existing public, approved image belonging to an assigned release version" picker has no direct precedent as an endpoint, but every piece needed exists: `ListThemeSegmentAssignments(segmentID)` already returns the assigned `release_version_id`s, and `release_version_media` + `media_assets` + `visibilities`/`review_statuses` is the exact gate already used in `countImagesByCategory` (`v.name='public' AND rs.code='approved' AND ma.status='ready' AND rvm.deleted_at IS NULL`).
- A standalone one-off backfill binary has a direct, recent precedent: `backend/cmd/migrate-covers/main.go` (DRY_RUN/SKIP_EXISTING env flags, its own `main()`, no web server). `backend/cmd/migrate-preview-backfill` (or similar) should follow the identical shape.
- Migration number **0177 is confirmed free** — the highest existing migration is `0176_release_version_story_order_trigger_alignment`.

**Primary recommendation:** Add two nullable FK columns to `theme_segments` (`preview_media_asset_id`, `auto_preview_media_asset_id`, both `BIGINT REFERENCES media_assets(id) ON DELETE SET NULL`) in migration 0177; resolve `preview_url`/`preview_source` server-side with a single `COALESCE`-style SQL fragment reused in three call sites (`ListAnimeSegments`/`GetAnimeSegmentByID`, and `loadReleaseSegments`); add 4 new handler endpoints in a **new** file (`admin_content_anime_theme_segments_preview.go`) since `admin_content_anime_theme_segments.go` is already 955 lines; hook auto-frame-extraction into `executeSegmentRender` right after `MarkThemeSegmentRenderCacheReady` succeeds, logged-only on failure (D-06); build the backfill as a new `cmd/` binary mirroring `migrate-covers`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auto frame extraction (35% of render) | API / Backend (worker) | Database/Storage (media_assets) | `executeSegmentRender` already owns the ffmpeg render lifecycle; the extracted frame is a derived artifact persisted exactly like other media assets |
| Auto frame extraction (35% of upload) | API / Backend (MediaService) | Database/Storage | `saveSegmentVideoPreview` already owns this for `-ss 0`; only the offset computation changes |
| Manual upload / picker / reset UI | Browser / Client | API / Backend | New `SegmentPreviewImageSection.tsx`/`SegmentPreviewImagePicker.tsx` call new REST endpoints; all authorization/validation stays server-side (`requireSegmentManage`) |
| preview_url/preview_source resolution | API / Backend (repository) | — | Must be computed identically for 3 call sites (admin list, admin single, public detail) — a single shared SQL fragment/Go helper, not duplicated logic |
| Ownership check for "pick release image" | API / Backend | Database/Storage | `release_version_media` rows belong to `release_version_id`s; must verify segment assignment server-side, never trust client-supplied `media_asset_id` membership |
| Backfill for existing ready renders | API / Backend (one-off `cmd/` binary) | — | Precedent: `cmd/migrate-covers`; NOT a web endpoint, NOT part of the request/response cycle |
| Public Release-Story rendering | Browser / Client (Next.js SSR page) | API / Backend | `ReleaseGallery.tsx` already receives `PublicReleaseSegment.preview_url`; only the backend-side fallback logic needs to change, the frontend already renders what it's given |

## Standard Stack

No new libraries. Everything required is already a dependency:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ffmpeg`/`ffprobe` CLI (binary path from config) | system binary, path `/usr/bin/ffmpeg` default `[VERIFIED: backend/internal/config/config.go:79]` | Frame extraction (`-ss <offset> -frames:v 1`), duration probing | Already used identically in `media_upload_video.go` and `media_service.go` |
| `github.com/disintegration/imaging` | already in `go.mod` `[VERIFIED: backend/internal/services/media_service.go imports]` | Resize/encode extracted frame to JPEG | Already used by `saveSegmentVideoPreview` and `extractVideoThumbnail` |
| `github.com/jackc/pgx/v5` | already in `go.mod` | New migration columns / queries | Existing driver, no change |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `github.com/gabriel-vasile/mimetype` | already in `go.mod` | MIME detection for manual preview upload | Reuse `MediaService.SaveUpload(models.MediaKindImage, ...)` directly — it already does this |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `media_assets` row per preview image | Storing the frame inline as a `media_files` "thumb" variant of the *video* segment asset (today's pattern for `SaveSegmentAsset`) | Rejected: a video-attached thumb variant is tied to the video asset's lifecycle (deleted when the video is replaced) and cannot independently hold a "manual override wins" state across re-renders (D-08) or be referenced from a Release-Version's own image library (D-11 picker). A dedicated `media_assets` row (kind=`image`) is required so `preview_media_asset_id`/`auto_preview_media_asset_id` can point at it independently of the render/video lifecycle. |
| Two nullable columns on `theme_segments` (chosen per CONTEXT.md discretion) | One column + `preview_source` enum column | CONTEXT.md explicitly prefers two columns because D-08 requires "manual never lost on re-render" AND "reset to automatic without a new render" — a single column would need extra bookkeeping (where does the "previous automatic" value go when manual is set, so reset can restore it?). Two columns make both operations trivial `UPDATE`s. |
| ffprobe call per manual segment-asset upload | Pass duration from request body (client-reported) | Rejected: client-reported duration is untrustworthy and the browser cannot reliably report server-side video duration before upload completes; ffprobe on the server is the existing, trusted pattern (`getVideoMetadata`). |

**Installation:** None — no new Go modules, no new npm packages.

**Version verification:** N/A (no external packages added this phase; see Package Legitimacy Audit below for explicit confirmation of "no new packages").

## Package Legitimacy Audit

**No new external packages are introduced by this phase.** All backend work uses the already-vendored `github.com/disintegration/imaging`, `github.com/gabriel-vasile/mimetype`, `github.com/jackc/pgx/v5` (all present in `backend/go.mod` prior to this phase) and the system `ffmpeg`/`ffprobe` binaries already referenced by existing code. All frontend work uses only the existing `@/components/ui` barrel and `lucide-react` icons already imported elsewhere in the same directory (per UI-SPEC's own icon audit: `Upload`, `ImageIcon`/`Image`, `RefreshCw`). The Package Legitimacy Gate protocol (slopcheck/registry verification) is **not applicable** — skip Step 1–4, no packages to vet.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| *(none — no new dependencies)* | — | — | — | — | — | N/A |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The preview image belongs to the **Kara-Segment** (`theme_segments`), not to the release version and not to `theme_segment_playback_sources`. Stored once per segment, appears on **all** assigned episodes.
- **D-02:** Maintained on the **Segment page** (`SegmentEditPanel` in the Segmente tab of `/admin/episode-versions/[versionId]/edit`). The Release-Media page stays action-free for Kara cards (Phase 171 D-08) except at most one link "Vorschaubild ändern" that leads to the Segment tab.
- **D-03:** **No review check.** A manually set segment preview image is immediately public (`visibility = public`, `review_status = approved`, like existing segment files in `UploadSegmentAsset`). Authorization follows existing segment management (`requireSegmentManage`). UI visibility does not replace a backend check.
- **D-04:** **Automatic: yes.** After a successful segment render (`executeSegmentRender` → `MarkThemeSegmentRenderCacheReady`), the backend extracts a frame from the rendered MP4 (burned-in karaoke subtitles are desired) at **~35% of segment duration** and stores it as the segment's automatic preview image. A later render replaces the old automatic image and cleans up the old file/asset.
- **D-05:** The existing video-upload path (`MediaService.saveSegmentVideoPreview`) also no longer extracts at `-ss 0`, but at ~35%. The result counts as **automatic**.
- **D-06:** A frame-extraction failure must **not** fail the render. It is logged; the segment falls back to the fallback image.
- **D-07:** With multiple renders of the same segment (different release versions/sources), the **most recently successfully completed** render is the source of the automatic image.
- **D-08:** Precedence **manual > automatic > fallback**. A new render **never** overwrites a manual choice.
- **D-09:** The backend delivers a resolved `preview_url` plus `preview_source` (`manual` | `auto` | `fallback`) per segment. Admin segment list (`getAnimeSegments`), Admin-Media-Story (Phase 171), and Public-Release-Detail (`loadReleaseSegments`) use the **same** resolution. The public query no longer depends on `theme_segment_playback_sources.media_asset_id`.
- **D-10:** The fallback image is determined **uniformly server-side** (proposal: the release version's preview image, otherwise a placeholder). Frontend fallback logic is removed: `createKaraStoryItem` (first release image) in `ReleaseVersionMediaSection.helpers.tsx` and `/covers/placeholder.jpg` in `ReleaseGallery.tsx`.
- **D-11:** New "Vorschaubild" section in the Segment panel with: current image + origin badge "Manuell"/"Automatisch"/"Standardbild"; **upload image** (dropzone + file picker, images only); **choose from release images**: picker with public, approved images of the release versions this segment is assigned to, attach without file copy, ownership checked server-side; **use automatic image** (only visible when a manual choice exists).
- **D-12:** Errors immediately visible in UI, success via toast. Only `@/components/ui` primitives and global design tokens. German UI text with correct umlauts.
- **D-13:** **Backfill:** for existing segments with a completed render, generate an automatic preview image once (idempotent script/command or worker run), so e.g. Release 27 (segments 7, 8, 9) get images immediately.

### Claude's Discretion

- Data model: two columns (`preview_media_asset_id` manual, `auto_preview_media_asset_id` automatic) **or** one column plus `preview_source`. Criterion is D-08: a manual choice must never be lost on render, and "use automatic image" must work without a new render. Two columns are preferred.
- Image size/format limits and thumb variants analogous to the existing release-media image upload.
- Storage location of auto-frames (media storage with `media_assets`/`media_files`, not the render-cache directory, so `/media` delivery and cleanup stay uniform).

### Deferred Ideas (OUT OF SCOPE)
- Frame selection via time slider ("image at mm:ss") instead of fixed 35%.
- Multiple preview images/gallery per Kara.
</user_constraints>

<phase_requirements>
## Phase Requirements

No formal requirement IDs are mapped for this phase in `.planning/REQUIREMENTS.md` (roadmap TBD). The CONTEXT.md decisions D-01 through D-13 function as the binding requirement set; the Acceptance section of CONTEXT.md (lines 93-104) is the test checklist the planner should map Wave/task verification against:

| Decision | Research Support |
|----------|------------------|
| D-04/D-05/D-06/D-07 (auto-generation) | `executeSegmentRender` hook point identified (section "Backend Hook: executeSegmentRender" below); `saveSegmentVideoPreview` duration gap identified and ffprobe pattern provided |
| D-08/D-09 (precedence + unified resolution) | Exact SQL shape for 3 call sites provided (ListAnimeSegments/GetAnimeSegmentByID, loadReleaseSegments) |
| D-01/D-02/D-03 (ownership, location, no review) | Migration 0177 schema proposal; `requireSegmentManage`/visibility="public"/review_status="approved" pattern confirmed identical to `UploadSegmentAsset` |
| D-10 (frontend fallback removal) | Exact line/file for `createKaraStoryItem` and `renderKara`'s `/covers/placeholder.jpg` identified |
| D-11/D-12 (UI) | UI-SPEC.md already approved; file list and interaction contract cross-checked against current component sizes (headroom computed below) |
| D-13 (backfill) | `cmd/migrate-covers` precedent identified as template |
</phase_requirements>

## Architecture Patterns

### System Architecture Diagram

```
                         ┌───────────────────────────────────────────┐
                         │         Render Worker (background)         │
                         │  executeSegmentRender()                    │
                         │   1. ffmpeg renders segment clip            │
                         │   2. MarkThemeSegmentRenderCacheReady()     │
                         │   3. [NEW] extract frame @ 35% duration     │
                         │   4. [NEW] create media_asset (kind=image)  │
                         │   5. [NEW] UPDATE theme_segments            │
                         │      SET auto_preview_media_asset_id=...    │
                         │      (log-only on failure, D-06)            │
                         └───────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│  Admin: Segment panel     │   │   theme_segments                  │
│  (SegmentPreviewImage-    │──▶│   + preview_media_asset_id (manual)│
│   Section.tsx)            │   │   + auto_preview_media_asset_id    │
│  - Upload (→ MediaService │◀──│   (migration 0177)                 │
│    .SaveUpload Image)     │   └──────────────────────────────────┘
│  - Pick release image     │                  │
│  - Reset to automatic     │                  │ resolved via shared
└──────────────────────────┘                  │ SQL/Go helper:
                                                │ COALESCE(manual, auto, fallback)
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
     ┌───────────────────┐        ┌───────────────────────┐      ┌─────────────────────┐
     │ ListAnimeSegments  │        │ GetAnimeSegmentByID    │      │ loadReleaseSegments  │
     │ (Admin list)        │        │ (Admin single/panel)  │      │ (Public release page)│
     │ → preview_url/      │        │ → preview_url/         │      │ → preview_url only    │
     │   preview_source    │        │   preview_source       │      │   (no source exposed) │
     └───────────────────┘        └───────────────────────┘      └─────────────────────┘
                 │                              │                              │
                 ▼                              ▼                              ▼
     Admin-Media-Story card          Segment panel badge              ReleaseGallery.tsx
     (ReleaseVersionMediaSection)    (Manuell/Automatisch/Standard)   renderKara() — no fallback
```

### Recommended Project Structure (new/changed files only)

```
backend/
├── internal/
│   ├── handlers/
│   │   └── admin_content_anime_theme_segments_preview.go   # NEW — 4 handlers, see below
│   ├── services/
│   │   └── media_service.go                                 # CHANGED — saveSegmentVideoPreview offset + ffprobe
│   ├── repository/
│   │   ├── admin_content_anime_themes.go                     # CHANGED — preview_url/preview_source in hydration
│   │   ├── release_detail_public_repository_helpers.go       # CHANGED — loadReleaseSegments query swap
│   │   └── theme_segment_preview.go                           # NEW — shared resolution SQL fragment + write methods
│   └── handlers/segment_render_worker.go                      # CHANGED — post-ready frame extraction hook
├── cmd/
│   └── migrate-preview-backfill/main.go                       # NEW — D-13 one-off backfill (mirrors migrate-covers)
database/migrations/
├── 0177_theme_segment_preview_images.up.sql                    # NEW
└── 0177_theme_segment_preview_images.down.sql                  # NEW
frontend/src/app/admin/episode-versions/[versionId]/edit/
├── SegmentPreviewImageSection.tsx                              # NEW (per UI-SPEC)
├── SegmentPreviewImagePicker.tsx                               # NEW (per UI-SPEC)
├── useSegmentPreviewImageHandlers.ts                           # NEW (per UI-SPEC)
├── SegmentPreviewImageSection.module.css                       # NEW (per UI-SPEC)
├── SegmentEditPanel.tsx                                        # CHANGED — render new section
├── ReleaseVersionMediaSection.tsx                               # CHANGED — "Vorschaubild ändern" link
├── ReleaseVersionMediaSection.helpers.tsx                       # CHANGED — simplify createKaraStoryItem
frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/
└── ReleaseGallery.tsx                                           # CHANGED — remove placeholder fallback
frontend/src/lib/api.ts                                          # CHANGED — 4 new functions
frontend/src/types/admin.ts                                      # CHANGED — preview_url/preview_source on AdminThemeSegment
```

### Pattern 1: Shared preview resolution (don't duplicate the COALESCE logic 3 times)

**What:** A single SQL fragment (or a small Go helper building the fragment) that resolves `preview_url`/`preview_source` from `theme_segments.preview_media_asset_id` / `auto_preview_media_asset_id` / a server-side fallback, used identically by `ListAnimeSegments`, `GetAnimeSegmentByID` (via `loadSegmentByID`), and `loadReleaseSegments`.

**When to use:** Any of the 3 read paths that must return the segment's resolved preview, per D-09.

**Example (proposed SQL fragment, to be verified against actual column/table names during planning):**
```sql
-- Source: derived from existing patterns in
-- backend/internal/repository/release_detail_public_repository_helpers.go:140 (preview_file.path join)
-- and backend/internal/repository/release_detail_public_repository_helpers.go:116 (visibility/review gate)
LEFT JOIN media_assets manual_preview
  ON manual_preview.id = ts.preview_media_asset_id AND manual_preview.status = 'ready'
LEFT JOIN media_files manual_preview_file
  ON manual_preview_file.media_id = manual_preview.id
 AND (manual_preview_file.variant = 'original' OR manual_preview_file.variant IS NULL)
LEFT JOIN media_assets auto_preview
  ON auto_preview.id = ts.auto_preview_media_asset_id AND auto_preview.status = 'ready'
LEFT JOIN media_files auto_preview_file
  ON auto_preview_file.media_id = auto_preview.id
 AND (auto_preview_file.variant = 'original' OR auto_preview_file.variant IS NULL)
-- fallback candidate: release version's own preview image (proposal, D-10) — resolved per
-- release_version_id in the CALLER's loop (admin: currentReleaseVersionID; public: releaseVersionID
-- already in scope), NOT inside this shared fragment, because "which release version" differs per
-- call site while the manual/auto precedence does not.
```
Then in Go: `previewPath, previewSource := manualPath, "manual"`; if nil, `autoPath, "auto"`; if nil, resolve the per-call-site fallback and `"fallback"`.

**Why a Go helper instead of a single giant SQL CASE:** The fallback source differs per call site (admin context may not always have a "current release version" the same way the public page does), so the manual/auto half is shareable SQL, the fallback half is call-site-specific Go logic — mirroring how `publicMediaURLForPath` (`release_detail_public_repository_helpers.go`) already centralizes URL-building while callers decide what path to pass in.

### Pattern 2: Auto-frame extraction at a known fractional offset (reuse `extractVideoThumbnail`'s shape)

**What:** `ffmpeg -i <path> -ss <offset> -frames:v 1 -f image2 -y <tmp.png>` then `imaging.Resize`/`imaging.Save`.

**When to use:** Both D-04 (post-render) and D-05 (post-upload).

**Example (existing code to generalize, NOT to duplicate verbatim):**
```go
// Source: backend/internal/handlers/media_upload_video.go:153 (extractVideoThumbnail)
cmd := exec.Command(
    h.ffmpegPath,
    "-i", videoPath,
    "-ss", fmt.Sprintf("%.2f", timeSeconds),
    "-frames:v", "1",
    "-f", "image2",
    "-y",
    tempPNG,
)
```
For D-04 (`executeSegmentRender`), `durationSeconds` is already computed locally (`durationSeconds := *source.EndOffsetSeconds - *source.StartOffsetSeconds`, `segment_render_worker.go:178`) — the offset is simply `float64(durationSeconds) * 0.35` applied to `outputPath` (the just-rendered file), AFTER `MarkThemeSegmentRenderCacheReady` succeeds (so a frame-extraction failure per D-06 cannot affect the render's own success/failure signal).

For D-05 (`saveSegmentVideoPreview` in `media_service.go:351`), duration is NOT currently known — add an ffprobe call identical in shape to `media_upload_video.go:181` (`getVideoMetadata`) before computing the offset. `MediaService` does not currently have `ffprobePath` wired separately; either derive it the same way (`strings.Replace(s.ffmpegPath, "ffmpeg", "ffprobe", 1)`) or thread `SegmentRenderFFprobePath` through `NewMediaService`'s constructor (config already has this value: `backend/internal/config/config.go:128`).

### Anti-Patterns to Avoid
- **Storing the auto-frame as a `media_files` "thumb" variant of the video segment asset:** breaks D-08 (manual survives re-render) because the thumb variant's lifecycle is tied to the video asset, which gets replaced/cleaned up on every re-render (`cleanupSegmentAssetRef` deletes old assets). Use a dedicated, independent `media_assets` row instead (see Alternatives Considered).
- **Resolving preview_url in 3 different ad-hoc SQL queries written independently:** D-09 explicitly requires identical resolution; divergent queries are the single most likely source of "admin shows X, public shows Y" bugs in this phase. Centralize in one Go helper/SQL fragment (Pattern 1).
- **Trusting a client-supplied `media_asset_id` in the "attach release image" endpoint without re-verifying release-version assignment server-side:** `AttachSegmentLibraryAsset` already demonstrates the correct shape (verify via `ListThemeSegmentAssignments`/theme ownership before any write) — the new endpoint must do the equivalent check against `release_version_media.release_version_id IN (assigned ids)` AND the public/approved/ready gate, returning 404 (per Acceptance list) for anything else, never trusting the ID blindly.
- **Failing the render on frame-extraction error:** explicitly forbidden by D-06. The call must happen strictly after `MarkThemeSegmentRenderCacheReady` returns successfully, and any error from the extraction/asset-creation step must only be `log.Printf`'d, never returned as the render's error.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image upload validation (size/MIME) | A new per-feature size/MIME check | `MediaService.SaveUpload(models.MediaKindImage, originalName, data)` | Already validates exactly PNG/JPG/WEBP/GIF at 15 MB (`media_service.go:100-119`), matches UI-SPEC's independently-derived limit; reusing it keeps the two in lockstep automatically if limits change later |
| Video duration probing | A custom ffprobe wrapper | Mirror `MediaUploadHandler.getVideoMetadata` (`media_upload_video.go:181`) | Already battle-tested parsing of ffprobe's `default=noprint_wrappers=1:nokey=1` output format |
| "Is this media asset public and approved" gate | A new ad-hoc visibility check | The exact join already used in `countImagesByCategory` (`release_detail_public_repository_helpers.go:116`): `v.name='public' AND rs.code='approved' AND ma.status='ready'` | This is the canonical, already-audited public-visibility gate for `media_assets` in this codebase; a second, slightly different version is a guaranteed future inconsistency |
| One-off backfill runner | A new ad-hoc script pattern, a migration with embedded business logic, or an HTTP-triggered "run once" endpoint | A new `cmd/` binary mirroring `cmd/migrate-covers/main.go`'s shape (env-var config, `DRY_RUN`, `SKIP_EXISTING`, its own `pgxpool` connection, structured stats struct) | This is the established, already-reviewed pattern in this repo for exactly this kind of one-time backfill; it keeps backfill logic out of both migrations (which should stay schema-only per this repo's convention, see migration 0171/0172/0176 comments) and out of request-handling code |

**Key insight:** Every piece of this phase — frame extraction at an offset, duration probing, image upload validation, public-visibility gating, and one-off backfills — already has a working, reviewed precedent elsewhere in this codebase. The main risk is not "how do we build X" but "did we reuse the existing X instead of writing a slightly different one."

## Common Pitfalls

### Pitfall 1: Adding to `adminThemeRepository` touches multiple stub implementations
**What goes wrong:** New read methods (e.g., a method to fetch assigned release versions' images) added to the `adminThemeRepository` interface (`admin_content_handler.go:52`) require every Go stub that implements this full interface to add the new method, or the test package fails to compile.
**Why it happens:** Go interfaces require all implementing types to satisfy the full method set; this repo has at least 2 test-only fakes that implement the complete `adminThemeRepository` interface (`releaseThemeAssetRepoStub` in `admin_content_release_theme_assets_test.go`, another in `admin_content_fansub_releases_test.go`).
**How to avoid:** Prefer adding the narrower `segmentStreamThemeRepository` interface (`segment_stream.go:24`, only 8 methods, used for the render-worker hook) for the auto-frame-extraction write path if possible — it has fewer/no full-interface test fakes to update (verify at plan time: `grep -rln "segmentStreamThemeRepository" backend/internal/handlers/*_test.go`). For the new admin endpoints (upload/picker/attach/reset), adding to `adminThemeRepository` is unavoidable (same pattern as `BindUploadedSegmentAsset`/`AttachSegmentLibraryAsset` already there) — budget time to update both stub files.
**Warning signs:** `go build ./...` or `go vet ./...` failing with "does not implement adminThemeRepository (missing method ...)" after adding a new interface method.

### Pitfall 2: `executeSegmentRender`'s `ctx` is `context.Background()`-derived, not request-scoped
**What goes wrong:** If the new post-render frame-extraction code accidentally uses a request-scoped context or assumes an HTTP request is in flight, it will behave incorrectly or panic, since this code runs in the background worker goroutine (`StartSegmentRenderWorker`), not inside a Gin handler.
**Why it happens:** Most other code in this phase (upload handlers, picker, attach, reset) IS request-scoped; only the D-04 auto-extraction hook is not. Easy to copy a request-scoped pattern (e.g., `c.Request.Context()`) by habit.
**How to avoid:** The new auto-extraction call inside `executeSegmentRender` must use the same `ctx` parameter already passed into that function (derived from `context.Background()`, see comment at `segment_render_worker.go:118-119`), consistent with every other DB/file call already inside that function.
**Warning signs:** Code review: any `c.Request.Context()` appearing inside `executeSegmentRender` or anything it calls.

### Pitfall 3: Re-render race on `auto_preview_media_asset_id` vs. D-07 "most recently completed render wins"
**What goes wrong:** Because a shared Kara-Segment can have renders queued/completing for multiple release versions concurrently (though the worker itself processes one job at a time — `StartSegmentRenderWorker` explicitly has concurrency 1, see comment "das eliminiert jede Moeglichkeit paralleler Renders" at `segment_render_worker.go:44`), a slower earlier-started render could still finish and overwrite a newer render's auto-preview if the UPDATE isn't ordered correctly.
**Why it happens:** Worker concurrency is 1 and jobs are claimed oldest-queued-first (`ClaimNextQueuedThemeSegmentRender`), so in practice completion order == processing order (no actual race today) — but D-07 explicitly calls out "most recently successfully **completed**" as the rule, which is a stronger guarantee than "most recently processed by the single worker." If this worker's concurrency model ever changes (e.g., future parallelization), a naive `UPDATE theme_segments SET auto_preview_media_asset_id = $1 WHERE id = $2` (unconditional) would violate D-07.
**How to avoid:** Write the UPDATE conditioned on `completed_at`/timestamp comparison (e.g., only update if no row exists yet, or compare against the render-cache's own `completed_at`) rather than an unconditional overwrite, OR explicitly document in the plan that this is safe today only because of the worker's enforced concurrency-1 invariant, with a regression test that would fail if that invariant is ever violated.
**Warning signs:** Flaky test or live behavior where an older/different release version's frame "wins" over a just-completed render's frame.

### Pitfall 4: `theme_segments.id` is referenced by `theme_segment_render_cache.theme_segment_id` without `ON DELETE CASCADE` assumptions
**What goes wrong:** Assuming cleanup of old auto-preview `media_assets` rows is automatic via FK cascade when a segment or render-cache row is deleted.
**Why it happens:** The new `auto_preview_media_asset_id` FK is `theme_segments → media_assets`, with `ON DELETE SET NULL` (recommended) meaning deleting the `media_assets` row nulls the segment's pointer, but deleting the **segment** does NOT delete the `media_assets` row (RESTRICT/default behavior unless explicitly cascaded) — this mirrors `release_version_media.media_asset_id ... ON DELETE RESTRICT` (migration 0059) deliberately, since `media_assets` rows can be referenced by more than one place.
**How to avoid:** Explicit cleanup code (mirroring `cleanupSegmentAssetRef` in `admin_content_anime_theme_segments.go:87`) must run whenever an auto-preview is replaced by a newer render (D-04's "räumt die alte Datei bzw. das alte Asset auf") or when a segment is deleted — don't rely on cascade.
**Warning signs:** Orphaned image files accumulating in storage after repeated re-renders of the same segment.

### Pitfall 5: `GetThemeSegmentRenderSource` requires `release_version_id` — the auto-extraction hook has it, but segment-level writes don't
**What goes wrong:** The new `auto_preview_media_asset_id` write is segment-scoped (D-01: "once per segment"), but `executeSegmentRender`'s `cache` parameter carries a `release_version_id`-scoped render job. If the write path accidentally requires/validates a release-version context that doesn't apply to the segment-level column, it will either break for segments with `release_version_id = NULL`-style "none" jobs or add unnecessary coupling.
**Why it happens:** Most of the surrounding render-cache code is deliberately release-version-scoped (see extensive comments throughout `theme_segment_render_cache.go` about "Phase 117 D-03... release_version_id-scoped").
**How to avoid:** The new write (`UPDATE theme_segments SET auto_preview_media_asset_id = ... WHERE id = $segmentID`) must be scoped ONLY by `theme_segment_id`, deliberately ignoring `release_version_id` — consistent with D-01/D-07 ("the segment's one auto-preview, from whichever render most recently completed, regardless of which release version triggered it").
**Warning signs:** A plan task that threads `release_version_id` into the new `theme_segments` columns or their write path — that would be a design regression against D-01.

## Code Examples

### Existing frame extraction + resize pattern to generalize (D-04/D-05)
```go
// Source: backend/internal/services/media_service.go:351-382 (saveSegmentVideoPreview, CURRENT -ss 0)
func (s *MediaService) saveSegmentVideoPreview(videoPath string) (*MediaVariantSaveResult, error) {
	previewPath := videoPath + ".preview.jpg"
	tempPNG := previewPath + ".tmp.png"
	defer os.Remove(tempPNG)

	cmd := exec.Command(s.ffmpegPath, "-i", videoPath, "-ss", "0", "-frames:v", "1", "-f", "image2", "-y", tempPNG)
	// ... imaging.Open / imaging.Resize(480,0) / imaging.Save(JPEGQuality(86))
}
```

### Existing duration-probing pattern to reuse (needed for D-05, NOT needed for D-04)
```go
// Source: backend/internal/handlers/media_upload_video.go:181-205 (getVideoMetadata)
func (h *MediaUploadHandler) getVideoMetadata(videoPath string) (width, height int, duration float64, err error) {
	ffprobePath := strings.Replace(h.ffmpegPath, "ffmpeg", "ffprobe", 1)
	cmd := exec.Command(
		ffprobePath,
		"-v", "error",
		"-select_streams", "v:0",
		"-show_entries", "stream=width,height,duration",
		"-of", "default=noprint_wrappers=1:nokey=1",
		videoPath,
	)
	// ...parses 3 lines: width, height, duration
}
```

### Existing render-worker duration already computed (D-04 reuses this directly, no ffprobe needed)
```go
// Source: backend/internal/handlers/segment_render_worker.go:178, inside executeSegmentRender,
// BEFORE the call to MarkThemeSegmentRenderCacheReady (line 208)
durationSeconds := *source.EndOffsetSeconds - *source.StartOffsetSeconds
// ... ffmpeg render runs, writes outputPath ...
// [EXISTING] themeRepo.MarkThemeSegmentRenderCacheReady(ctx, ...)
// [NEW, AFTER the above succeeds] offsetSeconds := float64(durationSeconds) * 0.35
//                                  extract frame from outputPath at offsetSeconds
```

### Existing public-visibility gate to reuse for the "pick release image" picker endpoint
```sql
-- Source: backend/internal/repository/release_detail_public_repository_helpers.go:116
-- (countImagesByCategory) — the exact gate to replicate for candidate images
SELECT COUNT(*) FILTER(WHERE rvm.category='screenshot'), ...
FROM release_version_media rvm
JOIN media_assets ma ON ma.id=rvm.media_asset_id
JOIN visibilities v ON v.id=ma.visibility_id
JOIN review_statuses rs ON rs.id=ma.review_status_id
WHERE rvm.release_version_id=$1 AND rvm.deleted_at IS NULL
  AND ma.status='ready' AND v.name='public' AND rs.code='approved'
```

### Existing "assigned release versions of a segment" query to reuse for the picker's candidate scope
```go
// Source: backend/internal/repository/theme_segment_assignments.go:406
func (r *AdminContentRepository) ListThemeSegmentAssignments(ctx context.Context, segmentID int64) ([]int64, error)
// Already used in admin_content_anime_theme_segments.go:725 (AttachSegmentLibraryAsset) to fan-out
// render invalidation — the exact same list of release_version_ids is the scope for the picker's
// candidate query: `WHERE rvm.release_version_id = ANY($ids)`.
```

### Current frontend fallback logic to REMOVE (D-10)
```typescript
// Source: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx:144-151
const renderKara = (segment: PublicReleaseSegment) => {
  const previewUrl = segment.preview_url ?? '/covers/placeholder.jpg'  // <-- REMOVE the ?? fallback;
                                                                          //     backend now guarantees non-null (D-10)
  ...
}
```
```typescript
// Source: frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx:83-98
export function createKaraStoryItem(
  segment: AdminThemeSegment,
  mediaItems: ReleaseVersionMediaItem[],
  sortOrder: number,
): ReleaseVersionKaraStoryItem {
  const fallback =
    mediaItems.find((item) => item.is_preview_candidate && item.thumbnail_url) ??
    mediaItems.find((item) => item.thumbnail_url)
  return {
    type: 'kara',
    segment,
    sort_order: sortOrder,
    thumbnail_url: fallback?.thumbnail_url ?? null,   // <-- REPLACE with segment.preview_url
    thumbnail_is_fallback: Boolean(fallback),          // <-- REPLACE with segment.preview_source === 'fallback'
  }
}
// Call sites to update: frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:491,500
// (both currently pass `nextItems` as the mediaItems fallback-source argument — the simplified
// signature should drop that parameter once the backend supplies preview_url directly)
```

### Exact pattern the new handler file should follow (same file this phase splits away from)
```go
// Source: backend/internal/handlers/admin_content_anime_theme_segments.go:744-896 (UploadSegmentAsset)
// New admin_content_anime_theme_segments_preview.go should follow the IDENTICAL shape:
// 1. parse animeID/segmentID from path params
// 2. parseReleaseVariantIDQuery(c) + GetAnimeSegmentByID for permission context
// 3. requireSegmentManage(c, releaseVariantID) gate
// 4. domain-specific body (upload/picker/attach/reset)
// 5. c.JSON(http.StatusOK, gin.H{"data": updated})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Preview resolved via `theme_segment_playback_sources.media_asset_id` → `media_assets` → `media_files` (variant='thumb') | Preview resolved via `theme_segments.preview_media_asset_id`/`auto_preview_media_asset_id` with server-side fallback | This phase (172) | `loadReleaseSegments`'s query at `release_detail_public_repository_helpers.go:140` must drop its `LEFT JOIN theme_segment_playback_sources src ... LEFT JOIN media_assets preview_asset ... LEFT JOIN media_files preview_file` chain entirely and replace it with the new columns' resolution |
| `saveSegmentVideoPreview` always extracts frame 0 (`-ss 0`) | Extracts frame at ~35% of (now-required) duration | This phase (172) | Thumbnails for manually-uploaded segment videos change visually; black/title-card first-frames (a known weakness of `-ss 0`) are fixed as a side effect |
| Frontend computes its own "best guess" fallback image (`createKaraStoryItem`, `/covers/placeholder.jpg`) | Backend is the single source of truth for `preview_url` | This phase (172) | Removes a class of "admin page shows one image, public page shows a different fallback" bugs by construction (D-09's stated goal) |

**Deprecated/outdated:**
- `theme_segment_playback_sources.media_asset_id` as a preview-image source: not removed from the schema (it's still used for actual playback/render source resolution, unrelated to this phase), but its role as an *image preview* source is fully superseded by the new `theme_segments` columns.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | D-10's proposed fallback ("release version's own preview image, else placeholder") is accepted as-is without further user confirmation, since CONTEXT.md phrases it as "Vorschlag" (proposal) but D-10 itself is listed under locked Decisions, not Discretion | Standard Stack / Architecture | If the user actually intended a different fallback source (e.g., a static built-in placeholder image asset, or "no fallback, null is fine"), the planner would need to adjust `preview_source: 'fallback'` resolution logic; low risk since D-10's own wording frames this as the expected default and no counter-signal was given |
| A2 | The "release version's own preview image" fallback (A1) refers to whatever mechanism already determines a release version's single representative/preview image elsewhere in the codebase (not independently verified in this research pass — not located under this name) | Pattern 1 / Architecture | If no such single "release version preview image" concept currently exists as a queryable field, the planner must either (a) define one minimally for this phase (e.g., first `is_preview_candidate=true` public/approved image) or (b) fall straight to a static placeholder asset; this is a planning-time decision point, not a blocker, since a reasonable minimal implementation (first preview-candidate image) is directly derivable from the existing `release_version_media.is_preview_candidate` column already seen in `release_version_media_repository.go` |
| A3 | `media_assets.status` defaulting to `'ready'` (migration 0059) means the new synchronous preview-image creation path does not need to explicitly set `status` | Standard Stack | Low risk — directly verified in migration SQL (`ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ready'`), not actually an assumption; listed here only because it determines whether the new handler needs an explicit status-setting step (it does not) |

**If this table is empty:** N/A — two low-risk assumptions logged above (A1/A2), both about the D-10 fallback image source, which CONTEXT.md itself flags as a "Vorschlag" (proposal) rather than a fully pinned specification.

## Open Questions

1. **Exact source of the D-10 fallback image ("release version's own preview image")** (RESOLVED — Plan 172-01 Task 2 defined `resolveThemeSegmentPreviewAsset`'s fallback query directly, reusing the existing `is_preview_candidate` correlation query from `group_repository_cursor.go:135-150`.)
   - What we know: `release_version_media.is_preview_candidate` (boolean, migration 0059) marks images eligible to represent a release version; `countImagesByCategory`-style gating (public/approved/ready) is the established visibility filter.
   - What's unclear: whether there is already a single canonical "THE preview image of release version X" resolved field somewhere the planner should call, versus needing to define "first public/approved `is_preview_candidate=true` image, ordered by `sort_order`" fresh for this phase.
   - Recommendation: the planner should grep for existing usage of `is_preview_candidate` in resolution queries (beyond `createKaraStoryItem`'s own ad-hoc fallback, which this phase removes) before deciding; if none exists, defining it minimally in the new shared resolution helper (Pattern 1) is low-risk and self-contained.

2. **Whether `adminThemeRepository` or `segmentStreamThemeRepository` is the right interface for the auto-preview write** (RESOLVED — Plan 172-03 Task 1 implemented exactly the recommended split: `SetThemeSegmentAutoPreview` on `segmentStreamThemeRepository`, the four manual write methods on `adminThemeRepository`.)
   - What we know: `executeSegmentRender` type-asserts `h.themeRepo.(segmentStreamThemeRepository)` (narrower, 8 methods) for all its render-cache writes; the admin upload/picker/attach/reset endpoints use the full `adminThemeRepository` (broader, ~40 methods, 2 test-fakes implement it in full).
   - What's unclear: whether the segment-level `auto_preview_media_asset_id` write belongs on the narrow interface (cleaner, fewer stub updates, but slightly odd since it's not really a "render cache" field) or the broad one (consistent with other segment-field writes, but touches more test fakes).
   - Recommendation: add the auto-preview write method to `segmentStreamThemeRepository` (narrower blast radius, and `executeSegmentRender` already has the right receiver type there) while adding the manual-upload/picker/attach/reset methods to `adminThemeRepository` (consistent with `BindUploadedSegmentAsset`/`AttachSegmentLibraryAsset`'s existing home) — i.e., split by which code path calls them, not by trying to force everything onto one interface.

3. **Picker candidate label format ("Version {label}" per UI-SPEC)** (RESOLVED — Plan 172-03 Task 1 implemented `ReleaseVersionLabel = fmt.Sprintf("Folge %s (%s)", episodeNumber, version)` per the recommendation.)
   - What we know: `release_versions` has a `.version` text field (e.g., "v1"); episode number is reachable via `release_versions → fansub_releases → episodes.episode_number` (same join pattern as `applyAppliesThroughEpisode`, `release_detail_public_repository_helpers.go:197-207`).
   - What's unclear: UI-SPEC's exact intended `{label}` content (just the version string? "Folge N"? both?) — UI-SPEC only shows the template, not a worked example.
   - Recommendation: planner should specify `{label}` as `"Folge {episode_number} ({version})"` (consistent with other per-episode admin labels like `findAssignedEpisodeNumber`'s "Folge {N}" usage in `SegmentEditPanel.tsx:328`) unless a UAT reviewer requests otherwise — low risk either way since this is copy-only and trivially adjustable.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `ffmpeg` binary | D-04/D-05 frame extraction | ✓ (assumed, same binary already required by existing render/upload pipeline) `[ASSUMED — not re-probed this session; config default path `/usr/bin/ffmpeg` already load-bearing for existing, currently-working render feature]` | — | None needed — if missing, the existing render/upload features are already broken, this is not a new dependency |
| `ffprobe` binary | D-05 duration probe | ✓ (same binary family as ffmpeg, already used by `media_upload_video.go`) `[ASSUMED, same basis as above]` | — | None needed |
| PostgreSQL (migration target) | Migration 0177 | ✓ `[VERIFIED: docker compose ps pattern implied by CLAUDE.md canonical environment section]` | 16 (per CLAUDE.md stack doc) | — |

No missing dependencies — this phase is additive on top of an already-functioning render/upload pipeline. Skip condition does not apply (external dependencies exist), but all are already satisfied by the feature this phase extends.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Go `testing` + `testify` (backend, `github.com/stretchr/testify` in `go.mod`); Vitest 3 (frontend, per CLAUDE.md stack doc) |
| Config file | none centrally required for Go (`go test ./...`); `frontend/vitest.config.ts` for frontend |
| Quick run command | `cd backend && go test ./internal/handlers/... ./internal/services/... ./internal/repository/... -run TestSegmentPreview` (once new tests are named with this prefix) |
| Full suite command | `cd backend && go test ./...` and `cd frontend && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-04/D-06 | Render success still produces auto-preview; extraction failure does not fail render | unit (handler, httptest-free since this is a worker function, not an HTTP handler — call `executeSegmentRender` directly with a fake `segmentStreamThemeRepository`) | `go test ./internal/handlers/... -run TestExecuteSegmentRender_AutoPreview` | ❌ Wave 0 |
| D-05 | Upload path extracts at ~35%, not 0% | unit (`MediaService.saveSegmentVideoPreview`, fixture video with known duration) | `go test ./internal/services/... -run TestSaveSegmentVideoPreview_Offset` | ❌ Wave 0 |
| D-03 | Manual preview immediately public (no review) | unit/integration (handler via `httptest`, fake repo, assert response + DB state `visibility=public, review_status=approved`) | `go test ./internal/handlers/... -run TestUploadSegmentPreviewImage_NoReview` | ❌ Wave 0 |
| D-08 | New render never overwrites manual choice | unit (`executeSegmentRender` with pre-set `preview_media_asset_id`, assert unchanged after render) | `go test ./internal/handlers/... -run TestExecuteSegmentRender_PreservesManualPreview` | ❌ Wave 0 |
| D-09 | Admin list, admin single, public detail return identical `preview_url` for same segment | integration (repository-level, seed segment+assets, call all 3 read paths, assert equal URLs) | `go test ./internal/repository/... -run TestPreviewURL_ConsistentAcrossReadPaths` | ❌ Wave 0 |
| D-11 (picker ownership) | Picker rejects images from non-assigned release versions (404/403) | unit (handler via `httptest`, fake repo) | `go test ./internal/handlers/... -run TestAttachSegmentPreviewImage_OwnershipGate` | ❌ Wave 0 |
| Permission gate | No segment-manage right → 403, no upload UI | unit (handler) + frontend component test (upload button absent/disabled without permission context) | `go test ./internal/handlers/... -run TestSegmentPreviewImage_RequireSegmentManage` | ❌ Wave 0 |
| D-13 | Backfill is idempotent (running twice produces no duplicate assets) | unit/integration for the new `cmd/migrate-preview-backfill` logic (extract testable core into a package function, not only `main()`) | `go test ./cmd/migrate-preview-backfill/... -run TestBackfill_Idempotent` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted `go test ./internal/handlers/... ./internal/services/... -run TestSegment` (or equivalent focused Vitest run for frontend tasks)
- **Per wave merge:** `go test ./...` (backend) + `npm test` (frontend)
- **Phase gate:** Full suite green before `/gsd:verify-work`, plus live UAT on Release 27 (Desktop + Mobile) per CONTEXT.md Acceptance section

### Wave 0 Gaps
- [ ] No existing test file covers `executeSegmentRender`'s success path at all currently (verify at plan time: `grep -rl "executeSegmentRender" backend/internal/handlers/*_test.go`) — if absent, Wave 0 needs to establish the fake `segmentStreamThemeRepository` test harness before D-04/D-06/D-08 tests can be written
- [ ] No existing test file covers `saveSegmentVideoPreview` — Wave 0 needs a fixture video file (or an ffmpeg-free synthetic test using a stub `ffmpegPath` that writes a known-size dummy frame) for D-05
- [ ] New handler file (`admin_content_anime_theme_segments_preview.go`) needs its own `_test.go` from scratch, following the exact httptest + fake-repo pattern already used by `admin_content_release_theme_assets_test.go`/`admin_content_fansub_releases_test.go`
- [ ] `cmd/migrate-preview-backfill` needs its core logic extracted into a testable package (not left entirely inside `main()`), mirroring the gap already visible in `cmd/migrate-covers/main.go` (391 lines, all in `main` + package-level helpers, no separate `_test.go` observed in this research pass — verify at plan time)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (new) | Existing session-cookie/Gin auth middleware unchanged; new endpoints sit behind the same `auth` middleware already applied to all `/admin/anime/:id/segments/...` routes (`admin_routes.go:148-168`) |
| V3 Session Management | No (new) | Unchanged |
| V4 Access Control | Yes | `requireSegmentManage(c, releaseVariantID)` — MUST gate all 4 new endpoints (upload/picker-list/attach/reset), exactly as it already gates `UploadSegmentAsset`/`DeleteSegmentAsset`/`AttachSegmentLibraryAsset` |
| V5 Input Validation | Yes | `MediaService.SaveUpload(models.MediaKindImage, ...)` for manual upload (reuse, don't hand-roll); server-side re-verification of `media_asset_id` ownership for the "attach release image" endpoint (never trust client-supplied ID membership — same principle as `AttachSegmentLibraryAsset`'s `ErrConflict` check) |
| V6 Cryptography | No | Not applicable — no new secrets/crypto surface |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR via "attach release image" endpoint accepting an arbitrary `media_asset_id` not actually belonging to an assigned release version | Tampering / Elevation of Privilege | Server-side re-verification: `media_asset_id` must appear in `release_version_media` for a `release_version_id` returned by `ListThemeSegmentAssignments(segmentID)`, AND pass the public/approved/ready gate — return 404 otherwise (per Acceptance: "Fremde → 404/403") |
| Path traversal / arbitrary file write via extracted-frame storage path | Tampering | Reuse existing `sanitizeSegmentPathComponent`/`buildFilename` helpers (`media_service.go`) rather than constructing paths from segment-controlled strings directly |
| Missing permission check on new endpoints (copy-paste omission) | Elevation of Privilege | Every new handler MUST call `requireSegmentManage` before any mutation — Acceptance explicitly requires a 403 test ("Ohne Segment-Recht → 403, keine Upload-UI") |
| Render-worker auto-extraction silently failing and leaving no auditable trail | Repudiation | `log.Printf` on extraction failure (per D-06) is sufficient per CONTEXT.md's stated Observability constraint ("operational errors must be visible immediately... without requiring durable error retention") — no additional audit-log requirement identified for this specific failure mode |

## Sources

### Primary (HIGH confidence — direct codebase reads this session)
- `backend/internal/handlers/segment_render_worker.go` — full read, `executeSegmentRender` hook point and `durationSeconds` computation confirmed
- `backend/internal/services/media_service.go` — full read, `saveSegmentVideoPreview`, `SaveSegmentAsset`, `SaveUpload` (MediaKindImage validation) confirmed
- `backend/internal/services/segment_render_service.go` — full read, `BuildFFmpegSegmentArgs` confirmed, no duration-fraction logic currently present
- `backend/internal/repository/theme_segment_render_cache.go` — full read, `MarkThemeSegmentRenderCacheReady`/`MarkThemeSegmentRenderCacheFailed` signatures confirmed
- `backend/internal/handlers/admin_content_anime_theme_segments.go` — full read (955 lines confirmed), `UploadSegmentAsset`/`DeleteSegmentAsset`/`requireSegmentManage`/`AttachSegmentLibraryAsset` patterns confirmed
- `backend/internal/repository/admin_content_anime_themes.go` — partial read (`ListAnimeSegments`, `GetAnimeSegmentByID`, hydration helpers, `CreateAnimeSegment`) — 2468 lines total confirmed
- `backend/internal/repository/release_detail_public_repository_helpers.go` — full read, `loadReleaseSegments` exact current query confirmed, `countImagesByCategory` visibility gate confirmed
- `backend/internal/repository/release_detail_public_repository.go` — `PublicReleaseSegment` struct (grep) confirmed `PreviewURL` field already exists
- `backend/internal/handlers/media_upload_video.go` — `extractVideoThumbnail`/`getVideoMetadata` full read, exact ffprobe pattern confirmed
- `backend/internal/handlers/admin_content_handler.go` — `adminThemeRepository` interface (grep, partial) and struct fields (`mediaService`, `mediaRepo`, `segmentRenderDir`, etc.) confirmed
- `backend/internal/handlers/segment_stream.go` — `segmentStreamThemeRepository` interface (narrower, 8 methods) confirmed
- `backend/internal/models/media.go` — `MediaKind` enum, `MediaAssetCreateInput` struct confirmed
- `database/migrations/0024_recreate_media_assets.up.sql`, `0059_release_version_media_schema.up.sql`, `0097_v12_status_foundation.up.sql`, `0171_fansub_group_kuerzel.{up,down}.sql`, `0172_release_version_media_highlights.up.sql` — schema/status-default/migration-style confirmed
- `database/migrations/` directory listing — confirmed 0177 is the next free migration number (highest existing: 0176)
- `backend/internal/repository/release_version_media_repository.go` — `ListReleaseVersionMedia` partial read, exact media_files original/thumb join pattern confirmed
- `backend/cmd/migrate-covers/main.go` — partial read (head + line count), confirmed as the standalone one-off backfill precedent
- `backend/internal/repository/theme_segment_assignments.go` — `ListThemeSegmentAssignments` signature confirmed (grep)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx` — full read (402 lines confirmed)
- `frontend/src/app/admin/episode-versions/[versionId]/edit/useSegmentAssetHandlers.ts` — full read, exact hook pattern to replicate
- `frontend/src/components/admin/MediaUploadCore.tsx` — full read, confirmed as the dropzone/hidden-input pattern UI-SPEC references
- `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.helpers.tsx` — `createKaraStoryItem` exact current implementation confirmed
- `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.tsx` — `renderKara` exact current implementation confirmed, including the exact placeholder fallback line
- `frontend/src/types/admin.ts`, `frontend/src/types/releaseDetail.ts` — `AdminThemeSegment`/`PublicReleaseSegment` TypeScript mirrors confirmed
- `frontend/src/lib/api.ts` — `uploadSegmentAsset`/`getSegmentLibraryCandidates`/`attachSegmentLibraryAsset`/`deleteSegmentAsset` exact current implementations confirmed as the pattern for 4 new functions
- `.planning/phases/172-.../172-CONTEXT.md`, `172-UI-SPEC.md` — full read, both already approved/locked

### Secondary (MEDIUM confidence)
- None — this research relied exclusively on direct codebase reads; no WebSearch/external documentation was needed since this phase is pure extension of existing in-repo patterns.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all primitives directly read from existing code
- Architecture: HIGH — every proposed file/column/endpoint cross-checked against an existing, structurally identical precedent in this codebase
- Pitfalls: HIGH — all 5 pitfalls derived from direct reads of comments/invariants already documented in the source (e.g., worker concurrency-1 comment, release_version_id-scoping comments, FK `ON DELETE RESTRICT` precedent)
- Security: MEDIUM — ASVS mapping is straightforward (reuses existing `requireSegmentManage`/visibility-gate patterns) but was not independently re-verified against a live threat model this session

**Research date:** 2026-10-01
**Valid until:** 30 days (stable, brownfield codebase; risk is primarily "did another phase touch the same files concurrently" per CONTEXT.md's own warning about Phase 171 touching `ReleaseGallery.tsx`/`ReleaseVersionMediaSection.*` in parallel — re-read current `main` state immediately before planning/executing, not just this research)
