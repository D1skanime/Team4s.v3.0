package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"team4s.v3/backend/internal/config"
	"team4s.v3/backend/internal/database"
	"team4s.v3/backend/internal/handlers"
	"team4s.v3/backend/internal/middleware"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgconn"
)

func main() {
	cfg := config.Load()
	runtimeProfile := strings.TrimSpace(cfg.RuntimeProfile)
	if runtimeProfile == "" {
		runtimeProfile = "local"
	}
	if strings.TrimSpace(cfg.AuthTokenSecret) == "" {
		log.Fatal("AUTH_TOKEN_SECRET is required")
	}
	if cfg.AuthAccessTokenTTLSeconds <= 0 {
		log.Fatal("AUTH_ACCESS_TOKEN_TTL_SECONDS must be greater than 0")
	}
	if cfg.AuthRefreshTokenTTLSeconds <= 0 {
		log.Fatal("AUTH_REFRESH_TOKEN_TTL_SECONDS must be greater than 0")
	}
	if cfg.ReleaseStreamGrantTTLSeconds <= 0 {
		log.Fatal("RELEASE_STREAM_GRANT_TTL_SECONDS must be greater than 0")
	}
	if cfg.EpisodePlaybackRateLimit <= 0 {
		log.Fatal("EPISODE_PLAYBACK_RATE_LIMIT must be greater than 0")
	}
	if cfg.EpisodePlaybackRateWindowSec <= 0 {
		log.Fatal("EPISODE_PLAYBACK_RATE_WINDOW_SECONDS must be greater than 0")
	}
	if cfg.EpisodePlaybackMaxConcurrent <= 0 {
		log.Fatal("EPISODE_PLAYBACK_MAX_CONCURRENT_STREAMS must be greater than 0")
	}
	if cfg.AuthIssueDevMode {
		if !isLocalDevProfile(runtimeProfile) {
			log.Fatalf("AUTH_ISSUE_DEV_MODE must be false when RUNTIME_PROFILE=%s", runtimeProfile)
		}
		if cfg.AuthIssueDevUserID <= 0 {
			log.Fatal("AUTH_ISSUE_DEV_USER_ID must be greater than 0 when AUTH_ISSUE_DEV_MODE=true")
		}

		displayName := strings.TrimSpace(cfg.AuthIssueDevDisplayName)
		if displayName == "" {
			log.Fatal("AUTH_ISSUE_DEV_DISPLAY_NAME is required when AUTH_ISSUE_DEV_MODE=true")
		}
		if len([]rune(displayName)) > 80 {
			log.Fatal("AUTH_ISSUE_DEV_DISPLAY_NAME must be at most 80 characters")
		}
		log.Printf("warning: AUTH_ISSUE_DEV_MODE=true (RUNTIME_PROFILE=%s)", runtimeProfile)
	}

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
	router.Use(gin.Logger(), gin.Recovery(), corsMiddleware())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
		})
	})

	// Serve uploaded media files (images, videos) from storage directory
	router.Static("/media", cfg.MediaStorageDir)

	animeRepo := repository.NewAnimeRepository(dbPool)
	animeHandler := handlers.NewAnimeHandler(
		animeRepo,
		handlers.AnimeMediaConfig{
			JellyfinAPIKey:  cfg.JellyfinAPIKey,
			JellyfinBaseURL: cfg.JellyfinBaseURL,
		},
	)
	episodeRepo := repository.NewEpisodeRepository(dbPool)
	episodeHandler := handlers.NewEpisodeHandler(episodeRepo)
	fansubRepo := repository.NewFansubRepository(dbPool)
	mediaRepo := repository.NewMediaRepository(dbPool)
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
	authzRepo := repository.NewAuthzRepository(dbPool)
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
		fansubRepo,
		episodeVersionRepo,
		authzRepo,
		cfg.AuthAdminRoleName,
		handlers.AdminContentJellyfinConfig{
			APIKey:     cfg.JellyfinAPIKey,
			BaseURL:    cfg.JellyfinBaseURL,
			StreamPath: cfg.JellyfinStreamPathTemplate,
		},
	)
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
	).WithMedia(mediaRepo, mediaService)
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
	mediaUploadRepo := repository.NewMediaUploadRepository(dbPool)
	mediaUploadHandler := handlers.NewMediaUploadHandler(mediaUploadRepo, cfg.MediaStorageDir, cfg.MediaPublicBaseURL, cfg.FFmpegPath)

	v1 := router.Group("/api/v1")
	v1.POST("/auth/issue", authHandler.Issue)
	v1.POST("/auth/refresh", authHandler.Refresh)
	v1.POST("/auth/revoke", middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo), authHandler.Revoke)
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
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		middleware.CommentCreateRateLimitMiddleware(commentCreateLimiter),
		commentHandler.CreateByAnimeID,
	)
	v1.GET("/watchlist", middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo), watchlistHandler.ListByUser)
	v1.POST("/watchlist", middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo), watchlistHandler.CreateByUser)
	v1.GET(
		"/watchlist/:anime_id",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		watchlistHandler.GetByUserAndAnimeID,
	)
	v1.DELETE(
		"/watchlist/:anime_id",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		watchlistHandler.DeleteByUser,
	)
	v1.GET("/episodes/:id", episodeHandler.GetByID)
	v1.POST(
		"/episodes/:id/play/grant",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		episodePlaybackHandler.CreatePlaybackGrant,
	)
	v1.GET(
		"/episodes/:id/play",
		middleware.CommentAuthOptionalMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
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
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		assetStreamHandler.StreamAsset,
	)
	v1.POST(
		"/releases/:id/grant",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.CreateReleaseStreamGrant,
	)
	v1.GET(
		"/releases/:id/stream",
		middleware.CommentAuthOptionalMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.StreamRelease,
	)
	v1.GET("/releases/:id/assets", releaseAssetsHandler.ListReleaseAssets)
	v1.GET("/releases/:id/images", episodeVersionImagesHandler.ListReleaseImages)
	// TODO: Re-enable auth before production
	v1.POST(
		"/admin/anime",
		// middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.CreateAnime,
	)
	v1.PATCH(
		"/admin/anime/:id",
		// middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.UpdateAnime,
	)
	v1.POST(
		"/admin/anime/:id/jellyfin/sync",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.SyncAnimeFromJellyfin,
	)
	v1.POST(
		"/admin/anime/:id/episodes/:episodeId/sync",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.SyncEpisodeFromJellyfin,
	)
	v1.GET(
		"/admin/jellyfin/series",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.SearchJellyfinSeries,
	)
	v1.POST(
		"/admin/anime/:id/jellyfin/preview",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.PreviewAnimeFromJellyfin,
	)
	v1.GET(
		"/admin/episode-versions/:versionId/editor-context",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.GetEpisodeVersionEditorContext,
	)
	v1.POST(
		"/admin/episode-versions/:versionId/folder-scan",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.ScanEpisodeVersionFolder,
	)
	v1.POST(
		"/admin/episodes",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.CreateEpisode,
	)
	v1.GET(
		"/admin/genres",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.ListGenreTokens,
	)
	v1.PATCH(
		"/admin/episodes/:id",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.UpdateEpisode,
	)
	v1.DELETE(
		"/admin/episodes/:id",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		adminContentHandler.DeleteEpisode,
	)
	v1.POST(
		"/admin/fansubs/:id/media",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.UploadFansubMedia,
	)
	v1.DELETE(
		"/admin/fansubs/:id/media/:kind",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.DeleteFansubMedia,
	)
	v1.POST(
		"/fansubs",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.CreateFansub,
	)
	v1.PATCH(
		"/fansubs/:id",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.UpdateFansub,
	)
	v1.DELETE(
		"/fansubs/:id",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.DeleteFansub,
	)
	v1.POST(
		"/fansubs/:id/aliases",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.CreateFansubAlias,
	)
	v1.DELETE(
		"/fansubs/:id/aliases/:aliasId",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.DeleteFansubAlias,
	)
	v1.POST(
		"/fansubs/:id/members",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.CreateFansubMember,
	)
	v1.PATCH(
		"/fansubs/:id/members/:memberId",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.UpdateFansubMember,
	)
	v1.DELETE(
		"/fansubs/:id/members/:memberId",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.DeleteFansubMember,
	)
	v1.POST(
		"/anime/:id/fansubs/:fansubId",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.AttachAnimeFansub,
	)
	v1.DELETE(
		"/anime/:id/fansubs/:fansubId",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.DetachAnimeFansub,
	)
	v1.POST(
		"/anime/:id/episodes/:episodeNumber/versions",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.CreateEpisodeVersion,
	)
	v1.PATCH(
		"/episode-versions/:versionId",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.UpdateEpisodeVersion,
	)
	v1.DELETE(
		"/episode-versions/:versionId",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.DeleteEpisodeVersion,
	)
	// Fansub merge and collaboration endpoints
	v1.POST(
		"/admin/fansubs/merge",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.MergeFansubs,
	)
	v1.POST(
		"/admin/fansubs/merge/preview",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.MergeFansubsPreview,
	)
	v1.GET("/fansubs/:id/collaboration-members", fansubHandler.ListCollaborationMembers)
	v1.POST(
		"/fansubs/:id/collaboration-members",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.AddCollaborationMember,
	)
	v1.DELETE(
		"/fansubs/:id/collaboration-members/:memberGroupId",
		middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo),
		fansubHandler.RemoveCollaborationMember,
	)
	// Media upload endpoints (auth disabled for testing)
	// TODO: Re-enable auth before production: middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo)
	v1.POST(
		"/admin/upload",
		mediaUploadHandler.Upload,
	)
	v1.DELETE(
		"/admin/media/:id",
		mediaUploadHandler.Delete,
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

func resolveReleaseGrantSecret(cfg config.Config) string {
	secret := strings.TrimSpace(cfg.ReleaseStreamGrantSecret)
	if secret != "" {
		return secret
	}

	return strings.TrimSpace(cfg.AuthTokenSecret)
}

func resolveAdminBootstrapUserIDs(cfg config.Config) []int64 {
	return cfg.AuthAdminBootstrapUserIDs
}

func bootstrapAdminRoleAssignments(
	ctx context.Context,
	authzRepo *repository.AuthzRepository,
	roleName string,
	userIDs []int64,
) error {
	if authzRepo == nil {
		return nil
	}

	trimmedRoleName := strings.TrimSpace(roleName)
	if trimmedRoleName == "" {
		trimmedRoleName = "admin"
	}

	if len(userIDs) == 0 {
		return nil
	}

	if _, err := authzRepo.EnsureRole(ctx, trimmedRoleName); err != nil {
		return err
	}

	for _, userID := range userIDs {
		if userID <= 0 {
			continue
		}
		if err := authzRepo.AssignRole(ctx, userID, trimmedRoleName); err != nil {
			return err
		}
	}

	return nil
}

func isUndefinedTableError(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code == "42P01"
	}
	return false
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func isLocalDevProfile(profile string) bool {
	switch strings.ToLower(strings.TrimSpace(profile)) {
	case "", "local", "dev", "development", "test":
		return true
	default:
		return false
	}
}

func checkFFmpegAvailability(ffmpegPath string) error {
	cmd := exec.Command(ffmpegPath, "-version")
	return cmd.Run()
}
