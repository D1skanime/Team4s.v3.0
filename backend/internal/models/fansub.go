package models

import "time"

// FansubGroupType unterscheidet reguläre Fansub-Gruppen von Kollaborationen.
type FansubGroupType string

const (
	// FansubGroupTypeGroup bezeichnet eine normale Fansub-Gruppe.
	FansubGroupTypeGroup FansubGroupType = "group"
	// FansubGroupTypeCollaboration bezeichnet eine Kollaborationsgruppe aus mehreren Fansubs.
	FansubGroupTypeCollaboration FansubGroupType = "collaboration"
)

// FansubFilter enthält die Filter- und Paginierungsparameter für Fansub-Listenabfragen.
type FansubFilter struct {
	Page    int    // Seitennummer (1-basiert)
	PerPage int    // Einträge pro Seite
	Q       string // Volltextsuchbegriff
	Status  string // Status-Filter (z.B. "active", "inactive")
}

// FansubGroup enthält alle Detailfelder einer Fansub-Gruppe.
type FansubGroup struct {
	ID                   int64                `json:"id"`
	Slug                 string               `json:"slug"`
	Name                 string               `json:"name"`
	Description          *string              `json:"description,omitempty"`
	History              *string              `json:"history,omitempty"`
	LogoID               *int64               `json:"logo_id,omitempty"`
	BannerID             *int64               `json:"banner_id,omitempty"`
	LogoURL              *string              `json:"logo_url,omitempty"`
	BannerURL            *string              `json:"banner_url,omitempty"`
	FoundedYear          *int32               `json:"founded_year,omitempty"`
	DissolvedYear        *int32               `json:"dissolved_year,omitempty"`
	Status               string               `json:"status"`
	GroupType            FansubGroupType      `json:"group_type"`
	WebsiteURL           *string              `json:"website_url,omitempty"`
	DiscordURL           *string              `json:"discord_url,omitempty"`
	IrcURL               *string              `json:"irc_url,omitempty"`
	Country              *string              `json:"country,omitempty"`
	AnimeRelationsCount  int                  `json:"anime_relations_count"`
	EpisodeVersionsCount int                  `json:"episode_versions_count"`
	MembersCount         int                  `json:"members_count"`
	AliasesCount         int                  `json:"aliases_count"`
	CreatedAt            time.Time            `json:"created_at"`
	UpdatedAt            time.Time            `json:"updated_at"`
	CollaborationMembers []FansubGroupSummary `json:"collaboration_members,omitempty"`
}

// FansubGroupSummary ist eine kompakte Kurzform einer Fansub-Gruppe,
// die in Listenansichten und Verknüpfungen verwendet wird.
type FansubGroupSummary struct {
	ID      int64   `json:"id"`
	Slug    string  `json:"slug"`
	Name    string  `json:"name"`
	LogoURL *string `json:"logo_url,omitempty"`
}

// FansubMember repräsentiert ein Mitglied einer Fansub-Gruppe mit Rolle und Zeitraum.
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

// FansubAlias repräsentiert einen alternativen Namen (Alias) einer Fansub-Gruppe.
type FansubAlias struct {
	ID            int64     `json:"id"`
	FansubGroupID int64     `json:"fansub_group_id"`
	Alias         string    `json:"alias"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// AnimeFansubRelation verknüpft einen Anime mit einer Fansub-Gruppe und gibt an,
// ob es sich um die primäre Gruppe handelt.
type AnimeFansubRelation struct {
	AnimeID       int64               `json:"anime_id"`
	FansubGroupID int64               `json:"fansub_group_id"`
	IsPrimary     bool                `json:"is_primary"`
	Notes         *string             `json:"notes,omitempty"`
	CreatedAt     time.Time           `json:"created_at"`
	FansubGroup   *FansubGroupSummary `json:"fansub_group,omitempty"`
}

// FansubAliasCreateInput enthält die Eingabedaten zum Anlegen eines neuen Fansub-Alias.
type FansubAliasCreateInput struct {
	Alias           string // Originaler Alias-Text
	NormalizedAlias string // Normalisierte Vergleichsform des Alias
}

// AnimeFansubAliasCandidate verknüpft eine Fansub-Gruppe mit einem Alias-Kandidaten
// und wird bei der automatischen Alias-Erkennung verwendet.
type AnimeFansubAliasCandidate struct {
	FansubGroupID int64  // ID der zugehörigen Fansub-Gruppe
	Alias         string // Alias-Text
}

// FansubGroupCreateInput enthält die Pflicht- und optionalen Felder
// zum Erstellen einer neuen Fansub-Gruppe.
type FansubGroupCreateInput struct {
	Slug          string
	Name          string
	Description   *string
	History       *string
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

// FansubGroupPatchInput enthält die patch-fähigen Felder einer Fansub-Gruppe,
// wobei nur gesetzte Felder (Set=true) aktualisiert werden.
type FansubGroupPatchInput struct {
	Slug          OptionalString `json:"slug"`
	Name          OptionalString `json:"name"`
	Description   OptionalString `json:"description"`
	History       OptionalString `json:"history"`
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

// MergeGroupsResult contains statistics from a fansub group merge operation
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

// CollaborationMember represents a member group in a collaboration
type CollaborationMember struct {
	CollaborationID int64               `json:"collaboration_id"`
	MemberGroupID   int64               `json:"member_group_id"`
	AddedAt         time.Time           `json:"added_at"`
	MemberGroup     *FansubGroupSummary `json:"member_group,omitempty"`
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
