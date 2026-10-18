package models

import "time"

// quick-261018-l5r Task 2 (CLAUDE.md 450-Zeilen-Regel): die Jellyfin-Sync-/Vorschau-/Anwenden-
// Typen wurden rein umbauend (kein Verhaltenswechsel) aus admin_content.go hierher verschoben,
// da die Uebernahme-Feature-Erweiterung diese Datei ueber das 450-Zeilen-Limit getrieben haette.

type AdminAnimeSyncSource struct {
	ID          int64
	Title       string
	TitleDE     *string
	TitleEN     *string
	Source      *string
	SourceLinks []string
	FolderName  *string
	Year        *int16
	MaxEpisodes *int16
	Description *string
	CoverImage  *string
}

type AdminAnimeJellyfinMetadataFieldPreview struct {
	Field         string  `json:"field"`
	Label         string  `json:"label"`
	CurrentValue  *string `json:"current_value,omitempty"`
	IncomingValue *string `json:"incoming_value,omitempty"`
	Action        string  `json:"action"`
	Apply         bool    `json:"apply"`
	Reason        *string `json:"reason,omitempty"`
}

type AdminAnimeJellyfinCoverPreview struct {
	CurrentImage       *string `json:"current_image,omitempty"`
	CurrentSource      string  `json:"current_source"`
	IncomingImage      *string `json:"incoming_image,omitempty"`
	IncomingAvailable  bool    `json:"incoming_available"`
	CanApply           bool    `json:"can_apply"`
	WillApplyByDefault bool    `json:"will_apply_by_default"`
	Reason             *string `json:"reason,omitempty"`
}

type AdminAnimePersistedAssetState struct {
	MediaID   *string `json:"media_id,omitempty"`
	URL       string  `json:"url"`
	Ownership string  `json:"ownership"`
	Provider  *string `json:"provider,omitempty"`
}

type AdminAnimePersistedBackgroundState struct {
	ID        int64   `json:"id"`
	MediaID   *string `json:"media_id,omitempty"`
	URL       string  `json:"url"`
	Ownership string  `json:"ownership"`
	Provider  *string `json:"provider,omitempty"`
	SortOrder int32   `json:"sort_order"`
}

type AdminAnimePersistedAssets struct {
	Cover           *AdminAnimePersistedAssetState       `json:"cover,omitempty"`
	Banner          *AdminAnimePersistedAssetState       `json:"banner,omitempty"`
	Logo            *AdminAnimePersistedAssetState       `json:"logo,omitempty"`
	BackgroundVideo *AdminAnimePersistedAssetState       `json:"background_video,omitempty"`
	Backgrounds     []AdminAnimePersistedBackgroundState `json:"backgrounds"`
}

type AdminAnimeJellyfinProvenanceContext struct {
	AnimeID            int64                          `json:"anime_id"`
	Linked             bool                           `json:"linked"`
	Source             *string                        `json:"source,omitempty"`
	SourceKind         string                         `json:"source_kind"`
	JellyfinSeriesID   *string                        `json:"jellyfin_series_id,omitempty"`
	JellyfinSeriesName *string                        `json:"jellyfin_series_name,omitempty"`
	JellyfinSeriesPath *string                        `json:"jellyfin_series_path,omitempty"`
	FolderName         *string                        `json:"folder_name,omitempty"`
	Cover              AdminAnimeJellyfinCoverPreview `json:"cover"`
	AssetSlots         *AdminJellyfinIntakeAssetSlots `json:"asset_slots,omitempty"`
	PersistedAssets    AdminAnimePersistedAssets      `json:"persisted_assets"`
	// Folders lists every jellyfin: folder connected to this anime (165-07, D-05/D-18: an
	// anime can have more than one), flagging which one is the main folder. Computed via the
	// same collectJellyfinFolderOptions helper PreviewEpisodeImport's ownership guard (165-04)
	// and EpisodeImportContextResult.JellyfinFolders already use, so display and enforcement
	// never drift. Reuses models.JellyfinFolderOption (episode_import.go) rather than a
	// duplicate type of identical shape.
	Folders []JellyfinFolderOption `json:"folders,omitempty"`
}

type AdminAnimeJellyfinMetadataPreviewResult struct {
	AnimeID            int64                                    `json:"anime_id"`
	Linked             bool                                     `json:"linked"`
	JellyfinSeriesID   string                                   `json:"jellyfin_series_id"`
	JellyfinSeriesName string                                   `json:"jellyfin_series_name"`
	JellyfinSeriesPath *string                                  `json:"jellyfin_series_path,omitempty"`
	Diff               []AdminAnimeJellyfinMetadataFieldPreview `json:"diff"`
	Cover              AdminAnimeJellyfinCoverPreview           `json:"cover"`
	AssetSlots         AdminJellyfinIntakeAssetSlots            `json:"asset_slots"`
}

type AdminAnimeJellyfinMetadataApplyResult struct {
	AnimeID            int64                                    `json:"anime_id"`
	JellyfinSeriesID   string                                   `json:"jellyfin_series_id"`
	JellyfinSeriesName string                                   `json:"jellyfin_series_name"`
	AppliedFields      []AdminAnimeJellyfinMetadataFieldPreview `json:"applied_fields"`
	Cover              AdminAnimeJellyfinCoverPreview           `json:"cover"`
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
