package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/config"
	"team4s.v3/backend/internal/database"
	"team4s.v3/backend/internal/handlers"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	validateRuntimeConfig(cfg)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dbPool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database init failed: %v", err)
	}
	defer dbPool.Close()
	redisClient, err := database.NewRedisClient(ctx, cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Fatalf("redis init failed: %v", err)
	}
	defer redisClient.Close()

	// Check FFmpeg availability for video processing
	if err := checkFFmpegAvailability(cfg.FFmpegPath); err != nil {
		log.Printf("warning: ffmpeg not available at %s: %v (video upload will be disabled)", cfg.FFmpegPath, err)
	} else {
		log.Printf("ffmpeg available at %s", cfg.FFmpegPath)
	}

	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), corsMiddleware(cfg.CORSAllowedOrigins))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	// Serve uploaded media files (images, videos) from storage directory.
	// Security headers are set via middleware before StaticFS delivery.
	mediaGroup := router.Group("/media")
	mediaGroup.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Content-Security-Policy", "default-src 'none'")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Cache-Control", "private, no-transform")
		c.Next()
	})
	mediaGroup.StaticFS("", http.Dir(cfg.MediaStorageDir))

	animeRepo := repository.NewAnimeRepository(dbPool)
	animeAssetRepo := repository.NewAnimeAssetRepository(dbPool)
	animeHandler := handlers.NewAnimeHandler(
		animeRepo,
		animeAssetRepo,
		handlers.AnimeMediaConfig{
			JellyfinAPIKey:  cfg.JellyfinAPIKey,
			JellyfinBaseURL: cfg.JellyfinBaseURL,
		},
	)
	episodeRepo := repository.NewEpisodeRepository(dbPool)
	episodeHandler := handlers.NewEpisodeHandler(episodeRepo)
	fansubRepo := repository.NewFansubRepository(dbPool)
	mediaRepo := repository.NewMediaRepository(dbPool, cfg.MediaPublicBaseURL, cfg.MediaStorageDir)
	mediaService := services.NewMediaService(cfg.MediaStorageDir, cfg.MediaPublicBaseURL)
	episodeVersionRepo := repository.NewEpisodeVersionRepository(dbPool)
	episodeVersionImageRepo := repository.NewEpisodeVersionImageRepository(dbPool)
	episodeVersionImagesHandler := handlers.NewEpisodeVersionImagesHandler(episodeVersionImageRepo)
	releaseAssetsHandler := handlers.NewReleaseAssetsHandler(episodeVersionRepo)
	episodePlaybackHandler := handlers.NewEpisodePlaybackHandler(episodeRepo, handlers.EpisodePlaybackConfig{
		EmbyAPIKey:              cfg.EmbyAPIKey,
		EmbyStreamBaseURL:       cfg.EmbyStreamBaseURL,
		EmbyStreamPathTemplate:  cfg.EmbyStreamPathTemplate,
		AllowedAnimeIDs:         cfg.EmbyAllowedAnimeIDs,
		ReleaseGrantSecret:      resolveReleaseGrantSecret(cfg),
		ReleaseGrantTTLSeconds:  cfg.ReleaseStreamGrantTTLSeconds,
		PlaybackRateLimitClient: redisClient,
		PlaybackRateLimit:       cfg.EpisodePlaybackRateLimit,
		PlaybackRateWindowSec:   cfg.EpisodePlaybackRateWindowSec,
		MaxConcurrentStreams:    cfg.EpisodePlaybackMaxConcurrent,
	})
	commentRepo := repository.NewCommentRepository(dbPool)
	commentHandler := handlers.NewCommentHandler(commentRepo)
	commentCreateLimiter := middleware.NewCommentRateLimiter(redisClient, 5, time.Minute)
	authRepo := repository.NewAuthRepository(redisClient)
	appAuthRepo := repository.NewAppAuthRepository(dbPool)
	memberProfileRepo := repository.NewMemberProfileRepository(dbPool, cfg.MediaPublicBaseURL)
	contributorDashboardRepo := repository.NewContributorDashboardRepository(dbPool)
	authHandler := handlers.NewAuthHandler(
		authRepo,
		cfg.AuthTokenSecret,
		time.Duration(cfg.AuthAccessTokenTTLSeconds)*time.Second,
		time.Duration(cfg.AuthRefreshTokenTTLSeconds)*time.Second,
		handlers.AuthIssueConfig{
			DevMode:        cfg.AuthIssueDevMode,
			DevUserID:      cfg.AuthIssueDevUserID,
			DevDisplayName: strings.TrimSpace(cfg.AuthIssueDevDisplayName),
			DevKey:         strings.TrimSpace(cfg.AuthIssueDevKey),
		},
	)
	watchlistRepo := repository.NewWatchlistRepository(dbPool)
	watchlistHandler := handlers.NewWatchlistHandler(watchlistRepo)
	adminContentRepo := repository.NewAdminContentRepository(dbPool)
	episodeImportRepo := repository.NewEpisodeImportRepository(dbPool)
	authzRepo := repository.NewAuthzRepository(dbPool)
	permissionSvc := permissions.NewService(authzRepo)
	auditLogRepo := repository.NewAuditLogRepository(dbPool)
	memberClaimsRepo := repository.NewMemberClaimsRepository(dbPool)
	memberClaimInvitationsRepo := repository.NewMemberClaimInvitationRepository(dbPool, cfg.AppPublicURL)
	memberRequestsRepo := repository.NewMemberRequestsRepository(dbPool)
	memberClaimsHandler := handlers.NewMemberClaimsHandler(memberClaimsRepo, permissionSvc, auditLogRepo)
	memberClaimInvitationsHandler := handlers.NewMemberClaimInvitationsHandler(memberClaimInvitationsRepo, permissionSvc, auditLogRepo, cfg.AppPublicURL)
	memberProfileNoindexHandler := handlers.NewMemberProfileNoindexHandler(memberClaimsRepo)
	memberRequestsHandler := handlers.NewMemberRequestsHandler(memberRequestsRepo, permissionSvc, auditLogRepo)
	tiptapSvc := services.NewTipTapService()
	var mailerSvc services.Mailer
	if cfg.SMTPEnabled {
		mailerSvc = services.NewSMTPMailer(services.MailerConfig{
			Host:      cfg.SMTPHost,
			Port:      cfg.SMTPPort,
			Username:  cfg.SMTPUsername,
			Password:  cfg.SMTPPassword,
			FromEmail: cfg.SMTPFromEmail,
			FromName:  cfg.SMTPFromName,
			StartTLS:  cfg.SMTPStartTLS,
		})
		log.Printf("SMTP-Mailer aktiv: %s:%d (from=%s)", cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPFromEmail)
	} else {
		mailerSvc = services.NewNoopMailer()
		log.Printf("SMTP_ENABLED=false: Noop-Mailer aktiv (kein Mailversand)")
	}
	groupAppMemberRepo := repository.NewFansubGroupAppMemberRepository(dbPool)
	groupInvitationRepo := repository.NewFansubGroupInvitationRepository(dbPool, groupAppMemberRepo)
	var authMiddleware gin.HandlerFunc
	var authOptionalMiddleware gin.HandlerFunc
	var keycloakVerifier *auth.KeycloakVerifier
	if cfg.KeycloakEnabled {
		keycloakVerifier, err = auth.NewKeycloakVerifier(ctx, cfg.KeycloakIssuerURL, cfg.KeycloakDiscoveryURL, cfg.KeycloakClientID, cfg.KeycloakAPIAudience)
		if err != nil {
			log.Fatalf("keycloak init failed: %v", err)
		}
		currentUserResolver := middleware.NewKeycloakCurrentUserResolver(keycloakVerifier, appAuthRepo, authzRepo, authRepo)
		authMiddleware = middleware.CurrentUserMiddleware(currentUserResolver)
		authOptionalMiddleware = middleware.CurrentUserOptionalMiddleware(currentUserResolver)
	} else {
		middleware.ConfigureLocalAuthBypass(cfg.AuthBypassLocal, cfg.AuthIssueDevUserID, strings.TrimSpace(cfg.AuthIssueDevDisplayName))
		authMiddleware = middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo)
		authOptionalMiddleware = middleware.CommentAuthOptionalMiddlewareWithState(cfg.AuthTokenSecret, authRepo)
	}
	appAuthHandler := handlers.NewAppAuthHandler(
		appAuthRepo,
		authzRepo,
		authRepo,
		groupAppMemberRepo,
		groupInvitationRepo,
		memberProfileRepo,
		contributorDashboardRepo,
		keycloakVerifier,
		permissionSvc,
		auditLogRepo,
		tiptapSvc,
		mailerSvc,
		cfg.MediaStorageDir,
		cfg.MediaPublicBaseURL,
		cfg.KeycloakAccountURL,
		cfg.AppPublicURL,
	)
	adminBootstrapUserIDs := resolveAdminBootstrapUserIDs(cfg)
	if err := bootstrapAdminRoleAssignments(ctx, authzRepo, cfg.AuthAdminRoleName, adminBootstrapUserIDs); err != nil {
		if isUndefinedTableError(err) {
			log.Printf("warning: admin role bootstrap skipped because role tables are missing (run migrations): %v", err)
		} else {
			log.Fatalf("admin role bootstrap failed: %v", err)
		}
	}
	adminContentHandler := handlers.NewAdminContentHandler(
		adminContentRepo,
		animeAssetRepo,
		fansubRepo,
		episodeVersionRepo,
		episodeImportRepo,
		authzRepo,
		cfg.AuthAdminRoleName,
		cfg.MediaStorageDir,
		handlers.AdminContentJellyfinConfig{
			APIKey:            cfg.JellyfinAPIKey,
			BaseURL:           cfg.JellyfinBaseURL,
			StreamPath:        cfg.JellyfinStreamPathTemplate,
			AllowedLibraryIDs: cfg.JellyfinAllowedLibraryIDs,
		},
		handlers.AdminContentAssetSearchConfig{
			TMDBAPIKey:   cfg.TMDBAPIKey,
			FanartAPIKey: cfg.FanartAPIKey,
		},
	)
	adminContentHandler.WithMediaDeps(mediaRepo, mediaService).
		WithNoteDeps(repository.NewFansubNotesRepository(dbPool), services.NewMarkdownService()).
		WithReleaseVersionNoteDeps(repository.NewReleaseVersionNotesRepository(dbPool)).
		WithTipTapDeps(tiptapSvc).
		WithPermissionDeps(permissionSvc, auditLogRepo)
	fansubHandler := handlers.NewFansubHandler(
		fansubRepo,
		episodeVersionRepo,
		authzRepo,
		cfg.AuthAdminRoleName,
		handlers.FansubProxyConfig{
			EmbyAPIKey:             cfg.EmbyAPIKey,
			EmbyBaseURL:            cfg.EmbyStreamBaseURL,
			EmbyStreamPathTemplate: cfg.EmbyStreamPathTemplate,
			JellyfinAPIKey:         cfg.JellyfinAPIKey,
			JellyfinBaseURL:        cfg.JellyfinBaseURL,
			JellyfinStreamPath:     cfg.JellyfinStreamPathTemplate,
			ReleaseGrantSecret:     resolveReleaseGrantSecret(cfg),
			ReleaseGrantTTLSeconds: cfg.ReleaseStreamGrantTTLSeconds,
		},
	).WithMedia(mediaRepo, mediaService).WithPermissionDeps(permissionSvc, auditLogRepo)
	groupRepo := repository.NewGroupRepository(dbPool)
	groupHandler := handlers.NewGroupHandler(groupRepo)
	groupAssetsHandler := handlers.NewGroupAssetsHandler(
		groupRepo,
		handlers.AnimeMediaConfig{
			JellyfinAPIKey:  cfg.JellyfinAPIKey,
			JellyfinBaseURL: cfg.JellyfinBaseURL,
		},
	)
	assetStreamHandler := handlers.NewAssetStreamHandler(handlers.AssetStreamConfig{
		JellyfinAPIKey:     cfg.JellyfinAPIKey,
		JellyfinBaseURL:    cfg.JellyfinBaseURL,
		JellyfinStreamPath: cfg.JellyfinStreamPathTemplate,
	})
	assetLifecycleRepo := repository.NewAssetLifecycleRepository(dbPool)
	assetLifecycleService := services.NewAssetLifecycleService(assetLifecycleRepo, cfg.MediaStorageDir)
	mediaUploadRepo := repository.NewMediaUploadRepository(dbPool)
	mediaUploadHandler := handlers.NewMediaUploadHandler(mediaUploadRepo, cfg.MediaStorageDir, cfg.MediaPublicBaseURL, cfg.FFmpegPath).
		WithLifecycleService(assetLifecycleService)

	// Periodic release-version-media cleanup job (stale processing, missing files, soft-delete).
	// Runs every 10 minutes in a background goroutine; best-effort, never stops the server.
	rvmCleanupSvc := services.NewRVMCleanupService(mediaRepo, cfg.MediaStorageDir)
	go func() {
		ticker := time.NewTicker(services.RVMCleanupInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				rvmCleanupSvc.RunOnce(context.Background())
			}
		}
	}()

	v1 := router.Group("/api/v1")
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
	publicProfileHandler := handlers.NewAppPublicProfileHandler(memberProfileRepo)
	v1.GET("/members/:slug", authOptionalMiddleware, publicProfileHandler.GetPublicMemberProfile)
	v1.GET("/me/fansub-groups", authMiddleware, appAuthHandler.ListMyFansubGroups)
	v1.GET("/me/fansub-groups/:id", authMiddleware, appAuthHandler.GetMyFansubGroupDetail)
	v1.POST("/invitations/accept", authMiddleware, appAuthHandler.AcceptFansubInvitation)
	v1.GET("/me/member-search", authMiddleware, memberClaimsHandler.SearchMembers)
	v1.GET("/me/member-claim", authMiddleware, memberClaimsHandler.GetMyClaim)
	v1.POST("/me/member-claims", authMiddleware, memberClaimsHandler.SubmitClaim)
	v1.POST("/me/member-requests", authMiddleware, memberRequestsHandler.SubmitRequest)
	v1.PATCH("/me/profile/noindex", authMiddleware, memberProfileNoindexHandler.PatchNoindex)
	v1.POST("/claim-invitations/accept", authMiddleware, memberClaimInvitationsHandler.AcceptClaimInvitation)
	v1.GET("/anime", animeHandler.List)
	v1.GET("/anime/:id", animeHandler.GetByID)
	v1.GET("/anime/:id/backdrops", animeHandler.ListBackdrops)
	v1.GET("/anime/:id/relations", animeHandler.GetAnimeRelations)
	v1.GET("/anime/:id/fansubs", fansubHandler.ListAnimeFansubs)
	v1.GET("/anime/:id/episodes", fansubHandler.ListGroupedEpisodes)
	v1.GET("/anime/:id/group/:groupId", groupHandler.GetGroupDetail)
	v1.GET("/anime/:id/group/:groupId/assets", groupAssetsHandler.GetGroupAssets)
	v1.GET("/anime/:id/group/:groupId/releases", groupHandler.GetGroupReleases)
	v1.GET("/episode-versions/:versionId", fansubHandler.GetEpisodeVersionByID)
	v1.GET("/anime/:id/comments", commentHandler.ListByAnimeID)
	v1.POST(
		"/anime/:id/comments",
		authMiddleware,
		middleware.CommentCreateRateLimitMiddleware(commentCreateLimiter),
		commentHandler.CreateByAnimeID,
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
	v1.GET("/fansubs/:id", fansubHandler.GetFansubByID)
	v1.GET("/fansubs/:id/aliases", fansubHandler.ListFansubAliases)
	v1.GET("/fansubs/:id/members", fansubHandler.ListFansubMembers)
	v1.GET("/genres", adminContentHandler.ListGenreTokensPublic)
	v1.GET("/media/image", fansubHandler.MediaImage)
	v1.GET("/media/video", fansubHandler.MediaVideo)
	v1.GET("/media/files/:filename", fansubHandler.ServeMediaFile)
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
	v1.GET("/releases/:id/assets", releaseAssetsHandler.ListReleaseAssets)
	v1.GET("/releases/:id/images", episodeVersionImagesHandler.ListReleaseImages)
	histGroupMembersRepo := repository.NewHistGroupMembersRepository(dbPool)
	histGroupMemberRolesRepo := repository.NewHistGroupMemberRolesRepository(dbPool)
	animeContributionsRepo := repository.NewAnimeContributionsRepository(dbPool)
	fansubGroupHistoryRepo := repository.NewFansubGroupHistoryRepository(dbPool)
	badgeRepo := repository.NewBadgeRepository(dbPool)
	badgeService := services.NewBadgeService(dbPool, badgeRepo)
	histGroupMembersHandler := handlers.NewFansubHistGroupMembersHandler(
		histGroupMembersRepo, badgeService, permissionSvc, auditLogRepo,
	)
	histGroupMemberRolesHandler := handlers.NewFansubHistGroupMemberRolesHandler(
		histGroupMemberRolesRepo, badgeService, permissionSvc, auditLogRepo, histGroupMembersRepo,
	)
	animeContributionsHandler := handlers.NewFansubAnimeContributionsHandler(
		animeContributionsRepo, histGroupMemberRolesRepo, permissionSvc, auditLogRepo,
	).WithBadgeService(badgeService)
	groupHistoryHandler := handlers.NewFansubGroupHistoryHandler(fansubGroupHistoryRepo).
		WithPermissionSvc(permissionSvc)
	reviewHandler := handlers.NewContributionReviewHandler(animeContributionsRepo, permissionSvc, auditLogRepo)
	registerAdminRoutes(v1, authMiddleware, adminRouteHandlers{
		adminContentHandler:           adminContentHandler,
		animeHandler:                  animeHandler,
		fansubHandler:                 fansubHandler,
		mediaUploadHandler:            mediaUploadHandler,
		appAuthHandler:                appAuthHandler,
		histGroupMembersHandler:       histGroupMembersHandler,
		histGroupMemberRolesHandler:   histGroupMemberRolesHandler,
		animeContributionsHandler:     animeContributionsHandler,
		groupHistoryHandler:           groupHistoryHandler,
		memberClaimsHandler:           memberClaimsHandler,
		memberClaimInvitationsHandler: memberClaimInvitationsHandler,
		memberRequestsHandler:         memberRequestsHandler,
	})
	memberBadgesHandler := handlers.NewMemberBadgesHandler(badgeRepo)
	archiveRepo := repository.NewMemberArchiveRepository(dbPool)
	archiveHandler := handlers.NewMemberArchiveHandler(archiveRepo)
	contributionsPublicHandler := handlers.NewContributionsPublicHandler(animeContributionsRepo)
	contributionsMeHandler := handlers.NewContributionsMeHandler(animeContributionsRepo, histGroupMemberRolesRepo, dbPool)
	// Archiv-Suche: oeffentliche Route ohne Auth-Gate (Pitfall 6 aus RESEARCH.md)
	v1.GET("/archiv", archiveHandler.SearchArchive)
	v1.GET("/me/badges", authMiddleware, memberBadgesHandler.GetMyBadges)
	v1.PATCH("/me/badges/:badgeId/visibility", authMiddleware, memberBadgesHandler.PatchBadgeVisibility)
	v1.GET("/fansubs/:id/contributions", contributionsPublicHandler.GetFansubContributions)
	v1.GET("/anime/:id/contributions", contributionsPublicHandler.GetAnimeContributions)
	v1.GET("/members/:slug/contributions", contributionsPublicHandler.GetMemberContributions)
	v1.GET("/me/anime-contributions", authMiddleware, contributionsMeHandler.ListMyAnimeContributions)
	v1.GET("/me/group-contributions", authMiddleware, contributionsMeHandler.ListMyGroupContributions)
	v1.PATCH("/me/anime-contributions/:contributionId/visibility", authMiddleware, contributionsMeHandler.UpdateMyAnimeContributionVisibility)
	v1.POST("/me/anime-contributions/:contributionId/confirm", authMiddleware, contributionsMeHandler.ConfirmMyAnimeContribution)
	v1.POST("/me/anime-contributions/:contributionId/reject", authMiddleware, contributionsMeHandler.RejectMyAnimeContribution)
	v1.PATCH("/me/group-contributions/:contributionId/visibility", authMiddleware, contributionsMeHandler.UpdateMyGroupContributionVisibility)
	proposalsMeHandler := handlers.NewContributionProposalsMeHandler(
		animeContributionsRepo, histGroupMemberRolesRepo, dbPool, auditLogRepo,
	)
	v1.GET("/me/memberships", authMiddleware, proposalsMeHandler.ListMemberships)
	v1.POST("/me/contribution-proposals", authMiddleware, proposalsMeHandler.CreateProposal)
	v1.POST("/me/anime-contributions/:contributionId/self-publish", authMiddleware, proposalsMeHandler.SelfPublish)
	v1.GET("/admin/fansubs/:id/contribution-proposals", authMiddleware, reviewHandler.ListProposals)
	v1.POST("/admin/fansubs/:id/contribution-proposals/:cid/confirm", authMiddleware, reviewHandler.ConfirmProposal)
	v1.POST("/admin/fansubs/:id/contribution-proposals/:cid/reject", authMiddleware, reviewHandler.RejectProposal)
	v1.GET("/fansubs/:id/collaboration-members", fansubHandler.ListCollaborationMembers)
	v1.POST(
		"/fansubs/:id/collaboration-members",
		authMiddleware,
		fansubHandler.AddCollaborationMember,
	)
	v1.DELETE(
		"/fansubs/:id/collaboration-members/:memberGroupId",
		authMiddleware,
		fansubHandler.RemoveCollaborationMember,
	)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("server listening on :%s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown failed: %v", err)
	}
}

// corsMiddleware echoet nur explizit erlaubte Origins zurueck (Allowlist), statt einen
// Wildcard '*' zu setzen. Unbekannte Origins erhalten keinen ACAO-Header und koennen die
// Antwort damit nicht per Browser-JS auslesen.
func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[o] = struct{}{}
	}
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			if _, ok := allowed[origin]; ok {
				c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
				c.Writer.Header().Add("Vary", "Origin")
			}
		}
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
