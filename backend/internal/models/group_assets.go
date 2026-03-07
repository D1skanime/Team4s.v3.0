package models

// GroupAssetMediaType describes playable media extras discovered in subgroup folders.
type GroupAssetMediaType string

const (
	GroupAssetMediaTypeOpening GroupAssetMediaType = "opening"
	GroupAssetMediaTypeEnding  GroupAssetMediaType = "ending"
	GroupAssetMediaTypeKaraoke GroupAssetMediaType = "karaoke"
	GroupAssetMediaTypeInsert  GroupAssetMediaType = "insert"
)

// GroupAssetHero contains top-level artwork for the anime-group detail page.
type GroupAssetHero struct {
	BackdropURL *string `json:"backdrop_url,omitempty"`
	PrimaryURL  *string `json:"primary_url,omitempty"`
	PosterURL   *string `json:"poster_url,omitempty"`
	ThumbURL    *string `json:"thumb_url,omitempty"`
	BannerURL   *string `json:"banner_url,omitempty"`
}

// GroupAssetImage represents one gallery image inside an episode folder.
type GroupAssetImage struct {
	ID           string `json:"id"`
	Title        string `json:"title"`
	ImageURL     string `json:"image_url"`
	ThumbnailURL string `json:"thumbnail_url"`
	Width        *int32 `json:"width,omitempty"`
	Height       *int32 `json:"height,omitempty"`
	Order        int32  `json:"order"`
}

// GroupAssetMedia represents one playable extra item inside an episode folder.
type GroupAssetMedia struct {
	ID              string              `json:"id"`
	Type            GroupAssetMediaType `json:"type"`
	Title           string              `json:"title"`
	ThumbnailURL    *string             `json:"thumbnail_url,omitempty"`
	DurationSeconds *int32              `json:"duration_seconds,omitempty"`
	Order           int32               `json:"order"`
	StreamPath      string              `json:"stream_path"`
}

// GroupEpisodeAssets represents all assets found for one episode folder.
type GroupEpisodeAssets struct {
	ReleaseID     *int64            `json:"release_id,omitempty"`
	EpisodeID     *int64            `json:"episode_id,omitempty"`
	EpisodeNumber int32             `json:"episode_number"`
	Title         *string           `json:"title,omitempty"`
	FolderName    string            `json:"folder_name"`
	FolderPath    string            `json:"folder_path"`
	Images        []GroupAssetImage `json:"images"`
	MediaAssets   []GroupAssetMedia `json:"media_assets"`
}

// GroupAssetsData is the public group-detail asset response payload.
type GroupAssetsData struct {
	AnimeID    int64                `json:"anime_id"`
	GroupID    int64                `json:"group_id"`
	FolderName string               `json:"folder_name"`
	Hero       GroupAssetHero       `json:"hero"`
	Episodes   []GroupEpisodeAssets `json:"episodes"`
}
