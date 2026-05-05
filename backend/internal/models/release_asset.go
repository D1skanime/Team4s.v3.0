package models

// ReleaseAssetType describes the public-facing media asset grouping.
type ReleaseAssetType string

const (
	ReleaseAssetTypeVideo  ReleaseAssetType = "video"
	ReleaseAssetTypePoster ReleaseAssetType = "poster"
	ReleaseAssetTypeBanner ReleaseAssetType = "banner"
	ReleaseAssetTypeLogo   ReleaseAssetType = "logo"
	ReleaseAssetTypeImage  ReleaseAssetType = "image"
	ReleaseAssetTypeOther  ReleaseAssetType = "other"
)

// ReleaseAsset represents a public media asset linked to a release.
type ReleaseAsset struct {
	ID              string           `json:"id"`
	Type            ReleaseAssetType `json:"type"`
	Title           string           `json:"title"`
	DurationSeconds *int32           `json:"duration_seconds,omitempty"`
	ThumbnailURL    *string          `json:"thumbnail_url,omitempty"`
	Order           int32            `json:"order"`
	StreamPath      string           `json:"stream_path"`
}

// ReleaseAssetsData is the public response payload for release assets.
type ReleaseAssetsData struct {
	ReleaseID int64          `json:"release_id"`
	Assets    []ReleaseAsset `json:"assets"`
}
