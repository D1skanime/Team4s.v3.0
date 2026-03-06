package models

import "time"

// GroupDetail represents detailed information about a fansub group's work on an anime
type GroupDetail struct {
	ID        int64                `json:"id"`
	AnimeID   int64                `json:"anime_id"`
	FansubID  int64                `json:"fansub_id"`
	Fansub    FansubGroupWithLogo  `json:"fansub"`
	Story     *string              `json:"story,omitempty"`
	Period    *GroupPeriod         `json:"period,omitempty"`
	Stats     GroupStats           `json:"stats"`
	CreatedAt time.Time            `json:"created_at"`
	UpdatedAt *time.Time           `json:"updated_at,omitempty"`
}

// FansubGroupWithLogo extends FansubGroupSummary with logo_url
type FansubGroupWithLogo struct {
	ID      int64   `json:"id"`
	Slug    string  `json:"slug"`
	Name    string  `json:"name"`
	LogoURL *string `json:"logo_url,omitempty"`
}

// GroupPeriod represents the time period a group worked on an anime
type GroupPeriod struct {
	Start *string `json:"start,omitempty"`
	End   *string `json:"end,omitempty"`
}

// GroupStats contains statistics about a group's work
type GroupStats struct {
	MemberCount  int32 `json:"member_count"`
	EpisodeCount int32 `json:"episode_count"`
}

// EpisodeReleaseSummary represents a summary of an episode release
type EpisodeReleaseSummary struct {
	ID              int64      `json:"id"`
	EpisodeID       *int64     `json:"episode_id,omitempty"`
	EpisodeNumber   int32      `json:"episode_number"`
	Title           *string    `json:"title,omitempty"`
	HasOP           bool       `json:"has_op"`
	HasED           bool       `json:"has_ed"`
	KaraokeCount    int32      `json:"karaoke_count"`
	InsertCount     int32      `json:"insert_count"`
	ScreenshotCount int32      `json:"screenshot_count"`
	ThumbnailURL    *string    `json:"thumbnail_url,omitempty"`
	ReleasedAt      *time.Time `json:"released_at,omitempty"`
}

// GroupReleasesData contains group detail and episode releases
type GroupReleasesData struct {
	Group       GroupDetail             `json:"group"`
	Episodes    []EpisodeReleaseSummary `json:"episodes"`
	OtherGroups []FansubGroupSummary    `json:"other_groups"`
}

// GroupReleasesFilter contains filter parameters for releases query
type GroupReleasesFilter struct {
	Page       int
	PerPage    int
	HasOP      *bool
	HasED      *bool
	HasKaraoke *bool
	Q          string
}
