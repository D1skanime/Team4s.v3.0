package models

import "time"

type MediaKind string

const (
	MediaKindLogo   MediaKind = "logo"
	MediaKindBanner MediaKind = "banner"
)

type MediaAsset struct {
	ID          int64     `json:"id"`
	Filename    string    `json:"filename"`
	PublicURL   string    `json:"public_url"`
	MimeType    string    `json:"mime_type"`
	SizeBytes   int64     `json:"size_bytes"`
	Width       *int      `json:"width,omitempty"`
	Height      *int      `json:"height,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	StoragePath string    `json:"-"`
}

type MediaAssetCreateInput struct {
	Filename    string
	StoragePath string
	PublicURL   string
	MimeType    string
	SizeBytes   int64
	Width       *int
	Height      *int
}
