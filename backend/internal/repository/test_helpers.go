package repository

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

var testCtx = context.Background()

// setupTestRepo creates a test repository with a mock db pool.
// NOTE: This is a placeholder. Real integration tests would need a test database.
func setupTestRepo(t *testing.T) *GroupRepository {
	t.Skip("Integration tests require test database setup")
	return nil
}

// createTestAnime creates a test anime record and returns its ID.
// NOTE: This is a placeholder. Real integration tests would need a test database.
func createTestAnime(t *testing.T, db *pgxpool.Pool) int64 {
	t.Skip("Integration tests require test database setup")
	return 0
}
