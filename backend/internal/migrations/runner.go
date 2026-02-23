package migrations

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var migrationFilePattern = regexp.MustCompile(`^(\d+)_([a-zA-Z0-9_]+)\.(up|down)\.sql$`)

type Migration struct {
	Version  int64
	Name     string
	UpPath   string
	DownPath string
}

type StatusItem struct {
	Version int64
	Name    string
	Applied bool
}

type Status struct {
	Items         []StatusItem
	AppliedCount  int
	PendingCount  int
	MissingLocals []int64
}

type Runner struct {
	db            *pgxpool.Pool
	migrationsDir string
}

func NewRunner(db *pgxpool.Pool, migrationsDir string) *Runner {
	return &Runner{
		db:            db,
		migrationsDir: migrationsDir,
	}
}

func ResolveMigrationsDir(customDir string) (string, error) {
	if customDir != "" {
		return validateMigrationDir(customDir)
	}

	candidates := []string{
		filepath.Join("database", "migrations"),
		filepath.Join("..", "database", "migrations"),
		filepath.Join("..", "..", "database", "migrations"),
		filepath.Join("..", "..", "..", "database", "migrations"),
	}

	for _, candidate := range candidates {
		absPath, err := filepath.Abs(candidate)
		if err != nil {
			continue
		}

		if isDir(absPath) {
			return absPath, nil
		}
	}

	return "", errors.New("could not locate migrations directory; pass -dir explicitly")
}

func (r *Runner) EnsureTrackingTable(ctx context.Context) error {
	const query = `
CREATE TABLE IF NOT EXISTS schema_migrations (
    version BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`

	if _, err := r.db.Exec(ctx, query); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			exists, checkErr := r.trackingTableExists(ctx)
			if checkErr == nil && exists {
				return nil
			}
		}

		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	return nil
}

func (r *Runner) Up(ctx context.Context) (int, error) {
	if err := r.EnsureTrackingTable(ctx); err != nil {
		return 0, err
	}

	allMigrations, err := loadMigrations(r.migrationsDir)
	if err != nil {
		return 0, err
	}

	appliedVersions, err := r.getAppliedVersionSet(ctx)
	if err != nil {
		return 0, err
	}

	applied := 0
	for _, migration := range allMigrations {
		if appliedVersions[migration.Version] {
			continue
		}

		if migration.UpPath == "" {
			return applied, fmt.Errorf("missing up migration for version %d", migration.Version)
		}

		if err := r.applyUp(ctx, migration); err != nil {
			return applied, err
		}

		applied++
	}

	return applied, nil
}

func (r *Runner) Down(ctx context.Context, steps int) (int, error) {
	if steps <= 0 {
		return 0, fmt.Errorf("steps must be > 0")
	}

	if err := r.EnsureTrackingTable(ctx); err != nil {
		return 0, err
	}

	allMigrations, err := loadMigrations(r.migrationsDir)
	if err != nil {
		return 0, err
	}

	byVersion := make(map[int64]Migration, len(allMigrations))
	for _, migration := range allMigrations {
		byVersion[migration.Version] = migration
	}

	appliedVersions, err := r.getAppliedVersionsDesc(ctx)
	if err != nil {
		return 0, err
	}

	if len(appliedVersions) == 0 {
		return 0, nil
	}

	if steps > len(appliedVersions) {
		steps = len(appliedVersions)
	}

	rolledBack := 0
	for i := 0; i < steps; i++ {
		version := appliedVersions[i]
		migration, ok := byVersion[version]
		if !ok {
			return rolledBack, fmt.Errorf("migration version %d is recorded in DB but missing locally", version)
		}

		if migration.DownPath == "" {
			return rolledBack, fmt.Errorf("missing down migration for version %d", migration.Version)
		}

		if err := r.applyDown(ctx, migration); err != nil {
			return rolledBack, err
		}

		rolledBack++
	}

	return rolledBack, nil
}

func (r *Runner) Status(ctx context.Context) (Status, error) {
	if err := r.EnsureTrackingTable(ctx); err != nil {
		return Status{}, err
	}

	allMigrations, err := loadMigrations(r.migrationsDir)
	if err != nil {
		return Status{}, err
	}

	appliedSet, err := r.getAppliedVersionSet(ctx)
	if err != nil {
		return Status{}, err
	}

	appliedVersions, err := r.getAppliedVersionsAsc(ctx)
	if err != nil {
		return Status{}, err
	}

	statusItems := make([]StatusItem, 0, len(allMigrations))
	pending := 0
	for _, migration := range allMigrations {
		isApplied := appliedSet[migration.Version]
		if !isApplied {
			pending++
		}

		statusItems = append(statusItems, StatusItem{
			Version: migration.Version,
			Name:    migration.Name,
			Applied: isApplied,
		})
	}

	missingLocal := make([]int64, 0)
	knownVersions := make(map[int64]struct{}, len(allMigrations))
	for _, migration := range allMigrations {
		knownVersions[migration.Version] = struct{}{}
	}

	for _, version := range appliedVersions {
		if _, ok := knownVersions[version]; !ok {
			missingLocal = append(missingLocal, version)
		}
	}

	return Status{
		Items:         statusItems,
		AppliedCount:  len(appliedSet),
		PendingCount:  pending,
		MissingLocals: missingLocal,
	}, nil
}

func (r *Runner) applyUp(ctx context.Context, migration Migration) error {
	sqlBytes, err := os.ReadFile(migration.UpPath)
	if err != nil {
		return fmt.Errorf("read up migration %s: %w", migration.UpPath, err)
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx for migration %d: %w", migration.Version, err)
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
		return fmt.Errorf("execute up migration %d (%s): %w", migration.Version, migration.Name, err)
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO schema_migrations(version, name) VALUES ($1, $2)`,
		migration.Version,
		migration.Name,
	); err != nil {
		return fmt.Errorf("record migration %d: %w", migration.Version, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit migration %d: %w", migration.Version, err)
	}

	return nil
}

func (r *Runner) applyDown(ctx context.Context, migration Migration) error {
	sqlBytes, err := os.ReadFile(migration.DownPath)
	if err != nil {
		return fmt.Errorf("read down migration %s: %w", migration.DownPath, err)
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx for rollback %d: %w", migration.Version, err)
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
		return fmt.Errorf("execute down migration %d (%s): %w", migration.Version, migration.Name, err)
	}

	if _, err := tx.Exec(
		ctx,
		`DELETE FROM schema_migrations WHERE version = $1`,
		migration.Version,
	); err != nil {
		return fmt.Errorf("remove migration record %d: %w", migration.Version, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit rollback %d: %w", migration.Version, err)
	}

	return nil
}

func (r *Runner) getAppliedVersionSet(ctx context.Context) (map[int64]bool, error) {
	versions, err := r.getAppliedVersionsAsc(ctx)
	if err != nil {
		return nil, err
	}

	out := make(map[int64]bool, len(versions))
	for _, version := range versions {
		out[version] = true
	}

	return out, nil
}

func (r *Runner) getAppliedVersionsAsc(ctx context.Context) ([]int64, error) {
	rows, err := r.db.Query(ctx, `SELECT version FROM schema_migrations ORDER BY version ASC`)
	if err != nil {
		return nil, fmt.Errorf("query applied migrations: %w", err)
	}
	defer rows.Close()

	versions := make([]int64, 0)
	for rows.Next() {
		var version int64
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("scan applied migration version: %w", err)
		}

		versions = append(versions, version)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate applied migration versions: %w", err)
	}

	return versions, nil
}

func (r *Runner) getAppliedVersionsDesc(ctx context.Context) ([]int64, error) {
	rows, err := r.db.Query(ctx, `SELECT version FROM schema_migrations ORDER BY version DESC`)
	if err != nil {
		return nil, fmt.Errorf("query applied migrations desc: %w", err)
	}
	defer rows.Close()

	versions := make([]int64, 0)
	for rows.Next() {
		var version int64
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("scan applied migration version desc: %w", err)
		}

		versions = append(versions, version)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate applied migration versions desc: %w", err)
	}

	return versions, nil
}

func loadMigrations(migrationsDir string) ([]Migration, error) {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir %s: %w", migrationsDir, err)
	}

	byVersion := make(map[int64]Migration)
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		version, name, direction, ok := parseMigrationFilename(entry.Name())
		if !ok {
			continue
		}

		fullPath := filepath.Join(migrationsDir, entry.Name())
		existing := byVersion[version]
		if existing.Version == 0 {
			existing.Version = version
			existing.Name = name
		}

		if existing.Name != name {
			return nil, fmt.Errorf("conflicting names for version %d: %s and %s", version, existing.Name, name)
		}

		if direction == "up" {
			existing.UpPath = fullPath
		} else {
			existing.DownPath = fullPath
		}

		byVersion[version] = existing
	}

	migrations := make([]Migration, 0, len(byVersion))
	for _, migration := range byVersion {
		migrations = append(migrations, migration)
	}

	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})

	return migrations, nil
}

func parseMigrationFilename(fileName string) (int64, string, string, bool) {
	matches := migrationFilePattern.FindStringSubmatch(fileName)
	if len(matches) != 4 {
		return 0, "", "", false
	}

	version, err := strconv.ParseInt(matches[1], 10, 64)
	if err != nil || version <= 0 {
		return 0, "", "", false
	}

	name := matches[2]
	direction := matches[3]

	return version, name, direction, true
}

func validateMigrationDir(path string) (string, error) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("resolve migrations dir path %s: %w", path, err)
	}

	if !isDir(absPath) {
		return "", fmt.Errorf("migrations dir not found: %s", absPath)
	}

	return absPath, nil
}

func isDir(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}

	return info.IsDir()
}

func (r *Runner) trackingTableExists(ctx context.Context) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT to_regclass('public.schema_migrations') IS NOT NULL`).Scan(&exists); err != nil {
		return false, fmt.Errorf("check schema_migrations existence: %w", err)
	}

	return exists, nil
}
