package models

import "time"

// EpisodeVersionImage repräsentiert ein einzelnes Galeriebild einer Episodenversion
// mit optionalem Thumbnail und Anzeigenreihenfolge.
type EpisodeVersionImage struct {
	ID               int64      `json:"id"`
	EpisodeVersionID int64      `json:"episode_version_id"`
	URL              string     `json:"url"`
	ThumbnailURL     *string    `json:"thumbnail_url,omitempty"`
	Width            *int32     `json:"width,omitempty"`
	Height           *int32     `json:"height,omitempty"`
	Caption          *string    `json:"caption,omitempty"`
	DisplayOrder     int32      `json:"display_order"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// EpisodeVersionImageCreateInput enthält die Eingabedaten zum Hinzufügen eines
// neuen Galeriebildes zu einer Episodenversion.
type EpisodeVersionImageCreateInput struct {
	EpisodeVersionID int64
	URL              string
	ThumbnailURL     *string
	Width            *int32
	Height           *int32
	Caption          *string
	DisplayOrder     int32
}

// EpisodeVersionImageUpdateInput enthält die patch-fähigen Felder eines Episodenversionsbildes,
// nur gesetzte Felder werden aktualisiert.
type EpisodeVersionImageUpdateInput struct {
	URL          OptionalString `json:"url"`
	ThumbnailURL OptionalString `json:"thumbnail_url"`
	Width        OptionalInt32  `json:"width"`
	Height       OptionalInt32  `json:"height"`
	Caption      OptionalString `json:"caption"`
	DisplayOrder OptionalInt32  `json:"display_order"`
}

// EpisodeVersionImagesResponse ist die paginierte Antwortstruktur für Galeriebilder
// einer Episodenversion mit optionalem Cursor für cursor-basierte Paginierung.
type EpisodeVersionImagesResponse struct {
	Images []EpisodeVersionImage `json:"images"`
	Cursor *string               `json:"cursor"`
}
