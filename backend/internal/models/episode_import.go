package models

// EpisodeImportMappingStatus describes the operator-approved state of one
// Jellyfin media candidate in the episode import preview/apply workflow.
type EpisodeImportMappingStatus string

const (
	EpisodeImportMappingStatusSuggested EpisodeImportMappingStatus = "suggested"
	EpisodeImportMappingStatusConfirmed EpisodeImportMappingStatus = "confirmed"
	EpisodeImportMappingStatusConflict  EpisodeImportMappingStatus = "conflict"
	EpisodeImportMappingStatusSkipped   EpisodeImportMappingStatus = "skipped"
)

// EpisodeImportCanonicalEpisode is an AniSearch-owned canonical episode row.
// Jellyfin season/index fields must never be used to redefine these numbers.
type EpisodeImportCanonicalEpisode struct {
	EpisodeNumber      int32   `json:"episode_number"`
	Title              *string `json:"title,omitempty"`
	AniSearchEpisodeID *string `json:"anisearch_episode_id,omitempty"`
	ExistingEpisodeID  *int64  `json:"existing_episode_id,omitempty"`
	ExistingTitle      *string `json:"existing_title,omitempty"`
}

// EpisodeImportMediaCandidate is a Jellyfin-owned local media/file candidate.
// Season and episode numbers are evidence for suggestions only.
type EpisodeImportMediaCandidate struct {
	MediaItemID           string  `json:"media_item_id"`
	FileName              string  `json:"file_name"`
	Path                  string  `json:"path"`
	JellyfinSeasonNumber  *int32  `json:"jellyfin_season_number,omitempty"`
	JellyfinEpisodeNumber *int32  `json:"jellyfin_episode_number,omitempty"`
	StreamURL             *string `json:"stream_url,omitempty"`
	VideoQuality          *string `json:"video_quality,omitempty"`
}

// EpisodeImportMappingRow links one media candidate to zero, one, or many
// canonical episode numbers after operator review.
type EpisodeImportMappingRow struct {
	MediaItemID             string                     `json:"media_item_id"`
	TargetEpisodeNumbers    []int32                    `json:"target_episode_numbers"`
	SuggestedEpisodeNumbers []int32                    `json:"suggested_episode_numbers"`
	Status                  EpisodeImportMappingStatus `json:"status"`
}

// EpisodeImportPreviewResult is the read-only preview payload for the builder.
type EpisodeImportPreviewResult struct {
	AnimeID              int64                           `json:"anime_id"`
	AniSearchID          *string                         `json:"anisearch_id,omitempty"`
	JellyfinSeriesID     *string                         `json:"jellyfin_series_id,omitempty"`
	CanonicalEpisodes    []EpisodeImportCanonicalEpisode `json:"canonical_episodes"`
	MediaCandidates      []EpisodeImportMediaCandidate   `json:"media_candidates"`
	Mappings             []EpisodeImportMappingRow       `json:"mappings"`
	UnmappedEpisodes     []int32                         `json:"unmapped_episodes,omitempty"`
	UnmappedMediaItemIDs []string                        `json:"unmapped_media_item_ids,omitempty"`
}

// EpisodeImportApplyInput is the explicit operator-approved mutation payload.
type EpisodeImportApplyInput struct {
	AnimeID           int64                           `json:"anime_id"`
	CanonicalEpisodes []EpisodeImportCanonicalEpisode `json:"canonical_episodes"`
	MediaCandidates   []EpisodeImportMediaCandidate   `json:"media_candidates,omitempty"`
	Mappings          []EpisodeImportMappingRow       `json:"mappings"`
}

// EpisodeImportApplyResult summarizes what the explicit apply operation changed.
type EpisodeImportApplyResult struct {
	AnimeID          int64 `json:"anime_id"`
	EpisodesCreated  int32 `json:"episodes_created"`
	EpisodesExisting int32 `json:"episodes_existing"`
	VersionsCreated  int32 `json:"versions_created"`
	VersionsUpdated  int32 `json:"versions_updated"`
	MappingsApplied  int32 `json:"mappings_applied"`
	Skipped          int32 `json:"skipped"`
	Conflicts        int32 `json:"conflicts"`
}

// EpisodeImportExistingCoverage describes already persisted episode-version
// coverage, used by preview/apply code to avoid destructive overwrites.
type EpisodeImportExistingCoverage struct {
	AnimeID  int64                     `json:"anime_id"`
	Mappings []EpisodeImportMappingRow `json:"mappings"`
}
