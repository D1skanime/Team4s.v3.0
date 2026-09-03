package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type roleCatalogDB interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

// RoleCatalogRepository owns the public, presentation-only projection of the
// canonical database role catalog.
type RoleCatalogRepository struct {
	db roleCatalogDB
}

func NewRoleCatalogRepository(db roleCatalogDB) *RoleCatalogRepository {
	return &RoleCatalogRepository{db: db}
}

// PublicRoleDefinition contains presentation metadata only. Authorization
// grants, personal overrides, audit history, and IdP global roles deliberately
// have no representation in this DTO.
type PublicRoleDefinition struct {
	Code                     string   `json:"code"`
	LabelDE                  string   `json:"label_de"`
	Contexts                 []string `json:"contexts"`
	SortOrder                int      `json:"sort_order"`
	Assignable               bool     `json:"assignable"`
	ColorKey                 string   `json:"color_key"`
	IconKey                  string   `json:"icon_key"`
	OperativeCapabilityCount int      `json:"operative_capability_count"`
	HasOperativeCapabilities bool     `json:"has_operative_capabilities"`
}

func (r *RoleCatalogRepository) ListPublicRoleDefinitions(ctx context.Context, contextName string) ([]PublicRoleDefinition, error) {
	const query = `
		SELECT
			rd.code,
			rd.label_de,
			rd.contexts,
			rd.sort_order,
			rd.assignable,
			rd.color_key,
			rd.icon_key,
			COUNT(rc.action_code)::integer AS operative_capability_count
		FROM role_definitions rd
		LEFT JOIN role_capabilities rc ON rc.role_code = rd.code
		WHERE $1 = ANY(rd.contexts) AND NOT rd.reserved
		GROUP BY rd.code, rd.label_de, rd.contexts, rd.sort_order, rd.assignable, rd.color_key, rd.icon_key
		ORDER BY rd.sort_order, rd.code
	`

	rows, err := r.db.Query(ctx, query, contextName)
	if err != nil {
		return nil, fmt.Errorf("list public role definitions: query: %w", err)
	}
	defer rows.Close()

	definitions := make([]PublicRoleDefinition, 0)
	for rows.Next() {
		var definition PublicRoleDefinition
		if err := rows.Scan(
			&definition.Code,
			&definition.LabelDE,
			&definition.Contexts,
			&definition.SortOrder,
			&definition.Assignable,
			&definition.ColorKey,
			&definition.IconKey,
			&definition.OperativeCapabilityCount,
		); err != nil {
			return nil, fmt.Errorf("list public role definitions: scan: %w", err)
		}
		definition.HasOperativeCapabilities = definition.OperativeCapabilityCount > 0
		definitions = append(definitions, definition)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("list public role definitions: iterate: %w", err)
	}

	return definitions, nil
}
