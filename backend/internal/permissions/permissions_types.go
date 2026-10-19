package permissions

import "context"

const (
	ScopeTypeGlobal  = "global"
	ScopeTypeGroup   = "group"
	ScopeTypeProject = "project"
	ScopeTypeRelease = "release"
)

type Action string

const (
	ActionFansubGroupEdit                    Action = "fansub_group.edit"
	ActionFansubGroupLinksManage             Action = "fansub_group.links.manage"
	ActionFansubGroupMembersView             Action = "fansub_group.members.view"
	ActionFansubGroupMembersManage           Action = "fansub_group.members.manage"
	ActionFansubGroupHistoricalMembersManage Action = "fansub_group.historical_members.manage"
	ActionFansubGroupHistoricalRolesManage   Action = "fansub_group.historical_roles.manage"
	ActionFansubGroupHistoricalMembersLink   Action = "fansub_group.historical_members.link"
	ActionFansubGroupInvitationsView         Action = "fansub_group.invitations.view"
	ActionFansubGroupInvitationsCreate       Action = "fansub_group.invitations.create"
	ActionFansubGroupInvitationsCancel       Action = "fansub_group.invitations.cancel"
	ActionFansubGroupInvitationsAccept       Action = "fansub_group.invitations.accept"
	ActionFansubGroupNotesWrite              Action = "fansub_group.notes.write"
	ActionFansubGroupMediaView               Action = "fansub_group_media.view"
	ActionFansubGroupMediaUpload             Action = "fansub_group_media.upload"
	ActionFansubGroupMediaUpdate             Action = "fansub_group_media.update"
	ActionFansubGroupMediaUpdateOwn          Action = "fansub_group_media.update_own"
	ActionFansubGroupMediaReorder            Action = "fansub_group_media.reorder"
	ActionFansubGroupMediaDelete             Action = "fansub_group_media.delete"
	ActionFansubGroupPageGeneralEdit         Action = "fansub_group_page.general_edit"
	ActionFansubGroupPageTechnicalLinksEdit  Action = "fansub_group_page.technical_links_edit"
	ActionFansubGroupPageFoundingHistoryEdit Action = "fansub_group_page.founding_history_edit"
	ActionFansubGroupLinksUpdate             Action = "fansub_group_links.update"
	ActionAnimeFansubProjectNotesWrite       Action = "anime_fansub_project.notes.write"
	ActionAnimeFansubProjectTimelineUpdate   Action = "anime_fansub_project.timeline.update"
	ActionReleaseView                        Action = "release.view"
	ActionReleaseVersionView                 Action = "release_version.view"
	ActionReleaseVersionMediaView            Action = "release_version_media.view"
	ActionReleaseVersionMediaUpload          Action = "release_version_media.upload"
	ActionReleaseVersionMediaUpdate          Action = "release_version_media.update"
	ActionReleaseVersionMediaDelete          Action = "release_version_media.delete"
	ActionReleaseVersionMediaDeleteOwn       Action = "release_version_media.delete_own"
	ActionReleaseVersionMediaReorder         Action = "release_version_media.reorder"
	ActionReleaseVersionMediaHighlight       Action = "release_version_media.highlight"
	ActionReleaseThemeAssetUpload            Action = "release_version_theme_asset.upload"
	ActionReleaseVersionNotesWrite           Action = "release_version.notes.write"
	ActionReleaseVersionNotesViewAll         Action = "release_version.notes.view_all"
	ActionReleaseVersionSegmentsManage       Action = "release_version.segments.manage"
	ActionReleaseVersionMetadataUpdate       Action = "release_version.metadata.update"
	ActionReviewTextDecide                   Action = "review.text.decide"
	ActionReviewImageDecide                  Action = "review.image.decide"
	ActionReviewContributionDecide           Action = "review.contribution.decide"
	// ActionUserGroupCapabilityOverrideManage is D07's dedicated, group-scoped
	// per-user-override management capability (migration 0150). It is deliberately
	// never itself user_overridable (migration 0146's CHECK constraint enforces this
	// structurally at the DB layer too).
	ActionUserGroupCapabilityOverrideManage Action = "user_group_capability_override.manage"
)

// Dieser Block ist KEINE autoritative Rollenliste. Der Katalog aller gültigen Rollen ist
// die Tabelle role_definitions. Hier stehen ausschließlich Codes, die direkt im Go-Code für
// Vergleiche referenziert werden (z. B. result.MatchedRole == permissions.RoleFansubLead).
const (
	RolePlatformAdmin  = "platform_admin"
	RoleFansubLead     = "fansub_lead"
	RoleProjectLead    = "project_lead"
	RoleTimer          = "timer"
	RoleEditor         = "editor"
	RoleEncoder        = "encoder"
	RoleRawProvider    = "raw_provider"
	RoleQualityChecker = "quality_checker"
	RoleDesigner       = "designer"
	RoleTranslator     = "translator"
	RoleTypesetter     = "typesetter"
	RoleKaraokeFX      = "karaoke_fx"
)

// RoleMembershipBaseline (Phase 145) is the reserved, non-assignable pseudo-role sourcing
// the active-membership baseline via IsMembershipBaselineAction (effective_rights.go) --
// never assignable, excluded from LoadFansubGroupRoles's catalog despite carrying the
// fansub_group context needed for IsCapabilityBearingRole.
const RoleMembershipBaseline = "group_member"

const (
	ReasonAllowed            = "allowed"
	ReasonPlatformAdmin      = "platform_admin"
	ReasonUnauthorized       = "unauthorized"
	ReasonDisabledUser       = "disabled_user"
	ReasonResourceNotFound   = "resource_not_found"
	ReasonNoMembership       = "no_membership"
	ReasonInsufficientRole   = "insufficient_role"
	ReasonOwnerMismatch      = "owner_mismatch"
	ReasonNoSupportedContext = "no_supported_context"
)

/* Historical bootstrap grants retained as documentation only. Runtime authority is PostgreSQL.
var roleMatrix = map[string][]Action{
	RoleFansubLead: {
		ActionFansubGroupEdit,
		ActionFansubGroupLinksManage,
		ActionFansubGroupMembersView,
		ActionFansubGroupMembersManage,
		ActionFansubGroupHistoricalMembersManage,
		ActionFansubGroupHistoricalRolesManage,
		ActionFansubGroupHistoricalMembersLink,
		ActionFansubGroupInvitationsView,
		ActionFansubGroupInvitationsCreate,
		ActionFansubGroupInvitationsCancel,
		ActionFansubGroupNotesWrite,
		ActionFansubGroupMediaView,
		ActionFansubGroupMediaUpload,
		ActionFansubGroupMediaUpdate,
		ActionFansubGroupMediaDelete,
		ActionAnimeFansubProjectNotesWrite,
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionMediaView,
		ActionReleaseVersionMediaUpload,
		ActionReleaseVersionMediaUpdate,
		ActionReleaseVersionMediaDelete,
		ActionReleaseVersionNotesWrite,
		ActionReleaseVersionSegmentsManage,
		ActionReviewTextDecide,
		ActionReviewImageDecide,
		ActionReviewContributionDecide,
	},
	RoleProjectLead: {
		ActionFansubGroupEdit,
		ActionFansubGroupLinksManage,
		ActionFansubGroupMembersView,
		ActionFansubGroupInvitationsView,
		ActionFansubGroupNotesWrite,
		ActionFansubGroupMediaView,
		ActionFansubGroupMediaUpload,
		ActionFansubGroupMediaUpdate,
		ActionFansubGroupMediaDelete,
		ActionAnimeFansubProjectNotesWrite,
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionMediaView,
		ActionReleaseVersionMediaUpload,
		ActionReleaseVersionMediaUpdate,
		ActionReleaseVersionMediaDelete,
		ActionReleaseVersionNotesWrite,
		ActionReleaseVersionSegmentsManage,
	},
	RoleDesigner: {
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionMediaView,
		ActionReleaseVersionMediaUpload,
		ActionReleaseVersionMediaUpdate,
		ActionReleaseVersionMediaDeleteOwn,
	},
	RoleEditor: {
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionFansubGroupNotesWrite,
		ActionAnimeFansubProjectNotesWrite,
		ActionReleaseVersionNotesWrite,
	},
	RoleTranslator: {
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionNotesWrite,
	},
	RoleTimer: {
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionNotesWrite,
		ActionReleaseVersionSegmentsManage,
	},
	RoleTypesetter: {
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionNotesWrite,
	},
	RoleEncoder: {
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionMediaView,
		ActionReleaseVersionMediaUpload,
		ActionReleaseVersionMediaUpdate,
		ActionReleaseVersionMediaDeleteOwn,
		ActionReleaseVersionNotesWrite,
	},
	RoleRawProvider: {
		ActionReleaseView,
		ActionReleaseVersionView,
	},
	RoleQualityChecker: {
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionMediaView,
		ActionReleaseVersionNotesWrite,
	},
}
*/

type Actor struct {
	AppUserID       int64
	Status          string
	IsPlatformAdmin bool
}

type Context struct {
	ScopeType      string
	FansubGroupIDs []int64
	AnimeID        *int64
	OwnerAppUserID *int64
	ReleaseVersionID *int64
}

// ReleasePlaybackEntitlementDecision is the server-side result of the central
// content-scope resolver. WinningScope is diagnostic metadata and must not be
// exposed as a public authorization contract.
type ReleasePlaybackEntitlementDecision struct {
	Allowed       bool
	WinningScope  string
	WinningEffect string
	SubjectType   string
}

type ReleasePlaybackEntitlementResolver interface {
	ResolveReleasePlaybackEntitlement(ctx context.Context, actor Actor, releaseVersionID int64) (ReleasePlaybackEntitlementDecision, error)
}

type Result struct {
	Allowed      bool   `json:"allowed"`
	ReasonCode   string `json:"reason_code"`
	Reason       string `json:"reason"`
	MatchedRole  string `json:"matched_role,omitempty"`
	MatchedScope string `json:"matched_scope,omitempty"`
}

// ReviewGrantContext is the verified, currently usable reviewer identity for one
// concrete group. GrantedActions contains only persisted direct review grants.
type ReviewGrantContext struct {
	MembershipID   int64
	AppUserID      int64
	MemberID       int64
	FansubGroupID  int64
	GrantedActions []Action
}

// ReviewContextResolver is deliberately separate from Resolver so established
// handlers and tests do not need a Phase-107-only method.
type ReviewContextResolver interface {
	ResolveActorReviewGrantContext(ctx context.Context, appUserID int64, fansubGroupID int64) (*ReviewGrantContext, error)
}

type ReviewAuthorizationResult struct {
	Result
	MembershipID int64
	MemberID     int64
}

type Resolver interface {
	ResolveFansubGroup(ctx context.Context, fansubGroupID int64) (*Context, error)
	ResolveRelease(ctx context.Context, releaseID int64) (*Context, error)
	ResolveReleaseVersion(ctx context.Context, releaseVersionID int64) (*Context, error)
	ResolveReleaseVersionMedia(ctx context.Context, relationID int64) (*Context, error)
	ListActorGroupRoles(ctx context.Context, appUserID int64, fansubGroupID int64) ([]string, error)
	// ListActorContributionRolesForVersion gibt die role_codes zurück, die dem Actor
	// für eine Release-Version zustehen (D-02). Auflösung: versions-spezifisch, dann anime-weit.
	ListActorContributionRolesForVersion(ctx context.Context, appUserID int64, releaseVersionID int64) ([]string, error)
}

// CacheLoader lädt die Rolle→Aktion-Matrix aus der Datenbank.
// Wird in Plan 86-02 von AuthzRepository implementiert.
type CacheLoader interface {
	LoadRoleCapabilities(ctx context.Context) (map[string][]Action, error)
}

// CatalogLoader lädt die assignable Gruppenrollen sowie die capability-tragenden Rollen
// aus role_definitions. Wird von AuthzRepository implementiert (D-12, Gap G4).
type CatalogLoader interface {
	LoadFansubGroupRoles(ctx context.Context) ([]string, error)
	// LoadCapabilityRoles gibt alle Rollen mit aktivem Kontext (fansub_group ODER
	// anime_contribution) zurück — die Rollen, deren Capabilities editierbar sein sollen.
	LoadCapabilityRoles(ctx context.Context) ([]string, error)
}
