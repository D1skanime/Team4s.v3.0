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

	"team4s.v3/backend/internal/config"
	"team4s.v3/backend/internal/database"
	"team4s.v3/backend/internal/handlers"
	"team4s.v3/backend/internal/middleware"
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
	middleware.ConfigureLocalAuthBypass(cfg.AuthBypassLocal, cfg.AuthIssueDevUserID, strings.TrimSpace(cfg.AuthIssueDevDisplayName))
	authMiddleware := middleware.CommentAuthMiddlewareWithState(cfg.AuthTokenSecret, authRepo)
	authOptionalMiddleware := middleware.CommentAuthOptionalMiddlewareWithState(cfg.AuthTokenSecret, authRepo)
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
	v1.POST("/auth/revoke", authMiddleware, authHandler.Revoke)
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
	registerAdminRoutes(v1, authMiddleware, adminRouteHandlers{
		adminContentHandler: adminContentHandler,
		fansubHandler:       fansubHandler,
		mediaUploadHandler:  mediaUploadHandler,
	})
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
