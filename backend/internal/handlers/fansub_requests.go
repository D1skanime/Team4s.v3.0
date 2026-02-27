package handlers

type fansubGroupCreateRequest struct {
	Slug          string  `json:"slug"`
	Name          string  `json:"name"`
	Description   *string `json:"description"`
	History       *string `json:"history"`
	LogoID        *int64  `json:"logo_id"`
	BannerID      *int64  `json:"banner_id"`
	LogoURL       *string `json:"logo_url"`
	BannerURL     *string `json:"banner_url"`
	FoundedYear   *int32  `json:"founded_year"`
	DissolvedYear *int32  `json:"dissolved_year"`
	Status        string  `json:"status"`
	GroupType     *string `json:"group_type"`
	WebsiteURL    *string `json:"website_url"`
	DiscordURL    *string `json:"discord_url"`
	IrcURL        *string `json:"irc_url"`
	Country       *string `json:"country"`
}

type fansubMemberCreateRequest struct {
	Handle    string  `json:"handle"`
	Role      string  `json:"role"`
	SinceYear *int32  `json:"since_year"`
	UntilYear *int32  `json:"until_year"`
	Notes     *string `json:"notes"`
}

type fansubAliasCreateRequest struct {
	Alias string `json:"alias"`
}

type animeFansubAttachRequest struct {
	IsPrimary *bool   `json:"is_primary"`
	Notes     *string `json:"notes"`
}
