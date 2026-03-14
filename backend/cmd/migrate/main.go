package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"team4s.v3/backend/internal/config"
	"team4s.v3/backend/internal/database"
	"team4s.v3/backend/internal/migrations"
	"team4s.v3/backend/internal/repository"
	"team4s.v3/backend/internal/services"
)

func main() {
	if len(os.Args) < 2 {
		printUsageAndExit(1)
	}

	command := os.Args[1]
	switch command {
	case "up":
		runUp(os.Args[2:])
	case "down":
		runDown(os.Args[2:])
	case "status":
		runStatus(os.Args[2:])
	case "backfill-phase-a-metadata":
		runBackfillPhaseAMetadata(os.Args[2:])
	default:
		log.Printf("unknown command: %s", command)
		printUsageAndExit(1)
	}
}

func runUp(args []string) {
	fs := flag.NewFlagSet("up", flag.ExitOnError)
	migrationsDir := fs.String("dir", "", "Path to migrations directory")
	databaseURL := fs.String("database-url", os.Getenv("DATABASE_URL"), "PostgreSQL connection URL")
	_ = fs.Parse(args)

	runner, cleanup := setupRunner(*databaseURL, *migrationsDir)
	defer cleanup()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	applied, err := runner.Up(ctx)
	if err != nil {
		log.Fatalf("apply migrations failed: %v", err)
	}

	log.Printf("migrations applied: %d", applied)
}

func runDown(args []string) {
	fs := flag.NewFlagSet("down", flag.ExitOnError)
	migrationsDir := fs.String("dir", "", "Path to migrations directory")
	databaseURL := fs.String("database-url", os.Getenv("DATABASE_URL"), "PostgreSQL connection URL")
	steps := fs.Int("steps", 1, "Number of migrations to rollback")
	_ = fs.Parse(args)

	runner, cleanup := setupRunner(*databaseURL, *migrationsDir)
	defer cleanup()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	rolledBack, err := runner.Down(ctx, *steps)
	if err != nil {
		log.Fatalf("rollback failed: %v", err)
	}

	log.Printf("migrations rolled back: %d", rolledBack)
}

func runStatus(args []string) {
	fs := flag.NewFlagSet("status", flag.ExitOnError)
	migrationsDir := fs.String("dir", "", "Path to migrations directory")
	databaseURL := fs.String("database-url", os.Getenv("DATABASE_URL"), "PostgreSQL connection URL")
	_ = fs.Parse(args)

	runner, cleanup := setupRunner(*databaseURL, *migrationsDir)
	defer cleanup()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	status, err := runner.Status(ctx)
	if err != nil {
		log.Fatalf("status failed: %v", err)
	}

	fmt.Println("VERSION\tSTATUS\tNAME")
	for _, item := range status.Items {
		state := "pending"
		if item.Applied {
			state = "applied"
		}
		fmt.Printf("%d\t%s\t%s\n", item.Version, state, item.Name)
	}
	fmt.Printf("\nApplied: %d, Pending: %d\n", status.AppliedCount, status.PendingCount)
	if len(status.MissingLocals) > 0 {
		fmt.Printf("Warning: %d versions are applied in DB but missing locally: %v\n", len(status.MissingLocals), status.MissingLocals)
	}
}

func runBackfillPhaseAMetadata(args []string) {
	fs := flag.NewFlagSet("backfill-phase-a-metadata", flag.ExitOnError)
	databaseURL := fs.String("database-url", os.Getenv("DATABASE_URL"), "PostgreSQL connection URL")
	_ = fs.Parse(args)

	cfg := config.Load()
	if *databaseURL == "" {
		*databaseURL = cfg.DatabaseURL
	}
	if *databaseURL == "" {
		log.Fatal("DATABASE_URL is required. Set env var or pass -database-url.")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	dbPool, err := database.NewPool(ctx, *databaseURL)
	if err != nil {
		log.Fatalf("database init failed: %v", err)
	}
	defer dbPool.Close()

	repo := repository.NewAnimeMetadataRepository(dbPool)
	service := services.NewAnimeMetadataBackfillService(repo)

	report, err := service.Backfill(ctx)
	if err != nil {
		log.Fatalf("phase A metadata backfill failed: %v", err)
	}

	log.Printf("phase A metadata backfill complete: anime=%d titles_upserted=%d titles_unchanged=%d genres_created=%d genre_links_created=%d genre_links_skipped=%d errors=%d",
		report.AnimeProcessed,
		report.TitlesUpserted,
		report.TitlesUnchanged,
		report.GenresCreated,
		report.GenreLinksCreated,
		report.GenreLinksSkipped,
		len(report.Errors),
	)

	for _, item := range report.Errors {
		log.Printf("backfill warning: %s", item)
	}
}

func setupRunner(databaseURL string, migrationsDirFlag string) (*migrations.Runner, func()) {
	cfg := config.Load()
	if databaseURL == "" {
		databaseURL = cfg.DatabaseURL
	}
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required. Set env var or pass -database-url.")
	}

	migrationsDir, err := migrations.ResolveMigrationsDir(migrationsDirFlag)
	if err != nil {
		log.Fatalf("resolve migrations dir failed: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	dbPool, err := database.NewPool(ctx, databaseURL)
	if err != nil {
		log.Fatalf("database init failed: %v", err)
	}

	return migrations.NewRunner(dbPool, migrationsDir), dbPool.Close
}

func printUsageAndExit(code int) {
	fmt.Fprintf(os.Stderr, "Usage:\n")
	fmt.Fprintf(os.Stderr, "  migrate up [-dir path] [-database-url url]\n")
	fmt.Fprintf(os.Stderr, "  migrate down [-steps n] [-dir path] [-database-url url]\n")
	fmt.Fprintf(os.Stderr, "  migrate status [-dir path] [-database-url url]\n")
	fmt.Fprintf(os.Stderr, "  migrate backfill-phase-a-metadata [-database-url url]\n")
	os.Exit(code)
}
