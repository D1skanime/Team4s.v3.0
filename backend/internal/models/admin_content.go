package models

import (
	"bytes"
	"encoding/json"
	"time"
)

type OptionalString struct {
	Set   bool
	Value *string
}

func (o *OptionalString) UnmarshalJSON(data []byte) error {
	o.Set = true
	trimmed := bytes.TrimSpace(data)
	if bytes.Equal(trimmed, []byte("null")) {
		o.Value = nil
		return nil
	}

	var value string
	if err := json.Unmarshal(trimmed, &value); err != nil {
		return err
	}

	o.Value = &value
	return nil
}

type OptionalInt16 struct {
	Set   bool
	Value *int16
}

func (o *OptionalInt16) UnmarshalJSON(data []byte) error {
	o.Set = true
	trimmed := bytes.TrimSpace(data)
	if bytes.Equal(trimmed, []byte("null")) {
		o.Value = nil
		return nil
	}

	var value int16
	if err := json.Unmarshal(trimmed, &value); err != nil {
		return err
	}

	o.Value = &value
	return nil
}

type AdminAnimeCreateInput struct {
	Title       string
	TitleDE     *string
	TitleEN     *string
	Type        string
	ContentType string
	Status      string
	Year        *int16
	MaxEpisodes *int16
	Genre       *string
	Description *string
	CoverImage  *string
	Source      *string
	FolderName  *string
}

type AdminAnimePatchInput struct {
	Title       OptionalString `json:"title"`
	TitleDE     OptionalString `json:"title_de"`
	TitleEN     OptionalString `json:"title_en"`
	Type        OptionalString `json:"type"`
	ContentType OptionalString `json:"content_type"`
	Status      OptionalString `json:"status"`
	Year        OptionalInt16  `json:"year"`
	MaxEpisodes OptionalInt16  `json:"max_episodes"`
	Genre       OptionalString `json:"genre"`
	Description OptionalString `json:"description"`
	CoverImage  OptionalString `json:"cover_image"`
}

type AdminEpisodeCreateInput struct {
	AnimeID       int64
	EpisodeNumber string
	Title         *string
	Status        string
	StreamLink    *string
}

type AdminEpisodePatchInput struct {
	EpisodeNumber OptionalString `json:"episode_number"`
	Title         OptionalString `json:"title"`
	Status        OptionalString `json:"status"`
	StreamLink    OptionalString `json:"stream_link"`
}

type AdminAnimeItem struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	TitleDE     *string `json:"title_de,omitempty"`
	TitleEN     *string `json:"title_en,omitempty"`
	Type        string  `json:"type"`
	ContentType string  `json:"content_type"`
	Status      string  `json:"status"`
	Year        *int16  `json:"year,omitempty"`
	MaxEpisodes *int16  `json:"max_episodes,omitempty"`
	Genre       *string `json:"genre,omitempty"`
	Description *string `json:"description,omitempty"`
	CoverImage  *string `json:"cover_image,omitempty"`
}

type AdminEpisodeItem struct {
	ID            int64   `json:"id"`
	AnimeID       int64   `json:"anime_id"`
	EpisodeNumber string  `json:"episode_number"`
	Title         *string `json:"title,omitempty"`
	Status        string  `json:"status"`
	StreamLink    *string `json:"stream_link,omitempty"`
}

type AdminEpisodeDeleteResult struct {
	EpisodeID              int64  `json:"episode_id"`
	AnimeID                int64  `json:"anime_id"`
	EpisodeNumber          string `json:"episode_number"`
	DeletedEpisodeVersions int32  `json:"deleted_episode_versions"`
}

type AdminAnimeSyncSource struct {
	ID          int64
	Title       string
	TitleDE     *string
	TitleEN     *string
	Source      *string
	FolderName  *string
	Year        *int16
	MaxEpisodes *int16
	Description *string
}

type AdminAnimeJellyfinSyncResult struct {
	AnimeID                int64   `json:"anime_id"`
	JellyfinSeriesID       string  `json:"jellyfin_series_id"`
	JellyfinSeriesName     string  `json:"jellyfin_series_name"`
	JellyfinSeriesPath     *string `json:"jellyfin_series_path,omitempty"`
	AppliedPathPrefix      *string `json:"applied_path_prefix,omitempty"`
	SeasonNumber           int32   `json:"season_number"`
	ScannedEpisodes        int32   `json:"scanned_episodes"`
	PathFilteredEpisodes   int32   `json:"path_filtered_episodes"`
	AcceptedUniqueEpisodes int32   `json:"accepted_unique_episodes"`
	ImportedEpisodes       int32   `json:"imported_episodes"`
	UpdatedEpisodes        int32   `json:"updated_episodes"`
	ImportedVersions       int32   `json:"imported_versions"`
	UpdatedVersions        int32   `json:"updated_versions"`
	SkippedEpisodes        int32   `json:"skipped_episodes"`
	DeletedVersions        int32   `json:"deleted_versions,omitempty"`
	DeletedEpisodes        int32   `json:"deleted_episodes,omitempty"`
	AppliedEpisodeStatus   string  `json:"applied_episode_status"`
	OverwriteEpisodeTitle  bool    `json:"overwrite_episode_titles"`
	OverwriteVersionTitle  bool    `json:"overwrite_version_titles"`
}

type AdminJellyfinSeriesSearchItem struct {
	JellyfinSeriesID string  `json:"jellyfin_series_id"`
	Name             string  `json:"name"`
	ProductionYear   *int    `json:"production_year,omitempty"`
	Path             *string `json:"path,omitempty"`
}

type AdminAnimeJellyfinPreviewEpisode struct {
	JellyfinItemID string     `json:"jellyfin_item_id"`
	EpisodeNumber  int32      `json:"episode_number"`
	Title          *string    `json:"title,omitempty"`
	PremiereDate   *time.Time `json:"premiere_date,omitempty"`
	VideoQuality   *string    `json:"video_quality,omitempty"`
}

type AdminAnimeJellyfinPreviewResult struct {
	AnimeID                  int64                              `json:"anime_id"`
	JellyfinSeriesID         string                             `json:"jellyfin_series_id"`
	JellyfinSeriesName       string                             `json:"jellyfin_series_name"`
	JellyfinSeriesPath       *string                            `json:"jellyfin_series_path,omitempty"`
	AppliedPathPrefix        *string                            `json:"applied_path_prefix,omitempty"`
	SeasonNumber             int32                              `json:"season_number"`
	ScannedEpisodes          int32                              `json:"scanned_episodes"`
	MatchedEpisodes          int32                              `json:"matched_episodes"`
	PathFilteredEpisodes     int32                              `json:"path_filtered_episodes"`
	AcceptedUniqueEpisodes   int32                              `json:"accepted_unique_episodes"`
	MismatchDetected         bool                               `json:"mismatch_detected"`
	MismatchReason           *string                            `json:"mismatch_reason,omitempty"`
	SkippedEpisodes          int32                              `json:"skipped_episodes"`
	ExistingJellyfinVersions int32                              `json:"existing_jellyfin_versions"`
	ExistingEpisodes         int32                              `json:"existing_episodes"`
	AppliedEpisodeStatus     string                             `json:"applied_episode_status"`
	OverwriteEpisodeTitle    bool                               `json:"overwrite_episode_titles"`
	OverwriteVersionTitle    bool                               `json:"overwrite_version_titles"`
	Episodes                 []AdminAnimeJellyfinPreviewEpisode `json:"episodes"`
}
