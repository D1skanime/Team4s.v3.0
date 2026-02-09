package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/database"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/handlers"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/middleware"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file (optional in production)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize database
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	db, err := database.NewPostgresPool(ctx, dbURL)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()
	log.Println("Connected to PostgreSQL database")

	// Initialize Redis
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	redis, err := database.NewRedisClient(ctx, redisURL)
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}
	defer redis.Close()
	log.Println("Connected to Redis")

	// Initialize JWT secret
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	// Initialize services
	tokenConfig := services.DefaultTokenConfig(jwtSecret)
	tokenService := services.NewTokenService(tokenConfig, redis)

	// Initialize repositories
	animeRepo := repository.NewAnimeRepository(db.Pool)
	episodeRepo := repository.NewEpisodeRepository(db.Pool)
	ratingRepo := repository.NewRatingRepository(db.Pool)
	userRepo := repository.NewUserRepository(db.Pool)

	// Initialize auth service
	authService := services.NewAuthService(userRepo, tokenService)

	// Initialize handlers
	animeHandler := handlers.NewAnimeHandler(animeRepo)
	episodeHandler := handlers.NewEpisodeHandler(episodeRepo)
	ratingHandler := handlers.NewRatingHandler(ratingRepo)
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userRepo, authService)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(tokenService)

	// Set Gin mode
	mode := os.Getenv("GIN_MODE")
	if mode == "" {
		mode = gin.DebugMode
	}
	gin.SetMode(mode)

	// Create router
	r := gin.Default()

	// CORS middleware
	r.Use(corsMiddleware())

	// Health check with database and Redis status
	r.GET("/health", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		dbStatus := "ok"
		if err := db.Ping(ctx); err != nil {
			dbStatus = "error: " + err.Error()
		}

		redisStatus := "ok"
		if err := redis.Ping(ctx); err != nil {
			redisStatus = "error: " + err.Error()
		}

		stats := db.Stats()
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "team4s-api",
			"database": gin.H{
				"status":      dbStatus,
				"connections": stats.TotalConns(),
				"idle":        stats.IdleConns(),
				"in_use":      stats.AcquiredConns(),
			},
			"redis": gin.H{
				"status": redisStatus,
			},
		})
	})

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Auth routes (public)
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.Refresh)

			// Protected auth routes
			authProtected := auth.Group("")
			authProtected.Use(authMiddleware.RequireAuth())
			{
				authProtected.POST("/logout", authHandler.Logout)
				authProtected.POST("/logout-all", authHandler.LogoutAll)
				authProtected.GET("/me", authHandler.Me)
			}
		}

		// Anime routes
		v1.GET("/anime", animeHandler.List)
		v1.GET("/anime/search", animeHandler.Search)
		v1.GET("/anime/:id", animeHandler.GetByID)
		v1.GET("/anime/:id/episodes", episodeHandler.ListByAnime)
		v1.GET("/anime/:id/relations", animeHandler.GetRelations)
		v1.GET("/anime/:id/rating", ratingHandler.GetAnimeRating)

		// Episode routes
		v1.GET("/episodes/:id", episodeHandler.GetByID)

		// User routes
		v1.GET("/users/:username", userHandler.GetProfile)

		// Protected user routes
		users := v1.Group("/users")
		users.Use(authMiddleware.RequireAuth())
		{
			users.PUT("/me", userHandler.UpdateProfile)
			users.PUT("/me/password", userHandler.ChangePassword)
			users.DELETE("/me", userHandler.DeleteAccount)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

// corsMiddleware configures CORS for the API
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Allow specific origins in development
		allowedOrigins := map[string]bool{
			"http://localhost:3000": true,
			"http://localhost:3001": true,
			"http://127.0.0.1:3000": true,
			"http://127.0.0.1:3001": true,
		}

		if allowedOrigins[origin] || origin == "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
