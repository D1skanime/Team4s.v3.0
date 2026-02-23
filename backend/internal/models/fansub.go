package models

import "time"

type FansubFilter struct {
	Page    int
	PerPage int
	Q       string
	Status  string
}

type FansubGroup struct {
	ID            int64     `json:"id"`
	Slug          string    `json:"slug"`
	Name          string    `json:"name"`
	Description   *string   `json:"description,omitempty"`
	History       *string   `json:"history,omitempty"`
	LogoURL       *string   `json:"logo_url,omitempty"`
	BannerURL     *string   `json:"banner_url,omitempty"`
	FoundedYear   *int32    `json:"founded_year,omitempty"`
	DissolvedYear *int32    `json:"dissolved_year,omitempty"`
	Status        string    `json:"status"`
	WebsiteURL    *string   `json:"website_url,omitempty"`
	DiscordURL    *string   `json:"discord_url,omitempty"`
	IrcURL        *string   `json:"irc_url,omitempty"`
	Country       *string   `json:"country,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type FansubGroupSummary struct {
	ID      int64   `json:"id"`
	Slug    string  `json:"slug"`
	Name    string  `json:"name"`
	LogoURL *string `json:"logo_url,omitempty"`
}

type FansubMember struct {
	ID            int64     `json:"id"`
	FansubGroupID int64     `json:"fansub_group_id"`
	Handle        string    `json:"handle"`
	Role          string    `json:"role"`
	SinceYear     *int32    `json:"since_year,omitempty"`
	UntilYear     *int32    `json:"until_year,omitempty"`
	Notes         *string   `json:"notes,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type AnimeFansubRelation struct {
	AnimeID       int64               `json:"anime_id"`
	FansubGroupID int64               `json:"fansub_group_id"`
	IsPrimary     bool                `json:"is_primary"`
	Notes         *string             `json:"notes,omitempty"`
	CreatedAt     time.Time           `json:"created_at"`
	FansubGroup   *FansubGroupSummary `json:"fansub_group,omitempty"`
}

type FansubGroupCreateInput struct {
	Slug          string
	Name          string
	Description   *string
	History       *string
	LogoURL       *string
	BannerURL     *string
	FoundedYear   *int32
	DissolvedYear *int32
	Status        string
	WebsiteURL    *string
	DiscordURL    *string
	IrcURL        *string
	Country       *string
}

type FansubGroupPatchInput struct {
	Slug          OptionalString `json:"slug"`
	Name          OptionalString `json:"name"`
	Description   OptionalString `json:"description"`
	History       OptionalString `json:"history"`
	LogoURL       OptionalString `json:"logo_url"`
	BannerURL     OptionalString `json:"banner_url"`
	FoundedYear   OptionalInt32  `json:"founded_year"`
	DissolvedYear OptionalInt32  `json:"dissolved_year"`
	Status        OptionalString `json:"status"`
	WebsiteURL    OptionalString `json:"website_url"`
	DiscordURL    OptionalString `json:"discord_url"`
	IrcURL        OptionalString `json:"irc_url"`
	Country       OptionalString `json:"country"`
}

type FansubMemberCreateInput struct {
	Handle    string
	Role      string
	SinceYear *int32
	UntilYear *int32
	Notes     *string
}

type FansubMemberPatchInput struct {
	Handle    OptionalString `json:"handle"`
	Role      OptionalString `json:"role"`
	SinceYear OptionalInt32  `json:"since_year"`
	UntilYear OptionalInt32  `json:"until_year"`
	Notes     OptionalString `json:"notes"`
}

type AnimeFansubAttachInput struct {
	IsPrimary bool
	Notes     *string
}
