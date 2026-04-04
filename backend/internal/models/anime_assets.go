package models

import "time"

type AnimeAssetOwnership string

const (
	AnimeAssetOwnershipManual   AnimeAssetOwnership = "manual"
	AnimeAssetOwnershipProvider AnimeAssetOwnership = "provider"
)

type AnimeResolvedAsset struct {
	MediaID     *string             `json:"media_id,omitempty"`
	URL         string              `json:"url"`
	Ownership   AnimeAssetOwnership `json:"ownership"`
	ProviderKey *string             `json:"provider_key,omitempty"`
}

type AnimeBackgroundAsset struct {
	ID          int64               `json:"id"`
	MediaID     *string             `json:"media_id,omitempty"`
	URL         string              `json:"url"`
	Ownership   AnimeAssetOwnership `json:"ownership"`
	ProviderKey *string             `json:"provider_key,omitempty"`
	SortOrder   int32               `json:"sort_order"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`
}

type AnimeResolvedAssets struct {
	Cover           *AnimeResolvedAsset    `json:"cover,omitempty"`
	Banner          *AnimeResolvedAsset    `json:"banner,omitempty"`
	Logo            *AnimeResolvedAsset    `json:"logo,omitempty"`
	BackgroundVideo *AnimeResolvedAsset    `json:"background_video,omitempty"`
	Backgrounds     []AnimeBackgroundAsset `json:"backgrounds"`
}

type AnimeProviderAssetInput struct {
	URL         string
	ProviderKey string
}

type AnimeAssetRemovalResult struct {
	RemovedPaths []string `json:"removed_paths,omitempty"`
}
