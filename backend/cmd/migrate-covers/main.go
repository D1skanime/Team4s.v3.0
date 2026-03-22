package main

import (
	"context"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/disintegration/imaging"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Config holds migration configuration
type Config struct {
	DBConnString    string
	CoverSourceDir  string
	MediaTargetDir  string
	ThumbWidth      int
	DryRun          bool
	SkipExisting    bool
}

// MigrationStats tracks migration progress
type MigrationStats struct {
	TotalFiles    int
	ProcessedOK   int
	Skipped       int
	Failed        int
	NoAnimeMatch  int
}

// CoverMapping represents anime ID to cover file mapping
type CoverMapping struct {
	AnimeID    int64
	CoverFile  string
	Title      string
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Parse config from environment or defaults
	config := Config{
		DBConnString:   getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/team4s?sslmode=disable"),
		CoverSourceDir: getEnv("COVER_SOURCE_DIR", "frontend/public/covers"),
		MediaTargetDir: getEnv("MEDIA_TARGET_DIR", "media"),
		ThumbWidth:     300,
		DryRun:         getEnvBool("DRY_RUN", false),
		SkipExisting:   getEnvBool("SKIP_EXISTING", true),
	}

	if config.DryRun {
		log.Println("========================================")
		log.Println("DRY RUN MODE - No changes will be made")
		log.Println("========================================")
	}

	// Connect to database
	ctx := context.Background()
	dbpool, err := pgxpool.New(ctx, config.DBConnString)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()

	log.Println("Connected to database")

	// Run migration
	stats, err := runMigration(ctx, dbpool, config)
	if err != nil {
		log.Fatalf("Migration failed: %v\n", err)
	}

	// Print summary
	log.Println("\n========================================")
	log.Println("Migration Summary")
	log.Println("========================================")
	log.Printf("Total files found:   %d\n", stats.TotalFiles)
	log.Printf("Successfully processed: %d\n", stats.ProcessedOK)
	log.Printf("Skipped (existing):  %d\n", stats.Skipped)
	log.Printf("No anime match:      %d\n", stats.NoAnimeMatch)
	log.Printf("Failed:              %d\n", stats.Failed)
	log.Println("========================================")

	if config.DryRun {
		log.Println("\nDRY RUN completed - no actual changes made")
		log.Println("Run without DRY_RUN=true to perform migration")
	}
}

// runMigration executes the cover migration
func runMigration(ctx context.Context, db *pgxpool.Pool, config Config) (*MigrationStats, error) {
	stats := &MigrationStats{}

	// Step 1: Build cover inventory
	log.Println("\nStep 1: Building cover inventory...")
	coverFiles, err := buildCoverInventory(config.CoverSourceDir)
	if err != nil {
		return nil, fmt.Errorf("build inventory: %w", err)
	}
	stats.TotalFiles = len(coverFiles)
	log.Printf("Found %d cover files in %s\n", stats.TotalFiles, config.CoverSourceDir)

	// Step 2: Build anime to cover mapping from database
	log.Println("\nStep 2: Mapping covers to anime IDs...")
	mappings, err := buildAnimeCoverMappings(ctx, db, coverFiles)
	if err != nil {
		return nil, fmt.Errorf("build mappings: %w", err)
	}
	log.Printf("Found %d anime with cover mappings\n", len(mappings))

	// Step 3: Migrate each cover
	log.Println("\nStep 3: Migrating covers...")
	for _, mapping := range mappings {
		if err := migrateCover(ctx, db, config, mapping); err != nil {
			log.Printf("ERROR migrating cover for anime %d (%s): %v\n",
				mapping.AnimeID, mapping.CoverFile, err)
			stats.Failed++
		} else {
			stats.ProcessedOK++
			log.Printf("OK: Anime %d - %s\n", mapping.AnimeID, mapping.Title)
		}
	}

	stats.NoAnimeMatch = stats.TotalFiles - len(mappings)

	return stats, nil
}

// buildCoverInventory scans the cover directory and returns all cover files
func buildCoverInventory(coverDir string) ([]string, error) {
	var files []string

	entries, err := os.ReadDir(coverDir)
	if err != nil {
		return nil, fmt.Errorf("read directory: %w", err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		// Only process image files
		ext := strings.ToLower(filepath.Ext(name))
		if ext == ".jpg" || ext == ".jpeg" || ext == ".png" || ext == ".webp" || ext == ".gif" {
			files = append(files, name)
		}
	}

	return files, nil
}

// buildAnimeCoverMappings creates mappings from anime IDs to cover files
func buildAnimeCoverMappings(ctx context.Context, db *pgxpool.Pool, coverFiles []string) ([]CoverMapping, error) {
	// Query all anime with cover_image set
	query := `
		SELECT id, title, cover_image
		FROM anime
		WHERE cover_image IS NOT NULL AND cover_image != ''
		ORDER BY id
	`

	rows, err := db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query anime: %w", err)
	}
	defer rows.Close()

	var mappings []CoverMapping
	for rows.Next() {
		var mapping CoverMapping
		if err := rows.Scan(&mapping.AnimeID, &mapping.Title, &mapping.CoverFile); err != nil {
			return nil, fmt.Errorf("scan row: %w", err)
		}
		mappings = append(mappings, mapping)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rows: %w", err)
	}

	return mappings, nil
}

// migrateCover migrates a single cover to the new media system
func migrateCover(ctx context.Context, db *pgxpool.Pool, config Config, mapping CoverMapping) error {
	// Check if already migrated
	if config.SkipExisting {
		var existingCount int
		err := db.QueryRow(ctx,
			"SELECT COUNT(*) FROM anime_media WHERE anime_id = $1",
			mapping.AnimeID,
		).Scan(&existingCount)
		if err == nil && existingCount > 0 {
			log.Printf("SKIP: Anime %d already has media entries\n", mapping.AnimeID)
			return nil
		}
	}

	// Build source path
	sourcePath := filepath.Join(config.CoverSourceDir, mapping.CoverFile)

	// Check if source file exists
	if _, err := os.Stat(sourcePath); os.IsNotExist(err) {
		return fmt.Errorf("source file not found: %s", sourcePath)
	}

	// Generate UUID for media asset
	mediaID := uuid.New().String()

	// Create target directory structure
	targetDir := filepath.Join(
		config.MediaTargetDir,
		"anime",
		fmt.Sprintf("%d", mapping.AnimeID),
		"poster",
		mediaID,
	)

	if !config.DryRun {
		if err := os.MkdirAll(targetDir, 0755); err != nil {
			return fmt.Errorf("create target directory: %w", err)
		}
	}

	// Open and decode source image
	img, format, err := openImage(sourcePath)
	if err != nil {
		return fmt.Errorf("open image: %w", err)
	}

	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	// Determine original file extension and MIME type
	sourceExt := strings.ToLower(filepath.Ext(mapping.CoverFile))
	var mimeType string
	switch sourceExt {
	case ".jpg", ".jpeg":
		mimeType = "image/jpeg"
	case ".png":
		mimeType = "image/png"
	case ".webp":
		mimeType = "image/webp"
	case ".gif":
		mimeType = "image/gif"
	default:
		mimeType = "image/jpeg" // fallback
	}

	// Keep original format - just copy the file
	originalFilename := "original" + sourceExt
	originalPath := filepath.Join(targetDir, originalFilename)
	originalRelPath := fmt.Sprintf("/media/anime/%d/poster/%s/%s",
		mapping.AnimeID, mediaID, originalFilename)

	var originalSize int64
	if !config.DryRun {
		// Copy original file without conversion
		srcFile, err := os.Open(sourcePath)
		if err != nil {
			return fmt.Errorf("open source file: %w", err)
		}
		defer srcFile.Close()

		dstFile, err := os.Create(originalPath)
		if err != nil {
			return fmt.Errorf("create destination file: %w", err)
		}
		defer dstFile.Close()

		written, err := dstFile.ReadFrom(srcFile)
		if err != nil {
			return fmt.Errorf("copy file: %w", err)
		}
		originalSize = written
	}

	// Generate thumbnail as JPEG
	thumbFilename := "thumb.jpg"
	thumbPath := filepath.Join(targetDir, thumbFilename)
	thumbRelPath := fmt.Sprintf("/media/anime/%d/poster/%s/%s",
		mapping.AnimeID, mediaID, thumbFilename)

	thumb := imaging.Resize(img, config.ThumbWidth, 0, imaging.Lanczos)
	thumbBounds := thumb.Bounds()
	thumbWidth := thumbBounds.Dx()
	thumbHeight := thumbBounds.Dy()

	var thumbSize int64
	if !config.DryRun {
		// Save thumbnail as JPEG with quality 85
		if err := imaging.Save(thumb, thumbPath, imaging.JPEGQuality(85)); err != nil {
			return fmt.Errorf("save thumbnail: %w", err)
		}

		info, _ := os.Stat(thumbPath)
		if info != nil {
			thumbSize = info.Size()
		}
	}

	// Create database records
	if !config.DryRun {
		// Insert media_assets - uses SERIAL id, media_type_id=1 (poster)
		var dbMediaID int64
		err = db.QueryRow(ctx, `
			INSERT INTO media_assets (media_type_id, file_path, mime_type, format, created_at)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`, 1, originalRelPath, mimeType, "image", time.Now()).Scan(&dbMediaID)
		if err != nil {
			return fmt.Errorf("insert media_assets: %w", err)
		}

		// Insert media_files (original)
		_, err = db.Exec(ctx, `
			INSERT INTO media_files (media_id, variant, path, width, height, size)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, dbMediaID, "original", originalRelPath, originalWidth, originalHeight, originalSize)
		if err != nil {
			return fmt.Errorf("insert media_files (original): %w", err)
		}

		// Insert media_files (thumb)
		_, err = db.Exec(ctx, `
			INSERT INTO media_files (media_id, variant, path, width, height, size)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, dbMediaID, "thumb", thumbRelPath, thumbWidth, thumbHeight, thumbSize)
		if err != nil {
			return fmt.Errorf("insert media_files (thumb): %w", err)
		}

		// Insert anime_media join
		_, err = db.Exec(ctx, `
			INSERT INTO anime_media (anime_id, media_id, sort_order)
			VALUES ($1, $2, $3)
		`, mapping.AnimeID, dbMediaID, 0)
		if err != nil {
			return fmt.Errorf("insert anime_media: %w", err)
		}
	}

	log.Printf("  -> %s (original: %dx%d, thumb: %dx%d)\n",
		format, originalWidth, originalHeight, thumbWidth, thumbHeight)

	return nil
}

// openImage opens and decodes an image file
func openImage(path string) (image.Image, string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, "", err
	}
	defer file.Close()

	img, format, err := image.Decode(file)
	if err != nil {
		return nil, "", err
	}

	return img, format, nil
}

// getEnv returns environment variable or default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvBool returns environment variable as bool or default value
func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		return value == "true" || value == "1" || value == "yes"
	}
	return defaultValue
}
