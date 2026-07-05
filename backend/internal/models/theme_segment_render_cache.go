package models

import "time"

type ThemeSegmentRenderStatus string

const (
	ThemeSegmentRenderStatusQueued    ThemeSegmentRenderStatus = "queued"
	ThemeSegmentRenderStatusRendering ThemeSegmentRenderStatus = "rendering"
	ThemeSegmentRenderStatusReady     ThemeSegmentRenderStatus = "ready"
	ThemeSegmentRenderStatusFailed    ThemeSegmentRenderStatus = "failed"
	ThemeSegmentRenderStatusStale     ThemeSegmentRenderStatus = "stale"
)

type ThemeSegmentRenderCache struct {
	ID                  int64                    `json:"id"`
	ThemeSegmentID      int64                    `json:"theme_segment_id"`
	PlaybackSourceID    *int64                   `json:"playback_source_id,omitempty"`
	CacheKey            string                   `json:"cache_key"`
	SourceKind          string                   `json:"source_kind"`
	SourceFingerprint   string                   `json:"source_fingerprint"`
	RenderProfile       string                   `json:"render_profile"`
	Status              ThemeSegmentRenderStatus `json:"status"`
	OutputPath          *string                  `json:"output_path,omitempty"`
	MimeType            *string                  `json:"mime_type,omitempty"`
	DurationSeconds     *int32                   `json:"duration_seconds,omitempty"`
	VideoCodec          *string                  `json:"video_codec,omitempty"`
	AudioCodec          *string                  `json:"audio_codec,omitempty"`
	SubtitleStreamIndex *int32                   `json:"subtitle_stream_index,omitempty"`
	SubtitleCodec       *string                  `json:"subtitle_codec,omitempty"`
	ErrorCode           *string                  `json:"error_code,omitempty"`
	ErrorMessage        *string                  `json:"error_message,omitempty"`
	Attempts            int32                    `json:"attempts"`
	QueuedAt            time.Time                `json:"queued_at"`
	StartedAt           *time.Time               `json:"started_at,omitempty"`
	CompletedAt         *time.Time               `json:"completed_at,omitempty"`
	InvalidatedAt       *time.Time               `json:"invalidated_at,omitempty"`
	CreatedAt           time.Time                `json:"created_at"`
	UpdatedAt           time.Time                `json:"updated_at"`
}

type ThemeSegmentRenderCacheUpsertInput struct {
	ThemeSegmentID    int64
	PlaybackSourceID  *int64
	CacheKey          string
	SourceKind        string
	SourceFingerprint string
	RenderProfile     string
}

type ThemeSegmentRenderCacheReadyInput struct {
	CacheKey            string
	OutputPath          string
	MimeType            string
	DurationSeconds     int32
	VideoCodec          string
	AudioCodec          string
	SubtitleStreamIndex *int32
	SubtitleCodec       *string
}
