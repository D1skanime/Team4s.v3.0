package permissions

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"
)

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
	ActionReleaseVersionNotesWrite           Action = "release_version.notes.write"
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

// paket-globaler In-Memory-Cache für die Rolle→Action-Matrix.
// loadedCache == nil bedeutet "noch nicht geladen" und ist fail-closed.
var (
	cacheMu     sync.RWMutex
	loadedCache map[string][]Action
)

// allKnownActions enthält alle Action-Konstanten aus permissions.go.
// Wird von LoadCache für den D-10-Konsistenz-Check UND (seit Plan 137-05) von
// ResolveGroupRights als vollständiges Action-Universum für die zentrale
// Rechte-Auswertung genutzt (effective_rights.go). Eine hier fehlende Action
// wird von GroupRightsResolution.Can() unsichtbar als no_grant abgelehnt,
// selbst wenn role_capabilities eine Rolle dafür freigibt -- deshalb müssen
// die fünf Phase-136-Actions (fansub_group_media.reorder, die drei
// fansub_group_page.*_edit sowie fansub_group_links.update) hier stehen,
// nicht nur als Action-Konstante weiter oben in dieser Datei.
var allKnownActions = []Action{
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
	ActionFansubGroupInvitationsAccept,
	ActionFansubGroupNotesWrite,
	ActionFansubGroupMediaView,
	ActionFansubGroupMediaUpload,
	ActionFansubGroupMediaUpdate,
	ActionFansubGroupMediaUpdateOwn,
	ActionFansubGroupMediaReorder,
	ActionFansubGroupMediaDelete,
	ActionFansubGroupPageGeneralEdit,
	ActionFansubGroupPageTechnicalLinksEdit,
	ActionFansubGroupPageFoundingHistoryEdit,
	ActionFansubGroupLinksUpdate,
	ActionAnimeFansubProjectNotesWrite,
	ActionAnimeFansubProjectTimelineUpdate,
	ActionReleaseView,
	ActionReleaseVersionView,
	ActionReleaseVersionMediaView,
	ActionReleaseVersionMediaUpload,
	ActionReleaseVersionMediaUpdate,
	ActionReleaseVersionMediaDelete,
	ActionReleaseVersionMediaDeleteOwn,
	ActionReleaseVersionNotesWrite,
	ActionReleaseVersionSegmentsManage,
	ActionReleaseVersionMetadataUpdate,
	ActionReviewTextDecide,
	ActionReviewImageDecide,
	ActionReviewContributionDecide,
	ActionUserGroupCapabilityOverrideManage,
}

// standaloneActions sind Actions, die in action_definitions existieren,
// aber keinen role_capabilities-Eintrag haben (keine Rolle gewährt sie direkt).
// ActionFansubGroupInvitationsAccept wird über CanAcceptInvitation ohne Rollen-Lookup geprüft.
var standaloneActions = []Action{ActionFansubGroupInvitationsAccept}

// fansubGroupRoleCatalog: wird beim Start via LoadFansubGroupCatalog aus role_definitions geladen (D-12).
// Leer bei Init — LoadFansubGroupCatalog MUSS vor dem ersten Zugriff aufgerufen werden.
// capabilityRoleCatalog: alle Rollen, die in einem AKTIVEN Kontext (fansub_group ODER
// anime_contribution) Rechte tragen können — also auch Contribution-/Projekt-Rollen wie
// encoder/editor, nicht nur die im Gruppen-Picker zuweisbaren. Grundlage dafür, dass die
// Capability-Matrix diese Rollen editierbar macht (Gap G4: assignable != capability-editierbar).
// Rein historische Rollen (nur group_history) sind hier NICHT enthalten und bleiben gesperrt.
var (
	catalogMu              sync.RWMutex
	fansubGroupRoleCatalog []string
	capabilityRoleCatalog  []string
)

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

	if err := validateCapabilityCatalog(m); err != nil {
		return err
	}
	if err := validateMembershipBaselineRegistryPresence(m); err != nil {
		return err
	}

	cacheMu.Lock()
	loadedCache = m
	cacheMu.Unlock()
	return nil
}

func validateCapabilityCatalog(m map[string][]Action) error {
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

	return nil
}

// MembershipBaselineActionCodes (Phase 146, Success Criterion 4) is the single Go source for
// the 3 membership-baseline action codes. Previously this exact 3-element literal was
// duplicated across the migration seed, this validator, and a TS filter, risking silent
// drift. Consumed by validateMembershipBaselineRegistryPresence below and by the mutation
// guards Plan 146-03 adds to admin_capability_handler.go.
var MembershipBaselineActionCodes = []Action{ActionFansubGroupMembersView, ActionFansubGroupMediaView, ActionFansubGroupMediaUpload}

// validateMembershipBaselineRegistryPresence (Phase 145, Success Criterion 6) checks that
// the reserved RoleMembershipBaseline pseudo-role's loaded role_capabilities entry carries
// all three membership-baseline actions. validateCapabilityCatalog already proves every
// known Action is granted by SOME role -- it cannot catch a botched migration/seed that
// leaves specifically the pseudo-role's own rows incomplete while the same 3 actions remain
// present for other roles. Called from LoadCache/LoadFansubGroupCatalog before loadedCache
// is published, so a failure here leaves the previously loaded cache state untouched
// (fail-closed, not fail-open).
func validateMembershipBaselineRegistryPresence(m map[string][]Action) error {
	baseline := m[RoleMembershipBaseline]
	for _, a := range MembershipBaselineActionCodes {
		if !slices.Contains(baseline, a) {
			return fmt.Errorf("permission cache: Rolle %q (Mitgliedschafts-Grundausstattung) fehlt Action %q in role_capabilities — Startup abgebrochen", RoleMembershipBaseline, a)
		}
	}
	return nil
}

// LoadFansubGroupCatalog lädt die assignable Gruppenrollen aus der DB in den In-Memory-Cache (D-12).
// MUSS nach LoadCache aufgerufen werden (Fallstrick 5: LoadCache ZUERST).
func (s *Service) LoadFansubGroupCatalog(ctx context.Context, loader CatalogLoader) error {
	roles, err := loader.LoadFansubGroupRoles(ctx)
	if err != nil {
		return fmt.Errorf("fansub group catalog load: %w", err)
	}
	capRoles, err := loader.LoadCapabilityRoles(ctx)
	if err != nil {
		return fmt.Errorf("capability role catalog load: %w", err)
	}
	// Der produktive Repository-Loader liefert auch die Grant-Projektion. Dadurch wird
	// der vollständige Katalog erst nach erfolgreicher Validierung gemeinsam publiziert.
	var capabilities map[string][]Action
	if cacheLoader, ok := loader.(CacheLoader); ok {
		capabilities, err = cacheLoader.LoadRoleCapabilities(ctx)
		if err != nil {
			return fmt.Errorf("permission catalog load: %w", err)
		}
		if err := validateCapabilityCatalog(capabilities); err != nil {
			return err
		}
		if err := validateMembershipBaselineRegistryPresence(capabilities); err != nil {
			return err
		}
	}
	cacheMu.Lock()
	catalogMu.Lock()
	if capabilities != nil {
		loadedCache = capabilities
	}
	fansubGroupRoleCatalog = roles
	capabilityRoleCatalog = capRoles
	catalogMu.Unlock()
	cacheMu.Unlock()
	return nil
}

func AllowedActionsForRole(role string) []Action {
	cacheMu.RLock()
	cache := loadedCache
	cacheMu.RUnlock()
	if cache == nil {
		return []Action{}
	}
	return append([]Action(nil), cache[strings.TrimSpace(role)]...)
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

// IsCapabilityBearingRole prüft, ob die Rolle in einem Fansub-Gruppen-Kontext (fansub_group) Standardrechte tragen kann und daher in der
// Capability-Matrix editierbar sein soll. Beitrags- und historische Rollen liefern false,
// weil sie Credits/Dokumentation sind und Zusatzrechte individuell vergeben werden.
func IsCapabilityBearingRole(role string) bool {
	catalogMu.RLock()
	defer catalogMu.RUnlock()
	return slices.Contains(capabilityRoleCatalog, strings.TrimSpace(role))
}

func RoleAllowsAction(role string, action Action) bool {
	return roleAllows(role, action)
}

func (s *Service) CanForFansubGroup(ctx context.Context, actor Actor, action Action, fansubGroupID int64) (Result, error) {
	if isReviewAction(action) {
		result, err := s.CanReviewForFansubGroup(ctx, actor, action, fansubGroupID)
		return result.Result, err
	}
	return s.canForContext(ctx, actor, []Action{action}, func(ctx context.Context) (*Context, error) {
		return s.resolver.ResolveFansubGroup(ctx, fansubGroupID)
	})
}

func (s *Service) CanReviewForFansubGroup(
	ctx context.Context,
	actor Actor,
	action Action,
	fansubGroupID int64,
) (ReviewAuthorizationResult, error) {
	if s == nil || s.resolver == nil {
		return reviewDenied(ReasonUnauthorized, "permission service nicht verfügbar"), nil
	}
	if actor.AppUserID <= 0 {
		return reviewDenied(ReasonUnauthorized, "aktueller app-user fehlt"), nil
	}
	if strings.TrimSpace(actor.Status) == "disabled" {
		return reviewDenied(ReasonDisabledUser, "deaktivierter benutzer"), nil
	}
	if !isReviewAction(action) || fansubGroupID <= 0 {
		return reviewDenied(ReasonNoSupportedContext, "keine unterstützte review-aktion oder gruppe"), nil
	}
	if actor.IsPlatformAdmin {
		return ReviewAuthorizationResult{Result: Result{
			Allowed:      true,
			ReasonCode:   ReasonPlatformAdmin,
			Reason:       "platform_admin darf diese aktion ausführen",
			MatchedRole:  RolePlatformAdmin,
			MatchedScope: ScopeTypeGlobal,
		}}, nil
	}

	resourceContext, err := s.resolver.ResolveFansubGroup(ctx, fansubGroupID)
	if err != nil {
		return ReviewAuthorizationResult{}, err
	}
	if resourceContext == nil || !slices.Contains(resourceContext.FansubGroupIDs, fansubGroupID) {
		return reviewDenied(ReasonResourceNotFound, "ressource nicht gefunden"), nil
	}

	reviewResolver, ok := s.resolver.(ReviewContextResolver)
	if !ok {
		return reviewDenied(ReasonNoMembership, "review-kontext nicht verfügbar"), nil
	}
	reviewContext, err := reviewResolver.ResolveActorReviewGrantContext(ctx, actor.AppUserID, fansubGroupID)
	if err != nil {
		return ReviewAuthorizationResult{}, err
	}
	if reviewContext == nil ||
		reviewContext.MembershipID <= 0 ||
		reviewContext.AppUserID != actor.AppUserID ||
		reviewContext.MemberID <= 0 ||
		reviewContext.FansubGroupID != fansubGroupID {
		return reviewDenied(ReasonNoMembership, "keine aktive bestätigte gruppenmitgliedschaft"), nil
	}

	// D01: the actual allow/deny decision is now a projection of the single
	// central resolver, not an independent role-then-grant chain -- a stored
	// user_deny must be able to override even an existing review delegation
	// grant (137-RESEARCH.md Pitfall 2 / Open Question 4).
	groupRights, err := s.ResolveGroupRights(ctx, actor, fansubGroupID)
	if err != nil {
		return ReviewAuthorizationResult{}, err
	}
	state := groupRights.Can(action)
	if state.Allowed {
		return ReviewAuthorizationResult{
			Result:       resultFromCapabilityState(state, fansubGroupID),
			MembershipID: reviewContext.MembershipID,
			MemberID:     reviewContext.MemberID,
		}, nil
	}
	if state.DecisiveSource == ProvenanceUserDeny {
		return reviewDenied(ReasonCodeUserDeny, "durch persönliche sperre verweigert"), nil
	}

	return reviewDenied(ReasonInsufficientRole, "gruppenmitgliedschaft vorhanden, aber review-recht fehlt"), nil
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

	// Schritt 2: Aktive Gruppenrollen pruefen. Release-Versionen koennen mehrere
	// Fansub-Gruppen haben; eine passende Rolle in irgendeiner Gruppe reicht.
	groupRoleResult, hasGroupMembership, err := s.canForReleaseVersionGroupRole(ctx, actor, action, resourceCtx)
	if err != nil {
		return Result{}, err
	}
	if groupRoleResult.Allowed {
		return groupRoleResult, nil
	}

	// Schritt 3: Contribution-Check (D-01..D-04).
	// Gibt versions-spezifische role_codes zurück; Fallback auf anime-weite wenn keine Override existiert.
	//
	// GAP-06 (137-UAT.md) is now resolved as Fall B -- a named, deliberate exception, decided by
	// the user on 2026-08-23. Contribution Roles are an intentionally standalone, override-blind
	// domain: see 137-CONTEXT.md's "D01 exception -- Contribution Roles (entschieden 2026-08-23)"
	// paragraph. A stored user_deny from Step 2 does NOT block this fallback, by design; a
	// contribution role can still independently grant access even after Step 2 was denied by a
	// stored user_deny. This behavior is locked by the regression test
	// TestIntegrationCanForReleaseVersionContributionRoleFallbackNotBlockedByUserDeny.
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
	// A stored user_deny is a more specific, more transparent denial reason than the generic
	// insufficient_role fallback below -- surface it once neither the group-role step nor the
	// contribution fallback granted access.
	if groupRoleResult.ReasonCode == ReasonCodeUserDeny {
		return groupRoleResult, nil
	}
	if hasGroupMembership {
		return denied(ReasonInsufficientRole, "gruppenmitgliedschaft vorhanden, aber rolle reicht nicht aus"), nil
	}
	return denied(ReasonNoMembership, "keine contribution für diese release-version"), nil
}

// canForReleaseVersionGroupRole is CanForReleaseVersion's step 2 (the shared
// group-context path): it now derives its decision from ResolveGroupRights
// instead of a raw role loop, so a stored user allow/deny for the resolved
// group changes the result here exactly as it does for CanForFansubGroup
// (137-RESEARCH.md Pattern 1). Step 3 (contribution-role fallback) remains,
// by decided exception, a separate override-blind domain -- see the Step-3
// comment above (Fall B, entschieden 2026-08-23). When no group
// grants access, the returned Result carries the most specific denial reason
// found (a decisive user_deny over the generic zero-value) so the caller can
// distinguish "explicitly denied" from "simply never granted".
func (s *Service) canForReleaseVersionGroupRole(ctx context.Context, actor Actor, action Action, resourceCtx *Context) (Result, bool, error) {
	hasGroupMembership := false
	var deniedByUserOverride *CapabilityRightState
	var deniedGroupID int64
	for _, fansubGroupID := range resourceCtx.FansubGroupIDs {
		groupRights, err := s.ResolveGroupRights(ctx, actor, fansubGroupID)
		if err != nil {
			return Result{}, false, err
		}
		if groupRights.ActiveMembership {
			hasGroupMembership = true
		}
		state := groupRights.Can(action)
		if state.Allowed {
			return resultFromCapabilityState(state, fansubGroupID), true, nil
		}
		if state.DecisiveSource == ProvenanceUserDeny && deniedByUserOverride == nil {
			captured := state
			deniedByUserOverride = &captured
			deniedGroupID = fansubGroupID
		}
	}
	if deniedByUserOverride != nil {
		return resultFromCapabilityState(*deniedByUserOverride, deniedGroupID), hasGroupMembership, nil
	}
	return Result{}, hasGroupMembership, nil
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

	// D01/D03: every group this resource resolves to is now decided through
	// the single central resolver instead of a raw per-group role loop, so a
	// stored user allow/deny changes the result here exactly as it does for
	// CanForFansubGroup. Active-membership presence is tracked in the same
	// pass (ResolveGroupRights already batch-loads it), replacing the old
	// second ListActorGroupRoles loop that only existed to recompute it.
	ownerRequired := slices.Contains(actions, ActionReleaseVersionMediaDeleteOwn)
	activeMembershipFound := false
	var deniedByUserOverride *CapabilityRightState
	var deniedGroupID int64
	for _, fansubGroupID := range resourceContext.FansubGroupIDs {
		groupRights, err := s.ResolveGroupRights(ctx, actor, fansubGroupID)
		if err != nil {
			return Result{}, err
		}
		if groupRights.ActiveMembership {
			activeMembershipFound = true
		}
		for _, action := range actions {
			if action == ActionReleaseVersionMediaDeleteOwn {
				if !ownerRequired || resourceContext.OwnerAppUserID == nil || *resourceContext.OwnerAppUserID != actor.AppUserID {
					continue
				}
			}
			state := groupRights.Can(action)
			if state.Allowed {
				return resultFromCapabilityState(state, fansubGroupID), nil
			}
			if state.DecisiveSource == ProvenanceUserDeny && deniedByUserOverride == nil {
				captured := state
				deniedByUserOverride = &captured
				deniedGroupID = fansubGroupID
			}
		}
	}

	if ownerRequired && resourceContext.OwnerAppUserID != nil && *resourceContext.OwnerAppUserID != actor.AppUserID {
		return denied(ReasonOwnerMismatch, "ressource gehört einem anderen benutzer"), nil
	}

	// A stored user_deny is a more specific, more transparent denial reason than the generic
	// fallbacks below -- surface it once no group granted access.
	if deniedByUserOverride != nil {
		return resultFromCapabilityState(*deniedByUserOverride, deniedGroupID), nil
	}

	if activeMembershipFound {
		return denied(ReasonInsufficientRole, "gruppe gefunden, aber rolle reicht nicht aus"), nil
	}

	return denied(ReasonNoMembership, "keine aktive gruppenmitgliedschaft für diese ressource"), nil
}

// resultFromCapabilityState projects one CapabilityRightState (the central
// resolver's per-action decision) into the legacy Result shape every
// existing Can* entry point returns, preserving the pre-Phase-137
// ReasonCode/Reason/MatchedRole/MatchedScope vocabulary wherever the two
// concepts coincide (D04: "existing Result shapes/reason behavior remain
// compatible for callers"). This is a pure translation, not a second
// precedence computation -- the decision itself was already made by
// evaluateGroupRights (effective_rights.go).
func resultFromCapabilityState(state CapabilityRightState, fansubGroupID int64) Result {
	scope := fmt.Sprintf("%s:%d", ScopeTypeGroup, fansubGroupID)
	switch state.DecisiveSource {
	case ProvenancePlatformAdmin:
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonPlatformAdmin,
			Reason:       "platform_admin darf diese aktion ausführen",
			MatchedRole:  RolePlatformAdmin,
			MatchedScope: ScopeTypeGlobal,
		}
	case ProvenanceGroupRole:
		matchedRole := ""
		if len(state.GrantingRoles) > 0 {
			matchedRole = state.GrantingRoles[0]
		}
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonAllowed,
			Reason:       "berechtigung über gruppenrolle bestätigt",
			MatchedRole:  matchedRole,
			MatchedScope: scope,
		}
	case ProvenanceUserAllow:
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonAllowed,
			Reason:       "berechtigung über persönliche freigabe bestätigt",
			MatchedScope: scope,
		}
	case ProvenanceSpecializedGrant:
		return Result{
			Allowed:      true,
			ReasonCode:   ReasonAllowed,
			Reason:       "berechtigung über zugewiesene sonderberechtigung bestätigt",
			MatchedScope: scope,
		}
	case ProvenanceUserDeny:
		return Result{
			Allowed:      false,
			ReasonCode:   ReasonCodeUserDeny,
			Reason:       "durch persönliche sperre verweigert",
			MatchedScope: scope,
		}
	default:
		if state.Allowed {
			return Result{Allowed: true, ReasonCode: ReasonAllowed, Reason: "berechtigung bestätigt", MatchedScope: scope}
		}
		return denied(ReasonInsufficientRole, "gruppe gefunden, aber rolle reicht nicht aus")
	}
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
	if cache == nil {
		return false
	}
	return slices.Contains(cache[strings.TrimSpace(role)], action)
}

func denied(code string, reason string) Result {
	return Result{
		Allowed:    false,
		ReasonCode: code,
		Reason:     reason,
	}
}

func reviewDenied(code string, reason string) ReviewAuthorizationResult {
	return ReviewAuthorizationResult{Result: denied(code, reason)}
}

func isReviewAction(action Action) bool {
	return action == ActionReviewTextDecide ||
		action == ActionReviewImageDecide ||
		action == ActionReviewContributionDecide
}
