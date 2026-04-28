# Phase 28 Research: Segment Playback Sources From Jellyfin Runtime

## Objective

Plan Phase 28 so segment playback defaults to the current episode-version/Jellyfin stream, segment time limits use `release_variants.duration_seconds` when available, and uploaded segment files remain an explicit fallback instead of the default playback path.

## What Exists Today

### Backend reality

- `theme_segments` still stores the operator-facing source fields: `source_type`, `source_ref`, `source_label`, plus legacy `source_jellyfin_item_id`.
- A dedicated `theme_segment_playback_sources` table already exists in code and is hydrated into the segment DTO as:
  - `playback_source_kind`
  - `playback_release_variant_id`
  - `playback_jellyfin_item_id`
  - `playback_media_asset_id`
  - `playback_source_label`
  - `playback_start_offset_seconds`
  - `playback_end_offset_seconds`
  - `playback_duration_seconds`
- Playback rows are rebuilt by `syncThemeSegmentPlaybackSourceTx(...)` after create/update/upload/delete.
- `EpisodeVersionEditorPage` already passes `version.duration_seconds` into `SegmenteTab`, and the segment form already clamps end-time input on blur/save when a duration is known.

### Frontend reality

- The UI still exposes the old source choice as `none | jellyfin_theme | release_asset`.
- The operator cannot currently choose a playback source directly.
- `AdminThemeSegment` already includes playback metadata fields, but the current UI mainly renders provenance/source text from `source_type/source_ref/source_label`.
- `SegmentTimeline` already uses `durationSeconds` for proportional display when available.

## Key Finding

The new playback table is present, but the default episode-version path is not actually wired yet.

Why:

- `syncThemeSegmentPlaybackSourceTx(...)` only writes `episode_version` playback when `snapshot.PlaybackVariantID` is already populated.
- `loadThemeSegmentPlaybackSnapshotTx(...)` currently hardcodes:
  - `release_variant_id = NULL`
  - `duration_seconds = NULL`
  - no lookup of the current release variant or Jellyfin stream
- Result: `theme_segment_playback_sources` is effectively derived only from the legacy/manual source fields today.

Practical consequence:

- `source_type=release_asset` currently tends toward uploaded-asset playback, not episode-version-by-default playback.
- `source_type=none` only becomes episode-version playback if the snapshot learns how to resolve the current release variant.

## Architecture Pattern To Preserve

### Separate operator source from resolved playback

Keep these concerns distinct:

- Segment definition owns OP/ED meaning:
  - theme kind
  - theme title/name
  - episode range
  - start/end offsets
- Playback resolution owns how preview/playback is served for the current edit context:
  - episode-version stream by default
  - uploaded asset as fallback
  - optional Jellyfin theme only when explicitly selected

This matches the existing direction of `theme_segment_playback_sources` and should be extended, not replaced.

### Use release-variant context, not anime-global heuristics

Phase 28 should resolve playback against the currently edited release variant:

- current `versionId` -> current `release_variant`
- current variant -> `release_streams` + `stream_sources`
- current variant -> `release_variants.duration_seconds`

Do not infer runtime or playback from anime-global data when the edit page already has a precise release-variant anchor.

## Recommended Standard Stack

- Backend persistence: reuse `theme_segment_playback_sources`
- Release context source of truth: `release_variants`, `release_streams`, `stream_sources`
- UI contract: extend current `AdminThemeSegment` DTO instead of inventing a second segment payload
- Validation: keep time clamping in frontend for UX and add backend normalization for authority

## Recommended Plan Shape

### Slice 1: backend playback resolution contract

Define the exact resolution rules for `syncThemeSegmentPlaybackSourceTx(...)`.

Recommended rule order:

1. If operator explicitly selected uploaded fallback, playback may use `uploaded_asset`.
2. Else if current edited release variant has a Jellyfin-backed stream, playback should use `episode_version`.
3. Else if operator explicitly selected `jellyfin_theme`, playback may use `jellyfin_theme`.
4. Else if uploaded asset exists, use `uploaded_asset`.
5. Else remove playback row.

Important planning choice:

- Decide whether `source_type` continues to mean "operator-selected source/fallback" or whether a new explicit playback-selection field is needed.
- Based on current code, the safer narrow slice is:
  - keep `source_type/source_ref/source_label` for explicit non-default fallback choices
  - let absence of an explicit fallback resolve to `episode_version`

### Slice 2: snapshot query and sync implementation

`loadThemeSegmentPlaybackSnapshotTx(...)` needs real joins to resolve:

- current segment's anime/group/version context
- matching release variant for the current editor context
- `release_variants.duration_seconds`
- current Jellyfin stream item id / stream source

This is the technical heart of the phase.

### Slice 3: frontend source-choice redesign

Replace the current selector wording and behavior so the default is clear:

- default: episode-version/Jellyfin stream
- optional fallback: uploaded file
- optional explicit Jellyfin-theme playback only if still product-valid

The UI should stop implying that uploaded files are the main playback path.

### Slice 4: duration authority and validation

Keep the current UX clamp, but add backend-side normalization/guardrails:

- if `duration_seconds` exists, reject or clamp `end_time` above runtime
- reject `start_time >= end_time`
- preserve nullable fallback when runtime is unknown

### Slice 5: verification

Plan explicit verification for:

- segment create with no uploaded asset -> playback row resolves to `episode_version`
- segment create with uploaded file fallback -> playback row resolves according to chosen fallback policy
- segment edit after changing times -> playback offsets persist
- runtime-known version clamps end time
- runtime-null version still allows manual timing and timeline fallback

## Current Code Constraints That Matter

### 1. Duration coverage is still incomplete in practice

The quick task that added `release_variants.duration_seconds` documents an important caveat:

- `duration_seconds` is nullable by design
- the current single-episode Jellyfin sync path still has stub/deferred behavior in places
- older rows will often remain `NULL`

Planning implication:

- Phase 28 must treat missing runtime as normal, not exceptional
- do not make playback resolution or segment saving depend on runtime being present

### 2. The edit page only knows one release context at a time

This is good for Phase 28. It means playback defaulting can be tied to the editor's current release variant instead of a cross-release lookup.

### 3. Upload and library reuse must stay intact

Phase 26/27 already established upload/reuse behavior and provenance. Phase 28 should not undo that by collapsing playback choice back into asset identity.

## Common Pitfalls

- Treating uploaded segment files as the new primary playback source. That conflicts with the phase goal.
- Using `source_type` as both "what the operator chose" and "what the player should actually play" without a clear precedence rule.
- Assuming `duration_seconds` is always populated. It is not.
- Resolving playback by anime/group/version only, without anchoring to the currently edited release variant when one is already known.
- Reintroducing legacy `source_jellyfin_item_id` semantics into new planning. It should remain compatibility-only.
- Making Jellyfin authoritative for OP/ED identity. Jellyfin only helps with runtime/stream playback, not theme meaning.

## Don't Hand-Roll

- Do not invent a second parallel playback DTO.
- Do not add ad hoc frontend-only playback inference.
- Do not compute runtime from segment max end when `duration_seconds` exists; use the persisted variant runtime.
- Do not rebuild asset upload/reuse flows; reuse the Phase 26/27 seams.

## Likely Implementation Strategy

The narrowest durable implementation looks like this:

1. Resolve the current segment's matching release variant in the repository snapshot query.
2. Populate snapshot fields for:
   - `PlaybackVariantID`
   - `PlaybackDuration`
   - resolved Jellyfin stream identity/label
3. Update `syncThemeSegmentPlaybackSourceTx(...)` so "no explicit fallback" maps to `episode_version` when a current release variant exists.
4. Keep uploaded asset playback available only when the operator explicitly chooses it as fallback/source.
5. Reword the editor UI around default playback versus optional fallback.

## Open Questions To Settle Before Planning

1. Should explicit `jellyfin_theme` remain a first-class option in Phase 28, or should the UI narrow to:
   - `Episode-Version Stream (default)`
   - `Uploaded Fallback`
2. When both an uploaded asset and an episode-version stream exist, should playback switch immediately to uploaded fallback only when the operator explicitly selects it, or should upload merely attach a reusable file without changing active playback?
3. Should backend time validation clamp silently or reject with a clear validation error when values exceed runtime?

Recommendation:

- Keep `jellyfin_theme` out of the main happy path unless product still needs it.
- Require explicit operator intent before uploaded files replace default playback.
- Clamp in UI, validate in backend, and prefer a clear error over silent backend mutation unless the team already prefers normalization-first writes.

## Planning Risks

### High risk

- The current repository snapshot does not know the release variant. Without solving that first, the phase can look "done" in UI while playback rows stay wrong.

### Medium risk

- Runtime data is nullable and still unevenly populated. Tests must cover both runtime-known and runtime-null paths.
- If the team keeps `source_type` overloaded, future phases may struggle to distinguish asset provenance from active playback choice.

### Low risk

- Frontend work is moderate because the page already receives duration and playback DTO fields.

## Code References

- `backend/internal/repository/admin_content_anime_themes.go`
  - `syncThemeSegmentPlaybackSourceTx(...)`
  - `loadThemeSegmentPlaybackSnapshotTx(...)`
  - `hydrateSegmentPlaybackMetadata(...)`
- `backend/internal/repository/episode_version_repository.go`
  - release-variant stream/runtime joins already used by episode-version reads
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmenteTab.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/SegmentEditPanel.tsx`
- `frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx`
- `frontend/src/types/admin.ts`

## Bottom Line

To plan this phase well, treat it primarily as a playback-resolution phase, not an upload phase.

The real work is:

- teach the backend playback snapshot about the current release variant and runtime
- make `episode_version` the default resolved playback source
- preserve uploaded files as explicit fallback/provenance
- keep runtime-aware time limits nullable-safe

If the plan starts with UI polish before repository resolution rules are locked, it will likely miss the actual hard part.
