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
	if stored != nil {
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
	if source.Path != "" {
		result.FileName = path.Base(source.Path)
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
