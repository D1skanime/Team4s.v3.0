package models

import (
	"encoding/json"
	"time"
)

const (
	ProfileVisibilityPublic      = "public"
	ProfileVisibilityMembersOnly = "members_only"
)

type MemberProfileCapabilities struct {
	CanViewOwnProfile      bool `json:"can_view_own_profile"`
	CanEditOwnProfile      bool `json:"can_edit_own_profile"`
	CanUploadOwnAvatar     bool `json:"can_upload_own_avatar"`
	CanOpenKeycloakAccount bool `json:"can_open_keycloak_account"`
	CanViewMemberships     bool `json:"can_view_memberships"`
	CanViewHistoricalCreds bool `json:"can_view_historical_credits"`
}

type MemberProfileMembership struct {
	FansubGroupID          int64    `json:"fansub_group_id"`
	FansubGroupName        string   `json:"fansub_group_name"`
	FansubGroupSlug        string   `json:"fansub_group_slug"`
	LogoURL                *string  `json:"logo_url,omitempty"`
	GroupStatus            string   `json:"group_status"`
	JoinedYear             *int32   `json:"joined_year,omitempty"`
	LeftYear               *int32   `json:"left_year,omitempty"`
	AppMemberStatus        *string  `json:"app_member_status,omitempty"`
	AppMemberRoles         []string `json:"app_member_roles,omitempty"`
	HasHistoricalLink      bool     `json:"has_historical_link"`
	HistoricalMemberStatus *string  `json:"historical_member_status,omitempty"`
}

type MemberProfileCredit struct {
	FansubGroupID   int64  `json:"fansub_group_id"`
	FansubGroupName string `json:"fansub_group_name"`
	RoleName        string `json:"role_name"`
	RoleLabel       string `json:"role_label"`
	ReleaseCount    int32  `json:"release_count"`
}

type MemberProfileRecentMedia struct {
	ID                  int64  `json:"id"`
	Category            string `json:"category"`
	Caption             string `json:"caption,omitempty"`
	ThumbnailURL        string `json:"thumbnail_url,omitempty"`
	AnimeTitle          string `json:"anime_title"`
	ReleaseVersionID    int64  `json:"release_version_id"`
	ReleaseVersionLabel string `json:"release_version_label"`
}

type MemberProfileRecentContribution struct {
	ID                        int64    `json:"id"`
	AnimeTitle                string   `json:"anime_title"`
	AnimeID                   int64    `json:"anime_id"`
	FansubGroupID             int64    `json:"fansub_group_id"`
	FansubGroupName           string   `json:"fansub_group_name"`
	FansubGroupNames          []string `json:"fansub_group_names"`
	RoleName                  string   `json:"role_name"`
	RoleNames                 []string `json:"role_names"`
	RoleLabel                 string   `json:"role_label"`
	RoleLabels                []string `json:"role_labels"`
	ReleaseVersionCount       int32    `json:"release_version_count"`
	EpisodeCount              int32    `json:"episode_count"`
	WorkedReleaseVersionCount int32    `json:"worked_release_version_count"`
	TotalReleaseVersionCount  int32    `json:"total_release_version_count"`
}

type MemberProfile struct {
	MemberID         int64 `json:"member_id"`
	HasMemberProfile bool  `json:"has_member_profile"`
	// HasProjectAssignments is the authoritative project-eligibility signal (D-06/D-09).
	// True only when HasMemberProfile is true AND at least one real confirmed anime/group
	// contribution or historical release credit exists for the member. Never inferable
	// from HasMemberProfile alone.
	HasProjectAssignments           bool                              `json:"has_project_assignments"`
	AppUserID                       int64                             `json:"app_user_id"`
	LegacyUserID                    *int64                            `json:"legacy_user_id,omitempty"`
	DisplayName                     string                            `json:"display_name"`
	FansubName                      string                            `json:"fansub_name"`
	Slug                            string                            `json:"slug"`
	Email                           string                            `json:"email"`
	KeycloakSubject                 string                            `json:"keycloak_subject"`
	Bio                             *string                           `json:"bio,omitempty"`
	MemberStory                     *string                           `json:"member_story,omitempty"`
	MemberStoryJSON                 *json.RawMessage                  `json:"member_story_json,omitempty"`
	MemberStoryHTML                 *string                           `json:"member_story_html,omitempty"`
	MemberStoryText                 *string                           `json:"member_story_text,omitempty"`
	MemberStoryEditorType           string                            `json:"member_story_editor_type"`
	MemberStoryContentSchemaVersion int32                             `json:"member_story_content_schema_version"`
	ActiveFromDate                  *string                           `json:"active_from_date,omitempty"`
	ActiveUntilDate                 *string                           `json:"active_until_date,omitempty"`
	ActiveFromYear                  *int32                            `json:"active_from_year,omitempty"`
	ActiveUntilYear                 *int32                            `json:"active_until_year,omitempty"`
	IsCurrentlyActive               bool                              `json:"is_currently_active"`
	Noindex                         bool                              `json:"noindex"`
	IsVerified                      bool                              `json:"is_verified"`
	ProfileVisibility               string                            `json:"profile_visibility"`
	Avatar                          *MediaAsset                       `json:"avatar,omitempty"`
	BackgroundImage                 *MemberProfileBgImage             `json:"background_image,omitempty"`
	KeycloakAccountURL              *string                           `json:"keycloak_account_url,omitempty"`
	Capabilities                    MemberProfileCapabilities         `json:"capabilities"`
	Memberships                     []MemberProfileMembership         `json:"memberships"`
	HistoricalCredits               []MemberProfileCredit             `json:"historical_credits"`
	RecentMedia                     []MemberProfileRecentMedia        `json:"recent_media"`
	RecentContributions             []MemberProfileRecentContribution `json:"recent_contributions"`
	CreatedAt                       time.Time                         `json:"created_at"`
	UpdatedAt                       time.Time                         `json:"updated_at"`
	AccountStatus                   string                            `json:"account_status"`
	AccountDisplayName              string                            `json:"account_display_name"`
	AccountGlobalRoles              []string                          `json:"account_global_roles"`
}

type MemberProfileUpdateInput struct {
	DisplayName                     OptionalString  `json:"display_name"`
	FansubName                      OptionalString  `json:"fansub_name"`
	Bio                             OptionalString  `json:"bio"`
	MemberStory                     OptionalString  `json:"member_story"`
	MemberStoryJSON                 OptionalRawJSON `json:"member_story_json"`
	MemberStoryHTML                 OptionalString  `json:"member_story_html"`
	MemberStoryText                 OptionalString  `json:"member_story_text"`
	MemberStoryEditorType           OptionalString  `json:"member_story_editor_type"`
	MemberStoryContentSchemaVersion OptionalInt32   `json:"member_story_content_schema_version"`
	ActiveFromDate                  OptionalString  `json:"active_from_date"`
	ActiveUntilDate                 OptionalString  `json:"active_until_date"`
	IsCurrentlyActive               OptionalBool    `json:"is_currently_active"`
	ProfileVisibility               OptionalString  `json:"profile_visibility"`
}

type MemberProfileAvatarUploadInput struct {
	FilePath        string
	SourceFilePath  string
	PublicURL       string
	MimeType        string
	SourceMimeType  string
	SizeBytes       int64
	SourceSizeBytes int64
	Width           *int
	Height          *int
}

type MemberProfileBackgroundUploadInput struct {
	FilePath        string
	SourceFilePath  string
	PublicURL       string
	MimeType        string
	SourceMimeType  string
	SizeBytes       int64
	SourceSizeBytes int64
	Width           *int
	Height          *int
}

type MemberProfileAvatar struct {
	PublicURL string `json:"public_url"`
}

type MemberProfileBgImage struct {
	ID                int64  `json:"-"`
	PublicURL         string `json:"public_url"`
	SourceOriginalURL string `json:"source_original_url,omitempty"`
	StoragePath       string `json:"-"`
}

// StoryImageUploadInput haelt die Pflichtfelder fuer einen neuen media_assets-Eintrag
// fuer ein Story-Bild (analog MemberProfileAvatarUploadInput).
type StoryImageUploadInput struct {
	FilePath      string
	MimeType      string
	SizeBytes     int64
	Width         int
	Height        int
	OwnerMemberID int64
}

// StoryImageAssetRef ist die schlanke Referenz fuer den Referenz-Diff im Cleanup-on-Save.
type StoryImageAssetRef struct {
	ID            int64
	FilePath      string
	OwnerMemberID int64
}

// PublicMemberBadge ist ein schlankes Badge-DTO fuer oeffentlich sichtbare Badges
// (visibility='public' AND status='active'). Eingebettet in PublicMemberProfile (D-11/Badges-13).
type PublicMemberBadge struct {
	ID             int64   `json:"id"`
	BadgeCode      string  `json:"badge_code"`
	BadgeCategory  string  `json:"badge_category"`
	CurrentCount   *int64  `json:"current_count,omitempty"`
	CurrentTier    *string `json:"current_tier,omitempty"`
	NextThreshold  *int64  `json:"next_threshold,omitempty"`
	RemainingCount *int64  `json:"remaining_count,omitempty"`
	NextTier       *string `json:"next_tier,omitempty"`
}

type PublicMemberBadgeProgress struct {
	Family         string  `json:"family"`
	CurrentCount   int64   `json:"current_count"`
	NextThreshold  *int64  `json:"next_threshold"`
	RemainingCount *int64  `json:"remaining_count"`
	NextTier       *string `json:"next_tier"`
	Complete       bool    `json:"complete"`
}

type PublicMemberProjectReleaseVersion struct {
	ReleaseVersionID    int64    `json:"release_version_id"`
	ReleaseVersionLabel string   `json:"release_version_label"`
	Version             string   `json:"version"`
	Title               *string  `json:"title,omitempty"`
	EpisodeNumber       string   `json:"episode_number"`
	EpisodeTitle        *string  `json:"episode_title,omitempty"`
	Roles               []string `json:"roles"`
}

type PublicMemberCurrentProject struct {
	AnimeID            int64                               `json:"anime_id"`
	AnimeTitle         string                              `json:"anime_title"`
	CoverURL           *string                             `json:"cover_url,omitempty"`
	FansubGroupID      int64                               `json:"fansub_group_id"`
	FansubGroupName    string                              `json:"fansub_group_name"`
	Roles              []string                            `json:"roles"`
	ReleaseVersions    []PublicMemberProjectReleaseVersion `json:"release_versions"`
	IsProjectLevel     bool                                `json:"is_project_level"`
	ContributionStatus string                              `json:"contribution_status"`
	StartedYear        *int32                              `json:"started_year,omitempty"`
	EndedYear          *int32                              `json:"ended_year,omitempty"`
}

type PublicMemberProjectsPage struct {
	Items             []PublicMemberCurrentProject `json:"items"`
	Total             int                          `json:"total"`
	Limit             int                          `json:"limit"`
	Offset            int                          `json:"offset"`
	AppUserID         int64                        `json:"-"`
	ProfileVisibility string                       `json:"-"`
}

type PublicMemberLatestContribution struct {
	Type                string    `json:"type"`
	ID                  int64     `json:"id"`
	OccurredAt          time.Time `json:"occurred_at"`
	AnimeID             int64     `json:"anime_id"`
	AnimeTitle          string    `json:"anime_title"`
	ReleaseVersionID    int64     `json:"release_version_id"`
	ReleaseVersionLabel string    `json:"release_version_label"`
	Title               *string   `json:"title,omitempty"`
	TextPreview         *string   `json:"text_preview,omitempty"`
	BodyHTML            *string   `json:"body_html,omitempty"`
	ImageURL            *string   `json:"image_url,omitempty"`
	ThumbnailURL        *string   `json:"thumbnail_url,omitempty"`
	MediaCategory       *string   `json:"media_category,omitempty"`
}

type PublicMemberPreviousContribution struct {
	AnimeID         int64    `json:"anime_id"`
	AnimeTitle      string   `json:"anime_title"`
	FansubGroupID   int64    `json:"fansub_group_id"`
	FansubGroupName string   `json:"fansub_group_name"`
	Roles           []string `json:"roles"`
	StartedYear     *int32   `json:"started_year,omitempty"`
	EndedYear       int32    `json:"ended_year"`
}

type PublicMemberProfile struct {
	MemberID                   int64                              `json:"member_id"`
	AppUserID                  int64                              `json:"-"`
	FansubName                 string                             `json:"fansub_name"`
	Bio                        *string                            `json:"bio,omitempty"`
	MemberStoryHTML            *string                            `json:"member_story_html,omitempty"`
	ActiveFromDate             *string                            `json:"active_from_date,omitempty"`
	ActiveUntilDate            *string                            `json:"active_until_date,omitempty"`
	IsCurrentlyActive          bool                               `json:"is_currently_active"`
	Noindex                    bool                               `json:"noindex"`
	IsVerified                 bool                               `json:"is_verified"`
	ProfileStatus              string                             `json:"profile_status"`
	ProfileVisibility          string                             `json:"profile_visibility"`
	Avatar                     *MemberProfileAvatar               `json:"avatar,omitempty"`
	BackgroundImage            *MemberProfileBgImage              `json:"background_image,omitempty"`
	Memberships                []MemberProfileMembership          `json:"memberships"`
	PublicBadges               []PublicMemberBadge                `json:"public_badges"`
	BadgeProgress              []PublicMemberBadgeProgress        `json:"badge_progress"`
	TotalPoints                int64                              `json:"total_points"`
	RecentMedia                []MemberProfileRecentMedia         `json:"recent_media"`
	RecentContributions        []MemberProfileRecentContribution  `json:"recent_contributions"`
	CurrentProjects            []PublicMemberCurrentProject       `json:"current_projects"`
	CurrentProjectsCount       int                                `json:"current_projects_count"`
	LatestContributions        []PublicMemberLatestContribution   `json:"latest_contributions"`
	PreviousContributions      []PublicMemberPreviousContribution `json:"previous_contributions"`
	PreviousContributionsCount int                                `json:"previous_contributions_count"`
}

func (p PublicMemberProfile) MarshalJSON() ([]byte, error) {
	type publicMemberProfileAlias PublicMemberProfile
	if p.BadgeProgress == nil {
		p.BadgeProgress = []PublicMemberBadgeProgress{}
	}
	return json.Marshal(publicMemberProfileAlias(p))
}
