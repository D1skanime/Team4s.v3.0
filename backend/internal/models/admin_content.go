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

type OptionalStringSlice struct {
	Set   bool
	Value []string
}

func (o *OptionalStringSlice) UnmarshalJSON(data []byte) error {
	o.Set = true
	trimmed := bytes.TrimSpace(data)
	if bytes.Equal(trimmed, []byte("null")) {
		o.Value = nil
		return nil
	}

	var value []string
	if err := json.Unmarshal(trimmed, &value); err != nil {
		return err
	}

	o.Value = value
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
	CoverImage          *string
	BannerImage         *string
	LogoImage           *string
	BackgroundVideoURL  *string
	BackgroundImageURLs []string
	Source              *string
	FolderName  *string
	Tags        []string
}

type AdminAnimeCreateDraftAssetSuggestions struct {
	Cover           *string  `json:"cover,omitempty"`
	Banner          *string  `json:"banner,omitempty"`
	Logo            *string  `json:"logo,omitempty"`
	Backgrounds     []string `json:"backgrounds,omitempty"`
	BackgroundVideo *string  `json:"background_video,omitempty"`
}

type AdminAnimeAltTitle struct {
	Language *string `json:"language,omitempty"`
	Kind     *string `json:"kind,omitempty"`
	Title    string  `json:"title"`
}

type AdminAnimeCreateDraftPayload struct {
	Title            string                                 `json:"title"`
	TitleDE          *string                                `json:"title_de,omitempty"`
	TitleEN          *string                                `json:"title_en,omitempty"`
	Type             string                                 `json:"type"`
	ContentType      string                                 `json:"content_type"`
	Status           string                                 `json:"status"`
	Year             *int16                                 `json:"year,omitempty"`
	MaxEpisodes      *int16                                 `json:"max_episodes,omitempty"`
	Genre            *string                                `json:"genre,omitempty"`
	Description      *string                                `json:"description,omitempty"`
	CoverImage       *string                                `json:"cover_image,omitempty"`
	Source           *string                                `json:"source,omitempty"`
	FolderName       *string                                `json:"folder_name,omitempty"`
	AltTitles        []AdminAnimeAltTitle                   `json:"alt_titles,omitempty"`
	Tags             []string                               `json:"tags,omitempty"`
	Relations        []AdminAnimeRelation                   `json:"relations,omitempty"`
	AssetSuggestions *AdminAnimeCreateDraftAssetSuggestions `json:"asset_suggestions,omitempty"`
}

type AdminAnimeAniSearchEnrichmentRequest struct {
	AniSearchID string                       `json:"anisearch_id"`
	Draft       AdminAnimeCreateDraftPayload `json:"draft"`
}

type AdminAnimeAniSearchSearchCandidate struct {
	AniSearchID string `json:"anisearch_id"`
	Title       string `json:"title"`
	Type        string `json:"type"`
	Year        *int16 `json:"year,omitempty"`
}

type AdminAnimeAniSearchSearchResult struct {
	Data                  []AdminAnimeAniSearchSearchCandidate `json:"data"`
	FilteredExistingCount int32                                `json:"filtered_existing_count"`
}

type AdminAnimeAniSearchSearchResponse = AdminAnimeAniSearchSearchResult

type AdminAnimeAssetSearchSource string

const (
	AdminAnimeAssetSearchSourceTMDB     AdminAnimeAssetSearchSource = "tmdb"
	AdminAnimeAssetSearchSourceFanartTV AdminAnimeAssetSearchSource = "fanart.tv"
	AdminAnimeAssetSearchSourceZerochan AdminAnimeAssetSearchSource = "zerochan"
	AdminAnimeAssetSearchSourceKonachan  AdminAnimeAssetSearchSource = "konachan"
	AdminAnimeAssetSearchSourceAniList   AdminAnimeAssetSearchSource = "anilist"
	AdminAnimeAssetSearchSourceSafebooru AdminAnimeAssetSearchSource = "safebooru"
)

type AdminAnimeAssetSearchRequest struct {
	AssetKind string
	Query     string
	Limit     int
	Page      int // 1-indexed; 0 treated as 1
	Sources   []AdminAnimeAssetSearchSource
}

type AdminAnimeAssetSearchCandidate struct {
	ID         string                      `json:"id"`
	AssetKind  string                      `json:"asset_kind"`
	Source     AdminAnimeAssetSearchSource `json:"source"`
	Title      *string                     `json:"title,omitempty"`
	PreviewURL string                      `json:"preview_url"`
	ImageURL   string                      `json:"image_url"`
	SourceURL  *string                     `json:"source_url,omitempty"`
	Width      *int32                      `json:"width,omitempty"`
	Height     *int32                      `json:"height,omitempty"`
	Year       *int16                      `json:"year,omitempty"`
}

type AdminAnimeAssetSearchResponse struct {
	Data []AdminAnimeAssetSearchCandidate `json:"data"`
}

type AdminAnimeAniSearchEnrichmentProviderSummary struct {
	AniSearchID        string `json:"anisearch_id"`
	JellysyncApplied   bool   `json:"jellysync_applied"`
	RelationCandidates int32  `json:"relation_candidates"`
	RelationMatches    int32  `json:"relation_matches"`
}

type AdminAnimeAniSearchEnrichmentDraftResult struct {
	Mode             string                                       `json:"mode"`
	AniSearchID      string                                       `json:"anisearch_id"`
	Source           string                                       `json:"source"`
	Draft            AdminAnimeCreateDraftPayload                 `json:"draft"`
	ManualFieldsKept []string                                     `json:"manual_fields_kept,omitempty"`
	FilledFields     []string                                     `json:"filled_fields,omitempty"`
	FilledAssets     []string                                     `json:"filled_assets,omitempty"`
	Provider         AdminAnimeAniSearchEnrichmentProviderSummary `json:"provider"`
}

type AdminAnimeAniSearchEnrichmentRedirectResult struct {
	Mode            string `json:"mode"`
	AniSearchID     string `json:"anisearch_id"`
	ExistingAnimeID int64  `json:"existing_anime_id"`
	ExistingTitle   string `json:"existing_title"`
	RedirectPath    string `json:"redirect_path"`
}

// AdminAnimeEditDraftPayload mirrors the edit PATCH surface after JSON binding.
// AniSearch edit enrichment returns this draft-first payload so the normal PATCH
// save seam remains the only metadata persistence step.
type AdminAnimeEditDraftPayload struct {
	Title       *string  `json:"title,omitempty"`
	TitleDE     *string  `json:"title_de,omitempty"`
	TitleEN     *string  `json:"title_en,omitempty"`
	Type        *string  `json:"type,omitempty"`
	ContentType *string  `json:"content_type,omitempty"`
	Status      *string  `json:"status,omitempty"`
	Year        *int16   `json:"year,omitempty"`
	MaxEpisodes *int16   `json:"max_episodes,omitempty"`
	Genre       *string  `json:"genre,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Description *string  `json:"description,omitempty"`
	CoverImage  *string  `json:"cover_image,omitempty"`
	Source      *string  `json:"source,omitempty"`
	FolderName  *string  `json:"folder_name,omitempty"`
}

type AdminAnimeAniSearchEditRequest struct {
	AniSearchID     string                     `json:"anisearch_id"`
	Draft           AdminAnimeEditDraftPayload `json:"draft"`
	ProtectedFields []string                   `json:"protected_fields,omitempty"`
}

type AdminAnimeAniSearchEditSuccessResult struct {
	Mode                     string                     `json:"mode"`
	AniSearchID              string                     `json:"anisearch_id"`
	Source                   string                     `json:"source"`
	Draft                    AdminAnimeEditDraftPayload `json:"draft"`
	UpdatedFields            []string                   `json:"updated_fields,omitempty"`
	AppliedRelations         []AdminAnimeRelation       `json:"applied_relations,omitempty"`
	RelationsApplied         int32                      `json:"relations_applied"`
	RelationsSkippedExisting int32                      `json:"relations_skipped_existing"`
	SkippedProtectedFields   []string                   `json:"skipped_protected_fields,omitempty"`
}

type AdminAnimeAniSearchEditConflictResult struct {
	Mode            string `json:"mode"`
	AniSearchID     string `json:"anisearch_id"`
	ExistingAnimeID int64  `json:"existing_anime_id"`
	ExistingTitle   string `json:"existing_title"`
	RedirectPath    string `json:"redirect_path"`
}

type AdminAnimeSourceMatch struct {
	Source  string
	AnimeID int64
	Title   string
}

type AdminAnimeRelationTitleMatch struct {
	MatchedTitle string
	Target       AdminAnimeRelationTarget
}

type AdminAnimePatchInput struct {
	Title       OptionalString      `json:"title"`
	TitleDE     OptionalString      `json:"title_de"`
	TitleEN     OptionalString      `json:"title_en"`
	Type        OptionalString      `json:"type"`
	ContentType OptionalString      `json:"content_type"`
	Status      OptionalString      `json:"status"`
	Year        OptionalInt16       `json:"year"`
	MaxEpisodes OptionalInt16       `json:"max_episodes"`
	Genre       OptionalString      `json:"genre"`
	Tags        OptionalStringSlice `json:"tags"`
	Description OptionalString      `json:"description"`
	CoverImage  OptionalString      `json:"cover_image"`
	Source      OptionalString      `json:"source"`
	FolderName  OptionalString      `json:"folder_name"`
}

// AdminTagToken is a normalized tag value with its usage count across all anime.
// Mirrors the genre token shape so frontend state management stays parallel.
type AdminTagToken struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
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
	ID          int64    `json:"id"`
	Title       string   `json:"title"`
	TitleDE     *string  `json:"title_de,omitempty"`
	TitleEN     *string  `json:"title_en,omitempty"`
	Type        string   `json:"type"`
	ContentType string   `json:"content_type"`
	Status      string   `json:"status"`
	Year        *int16   `json:"year,omitempty"`
	MaxEpisodes *int16   `json:"max_episodes,omitempty"`
	Genre       *string  `json:"genre,omitempty"`
	Description *string  `json:"description,omitempty"`
	CoverImage  *string  `json:"cover_image,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

type AdminAnimeDeleteResult struct {
	AnimeID                 int64   `json:"anime_id"`
	Title                   string  `json:"title"`
	OrphanedLocalCoverImage *string `json:"orphaned_local_cover_image,omitempty"`
}

type AdminAnimeCreateAniSearchSummary struct {
	Source                   *string  `json:"source,omitempty"`
	RelationsAttempted       int32    `json:"relations_attempted"`
	RelationsApplied         int32    `json:"relations_applied"`
	RelationsSkippedExisting int32    `json:"relations_skipped_existing"`
	Warnings                 []string `json:"warnings,omitempty"`
}

type AdminAnimeUpsertResponse struct {
	Data      AdminAnimeItem                    `json:"data"`
	AniSearch *AdminAnimeCreateAniSearchSummary `json:"anisearch,omitempty"`
}

type AdminAnimeRelation struct {
	TargetAnimeID  int64   `json:"target_anime_id"`
	RelationLabel  string  `json:"relation_label"`
	TargetTitle    string  `json:"target_title"`
	TargetType     string  `json:"target_type"`
	TargetYear     *int16  `json:"target_year,omitempty"`
	TargetStatus   string  `json:"target_status"`
	TargetCoverURL *string `json:"target_cover_url,omitempty"`
}

type AdminAnimeRelationTarget struct {
	AnimeID  int64   `json:"anime_id"`
	Title    string  `json:"title"`
	Type     string  `json:"type"`
	Status   string  `json:"status"`
	Year     *int16  `json:"year,omitempty"`
	CoverURL *string `json:"cover_url,omitempty"`
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
}

type AdminAnimePersistedBackgroundState struct {
	ID        int64   `json:"id"`
	MediaID   *string `json:"media_id,omitempty"`
	URL       string  `json:"url"`
	Ownership string  `json:"ownership"`
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
