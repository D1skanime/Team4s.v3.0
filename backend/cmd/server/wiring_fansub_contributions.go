package main

import (
	"team4s.v3/backend/internal/config"
	"team4s.v3/backend/internal/handlers"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// fansubContributionsResult holds the handlers/repos constructed here that
// routes_public.go's second block still needs after this function returns
// (badgeRepo, animeContributionsRepo, histGroupMemberRolesRepo, releaseReviewQueryRepo
// are all consumed again by handlers built in registerPublicRoutesPart2).
type fansubContributionsResult struct {
	badgeRepo                *repository.BadgeRepository
	animeContributionsRepo   *repository.AnimeContributionsRepository
	histGroupMemberRolesRepo *repository.HistGroupMemberRolesRepository
	releaseReviewQueryRepo   *repository.ReleaseReviewQueryRepository
	reviewHandler            *handlers.ContributionReviewHandler
}

// wireFansubContributionsAndAdminRoutes wires the fansub-history/contributions/badges
// repos and the Phase 78/80/87/95/107/137/138-xx admin handlers, then registers every
// `/api/v1/admin/*` route via registerAdminRoutes (admin_routes.go). Equivalent to
// main()'s original lines 507-608 (pre-191-26 split); the dependencies this function
// needs from bootstrapCatalog are unpacked into locals below so the rest of the body
// stays textually identical to the pre-split main.go.
func wireFansubContributionsAndAdminRoutes(
	dbPool *pgxpool.Pool,
	cfg config.Config,
	v1 *gin.RouterGroup,
	authMiddleware gin.HandlerFunc,
	core catalogDeps,
) fansubContributionsResult {
	authzRepo := core.authzRepo
	permissionSvc := core.permissionSvc
	auditLogRepo := core.auditLogRepo
	releaseCrewService := core.releaseCrewService
	mediaRepo := core.mediaRepo
	memberClaimsRepo := core.memberClaimsRepo
	adminContentHandler := core.adminContentHandler
	animeHandler := core.animeHandler
	fansubHandler := core.fansubHandler
	mediaUploadHandler := core.mediaUploadHandler
	appAuthHandler := core.appAuthHandler
	memberClaimsHandler := core.memberClaimsHandler
	memberClaimInvitationsHandler := core.memberClaimInvitationsHandler
	memberRequestsHandler := core.memberRequestsHandler
	memberMemorialHandler := core.memberMemorialHandler

	histGroupMembersRepo := repository.NewHistGroupMembersRepository(dbPool)
	histGroupMemberRolesRepo := repository.NewHistGroupMemberRolesRepository(dbPool)
	animeContributionsRepo := repository.NewAnimeContributionsRepository(dbPool).WithMediaPublicBaseURL(cfg.MediaPublicBaseURL)
	fansubGroupHistoryRepo := repository.NewFansubGroupHistoryRepository(dbPool)
	badgeRepo := repository.NewBadgeRepository(dbPool)
	badgeService := services.NewBadgeService(dbPool, badgeRepo)
	histGroupMembersHandler := handlers.NewFansubHistGroupMembersHandler(
		histGroupMembersRepo, badgeService, permissionSvc, auditLogRepo,
	)
	histGroupMemberRolesHandler := handlers.NewFansubHistGroupMemberRolesHandler(
		histGroupMemberRolesRepo, badgeService, permissionSvc, auditLogRepo, histGroupMembersRepo,
	)
	animeCoverageRepo := repository.NewAnimeCoverageRepository(dbPool)
	animeContributionsHandler := handlers.NewFansubAnimeContributionsHandler(
		animeContributionsRepo, histGroupMemberRolesRepo, permissionSvc, auditLogRepo,
	).WithBadgeService(badgeService).
		WithHistMembersRepo(histGroupMembersRepo).
		WithCoverageRepo(animeCoverageRepo).
		WithReleaseCrewService(releaseCrewService)
	groupHistoryHandler := handlers.NewFansubGroupHistoryHandler(fansubGroupHistoryRepo).
		WithPermissionSvc(permissionSvc)
	reviewHandler := handlers.NewContributionReviewHandler(animeContributionsRepo, permissionSvc, auditLogRepo).WithReleaseCrewService(releaseCrewService)
	defaultCrewRepo := repository.NewFansubDefaultCrewRepository(dbPool)
	defaultCrewHandler := handlers.NewFansubDefaultCrewHandler(defaultCrewRepo, animeContributionsRepo, histGroupMemberRolesRepo, permissionSvc, auditLogRepo)
	// Phase 78: Gruppenmedien-Review — GET-Liste + PATCH Sichtbarkeit/Reviewstatus (Lock K/G/D-08/D-09)
	fansubMediaReviewHandler := handlers.NewFansubMediaReviewHandler(mediaRepo, permissionSvc, auditLogRepo)
	// Phase 80: Globale User-Verwaltung + Rechte-Zentrale
	adminUsersRepo := repository.NewAdminUsersRepository(dbPool, cfg.MediaStorageDir)
	adminUsersHandler := handlers.NewAdminUsersHandler(adminUsersRepo, authzRepo, auditLogRepo, permissionSvc)
	// Phase 87: Capability-Matrix CRUD (requirePlatformAdminIdentity im Handler — D-08)
	adminCapabilityHandler := handlers.NewAdminCapabilityHandler(authzRepo, authzRepo, permissionSvc, auditLogRepo)
	// Phase 138-07: Role-to-Capability Change Impact Preview (CAP-09) -- reuses the same
	// authzRepo (platform-admin gate + ListRoleHolders) and permissionSvc already constructed
	// above; no new repository.
	adminCapabilityImpactHandler := handlers.NewAdminCapabilityImpactHandler(authzRepo, authzRepo, permissionSvc)
	// Phase 138-01: "wer besitzt diese Rolle?" — real fansub-group role-holder lookup (D-07)
	adminRoleHoldersHandler := handlers.NewAdminRoleHoldersHandler(authzRepo, authzRepo)
	// Phase 95-02: Assignable Gruppenrollen-Liste (D-12)
	adminGroupRolesHandler := handlers.NewAdminGroupRolesHandler(authzRepo)
	releaseReviewQueryRepo := repository.NewReleaseReviewQueryRepository(dbPool)
	releaseReviewService := services.NewReviewService(dbPool, services.ReleaseReviewAdapters())
	releaseReviewHandler := handlers.NewReleaseReviewHandler(
		releaseReviewQueryRepo,
		permissionSvc,
		releaseReviewService,
		authzRepo,
	)
	// Phase 137-07: Effective-Rights Inspection/Mutation/History-API -- thin
	// HTTP projection of the central resolver (permissionSvc) and the
	// transactional override mutation service (137-06).
	effectiveRightsOverrideRepo := repository.NewAuthzUserOverridesRepository(dbPool)
	effectiveRightsService := services.NewEffectiveRightsService(dbPool)
	adminEffectiveRightsHandler := handlers.NewAdminEffectiveRightsHandler(
		permissionSvc, effectiveRightsService, effectiveRightsOverrideRepo, authzRepo, auditLogRepo,
	)
	adminReviewDelegationHandler := handlers.NewAdminReviewDelegationHandler(
		permissionSvc, releaseReviewService, effectiveRightsOverrideRepo, repository.NewReviewDelegationRepository(dbPool), auditLogRepo,
	)
	// Phase 138-04: Role-Assignment Impact Preview (D-22) -- reuses the same permissionSvc
	// (PreviewGroupRightsWithRoleChange) and target-repo/authz-repo dependencies already
	// constructed above for adminEffectiveRightsHandler; no new repository.
	adminRoleAssignmentImpactHandler := handlers.NewAdminRoleAssignmentImpactHandler(
		permissionSvc, effectiveRightsOverrideRepo, authzRepo,
	)
	// Phase 138-05: central cross-group Claims workspace (D-23) and Aenderungen/audit
	// workspace (D-25/D-28) -- reuse the existing memberClaimsRepo/auditLogRepo, no new
	// repository construction needed.
	adminClaimsListHandler := handlers.NewAdminClaimsListHandler(authzRepo, memberClaimsRepo)
	adminChangesHandler := handlers.NewAdminChangesHandler(authzRepo, auditLogRepo)
	// Phase 138-14: Claim-Activation Impact Preview (D-24) -- reuses the same memberClaimsRepo
	// (PreviewActivatableRoles) and permissionSvc (PreviewClaimActivationImpact) already
	// constructed above; no new repository.
	adminClaimActivationImpactHandler := handlers.NewAdminClaimActivationImpactHandler(permissionSvc, memberClaimsRepo)
	registerAdminRoutes(v1, authMiddleware, adminRouteHandlers{
		adminContentHandler:               adminContentHandler,
		animeHandler:                      animeHandler,
		fansubHandler:                     fansubHandler,
		mediaUploadHandler:                mediaUploadHandler,
		appAuthHandler:                    appAuthHandler,
		histGroupMembersHandler:           histGroupMembersHandler,
		histGroupMemberRolesHandler:       histGroupMemberRolesHandler,
		animeContributionsHandler:         animeContributionsHandler,
		groupHistoryHandler:               groupHistoryHandler,
		memberClaimsHandler:               memberClaimsHandler,
		memberClaimInvitationsHandler:     memberClaimInvitationsHandler,
		memberRequestsHandler:             memberRequestsHandler,
		memberMemorialHandler:             memberMemorialHandler,
		fansubMediaReviewHandler:          fansubMediaReviewHandler,
		defaultCrewHandler:                defaultCrewHandler,
		adminUsersHandler:                 adminUsersHandler,
		adminCapabilityHandler:            adminCapabilityHandler,
		adminCapabilityImpactHandler:      adminCapabilityImpactHandler,
		adminGroupRolesHandler:            adminGroupRolesHandler,
		releaseReviewHandler:              releaseReviewHandler,
		adminEffectiveRightsHandler:       adminEffectiveRightsHandler,
		adminReviewDelegationHandler:      adminReviewDelegationHandler,
		adminRoleHoldersHandler:           adminRoleHoldersHandler,
		adminRoleAssignmentImpactHandler:  adminRoleAssignmentImpactHandler,
		adminClaimsListHandler:            adminClaimsListHandler,
		adminChangesHandler:               adminChangesHandler,
		adminClaimActivationImpactHandler: adminClaimActivationImpactHandler,
	})

	return fansubContributionsResult{
		badgeRepo:                badgeRepo,
		animeContributionsRepo:   animeContributionsRepo,
		histGroupMemberRolesRepo: histGroupMemberRolesRepo,
		releaseReviewQueryRepo:   releaseReviewQueryRepo,
		reviewHandler:            reviewHandler,
	}
}
