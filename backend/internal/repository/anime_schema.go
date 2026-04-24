package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
)

type animeSchemaQuerier interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}

type animeV2SchemaInfo struct {
	HasSlug        bool
	HasContentType bool
	HasStatus      bool
	HasMaxEpisodes bool
	HasSource      bool
	HasFolderName  bool
	HasCoverImage  bool
}

func loadAnimeV2SchemaInfo(ctx context.Context, db animeSchemaQuerier) (animeV2SchemaInfo, error) {
	rows, err := db.Query(
		ctx,
		`
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = current_schema()
		  AND table_name = 'anime'
		`,
	)
	if err != nil {
		return animeV2SchemaInfo{}, fmt.Errorf("detect anime schema columns: %w", err)
	}
	defer rows.Close()

	var info animeV2SchemaInfo
	for rows.Next() {
		var columnName string
		if err := rows.Scan(&columnName); err != nil {
			return animeV2SchemaInfo{}, fmt.Errorf("scan anime schema column: %w", err)
		}

		switch columnName {
		case "slug":
			info.HasSlug = true
		case "content_type":
			info.HasContentType = true
		case "status":
			info.HasStatus = true
		case "max_episodes":
			info.HasMaxEpisodes = true
		case "source":
			info.HasSource = true
		case "folder_name":
			info.HasFolderName = true
		case "cover_image":
			info.HasCoverImage = true
		}
	}
	if err := rows.Err(); err != nil {
		return animeV2SchemaInfo{}, fmt.Errorf("iterate anime schema columns: %w", err)
	}

	return info, nil
}
