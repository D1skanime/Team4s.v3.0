---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
type: bounded-followup-discovery
date: 2026-09-15
status: research-only
---

# Selected-file chapters and missing file size

Scope: discovery only for the user's requested chapter-time choices during segment creation and the existing file-size display. No application implementation, rescan, import, save, playback, migration or app-row write was performed.

## Verified provider evidence

Read the running Jellyfin OpenAPI through the existing `scripts/check-jellyfin12.py` configuration/Probe boundary, then one exact-ID batched GET for the two already identified current items. Total: **2 read-only GETs**, both 200, no failures; no redirects or credentials in URLs/output.

| Running schema | Verified fields |
| --- | --- |
| BaseItemDto | `Chapters: ChapterInfo[] | null`, `Path`, `MediaSources`, `RunTimeTicks` |
| ChapterInfo | `StartPositionTicks: int64`, `Name: string | null` |
| MediaSourceInfo | `Size: int64 | null`, `Path`, `RunTimeTicks`; **no Chapters property** |
| ItemFields | Explicit `Chapters`, `MediaSources` and `Path` fields supported |

OpenAPI response SHA256: `cdef16618df86801230b5767ee42628fc5cf6c1c752aaf103ab652e05d25f672`.
Exact-item response SHA256: `e5af3130ec786e246bea6153586775fe6f784434223d94164334928fc57d3007`.
No raw response, private path, provider URL or secret is copied into this document.

| Actual selected file | Source evidence | Size | Chapter evidence |
| --- | --- | --- | --- |
| Editor variant 28 / episode 2 | Exactly one source; selected source uniquely matches Item.Path | 516,683,140 bytes | 4 item-level chapters; starts 0, 17.934, 117.951, 1344.926 seconds |
| Public release 48 / episode 12 | Exactly one source; selected source uniquely matches Item.Path | 613,136,455 bytes | 5 item-level chapters; starts 0, 72.948, 163.038, 1334.959, 1414.955 seconds |

The episode 12 item contains the chapter label `Buddy Folge 09` at 163.038s. **Chapter labels are provider-supplied descriptions, not episode/file identity.** The user's sample starts `Buddy Folge 09` at zero, ending 21:38.047 (1298.047s), preview 22:58.043 (1378.043s). Those timings differ from the examined release 48. Do not pretend they describe the same file or infer a segment type/episode from the label.

The earlier safe root evidence in `docs/audits/2026-09-15-jellyfin12/current-release-metadata.json` independently establishes both selected-source Size values. Both current rows lack persisted source snapshots; unique current path/source evidence is available from the exact GET.

## Why the current size says n/a

This is an unwired projection, not missing provider metadata:

1. `backend/internal/handlers/jellyfin_client.go:jellyfinMediaSource` currently does not decode `Size`.
2. `jellyfin_media_source.go:resolvedJellyfinMediaSource` and `admin_content_episode_version_editor_scan.go:buildEpisodeVersionMediaFiles` do not carry selected-source size.
3. The existing `models.EpisodeVersionMediaFile.FileSizeBytes` / frontend `file_size_bytes` contract already supports it.
4. The initial editor file comes from `episodeVersionEditorUtils.ts:buildFallbackMediaFile`, which synthesizes title/item/folder fields and has no real selected-file metadata.
5. `EpisodeVersionEditorPage.tsx` already renders `formatBytes(editor.selectedFile.file_size_bytes)`; `formatBytes` intentionally displays n/a for absent/nonpositive values.

Size belongs directly to the selected MediaSource and can be mapped even when that selected source is an alternate. Do not restore filesystem stat calls against provider paths, use item-level Size, or derive it from bitrate/duration.

## Minimal reusable path (proposal, not implemented)

- Extend existing typed provider DTO/resolver to carry selected-source `Size` and item chapters. Reuse `resolveJellyfinMediaSource`, exact-ID batching and current stored `version.JellyfinSource`; do not build another selector.
- Extend the existing authorized editor-context DTO with an optional real `selected_file` using the existing EpisodeVersionMediaFile shape. Map Size into its existing `file_size_bytes`; add only the explicitly documented chapter-choice fields needed by the UI. Reuse it as the initial selected-file value; retain current fallback when enrichment is unavailable.
- Reuse `loadEpisodeVersionEditorContext`'s current optional duration enrichment for **one** exact-item lookup that supplies duration, real filename, size and chapter choices together. It currently performs a series/folder request and only retrieves the file when duration is absent. The proposal adds at most one file GET when duration is already known, and replaces that existing duration GET otherwise.
- Keep the existing degraded context behavior: ordinary editing remains available if Jellyfin fails. Normal metadata saves still make zero Jellyfin calls. No snapshot persistence, backfill or new DB columns are needed for these advisory read values.
- Reuse existing `getEpisodeVersionEditorContext` in `frontend/src/lib/api.ts` and the central authorizedFetch/refresh boundary. Its existing admin versus contributor branches must remain; do not leak selected paths/source IDs into the sanitized contributor context.
- Existing file scan can map Size from its already loaded selected sources at **zero extra GETs**. Requesting chapter fields on a shared batch must not add per-item requests; keep the selected-file read separate from scanning the entire series merely to open the segment drawer.

Suggested consumer chain:

`EpisodeVersionEditorContext.selected_file → useEpisodeVersionEditor → EpisodeVersionEditorPage → SegmenteTab → SegmentEditPanel → SegmentBasicFieldsSection`.

`SegmenteTab.openAddPanel` already initializes Start/End and `SegmentBasicFieldsSection` already owns both time inputs. Reuse the global `components/ui/Select.tsx` beside those controls to offer a chapter as Start or End, changing form state only. Preserve explicit Save, manual input, maximum window and runtime checks. No automatic segment creation, automatic OP/ED classification, new drawer or new control registry is needed.

For this request, the narrow consumer is **creating a segment on the current persisted release variant**. Do not silently apply current-file chapters to a shared segment's other origin/base time or uploaded/theme-library file. An unsaved local file choice must not supply B's chapter times to a segment still attached to persisted A; invalidate choices on route/binding changes and use the canonical saved context.

## Mandatory source guard

Jellyfin item chapters are not a MediaSource-specific chapter API. A chapter list is eligible only when the exact returned item matches the requested real item and the resolver's selected source has a nonempty normalized path equal to Item.Path, with a **unique** source matching that path. Apply existing anime/folder ownership checks as well.

For a stored alternate whose path differs from Item.Path, ambiguous identical paths, missing paths, missing item, or lost binding: **do not borrow item chapters**. Size can still be provided from a valid selected source. Represent unavailable/unsafe chapter evidence separately from a known empty list, using a small documented nullable field rather than pretending there are no chapters. No extra sibling discovery by title, filename, episode number or source ID.

This is an inference from the running schema and exact path/source evidence; the schema does not assert that alternate-source chapters are interchangeable. A broader per-alternate extraction path would be a separate scope.

## Precision is the material planning boundary

Current segment timing is whole seconds:

- `SegmenteTab.helpers.tsx:parseFlexibleTimeInput` uses parseInt, silently truncating fractional seconds.
- `SegmenteTab.formHelpers.ts:validateSegmentFormInput` and save serialization reuse it.
- `admin_content_anime_theme_segments.go:parseClockToSeconds` uses Atoi and returns int32.
- `models.ThemeSegmentRenderSource`, playback offset DTOs and `services.SegmentRenderWindow` / `SegmentRenderCommandInput` carry int32 seconds; cache hashing serializes integer seconds.

A picker alone cannot honestly preserve the user's .047/.043 timings. **Do not silently truncate/round them.** A follow-up must explicitly decide whether to retain the existing whole-second contract with visible, agreed rounding, or support exact millisecond boundaries through parsing, validation, playback/render/cache and relevant contracts. Millisecond precision is not established by the current code. Research does not authorize a schema change or decide that product tradeoff.

Preserve raw ticks during decoding until the representation/rounding rule is chosen; zero is a valid chapter start, missing/negative/out-of-runtime positions are not. Chapter names remain inert UI text, never interpreted as instructions or automatic assignments.

## Budgets and tests for the follow-up

Incremental target: **0 new SQL statements** by reusing the already loaded version/binding; **at most 1 exact-file GET per editor context**, shared with duration/size; **0 requests per chapter**, **0 extra scan requests**, **0 writes** from loading or selecting a chapter. Existing series-folder enrichment remains separate. These are proposed budgets, not implementation measurements.

Focused tests should cover source A/B contrast, selected alternate withholding item chapters, reordered sources, unique path match, null/empty/malformed chapter projection, Size from the chosen source, source/route races, unsaved relink, missing/expired access token with valid refresh, provider outage, unchanged raw DTOs, manual values and explicit Save. Precision tests must include the user's 1298.047/1378.043 examples without assuming they belong to release 48. If millisecond rendering is chosen, extend existing cache/FFmpeg timing tests too.

## Scope recommendation

- **Size projection only:** small GSD quick with existing decoder/resolver/editor-context/fallback and scan tests; no redesign or persistence.
- **Chapter-time choices with the supplied millisecond values:** a narrow follow-up plan/phase covering the read contract/source guard and the existing Start/End controls; resolve precision before implementation. Exact millisecond support expands into the existing timing/render/cache contract and should not be hidden inside a cosmetic picker quick.
- Do not append implementation to Phase161's final verification without an explicit follow-up scope. Current work is discovery only.
