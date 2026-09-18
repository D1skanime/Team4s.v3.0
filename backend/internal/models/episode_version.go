package models

import (
	"bytes"
	"encoding/json"
	"errors"
	"time"
)

// EpisodeVersion repräsentiert eine einzelne Release-Version einer Episode,
// verknüpft mit einer Fansub-Gruppe und einem Medien-Provider (z.B. Jellyfin).
type EpisodeVersion struct {
	JellyfinSource *JellyfinSourceSnapshot `json:"-"`
	// ID remains the legacy variant alias; ReleaseVersionID addresses the canonical version.
	VariantID             int64                `json:"variant_id"`
	ReleaseVersionID      int64                `json:"release_version_id"`
	ID                    int64                `json:"id"`
	AnimeID               int64                `json:"anime_id"`
	EpisodeNumber         int32                `json:"episode_number"`
	Title                 *string              `json:"title,omitempty"`
	ReleaseVersion        *string              `json:"release_version,omitempty"`
	FansubGroups          []FansubGroupSummary `json:"fansub_groups,omitempty"`
	MediaProvider         string               `json:"media_provider"`
	MediaItemID           string               `json:"media_item_id"`
	MediaSourceID         *string              `json:"media_source_id,omitempty"`
	CoveredEpisodeNumbers []int32              `json:"covered_episode_numbers,omitempty"`
	VideoQuality          *string              `json:"video_quality,omitempty"`
	SubtitleType          *string              `json:"subtitle_type,omitempty"`
	ProductionStartedOn   *time.Time           `json:"production_started_on,omitempty"`
	ReleaseDate           *time.Time           `json:"release_date,omitempty"`
	CRC32                 *string              `json:"crc32,omitempty"`
	StreamURL             *string              `json:"stream_url,omitempty"`
	SegmentCount          int32                `json:"segment_count"`
	HasSegmentAsset       bool                 `json:"has_segment_asset"`
	DurationSeconds       *int32               `json:"duration_seconds,omitempty"`
	CreatedAt             time.Time            `json:"created_at"`
	UpdatedAt             time.Time            `json:"updated_at"`
}

// GroupedEpisode fasst alle Versionen einer einzelnen Episode zusammen
// und wird in der gruppierten Episodenlistenansicht verwendet.
type GroupedEpisode struct {
	EpisodeNumber    int32            `json:"episode_number"`
	EpisodeTitle     *string          `json:"episode_title,omitempty"`
	DefaultVersionID *int64           `json:"default_version_id,omitempty"`
	VersionCount     int32            `json:"version_count"`
	Versions         []EpisodeVersion `json:"versions"`
}

// GroupedEpisodesData enthält die gruppierten Episodendaten eines Anime
// und ist die Antwortstruktur des gruppierten Episodenlistenendpunkts.
type GroupedEpisodesData struct {
	AnimeID  int64            `json:"anime_id"`
	Episodes []GroupedEpisode `json:"episodes"`
}

// EpisodeVersionCreateInput enthält die Pflicht- und optionalen Felder
// zum Anlegen einer neuen Episodenversion.
type EpisodeVersionCreateInput struct {
	// Provider-derived hydration; JSON input cannot supply authoritative technical data.
	JellyfinSource  *JellyfinSourceSnapshot `json:"-"`
	FileName        *string                 `json:"-"`
	Container       *string                 `json:"-"`
	VideoCodec      *string                 `json:"-"`
	AudioCodec      *string                 `json:"-"`
	AnimeID         int64
	EpisodeNumber   int32
	Title           *string
	FansubGroups    []SelectedFansubGroupInput
	FansubGroupID   *int64
	MediaProvider   string
	MediaItemID     string
	MediaSourceID   *string `json:"media_source_id,omitempty"`
	VideoQuality    *string
	SubtitleType    *string
	ReleaseDate     *time.Time
	CRC32           *string
	StreamURL       *string
	DurationSeconds *int32
}

// EpisodeVersionPatchInput enthält die patch-fähigen Felder einer Episodenversion,
// wobei nur gesetzte Felder (Set=true) in der Datenbankaktualisierung berücksichtigt werden.
type EpisodeVersionPatchInput struct {
	// Provider-derived hydration; JSON input cannot supply authoritative technical data.
	JellyfinSource *JellyfinSourceSnapshot      `json:"-"`
	FileName       *string                      `json:"-"`
	Container      *string                      `json:"-"`
	VideoCodec     *string                      `json:"-"`
	AudioCodec     *string                      `json:"-"`
	Title          OptionalString               `json:"title"`
	FansubGroups   OptionalSelectedFansubGroups `json:"fansub_groups"`
	FansubGroupID  OptionalInt64                `json:"fansub_group_id"`
	MediaProvider  OptionalString               `json:"media_provider"`
	MediaItemID    OptionalString               `json:"media_item_id"`
	// Source selection is an admin media-binding mutation, never metadata-only.
	MediaSourceID       OptionalString `json:"media_source_id"`
	VideoQuality        OptionalString `json:"video_quality"`
	SubtitleType        OptionalString `json:"subtitle_type"`
	ProductionStartedOn OptionalTime   `json:"production_started_on"`
	ReleaseDate         OptionalTime   `json:"release_date"`
	CRC32               OptionalString `json:"crc32"`
	StreamURL           OptionalString `json:"stream_url"`
	DurationSeconds     OptionalInt32  `json:"duration_seconds"`
}

type OptionalSelectedFansubGroups struct {
	Set   bool
	Value []SelectedFansubGroupInput
}

func (o *OptionalSelectedFansubGroups) UnmarshalJSON(data []byte) error {
	o.Set = true
	trimmed := bytes.TrimSpace(data)
	if bytes.Equal(trimmed, []byte("null")) {
		o.Value = nil
		return nil
	}

	var value []SelectedFansubGroupInput
	if err := json.Unmarshal(trimmed, &value); err != nil {
		return err
	}

	o.Value = value
	return nil
}

// ReleaseStreamSource enthält die für den Stream-Redirect benötigten Felder
// einer Episodenversion und wird beim Erstellen von Stream-Grants verwendet.
type ReleaseStreamSource struct {
	MediaSourceID  *string                 `json:"-"`
	JellyfinSource *JellyfinSourceSnapshot `json:"-"`
	ID             int64
	AnimeID        int64
	MediaProvider  string
	MediaItemID    string
	StreamURL      *string
}

// EpisodeVersionDateNeighbor is an advisory same-field date anchor in the
// persisted anime/group/version context; its version ID is never a variant alias.
type EpisodeVersionDateNeighbor struct {
	FansubGroupID    int64  `json:"fansub_group_id"`
	Field            string `json:"field"`
	Direction        string `json:"direction"`
	ReleaseVersionID int64  `json:"release_version_id"`
	EpisodeNumber    string `json:"episode_number"`
	Date             string `json:"date"`
}

var ErrEpisodeVersionDateOrder = errors.New("Der Bearbeitungsabschluss darf nicht vor dem Bearbeitungsbeginn liegen.")

// ValidateEpisodeVersionDates compares UTC calendar days, matching the editor's
// date-only controls. Unknown dates and equal days are valid; timestamps are not rewritten.
func ValidateEpisodeVersionDates(start, completion *time.Time) error {
	if start != nil && completion != nil && completion.UTC().Format(time.DateOnly) < start.UTC().Format(time.DateOnly) {
		return ErrEpisodeVersionDateOrder
	}
	return nil
}

// EpisodeVersionEditorContext liefert alle Kontextdaten für den Admin-Editor
// einer Episodenversion, inklusive Anime-Pfad und verfügbare Fansub-Gruppen.
type EpisodeVersionEditorContext struct {
	SelectedFile    *EpisodeVersionMediaFile     `json:"selected_file"`
	Version         EpisodeVersion               `json:"version"`
	AnimeTitle      string                       `json:"anime_title"`
	AnimeFolderPath *string                      `json:"anime_folder_path,omitempty"`
	SelectedGroups  []FansubGroupSummary         `json:"selected_groups"`
	DateNeighbors   []EpisodeVersionDateNeighbor `json:"date_neighbors"`
	// Episode ist die Einstufung der übergeordneten Episode (nicht der Version).
	Episode *EpisodeClassification `json:"episode,omitempty"`
	// JellyfinEnrichmentDegraded is true only when a configured Jellyfin connection was
	// attempted for folder or selected-file enrichment and failed; ordinary editing
	// remains usable with unavailable optional metadata.
	JellyfinEnrichmentDegraded bool `json:"jellyfin_enrichment_degraded,omitempty"`
}

// EpisodeVersionChapterHint is advisory display metadata, never a persisted segment time.
// StartMS excludes sub-millisecond tick remainder, without whole-second rounding.
type EpisodeVersionChapterHint struct {
	Name    *string `json:"name"`
	StartMS int64   `json:"start_ms"`
}

// EpisodeVersionMediaFile repräsentiert eine einzelne Mediendatei aus einem
// Jellyfin-Ordner-Scan, inklusive erkannter Episodennummer und Qualitätsinformationen.
type EpisodeVersionMediaFile struct {
	// Nil pointer: not requested (scans); pointer to nil slice: unavailable; empty slice: proven empty.
	ChapterHints          *[]EpisodeVersionChapterHint `json:"chapter_hints,omitempty"`
	FileName              string                       `json:"file_name"`
	Path                  string                       `json:"path"`
	MediaItemID           string                       `json:"media_item_id"`
	MediaSourceID         *string                      `json:"media_source_id,omitempty"`
	StreamURL             *string                      `json:"stream_url,omitempty"`
	VideoQuality          *string                      `json:"video_quality,omitempty"`
	FileSizeBytes         *int64                       `json:"file_size_bytes,omitempty"`
	LastModified          *time.Time                   `json:"last_modified,omitempty"`
	DetectedEpisodeNumber *int32                       `json:"detected_episode_number,omitempty"`
	ReleaseName           *string                      `json:"release_name,omitempty"`
}

// EpisodeVersionFolderScanResult enthält das Ergebnis eines Ordner-Scans
// für eine Episodenversion mit allen gefundenen Mediendateien.
type EpisodeVersionFolderScanResult struct {
	VersionID       int64                     `json:"version_id"`
	AnimeID         int64                     `json:"anime_id"`
	AnimeFolderPath *string                   `json:"anime_folder_path,omitempty"`
	Files           []EpisodeVersionMediaFile `json:"files"`
}

// PublicEpisodeVersion exposes display metadata and explicit identities, never playback sources.
type PublicEpisodeVersion struct {
	ID               int64                `json:"id"`
	VariantID        int64                `json:"variant_id"`
	ReleaseVersionID int64                `json:"release_version_id"`
	AnimeID          int64                `json:"anime_id"`
	EpisodeNumber    int32                `json:"episode_number"`
	Title            *string              `json:"title,omitempty"`
	ReleaseVersion   *string              `json:"release_version,omitempty"`
	// ReleaseName is the GAP-02 display name (164-UAT.md, public_release_name.go):
	// the group-entered Title verbatim when genuinely entered, otherwise the computed
	// "<Episodentitel> · (<Gruppe(n)>) · <Version>" default. Always populated by the
	// backend, never derived client-side from Title.
	ReleaseName      string               `json:"release_name"`
	FansubGroups     []FansubGroupSummary `json:"fansub_groups"`
	VideoQuality     *string              `json:"video_quality,omitempty"`
	SubtitleType     *string              `json:"subtitle_type,omitempty"`
	ReleaseDate      *time.Time           `json:"release_date,omitempty"`
	Container        *string              `json:"container,omitempty"`
	VideoCodec       *string              `json:"video_codec,omitempty"`
	HasImages        bool                 `json:"has_images"`
	HasNotes         bool                 `json:"has_notes"`
	HasKaraoke       bool                 `json:"has_karaoke"`
}

type PublicGroupedEpisode struct {
	EpisodeID        int64                  `json:"episode_id"`
	EpisodeNumber    int32                  `json:"episode_number"`
	EpisodeTitle     *string                `json:"episode_title,omitempty"`
	DefaultVersionID *int64                 `json:"default_version_id,omitempty"`
	VersionCount     int32                  `json:"version_count"`
	Versions         []PublicEpisodeVersion `json:"versions"`
	FillerType       string                 `json:"filler_type"`
	EpisodeType      string                 `json:"episode_type"`
}

// PublicEpisodeFlags carries the batched, visibility-gated presence flags
// resolvePublicEpisodeFlags resolves in one round trip per page request
// (never per release). See episode_version_public_flags.go.
type PublicEpisodeFlags struct {
	HasImages  bool
	HasNotes   bool
	HasKaraoke bool
}

type PublicEpisodePagination struct {
	HasMore    bool    `json:"has_more"`
	NextCursor *string `json:"next_cursor"`
	RowLimit   int     `json:"row_limit"`
}

type PublicGroupedEpisodesData struct {
	AnimeID      int64                   `json:"anime_id"`
	Episodes     []PublicGroupedEpisode  `json:"episodes"`
	EpisodeCount int64                   `json:"episode_count"`
	Pagination   PublicEpisodePagination `json:"pagination"`
}
