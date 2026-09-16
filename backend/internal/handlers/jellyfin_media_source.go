package handlers

import (
	"cmp"
	"fmt"
	"path"
	"slices"
	"strings"

	"golang.org/x/text/language"

	"team4s.v3/backend/internal/models"
)

// resolvedJellyfinMediaSource is server-only: source paths never belong in a
// public response. All technical values describe Snapshot.MediaSourceID.
type resolvedJellyfinMediaSource struct {
	FileSizeBytes   *int64
	ChapterHints    []models.EpisodeVersionChapterHint
	JellyfinItemID  string
	Snapshot        models.JellyfinSourceSnapshot
	FileName        string
	Container       *string
	VideoCodec      *string
	AudioCodec      *string
	VideoQuality    *string
	DurationSeconds *int32
	MediaStreams    []jellyfinMediaStream
}

// jellyfinMediaSourceConflict deliberately excludes private paths and upstream
// payloads. Callers decide how to present missing versus ambiguous bindings.
type jellyfinMediaSourceConflict struct {
	Kind   string
	Reason string
}

func (e *jellyfinMediaSourceConflict) Error() string {
	return fmt.Sprintf("jellyfin source %s: %s", e.Kind, e.Reason)
}

func resolveJellyfinMediaSource(item jellyfinEpisodeItem, stored *models.JellyfinSourceSnapshot) (resolvedJellyfinMediaSource, error) {
	return resolveJellyfinMediaSourceSelection(item, "", stored)
}

// An explicit selector is authoritative only after membership validation below.
// Retention is restricted to the exact same physical source, never a sibling.
func resolveJellyfinMediaSourceSelection(item jellyfinEpisodeItem, selector string, stored *models.JellyfinSourceSnapshot) (resolvedJellyfinMediaSource, error) {
	conflict := func(kind, reason string) (resolvedJellyfinMediaSource, error) {
		return resolvedJellyfinMediaSource{}, &jellyfinMediaSourceConflict{Kind: kind, Reason: reason}
	}
	if strings.TrimSpace(item.ID) == "" {
		return conflict("missing", "item identity absent")
	}
	sources := make([]jellyfinMediaSource, 0, len(item.MediaSources))
	seen := make(map[string]bool, len(item.MediaSources))
	for _, source := range item.MediaSources {
		source.ID = strings.TrimSpace(source.ID)
		if source.ID == "" {
			return conflict("missing", "source identity absent")
		}
		if seen[source.ID] {
			return conflict("ambiguous", "duplicate source identity")
		}
		seen[source.ID] = true
		source.Path = normalizeJellyfinSourcePath(source.Path)
		sources = append(sources, source)
	}
	if len(sources) == 0 {
		return conflict("missing", "no media source")
	}
	selected := -1
	if selector != "" {
		for i, source := range sources {
			if source.ID == selector {
				selected = i
				break
			}
		}
		if selected < 0 {
			return conflict("missing", "reviewed source is no longer a member of this item")
		}
		if stored != nil && stored.MediaSourceID != selector {
			stored = nil
		}
	}
	if selected < 0 && stored != nil {
		for i, source := range sources {
			if source.ID == strings.TrimSpace(stored.MediaSourceID) {
				selected = i
				break
			}
		}
	}
	if selected < 0 {
		wantedPath := normalizeJellyfinSourcePath(item.Path)
		if stored != nil {
			wantedPath = normalizeJellyfinSourcePath(stored.SourcePath)
		}
		if wantedPath != "" {
			for i, source := range sources {
				if source.Path != wantedPath {
					continue
				}
				if selected >= 0 {
					return conflict("ambiguous", "multiple full path matches")
				}
				selected = i
			}
		}
	}
	if selected < 0 {
		if stored != nil {
			return conflict("missing", "stored source binding lost")
		}
		if len(sources) != 1 {
			return conflict("ambiguous", "no unique own source")
		}
		selected = 0
	}
	source := sources[selected]
	if selector != "" && stored != nil && normalizeJellyfinSourcePath(stored.SourcePath) != source.Path {
		return conflict("ambiguous", "stored source path changed")
	}
	result := resolvedJellyfinMediaSource{
		JellyfinItemID: strings.TrimSpace(item.ID),
		Snapshot: models.JellyfinSourceSnapshot{
			Version: 1, MediaSourceID: source.ID, SourcePath: source.Path,
			StreamsComplete: source.MediaStreams != nil,
			AudioTracks:     []models.JellyfinAudioTrack{}, SubtitleTracks: []models.JellyfinSubtitleTrack{},
		},
		Container:       jellyfinSourceString(source.Container),
		DurationSeconds: jellyfinRuntimeTicksToSeconds(source.RunTimeTicks),
	}
	if source.Size != nil && *source.Size > 0 {
		result.FileSizeBytes = source.Size
	}
	result.ChapterHints = resolveJellyfinChapterHints(item, source)
	if source.Path != "" {
		result.FileName = path.Base(source.Path)
		matches := 0
		for _, candidate := range sources {
			if candidate.Path != "" && path.Base(candidate.Path) == result.FileName {
				matches++
			}
		}
		result.Snapshot.SourceFileNameUnique = matches == 1
	}
	if source.MediaStreams == nil {
		// Retention happens only after the stored ID or unique stored full path
		// selected this logical binding. A lost A binding can never retain tracks on B.
		// StreamsComplete stays false: these are retained tracks, not a fresh scan.
		if stored != nil {
			result.Snapshot.AudioTracks = append(result.Snapshot.AudioTracks, stored.AudioTracks...)
			result.Snapshot.SubtitleTracks = append(result.Snapshot.SubtitleTracks, stored.SubtitleTracks...)
			if stored.SelectedAudioIndex != nil {
				index := *stored.SelectedAudioIndex
				result.Snapshot.SelectedAudioIndex = &index
			}
			setJellyfinResolvedAudioCodec(&result)
		}
		return result, nil
	}
	result.MediaStreams = make([]jellyfinMediaStream, 0, len(source.MediaStreams))
	streamIndices := make(map[int32]bool, len(source.MediaStreams))
	for _, stream := range source.MediaStreams {
		if stream.Index < 0 {
			continue
		}
		if streamIndices[stream.Index] {
			return conflict("ambiguous", "duplicate stream index")
		}
		streamIndices[stream.Index] = true
		result.MediaStreams = append(result.MediaStreams, stream)
	}
	slices.SortFunc(result.MediaStreams, func(a, b jellyfinMediaStream) int { return cmp.Compare(a.Index, b.Index) })
	for _, stream := range result.MediaStreams {
		codec := strings.ToLower(strings.TrimSpace(stream.Codec))
		switch strings.ToLower(strings.TrimSpace(stream.Type)) {
		case "audio":
			result.Snapshot.AudioTracks = append(result.Snapshot.AudioTracks, models.JellyfinAudioTrack{
				Index: stream.Index, Codec: codec, Language: normalizeJellyfinSourceLanguage(stream.Language), IsDefault: stream.IsDefault,
			})
		case "subtitle":
			result.Snapshot.SubtitleTracks = append(result.Snapshot.SubtitleTracks, models.JellyfinSubtitleTrack{
				Index: stream.Index, Codec: codec, Language: normalizeJellyfinSourceLanguage(stream.Language),
				DisplayTitle: strings.TrimSpace(stream.DisplayTitle), IsDefault: stream.IsDefault, IsForced: stream.IsForced,
			})
		}
	}
	// Existing helpers are deterministic here because streams are sorted by index.
	result.VideoCodec = jellyfinStreamCodec(result.MediaStreams, "Video")
	result.VideoQuality = jellyfinVideoQuality(result.MediaStreams)
	selectedAudio := -1
	for i, track := range result.Snapshot.AudioTracks {
		if source.DefaultAudioStreamIndex != nil && track.Index == *source.DefaultAudioStreamIndex {
			selectedAudio = i
			break
		}
	}
	if selectedAudio < 0 {
		for i, track := range result.Snapshot.AudioTracks {
			if track.IsDefault {
				selectedAudio = i
				break
			}
		}
	}
	if selectedAudio < 0 && len(result.Snapshot.AudioTracks) > 0 {
		selectedAudio = 0
	}
	if selectedAudio >= 0 {
		index := result.Snapshot.AudioTracks[selectedAudio].Index
		result.Snapshot.SelectedAudioIndex = &index
		setJellyfinResolvedAudioCodec(&result)
	}
	return result, nil
}

func setJellyfinResolvedAudioCodec(result *resolvedJellyfinMediaSource) {
	if result.Snapshot.SelectedAudioIndex == nil {
		return
	}
	for _, track := range result.Snapshot.AudioTracks {
		if track.Index == *result.Snapshot.SelectedAudioIndex {
			result.AudioCodec = jellyfinSourceString(track.Codec)
			return
		}
	}
}

// Unlike folder filters, source identity is case-sensitive. Do not clean dot
// segments, fold case, compare basenames or access the filesystem here.
func normalizeJellyfinSourcePath(raw string) string {
	return strings.ReplaceAll(strings.TrimSpace(raw), "\\", "/")
}

func jellyfinSourceString(raw string) *string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil
	}
	return &value
}

// Raw prevents language inference from script/region; Parse errors and und stay
// null. D-16's Japanese audio fallback belongs only in the public display.
func normalizeJellyfinSourceLanguage(raw string) *string {
	tag, err := language.Parse(strings.TrimSpace(raw))
	if err != nil {
		return nil
	}
	base, _, _ := tag.Raw()
	value := base.String()
	if value == "und" {
		return nil
	}
	return &value
}

// Item chapters describe only the unique own-path source, never an alternate.
// Raw ticks remain int64 for validation and stable ordering; only the display DTO loses sub-ms remainder.
func resolveJellyfinChapterHints(item jellyfinEpisodeItem, source jellyfinMediaSource) []models.EpisodeVersionChapterHint {
	ownPath := normalizeJellyfinSourcePath(item.Path)
	if ownPath == "" || source.Path != ownPath || item.Chapters == nil || len(item.Chapters) > 256 {
		return nil
	}
	matches := 0
	for _, candidate := range item.MediaSources {
		if normalizeJellyfinSourcePath(candidate.Path) == ownPath {
			matches++
		}
	}
	if matches != 1 {
		return nil
	}
	if len(item.Chapters) == 0 {
		return []models.EpisodeVersionChapterHint{}
	}
	if source.RunTimeTicks == nil || *source.RunTimeTicks <= 0 {
		return nil
	}
	valid := make([]jellyfinChapter, 0, len(item.Chapters))
	for _, chapter := range item.Chapters {
		if chapter.StartPositionTicks != nil && *chapter.StartPositionTicks >= 0 && *chapter.StartPositionTicks <= *source.RunTimeTicks {
			valid = append(valid, chapter)
		}
	}
	if len(valid) == 0 {
		return nil
	}
	slices.SortStableFunc(valid, func(a, b jellyfinChapter) int { return cmp.Compare(*a.StartPositionTicks, *b.StartPositionTicks) })
	hints := make([]models.EpisodeVersionChapterHint, 0, len(valid))
	for _, chapter := range valid {
		hints = append(hints, models.EpisodeVersionChapterHint{Name: chapter.Name, StartMS: *chapter.StartPositionTicks / 10_000})
	}
	return hints
}

// jellyfinImportSource retains the genuine Item for episode evidence and private
// aliases used solely to resolve existing, previously unselected bindings.
type jellyfinImportSource struct {
	Item    jellyfinEpisodeItem
	Source  resolvedJellyfinMediaSource
	ItemIDs []string
}

func enumerateJellyfinMediaSources(items []jellyfinEpisodeItem, folder string, bindings map[models.JellyfinSourceKey]models.JellyfinSourceSnapshot) ([]jellyfinImportSource, error) {
	bySource := make(map[string]jellyfinImportSource)
	for _, item := range items {
		if strings.TrimSpace(item.ID) == "" {
			return nil, &jellyfinMediaSourceConflict{Kind: "missing", Reason: "item identity absent"}
		}
		if folder != "" && !jellyfinPathHasPrefix(item.Path, folder) {
			continue
		}
		if len(item.MediaSources) == 0 {
			return nil, &jellyfinMediaSourceConflict{Kind: "missing", Reason: "no media source"}
		}
		for _, source := range item.MediaSources {
			var stored *models.JellyfinSourceSnapshot
			if binding, ok := bindings[models.JellyfinSourceKey{ItemID: item.ID, SourceID: source.ID}]; ok {
				stored = &binding
			}
			resolved, err := resolveJellyfinMediaSourceSelection(item, strings.TrimSpace(source.ID), stored)
			if err != nil {
				return nil, err
			}
			if folder != "" && !jellyfinPathHasPrefix(resolved.Snapshot.SourcePath, folder) {
				continue
			}
			next := jellyfinImportSource{Item: item, Source: resolved, ItemIDs: []string{item.ID}}
			if old, ok := bySource[resolved.Snapshot.MediaSourceID]; ok {
				if old.Source.Snapshot.SourcePath == "" || old.Source.Snapshot.SourcePath != resolved.Snapshot.SourcePath ||
					jellyfinEpisodeNumber(old.Item.IndexNumber) != jellyfinEpisodeNumber(item.IndexNumber) || jellyfinSeasonNumber(old.Item.ParentIndexNumber) != jellyfinSeasonNumber(item.ParentIndexNumber) || old.Item.SeriesID != item.SeriesID {
					return nil, &jellyfinMediaSourceConflict{Kind: "ambiguous", Reason: "source aliases disagree about physical or episode ownership"}
				}
				aliases := append(old.ItemIDs, item.ID)
				oldOwn := old.Item.ID == resolved.Snapshot.MediaSourceID
				nextOwn := item.ID == resolved.Snapshot.MediaSourceID
				if oldOwn || (!nextOwn && old.Item.ID < item.ID) {
					next = old
				}
				next.ItemIDs = aliases
			}
			bySource[resolved.Snapshot.MediaSourceID] = next
		}
	}
	result := make([]jellyfinImportSource, 0, len(bySource))
	for _, source := range bySource {
		slices.Sort(source.ItemIDs)
		source.ItemIDs = slices.Compact(source.ItemIDs)
		result = append(result, source)
	}
	slices.SortFunc(result, func(a, b jellyfinImportSource) int {
		if order := cmp.Compare(jellyfinEpisodeNumber(a.Item.IndexNumber), jellyfinEpisodeNumber(b.Item.IndexNumber)); order != 0 {
			return order
		}
		if order := cmp.Compare(strings.ToLower(a.Source.FileName), strings.ToLower(b.Source.FileName)); order != 0 {
			return order
		}
		return cmp.Compare(a.Source.Snapshot.MediaSourceID, b.Source.Snapshot.MediaSourceID)
	})
	return result, nil
}
