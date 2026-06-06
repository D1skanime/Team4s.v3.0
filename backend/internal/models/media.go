package models

import "time"

type MediaKind string

const (
	MediaKindLogo         MediaKind = "logo"
	MediaKindBanner       MediaKind = "banner"
	MediaKindThemeVideo   MediaKind = "theme_video"
	MediaKindSegmentAsset MediaKind = "segment_asset"
	MediaKindImage        MediaKind = "image"
)

type MediaAsset struct {
	ID                int64     `json:"id"`
	Filename          string    `json:"filename"`
	PublicURL         string    `json:"public_url"`
	SourceOriginalURL string    `json:"source_original_url,omitempty"`
	MimeType          string    `json:"mime_type"`
	SizeBytes         int64     `json:"size_bytes"`
	Width             *int      `json:"width,omitempty"`
	Height            *int      `json:"height,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	StoragePath       string    `json:"-"`
}

type MediaAssetCreateInput struct {
	Kind             MediaKind
	Filename         string
	StoragePath      string
	PublicURL        string
	MimeType         string
	SizeBytes        int64
	Width            *int
	Height           *int
	VisibilityCode   *string // nil = Backend-Default; z.B. "public", "private"
	ReviewStatusCode *string // nil = Backend-Default; z.B. "approved", "in_review"
}
