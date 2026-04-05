package repository

import (
	"context"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AssetLifecycleRepository struct {
	db *pgxpool.Pool
}

func NewAssetLifecycleRepository(db *pgxpool.Pool) *AssetLifecycleRepository {
	return &AssetLifecycleRepository{db: db}
}

func normalizeAssetLifecycleEntityType(entityType string) string {
	return strings.TrimSpace(strings.ToLower(entityType))
}

func buildLookupAssetLifecycleSubjectQuery(entityType string) (string, bool) {
	switch normalizeAssetLifecycleEntityType(entityType) {
	case "anime":
		return `SELECT id FROM anime WHERE id = $1`, true
	default:
		return "", false
	}
}

func (r *AssetLifecycleRepository) LookupAssetLifecycleSubject(
	ctx context.Context,
	entityType string,
	entityID int64,
) (*models.AssetLifecycleSubject, error) {
	query, ok := buildLookupAssetLifecycleSubjectQuery(entityType)
	if !ok {
		return nil, ErrNotFound
	}

	var id int64
	if err := r.db.QueryRow(ctx, query, entityID).Scan(&id); err == pgx.ErrNoRows {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("lookup asset lifecycle subject %s/%d: %w", entityType, entityID, err)
	}

	return &models.AssetLifecycleSubject{
		EntityType: normalizeAssetLifecycleEntityType(entityType),
		EntityID:   id,
	}, nil
}
