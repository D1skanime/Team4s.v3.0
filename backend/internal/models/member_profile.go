package models

import "time"

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
	FansubGroupID     int64    `json:"fansub_group_id"`
	FansubGroupName   string   `json:"fansub_group_name"`
	FansubGroupSlug   string   `json:"fansub_group_slug"`
	GroupStatus       string   `json:"group_status"`
	JoinedYear        *int32   `json:"joined_year,omitempty"`
	LeftYear          *int32   `json:"left_year,omitempty"`
	AppMemberStatus   *string  `json:"app_member_status,omitempty"`
	AppMemberRoles    []string `json:"app_member_roles,omitempty"`
	HasHistoricalLink bool     `json:"has_historical_link"`
}

type MemberProfileCredit struct {
	FansubGroupID   int64  `json:"fansub_group_id"`
	FansubGroupName string `json:"fansub_group_name"`
	RoleName        string `json:"role_name"`
	RoleLabel       string `json:"role_label"`
	ReleaseCount    int32  `json:"release_count"`
}

type MemberProfile struct {
	MemberID           int64                     `json:"member_id"`
	AppUserID          int64                     `json:"app_user_id"`
	LegacyUserID       *int64                    `json:"legacy_user_id,omitempty"`
	DisplayName        string                    `json:"display_name"`
	FansubName         string                    `json:"fansub_name"`
	Email              string                    `json:"email"`
	KeycloakSubject    string                    `json:"keycloak_subject"`
	Bio                *string                   `json:"bio,omitempty"`
	MemberStory        *string                   `json:"member_story,omitempty"`
	ActiveFromYear     *int32                    `json:"active_from_year,omitempty"`
	ActiveUntilYear    *int32                    `json:"active_until_year,omitempty"`
	IsCurrentlyActive  bool                      `json:"is_currently_active"`
	ProfileVisibility  string                    `json:"profile_visibility"`
	Avatar             *MediaAsset               `json:"avatar,omitempty"`
	KeycloakAccountURL *string                   `json:"keycloak_account_url,omitempty"`
	Capabilities       MemberProfileCapabilities `json:"capabilities"`
	Memberships        []MemberProfileMembership `json:"memberships"`
	HistoricalCredits  []MemberProfileCredit     `json:"historical_credits"`
	CreatedAt          time.Time                 `json:"created_at"`
	UpdatedAt          time.Time                 `json:"updated_at"`
	AccountStatus      string                    `json:"account_status"`
	AccountDisplayName string                    `json:"account_display_name"`
	AccountGlobalRoles []string                  `json:"account_global_roles"`
}

type MemberProfileUpdateInput struct {
	DisplayName       OptionalString `json:"display_name"`
	FansubName        OptionalString `json:"fansub_name"`
	Bio               OptionalString `json:"bio"`
	MemberStory       OptionalString `json:"member_story"`
	ActiveFromYear    OptionalInt32  `json:"active_from_year"`
	ActiveUntilYear   OptionalInt32  `json:"active_until_year"`
	IsCurrentlyActive OptionalBool   `json:"is_currently_active"`
	ProfileVisibility OptionalString `json:"profile_visibility"`
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
