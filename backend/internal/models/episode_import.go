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
	EpisodeNumber      int32             `json:"episode_number"`
	Title              *string           `json:"title,omitempty"`
	TitlesByLanguage   map[string]string `json:"titles_by_language,omitempty"`
	FillerType         *string           `json:"filler_type,omitempty"`
	FillerSource       *string           `json:"filler_source,omitempty"`
	FillerNote         *string           `json:"filler_note,omitempty"`
	AniSearchEpisodeID *string           `json:"anisearch_episode_id,omitempty"`
	ExistingEpisodeID  *int64            `json:"existing_episode_id,omitempty"`
	ExistingTitle      *string           `json:"existing_title,omitempty"`
}

// JellyfinSourceKey identifies a reviewed source under its genuine provider Item.
// It is deliberately not serialized as a public path or synthetic Item ID.
type JellyfinSourceKey struct{ ItemID, SourceID string }

// EpisodeImportMediaCandidate is a Jellyfin-owned local media/file candidate.
// Season and episode numbers are evidence for suggestions only.
type EpisodeImportMediaCandidate struct {
	SourceFileNameUnique bool `json:"-"`
	// Actual owner aliases from the authoritative provider collection, server-only.
	JellyfinItemIDs []string `json:"-"`

	MediaItemID   string  `json:"media_item_id"`
	MediaSourceID string  `json:"media_source_id,omitempty"`
	Container     *string `json:"container,omitempty"`
	// A missing projection is incomplete, never a known-empty stream list.
	StreamsComplete       bool                    `json:"streams_complete"`
	SelectedAudioIndex    *int32                  `json:"selected_audio_index"`
	AudioTracks           []JellyfinAudioTrack    `json:"audio_tracks"`
	SubtitleTracks        []JellyfinSubtitleTrack `json:"subtitle_tracks"`
	FileName              string                  `json:"file_name"`
	Path                  string                  `json:"path"`
	JellyfinSeasonNumber  *int32                  `json:"jellyfin_season_number,omitempty"`
	JellyfinEpisodeNumber *int32                  `json:"jellyfin_episode_number,omitempty"`
	StreamURL             *string                 `json:"stream_url,omitempty"`
	VideoQuality          *string                 `json:"video_quality,omitempty"`
	VideoCodec            *string                 `json:"video_codec,omitempty"`
	AudioCodec            *string                 `json:"audio_codec,omitempty"`
	DurationSeconds       *int32                  `json:"duration_seconds,omitempty"`
}

// SelectedFansubGroupInput describes one operator-selected fansub group chip.
// Existing groups can be referenced by ID; newly typed groups can be carried by name.
type SelectedFansubGroupInput struct {
	ID   *int64  `json:"id,omitempty"`
	Name *string `json:"name,omitempty"`
	Slug *string `json:"slug,omitempty"`
}

// EpisodeImportFansubGroupMatchOrigin describes why a fansub group was
// auto-selected for a preview row (D-08): the raw filename-derived
// candidate, which tier resolved it (alias/name/slug), and the resolved
// group. GroupID lets Plan 07 detect a later client-side conflict by
// comparing it against whatever group the admin currently has selected.
// AliasID is populated only when MatchedVia == "alias" -- Plan 07/08 need
// this numeric id to call reassignFansubAlias on a conflicting kürzel.
type EpisodeImportFansubGroupMatchOrigin struct {
	Raw        string `json:"raw"`
	MatchedVia string `json:"matched_via"`
	GroupID    int64  `json:"group_id"`
	GroupName  string `json:"group_name"`
	AliasID    *int64 `json:"alias_id,omitempty"`
}

// EpisodeImportFansubGroupSuggestion is a fuzzy "did you mean" candidate
// (D-03) surfaced when a row's fansub group name has no exact-tier match.
// Never auto-applied.
type EpisodeImportFansubGroupSuggestion struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// EpisodeImportMappingRow links one media candidate to zero, one, or many
// canonical episode numbers after operator review.
//
// FileName and DisplayPath are readable operator-facing labels derived from the
// Jellyfin media candidate so the frontend can identify real files instead of
// showing opaque media IDs as the primary label.
type EpisodeImportMappingRow struct {
	MediaItemID string `json:"media_item_id"`
	// Reviewed source selector; row identity is (MediaItemID, MediaSourceID).
	MediaSourceID           string                     `json:"media_source_id,omitempty"`
	FileName                string                     `json:"file_name,omitempty"`
	DisplayPath             string                     `json:"display_path,omitempty"`
	TargetEpisodeNumbers    []int32                    `json:"target_episode_numbers"`
	SuggestedEpisodeNumbers []int32                    `json:"suggested_episode_numbers"`
	Status                  EpisodeImportMappingStatus `json:"status"`
	FansubGroups            []SelectedFansubGroupInput `json:"fansub_groups,omitempty"`
	FansubGroupID           *int64                     `json:"fansub_group_id,omitempty"`
	FansubGroupName         *string                    `json:"fansub_group_name,omitempty"`
	ReleaseVersion          *string                    `json:"release_version,omitempty"`
	// FansubGroupMatchOrigin/FansubGroupSuggestions/ReleaseVersionSource are
	// additive, display-only fields (never persisted) populated at preview
	// time by enrichEpisodeImportPreviewFansubData (Plan 05, D-08/D-09).
	FansubGroupMatchOrigin *EpisodeImportFansubGroupMatchOrigin `json:"fansub_group_match_origin,omitempty"`
	FansubGroupSuggestions []EpisodeImportFansubGroupSuggestion `json:"fansub_group_suggestions,omitempty"`
	ReleaseVersionSource   *string                              `json:"release_version_source,omitempty"`
}

// EpisodeImportPreviewResult is the read-only preview payload for the builder.
type EpisodeImportPreviewResult struct {
	AnimeID              int64                           `json:"anime_id"`
	AnimeTitle           string                          `json:"anime_title"`
	AniSearchID          *string                         `json:"anisearch_id,omitempty"`
	JellyfinSeriesID     *string                         `json:"jellyfin_series_id,omitempty"`
	FolderPath           *string                         `json:"folder_path,omitempty"`
	CanonicalEpisodes    []EpisodeImportCanonicalEpisode `json:"canonical_episodes"`
	MediaCandidates      []EpisodeImportMediaCandidate   `json:"media_candidates"`
	Mappings             []EpisodeImportMappingRow       `json:"mappings"`
	UnmappedEpisodes     []int32                         `json:"unmapped_episodes,omitempty"`
	UnmappedMediaItemIDs []string                        `json:"unmapped_media_item_ids,omitempty"`
}

// JellyfinFolderOption describes one jellyfin: folder connected to an anime,
// enumerated from AdminAnimeSyncSource.Source/SourceLinks (D-05: an anime can
// have more than one connected Jellyfin folder). Defined in models (not
// handlers) so it can appear on EpisodeImportContextResult below without an
// import cycle; the enumeration logic itself
// (collectJellyfinFolderOptions) lives in
// backend/internal/handlers/jellyfin_source_folder_list.go and is reused by
// PreviewEpisodeImport's ownership guard (165-04) and by 165-07's folder
// management surface (D-18).
type JellyfinFolderOption struct {
	JellyfinItemID string `json:"jellyfin_item_id"`
	IsMain         bool   `json:"is_main"`
}

type EpisodeImportContextResult struct {
	AnimeID          int64   `json:"anime_id"`
	AnimeTitle       string  `json:"anime_title"`
	AniSearchID      *string `json:"anisearch_id,omitempty"`
	JellyfinSeriesID *string `json:"jellyfin_series_id,omitempty"`
	FolderPath       *string `json:"folder_path,omitempty"`
	Source           *string `json:"source,omitempty"`
	// JellyfinFolders is only populated when the anime has more than one
	// connected Jellyfin folder (D-14: "kein sichtbares neues Feld im
	// Regelfall") -- a display-only simplification for the common
	// single-folder case.
	JellyfinFolders []JellyfinFolderOption `json:"jellyfin_folders,omitempty"`
	// JellyfinFoldersForOwnershipCheck always holds the FULL connected-folder
	// list (never nil'd for the single-folder display case above) and MUST be
	// used for security/ownership checks such as
	// AdminContentHandler.rejectUnownedJellyfinSeriesID. Excluded from the
	// JSON response (json:"-") -- it exists only to decouple the D-14 display
	// simplification from the IDOR-closing allow-list, which previously
	// shared the same nil'd field and could wrongly reject a legitimate,
	// correctly-owned request for a single-folder anime.
	JellyfinFoldersForOwnershipCheck []JellyfinFolderOption `json:"-"`
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
	// LearnedFansubAliases is server-internal only (D-01): every alias the apply
	// transaction learned for an admin's explicit existing-group selection, so the
	// handler can audit each one (fansub_group_alias.learned) after Apply returns. The
	// frontend has no use for this list.
	LearnedFansubAliases []LearnedFansubAlias `json:"-"`
}

// EpisodeImportExistingCoverage describes already persisted episode-version
// coverage, used by preview/apply code to avoid destructive overwrites.
type EpisodeImportExistingCoverage struct {
	AnimeID  int64                     `json:"anime_id"`
	Mappings []EpisodeImportMappingRow `json:"mappings"`
}
