package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file (optional in production)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Set Gin mode
	mode := os.Getenv("GIN_MODE")
	if mode == "" {
		mode = gin.DebugMode
	}
	gin.SetMode(mode)

	// Create router
	r := gin.Default()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "team4s-api",
		})
	})

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Anime routes (placeholder)
		v1.GET("/anime", func(c *gin.Context) {
			c.JSON(200, gin.H{"message": "Anime list - TODO"})
		})
		v1.GET("/anime/:id", func(c *gin.Context) {
			id := c.Param("id")
			c.JSON(200, gin.H{"message": "Anime detail", "id": id})
		})

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
