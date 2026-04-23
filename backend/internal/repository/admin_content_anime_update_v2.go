package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *AdminContentRepository) updateAnimeV2(
	ctx context.Context,
	tx pgx.Tx,
	id int64,
	input models.AdminAnimePatchInput,
	actorUserID int64,
	schema animeV2SchemaInfo,
) (*models.AdminAnimeItem, error) {
	if err := lockAnimeRow(ctx, tx, id); err != nil {
		return nil, err
	}

	assignments := []string{"modified_at = NOW()"}
	args := make([]any, 0, 8)
	argPos := 1

	modifiedBy, err := resolveExistingUserID(ctx, tx, actorUserID)
	if err != nil {
		return nil, err
	}
	if modifiedBy != nil {
		assignments = append(assignments, fmt.Sprintf("modified_by = $%d", argPos))
		args = append(args, modifiedBy)
		argPos++
	}

	if input.Type.Set {
		animeTypeID, err := resolveAnimeTypeID(ctx, tx, derefString(input.Type.Value))
		if err != nil {
			return nil, err
		}
		assignments = append(assignments, fmt.Sprintf("anime_type_id = $%d", argPos))
		args = append(args, animeTypeID)
		argPos++
	}
	if input.ContentType.Set && schema.HasContentType {
		assignments = append(assignments, fmt.Sprintf("content_type = $%d", argPos))
		args = append(args, input.ContentType.Value)
		argPos++
	}
	if input.Status.Set && schema.HasStatus {
		assignments = append(assignments, fmt.Sprintf("status = $%d", argPos))
		args = append(args, input.Status.Value)
		argPos++
	}
	if input.Year.Set {
		assignments = append(assignments, fmt.Sprintf("year = $%d", argPos))
		args = append(args, input.Year.Value)
		argPos++
	}
	if input.MaxEpisodes.Set && schema.HasMaxEpisodes {
		assignments = append(assignments, fmt.Sprintf("max_episodes = $%d", argPos))
		args = append(args, input.MaxEpisodes.Value)
		argPos++
	}
	if input.Description.Set {
		assignments = append(assignments, fmt.Sprintf("description = $%d", argPos))
		args = append(args, input.Description.Value)
		argPos++
	}
	if input.Source.Set && schema.HasSource {
		assignments = append(assignments, fmt.Sprintf("source = $%d", argPos))
		args = append(args, input.Source.Value)
		argPos++
	}
	if input.FolderName.Set {
		assignments = append(assignments, fmt.Sprintf("folder_name = $%d", argPos))
		args = append(args, input.FolderName.Value)
		argPos++
	}

	if len(assignments) > 1 {
		query := fmt.Sprintf(`
			UPDATE anime
			SET %s
			WHERE id = $%d
		`, strings.Join(assignments, ", "), argPos)
		args = append(args, id)

		tag, err := tx.Exec(ctx, query, args...)
		if err != nil {
			return nil, fmt.Errorf("update anime v2 %d: %w", id, err)
		}
		if tag.RowsAffected() == 0 {
			return nil, ErrNotFound
		}
	}

	if err := syncAuthoritativeAnimeMetadata(ctx, tx, id, buildAuthoritativeAnimeMetadataPatch(input)); err != nil {
		return nil, err
	}

	if input.CoverImage.Set {
		displayTitle, err := loadV2AnimeDisplayTitle(ctx, tx, id, schema)
		if err != nil {
			return nil, err
		}
		if err := applyAnimeCoverPatchV2(ctx, tx, id, input.CoverImage.Value, displayTitle, modifiedBy, schema); err != nil {
			return nil, err
		}
	}

	item, err := loadAdminAnimeItemV2(ctx, tx, id, schema)
	if err != nil {
		return nil, err
	}

	return item, nil
}

func v2AnimeTitleFallbackSQL(schema animeV2SchemaInfo) string {
	if schema.HasSlug {
		return "anime.slug"
	}

	return "''"
}

func loadV2AnimeDisplayTitle(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	schema animeV2SchemaInfo,
) (string, error) {
	var title string
	query := fmt.Sprintf(`
		SELECT COALESCE((
			SELECT at2.title
			FROM anime_titles at2
			JOIN languages l ON l.id = at2.language_id
			JOIN title_types tt ON tt.id = at2.title_type_id
			WHERE at2.anime_id = anime.id
			ORDER BY
				CASE l.code
					WHEN 'ja' THEN 0
					WHEN 'romaji' THEN 1
					WHEN 'en' THEN 2
					WHEN 'de' THEN 3
					ELSE 10
				END,
				CASE tt.name
					WHEN 'main' THEN 0
					WHEN 'romaji' THEN 1
					WHEN 'official' THEN 2
					WHEN 'synonym' THEN 3
					WHEN 'short' THEN 4
					ELSE 10
				END,
				at2.title ASC
			LIMIT 1
		), %s)
		FROM anime
		WHERE anime.id = $1
	`, v2AnimeTitleFallbackSQL(schema))
	if err := tx.QueryRow(ctx, query, animeID).Scan(&title); errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	} else if err != nil {
		return "", fmt.Errorf("load anime v2 display title %d: %w", animeID, err)
	}

	return title, nil
}

func applyAnimeCoverPatchV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	coverImage *string,
	caption string,
	modifiedBy *int64,
	schema animeV2SchemaInfo,
) error {
	if coverImage == nil {
		if err := removeAnimePosterLinks(ctx, tx, animeID); err != nil {
			return err
		}
		return nil
	}

	if schema.HasSource {
		if err := removeAnimePosterLinks(ctx, tx, animeID); err != nil {
			return err
		}
	} else {
		if err := bumpAnimePosterSortOrders(ctx, tx, animeID); err != nil {
			return err
		}
	}

	return attachAnimePosterMediaV2(ctx, tx, animeID, strings.TrimSpace(*coverImage), caption, modifiedBy)
}

func attachAnimePosterMediaV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	coverImage string,
	caption string,
	actorUserID *int64,
) error {
	if strings.TrimSpace(coverImage) == "" {
		return nil
	}

	var mediaTypeID int64
	if err := tx.QueryRow(ctx, `SELECT id FROM media_types WHERE name = 'poster'`).Scan(&mediaTypeID); err != nil {
		return fmt.Errorf("resolve poster media type: %w", err)
	}

	mimeType, format := inferImageMetadata(coverImage)

	var mediaID int64
	if err := tx.QueryRow(
		ctx,
		`
		INSERT INTO media_assets (
			media_type_id,
			file_path,
			caption,
			mime_type,
			format,
			uploaded_by,
			modified_by
		)
		VALUES ($1, $2, $3, $4, $5, (SELECT id FROM users WHERE id = $6), (SELECT id FROM users WHERE id = $7))
		RETURNING id
		`,
		mediaTypeID,
		coverImage,
		strings.TrimSpace(caption),
		mimeType,
		format,
		actorUserID,
		actorUserID,
	).Scan(&mediaID); err != nil {
		return fmt.Errorf("create cover media asset anime=%d: %w", animeID, err)
	}

	if _, err := tx.Exec(
		ctx,
		`
		INSERT INTO anime_media (anime_id, media_id, sort_order)
		VALUES ($1, $2, 0)
		ON CONFLICT (anime_id, media_id) DO UPDATE SET sort_order = EXCLUDED.sort_order
		`,
		animeID,
		mediaID,
	); err != nil {
		return fmt.Errorf("link cover media anime=%d media=%d: %w", animeID, mediaID, err)
	}

	if external := buildJellyfinMediaExternal(coverImage); external != nil {
		metadata, err := buildCoverMediaExternalMetadata(coverImage)
		if err != nil {
			return err
		}

		if _, err := tx.Exec(
			ctx,
			`
			INSERT INTO media_external (media_id, provider, external_id, external_type, metadata)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (provider, external_id, external_type)
			DO UPDATE SET media_id = EXCLUDED.media_id, metadata = EXCLUDED.metadata
			`,
			mediaID,
			external.Provider,
			external.ExternalID,
			external.ExternalType,
			metadata,
		); err != nil {
			return fmt.Errorf("link jellyfin cover media anime=%d media=%d: %w", animeID, mediaID, err)
		}
	}

	return nil
}

func removeAnimePosterLinks(ctx context.Context, tx pgx.Tx, animeID int64) error {
	if _, err := tx.Exec(ctx, `
		DELETE FROM anime_media am
		USING media_assets ma, media_types mt
		WHERE am.media_id = ma.id
		  AND ma.media_type_id = mt.id
		  AND am.anime_id = $1
		  AND mt.name = 'poster'
	`, animeID); err != nil {
		return fmt.Errorf("remove anime poster links %d: %w", animeID, err)
	}

	return nil
}

func bumpAnimePosterSortOrders(ctx context.Context, tx pgx.Tx, animeID int64) error {
	if _, err := tx.Exec(ctx, `
		UPDATE anime_media am
		SET sort_order = sort_order + 1
		FROM media_assets ma, media_types mt
		WHERE am.media_id = ma.id
		  AND ma.media_type_id = mt.id
		  AND am.anime_id = $1
		  AND mt.name = 'poster'
	`, animeID); err != nil {
		return fmt.Errorf("bump anime poster sort orders %d: %w", animeID, err)
	}

	return nil
}

func loadAdminAnimeItemV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	schema animeV2SchemaInfo,
) (*models.AdminAnimeItem, error) {
	contentTypeSelect := `'anime'::text`
	if schema.HasContentType {
		contentTypeSelect = "anime.content_type"
	}
	statusSelect := `'ongoing'::text`
	if schema.HasStatus {
		statusSelect = "anime.status"
	}
	maxEpisodesSelect := `NULL::smallint`
	if schema.HasMaxEpisodes {
		maxEpisodesSelect = "anime.max_episodes"
	}

	query := fmt.Sprintf(`
		SELECT
			anime.id,
			COALESCE((
				SELECT at2.title
				FROM anime_titles at2
				JOIN languages l ON l.id = at2.language_id
				JOIN title_types tt ON tt.id = at2.title_type_id
				WHERE at2.anime_id = anime.id
				ORDER BY
					CASE l.code
						WHEN 'ja' THEN 0
						WHEN 'romaji' THEN 1
						WHEN 'en' THEN 2
						WHEN 'de' THEN 3
						ELSE 10
					END,
					CASE tt.name
						WHEN 'main' THEN 0
						WHEN 'romaji' THEN 1
						WHEN 'official' THEN 2
						WHEN 'synonym' THEN 3
						WHEN 'short' THEN 4
						ELSE 10
					END,
					at2.title ASC
				LIMIT 1
			), %s) AS display_title,
			at.name,
			`+contentTypeSelect+` AS content_type,
			`+statusSelect+` AS status,
			anime.year,
			`+maxEpisodesSelect+` AS max_episodes,
			anime.description,
			poster.file_path
		FROM anime
		LEFT JOIN anime_types at ON at.id = anime.anime_type_id
		LEFT JOIN LATERAL (
			SELECT ma.file_path
			FROM anime_media am
			JOIN media_assets ma ON ma.id = am.media_id
			JOIN media_types mt ON mt.id = ma.media_type_id
			WHERE am.anime_id = anime.id
			  AND mt.name = 'poster'
			ORDER BY am.sort_order ASC, ma.id ASC
			LIMIT 1
		) poster ON true
		WHERE anime.id = $1
	`, v2AnimeTitleFallbackSQL(schema))

	var item models.AdminAnimeItem
	var animeType *string
	if err := tx.QueryRow(ctx, query, animeID).Scan(
		&item.ID,
		&item.Title,
		&animeType,
		&item.ContentType,
		&item.Status,
		&item.Year,
		&item.MaxEpisodes,
		&item.Description,
		&item.CoverImage,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load admin anime item v2 %d: %w", animeID, err)
	}

	item.Type = mapAnimeTypeNameToAPI(animeType)

	if normalized, err := loadNormalizedAnimeMetadata(ctx, tx, animeID); err != nil {
		return nil, err
	} else if normalized != nil {
		if normalized.Title != "" {
			item.Title = normalized.Title
		}
		item.TitleDE = normalized.TitleDE
		item.TitleEN = normalized.TitleEN
		if len(normalized.Genres) > 0 {
			joined := strings.Join(normalized.Genres, ", ")
			item.Genre = &joined
		} else {
			item.Genre = nil
		}
	}

	return &item, nil
}
