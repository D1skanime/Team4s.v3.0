# Jellyfin callers and request inventory (discovery)

Baseline b3b07ff0; 2026-09-15. Canonical Linux tree; no code changes at discovery. All network callsites in backend/internal were searched (httpClient.Do, http.NewRequestWithContext, provider URL builders and ffmpeg input). Nine direct Go HTTP execution callsites are Jellyfin-capable, plus FFmpeg as an indirect HTTP consumer. EpisodePlaybackHandler is separate Emby-only, not part of those nine.

## Logical request families

All below GET unless stated. Auth before: api_key query except listed non-Jellyfin exclusion. Tests alone do not prove upstream compatibility.

| Area | File/function (backend/internal/handlers unless qualified) | Endpoint | Query / constraints |
|---|---|---|---|
| Intake title search | jellyfin_client_series.go searchJellyfinSeries | /Items | IncludeItemTypes=Series; Recursive=true; SearchTerm; Limit; Fields=Path,ProductionYear,Overview; one request per allowed library with ParentId, dedup IDs |
| Series lookup | jellyfin_client_series.go getJellyfinSeriesByID | /Items | Ids; IncludeItemTypes=Series; Recursive=true; Limit=1; Fields=Path,ProductionYear,Overview |
| Intake/resync details | jellyfin_client_series.go getJellyfinSeriesIntakeDetail | /Items | same identity filter; Fields=Path,ProductionYear,Overview,ProviderIds,Genres,Tags,ImageTags,BackdropImageTags |
| Episode import, sync, editor scan | jellyfin_client.go listJellyfinEpisodes | /Shows/{seriesId}/Episodes | Fields=MediaStreams,Path,RunTimeTicks; EnableUserData=false; single collection request |
| Editor runtime lookup | jellyfin_client.go getJellyfinEpisodeDurationSeconds | /Items | Ids; Limit=1; Fields=RunTimeTicks |
| Admin theme lookup | jellyfin_client.go listJellyfinThemeVideoIDs | /Items/{itemId}/ThemeVideos | no query |
| Segment stream metadata | segment_render_subtitles.go getJellyfinItemMediaStreams | /Items | Ids; Limit=1; Fields=MediaStreams,MediaSources |
| Public artwork series resolution | anime_backdrops_resolution.go searchJellyfinSeries | /Items | IncludeItemTypes=Series; Recursive=true; SearchTerm; Limit |
| Public theme-video probe | anime_backdrops_probe.go probeJellyfinThemeVideoProxyURLs | /Items/{itemId}/ThemeVideos | no query |
| Public logo/banner probe | anime_backdrops_probe.go jellyfinImageExists | /Items/{itemId}/Images/{imageType} | maxWidth=64; quality=35 |
| Public backdrop probe | anime_backdrops_probe.go jellyfinBackdropExists | /Items/{itemId}/Images/Backdrop[/{imageIndex}] | maxWidth=64; quality=35; bounded candidate probing |
| Group library resolution | group_assets_jellyfin.go getGroupAssetsLibraryID | /Library/MediaFolders | no query; cached library ID for 30min |
| Group project roots | group_assets_jellyfin.go findSubgroupRoot -> listPagedGroupItems | /Items | ParentId; Fields=Path,ImageTags,BackdropImageTags; IncludeItemTypes=PhotoAlbum,Folder; Limit=500; StartIndex; Recursive UNSPECIFIED |
| Group recursive contents | group_assets_jellyfin.go listSubgroupChildren | /Items | ParentId; Recursive=true; Limit=200; Fields=Path,Width,Height,ImageTags,RunTimeTicks; no pagination loop |
| Group root details | group_assets_jellyfin.go getGroupItemDetails | /Items/{itemId} | Fields sent although GET contract only specifies itemId/userId |
| Media image proxy | episode_version_media_image.go MediaImage -> fansub_admin.go buildProviderImageURL | /Items/{itemId}/Images/{imageType}[/{imageIndex}] | maxWidth/quality/index; Jellyfin or Emby branch |
| Media video proxy | episode_version_media_video.go MediaVideo -> fansub_admin.go buildProviderStreamURL | /Videos/{itemId}/stream | static=true; Range forwarded; Jellyfin or Emby branch |
| Release playback proxy | episode_version_stream.go StreamRelease -> buildProviderStreamURL | /Videos/{itemId}/stream or stored fallback | static=true; StartTimeTicks optional; Range forwarded; provider context must gate auth |
| Protected asset stream | asset_stream_handler.go StreamAsset | /Videos/{itemId}/stream | Jellyfin config only; static=true; Range forwarded |
| Segment subtitle download | segment_render_subtitles.go downloadJellyfinSubtitle | /Videos/{itemId}/{mediaSourceId}/Subtitles/{index}/Stream.ass | selected subtitle index; currently source chosen by first source |
| Segment FFmpeg input | admin_content_episode_version_editor_helpers.go buildJellyfinEditorStreamURL -> services/segment_render_service.go BuildFFmpegSegmentArgs | /Videos/{itemId}/stream | static=true; source URL currently embeds key; FFmpeg HTTP auth must also migrate without logging argv/header secrets |

## Transport execution seams

1. AdminContentHandler.fetchJellyfinJSON: jellyfin_client.go:201.
2. AnimeHandler.fetchJellyfinJSON: anime_backdrops_client.go:26.
3. AnimeHandler.fetchJellyfinStatus: anime_backdrops_client.go:59.
4. GroupAssetsHandler.fetchGroupAssetsJSON: group_assets_jellyfin.go:368.
5. AdminContentHandler.downloadJellyfinSubtitle: segment_render_subtitles.go:227.
6. FansubHandler.StreamRelease: episode_version_stream.go:76.
7. FansubHandler.MediaImage: episode_version_media_image.go:64.
8. FansubHandler.MediaVideo: episode_version_media_video.go:38.
9. AssetStreamHandler.StreamAsset: asset_stream_handler.go:104.
10. Indirect FFmpeg HTTP input: services/segment_render_service.go.

Existing builders are NOT one shared central client. Reuse a narrow provider-specific request/auth helper, while preserving existing endpoint ownership, decoders, timeouts, contexts and media proxy Range semantics. Same-origin credential handling and redirect behavior need tests; browser requests must not receive the server key. Existing fallback URLs must not receive credentials for another host.

## api_key classification

`docs/audits/2026-09-15-jellyfin12/api-key-occurrences.json` records every tracked grep hit by file/line without including source text or secrets. Mixed fansub builders require provider-aware handling. FanartTVAssetSearchProvider.fetchImages and Emby-only EpisodePlaybackHandler remain unchanged. Existing redaction patterns remain useful for legacy/error input even after Jellyfin URLs no longer include keys. Test fixtures asserting query auth must be changed only for Jellyfin callers; retain Emby/Fanart regression assertions.

## Initial real API evidence

`discovery-live.json`: System/Info and actual production series-search query return401 with old auth,200 with header using same current configured key. /Shows/Episodes returns13BuddyComplex items; adding MediaSources produces nested complete source streams in the same single HTTP request (50,298 ->93,470bytes for this fixture when both item and source streams requested). No per-item media-source requests needed.

GetItems Episode query constrained by series ParentId and Recursive=true returns exactly same13IDs as Shows/Episodes. Pages5+5+3 reproduce whole ordered result and TotalRecordCount13. Search returns one exact BuddyComplex series. Group root query implicitly recurses:3results vs1direct root with Recursive=false; recursive=true reproduces3. These are fixture observations, not an entire-library or historical10.11 comparison.

OpenAPI from running Jellyfin12.0: sha256 cdef16618df86801230b5767ee42628fc5cf6c1c752aaf103ab652e05d25f672. GET /Items/{itemId} exists and is not obsolete; do not invent a removed-route failure. Existing invalid ItemFields entries ProductionYear,RunTimeTicks,ImageTags,BackdropImageTags are silentlyignored200 in sampled requests; use real enum fields and default-returned DTO fields deliberately. Source.Container=mkv while item-level Container can be mkv,webm; import actual chosen source container.

Initial focused backend baseline: docker exec -w /app team4sv30-backend go test ./internal/handlers -run 'Test.*(Jellyfin|MediaProxy|GroupAssets|Subtitle|EpisodeImport)' -count=1 => PASS before any code change.
