package main

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/D1skanime/Team4s.v3.0/backend/internal/database"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/handlers"
	"github.com/D1skanime/Team4s.v3.0/backend/internal/repository"
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

	// Initialize repositories and handlers
	animeRepo := repository.NewAnimeRepository(db.Pool)
	animeHandler := handlers.NewAnimeHandler(animeRepo)

	episodeRepo := repository.NewEpisodeRepository(db.Pool)
	episodeHandler := handlers.NewEpisodeHandler(episodeRepo)

	ratingRepo := repository.NewRatingRepository(db.Pool)
	ratingHandler := handlers.NewRatingHandler(ratingRepo)

	// Set Gin mode
	mode := os.Getenv("GIN_MODE")
	if mode == "" {
		mode = gin.DebugMode
	}
	gin.SetMode(mode)

	// Create router
	r := gin.Default()

	// Health check with database status
	r.GET("/health", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		dbStatus := "ok"
		if err := db.Ping(ctx); err != nil {
			dbStatus = "error: " + err.Error()
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
		})
	})

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Anime routes
		v1.GET("/anime", animeHandler.List)
		v1.GET("/anime/search", animeHandler.Search)
		v1.GET("/anime/:id", animeHandler.GetByID)
		v1.GET("/anime/:id/episodes", episodeHandler.ListByAnime)
		v1.GET("/anime/:id/relations", animeHandler.GetRelations)
		v1.GET("/anime/:id/rating", ratingHandler.GetAnimeRating)

		// Episode routes
		v1.GET("/episodes/:id", episodeHandler.GetByID)

		// Auth routes (placeholder)
		v1.POST("/auth/login", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "Login - TODO"})
		})
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
