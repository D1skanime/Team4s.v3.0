package models

import "time"

const (
	AppUserStatusPending  = "pending"
	AppUserStatusActive   = "active"
	AppUserStatusDisabled = "disabled"

	AppGlobalRolePlatformAdmin = "platform_admin"
	AppGlobalRoleContentAdmin  = "content_admin"
	AppGlobalRoleUser          = "user"

	FansubGroupMemberStatusActive   = "active"
	FansubGroupMemberStatusDisabled = "disabled"

	FansubGroupMemberRoleLead = "fansub_lead"

	FansubGroupInvitationStatusPending   = "pending"
	FansubGroupInvitationStatusAccepted  = "accepted"
	FansubGroupInvitationStatusCancelled = "cancelled"
	FansubGroupInvitationStatusExpired   = "expired"
)

type AppUser struct {
	ID                int64      `json:"id"`
	LegacyUserID      *int64     `json:"legacy_user_id,omitempty"`
	KeycloakSubject   string     `json:"keycloak_subject"`
	Email             string     `json:"email"`
	DisplayName       string     `json:"display_name"`
	PreferredUsername *string    `json:"preferred_username,omitempty"`
	GivenName         *string    `json:"given_name,omitempty"`
	FamilyName        *string    `json:"family_name,omitempty"`
	Status            string     `json:"status"`
	LastLoginAt       *time.Time `json:"last_login_at,omitempty"`
	LastLogoutAt      *time.Time `json:"last_logout_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	GlobalRoles       []string   `json:"global_roles,omitempty"`
}

type CurrentUser struct {
	AppUser
	SessionID       string `json:"session_id,omitempty"`
	IsPlatformAdmin bool   `json:"is_platform_admin"`
}

type KeycloakIdentity struct {
	Subject           string
	Email             string
	DisplayName       string
	PreferredUsername string
	GivenName         string
	FamilyName        string
	SessionID         string
	ExpiresAt         time.Time
}

type FansubGroupAppMember struct {
	ID               int64                       `json:"id"`
	FansubGroupID    int64                       `json:"fansub_group_id"`
	AppUserID        int64                       `json:"app_user_id"`
	Status           string                      `json:"status"`
	Roles            []string                    `json:"roles"`
	MediaPermissions FansubGroupMediaPermissions `json:"media_permissions"`
	CreatedByAppUser *int64                      `json:"created_by_app_user_id,omitempty"`
	UpdatedByAppUser *int64                      `json:"updated_by_app_user_id,omitempty"`
	CreatedAt        time.Time                   `json:"created_at"`
	UpdatedAt        time.Time                   `json:"updated_at"`
	AppUser          *AppUser                    `json:"app_user,omitempty"`
	Member           *FansubGroupMemberIdentity  `json:"member,omitempty"`
}

type FansubGroupMediaPermissions struct {
	CanUpload    bool `json:"can_upload"`
	CanDeleteOwn bool `json:"can_delete_own"`
	CanDeleteAll bool `json:"can_delete_all"`
	CanReorder   bool `json:"can_reorder"`
}

type AppUserListItem struct {
	AppUser
}

type FansubGroupMemberIdentity struct {
	MemberID   int64   `json:"member_id"`
	FansubName string  `json:"fansub_name"`
	AvatarURL  *string `json:"avatar_url,omitempty"`
}

type FansubGroupMemberCandidate struct {
	AppUserID  int64  `json:"app_user_id"`
	MemberID   int64  `json:"member_id"`
	FansubName string `json:"fansub_name"`
}

type FansubGroupMemberCreateInput struct {
	AppUserID          int64
	Roles              []string
	CreatedByAppUserID *int64
}

type FansubGroupMemberRoleUpdateInput struct {
	Role               string
	Enable             bool
	CreatedByAppUserID *int64
}

type FansubGroupMemberStatusUpdateInput struct {
	Status             string
	UpdatedByAppUserID *int64
}

type FansubGroupMemberMediaPermissionsUpdateInput struct {
	Permissions        FansubGroupMediaPermissions
	UpdatedByAppUserID *int64
}

type FansubGroupInvitation struct {
	ID                 int64                      `json:"id"`
	FansubGroupID      int64                      `json:"fansub_group_id"`
	Email              string                     `json:"email"`
	InvitedRoleCodes   []string                   `json:"invited_role_codes"`
	Status             string                     `json:"status"`
	ExpiresAt          time.Time                  `json:"expires_at"`
	CreatedByAppUserID *int64                     `json:"created_by_app_user_id,omitempty"`
	AcceptedByAppUser  *int64                     `json:"accepted_by_app_user_id,omitempty"`
	CancelledByAppUser *int64                     `json:"cancelled_by_app_user_id,omitempty"`
	AcceptedAt         *time.Time                 `json:"accepted_at,omitempty"`
	CancelledAt        *time.Time                 `json:"cancelled_at,omitempty"`
	CreatedAt          time.Time                  `json:"created_at"`
	UpdatedAt          time.Time                  `json:"updated_at"`
	Member             *FansubGroupMemberIdentity `json:"member,omitempty"`
}

type FansubGroupInvitationCreateInput struct {
	Email              string
	InvitedRoleCodes   []string
	ExpiresAt          *time.Time
	CreatedByAppUserID *int64
}

type FansubGroupInvitationCreateResult struct {
	Invitation FansubGroupInvitation `json:"invitation"`
	InviteLink string                `json:"invite_link"`
}

type FansubGroupInvitationCancelInput struct {
	CancelledByAppUserID *int64
}

type AcceptFansubInvitationInput struct {
	Token        string
	ActorAppUser AppUser
}
