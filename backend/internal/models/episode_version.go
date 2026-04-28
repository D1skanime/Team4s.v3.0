package models

import (
	"bytes"
	"encoding/json"
	"time"
)

// EpisodeVersion repräsentiert eine einzelne Release-Version einer Episode,
// verknüpft mit einer Fansub-Gruppe und einem Medien-Provider (z.B. Jellyfin).
type EpisodeVersion struct {
	ID                    int64               `json:"id"`
	AnimeID               int64               `json:"anime_id"`
	EpisodeNumber         int32               `json:"episode_number"`
	Title                 *string             `json:"title,omitempty"`
	ReleaseVersion        *string             `json:"release_version,omitempty"`
	FansubGroup           *FansubGroupSummary `json:"fansub_group,omitempty"`
	MediaProvider         string              `json:"media_provider"`
	MediaItemID           string              `json:"media_item_id"`
	CoveredEpisodeNumbers []int32             `json:"covered_episode_numbers,omitempty"`
	VideoQuality          *string             `json:"video_quality,omitempty"`
	SubtitleType          *string             `json:"subtitle_type,omitempty"`
	ReleaseDate           *time.Time          `json:"release_date,omitempty"`
	StreamURL             *string             `json:"stream_url,omitempty"`
	SegmentCount          int32               `json:"segment_count"`
	HasSegmentAsset       bool                `json:"has_segment_asset"`
	CreatedAt             time.Time           `json:"created_at"`
	UpdatedAt             time.Time           `json:"updated_at"`
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
	AnimeID       int64
	EpisodeNumber int32
	Title         *string
	FansubGroups  []SelectedFansubGroupInput
	FansubGroupID *int64
	MediaProvider string
	MediaItemID   string
	VideoQuality  *string
	SubtitleType  *string
	ReleaseDate   *time.Time
	StreamURL     *string
}

// EpisodeVersionPatchInput enthält die patch-fähigen Felder einer Episodenversion,
// wobei nur gesetzte Felder (Set=true) in der Datenbankaktualisierung berücksichtigt werden.
type EpisodeVersionPatchInput struct {
	Title         OptionalString `json:"title"`
	FansubGroups  OptionalSelectedFansubGroups `json:"fansub_groups"`
	FansubGroupID OptionalInt64  `json:"fansub_group_id"`
	MediaProvider OptionalString `json:"media_provider"`
	MediaItemID   OptionalString `json:"media_item_id"`
	VideoQuality  OptionalString `json:"video_quality"`
	SubtitleType  OptionalString `json:"subtitle_type"`
	ReleaseDate   OptionalTime   `json:"release_date"`
	StreamURL     OptionalString `json:"stream_url"`
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
	ID            int64
	AnimeID       int64
	MediaProvider string
	MediaItemID   string
	StreamURL     *string
}

// EpisodeVersionEditorContext liefert alle Kontextdaten für den Admin-Editor
// einer Episodenversion, inklusive Anime-Pfad und verfügbare Fansub-Gruppen.
type EpisodeVersionEditorContext struct {
	Version              EpisodeVersion       `json:"version"`
	AnimeTitle           string               `json:"anime_title"`
	AnimeFolderPath      *string              `json:"anime_folder_path,omitempty"`
	CollaborationGroupID *int64               `json:"collaboration_group_id,omitempty"`
	SelectedGroups       []FansubGroupSummary `json:"selected_groups"`
}

// EpisodeVersionMediaFile repräsentiert eine einzelne Mediendatei aus einem
// Jellyfin-Ordner-Scan, inklusive erkannter Episodennummer und Qualitätsinformationen.
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

// EpisodeVersionFolderScanResult enthält das Ergebnis eines Ordner-Scans
// für eine Episodenversion mit allen gefundenen Mediendateien.
type EpisodeVersionFolderScanResult struct {
	VersionID       int64                     `json:"version_id"`
	AnimeID         int64                     `json:"anime_id"`
	AnimeFolderPath *string                   `json:"anime_folder_path,omitempty"`
	Files           []EpisodeVersionMediaFile `json:"files"`
}
