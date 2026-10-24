package main

import (
	"context"
	"log"
	"net/http"
	"os/exec"

	"team4s.v3/backend/internal/config"
	"team4s.v3/backend/internal/database"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

// infraBootstrap holds the foundational dependencies main() needs for the rest of its
// lifetime: the DB pool and Redis client (whose Close() calls MUST stay deferred in
// main()'s own scope, not inside this helper, or the defer fires too early) and the
// base gin router (logging/recovery/CORS middleware, /health, /media static serving).
type infraBootstrap struct {
	router      *gin.Engine
	dbPool      *pgxpool.Pool
	redisClient *redis.Client
}

// bootstrapInfra constructs the database pool, Redis client, and base gin router, and
// checks ffmpeg/vipsthumbnail availability. Equivalent to main()'s original lines 26-80
// (pre-191-26 split).
func bootstrapInfra(ctx context.Context, cfg config.Config) infraBootstrap {
	dbPool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database init failed: %v", err)
	}
	redisClient, err := database.NewRedisClient(ctx, cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Fatalf("redis init failed: %v", err)
	}

	// Check FFmpeg availability for video processing
	if err := checkFFmpegAvailability(cfg.FFmpegPath); err != nil {
		log.Printf("warning: ffmpeg not available at %s: %v (video upload will be disabled)", cfg.FFmpegPath, err)
	} else {
		log.Printf("ffmpeg available at %s", cfg.FFmpegPath)
	}

	// Check vipsthumbnail availability (D-21: animated WebP/GIF "display" variants that keep
	// every frame). Non-fatal -- display generation degrades to the unchanged original on
	// failure/absence, same posture as the ffmpeg check above.
	if err := exec.Command(cfg.VipsThumbnailPath, "--version").Run(); err != nil {
		log.Printf("warning: vipsthumbnail not available at %s: %v (animated display variants will fall back to the original)", cfg.VipsThumbnailPath, err)
	} else {
		log.Printf("vipsthumbnail available at %s", cfg.VipsThumbnailPath)
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

	return infraBootstrap{router: router, dbPool: dbPool, redisClient: redisClient}
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
