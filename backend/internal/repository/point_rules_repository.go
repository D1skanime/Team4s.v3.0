package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// PointRule is one immutable, explicitly versioned catalog entry.
type PointRule struct {
	ID         int64
	Code       string
	Version    int
	Category   string
	PointValue int
	CreatedAt  time.Time
}

type PointRulesRepository struct{ db DBTX }

func NewPointRulesRepository(db DBTX) *PointRulesRepository { return &PointRulesRepository{db: db} }

func (r *PointRulesRepository) WithDB(db DBTX) *PointRulesRepository {
	return NewPointRulesRepository(db)
}

func (r *PointRulesRepository) GetByRef(ctx context.Context, code string, version int) (*PointRule, error) {
	code = strings.TrimSpace(code)
	if r == nil || r.db == nil || code == "" || version <= 0 {
		return nil, fmt.Errorf("get point rule by ref: invalid code or version: %w", ErrValidation)
	}

	var rule PointRule
	err := r.db.QueryRow(ctx, `
		SELECT id, rule_code, rule_version, category, point_value, created_at
		FROM point_rules
		WHERE rule_code = $1 AND rule_version = $2
	`, code, version).Scan(&rule.ID, &rule.Code, &rule.Version, &rule.Category, &rule.PointValue, &rule.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("get point rule %q version %d: %w", code, version, ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get point rule %q version %d: %w", code, version, err)
	}
	return &rule, nil
}
