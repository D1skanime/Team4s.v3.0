// Command migrate-preview-backfill is the Phase 172 D-13 one-off backfill: for every
// theme_segment that already has a finished (status='ready') render-cache entry but no
// automatic preview image yet, it extracts a frame at ~35% of the render's duration and
// registers it exactly like the live render-worker/upload-path auto-preview convention
// (Plans 172-03/172-04) -- so e.g. Release 27 (segments 7, 8, 9) get images immediately
// without waiting for a fresh render.
//
// Shape mirrors cmd/migrate-covers/main.go (DRY_RUN env flag, its own pgxpool connection, a
// structured stats summary). Unlike cmd/migrate-covers, the core logic lives in a separate,
// importable runBackfill function in backfill.go -- not hidden inside main() -- so it can be
// proven against a real Postgres fixture in backfill_test.go (closing the exact testability
// gap 172-RESEARCH.md/172-VALIDATION.md flagged in cmd/migrate-covers itself).
package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Config holds backfill configuration, read from environment variables -- same env var
// names the running server/render-worker already use (SEGMENT_RENDER_DIR, MEDIA_STORAGE_DIR,
// FFMPEG_PATH, DATABASE_URL -- see backend/internal/config/config.go), so running this binary
// inside the existing backend container with its existing environment just works, with no
// separate configuration surface to keep in sync.
type Config struct {
	DBConnString     string
	SegmentRenderDir string
	MediaStorageDir  string
	FFmpegPath       string
	DryRun           bool
	// ImageStore ersetzt in Tests den globalen Anime-Upload-Pfad (nil = echter Pfad).
	ImageStore previewImageStore
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	mediaStorageDir := getEnv("MEDIA_STORAGE_DIR", "./storage/media")
	config := Config{
		DBConnString:     getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/team4s?sslmode=disable"),
		SegmentRenderDir: getEnv("SEGMENT_RENDER_DIR", filepath.Join(mediaStorageDir, "derived", "segments")),
		MediaStorageDir:  mediaStorageDir,
		FFmpegPath:       getEnv("FFMPEG_PATH", "/usr/bin/ffmpeg"),
		DryRun:           getEnvBool("DRY_RUN", false),
	}

	if config.DryRun {
		log.Println("========================================")
		log.Println("DRY RUN MODE - No changes will be made")
		log.Println("========================================")
	}

	ctx := context.Background()
	dbpool, err := pgxpool.New(ctx, config.DBConnString)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()

	log.Println("Connected to database")

	stats, err := runBackfill(ctx, dbpool, config)
	if err != nil {
		log.Fatalf("Backfill failed: %v\n", err)
	}

	log.Println("\n========================================")
	log.Println("Backfill Summary")
	log.Println("========================================")
	log.Printf("Total candidates:       %d\n", stats.TotalCandidates)
	log.Printf("Successfully processed: %d\n", stats.ProcessedOK)
	log.Printf("Failed:                 %d\n", stats.Failed)
	log.Println("========================================")

	if config.DryRun {
		log.Println("\nDRY RUN completed - no actual changes made")
		log.Println("Run without DRY_RUN=true to perform the backfill")
	}
}

// getEnv returns environment variable or default value
func getEnv(key, defaultValue string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return defaultValue
}

// getEnvBool returns environment variable as bool or default value
func getEnvBool(key string, defaultValue bool) bool {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value == "true" || value == "1" || value == "yes"
	}
	return defaultValue
}
