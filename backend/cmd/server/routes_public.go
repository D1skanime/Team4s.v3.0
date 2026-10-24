package main

import (
	"team4s.v3/backend/internal/config"
	"team4s.v3/backend/internal/handlers"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// registerPublicRoutesPart1 registers every non-admin `/api/v1/*` route that does not
// depend on the fansub-contributions/admin wiring (wiring_fansub_contributions.go).
// Equivalent to main()'s original lines 372-506 (pre-191-26 split): role catalog,
// auth issue/refresh/revoke, /me profile, public member profiles, search, anime
// catalog, episodes/comments/watchlist, fansubs/media/assets/releases/segments. The
// dependencies this function needs from bootstrapCatalog are unpacked into locals
// below so the rest of the body stays textually identical to the pre-split main.go.
func registerPublicRoutesPart1(v1 *gin.RouterGroup, dbPool *pgxpool.Pool, core catalogDeps) {
	authHandler := core.authHandler
	authMiddleware := core.authMiddleware
	authOptionalMiddleware := core.authOptionalMiddleware
	appAuthHandler := core.appAuthHandler
	memberProfileRepo := core.memberProfileRepo
	memberClaimsHandler := core.memberClaimsHandler
	memberRequestsHandler := core.memberRequestsHandler
	memberCorrectionHandler := core.memberCorrectionHandler
	memberProfileNoindexHandler := core.memberProfileNoindexHandler
	memberClaimInvitationsHandler := core.memberClaimInvitationsHandler
	searchHandler := core.searchHandler
	animeHandler := core.animeHandler
	fansubHandler := core.fansubHandler
	groupHandler := core.groupHandler
	groupAssetsHandler := core.groupAssetsHandler
	groupPublicHandler := core.groupPublicHandler
	projectMemberPublicHandler := core.projectMemberPublicHandler
	commentHandler := core.commentHandler
	commentCreateLimiter := core.commentCreateLimiter
	watchlistHandler := core.watchlistHandler
	episodeHandler := core.episodeHandler
	episodePlaybackHandler := core.episodePlaybackHandler
	adminContentHandler := core.adminContentHandler
	assetStreamHandler := core.assetStreamHandler
	releaseAssetsHandler := core.releaseAssetsHandler
	episodeVersionImagesHandler := core.episodeVersionImagesHandler

	roleCatalogHandler := handlers.NewRoleCatalogHandler(repository.NewRoleCatalogRepository(dbPool))
	handlers.RegisterPublicRoleCatalogRoute(v1, roleCatalogHandler)
	v1.POST("/auth/issue", authHandler.Issue)
	v1.POST("/auth/refresh", authHandler.Refresh)
	v1.POST("/auth/revoke", authMiddleware, authHandler.Revoke)
	v1.POST("/auth/keycloak/backchannel-logout", appAuthHandler.HandleKeycloakBackchannelLogout)
	v1.GET("/me", authMiddleware, appAuthHandler.GetCurrentUser)
	v1.GET("/me/profile", authMiddleware, appAuthHandler.GetOwnProfile)
	v1.PUT("/me/profile", authMiddleware, appAuthHandler.UpdateOwnProfile)
	v1.POST("/me/profile/avatar", authMiddleware, appAuthHandler.UploadOwnProfileAvatar)
	v1.POST("/me/profile/background", authMiddleware, appAuthHandler.UploadOwnProfileBackground)
	v1.POST("/me/profile/story-images", authMiddleware, appAuthHandler.UploadOwnProfileStoryImage)
	publicProfileHandler := handlers.NewAppPublicProfileHandler(memberProfileRepo, memberProfileRepo, memberProfileRepo)
	v1.GET("/members/:slug", authOptionalMiddleware, publicProfileHandler.GetPublicMemberProfile)
	v1.GET("/members/:slug/projects", authOptionalMiddleware, publicProfileHandler.GetPublicMemberProjects)
	v1.GET("/members/:slug/viewer", authOptionalMiddleware, publicProfileHandler.GetPublicMemberViewer)
	v1.POST("/invitations/accept", authMiddleware, appAuthHandler.AcceptFansubInvitation)
	v1.GET("/me/member-search", authMiddleware, memberClaimsHandler.SearchMembers)
	v1.GET("/me/member-claim", authMiddleware, memberClaimsHandler.GetMyClaim)
	v1.POST("/me/member-claims", authMiddleware, memberClaimsHandler.SubmitClaim)
	v1.POST("/me/member-requests", authMiddleware, memberRequestsHandler.SubmitRequest)
	v1.POST("/me/members/:id/correction", authMiddleware, memberCorrectionHandler.SubmitCorrection)
	v1.PATCH("/me/profile/noindex", authMiddleware, memberProfileNoindexHandler.PatchNoindex)
	v1.POST("/claim-invitations/accept", authMiddleware, memberClaimInvitationsHandler.AcceptClaimInvitation)
	v1.GET("/search", authOptionalMiddleware, searchHandler.Search)
	v1.GET("/search/suggestions", authOptionalMiddleware, searchHandler.Suggestions)
	v1.GET("/anime", animeHandler.List)
	v1.GET("/anime/:id", animeHandler.GetByID)
	v1.GET("/anime/:id/backdrops", animeHandler.ListBackdrops)
	v1.GET("/anime/:id/relations", animeHandler.GetAnimeRelations)
	v1.GET("/anime/:id/fansubs", fansubHandler.ListAnimeFansubs)
	v1.GET("/anime/:id/episodes", fansubHandler.ListGroupedEpisodes)
	v1.GET("/anime/:id/group/:groupId", groupHandler.GetGroupDetail)
	v1.GET("/anime/:id/group/:groupId/assets", groupAssetsHandler.GetGroupAssets)
	v1.GET("/anime/:id/group/:groupId/releases", groupHandler.GetGroupReleases)
	v1.GET("/anime/:id/group/:groupId/release-list", groupPublicHandler.GetGroupReleaseListCursor)
	v1.GET("/anime/:id/group/:groupId/releases/count", groupPublicHandler.GetGroupReleaseCount)
	v1.GET("/anime/:id/group/:groupId/releases/:releaseVersionId", groupPublicHandler.GetGroupReleaseDetail)
	v1.GET("/anime/:id/group/:groupId/releases/:releaseVersionId/images", groupPublicHandler.GetGroupReleaseImages)
	v1.GET("/anime/:id/group/:groupId/releases/:releaseVersionId/notes", groupPublicHandler.GetGroupReleaseNotes)
	v1.GET("/anime/:id/group/:groupId/contributors", groupPublicHandler.GetGroupContributors)
	v1.GET("/anime/:id/group/:groupId/themes", groupPublicHandler.GetGroupThemes)
	v1.GET("/anime/:id/group/:groupId/release-media", groupPublicHandler.GetGroupReleaseMedia)
	v1.GET("/anime/:id/group/:groupId/project-note", groupPublicHandler.GetGroupProjectNote)
	v1.GET("/anime/:id/group/:groupId/members/:memberSlug", authOptionalMiddleware, projectMemberPublicHandler.GetSummary)
	v1.GET("/anime/:id/group/:groupId/members/:memberSlug/notes", authOptionalMiddleware, projectMemberPublicHandler.GetNotes)
	v1.GET("/anime/:id/group/:groupId/members/:memberSlug/media", authOptionalMiddleware, projectMemberPublicHandler.GetMedia)
	v1.GET("/anime/:id/group/:groupId/members/:memberSlug/releases", authOptionalMiddleware, projectMemberPublicHandler.GetReleases)
	v1.GET("/episode-versions/:versionId", fansubHandler.GetEpisodeVersionByID)
	v1.GET("/anime/:id/comments", commentHandler.ListByAnimeID)
	v1.POST(
		"/anime/:id/comments",
		authMiddleware,
		middleware.CommentCreateRateLimitMiddleware(commentCreateLimiter),
		commentHandler.CreateByAnimeID,
	)
	v1.GET(
		"/release-versions/:id/playback-access",
		authMiddleware,
		fansubHandler.GetReleasePlaybackAccess,
	)
	v1.GET("/watchlist", authMiddleware, watchlistHandler.ListByUser)
	v1.POST("/watchlist", authMiddleware, watchlistHandler.CreateByUser)
	v1.GET(
		"/watchlist/:anime_id",
		authMiddleware,
		watchlistHandler.GetByUserAndAnimeID,
	)
	v1.DELETE(
		"/watchlist/:anime_id",
		authMiddleware,
		watchlistHandler.DeleteByUser,
	)
	v1.GET("/episodes/:id", episodeHandler.GetByID)
	v1.POST(
		"/episodes/:id/play/grant",
		authMiddleware,
		episodePlaybackHandler.CreatePlaybackGrant,
	)
	v1.GET(
		"/episodes/:id/play",
		authOptionalMiddleware,
		episodePlaybackHandler.Play,
	)
	v1.GET("/fansubs", fansubHandler.ListFansubs)
	v1.GET("/fansub-slugs/:slug", fansubHandler.GetFansubBySlug)
	v1.GET("/fansub-slugs/:slug/public-profile", fansubHandler.GetFansubPublicProfileBySlug)
	v1.GET("/fansub-slugs/:slug/projects/:animeSlug/resolve", fansubHandler.ResolveFansubProject)
	v1.GET("/fansubs/:id", fansubHandler.GetFansubByID)
	v1.GET("/fansubs/:id/aliases", fansubHandler.ListFansubAliases)
	v1.GET("/fansubs/:id/members", fansubHandler.ListFansubMembers)
	v1.GET("/genres", adminContentHandler.ListGenreTokensPublic)
	v1.GET("/media/image", fansubHandler.MediaImage)
	v1.GET("/media/video", fansubHandler.MediaVideo)
	v1.GET("/media/files/:filename", fansubHandler.ServeMediaFile)
	// Oeffentlicher Story-Bild-Resolver (kein Auth — <img> traegt keinen Bearer; Story-Bilder
	// sind ohnehin oeffentlich). Editor nutzt ihn fuer geladene Bilder (media_asset_id -> Datei).
	v1.GET("/media/story-images/:id", appAuthHandler.ResolveStoryImageByID)
	v1.GET(
		"/assets/:assetId/stream",
		authMiddleware,
		assetStreamHandler.StreamAsset,
	)
	v1.POST(
		"/releases/:id/grant",
		authMiddleware,
		fansubHandler.CreateReleaseStreamGrant,
	)
	v1.GET(
		"/releases/:id/stream",
		authOptionalMiddleware,
		fansubHandler.StreamRelease,
	)
	v1.POST(
		"/segments/:id/grant",
		authMiddleware,
		adminContentHandler.CreateSegmentStreamGrant,
	)
	v1.POST(
		"/public/segments/:id/grant",
		adminContentHandler.CreatePublicSegmentStreamGrant,
	)
	v1.POST(
		"/segments/:id/render",
		authMiddleware,
		adminContentHandler.RenderSegment,
	)
	v1.GET(
		"/segments/:id/stream",
		authOptionalMiddleware,
		adminContentHandler.StreamSegment,
	)
	v1.GET("/releases/:id/assets", releaseAssetsHandler.ListReleaseAssets)
	v1.GET("/releases/:id/images", episodeVersionImagesHandler.ListReleaseImages)
}

// registerPublicRoutesPart2 registers the remaining non-admin `/api/v1/*` routes that
// depend on handlers/repos built by wiring_fansub_contributions.go (badges,
// anime-contributions, release-review-query). Equivalent to main()'s original lines
// 609-686 (pre-191-26 split): badges, archive, domain/media-ownership projections,
// contributions, dashboard, `/me/...` contribution proposals, and the
// fansub-group-hints member/leader-review/platform-admin routes. The dependencies
// this function needs from bootstrapCatalog/wireFansubContributionsAndAdminRoutes are
// unpacked into locals below so the rest of the body stays textually identical to the
// pre-split main.go.
func registerPublicRoutesPart2(
	v1 *gin.RouterGroup,
	dbPool *pgxpool.Pool,
	cfg config.Config,
	core catalogDeps,
	contrib fansubContributionsResult,
) {
	authMiddleware := core.authMiddleware
	memberProfileRepo := core.memberProfileRepo
	memberClaimsRepo := core.memberClaimsRepo
	permissionSvc := core.permissionSvc
	auditLogRepo := core.auditLogRepo
	releaseCrewService := core.releaseCrewService
	fansubHintDailyLimiter := core.fansubHintDailyLimiter
	authzRepo := core.authzRepo
	badgeRepo := contrib.badgeRepo
	animeContributionsRepo := contrib.animeContributionsRepo
	histGroupMemberRolesRepo := contrib.histGroupMemberRolesRepo
	releaseReviewQueryRepo := contrib.releaseReviewQueryRepo
	reviewHandler := contrib.reviewHandler

	memberBadgesHandler := handlers.NewMemberBadgesHandler(badgeRepo)
	archiveRepo := repository.NewMemberArchiveRepository(dbPool)
	archiveHandler := handlers.NewMemberArchiveHandler(archiveRepo)
	domainProjectionRepo := repository.NewDomainProjectionRepository(dbPool)
	domainProjectionHandler := handlers.NewDomainProjectionHandler(domainProjectionRepo)
	mediaOwnershipProjectionRepo := repository.NewMediaOwnershipProjectionRepository(dbPool)
	mediaOwnershipProjectionHandler := handlers.NewMediaOwnershipProjectionHandler(mediaOwnershipProjectionRepo)
	contributionsPublicHandler := handlers.NewContributionsPublicHandler(animeContributionsRepo)
	memberPointTotalsRepo := repository.NewMemberPointTotalsRepository(dbPool)
	memberPointRankingHandler := handlers.NewMemberPointRankingHandler(memberPointTotalsRepo)
	contributionsMeHandler := handlers.NewContributionsMeHandler(animeContributionsRepo, histGroupMemberRolesRepo, dbPool).WithReleaseCrewService(releaseCrewService)
	dashboardMeHandler := handlers.NewDashboardMeHandler(memberProfileRepo, dbPool).
		WithClaimAttention(memberClaimsRepo, permissionSvc).
		WithReviewQueryRepo(releaseReviewQueryRepo)
	// Archiv-Suche: oeffentliche Route ohne Auth-Gate (Pitfall 6 aus RESEARCH.md)
	v1.GET("/archiv", archiveHandler.SearchArchive)
	v1.GET("/me/badges", authMiddleware, memberBadgesHandler.GetMyBadges)
	v1.PATCH("/me/badges/:badgeId/visibility", authMiddleware, memberBadgesHandler.PatchBadgeVisibility)
	v1.GET("/fansubs/:id/domain-projection", domainProjectionHandler.GetFansubGroupDomainProjection)
	v1.GET("/media-ownership/:ownerType/:ownerId", mediaOwnershipProjectionHandler.GetMediaOwnershipProjection)
	v1.GET("/fansubs/:id/contributions", contributionsPublicHandler.GetFansubContributions)
	v1.GET("/anime/:id/contributions", contributionsPublicHandler.GetAnimeContributions)
	// Eigener Top-Level-Pfad, KEIN Unterpfad von /members/:slug (Kollisionsregel, Pitfall 3 aus 109-RESEARCH.md)
	v1.GET("/member-point-ranking", memberPointRankingHandler.GetMemberPointRanking)
	v1.GET("/me/dashboard", authMiddleware, dashboardMeHandler.GetOwnDashboard)
	v1.GET("/me/anime-contributions", authMiddleware, contributionsMeHandler.ListMyAnimeContributions)
	v1.GET("/me/projects/:animeId", authMiddleware, contributionsMeHandler.GetMyProjectDetail)
	v1.GET("/me/group-contributions", authMiddleware, contributionsMeHandler.ListMyGroupContributions)
	v1.PATCH("/me/anime-contributions/:contributionId/visibility", authMiddleware, contributionsMeHandler.UpdateMyAnimeContributionVisibility)
	v1.POST("/me/anime-contributions/:contributionId/confirm", authMiddleware, contributionsMeHandler.ConfirmMyAnimeContribution)
	v1.POST("/me/anime-contributions/:contributionId/reject", authMiddleware, contributionsMeHandler.RejectMyAnimeContributionWithReason)
	v1.PATCH("/me/group-contributions/:contributionId/visibility", authMiddleware, contributionsMeHandler.UpdateMyGroupContributionVisibility)
	proposalsMeHandler := handlers.NewContributionProposalsMeHandler(
		animeContributionsRepo, histGroupMemberRolesRepo, dbPool, auditLogRepo,
	)
	v1.GET("/me/memberships", authMiddleware, proposalsMeHandler.ListMemberships)
	v1.POST("/me/contribution-proposals", authMiddleware, proposalsMeHandler.CreateProposal)
	v1.POST("/me/anime-contributions/:contributionId/self-publish", authMiddleware, proposalsMeHandler.SelfPublish)
	// Verdrahtet den Endpunkt, ueber den ein Mitglied einen Korrektur-Hinweis an jede
	// Fansub-Gruppe senden kann -- die eigene ODER eine fremde (D-06) -- ohne den
	// Ownership-Gate des regulaeren Beitragsvorschlags. Es findet in diesem Pfad KEINE
	// Rollenvalidierung statt (D-09 hat die fruehere Mitgliedschaftsanfrage samt
	// Rollenwunsch vollstaendig gestrichen); als Spam-Schutz dient nur eine zweite,
	// taegliche CommentRateLimiter-Instanz (D-04(2)).
	fansubGroupHintsRepo := repository.NewFansubGroupHintsRepository(dbPool)
	fansubGroupHintsMeHandler := handlers.NewFansubGroupHintsMeHandler(fansubGroupHintsRepo, dbPool)
	v1.POST(
		"/me/fansub-group-hints",
		authMiddleware,
		middleware.FansubGroupHintDailyLimitMiddleware(fansubHintDailyLimiter),
		fansubGroupHintsMeHandler.CreateHint,
	)
	// Absender-seitige Sicht auf eigene, bereits gesendete Hinweise (eigene UND fremde
	// Gruppen, alle Status, D-18) — nur authMiddleware, kein Tageslimit, da das Limit nur
	// das ERSTELLEN neuer Hinweise bremst, nicht das Lesen eigener.
	v1.GET("/me/fansub-group-hints", authMiddleware, fansubGroupHintsMeHandler.ListSentHints)
	v1.GET("/admin/fansubs/:id/contribution-proposals", authMiddleware, reviewHandler.ListProposals)
	v1.POST("/admin/fansubs/:id/contribution-proposals/:cid/confirm", authMiddleware, reviewHandler.ConfirmProposal)
	v1.POST("/admin/fansubs/:id/contribution-proposals/:cid/reject", authMiddleware, reviewHandler.RejectProposal)
	// Leader-der-Zielgruppe-Entscheidungsflaeche fuer eingehende Hinweise (D-01/D-06,
	// Phase 191-04) — wiederverwendet exakt die gruppen-gescopte ActionFansubGroupMembersManage-
	// Berechtigung des Beitrags-Reviews oben; fansubGroupHintsRepo ist bereits fuer den
	// Member-Erstellpfad instanziiert, hier nur als zweite Rolle (Leser/Entscheider statt
	// Ersteller) wiederverwendet.
	fansubGroupHintsReviewHandler := handlers.NewFansubGroupHintsReviewHandler(fansubGroupHintsRepo, permissionSvc, auditLogRepo)
	v1.GET("/admin/fansubs/:id/group-hints", authMiddleware, fansubGroupHintsReviewHandler.ListHints)
	v1.POST("/admin/fansubs/:id/group-hints/:hid/confirm", authMiddleware, fansubGroupHintsReviewHandler.ConfirmHint)
	v1.POST("/admin/fansubs/:id/group-hints/:hid/reject", authMiddleware, fansubGroupHintsReviewHandler.RejectHint)
	// Plattform-weite Entscheidungsflaeche fuer Korrektur-Hinweise, deren Zielgruppe
	// aktuell KEINE aktive Leitung (Rolle fansub_lead) hat (D-11) -- fuer diese Gruppen
	// existiert keine Leader-Entscheidungsflaeche, deshalb entscheidet hier der
	// Plattform-Admin. Wiederverwendet exakt fansubGroupHintsRepo (keine zweite
	// Repository-Instanz) und authzRepo/auditLogRepo, die bereits oben fuer
	// adminClaimsListHandler konstruiert sind.
	adminFansubGroupHintsHandler := handlers.NewAdminFansubGroupHintsHandler(authzRepo, fansubGroupHintsRepo, auditLogRepo)
	v1.GET("/admin/fansub-group-hints", authMiddleware, adminFansubGroupHintsHandler.ListHints)
	v1.POST("/admin/fansub-group-hints/:hid/confirm", authMiddleware, adminFansubGroupHintsHandler.ConfirmHint)
	v1.POST("/admin/fansub-group-hints/:hid/reject", authMiddleware, adminFansubGroupHintsHandler.RejectHint)
}
