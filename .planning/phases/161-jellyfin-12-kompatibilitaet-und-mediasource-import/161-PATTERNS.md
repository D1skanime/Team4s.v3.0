# Phase 161: Jellyfin 12 compatibility and MediaSource import - Pattern Map

**Mapped:** 2026-09-15
**Files classified:** 44 primary/new/conditional files, plus existing focused tests listed below
**Analogs found:** 44 / 44 by existing seam or role; no correct existing stable-source selector

Scope: planning only, canonical Linux repository `/home/d1sk/team4s`, baseline `b3b07ff0`. Read with `161-RESEARCH.md`, `161-CALLERS.md`, and `161-MEDIASOURCE-RESEARCH.md`. Caller inventory and live API audit are upstream evidence, not repeated here. Proposed names are suggestions, not claims that files exist. `exact` means the existing ownership/data-flow seam fits; it does not endorse the buggy behavior being repaired.

## File Classification

Paths in the analog column are under `backend/internal/` unless otherwise stated. Existing files may require only focused assertions or contract documentation when no runtime shape changes.

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/jellyfin/request.go (proposed)` | utility | request-response/streaming | handlers/jellyfin_client.go:159-247 | role-match |
| `backend/internal/jellyfin/request_test.go (proposed)` | test | request-response | handlers/jellyfin_client_test.go; existing caller tests | role-match |
| `backend/internal/handlers/jellyfin_client.go` | controller/model | request-response/batch | same file:25-73,159-247 | exact |
| `backend/internal/handlers/jellyfin_client_series.go` | controller | request-response | same file:106-142 | exact |
| `backend/internal/handlers/anime_backdrops_client.go` | controller | request-response | jellyfin_client.go:159-247; own decoder/status owner | exact |
| `backend/internal/handlers/anime_backdrops_resolution.go` | controller | request-response | jellyfin_client_series.go:48-103 | exact |
| `backend/internal/handlers/anime_backdrops_probe.go` | controller | request-response | 161-CALLERS.md existing probe owners | exact |
| `backend/internal/handlers/group_assets_jellyfin.go` | controller | request-response/batch | same file:195-244 | exact |
| `backend/internal/handlers/fansub_admin.go` | utility | streaming | existing provider-aware stream/image builders:193+ | exact |
| `backend/internal/handlers/episode_version_stream.go` | controller | streaming | existing StreamRelease; preserve Range/entitlements | exact |
| `backend/internal/handlers/episode_version_media_image.go` | controller | streaming | existing MediaImage proxy | exact |
| `backend/internal/handlers/episode_version_media_video.go` | controller | streaming | existing MediaVideo proxy | exact |
| `backend/internal/handlers/asset_stream_handler.go` | controller | streaming | existing StreamAsset proxy | exact |
| `backend/internal/handlers/admin_content_episode_version_editor_helpers.go` | utility | transform | existing buildJellyfinEditorStreamURL:216+ | exact |
| `backend/internal/handlers/segment_render_subtitles.go` | controller/utility | request-response/file-I/O | same file:110-173 | exact |
| `backend/internal/services/segment_render_service.go` | service | transform/file-I/O | same file:24-39,52-79,103-166 | exact |
| `backend/internal/handlers/jellyfin_media_source.go (proposed)` | utility | transform | jellyfin_helpers.go stream projection; segment_render_subtitles.go:162-173 | role-match |
| `backend/internal/handlers/jellyfin_media_source_test.go (proposed)` | test | transform | jellyfin_search_test.go:10-28 | role-match |
| `backend/internal/models/episode_import.go` | model | request-response/transform | same file:30-41,93-99 | exact |
| `backend/internal/handlers/admin_episode_import.go` | controller | request-response/batch | same file:334-388 | exact |
| `backend/internal/handlers/admin_episode_import_validation.go` | utility | transform | existing apply validation, source research | exact |
| `backend/internal/handlers/admin_content_episode_version_editor_scan.go` | controller | request-response/file-I/O | loadEpisodeImportMediaCandidates; own scan envelope | exact |
| `backend/internal/repository/episode_import_repository.go` | service | CRUD/batch | existing Apply/apply-plan/coverage seams | exact |
| `backend/internal/repository/episode_import_repository_release_helpers.go` | service | CRUD | same file:23-119,186-229 | exact |
| `backend/internal/repository/episode_version_repository_write_helpers.go` | service | CRUD | same file:84-171 | exact |
| `backend/internal/repository/episode_version_repository.go` | service | CRUD/request-response | same file:GetReleaseStreamSource:415-456 | exact |
| `backend/internal/models/episode_version.go` | model | request-response | existing ReleaseStreamSource:114+ | exact |
| `backend/internal/models/theme_segment_render_cache.go` | model | transform | existing ThemeSegmentRenderSource:64+ | exact |
| `backend/internal/repository/theme_segment_playback_resolution.go` | service | request-response | same file:18-74 | exact |
| `backend/internal/repository/theme_segment_render_cache.go` | service | CRUD/request-response | existing GetThemeSegmentRenderSource; source research | exact |
| `backend/internal/repository/release_detail_public_repository_helpers.go` | service | request-response | same file:32-74 | exact |
| `backend/internal/repository/release_detail_public_repository.go` | model/service | request-response | same file:85-91,125-152 | exact |
| `backend/internal/repository/episode_import_source_integration_test.go (proposed)` | test | CRUD | episode_version_public_integration_test.go:47-84; testsupport.OpenPhase117Postgres | role-match |
| `frontend/src/types/releaseDetail.ts` | model | request-response | same file:55-61,89-104 | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx` | component | transform | same file:3-12,53-61,76-85 | exact |
| `frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx` | test | transform | existing same component test | exact |
| `shared/contracts/openapi.yaml` | config | request-response | PublicReleaseSubtitleTrack:16267-16275; existing import schemas | exact |
| `shared/contracts/admin-content.yaml` | config | request-response | existing episode-import/editor schemas | exact |
| `shared/contracts/episode-versions.yaml` | config | request-response | PublicReleaseDetail:324-338; PublicReleaseSubtitleTrack:352-357 | exact |
| `frontend/src/types/episodeImport.ts` | model | request-response | models/episode_import.go; existing frontend import DTO | exact |
| `frontend/src/types/episodeVersion.ts` | model | request-response | existing editor scan/relink DTOs | exact |
| `frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts` | utility | transform | existing buildEpisodeImportApplyInput, source research | exact |
| `frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts` | hook | request-response | existing central API round trip; source research | exact |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` | hook | request-response | existing file selection/save; source research | exact |

## Pattern Assignments

### 1. Shared Jellyfin request/auth helper and existing HTTP callers

**Primary analog:** `backend/internal/handlers/jellyfin_client.go:159-247`. Retain each existing owner's decoder, timeout, context, status mapping, request count and Range behavior. A small internal package is justified because handlers and the FFmpeg service need the same provider-specific rules; do not import handlers from services. Prefer a constructor/auth helper plus safe execution policy over replacing all clients with a broad framework.

**Current signature and imports** (same file:3-19,159-164):
```go
import (
    "context"
    "net/http"
    "net/url"
)
func (h *AdminContentHandler) fetchJellyfinJSON(
    ctx context.Context, apiPath string, query url.Values, target any,
) (int, error)
```

**Copy context/request lifecycle and response normalization** (same file:196-199,212,221,235-247; noncontiguous excerpts):
```go
req, err := http.NewRequestWithContext(ctx, http.MethodGet, parsedBase.String(), nil)
if err != nil {
    return 0, fmt.Errorf("create jellyfin request: %w", err)
}
defer resp.Body.Close()
body = normalizeJellyfinResponseEncoding(body, resp.Header.Get("Content-Type"))
if err := json.Unmarshal(body, target); err != nil {
    // Retain owner's status/error contract; sanitize diagnostics.
}
return resp.StatusCode, nil
```

The current `values.Set("api_key", apiKey)` at line 193 is the defect, not a pattern to copy. Build key-free URLs and apply `Authorization: MediaBrowser Token="..."` only for the configured Jellyfin origin. Preserve existing Emby branches in `fansub_admin.go` and the independent Fanart caller. Never attach Jellyfin credentials to a stored fallback URL of another origin. Define and test redirects before sharing execution; do not mutate a globally shared `http.Client` while requests run.

**Cross-consumer auth:** `services/segment_render_service.go:24-31,103-144` already owns `SegmentRenderCommandInput` and `BuildFFmpegSegmentArgs`. Extend that input to carry required headers separately from `StreamURL`; input options precede `-i`. Reuse `SanitizeSegmentRenderLog(raw string, secrets ...string)` at lines 147-166 for diagnostics, adding modern-header coverage. Keep header secrets out of argv/error snapshots and do not log the generated command. Source ID goes in the media query, never in the token field.

**Tests:** existing `jellyfin_client_test.go:5-23` proves encoding behavior; retain it. Extend existing group assets, media proxy, subtitle and render tests for real captured request headers, no URL key, 401/5xx/transport failure, redirect-origin boundaries, preserved binary Range and unchanged Emby/Fanart auth. A new focused transport test file is appropriate; synthetic credentials only.

### 2. Source resolver, existing candidate projection and GetItems query reuse

**Primary analog:** `backend/internal/handlers/admin_episode_import.go:334-388`, with DTOs in `jellyfin_client.go:25-57` and `models/episode_import.go:30-41`. Extend this existing projection and call it from the editor scan. Do not copy a second source selector into subtitle or playback code.

**Current batch and candidate envelope** (admin_episode_import.go:342-348,360-370; excerpts):
```go
items, err := h.listJellyfinEpisodes(c.Request.Context(), jellyfinSeriesID)
if err != nil {
    return nil, err
}
candidates := make([]models.EpisodeImportMediaCandidate, 0, len(items))
candidate := models.EpisodeImportMediaCandidate{
    MediaItemID: itemID,
    FileName: episodeImportFileName(item),
    Path: itemPath,
    StreamURL: h.buildJellyfinEditorStreamURL(itemID),
    VideoQuality: jellyfinVideoQuality(item.MediaStreams),
    VideoCodec: jellyfinStreamCodec(item.MediaStreams, "Video"),
    AudioCodec: jellyfinStreamCodec(item.MediaStreams, "Audio"),
    DurationSeconds: durationSecondsFromTicks(item.RunTimeTicks),
}
```

Retain one candidate per real item and the existing canonical episode/group mapping. Replace item-level filename/container/streams/duration inputs with one verified selected source. Extend existing source/stream DTOs rather than adding another JSON decoder. Internal typed snapshot may live beside `EpisodeImportMediaCandidate`; keep the public wire DTO separate from private path/URL/auth data.

**New algorithm, not an existing analog:** exact stored source ID; unique exact stored path only for bounded ID-change recovery; otherwise conflict. Without binding, unique item.Path/source.Path match, then sole valid source. No first-source, wrong-item or borrowed item-stream fallback. Do not lowercase source-path identity on Linux. Preserve complete snapshots when a response omits streams. Follow the full decision table and language rules in `161-MEDIASOURCE-RESEARCH.md`.

`segment_render_subtitles.go:162-173` already maps stream index/type/codec/default/forced into `services.SegmentProbeMediaStream`; apply that mapping only to selected-source streams. Delete unsafe semantics in `findJellyfinItem` (138-147) and `resolveJellyfinMediaSourceID` (152-158), retaining an exact-item helper rather than creating another competing lookup.

**Real fixture to copy:** sanitized `docs/audits/2026-09-15-jellyfin12/discovery-11eyes.json`; B-SH item has three nested sources while FlameHazeSubs and Strawhat also appear as separate items. Own-path selection must produce three candidate files, not five. MP4 `und` remains unknown, and no subtitle does not imply hardsub. Include poison item-level container/streams and reversed source arrays. Do not claim all 27 entries verified from the detailed three-file excerpt alone.

**GetItems pagination analog:** `group_assets_jellyfin.go:195-244` already implements `listPagedGroupItems` and `cloneURLValues`. Copy/reuse these lines 206-224:
```go
values := cloneURLValues(baseValues)
values.Set("Limit", strconv.Itoa(pageSize))
values.Set("StartIndex", strconv.Itoa(startIndex))
var payload jellyfinGroupItemsResponse
if err := h.fetchGroupAssetsJSON(ctx, "/Items", values, &payload); err != nil {
    return nil, err
}
items = append(items, payload.Items...)
startIndex += len(payload.Items)
```

Reuse this helper for `listSubgroupChildren` (322-337), retain final path sorting, explicitly set root `Recursive=false` and children `true`. Preserve termination on empty page and TotalRecordCount/short-page handling. For `getGroupItemDetails` (339-350), use existing `/Items` + `Ids` request shape in `jellyfin_client_series.go:116-138`, with exact returned ID required. Do not copy its first-item fallback at line 141. Request only valid ItemFields and consume normal base response fields. Series search limit remains a deliberate bounded preview.

### 3. Atomic import snapshot, technical writers and source identity

**Primary analog:** `episode_import_repository_release_helpers.go:23-119,186-229`. Imports at 13-16 show canonical `team4s.v3/backend/internal/models` and `github.com/jackc/pgx/v5`. Keep the existing transaction boundary; source snapshot update and variant technical metadata update belong together.

**Copy ownership/locking** (same file:49-58):
```go
if existingAnimeID != ids.AnimeID {
    return false, ErrConflict
}
if lockErr := tx.QueryRow(ctx, `SELECT id FROM release_variants WHERE id=$1 FOR UPDATE`, variantID).Scan(&variantID); lockErr != nil {
    return false, lockErr
}
```

**Extend current provider/item upsert, do not replace its key** (same file:218-229):
```go
func upsertStreamSource(ctx context.Context, tx pgx.Tx, mediaItemID string, streamURL *string) (int64, error) {
    var id int64
    if err := tx.QueryRow(ctx, `
        INSERT INTO stream_sources (provider_type, external_id, url)
        VALUES ('jellyfin', $1, $2)
        ON CONFLICT (provider_type, external_id) DO UPDATE
        SET url = COALESCE(EXCLUDED.url, stream_sources.url)
        RETURNING id
    `, mediaItemID, streamURL).Scan(&id); err != nil {
        return 0, fmt.Errorf("upsert stream source media=%s: %w", mediaItemID, err)
    }
    return id, nil
}
```

Add/update a typed namespaced selected-source snapshot in existing `stream_sources.metadata`; preserve unrelated metadata keys. No schema/table/migration is needed. `external_id` remains the real item ID; do not concatenate source ID into it. Refresh the snapshot and URL on repeat apply too; the existing update branch (84-98) currently does neither source refresh nor container update. Keep title/crew/group/coverage rules and no extra versions or streams.

`release_stream_repository_helpers.go:13-69` is the exact shared idempotency seam: `upsertNormalizedReleaseStream(ctx, tx, variantID, streamTypeID, streamSourceID, jellyfinItemID) error`. It locks/selects the one NULL-language episode stream and removes only redundant rows of that same variant/type. Reuse it unchanged unless a concrete fixture proves a required correction. Never represent audio/subtitle codec tracks as new release_streams rows.

**Do not copy defective title-derived technical identity:** `episode_version_repository_write_helpers.go:115-140` currently reads title into filename/container. Remove that coupling in both generic Create/Update callers. Keep ordinary title, quality, date, CRC or subtitle-type edits source-preserving; an actual file relink must replace source metadata atomically. Use the existing `ensureEpisodeVersionStream` / `ensureStreamSourceID` seams rather than parallel source persistence.

**Read/playback identity:** `EpisodeVersionRepository.GetReleaseStreamSource` (episode_version_repository.go:415-456) already enforces explicit variant membership with `rv.id = $2 AND rv.release_version_id = $1`. Preserve this. `theme_segment_playback_resolution.go:42-74` binds a variant to a real release version. Extend those results and `models.ReleaseStreamSource`/`ThemeSegmentRenderSource` with internal selected source ID. Resolve the default variant consistently with public metadata. Keep source selectors in video/subtitle requests and item+source in `SegmentRenderWindow.SourceIdentity`, whose existing hash is at `segment_render_service.go:52-79`. No cache table or live cache reset.

**Validation boundary:** apply currently receives posted media_candidates. Reuse existing handler/apply validation, batch-load actual confirmed items and existing bindings, and reject stale/tampered source identity before repository writes. One bounded ID batch (or bounded chunks) is an explicit 0-to-1 apply request increase, not N+1; record this separately from unchanged preview request count. Preserve keys/URLs as server-owned values.

### 4. Isolated PostgreSQL fixture and executable repository proof

**Primary analog:** `backend/internal/testsupport/phase106_postgres.go:41-126` owns the reusable `openPhasePostgres` isolation machinery. Reuse public `testsupport.OpenPhase117Postgres(t)` as `episode_version_public_integration_test.go:47-84` already does; do not duplicate its guard and cleanup implementation in each new test.

**Existing fixture entry and targeted extension** (episode_version_public_integration_test.go:47-61):
```go
func openEpisodeVersionPublicFixture(t *testing.T) (*pgxpool.Pool, *episodePublicTracer) {
    t.Helper()
    fixture := testsupport.OpenPhase117Postgres(t)
    // Existing fixture adds filename/container/codecs and stream identity.
    // Add only missing source JSONB and import prerequisites in this isolated schema.
}
```

`openPhasePostgres` requires a dedicated test DSN/database-name pattern, checks current_database, creates a unique schema, sets a one-schema search_path, checks no public schema, and removes only that test schema in t.Cleanup. No application DATABASE_URL fallback. Existing public fixture alone lacks all Apply prerequisites; source research identifies episode/filler/language lookup tables, release sources/group links and assignment locks. Extend a focused fixture beside the tests, not the application schema. If a new phase-specific exported opener is necessary, copy the thin `testsupport/phase150_postgres.go:31-40` wrapper around `openPhasePostgres`, not a second isolation engine.

Persistence tests must execute Apply/create/repeat/relink/title-edit/read paths with DB assertions for source/container/tracks/graph counts and anime/group/variant isolation. Assert ambiguity rolls back without changes. Tests skipped for missing guarded DSN are unexecuted persistence proof. Reuse pgx transaction/error patterns above, and preserve existing source-text tests only as supplemental regression checks.

### 5. Public technical contract and existing UI

**Primary analog:** `release_detail_public_repository_helpers.go:32-74` and current `PublicReleaseDetail`. Keep `loadReleaseTechnical(ctx, releaseVersionID) (publicReleaseTechnical, []PublicReleaseSubtitleTrack, error)` ownership; select one variant/source once and project scalar fields plus every track from that selection. Existing SQL at 57/61 mixes first-variant scalars with all-variant subtitles; do not copy those predicates.

**Current public track contract** (release_detail_public_repository.go:85-91):
```go
type PublicReleaseSubtitleTrack struct {
    Language *string `json:"language"`
    Label    string  `json:"label"`
    Format   *string `json:"format"`
    Forced   bool    `json:"forced"`
    Default  bool    `json:"default"`
}
```

The exact frontend mirror already exists in `frontend/src/types/releaseDetail.ts:55-61`; canonical OpenAPI at `shared/contracts/openapi.yaml:16267-16275` requires all five keys, nullable language/format. Focused contract `shared/contracts/episode-versions.yaml:352-357` matches it. Populate real flags, codec as format, and keep an unknown-language track with null language. Retain empty arrays, not null slices. Existing no-snapshot rows may use their existing read path scoped to the same selected variant; public reads remain DB-only.

`ReleaseDetailHero.tsx:3-7` already imports `Accordion, Card, HeroMetrics` from `@/components/ui` and `ReleaseDetailResponse` from `@/types/releaseDetail`. Existing `formatSubtitleTracks` at 53-61 displays label/language/format even when language is unknown. Technical facts at 76-85 already include Container, Audio-Codec, Audio-Sprache and Untertitelspuren. Reuse this UI and tests; no new screen/control/layout needed. If any visible behavior changes, honor `161-UI-SPEC.md` and German umlauts.

Import/editor additions belong in existing `frontend/src/types/episodeImport.ts`, `episodeVersion.ts`, their API helper owner and shared admin/OpenAPI contracts. Carry reviewed media_source_id through existing mapping serialization; never add direct protected fetch/token construction. Public DTOs must not expose private source IDs/paths/server URLs merely because the internal snapshot contains them.

## Shared Patterns

- **Domain ownership:** canonical episode -> fansub release -> release version -> variant -> release stream -> existing stream source. Keep fansub groups on release versions and metadata on the source/variant owning that selected file.
- **Auth separation:** server Jellyfin header handling is distinct from browser Keycloak session handling. If protected frontend round trips are touched, test absent/expired access token with valid refresh session through the central API client.
- **Error handling:** repository helpers wrap context with `%w`, map missing rows via pgx.ErrNoRows/ErrNotFound and use ErrConflict for ownership/source ambiguity. Do not log secrets in wrapped transport errors or FFmpeg diagnostics.
- **Validation:** preserve omitted-versus-complete-empty source metadata; server revalidates posted selection; unknown language stays unknown using the already installed x/text language seam described in source research.
- **Testing:** pure source helper tests can use t.Parallel and direct fixtures as `jellyfin_search_test.go:10-28`; network behavior needs httptest; persistence needs the guarded Postgres harness; public UI contract uses existing Vitest tests.

## Cross-Plan File Conflicts

| File seam | Collision | Planning rule |
|---|---|---|
| jellyfin_client.go | auth extraction, valid Fields, source DTO/batch decode | Auth foundation first; source/API plan explicitly depends on it, or one owner writes all sections. |
| group_assets_jellyfin.go | auth replacement and root/detail/pagination repair | One file owner or sequential plans; reuse its existing paging helper. |
| fansub_admin.go / episode_version_stream.go | provider auth and selected-source query | Auth foundation defines provider boundary; later source plan adds selector without altering Emby. |
| segment_render_subtitles.go | auth download, exact item/source selection, stream projection | Sequence auth then source integration; no parallel whole-file rewrites. |
| segment_render_service.go / editor stream helper | FFmpeg headers and source identity/query | Agree input fields and source identity once; tests updated by the same owner. |
| episode_import.go / admin import handler / editor scan | shared snapshot, preview/apply validation, wire DTO | Source model/projection lands before persistence and frontend round trip. |
| episode_version_repository.go / write_helpers | title/container fix, relink, playback read source | One repository plan owns atomic metadata/identity behavior. |
| stream_sources.metadata | import, editor relink, public and playback readers | Freeze typed namespaced format before consumers; preserve unrelated keys. |
| shared/contracts/openapi.yaml / admin-content.yaml / episode-versions.yaml | auth-facing docs, import DTO additions and technical semantics | One contract owner or explicit sequential edits; include frontend mirrors in same plan. |
| integration fixture | import, title/relink and public source-coherence tests | Share one fixture owner and setup; do not create competing temporary-schema engines. |

Recommended dependency order: transport foundation -> shared source DTO/resolver and batch/API semantics -> atomic import/editor persistence -> public/playback/subtitle consumers -> integrated live proofs. Public and playback plans can run independently only after DTO/source-binding contracts are fixed and overlapping files have a single owner.

## No Analog Found

| File/concept | Role | Data Flow | Reason |
|---|---|---|---|
| Stable source selection in proposed jellyfin_media_source.go | utility | transform | Existing selector uses first source and wrong-item fallback; use source research decision table and adversarial tests. |
| Namespaced selected-source snapshot shape | model | transform/CRUD | Existing JSONB storage supports it, but there is no typed source-coherent persisted snapshot to copy. Define minimally from audited consumers. |
| New schema/migration | migration | CRUD | Not required. Existing stream_sources.metadata supports one selected source per item. |

## Metadata

**Analog search scope:** canonical backend handlers/models/repository/services/testsupport, frontend import/editor/public DTOs/components, shared contracts and phase research.
**Primary analog families:** 5 (transport, projection/query, persistence/identity, isolated PostgreSQL, public contract/UI).
**Coverage:** 39 existing-seam matches; 5 role matches; new source-selection semantics explicitly marked above.
**Pattern extraction date:** 2026-09-15.
**Checks for this artifact:** canonical git/Compose inspection, exact source/signature reads, path review and document diff check. No implementation, DB mutation, migration, build or application test claimed by this mapping pass.
