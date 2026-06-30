package permissions

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"
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
	ActionFansubGroupMediaView         Action = "fansub_group_media.view"
	ActionFansubGroupMediaUpload       Action = "fansub_group_media.upload"
	ActionFansubGroupMediaUpdate       Action = "fansub_group_media.update"
	ActionFansubGroupMediaDelete       Action = "fansub_group_media.delete"
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

// Neue Gruppenrollen (D-07): in Migration 0112 mit assignable=true angelegt.
const (
	RoleTechadmin = "techadmin"
	RoleGfxler    = "gfxler"
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

// paket-globaler In-Memory-Cache für die Rolle→Action-Matrix.
// loadedCache == nil bedeutet "noch nicht geladen" → roleAllows fällt auf roleMatrix-Fallback zurück.
var (
	cacheMu     sync.RWMutex
	loadedCache map[string][]Action
)

// allKnownActions enthält alle 18 Action-Konstanten aus permissions.go.
// Wird von LoadCache für den D-10-Konsistenz-Check genutzt.
var allKnownActions = []Action{
	ActionFansubGroupEdit,
	ActionFansubGroupLinksManage,
	ActionFansubGroupMembersView,
	ActionFansubGroupMembersManage,
	ActionFansubGroupInvitationsView,
	ActionFansubGroupInvitationsCreate,
	ActionFansubGroupInvitationsCancel,
	ActionFansubGroupInvitationsAccept,
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
	ActionReleaseVersionMediaDeleteOwn,
	ActionReleaseVersionNotesWrite,
}

// standaloneActions sind Actions, die in action_definitions existieren,
// aber keinen role_capabilities-Eintrag haben (keine Rolle gewährt sie direkt).
// ActionFansubGroupInvitationsAccept wird über CanAcceptInvitation ohne Rollen-Lookup geprüft.
var standaloneActions = []Action{ActionFansubGroupInvitationsAccept}

// fansubGroupRoleCatalog: wird beim Start via LoadFansubGroupCatalog aus role_definitions geladen (D-12).
// Leer bei Init — LoadFansubGroupCatalog MUSS vor dem ersten Zugriff aufgerufen werden.
var (
	catalogMu              sync.RWMutex
	fansubGroupRoleCatalog []string
)

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

// CacheLoader lädt die Rolle→Aktion-Matrix aus der Datenbank.
// Wird in Plan 86-02 von AuthzRepository implementiert.
type CacheLoader interface {
	LoadRoleCapabilities(ctx context.Context) (map[string][]Action, error)
}

// CatalogLoader lädt die assignable Gruppenrollen aus role_definitions.
// Wird von AuthzRepository in Plan 95-02 implementiert (D-12).
type CatalogLoader interface {
	LoadFansubGroupRoles(ctx context.Context) ([]string, error)
}

type Service struct {
	resolver Resolver
}

func NewService(resolver Resolver) *Service {
	return &Service{resolver: resolver}
}

// LoadCache lädt die Capability-Matrix beim Start aus der Datenbank in den In-Memory-Cache.
// Nach erfolgreichem Load wird ein D-10-Konsistenz-Check durchgeführt:
// Jede Action-Konstante in allKnownActions muss entweder in mindestens einer Rolle im Cache
// vorkommen ODER in standaloneActions deklariert sein — sonst fail-closed (Fehler).
// Nach bestandenem Check wird loadedCache gesetzt; roleAllows nutzt fortan den Cache.
func (s *Service) LoadCache(ctx context.Context, loader CacheLoader) error {
	m, err := loader.LoadRoleCapabilities(ctx)
	if err != nil {
		return fmt.Errorf("permission cache load: %w", err)
	}

	// D-10: Konsistenz-Check — alle bekannten Action-Konstanten müssen im Cache vorhanden sein
	// oder als standaloneAction deklariert (d.h. sie haben keinen role_capabilities-Eintrag).
	seenActions := make(map[Action]bool)
	for _, actions := range m {
		for _, a := range actions {
			seenActions[a] = true
		}
	}
	for _, a := range allKnownActions {
		if !seenActions[a] && !slices.Contains(standaloneActions, a) {
			return fmt.Errorf("permission cache: Action %q fehlt in role_capabilities und ist keine standalone-Action — Startup abgebrochen", a)
		}
	}

	cacheMu.Lock()
	loadedCache = m
	cacheMu.Unlock()
	return nil
}

// LoadFansubGroupCatalog lädt die assignable Gruppenrollen aus der DB in den In-Memory-Cache (D-12).
// MUSS nach LoadCache aufgerufen werden (Fallstrick 5: LoadCache ZUERST).
func (s *Service) LoadFansubGroupCatalog(ctx context.Context, loader CatalogLoader) error {
	roles, err := loader.LoadFansubGroupRoles(ctx)
	if err != nil {
		return fmt.Errorf("fansub group catalog load: %w", err)
	}
	catalogMu.Lock()
	fansubGroupRoleCatalog = roles
	catalogMu.Unlock()
	return nil
}

func AllowedActionsForRole(role string) []Action {
	cacheMu.RLock()
	cache := loadedCache
	cacheMu.RUnlock()
	if cache != nil {
		return append([]Action(nil), cache[strings.TrimSpace(role)]...)
	}
	return append([]Action(nil), roleMatrix[strings.TrimSpace(role)]...)
}

func FansubGroupRoles() []string {
	catalogMu.RLock()
	defer catalogMu.RUnlock()
	return append([]string(nil), fansubGroupRoleCatalog...)
}

func IsKnownFansubGroupRole(role string) bool {
	catalogMu.RLock()
	defer catalogMu.RUnlock()
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

// ReloadCache lädt die Capability-Matrix erneut aus der DB (D-06).
// Delegiert an LoadCache — selber atomarer Swap und D-10-Konsistenz-Check.
// Nach erfolgreicher Mutation aufrufen, nicht beim Startup (dafür LoadCache).
// Fail-safe: schlägt LoadCache fehl, bleibt loadedCache unverändert.
func (s *Service) ReloadCache(ctx context.Context, loader CacheLoader) error {
	return s.LoadCache(ctx, loader)
}

// IsStandaloneAction meldet ob eine Action in standaloneActions deklariert ist.
// Exportierte API damit Handler die paket-private Slice nicht duplizieren müssen.
func IsStandaloneAction(a Action) bool {
	return slices.Contains(standaloneActions, a)
}

func roleAllows(role string, action Action) bool {
	cacheMu.RLock()
	cache := loadedCache
	cacheMu.RUnlock()
	if cache != nil {
		return slices.Contains(cache[strings.TrimSpace(role)], action)
	}
	// Fallback auf statische roleMatrix (nur wenn LoadCache noch nicht aufgerufen wurde, z.B. in Unit-Tests)
	return slices.Contains(roleMatrix[strings.TrimSpace(role)], action)
}

func denied(code string, reason string) Result {
	return Result{
		Allowed:    false,
		ReasonCode: code,
		Reason:     reason,
	}
}
