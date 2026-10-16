package migrations

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

func ResolveMigrationsDir(customDir string) (string, error) {
	if customDir != "" {
		return validateMigrationDir(customDir)
	}

	candidates := []string{
		filepath.Join("..", "..", "..", "database", "migrations"),
		filepath.Join("..", "..", "database", "migrations"),
		filepath.Join("..", "database", "migrations"),
		filepath.Join("database", "migrations"),
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
