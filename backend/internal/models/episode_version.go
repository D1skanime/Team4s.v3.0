package models

import "time"

type EpisodeVersion struct {
	ID            int64               `json:"id"`
	AnimeID       int64               `json:"anime_id"`
	EpisodeNumber int32               `json:"episode_number"`
	Title         *string             `json:"title,omitempty"`
	FansubGroup   *FansubGroupSummary `json:"fansub_group,omitempty"`
	MediaProvider string              `json:"media_provider"`
	MediaItemID   string              `json:"media_item_id"`
	VideoQuality  *string             `json:"video_quality,omitempty"`
	SubtitleType  *string             `json:"subtitle_type,omitempty"`
	ReleaseDate   *time.Time          `json:"release_date,omitempty"`
	StreamURL     *string             `json:"stream_url,omitempty"`
	CreatedAt     time.Time           `json:"created_at"`
	UpdatedAt     time.Time           `json:"updated_at"`
}

type GroupedEpisode struct {
	EpisodeNumber    int32            `json:"episode_number"`
	EpisodeTitle     *string          `json:"episode_title,omitempty"`
	DefaultVersionID *int64           `json:"default_version_id,omitempty"`
	VersionCount     int32            `json:"version_count"`
	Versions         []EpisodeVersion `json:"versions"`
}

type GroupedEpisodesData struct {
	AnimeID  int64            `json:"anime_id"`
	Episodes []GroupedEpisode `json:"episodes"`
}

type EpisodeVersionCreateInput struct {
	AnimeID       int64
	EpisodeNumber int32
	Title         *string
	FansubGroupID *int64
	MediaProvider string
	MediaItemID   string
	VideoQuality  *string
	SubtitleType  *string
	ReleaseDate   *time.Time
	StreamURL     *string
}

type EpisodeVersionPatchInput struct {
	Title         OptionalString `json:"title"`
	FansubGroupID OptionalInt64  `json:"fansub_group_id"`
	MediaProvider OptionalString `json:"media_provider"`
	MediaItemID   OptionalString `json:"media_item_id"`
	VideoQuality  OptionalString `json:"video_quality"`
	SubtitleType  OptionalString `json:"subtitle_type"`
	ReleaseDate   OptionalTime   `json:"release_date"`
	StreamURL     OptionalString `json:"stream_url"`
}

type ReleaseStreamSource struct {
	ID            int64
	AnimeID       int64
	MediaProvider string
	MediaItemID   string
	StreamURL     *string
}

type EpisodeVersionEditorContext struct {
	Version              EpisodeVersion       `json:"version"`
	AnimeTitle           string               `json:"anime_title"`
	AnimeFolderPath      *string              `json:"anime_folder_path,omitempty"`
	CollaborationGroupID *int64               `json:"collaboration_group_id,omitempty"`
	SelectedGroups       []FansubGroupSummary `json:"selected_groups"`
}

type EpisodeVersionMediaFile struct {
	FileName              string     `json:"file_name"`
	Path                  string     `json:"path"`
	MediaItemID           string     `json:"media_item_id"`
	StreamURL             *string    `json:"stream_url,omitempty"`
	VideoQuality          *string    `json:"video_quality,omitempty"`
	FileSizeBytes         *int64     `json:"file_size_bytes,omitempty"`
	LastModified          *time.Time `json:"last_modified,omitempty"`
	DetectedEpisodeNumber *int32     `json:"detected_episode_number,omitempty"`
	ReleaseName           *string    `json:"release_name,omitempty"`
}

type EpisodeVersionFolderScanResult struct {
	VersionID       int64                     `json:"version_id"`
	AnimeID         int64                     `json:"anime_id"`
	AnimeFolderPath *string                   `json:"anime_folder_path,omitempty"`
	Files           []EpisodeVersionMediaFile `json:"files"`
}
