# Phase 161: MediaSource import and consumer research

**Researched:** 2026-09-15. **Scope:** source selection, metadata persistence, editor writers, playback/subtitles, public consumers and focused tests. **Confidence:** HIGH for current code; MEDIUM for proposed integration until fixture proofs. This is the bounded companion to 161-RESEARCH.md, not implementation. [VERIFIED: assigned subtask; Linux code inspection]

## User Constraints

The complete 161-USER-REQUEST.md and D-06 through D-15 in 161-CONTEXT.md bind this research. Preserve existing imports/releases; do not reset, reseed, backfill, migrate live rows, introduce a new media domain, redesign UI, or infer missing language. Keep one selected source per existing item binding unless a later explicit decision requests independently imported alternatives. The user requires deterministic selection, not automatic import of every alternate source. [VERIFIED: 161-USER-REQUEST.md sections 5-13 and 17; 161-CONTEXT.md D-06–D-15; coordinating-agent scope confirmation]

## Summary

The canonical import loses source semantics before persistence: jellyfinMediaSource retains only Id, while the import creates one candidate from item.Path and item.MediaStreams. Container is not decoded or carried; creation guesses the filename extension, repeat apply never updates container, and unrelated editor metadata changes can overwrite filename/container using the release title. Language and subtitle-track information never reaches the import DTO or writes. [VERIFIED: backend/internal/handlers/jellyfin_client.go:29–57; backend/internal/handlers/admin_episode_import.go:334–371; backend/internal/repository/episode_import_repository_release_helpers.go:84–96,186–194; backend/internal/repository/episode_version_repository_write_helpers.go:115–140]

**Recommendation:** retain the current provider/item identity and one selected source per item; use existing stream_sources.metadata for a typed, namespaced selected-source snapshot. Read container, filename, duration and all used tracks from that same source. Fix every metadata writer and carry the selection into playback, subtitle download and segment cache identity. Reject ambiguity or lost bindings before writing. No schema migration is needed for this scope; the parent also confirmed metadata=jsonb in the live schema. [VERIFIED: design derived from database/migrations/0037_add_release_decomposition_tables.up.sql:82–119; existing item-only lookup and uniqueness; D-07/D-10]

## Architectural Responsibility Map

| Capability | Owner | Implementation boundary |
|---|---|---|
| Episode truth and fansub ownership | Backend / database | AniSearch canonical episode mapping, release version/group graph; source metadata must not redefine neutral episodes. [VERIFIED: models/episode_import.go:14–40; episode_import_repository_apply.go:51–90] |
| Source resolution and normalization | Backend handler/domain helper | Reuse Jellyfin DTO and fetch seam; pure resolver produces a single coherent source value before DTO mapping. [VERIFIED: handlers/jellyfin_client.go:29–57; admin_episode_import.go:334–388] |
| Stable binding and technical persistence | Repository transaction | stream_sources provider/item identity + metadata; release_variants technical columns; existing source row and variant locked on apply. [VERIFIED: episode_import_repository_release_helpers.go:23–119,218–229] |
| Review and submission | Existing browser builder | Preserve one row/item, explicit statuses and central API client; additive typed source fields only. [VERIFIED: useEpisodeImportBuilder.ts:226–258; models/episode_import.go:57–68] |
| Public technical projection | Repository / API | One selected variant and its same stream-source snapshot; never fetch Jellyfin from public metadata reads. [VERIFIED: release_detail_public_repository_helpers.go:55–74] |
| Subtitle/segment playback | Backend repository + handler + renderer | Same chosen item/source for metadata, video URL, subtitle index and cache identity. [VERIFIED: segment_render_subtitles.go:36–74; theme_segment_render_cache.go:217–277; services/segment_render_service.go:52–79] |

Paths without an explicit prefix in evidence tables refer to backend/internal or the named frontend file below. [VERIFIED: repository file inventory]

## Current end-to-end flow

| Stage | Actual behavior and evidence |
|---|---|
| Select series | Anime source/source links first; folder/title lookup requires one exact folder match. [VERIFIED: handlers/admin_episode_import.go:137–169,191–228,293–306] |
| Read episode batch | One /Shows/{series}/Episodes request; Fields=MediaStreams,Path,RunTimeTicks; response only models Items. [VERIFIED: handlers/jellyfin_client.go:24–26,59–73] |
| Decode source/streams | Source contains only ID. Stream contains Index, Type, Codec, Height, IsDefault, IsForced; no Language/DisplayTitle/Channels/ChannelLayout/IsExternal. [VERIFIED: handlers/jellyfin_client.go:45–57] |
| Candidate | One item ID, item path, basename or item Name, first matching video/audio codec from item streams, item runtime; no source ID, container or track array. Folder filtering also uses item.Path, not selected source.Path. [VERIFIED: handlers/admin_episode_import.go:347–371,607–612; models/episode_import.go:30–40] |
| Operator mapping | Item-keyed mappings, selected fansub groups and canonical target episodes; filename is an operator label. [VERIFIED: models/episode_import.go:51–68; handlers/admin_episode_import.go:419–440] |
| Submit | Browser sends media_candidates back; Apply validates statuses/groups then directly calls repository. No Jellyfin reread or source/metadata validation. [VERIFIED: handlers/admin_episode_import.go:100–134; admin_episode_import_validation.go:28–51; frontend builder buildEpisodeImportApplyInput] |
| Build apply plan | map[string]candidate keyed only by MediaItemID; duplicate mapping item IDs rejected; duplicate candidate item IDs overwrite; missing candidate is synthesized with only item ID. [VERIFIED: repository/episode_import_repository.go:84–153] |
| Find existing graph | provider=jellyfin AND external_id=item ID, first variant ordered by variant ID; cross-anime reuse conflicts; then variant row lock. [VERIFIED: episode_import_repository_release_helpers.go:32–58] |
| Create graph | New fansub_releases → release_versions → release_variants → normalized release_streams → stream_sources; version text defaults v1 and fan groups attach to release version. [VERIFIED: episode_import_repository_release_helpers.go:61–119,158–229] |
| Persist technical metadata | Existing variant fields hold container, codecs, filename, duration; new container guessed from filename extension. Reapply changes filename/codecs/duration but not container and does not refresh stream source URL. [VERIFIED: episode_import_repository_release_helpers.go:84–98,186–229] |
| Persist stream | One language-null episode stream; IDs identify an item, not a MediaSource. Explicit NULL-language lookup/dedupe compensates for nullable uniqueness. [VERIFIED: release_stream_repository_helpers.go:10–69] |
| Repeat preview | Existing item ID filtered completely; added alternate sources under that item cannot appear separately. [VERIFIED: handlers/admin_episode_import.go:637–660; repository/episode_import_repository.go:48–75] |
| Public API | Technical fields from first variant; audio language from joined language-bearing stream; subtitles from all variants of that release version. No source snapshot currently used. [VERIFIED: release_detail_public_repository_helpers.go:55–74] |
| Public UI | Hero consumes container/audio codec/audio language/subtitle type/subtitle tracks. [VERIFIED: frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx:76–85; frontend/src/types/releaseDetail.ts:55–61,99–104] |

### Other writer and selection seams

- **Editor Create:** passes Title as FileName into createReleaseVariant, then overwrites via applyEpisodeVersionVariantMetadata. **Editor Update:** title, quality, subtitle type, CRC32 or duration changes trigger the same writer, setting filename=title and container=title extension (or NULL). Date-only changes do not independently trigger this branch, though the UI commonly sends the full metadata form including title. [VERIFIED: repository/episode_version_repository.go:201–216,258–300; write_helpers.go:115–140; frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts:253–275]
- **Editor folder scan:** one file per item, uses item path/item streams, os.Stat(item.Path) for optional file size, no source identity. Choosing a file keeps an existing title or falls back to release_name without extension. **This is a second active path that must use the shared source projection.** [VERIFIED: handlers/admin_content_episode_version_editor_scan.go:46–83; frontend useEpisodeVersionEditor.ts:198–208]
- **Editor media relink:** generic patch can change provider/item/URL without replacing codecs or other source metadata; ensureEpisodeVersionStream updates the normalized stream. Preserve arbitrary metadata edits, but actual source relinks must update source-owned metadata together and not inherit A's metadata into B. [VERIFIED: repository/episode_version_repository.go:305–334; write_helpers.go:153–171]
- **Legacy sync:** collectAcceptedEpisodes and single episode sync choose item-level data, but repository UpsertByMediaSource currently always returns phase20ReleaseImportDeferred. Do not present these as working persistence paths or revive them as part of a media-source cleanup. [VERIFIED: handlers/jellyfin_sync_import_helpers.go:50–79,125–140; jellyfin_episode_sync_helpers.go:203–228; repository/episode_version_repository.go:407–413]
- **Subtitle resolver:** getJellyfinItemMediaStreams returns item.MediaStreams combined with first nonempty MediaSources.Id; findJellyfinItem even falls back to the first wrong item if exact ID is absent. Download uses that source ID plus the chosen item-level subtitle index. Both are concrete unsafe fallback paths. [VERIFIED: handlers/segment_render_subtitles.go:110–158]
- **Segment source and cache:** repository resolves one variant per real release version and carries only item ID/URL; GetThemeSegmentRenderSource joins first Jellyfin stream; cache hashing accepts SourceIdentity, so source ID can be added to that existing input without a new cache table. [VERIFIED: repository/theme_segment_playback_resolution.go:18–23,42–67; theme_segment_render_cache.go:227–277; services/segment_render_service.go:15–21,52–79]
- **Release playback lookup:** optional explicit variant selector already checks exact release-version ownership; unselected lookup orders by rs.id, whereas public technical metadata orders by rv.id. Make the default selected variant explicit/shared before projecting all technical fields. [VERIFIED: repository/episode_version_repository.go:415–450; release_detail_public_repository_helpers.go:57]

## Findings: actual defects versus unproven production effects

| Priority | Finding | Evidence and qualification |
|---|---|---|
| P1 | Release title overwrites technical filename/container | Proven write semantics; a title without suffix writes container NULL even after correct import. Not a claim that any particular live row was inspected. [VERIFIED: write_helpers.go:125–139] |
| P1 | Selected source is not represented in import and playback identity | Proven DTO/key loss; cannot prove currently stored rows mix sources without a multi-source live sample. [VERIFIED: jellyfin_client.go:45–47; models/episode_import.go:30–40; stream source unique key] |
| P1 | Subtitle metadata and download source use different selection rules | Proven item streams + first source; fixture can reproduce wrong index/source association. [VERIFIED: segment_render_subtitles.go:134–158] |
| P1 | Public technical data and subtitle list can span variants | Proven first variant versus every-variant subtitle SQL; actual live occurrence not claimed. [VERIFIED: release_detail_public_repository_helpers.go:57,61] |
| P2 | Container discarded upstream, inferred on create, omitted on repeat update | Proven mapping/writer chain. [VERIFIED: jellyfin_client.go:29–57; release_helpers.go:84–95,186–194] |
| P2 | Imported language, subtitle labels/codec/default/forced absent | DTO discards them; no language IDs written; public DTO has flags but SQL scans only Language/Label/Format, leaving booleans false and using softsub/hardsub as Format. [VERIFIED: models/episode_import.go:30–40; release_stream_repository_helpers.go; release_detail_public_repository.go:85–90; helpers.go:61–70] |
| P2 | Missing upstream language is real for some tracks | Sanitized live fixture includes a subtitle with language=null; do not invent de based on group/neighbor/display title. [VERIFIED: docs/audits/2026-09-15-jellyfin12/discovery-live.json, source episode 3] |
| P3 | Duplicate source upsert SQL helpers | upsertStreamSource and ensureStreamSourceID duplicate provider/item URL writes; central typed snapshot handling should use one owned seam. [VERIFIED: release_helpers.go:218–229; write_helpers.go:406–423] |

P0 authentication and broad endpoint compatibility are owned by the main Phase-161 research, not duplicated here. [VERIFIED: delegated scope]

## Minimal identity and metadata design

### No-schema path: preserve current one-selected-source-per-item contract

Existing stream_sources.metadata is JSONB, and identity is UNIQUE NULLS NOT DISTINCT(provider_type, external_id). release_variants already holds container, filename, codec, size and duration; release_streams links it to the provider item. No runtime stream_sources.metadata reader/writer was found in this audit. [VERIFIED: database/migrations/0035_add_release_tables.up.sql:33–44; 0037_add_release_decomposition_tables.up.sql:82–119; 0052_add_duration_seconds_to_release_variants.up.sql; grep of backend/internal for ss.metadata/stream_sources metadata]

Use a typed namespace such as metadata.jellyfin_source with version=1, media_source_id, source_path, and audio/subtitle snapshot. The selected source ID and path are binding evidence; the raw item ID remains external_id. Preserve any unrelated JSON keys. Snapshot only fields justified below. This is a proposed contract, not an existing JSON format. [VERIFIED: recommended application of existing JSONB seam to D-07–D-10]


Proposed exact namespaced storage example (synthetic values; internal only):

```json
{
  "jellyfin_source": {
    "version": 1,
    "media_source_id": "source-a",
    "source_path": "/fixture/episode-a.mkv",
    "streams_complete": true,
    "selected_audio_index": 1,
    "audio_tracks": [
      {"index": 1, "codec": "flac", "language": "ja", "default": true}
    ],
    "subtitle_tracks": [
      {"index": 2, "codec": "ass", "language": "de", "display_title": "German", "default": true, "forced": false}
    ]
  }
}
```

This is a proposal: retain container/filename/video codec/audio codec/duration in existing variant columns and store the minimally sufficient source/track association above. A known track with unknown language has language:null, not omission of the track. Import candidate contract adds media_source_id, container, audio_tracks, subtitle_tracks and selected_audio_index; source_path reuses existing path. Mapping adds media_source_id to bind its reviewed candidate. Internal read DTOs add MediaSourceID; public DTO exposes no provider IDs/paths and can keep its existing fields. streams_complete represents a verified complete source projection; absent response fields are not silently interpreted as an authoritative empty list. [VERIFIED: proposed extension of existing DTO/JSONB seams to D-07–D-10]

Do not encode item:source into external_id: existing GetReleaseStreamSource, segment queries, filters, API DTOs and URL builders consume it as the real Jellyfin item. Do not create one release_streams row per codec track; the table models stream/source availability, while its current normalization treats NULL-language rows as duplicates. [VERIFIED: episode_version_repository.go:429–449; theme_segment_render_cache.go:243–244; release_stream_repository_helpers.go:10–69]

If a future task needs simultaneously independent alternatives A and B for the same item, the missing concept is **source identity on the binding**, not a new media system. Minimal extension would be nullable source identity on stream_sources plus provider/item/source uniqueness (and updated upserts/read DTOs), or a selector on the release_streams association. This is NOT required/recommended for this phase's one-selected-source behavior. Changing uniqueness must include guarded migration tests and explicit legacy-null semantics; no broad historical row work. [VERIFIED: derived limitation of existing unique key; phase D-10/D-14]

### Resolver decision table

Implement one pure helper used by import, editor scan, duration enrichment, subtitle resolution and legacy runtime selection. Inputs: exact item, optional stored binding; output: chosen source or typed missing/ambiguous conflict. Proposed ordering implements D-07. [VERIFIED: shared repeated selection seams above; 161-CONTEXT.md D-07]

| Condition | Required result |
|---|---|
| Stored source ID has exactly one match | Select it; ignore response array order and changed item.Path. |
| Stored ID is absent, stored source path has exactly one exact match | Select that source; record changed ID only during an explicit authorized write, not a read. |
| Stored binding exists but neither matches, or either match is ambiguous | Conflict. Never fall through to item.Path or a sole remaining B. |
| No stored binding; item.Path exactly matches one source.Path | Select it. |
| No stored binding; only one valid source exists | Select it. |
| No source, duplicate source IDs, missing usable source identity, multiple unmatched sources | Conflict/diagnostic, no guessed source and no source-dependent write. |
| Requested item missing from batch | Missing; remove first-item fallback. |
| Chosen source has empty MediaStreams | Keep known source identity; do not borrow item-level or another source's streams. Empty available-data snapshot remains empty; omitted/incomplete response must not erase a previous complete snapshot. |

These rows are prescriptive design decisions derived from D-07/D-09; they are not assertions of already implemented behavior. [VERIFIED: source-coherence requirements]

Use exact source-path comparison with only documented transport normalization (trim and separator normalization); do not reuse lowercasing for identity on case-sensitive paths, do not compare basenames as identity, and do not use path to open a local file/download an arbitrary URL. Path is private evidence, never public DTO content. [VERIFIED: Linux canonical environment; D-07 and source ownership requirements]

Source ID is preferable to Name/Version/Container/Size because those are descriptors, not the bound source reference. Path is a bounded recovery hint, not immutable identity. Current official Jellyfin source constructs a file MediaSource from the alternate item's ID/path/streams/container; its ordering can use preferred/resume choices. This verifies that array order is not Team4s identity. It does NOT prove identity survives file rename, library move, delete/recreate or an arbitrary server scan. [CITED: https://raw.githubusercontent.com/jellyfin/jellyfin/master/MediaBrowser.Controller/Entities/BaseItem.cs lines 1074–1128; https://raw.githubusercontent.com/jellyfin/jellyfin/master/Emby.Server.Implementations/Library/MediaSourceManager.cs lines 341–382,384–420]

When both item/source identity and path change, there is no reliable match in the evidence gathered: surface the conflict and preserve the old binding. A rescan with unchanged identity should preserve selection even if sources reorder; changed ID with unique unchanged stored path has bounded recovery. A same-path replacement can still be a different file; Size/Container cannot prove content equality, and checksumming full media would add unrelated cost. Actual library rescans were not triggered by this research. [VERIFIED: limits of inspected identifiers and read-only scope]

### Atomic apply and writer rules

1. Decode source.Path/Container/RunTimeTicks/MediaStreams and default audio index from the episode batch; map one selected source to the existing candidate, adding explicit media_source_id/container and typed tracks. Use the selected path for folder ownership and fan-group filename evidence. Do not borrow item.Name as a technical filename when no source path exists. [VERIFIED: D-06–D-09; current mappings identified above]
2. Read existing bindings in one repository batch keyed by item IDs. On apply, rehydrate all confirmed items in a bounded /Items?Ids=... batch with valid source fields, compare posted selection against the canonical result, and discard client-supplied technical metadata/URL as authority. A stale source should fail before graph writes. Chunk by bounded request size when needed; not one request/item. Existing apply currently trusts posted candidates, so this is an intentional contract hardening and +batch request cost. [VERIFIED: admin_episode_import.go:114–125; jellyfin_client.go existing /Items ID request seam; D-12/D-13]
3. Under existing transaction/locks, update selected snapshot and variant technical fields together. Reapply A must target the same source row and variant; A→B implicit mutation must conflict. Existing no-snapshot item rows keep their identity and remain readable; an explicit import can attach a resolvable snapshot only without changing ownership, never through a background backfill. [VERIFIED: existing item-keyed graph lookup; D-10/D-12]
4. Remove title-derived filename/container from generic editor metadata writer and Create. Technical filename/container are written only from explicit source metadata. Extend existing DTOs/contracts and handler-owned hydration for actual file relinks; ordinary title/quality/date/CRC changes retain source snapshot. [VERIFIED: writer defect and API contract rules]
5. Preserve old snapshot for incomplete/omitted source metadata during refresh; distinguish omission from an explicitly complete empty track list. Store codec/language pairs from the same chosen audio track: prefer valid source.DefaultAudioStreamIndex, else one deterministic IsDefault track, else lowest valid audio Index. For unknown language keep null. [VERIFIED: D-09; current independent first-codec extraction loss]
6. For repeat apply do not duplicate versions, variants, normalized stream rows or crew seeding; leave existing coverage/ownership semantics intact and reject cross-anime media reuse. [VERIFIED: release_helpers.go:49–58,100–117; crew hook only on created]

### Existing consumer matrix and persistence choice

| Field | Current consumer | Required handling |
|---|---|---|
| Audio Index | Needed to keep chosen codec/language/default together; no public selector today | Store in typed snapshot; select deterministically. [VERIFIED: public DTO scalar audio fields; D-09] |
| Audio Codec / Language | Public technical hero | Persist from same selected audio track; source snapshot + existing variant.audio_codec, no new column. [VERIFIED: ReleaseDetailHero.tsx:81–82] |
| Audio DisplayTitle | No current public audio-track label surface found | Decode only if resolver/debug fixture needs it; no required persistence. [VERIFIED: inspected public/frontend DTO consumers] |
| Audio Channels / ChannelLayout / IsForced | No current consumer found in audited flow | Do not persist merely because upstream offers them. [VERIFIED: source DTO/probe/public DTO inventory] |
| Audio IsDefault / source default index | Determines representative audio track | Snapshot selector evidence; do not use response position. [VERIFIED: D-09 and scalar public contract] |
| Subtitle Index / Codec | Segment ASS selection and download; public track format | Persist per-source indexed track; format is codec, not softsub/hardsub. [VERIFIED: segment_render_subtitles.go:52–74; PublicReleaseSubtitleTrack.Format] |
| Subtitle Language / DisplayTitle | Public language and label | Persist source value/normalized known language and optional title; unknown language stays null and track remains visible. [VERIFIED: PublicReleaseSubtitleTrack; live missing-language track] |
| Subtitle IsDefault / IsForced | Segment selector and existing public flags | Persist and map actual flags. [VERIFIED: services/segment_render_service.go:82–100; public DTO fields] |
| Subtitle IsExternal | Download always uses Jellyfin subtitle endpoint; no local-path branch | Decode/audit if required by upstream endpoint behavior; no current persistence need. Never derive an external local file path. [VERIFIED: segment_render_subtitles.go:176–231] |
| Video Height/Codec, source duration/container/path | Existing variant and editor/public consumers | Use selected source only; filename from selected source path. [VERIFIED: candidate/writer/public chains] |

Use already installed golang.org/x/text/language for explicit language canonicalization, not a new manual ISO table or locale matcher. Parse errors, blank and und remain unknown; use Tag.Raw rather than Tag.Base because Raw does not infer missing language. Context7 and installed go doc confirm these APIs. Tests must cover actual jpn/deu plus ger/eng, und, blank, malformed and unknown codes. [VERIFIED: backend/go.mod x/text v0.35.0; installed go doc language.Parse/Tag.Raw/Tag.Base; Context7 /golang/text; CITED: https://pkg.go.dev/golang.org/x/text/language#Tag.Raw]

### Public/read and playback coherence

- Refactor loadReleaseTechnical to resolve one variant and one stream source once. Use its typed snapshot for representative audio and every subtitle. Existing null-metadata records retain scalar/legacy language reads scoped to that same variant; preserve public response shape and empty/null states. Do not query tracks from all variants. [VERIFIED: helpers.go:55–74; D-11]
- Carry selected source ID in internal ReleaseStreamSource/ThemeSegmentRenderSource results; build the video request with that mediaSourceId. Subtitle metadata/index must come from the exact same selected source; no item-level fallback. The ffmpeg input URL and downloaded subtitle are therefore for one file. Root research owns authenticated transport. [VERIFIED: episode_version_repository.go:415–450; theme_segment_render_cache.go:227–277; segment_render_worker.go:145–158]
- Include item+source in existing segment SourceIdentity before BuildSegmentRenderCacheKey. Otherwise A and B of one item can reuse the same cached clip. No automatic deletion/regeneration of old cache rows/files during discovery or deployment. [VERIFIED: current external-ID cache comments in theme_segment_playback_resolution.go:34–38; services/segment_render_service.go:70–79; D-10]
- Missing snapshot on existing records must not create an upstream dependency for public metadata. For explicit legacy playback/subtitle actions resolve source at the existing source-aware read boundary, without persisting opportunistically. Newly bound sources should use stored identity directly; runtime detection of stale IDs must fail clearly, not pick B. [VERIFIED: D-10/D-11; existing subtitle Items read]


### Real 11eyes Episode 1 case

The parent executed the user's requested read-only 11eyes test and stored docs/audits/2026-09-15-jellyfin12/discovery-11eyes.json. The inspected S1E1 item 0a927ea6b67379b9f19850464a6b0ab1 has three sources, and the alternatives also appear as standalone episode items. [VERIFIED: discovery-11eyes.json read]

| File | Source ID | Container/audio/subtitles | Item-path relationship |
|---|---|---|---|
| 11eyes.S01E01-B-SH.mkv | 0a927ea6b67379b9f19850464a6b0ab1 | mkv; FLAC jpn index1; ASS deu index2 | Exact own path. |
| 11eyes.S01E01-FlameHazeSubs.mp4 | 784bcddf47e35fb4d0ba911903002f17 | mp4; AAC und index1; no subtitle | Alternate in B-SH, also its own episode item. |
| 11eyes.S01E01-Strawhat.mkv | b0178014fa4e5a8b26f432bb99719372 | mkv; Vorbis jpn index1; ASS deu index2 | Alternate in B-SH, also its own episode item. |

All table values are live response evidence. DefaultAudioStreamIndex was null; audio IsDefault=true. Top-level B-SH Container is mkv,webm while source Container is mkv; the MP4 item container is a multi-container demuxer string while source Container is mp4. This directly supports using nested container and stream metadata instead of copying top-level descriptions. FlameHazeSubs und must remain unknown; the absence of a subtitle stream does not establish hardsub. [VERIFIED: discovery-11eyes.json]

The selected-source resolver should yield three existing item candidates with their own matching source, not expand B-SH into three plus the standalone alternatives (five rows for three files). Each returned series has 27 entries, with specials and ordinary episodes; two series IDs share the 11eyes name. Bind the exact chosen series ID and audit the complete 27-item ID set, duplicate IDs, and normalized selected-source identity set. Never use a title-only first match or collapse distinct fansub files on episode number. The detailed artifact excerpt alone does not prove all 27 selections; require complete-set assertion in the live check/fixture before marking coverage complete. [VERIFIED: discovery-11eyes.json; existing distinct-item mapping rule]

Add TestEpisodeImport11eyes_GroupedAndStandaloneSources with the real shape, replacing private paths by fixture paths. Assert B-SH own source only, FHS own source only, Strawhat own source only, three candidates, und→null, no invented FHS subtitle, and source-order permutations do not change the candidate metadata. Add all-27 selected-pair uniqueness and expected episode/special counts when the complete sanitized response is available. [VERIFIED: proposed test derived from live source structure]

## Performance evidence and budgets

Live batch evidence: 13 episodes, one MediaSource each, three nested streams each; MediaSources+MediaStreams+Path request returns the needed metadata in one response. Root measured 93,470 bytes versus 50,298 previously. This verifies batch viability for that fixture, not library scan stability or every library. [VERIFIED: docs/audits/2026-09-15-jellyfin12/discovery-live.json; coordinating-agent measured request sizes]

| Operation | Before | Proposed |
|---|---|---|
| Preview episode listing | 1 episode batch (+ existing independent series/AniSearch lookups) | Same 1 batch, richer fields; pagination only if semantic audit requires it. |
| Apply Jellyfin validation | 0 | 1 bounded ID batch, or bounded chunks; no source/stream fan-out. |
| Existing binding hydration | Existing coverage query | One batch for all selected item bindings; no per-item external calls. |
| Subtitle selection/render | 1 Items metadata + at most 1 subtitle download | Same count; source-coherent nested tracks and selected source ID. |
| Public metadata | DB-only | DB-only, same selected snapshot; no upstream requests. |

Counts are based on current inspected call graph and the proposed design, not a completed implementation benchmark. [VERIFIED: admin_episode_import.go:70–84,114–125,342; segment_render_subtitles.go:42,58,122; public helper]

## Test seams and exact acceptance matrix

Existing tests use Go testing/httptest, pgx fixtures and Vitest; current import tests mainly test in-memory plan helpers/source-text guards, not actual container/track persistence. Use executable repository assertions for this bug, not more grep-only tests. [VERIFIED: backend/internal/repository/episode_import_repository_test.go; episode_import_repository_release_helpers_test.go; handlers/admin_episode_import_test.go; frontend package.json]

| Proposed test | Existing file/seam to reuse | Proof |
|---|---|---|
| TestResolveJellyfinMediaSource_CoherentAndReordered | new focused handlers/jellyfin_media_source_test.go beside shared resolver; jellyfin_client_test.go | A=MKV/ja/de and B=MP4/de/en; poison top-level fields; reorder sources; selected source unchanged, no mixed codec/language/container. |
| TestResolveJellyfinMediaSource_StoredBindingNeverFallsThrough | same resolver test | Stored A missing + sole B → conflict; A ID changed with same unique stored path → same-file recovery; duplicate IDs/paths, missing source, wrong item → failure. |
| TestEpisodeImportMediaCandidates_UsesBatchedSources | admin_episode_import_test.go + httptest | Valid field list; one metadata request for many items; source path filter and selected filename; no stream/source requests. |
| TestApplyEpisodeImport_RejectsStaleOrTamperedSource | existing apply handler validation seam + httptest fake repo | Reject mismatched source ID; refresh posted metadata in one batch; zero repository writes on missing/conflicting source. |
| TestEpisodeImportSourceSnapshot_PersistAndRepeat | new repository/episode_import_source_integration_test.go, reuse fixture below | Apply A, assert DB container/codecs/snapshot source ID/languages; reapply ordered differently; unchanged graph counts/ownership, no duplicate normalized streams. |
| TestEpisodeVersionMetadataPatch_PreservesSourceTechnicalFields | episode_version_dates_integration_test.go / public fixture | Seed real filename/container/snapshot then title-only, quality, subtitle, CRC, duration, date updates; technical identity survives. Explicit source relink updates all source-owned metadata. |
| TestPublicReleaseTechnical_OneVariantAndUnknownLanguage | release_detail_public_segments_integration_test.go fixture/helper | Multiple variants with contrasting streams; scalar metadata and every subtitle from same chosen variant; unknown-language ASS retained with correct flags/codec. |
| TestResolveSegmentSubtitle_UsesStoredSource | segment_render_subtitles_test.go | Download path item/source-A/index-A; no call for B index; missing requested item cannot use first item; source reorder stable. |
| TestSegmentSourceIdentity_IncludesMediaSource | segment_playback_resolution_test.go; theme_segment_playback_resolution_integration_test.go; segment_render_service_test.go | Same item A/B produces distinct cache key; query returns correct selected source, explicit variant ownership preserved. |
| Import round trip + unchanged UI | frontend episodeImportMapping.test.ts; EpisodeImportMappingRow.test.tsx; editor tests | Additive source fields survive serialization; row remains keyed by item; no duplicate alternative rows; metadata-only save preserves source fields. |
| Protected refresh regression | frontend/src/lib/api.auth-session.test.ts if present, otherwise existing central refresh tests found by planner | Expired/absent access token + valid refresh session still uses central seam; no raw bearer/storage ownership in UI. |

These test names/files are proposed additions unless identified above as existing; no claim they already pass. [VERIFIED: recommendation grounded in existing test infrastructure and D-12]

### Isolated PostgreSQL execution

Reuse testsupport.OpenPhase117Postgres/openPhasePostgres rather than application DATABASE_URL. It requires TEAM4S_PHASE117_TEST_DSN with database matching team4s_phase117_test_[a-z0-9]+, creates a unique schema, sets search_path to that schema alone, verifies current_database/current_schemas, and cleans only its own schema. openEpisodeVersionPublicFixture already adds container/filename/codecs and stream identity scaffolding; extend it with metadata JSONB and the minimal canonical import prerequisites. [VERIFIED: testsupport/phase117_postgres.go:14–33; phase106_postgres.go:41–126; repository/episode_version_public_integration_test.go:47–116]

The import graph also touches episode types/filler types/languages, release sources, group links and assignment locks; the small public fixture alone is not a full Apply fixture. Reuse the guarded framework and add only the necessary prerequisites or focused migration artifacts inside the isolated schema. Do not point existing broad integration tests at the live app database. [VERIFIED: episode_import_repository_apply.go:30–48,152–247; release_helpers.go:100–117; existing fixture contents]

Planned quick command: docker compose exec -T team4sv30-backend go test ./internal/handlers ./internal/repository ./internal/services -run 'Test.*(JellyfinMediaSource|EpisodeImport|SourceSnapshot|SourceTechnicalFields|ResolveSegmentSubtitle|SegmentSourceIdentity|PublicReleaseTechnical)' -count=1. Run guarded PostgreSQL tests with the explicit dedicated DSN and report skipped tests as unexecuted, not green persistence proof. Existing frontend targets run with npm exec vitest -- run and exact existing file paths; typecheck/lint/build and git diff --check remain phase-level gates owned by the planner. [VERIFIED: project AGENTS validation; installed Go/Vitest; test guards]

## Environment, validation performed and limits

- Canonical SSH Linux repo verified; Compose backend/frontend/PostgreSQL/Redis/Keycloak/Mailpit running. Go=1.25.13; installed Vitest=3.2.4 on Node=20.20.2. No new application dependency is recommended; x/text v0.35.0 already exists. [VERIFIED: docker compose ps; go version; npm exec vitest -- --version; backend/go.mod]
- Context7 MCP unavailable; CLI fallback resolved /golang/text and verified Parse/Raw/ISO alias behavior. Its transient npm CLI warned commander wants Node >=22.12 but both doc commands completed on the container's Node20; no host runtime install performed. Official Go docs and installed go doc corroborated the needed APIs. [VERIFIED: tool outputs]
- PASS: docker compose exec -T team4sv30-backend go test ./internal/handlers -run '^(TestPreviewEpisodeImport_.*|TestFilterAlreadyMappedCandidates_.*|TestMapJellyfinMediaStreamsToSegmentProbe|TestResolveSegmentSubtitle_.*)$' -count=1 (0.013s). [VERIFIED: executed 2026-09-15]
- PASS: docker compose exec -T team4sv30-backend go test ./internal/repository -run '^(TestEpisodeImportApply_.*|TestEpisodeImportDisplayTitle_.*|TestEpisodeImportReleaseGraphHelpers_.*)$' -count=1 (0.011s). These are current unit/source-contract tests, not database persistence proof. An earlier TestBuildEpisodeImportApplyPlan pattern matched no tests and was corrected. [VERIFIED: executed output; file contents]
- No database rows, schemas, migrations, media files, runtime registration, or cache entries were changed by this subtask. No live library scan or playback/render was triggered by this subtask; the parent subsequently supplied real 11eyes multi-source read evidence. No implementation files changed. [VERIFIED: read-only command history except this research artifact]

## Runtime state inventory

| Category | Finding/action |
|---|---|
| Stored data | Existing item bindings, variant metadata, stream rows and render caches can retain old semantics. No live row inspection/mutation by this subtask; parent read-only schema audit corroborated stream_sources.metadata=jsonb. Preserve them; test new behavior in isolated DB. [VERIFIED: source/schema references] |
| Live service config | Jellyfin server provides sources; backend has configured connection; no source-specific remote configuration inspected/modified. Scan/reorder claims remain bounded. [VERIFIED: parent sanitized live evidence] |
| OS-registered state | No renamed service/task in this change scope; no OS registration change proposed or performed. [VERIFIED: source-metadata-only scope] |
| Secrets/env | No new variable/secret required by snapshot design; use current configured Jellyfin transport. No secret values read or emitted by this subtask. [VERIFIED: existing handler config and command history] |
| Build artifacts | Existing compiled app unaffected; selected source must join future segment cache identity. Do not delete old cache/media assets as migration. [VERIFIED: services/segment_render_service.go:52–79; D-10] |

## Security and constraints for the planner

Preserve API contract alignment across shared YAML, backend DTOs, frontend types/helpers; server owns source verification and auth; never expose private source path/URL/token in public metadata. Source path is evidence only, and external subtitle path must never become direct filesystem access. Retain item+anime ownership checks, explicit variant ownership, refresh-session UI regression, current degraded editor behavior and scoped transactions. No media tables or release-group ownership move. [VERIFIED: AGENTS.md; docs/api/api-contracts.md; docs/frontend/auth-api-client.md; docs/architecture/db-schema-fansub-domain.md; relevant code seams]

## Bounded implementation sequence

1. Shared typed source resolver and batch response DTO + adversarial fixtures; preserve one row/item and source ownership. [VERIFIED: D-06/D-07]
2. Contract/DTO propagation and atomic snapshot/technical writes; repair generic title→filename/container corruption; repeat-import persistence proof. [VERIFIED: D-08–D-12]
3. Consume same selected source in public projection, editor file selection/relink, subtitle download, video request and segment cache input; targeted regressions. [VERIFIED: D-11/D-12]
4. Main phase performs auth/API/GetItems live proof and before/after request counts; this subtask does not replace those gates. [VERIFIED: D-03–D-05/D-13/D-15]

## Open evidence gaps and assumptions

No claim that source ID/path survives every scan, move or replacement is made. A real 11eyes multi-source sample was subsequently observed; see the live case below. The inspected detailed subset does not by itself prove semantic coverage of every one of the 27 returned entries. The no-schema scheme deliberately preserves current one-selected-source-per-item semantics; simultaneous alternative bindings are outside that choice. Actual apply/public/playback coherence and metadata retention require the new tests above. No library upgrade or schema expansion is justified by this research. [VERIFIED: inspected evidence bounds and design]

Assumptions requiring a locked product choice: none added. The resolver conflict/recovery and snapshot format are proposed implementation mechanics for the existing constraints; they must be documented in the phase plan/decision record. [VERIFIED: scope agreement and D-07/D-10]

## Sources

- Canonical Linux files and numbered references throughout; baseline source revision b3b07ff0 reported in 161-CONTEXT.md. [VERIFIED: context and code reads]
- docs/audits/2026-09-15-jellyfin12/discovery-live.json — sanitized live single-source episode batch, real unknown language. [VERIFIED: artifact read]
- Context7 /golang/text — Parse/ValueError, Tag.Raw, ISO639 bibliographic aliases; corroborated installed v0.35.0 go doc. [VERIFIED: CLI]
- https://pkg.go.dev/golang.org/x/text/language#Tag.Raw — explicit non-inference API semantics. [CITED: official Go package docs]
- https://raw.githubusercontent.com/jellyfin/jellyfin/master/MediaBrowser.Controller/Entities/BaseItem.cs — source ID, path, own streams/container projection and ordering; inspected current master, not proof of the deployed build's exact source revision. [CITED: official repository]
- https://raw.githubusercontent.com/jellyfin/jellyfin/master/Emby.Server.Implementations/Library/MediaSourceManager.cs — explicit ID resolution and ordering/resume behavior; same version limitation. [CITED: official repository]

## Final live completeness update (supersedes earlier 27-item evidence gap)

The complete live coverage audit confirms 27 unique returned episode items, 38 unique nested source IDs, 11 source IDs absent from the item list, and exactly one source.Path=item.Path match for every returned item. The earlier requested all-27 selected-path check is therefore satisfied for this response; complete alternative-file coverage is not. [VERIFIED: docs/audits/2026-09-15-jellyfin12/discovery-11eyes-coverage.json]

Classify **P2 inventory limitation / explicit semantic check**, not proven cross-source corruption: the existing one-candidate-per-item preview can represent the 27 returned own files coherently but does not enumerate the 11 other nested alternatives. Do not expand every nested source and duplicate the standalone items. Do not claim 27 rows covers 38 files. [VERIFIED: coverage counts; existing candidate loop admin_episode_import.go:349–373]

The no-schema recommendation still covers deterministic source selection for current returned items. If the required import inventory includes all files, test the missing source IDs in ONE bounded /Items?Ids=... batch with exact returned-ID checks and real episode/series/path ownership. Only sources that resolve to their own genuine Jellyfin item may be added as independent existing-shaped item candidates. Source ID is not universally guaranteed to be a BaseItem ID, and an unresolved alternate must remain explicit incomplete/conflict evidence, never be assigned a fabricated item ID. The parent owns that additional live query and final inventory conclusion. [VERIFIED: missing-ID set and source-vs-item distinction in Jellyfin schema; proposed bounded resolution strategy]

Reuse the actual sanitized fixture docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-episode1.json instead of fabricating the full Episode1 shape. Add assertions for its three distinct own-item candidates, contrasted containers, FHS und/no subtitles, and response reordering. A separate full-inventory fixture must cover the 27/38/11 relationship and deduplication if the phase adds missing-item batch discovery. [VERIFIED: fixture inspected; proposed tests]

### Final completeness probe result

The additional real /Items?Ids=<11 missing source IDs> batch returned HTTP200 with Items=[] and TotalRecordCount=0; recursive Episode GetItems still returned the same 27 items/Total27. Therefore the proposed additional item-candidate resolution does not work for these 11 sources and must not be implemented as if their IDs were item IDs. [VERIFIED: coordinating-agent live result; docs/audits/2026-09-15-jellyfin12/discovery-11eyes-completeness.json]

**Final phase boundary:** select and preserve the correct source for each of the 27 actual item bindings; do not claim that all 38 alternative source files are imported. Preserve Jellyfin Item ID and MediaSource ID as separate values everywhere. The user requested deterministic selection, not automatic expansion of every source; importing those 11 additional alternatives independently would require an explicit later scope/identity decision. No extra source-ID discovery requests are recommended after this failed equivalence probe. [VERIFIED: full user request sections5–10; live completeness probe]
