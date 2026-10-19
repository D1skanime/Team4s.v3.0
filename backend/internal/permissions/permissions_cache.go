package permissions

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync"
)

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
	ActionReleaseVersionMediaReorder,
	ActionReleaseThemeAssetUpload,
	ActionReleaseVersionMediaHighlight,
	ActionReleaseVersionNotesWrite,
	ActionReleaseVersionNotesViewAll,
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
