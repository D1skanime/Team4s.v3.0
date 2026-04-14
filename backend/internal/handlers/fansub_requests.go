package handlers

// fansubGroupCreateRequest enthält die Felder zum Anlegen einer neuen Fansub-Gruppe.
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

// fansubMemberCreateRequest enthält die Felder zum Anlegen eines neuen Fansub-Mitglieds.
type fansubMemberCreateRequest struct {
	Handle    string  `json:"handle"`
	Role      string  `json:"role"`
	SinceYear *int32  `json:"since_year"`
	UntilYear *int32  `json:"until_year"`
	Notes     *string `json:"notes"`
}

// fansubAliasCreateRequest enthält das Feld zum Anlegen eines neuen Fansub-Alias.
type fansubAliasCreateRequest struct {
	Alias string `json:"alias"`
}

// animeFansubAttachRequest enthält die Felder zum Verknüpfen eines Anime mit einer Fansub-Gruppe.
type animeFansubAttachRequest struct {
	IsPrimary *bool   `json:"is_primary"`
	Notes     *string `json:"notes"`
}
