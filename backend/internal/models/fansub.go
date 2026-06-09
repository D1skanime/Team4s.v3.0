package models

import "time"

// FansubGroupType unterscheidet regulaere Fansub-Gruppen (einziger erlaubter Wert nach Phase 81).
type FansubGroupType string

// FansubGroupLinkType beschreibt die erlaubten generischen Link-Typen fuer Fansub-Gruppen.
type FansubGroupLinkType string

const (
	// FansubGroupTypeGroup bezeichnet eine normale Fansub-Gruppe.
	FansubGroupTypeGroup FansubGroupType = "group"

	// FansubGroupLinkTypeWebsite steht fuer die Haupt-Webseite einer Gruppe.
	FansubGroupLinkTypeWebsite FansubGroupLinkType = "website"
	// FansubGroupLinkTypeDiscord steht fuer Discord-Einladungen oder Community-Server.
	FansubGroupLinkTypeDiscord FansubGroupLinkType = "discord"
	// FansubGroupLinkTypeTwitter steht fuer X/Twitter-Profile.
	FansubGroupLinkTypeTwitter FansubGroupLinkType = "twitter"
	// FansubGroupLinkTypeGitHub steht fuer GitHub-Profile oder Organisationen.
	FansubGroupLinkTypeGitHub FansubGroupLinkType = "github"
	// FansubGroupLinkTypeIRC steht fuer IRC-Kontaktadressen.
	FansubGroupLinkTypeIRC FansubGroupLinkType = "irc"
)

// FansubFilter enthaelt die Filter- und Paginierungsparameter fuer Fansub-Listenabfragen.
type FansubFilter struct {
	Page    int
	PerPage int
	Q       string
	Status  string
}

// FansubGroup enthaelt alle Detailfelder einer Fansub-Gruppe.
type FansubGroup struct {
	ID                   int64                `json:"id"`
	Slug                 string               `json:"slug"`
	Name                 string               `json:"name"`
	LogoID               *int64               `json:"logo_id,omitempty"`
	BannerID             *int64               `json:"banner_id,omitempty"`
	LogoURL              *string              `json:"logo_url,omitempty"`
	BannerURL            *string              `json:"banner_url,omitempty"`
	FoundedYear          *int32               `json:"founded_year,omitempty"`
	DissolvedYear        *int32               `json:"dissolved_year,omitempty"`
	ClosedYear           *int32               `json:"closed_year,omitempty"`
	Status               string               `json:"status"`
	GroupType            FansubGroupType      `json:"group_type"`
	WebsiteURL           *string              `json:"website_url,omitempty"`
	DiscordURL           *string              `json:"discord_url,omitempty"`
	IrcURL               *string              `json:"irc_url,omitempty"`
	Country              *string              `json:"country,omitempty"`
	AnimeRelationsCount  int                  `json:"anime_relations_count"`
	ReleaseVersionsCount int                  `json:"release_versions_count"`
	MembersCount         int                  `json:"members_count"`
	AliasesCount         int                  `json:"aliases_count"`
	CreatedAt            time.Time            `json:"created_at"`
	UpdatedAt            time.Time            `json:"updated_at"`
	Links                []FansubGroupLink    `json:"links,omitempty"`
}

// PublicFansubProfileResponse bundles the public data needed by /fansubs/[slug].
type PublicFansubProfileResponse struct {
	Group                FansubGroup             `json:"group"`
	Story                *PublicFansubStory      `json:"story"`
	Projects             []PublicFansubProject   `json:"projects"`
	History              []PublicFansubHistory   `json:"history"`
	Media                []PublicFansubMediaItem `json:"media"`
}

// PublicFansubStory is the public, published fansub_group_notes projection.
type PublicFansubStory struct {
	ID        int64  `json:"id"`
	Title     string `json:"title"`
	BodyHTML  string `json:"body_html"`
	BodyText  string `json:"body_text"`
	UpdatedAt string `json:"updated_at,omitempty"`
}

// PublicFansubProject is an anime_fansub_groups-backed public project card.
type PublicFansubProject struct {
	ID          int64   `json:"id"`
	Title       string  `json:"title"`
	Type        string  `json:"type"`
	Status      string  `json:"status"`
	Year        *int16  `json:"year,omitempty"`
	CoverImage  *string `json:"cover_image,omitempty"`
	MaxEpisodes *int16  `json:"max_episodes,omitempty"`
}

// PublicFansubHistory is a confirmed fansub_group_history milestone.
type PublicFansubHistory struct {
	ID        int64   `json:"id"`
	Year      *int    `json:"year,omitempty"`
	EventType string  `json:"event_type"`
	Title     *string `json:"title,omitempty"`
	Note      *string `json:"note,omitempty"`
	Status    string  `json:"status"`
}

// PublicFansubMediaItem is one public approved context media item from fansub_group_media.
type PublicFansubMediaItem struct {
	ID           int64   `json:"id"`
	MediaType    string  `json:"media_type"`
	Caption      *string `json:"caption,omitempty"`
	MimeType     string  `json:"mime_type"`
	ThumbnailURL *string `json:"thumbnail_url,omitempty"`
	OriginalURL  *string `json:"original_url,omitempty"`
}

// FansubGroupSummary ist eine kompakte Kurzform einer Fansub-Gruppe.
type FansubGroupSummary struct {
	ID      int64   `json:"id"`
	Slug    string  `json:"slug"`
	Name    string  `json:"name"`
	LogoURL *string `json:"logo_url,omitempty"`
}

// FansubMember repraesentiert ein Mitglied einer Fansub-Gruppe mit Rolle und Zeitraum.
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

// FansubAlias repraesentiert einen alternativen Namen einer Fansub-Gruppe.
type FansubAlias struct {
	ID            int64     `json:"id"`
	FansubGroupID int64     `json:"fansub_group_id"`
	Alias         string    `json:"alias"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// FansubGroupLink beschreibt einen generischen Community-Link einer Fansub-Gruppe.
type FansubGroupLink struct {
	ID        int64               `json:"id"`
	GroupID   int64               `json:"group_id"`
	LinkType  FansubGroupLinkType `json:"link_type"`
	Name      *string             `json:"name,omitempty"`
	URL       string              `json:"url"`
	CreatedAt time.Time           `json:"created_at"`
}

// AnimeFansubRelation verknuepft einen Anime mit einer Fansub-Gruppe.
type AnimeFansubRelation struct {
	AnimeID       int64               `json:"anime_id"`
	FansubGroupID int64               `json:"fansub_group_id"`
	IsPrimary     bool                `json:"is_primary"`
	Notes         *string             `json:"notes,omitempty"`
	CreatedAt     time.Time           `json:"created_at"`
	FansubGroup   *FansubGroupSummary `json:"fansub_group,omitempty"`
}

// FansubAliasCreateInput enthaelt die Eingabedaten zum Anlegen eines neuen Fansub-Alias.
type FansubAliasCreateInput struct {
	Alias           string
	NormalizedAlias string
}

// AnimeFansubAliasCandidate verknuepft eine Fansub-Gruppe mit einem Alias-Kandidaten.
type AnimeFansubAliasCandidate struct {
	FansubGroupID int64
	Alias         string
}

// FansubGroupCreateInput enthaelt die Felder zum Erstellen einer neuen Fansub-Gruppe.
type FansubGroupCreateInput struct {
	Slug          string
	Name          string
	LogoID        *int64
	BannerID      *int64
	LogoURL       *string
	BannerURL     *string
	FoundedYear   *int32
	DissolvedYear *int32
	Status        string
	GroupType     FansubGroupType
	WebsiteURL    *string
	DiscordURL    *string
	IrcURL        *string
	Country       *string
}

// FansubGroupPatchInput enthaelt die patch-faehigen Felder einer Fansub-Gruppe.
type FansubGroupPatchInput struct {
	Slug          OptionalString `json:"slug"`
	Name          OptionalString `json:"name"`
	LogoID        OptionalInt64  `json:"logo_id"`
	BannerID      OptionalInt64  `json:"banner_id"`
	LogoURL       OptionalString `json:"logo_url"`
	BannerURL     OptionalString `json:"banner_url"`
	FoundedYear   OptionalInt32  `json:"founded_year"`
	DissolvedYear OptionalInt32  `json:"dissolved_year"`
	Status        OptionalString `json:"status"`
	GroupType     OptionalString `json:"group_type"`
	WebsiteURL    OptionalString `json:"website_url"`
	DiscordURL    OptionalString `json:"discord_url"`
	IrcURL        OptionalString `json:"irc_url"`
	Country       OptionalString `json:"country"`
}

// FansubGroupLinkCreateInput enthaelt die Daten zum Anlegen eines generischen Fansub-Links.
type FansubGroupLinkCreateInput struct {
	LinkType FansubGroupLinkType
	Name     *string
	URL      string
}

// FansubGroupLinkPatchInput enthaelt patch-faehige Felder eines generischen Fansub-Links.
type FansubGroupLinkPatchInput struct {
	LinkType OptionalString `json:"link_type"`
	Name     OptionalString `json:"name"`
	URL      OptionalString `json:"url"`
}

// MergeGroupsResult contains statistics from a fansub group merge operation.
type MergeGroupsResult struct {
	MergedCount       int      `json:"merged_count"`
	VersionsMigrated  int      `json:"versions_migrated"`
	MembersMigrated   int      `json:"members_migrated"`
	RelationsMigrated int      `json:"relations_migrated"`
	AliasesAdded      []string `json:"aliases_added"`
}

type MergePreviewConflicts struct {
	VersionConflicts          int      `json:"version_conflicts"`
	DuplicateAliasesCount     int      `json:"duplicate_aliases_count"`
	DuplicateAliases          []string `json:"duplicate_aliases"`
	DuplicateMembersCount     int      `json:"duplicate_members_count"`
	DuplicateMembers          []string `json:"duplicate_members"`
	DuplicateRelationsCount   int      `json:"duplicate_relations_count"`
	DuplicateRelationAnimeIDs []int64  `json:"duplicate_relation_anime_ids"`
	DuplicateSlugsCount       int      `json:"duplicate_slugs_count"`
	DuplicateSlugs            []string `json:"duplicate_slugs"`
	DuplicateNamesCount       int      `json:"duplicate_names_count"`
	DuplicateNames            []string `json:"duplicate_names"`
}

type MergeGroupsPreview struct {
	MergedCount       int                   `json:"merged_count"`
	VersionsMigrated  int                   `json:"versions_migrated"`
	MembersMigrated   int                   `json:"members_migrated"`
	RelationsMigrated int                   `json:"relations_migrated"`
	AliasesAdded      []string              `json:"aliases_added"`
	AliasesSkipped    []string              `json:"aliases_skipped"`
	CanMerge          bool                  `json:"can_merge"`
	Conflicts         MergePreviewConflicts `json:"conflicts"`
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
