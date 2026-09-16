package models

// JellyfinSourceSnapshot is the private jellyfin_source metadata namespace,
// schema version 1. Provider item identity remains stream_sources.external_id.
type JellyfinSourceSnapshot struct {
	// Current complete provider membership proves filename uniqueness when binding
	// a previously unresolved imported row. Never accepted from JSON or persisted.
	SourceFileNameUnique bool                    `json:"-"`
	Version              int                     `json:"version"`
	MediaSourceID        string                  `json:"media_source_id"`
	SourcePath           string                  `json:"source_path"`
	StreamsComplete      bool                    `json:"streams_complete"`
	SelectedAudioIndex   *int32                  `json:"selected_audio_index"`
	AudioTracks          []JellyfinAudioTrack    `json:"audio_tracks"`
	SubtitleTracks       []JellyfinSubtitleTrack `json:"subtitle_tracks"`
}

type JellyfinAudioTrack struct {
	Index     int32   `json:"index"`
	Codec     string  `json:"codec"`
	Language  *string `json:"language"`
	IsDefault bool    `json:"default"`
}

type JellyfinSubtitleTrack struct {
	Index        int32   `json:"index"`
	Codec        string  `json:"codec"`
	Language     *string `json:"language"`
	DisplayTitle string  `json:"display_title"`
	IsDefault    bool    `json:"default"`
	IsForced     bool    `json:"forced"`
}
