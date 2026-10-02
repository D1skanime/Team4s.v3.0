// Command migrate-display-backfill is the Phase 173 D-07/D-15/D-17 one-off backfill: it brings
// every pre-existing image asset up to the new "display"-variant contract this phase introduced
// (173-01..173-06), and migrates pre-existing flat-stored fansub logo/banner/group-media files
// into the /media/fansub/<group_id>/... namespace (D-09/D-17).
//
// Three idempotent, resumable phases run in order (see backfill.go/backfill_story_image.go/
// backfill_fansub_namespace.go):
//  1. Generic media_files-table display backfill: every media_asset with an 'original' row but no
//     'display' row gets one, generated via the same shared handlers.GenerateStaticDisplayVariant
//     helper every live write path in this phase already uses (173-02/173-04/173-05).
//  2. Story-image pointer-only backfill (D-15): pre-existing story-image rows (owner_member_id
//     set, no media_files children at all) get a 'display' row pointing at their EXISTING file --
//     no new file is written, since a true original never existed for them.
//  3. Fansub namespace migration (D-09/D-17): pre-existing flat-stored fansub logo/banner/
//     group-media files are physically moved to /media/fansub/<group_id>/... and their stored
//     media_files.path/media_assets.file_path updated to match.
//
// Shape mirrors cmd/migrate-preview-backfill (Phase 172): DRY_RUN env flag, its own pgxpool
// connection, a structured stats summary, and a testable runBackfill function (not hidden inside
// main()) proven against a real Postgres fixture in the *_test.go files in this package.
package main

import (
	"context"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Config holds backfill configuration, read from environment variables -- same env var names
// the running server already uses (DATABASE_URL, MEDIA_STORAGE_DIR, FFMPEG_PATH,
// VIPSTHUMBNAIL_PATH -- see backend/internal/config/config.go), so running this binary inside the
// existing backend container with its existing environment just works.
type Config struct {
	DBConnString      string
	MediaStorageDir   string
	FFmpegPath        string
	VipsThumbnailPath string
	DryRun            bool
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	config := Config{
		DBConnString:      getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/team4s?sslmode=disable"),
		MediaStorageDir:   getEnv("MEDIA_STORAGE_DIR", "./storage/media"),
		FFmpegPath:        getEnv("FFMPEG_PATH", "/usr/bin/ffmpeg"),
		VipsThumbnailPath: getEnv("VIPSTHUMBNAIL_PATH", "/usr/bin/vipsthumbnail"),
		DryRun:            getEnvBool("DRY_RUN", false),
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
