package main

import (
	"context"
	"log"
	"strings"
	"time"

	"team4s.v3/backend/internal/auth"
	"team4s.v3/backend/internal/config"
	"team4s.v3/backend/internal/handlers"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/permissions"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// catalogDeps accumulates every repo/service/handler constructed while wiring the
// application's core domain dependencies in bootstrapCatalog, so route registration
// (routes_public.go) and the fansub-contributions/admin wiring
// (wiring_fansub_contributions.go) can consume exactly what they need by name. This
// mirrors admin_routes.go's existing struct-of-dependencies-in shape -- no interfaces,
// no DI container.
type catalogDeps struct {
	animeRepo                   *repository.AnimeRepository
	animeAssetRepo              *repository.AnimeAssetRepository
	animeHandler                *handlers.AnimeHandler
	searchHandler               *handlers.SearchHandler
	episodeRepo                 *repository.EpisodeRepository
	episodeHandler              *handlers.EpisodeHandler
	fansubRepo                  *repository.FansubRepository
	mediaRepo                   *repository.MediaRepository
	mediaService                *services.MediaService
	pointService                *services.PointService
	releaseCrewService          *services.ReleaseCrewService
	episodeVersionRepo          *repository.EpisodeVersionRepository
	episodeVersionImageRepo     *repository.EpisodeVersionImageRepository
	episodeVersionImagesHandler *handlers.EpisodeVersionImagesHandler
	releaseAssetsHandler        *handlers.ReleaseAssetsHandler
	episodePlaybackHandler      *handlers.EpisodePlaybackHandler
	commentHandler              *handlers.CommentHandler
	commentCreateLimiter        *middleware.CommentRateLimiter
	fansubHintDailyLimiter      *middleware.CommentRateLimiter
	authRepo                    *repository.AuthRepository
	appAuthRepo                 *repository.AppAuthRepository
	memberProfileRepo           *repository.MemberProfileRepository
	authHandler                 *handlers.AuthHandler
	watchlistHandler            *handlers.WatchlistHandler
	adminContentRepo            *repository.AdminContentRepository
	episodeImportRepo           *repository.EpisodeImportRepository
	authzRepo                   *repository.AuthzRepository
	permissionSvc               *permissions.Service
	auditLogRepo                *repository.AuditLogRepository
	memberClaimsRepo            *repository.MemberClaimsRepository
	memberClaimInvitationsRepo  *repository.MemberClaimInvitationRepository
	memberClaimsHandler         *handlers.MemberClaimsHandler
	memberClaimInvitationsHandler *handlers.MemberClaimInvitationsHandler
	memberProfileNoindexHandler *handlers.MemberProfileNoindexHandler
	memberRequestsHandler       *handlers.MemberRequestsHandler
	memberMemorialHandler       *handlers.MemberMemorialHandler
	memberCorrectionHandler     *handlers.MemberCorrectionHandler
	tiptapSvc                   *services.TipTapService
	authMiddleware              gin.HandlerFunc
	authOptionalMiddleware      gin.HandlerFunc
	appAuthHandler              *handlers.AppAuthHandler
	adminContentHandler         *handlers.AdminContentHandler
	fansubNotesRepo             *repository.FansubNotesRepository
	assetLifecycleService       *services.AssetLifecycleService
	mediaUploadHandler          *handlers.MediaUploadHandler
	fansubHandler               *handlers.FansubHandler
	groupRepo                   *repository.GroupRepository
	groupHandler                *handlers.GroupHandler
	groupPublicHandler          *handlers.GroupPublicHandler
	projectMemberPublicHandler  *handlers.ProjectMemberPublicHandler
	groupAssetsHandler          *handlers.GroupAssetsHandler
	assetStreamHandler          *handlers.AssetStreamHandler
}

// bootstrapCatalog wires the full repo -> service -> handler chain for the catalog,
// auth, member-profile, media-upload, fansub/group, and background-job surface.
// Equivalent to main()'s original lines 81-370 (pre-191-26 split); construction order
// is unchanged on purpose -- several of these constructors have side effects (DB
// reads, fatal validation) that must still run in the original sequence.
func bootstrapCatalog(ctx context.Context, cfg config.Config, dbPool *pgxpool.Pool, redisClient *redis.Client) catalogDeps {
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
	searchRepo := repository.NewSearchRepository(dbPool)
	searchHandler := handlers.NewSearchHandler(searchRepo)
	episodeRepo := repository.NewEpisodeRepository(dbPool)
	episodeHandler := handlers.NewEpisodeHandler(episodeRepo)
	fansubRepo := repository.NewFansubRepository(dbPool, cfg.MediaStorageDir)
	mediaRepo := repository.NewMediaRepository(dbPool, cfg.MediaPublicBaseURL, cfg.MediaStorageDir)
	mediaService := services.NewMediaService(cfg.MediaStorageDir, cfg.MediaPublicBaseURL, cfg.FFmpegPath).
		WithVipsThumbnailPath(cfg.VipsThumbnailPath)
	pointService := services.NewPointService(dbPool)
	releaseCrewService := services.NewReleaseCrewService(dbPool, pointService)
	episodeVersionRepo := repository.NewEpisodeVersionRepository(dbPool, releaseCrewService)
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
	// D-04(2): Spam-Schutz fuer "Hinweis senden" (max. 10 Hinweise pro App-User und Tag),
	// dieselbe Redis-Fixed-Window-Mechanik wie commentCreateLimiter, nur anderer Schluessel
	// (AppUserID statt ClientIP) und anderes Limit/Fenster.
	fansubHintDailyLimiter := middleware.NewCommentRateLimiter(redisClient, 10, 24*time.Hour)
	authRepo := repository.NewAuthRepository(redisClient)
	appAuthRepo := repository.NewAppAuthRepository(dbPool)
	memberProfileRepo := repository.NewMemberProfileRepository(dbPool, cfg.MediaPublicBaseURL)
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
	adminContentRepo := repository.NewAdminContentRepository(dbPool, cfg.MediaStorageDir)
	if cfg.SegmentRenderEnabled {
		if reset, err := adminContentRepo.RequeueInterruptedThemeSegmentRenders(ctx); err != nil {
			log.Printf("Segment-Render-Recovery beim Start fehlgeschlagen: %v", err)
		} else if reset > 0 {
			log.Printf("Segment-Render-Recovery: %d unterbrochene Render-Jobs erneut eingereiht", reset)
		}
	}
	episodeImportRepo := repository.NewEpisodeImportRepository(dbPool, releaseCrewService)
	authzRepo := repository.NewAuthzRepository(dbPool)
	permissionSvc := permissions.NewService(authzRepo)
	if err := permissionSvc.LoadCache(ctx, authzRepo); err != nil {
		log.Fatalf("Capability-Registry laden fehlgeschlagen: %v", err)
	}
	// D-12: Gruppenrollen-Catalog aus role_definitions laden (NACH LoadCache — Fallstrick 5).
	if err := permissionSvc.LoadFansubGroupCatalog(ctx, authzRepo); err != nil {
		log.Fatalf("Gruppenrollen-Catalog laden fehlgeschlagen: %v", err)
	}
	auditLogRepo := repository.NewAuditLogRepository(dbPool)
	memberClaimsRepo := repository.NewMemberClaimsRepository(dbPool).WithAuditLog(auditLogRepo)
	memberClaimInvitationsRepo := repository.NewMemberClaimInvitationRepository(dbPool, cfg.AppPublicURL).WithAuditLog(auditLogRepo)
	memberRequestsRepo := repository.NewMemberRequestsRepository(dbPool)
	memberClaimsHandler := handlers.NewMemberClaimsHandler(memberClaimsRepo, permissionSvc, auditLogRepo)
	memberClaimInvitationsHandler := handlers.NewMemberClaimInvitationsHandler(memberClaimInvitationsRepo, permissionSvc, auditLogRepo, cfg.AppPublicURL)
	memberProfileNoindexHandler := handlers.NewMemberProfileNoindexHandler(memberClaimsRepo)
	memberRequestsHandler := handlers.NewMemberRequestsHandler(memberRequestsRepo, permissionSvc, auditLogRepo)
	memberMemorialRepo := repository.NewMemberMemorialRepository(dbPool)
	memberMemorialHandler := handlers.NewMemberMemorialHandler(authzRepo, memberMemorialRepo, auditLogRepo)
	memberCorrectionRepo := repository.NewMemberCorrectionRepository(dbPool)
	memberCorrectionHandler := handlers.NewMemberCorrectionHandler(memberCorrectionRepo, auditLogRepo)
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
	groupAppMemberRepo := repository.NewFansubGroupAppMemberRepository(dbPool, cfg.MediaPublicBaseURL)
	groupInvitationRepo := repository.NewFansubGroupInvitationRepository(dbPool, groupAppMemberRepo)
	var authMiddleware gin.HandlerFunc
	var authOptionalMiddleware gin.HandlerFunc
	var keycloakVerifier *auth.KeycloakVerifier
	if cfg.KeycloakEnabled {
		var err error
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
		keycloakVerifier,
		permissionSvc,
		auditLogRepo,
		tiptapSvc,
		mailerSvc,
		cfg.MediaStorageDir,
		cfg.MediaPublicBaseURL,
		cfg.KeycloakAccountURL,
		cfg.AppPublicURL,
		fansubRepo,
	).WithMediaToolPaths(cfg.FFmpegPath, cfg.VipsThumbnailPath)
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
	fansubNotesRepo := repository.NewFansubNotesRepository(dbPool)
	adminContentHandler.WithMediaDeps(mediaRepo, mediaService).
		WithNoteDeps(fansubNotesRepo, services.NewMarkdownService()).
		WithProjectNoteCreditDeps(services.NewProjectNoteCreditService(dbPool, fansubNotesRepo)).
		WithReleaseVersionNoteDeps(repository.NewReleaseVersionNotesRepository(dbPool)).
		WithFansubReleasesContributionsDeps(repository.NewFansubReleasesContributionsRepository(dbPool)).
		WithReleaseCrewDeps(releaseCrewService).
		WithTipTapDeps(tiptapSvc).
		WithPermissionDeps(permissionSvc, auditLogRepo).
		WithSegmentStreamDeps(
			resolveReleaseGrantSecret(cfg),
			cfg.ReleaseStreamGrantTTLSeconds,
			cfg.SegmentRenderEnabled,
			cfg.SegmentRenderDir,
			cfg.SegmentRenderMaxSeconds,
			cfg.SegmentRenderFFmpegPath,
		).
		WithLibraryDiscoveryIgnoreDeps(repository.NewLibraryDiscoveryIgnoreRepository(dbPool)).
		// 165-01/D-19: kurzlebiger (5min TTL) serverseitiger Cache fuer den Jellyfin-
		// Discovery-Snapshot, damit nicht jeder Seitenaufruf die komplette Bibliothek
		// erneut von Jellyfin abfragt. redisClient ist bereits oben initialisiert.
		WithDiscoveryCacheDeps(handlers.NewRedisDiscoveryCache(redisClient))
	// Globaler Anime-Uploader (POST /admin/upload). Vor dem Render-Worker gebaut, weil
	// automatische Kara-Vorschaubilder (Phase 172) ueber denselben Ablagepfad gespeichert werden.
	assetLifecycleRepo := repository.NewAssetLifecycleRepository(dbPool)
	assetLifecycleService := services.NewAssetLifecycleService(assetLifecycleRepo, cfg.MediaStorageDir)
	mediaUploadRepo := repository.NewMediaUploadRepository(dbPool)
	mediaUploadHandler := handlers.NewMediaUploadHandler(mediaUploadRepo, cfg.MediaStorageDir, cfg.MediaPublicBaseURL, cfg.FFmpegPath).
		WithVipsThumbnailPath(cfg.VipsThumbnailPath).
		WithLifecycleService(assetLifecycleService).
		WithAdminAuthz(authzRepo, cfg.AuthAdminRoleName).
		WithSegmentPreviewAuthorizer(adminContentHandler.AuthorizeSegmentPreviewUpload)
	adminContentHandler.WithGeneratedImageStore(mediaUploadHandler)
	if cfg.SegmentRenderEnabled {
		// context.Background() statt des Startup-Contexts: der Worker läuft für die gesamte
		// Prozesslaufzeit, unabhängig vom kurzen 10s-Timeout, der nur den Boot-Vorgang begrenzt.
		go adminContentHandler.StartSegmentRenderWorker(context.Background())
		// Periodischer Cleanup verwaister Untertitel-Temp-Dateien (Prozess-Crash zwischen Download
		// und dem defer-Cleanup in RenderSegment). Best-effort, stoppt den Server nie.
		go func() {
			ticker := time.NewTicker(handlers.SegmentSubtitleCleanupInterval)
			defer ticker.Stop()
			for range ticker.C {
				if removed, err := adminContentHandler.CleanupOrphanedSegmentSubtitles(time.Hour); err != nil {
					log.Printf("Segment-Untertitel-Cleanup fehlgeschlagen: %v", err)
				} else if removed > 0 {
					log.Printf("Segment-Untertitel-Cleanup: %d verwaiste Dateien entfernt", removed)
				}
			}
		}()
	}
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
	).WithMedia(mediaRepo, mediaService).
		WithReleaseMetadataCreditService(services.NewReleaseMetadataCreditService(dbPool)).
		WithPermissionDeps(permissionSvc, auditLogRepo).
		WithReleasePlaybackEntitlements(repository.NewReleasePlaybackEntitlementRepository(dbPool, authzRepo)).
		WithProjectResolverRepo(repository.NewFansubProjectResolverRepository(dbPool, cfg.MediaStorageDir))
	groupRepo := repository.NewGroupRepository(dbPool).WithMediaStorageDir(cfg.MediaStorageDir)
	groupHandler := handlers.NewGroupHandler(groupRepo)
	groupContributorsRepo := repository.NewGroupContributorsRepository(dbPool)
	groupThemesRepo := repository.NewGroupThemesRepository(dbPool, cfg.MediaStorageDir)
	groupReleaseMediaRepo := repository.NewGroupReleaseMediaRepository(dbPool, cfg.MediaStorageDir)
	releaseDetailPublicRepo := repository.NewReleaseDetailPublicRepository(dbPool, cfg.MediaStorageDir)
	groupPublicHandler := handlers.NewGroupPublicHandler(
		groupContributorsRepo,
		groupThemesRepo,
		groupReleaseMediaRepo,
		repository.NewFansubNotesRepository(dbPool),
	).WithReleaseDetailRepo(releaseDetailPublicRepo).WithGroupReleasesRepo(groupRepo)
	projectMemberPublicRepo := repository.NewProjectMemberPublicRepository(dbPool)
	projectMemberPublicHandler := handlers.NewProjectMemberPublicHandler(memberProfileRepo, projectMemberPublicRepo, cfg.MediaStorageDir)
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
	// Periodic release-version-media cleanup job (stale processing, missing files, soft-delete).
	// Runs every 10 minutes in a background goroutine; best-effort, never stops the server.
	rvmCleanupSvc := services.NewRVMCleanupService(mediaRepo, cfg.MediaStorageDir)
	releaseReviewCleanupSvc := services.NewReleaseReviewCleanupService(
		repository.NewReleaseReviewCleanupRepository(dbPool),
		rvmCleanupSvc,
		services.ReleaseReviewCleanupRetentionForProfile(cfg.RuntimeProfile),
		func() time.Time { return time.Now().UTC() },
	)
	go func() {
		ticker := time.NewTicker(services.ReleaseReviewCleanupInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				rvmCleanupSvc.RunOnce(context.Background())
				if err := releaseReviewCleanupSvc.RunOnce(context.Background()); err != nil {
					log.Printf("release review cleanup failed: %v", err)
				}
			}
		}
	}()

	return catalogDeps{
		animeRepo:                     animeRepo,
		animeAssetRepo:                animeAssetRepo,
		animeHandler:                  animeHandler,
		searchHandler:                 searchHandler,
		episodeRepo:                   episodeRepo,
		episodeHandler:                episodeHandler,
		fansubRepo:                    fansubRepo,
		mediaRepo:                     mediaRepo,
		mediaService:                  mediaService,
		pointService:                  pointService,
		releaseCrewService:            releaseCrewService,
		episodeVersionRepo:            episodeVersionRepo,
		episodeVersionImageRepo:       episodeVersionImageRepo,
		episodeVersionImagesHandler:   episodeVersionImagesHandler,
		releaseAssetsHandler:          releaseAssetsHandler,
		episodePlaybackHandler:        episodePlaybackHandler,
		commentHandler:                commentHandler,
		commentCreateLimiter:          commentCreateLimiter,
		fansubHintDailyLimiter:        fansubHintDailyLimiter,
		authRepo:                      authRepo,
		appAuthRepo:                   appAuthRepo,
		memberProfileRepo:             memberProfileRepo,
		authHandler:                   authHandler,
		watchlistHandler:              watchlistHandler,
		adminContentRepo:              adminContentRepo,
		episodeImportRepo:             episodeImportRepo,
		authzRepo:                     authzRepo,
		permissionSvc:                 permissionSvc,
		auditLogRepo:                  auditLogRepo,
		memberClaimsRepo:              memberClaimsRepo,
		memberClaimInvitationsRepo:    memberClaimInvitationsRepo,
		memberClaimsHandler:           memberClaimsHandler,
		memberClaimInvitationsHandler: memberClaimInvitationsHandler,
		memberProfileNoindexHandler:   memberProfileNoindexHandler,
		memberRequestsHandler:         memberRequestsHandler,
		memberMemorialHandler:         memberMemorialHandler,
		memberCorrectionHandler:       memberCorrectionHandler,
		tiptapSvc:                     tiptapSvc,
		authMiddleware:                authMiddleware,
		authOptionalMiddleware:        authOptionalMiddleware,
		appAuthHandler:                appAuthHandler,
		adminContentHandler:           adminContentHandler,
		fansubNotesRepo:               fansubNotesRepo,
		assetLifecycleService:         assetLifecycleService,
		mediaUploadHandler:            mediaUploadHandler,
		fansubHandler:                 fansubHandler,
		groupRepo:                     groupRepo,
		groupHandler:                  groupHandler,
		groupPublicHandler:            groupPublicHandler,
		projectMemberPublicHandler:    projectMemberPublicHandler,
		groupAssetsHandler:            groupAssetsHandler,
		assetStreamHandler:            assetStreamHandler,
	}
}
