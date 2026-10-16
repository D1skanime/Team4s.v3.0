package migrations

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
)

var migrationFilePattern = regexp.MustCompile(`^(\d+)_([a-zA-Z0-9_]+)\.(up|down)\.sql$`)

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
