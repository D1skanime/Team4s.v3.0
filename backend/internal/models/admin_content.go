package models

import (
	"bytes"
	"encoding/json"
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
	Title               string
	TitleDE             *string
	TitleEN             *string
	Type                string
	ContentType         string
	Status              string
	Year                *int16
	MaxEpisodes         *int16
	Genre               *string
	Description         *string
	CoverImage          *string
	BannerImage         *string
	LogoImage           *string
	BackgroundVideoURL  *string
	BackgroundImageURLs []string
	Source              *string
	SourceLinks         []string
	FolderName          *string
	Tags                []string
	AltTitles           []AdminAnimeAltTitle
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
	Title       OptionalString       `json:"title"`
	TitleDE     OptionalString       `json:"title_de"`
	TitleEN     OptionalString       `json:"title_en"`
	Type        OptionalString       `json:"type"`
	ContentType OptionalString       `json:"content_type"`
	Status      OptionalString       `json:"status"`
	Year        OptionalInt16        `json:"year"`
	MaxEpisodes OptionalInt16        `json:"max_episodes"`
	Genre       OptionalString       `json:"genre"`
	Tags        OptionalStringSlice  `json:"tags"`
	Description OptionalString       `json:"description"`
	CoverImage  OptionalString       `json:"cover_image"`
	Source      OptionalString       `json:"source"`
	FolderName  OptionalString       `json:"folder_name"`
	AltTitles   []AdminAnimeAltTitle `json:"alt_titles,omitempty"`
}

// AdminTagToken is a normalized tag value with its usage count across all anime.
// Mirrors the genre token shape so frontend state management stays parallel.
type AdminTagToken struct {
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// AdminTagNameRow is one row of the admin tag-maintenance list: the tag's id,
// base name, usage count across all anime, and its current German display
// name (nil if untranslated). Used by ListTagNamesAdmin (D-04).
type AdminTagNameRow struct {
	ID     int64   `json:"id"`
	Name   string  `json:"name"`
	Count  int64   `json:"count"`
	NameDE *string `json:"name_de"`
}

// AdminGenreNameRow mirrors AdminTagNameRow for genres. Used by
// ListGenreNamesAdmin (D-04/D-07).
type AdminGenreNameRow struct {
	ID     int64   `json:"id"`
	Name   string  `json:"name"`
	Count  int64   `json:"count"`
	NameDE *string `json:"name_de"`
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
	FillerType    OptionalString `json:"filler_type"`
	EpisodeType   OptionalString `json:"episode_type"`
	ActorUserID   int64          `json:"-"`
}

type AdminAnimeItem struct {
	ID               int64    `json:"id"`
	Title            string   `json:"title"`
	TitleDE          *string  `json:"title_de,omitempty"`
	TitleEN          *string  `json:"title_en,omitempty"`
	Type             string   `json:"type"`
	ContentType      string   `json:"content_type"`
	Status           string   `json:"status"`
	Year             *int16   `json:"year,omitempty"`
	MaxEpisodes      *int16   `json:"max_episodes,omitempty"`
	Genre            *string  `json:"genre,omitempty"`
	Description      *string  `json:"description,omitempty"`
	CoverImage       *string  `json:"cover_image,omitempty"`
	Source           *string  `json:"source,omitempty"`
	SourceLinks      []string `json:"source_links,omitempty"`
	FolderName       *string  `json:"folder_name,omitempty"`
	AniSearchID      *string  `json:"anisearch_id,omitempty"`
	JellyfinSeriesID *string  `json:"jellyfin_series_id,omitempty"`
	Tags             []string `json:"tags,omitempty"`
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
	// Episode-eigene Einstufung; nur bei PATCH-Antworten befüllt.
	FillerType        *string `json:"filler_type,omitempty"`
	FillerTypeSource  *string `json:"filler_type_source,omitempty"`
	EpisodeType       *string `json:"episode_type,omitempty"`
	EpisodeTypeSource *string `json:"episode_type_source,omitempty"`
}

type AdminEpisodeDeleteResult struct {
	EpisodeID              int64  `json:"episode_id"`
	AnimeID                int64  `json:"anime_id"`
	EpisodeNumber          string `json:"episode_number"`
	DeletedReleaseVariants int32  `json:"deleted_release_variants"`
}
