package permissions

import (
	"context"
	"fmt"
	"slices"
	"strings"
)

const (
	ScopeTypeGroup = "group"
)

type Action string

const (
	ActionFansubGroupEdit              Action = "fansub_group.edit"
	ActionFansubGroupLinksManage       Action = "fansub_group.links.manage"
	ActionFansubGroupMembersView       Action = "fansub_group.members.view"
	ActionFansubGroupMembersManage     Action = "fansub_group.members.manage"
	ActionFansubGroupInvitationsView   Action = "fansub_group.invitations.view"
	ActionFansubGroupInvitationsCreate Action = "fansub_group.invitations.create"
	ActionFansubGroupInvitationsCancel Action = "fansub_group.invitations.cancel"
	ActionFansubGroupInvitationsAccept Action = "fansub_group.invitations.accept"
	ActionFansubGroupNotesWrite        Action = "fansub_group.notes.write"
	ActionAnimeFansubProjectNotesWrite Action = "anime_fansub_project.notes.write"
	ActionReleaseView                  Action = "release.view"
	ActionReleaseVersionView           Action = "release_version.view"
	ActionReleaseVersionMediaView      Action = "release_version_media.view"
	ActionReleaseVersionMediaUpload    Action = "release_version_media.upload"
	ActionReleaseVersionMediaUpdate    Action = "release_version_media.update"
	ActionReleaseVersionMediaDelete    Action = "release_version_media.delete"
	ActionReleaseVersionMediaDeleteOwn Action = "release_version_media.delete_own"
	ActionReleaseVersionNotesWrite     Action = "release_version.notes.write"
)

const (
	RolePlatformAdmin  = "platform_admin"
	RoleFansubLead     = "fansub_lead"
	RoleProjectLead    = "project_lead"
	RoleTranslator     = "translator"
	RoleTimer          = "timer"
	RoleTypesetter     = "typesetter"
	RoleEditor         = "editor"
	RoleEncoder        = "encoder"
	RoleRawProvider    = "raw_provider"
	RoleQualityChecker = "quality_checker"
	RoleDesigner       = "designer"
)

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

var roleMatrix = map[string][]Action{
	RoleFansubLead: {
		ActionFansubGroupEdit,
		ActionFansubGroupLinksManage,
		ActionFansubGroupMembersView,
		ActionFansubGroupMembersManage,
		ActionFansubGroupInvitationsView,
		ActionFansubGroupInvitationsCreate,
		ActionFansubGroupInvitationsCancel,
		ActionFansubGroupNotesWrite,
		ActionAnimeFansubProjectNotesWrite,
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionMediaView,
		ActionReleaseVersionMediaUpload,
		ActionReleaseVersionMediaUpdate,
		ActionReleaseVersionMediaDelete,
		ActionReleaseVersionNotesWrite,
	},
	RoleProjectLead: {
		ActionFansubGroupEdit,
		ActionFansubGroupLinksManage,
		ActionFansubGroupMembersView,
		ActionFansubGroupInvitationsView,
		ActionFansubGroupNotesWrite,
		ActionAnimeFansubProjectNotesWrite,
		ActionReleaseView,
		ActionReleaseVersionView,
		ActionReleaseVersionMediaView,
		ActionReleaseVersionMediaUpload,
		ActionReleaseVersionMediaUpdate,
		ActionReleaseVersionMediaDelete,
		ActionReleaseVersionNotesWrite,
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

var fansubGroupRoleCatalog = []string{
	RoleFansubLead,
	RoleProjectLead,
	RoleTranslator,
	RoleTimer,
	RoleTypesetter,
	RoleEditor,
	RoleEncoder,
	RoleRawProvider,
	RoleQualityChecker,
	RoleDesigner,
}

type Actor struct {
	AppUserID       int64
	Status          string
	IsPlatformAdmin bool
}

type Context struct {
	ScopeType      string
	FansubGroupIDs []int64
	OwnerAppUserID *int64
}

type Result struct {
	Allowed      bool   `json:"allowed"`
	ReasonCode   string `json:"reason_code"`
	Reason       string `json:"reason"`
	MatchedRole  string `json:"matched_role,omitempty"`
	MatchedScope string `json:"matched_scope,omitempty"`
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

type Service struct {
	resolver Resolver
}

func NewService(resolver Resolver) *Service {
	return &Service{resolver: resolver}
}

func AllowedActionsForRole(role string) []Action {
	return append([]Action(nil), roleMatrix[strings.TrimSpace(role)]...)
}

func FansubGroupRoles() []string {
	return append([]string(nil), fansubGroupRoleCatalog...)
}

func IsKnownFansubGroupRole(role string) bool {
	return slices.Contains(fansubGroupRoleCatalog, strings.TrimSpace(role))
}

func RoleAllowsAction(role string, action Action) bool {
	return roleAllows(role, action)
}

func (s *Service) CanForFansubGroup(ctx context.Context, actor Actor, action Action, fansubGroupID int64) (Result, error) {
	return s.canForContext(ctx, actor, []Action{action}, func(ctx context.Context) (*Context, error) {
		return s.resolver.ResolveFansubGroup(ctx, fansubGroupID)
	})
}

func (s *Service) CanAcceptInvitation(actor Actor) Result {
	if actor.AppUserID <= 0 {
		return denied(ReasonUnauthorized, "aktueller app-user fehlt")
	}
	if strings.TrimSpace(actor.Status) == "disabled" {
		return denied(ReasonDisabledUser, "deaktivierter benutzer")
	}
	return Result{
		Allowed:      true,
		ReasonCode:   ReasonAllowed,
		Reason:       "authentifizierter app-user darf einladung annehmen",
		MatchedScope: ScopeTypeGroup,
	}
}

func (s *Service) CanForRelease(ctx context.Context, actor Actor, action Action, releaseID int64) (Result, error) {
	return s.canForContext(ctx, actor, []Action{action}, func(ctx context.Context) (*Context, error) {
		return s.resolver.ResolveRelease(ctx, releaseID)
	})
}

func (s *Service) CanForReleaseVersion(ctx context.Context, actor Actor, action Action, releaseVersionID int64) (Result, error) {
	// Schritt 0: Basis-Checks (analog canForContext).
	if s == nil || s.resolver == nil {
		return denied(ReasonUnauthorized, "permission service nicht verfügbar"), nil
	}
	if actor.AppUserID <= 0 {
		return denied(ReasonUnauthorized, "aktueller app-user fehlt"), nil
	}
	if strings.TrimSpace(actor.Status) == "disabled" {
		return denied(ReasonDisabledUser, "deaktivierter benutzer"), nil
	}
	if actor.IsPlatformAdmin {
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonPlatformAdmin,
			Reason:       "platform_admin darf diese aktion ausführen",
			MatchedRole:  RolePlatformAdmin,
			MatchedScope: ScopeTypeGroup,
		}, nil
	}

	// Schritt 1: Ressource auflösen.
	resourceCtx, err := s.resolver.ResolveReleaseVersion(ctx, releaseVersionID)
	if err != nil {
		return Result{}, err
	}
	if resourceCtx == nil || len(resourceCtx.FansubGroupIDs) == 0 {
		return denied(ReasonResourceNotFound, "ressource nicht gefunden"), nil
	}

	// Schritt 2: Leader-Check ZUERST (D-05, Pitfall 1).
	// fansub_lead UND project_lead werden beide in fansub_group_member_roles.role gespeichert
	// und über ListActorGroupRoles aufgelöst — kein separater Abfragepfad nötig.
	for _, fansubGroupID := range resourceCtx.FansubGroupIDs {
		groupRoles, err := s.resolver.ListActorGroupRoles(ctx, actor.AppUserID, fansubGroupID)
		if err != nil {
			return Result{}, err
		}
		for _, role := range groupRoles {
			if role == RoleFansubLead || role == RoleProjectLead {
				if roleAllows(role, action) {
					return Result{
						Allowed:      true,
						ReasonCode:   ReasonAllowed,
						Reason:       "berechtigung über leader-rolle bestätigt",
						MatchedRole:  role,
						MatchedScope: fmt.Sprintf("%s:%d", ScopeTypeGroup, fansubGroupID),
					}, nil
				}
			}
		}
	}

	// Schritt 3: Contribution-Check (D-01..D-04).
	// Gibt versions-spezifische role_codes zurück; Fallback auf anime-weite wenn keine Override existiert.
	roleCodes, err := s.resolver.ListActorContributionRolesForVersion(ctx, actor.AppUserID, releaseVersionID)
	if err != nil {
		return Result{}, err
	}
	for _, code := range roleCodes {
		if roleAllows(code, action) {
			return Result{
				Allowed:      true,
				ReasonCode:   ReasonAllowed,
				Reason:       "berechtigung über contribution-rolle bestätigt",
				MatchedRole:  code,
				MatchedScope: ScopeTypeGroup,
			}, nil
		}
	}
	if len(roleCodes) > 0 {
		return denied(ReasonInsufficientRole, "contribution vorhanden, aber rolle reicht nicht aus"), nil
	}
	return denied(ReasonNoMembership, "keine contribution für diese release-version"), nil
}

func (s *Service) CanForReleaseVersionMedia(ctx context.Context, actor Actor, action Action, relationID int64) (Result, error) {
	return s.canForContext(ctx, actor, []Action{action}, func(ctx context.Context) (*Context, error) {
		return s.resolver.ResolveReleaseVersionMedia(ctx, relationID)
	})
}

func (s *Service) CanForReleaseVersionMediaDelete(ctx context.Context, actor Actor, relationID int64) (Result, error) {
	return s.canForContext(ctx, actor, []Action{ActionReleaseVersionMediaDelete, ActionReleaseVersionMediaDeleteOwn}, func(ctx context.Context) (*Context, error) {
		return s.resolver.ResolveReleaseVersionMedia(ctx, relationID)
	})
}

func (s *Service) canForContext(
	ctx context.Context,
	actor Actor,
	actions []Action,
	resolve func(context.Context) (*Context, error),
) (Result, error) {
	if s == nil || s.resolver == nil {
		return denied(ReasonUnauthorized, "permission service nicht verfügbar"), nil
	}
	if actor.AppUserID <= 0 {
		return denied(ReasonUnauthorized, "aktueller app-user fehlt"), nil
	}
	if strings.TrimSpace(actor.Status) == "disabled" {
		return denied(ReasonDisabledUser, "deaktivierter benutzer"), nil
	}
	if actor.IsPlatformAdmin {
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonPlatformAdmin,
			Reason:       "platform_admin darf diese aktion ausführen",
			MatchedRole:  RolePlatformAdmin,
			MatchedScope: ScopeTypeGroup,
		}, nil
	}

	resourceContext, err := resolve(ctx)
	if err != nil {
		return Result{}, err
	}
	if resourceContext == nil || len(resourceContext.FansubGroupIDs) == 0 {
		return denied(ReasonResourceNotFound, "ressource nicht gefunden"), nil
	}

	ownerRequired := slices.Contains(actions, ActionReleaseVersionMediaDeleteOwn)
	for _, fansubGroupID := range resourceContext.FansubGroupIDs {
		roles, err := s.resolver.ListActorGroupRoles(ctx, actor.AppUserID, fansubGroupID)
		if err != nil {
			return Result{}, err
		}
		for _, role := range roles {
			for _, action := range actions {
				if action == ActionReleaseVersionMediaDeleteOwn {
					if !ownerRequired || resourceContext.OwnerAppUserID == nil || *resourceContext.OwnerAppUserID != actor.AppUserID {
						continue
					}
				}
				if roleAllows(role, action) {
					return Result{
						Allowed:      true,
						ReasonCode:   ReasonAllowed,
						Reason:       "berechtigung über gruppenrolle bestätigt",
						MatchedRole:  role,
						MatchedScope: fmt.Sprintf("%s:%d", ScopeTypeGroup, fansubGroupID),
					}, nil
				}
			}
		}
	}

	if ownerRequired && resourceContext.OwnerAppUserID != nil && *resourceContext.OwnerAppUserID != actor.AppUserID {
		return denied(ReasonOwnerMismatch, "ressource gehört einem anderen benutzer"), nil
	}

	for _, fansubGroupID := range resourceContext.FansubGroupIDs {
		roles, err := s.resolver.ListActorGroupRoles(ctx, actor.AppUserID, fansubGroupID)
		if err != nil {
			return Result{}, err
		}
		if len(roles) > 0 {
			return denied(ReasonInsufficientRole, "gruppe gefunden, aber rolle reicht nicht aus"), nil
		}
	}

	return denied(ReasonNoMembership, "keine aktive gruppenmitgliedschaft für diese ressource"), nil
}

func roleAllows(role string, action Action) bool {
	allowed := roleMatrix[strings.TrimSpace(role)]
	return slices.Contains(allowed, action)
}

func denied(code string, reason string) Result {
	return Result{
		Allowed:    false,
		ReasonCode: code,
		Reason:     reason,
	}
}
