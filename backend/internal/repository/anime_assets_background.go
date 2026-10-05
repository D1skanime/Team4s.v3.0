package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

func (r *AnimeAssetRepository) AddManualBackground(ctx context.Context, animeID int64, mediaID string, providerKey *string) (*models.AnimeBackgroundAsset, error) {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return nil, err
	}
	if useV2Schema {
		return r.addManualBackgroundV2(ctx, animeID, mediaID, providerKey)
	}

	trimmedMediaID := strings.TrimSpace(mediaID)
	if trimmedMediaID == "" {
		return nil, ErrNotFound
	}
	if err := r.ensureAnimeMediaAsset(ctx, animeID, trimmedMediaID); err != nil {
		return nil, err
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin add anime background tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return nil, err
	}

	var nextSort int32
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(sort_order), -1) + 1
		FROM anime_background_assets
		WHERE anime_id = $1
	`, animeID).Scan(&nextSort); err != nil {
		return nil, fmt.Errorf("load next anime background sort for %d: %w", animeID, err)
	}

	source := "manual"
	trimmedProviderKey := trimOptionalStringPtr(providerKey)
	if trimmedProviderKey != nil {
		source = "provider"
	}

	var item models.AnimeBackgroundAsset
	var storedSource string
	if err := tx.QueryRow(ctx, `
		INSERT INTO anime_background_assets (
			anime_id,
			media_asset_id,
			source,
			resolved_url,
			provider_key,
			sort_order
		)
		VALUES ($1, $2, $3, NULL, $4, $5)
		RETURNING id, media_asset_id, source, sort_order, created_at, updated_at
	`, animeID, trimmedMediaID, source, trimmedProviderKey, nextSort).Scan(
		&item.ID,
		&item.MediaID,
		&storedSource,
		&item.SortOrder,
		&item.CreatedAt,
		&item.UpdatedAt,
	); err != nil {
		return nil, fmt.Errorf("insert anime background asset %d: %w", animeID, err)
	}

	var mediaPath *string
	if err := tx.QueryRow(ctx, `
		SELECT path
		FROM media_files
		WHERE media_id = $1 AND (variant = 'original' OR variant IS NULL)
		ORDER BY id ASC
		LIMIT 1
	`, trimmedMediaID).Scan(&mediaPath); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("load anime background media path %q: %w", trimmedMediaID, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit add anime background tx: %w", err)
	}

	item.URL = resolveAnimeAssetURL(item.MediaID, nil, mediaPath)
	item.Ownership = models.AnimeAssetOwnership(storedSource)
	return &item, nil
}

func (r *AnimeAssetRepository) RemoveBackground(ctx context.Context, animeID int64, backgroundID int64) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if useV2Schema {
		return r.removeBackgroundV2(ctx, animeID, backgroundID)
	}

	tag, err := r.db.Exec(ctx, `
		DELETE FROM anime_background_assets
		WHERE anime_id = $1 AND id = $2
	`, animeID, backgroundID)
	if err != nil {
		return fmt.Errorf("remove anime background %d/%d: %w", animeID, backgroundID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AnimeAssetRepository) ApplyProviderBackgrounds(
	ctx context.Context,
	animeID int64,
	incoming []models.AnimeProviderAssetInput,
) error {
	useV2Schema, err := r.hasV2AssetSchema(ctx)
	if err != nil {
		return err
	}
	if useV2Schema {
		return r.applyProviderBackgroundsV2(ctx, animeID, incoming)
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime backgrounds provider tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}

	rows, err := tx.Query(ctx, `
		SELECT id, source, provider_key, sort_order
		FROM anime_background_assets
		WHERE anime_id = $1
		FOR UPDATE
	`, animeID)
	if err != nil {
		return fmt.Errorf("query anime background rows for update %d: %w", animeID, err)
	}
	defer rows.Close()

	existing := make([]storedAnimeBackgroundAsset, 0)
	for rows.Next() {
		var item storedAnimeBackgroundAsset
		if err := rows.Scan(&item.ID, &item.Source, &item.ProviderKey, &item.SortOrder); err != nil {
			return fmt.Errorf("scan anime background row %d: %w", animeID, err)
		}
		existing = append(existing, item)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate anime background rows %d: %w", animeID, err)
	}

	plan := reconcileAnimeProviderBackgrounds(existing, incoming)
	for _, update := range plan.Updates {
		if _, err := tx.Exec(ctx, `
			UPDATE anime_background_assets
			SET resolved_url = $2, updated_at = NOW()
			WHERE id = $1
		`, update.ID, update.URL); err != nil {
			return fmt.Errorf("update anime provider background %d: %w", update.ID, err)
		}
	}

	for _, insert := range plan.Inserts {
		if _, err := tx.Exec(ctx, `
			INSERT INTO anime_background_assets (
				anime_id,
				media_asset_id,
				source,
				resolved_url,
				provider_key,
				sort_order
			)
			VALUES ($1, NULL, 'provider', $2, $3, $4)
		`, animeID, insert.URL, insert.ProviderKey, insert.SortOrder); err != nil {
			return fmt.Errorf("insert anime provider background %d: %w", animeID, err)
		}
	}

	for _, deleteID := range plan.DeleteIDs {
		if _, err := tx.Exec(ctx, `
			DELETE FROM anime_background_assets
			WHERE id = $1
		`, deleteID); err != nil {
			return fmt.Errorf("delete anime provider background %d: %w", deleteID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime backgrounds provider tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) addManualBackgroundV2(ctx context.Context, animeID int64, mediaRef string, providerKey *string) (*models.AnimeBackgroundAsset, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin add anime background v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return nil, err
	}

	mediaID, err := loadV2AnimeMediaIDByRef(ctx, tx, strings.TrimSpace(mediaRef), "background")
	if err != nil {
		return nil, err
	}
	nextSort, err := loadNextAnimeMediaSortOrderByType(ctx, tx, animeID, "background")
	if err != nil {
		return nil, err
	}
	if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, nextSort); err != nil {
		return nil, err
	}

	trimmedProviderKey := trimOptionalStringPtr(providerKey)
	if trimmedProviderKey != nil {
		if err := upsertBackgroundMediaExternal(ctx, tx, mediaID, *trimmedProviderKey); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit add anime background v2 tx: %w", err)
	}

	resolved, err := r.getResolvedAssetsV2(ctx, animeID)
	if err != nil {
		return nil, err
	}
	mediaIDText := fmt.Sprintf("%d", mediaID)
	for _, item := range resolved.Backgrounds {
		if derefString(item.MediaID) == mediaIDText {
			copy := item
			return &copy, nil
		}
	}

	return nil, ErrNotFound
}

func (r *AnimeAssetRepository) removeBackgroundV2(ctx context.Context, animeID int64, backgroundID int64) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin remove anime background v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `
		DELETE FROM anime_media am
		USING media_assets ma, media_types mt
		WHERE am.media_id = ma.id
		  AND ma.media_type_id = mt.id
		  AND am.anime_id = $1
		  AND am.media_id = $2
		  AND mt.name = 'background'
	`, animeID, backgroundID)
	if err != nil {
		return fmt.Errorf("remove anime background v2 %d/%d: %w", animeID, backgroundID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit remove anime background v2 tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) applyProviderBackgroundsV2(
	ctx context.Context,
	animeID int64,
	incoming []models.AnimeProviderAssetInput,
) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime backgrounds provider v2 tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := lockAnimeRow(ctx, tx, animeID); err != nil {
		return err
	}

	rows, err := tx.Query(ctx, `
		SELECT am.media_id, COALESCE(me.provider, ''), me.external_id, am.sort_order
		FROM anime_media am
		JOIN media_assets ma ON ma.id = am.media_id
		JOIN media_types mt ON mt.id = ma.media_type_id
		LEFT JOIN LATERAL (
			SELECT provider, external_id
			FROM media_external
			WHERE media_id = ma.id
			ORDER BY id ASC
			LIMIT 1
		) me ON true
		WHERE am.anime_id = $1
		  AND mt.name = 'background'
		ORDER BY am.sort_order ASC, am.media_id ASC
		FOR UPDATE OF am, ma
	`, animeID)
	if err != nil {
		return fmt.Errorf("query anime background rows for v2 update %d: %w", animeID, err)
	}
	defer rows.Close()

	existing := make([]storedAnimeBackgroundAsset, 0)
	for rows.Next() {
		var item storedAnimeBackgroundAsset
		var provider string
		if err := rows.Scan(&item.ID, &provider, &item.ProviderKey, &item.SortOrder); err != nil {
			return fmt.Errorf("scan anime background v2 row %d: %w", animeID, err)
		}
		if strings.TrimSpace(provider) == "" {
			item.Source = string(models.AnimeAssetOwnershipManual)
		} else {
			item.Source = string(models.AnimeAssetOwnershipProvider)
		}
		existing = append(existing, item)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterate anime background v2 rows %d: %w", animeID, err)
	}

	plan := reconcileAnimeProviderBackgrounds(existing, incoming)
	for _, update := range plan.Updates {
		if _, err := tx.Exec(ctx, `
			UPDATE media_assets
			SET file_path = $2, modified_at = NOW()
			WHERE id = $1
		`, update.ID, update.URL); err != nil {
			return fmt.Errorf("update anime provider background v2 %d: %w", update.ID, err)
		}
	}
	for _, insert := range plan.Inserts {
		mediaID, err := ensureProviderAnimeMediaV2(ctx, tx, "background", &models.AnimeProviderAssetInput{
			URL:         insert.URL,
			ProviderKey: insert.ProviderKey,
		})
		if err != nil {
			return err
		}
		if err := upsertAnimeMediaLink(ctx, tx, animeID, mediaID, insert.SortOrder); err != nil {
			return err
		}
	}
	for _, deleteID := range plan.DeleteIDs {
		if _, err := tx.Exec(ctx, `
			DELETE FROM anime_media
			WHERE anime_id = $1 AND media_id = $2
		`, animeID, deleteID); err != nil {
			return fmt.Errorf("delete anime provider background v2 %d: %w", deleteID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime backgrounds provider v2 tx: %w", err)
	}
	return nil
}

func loadNextAnimeMediaSortOrderByType(ctx context.Context, tx pgx.Tx, animeID int64, mediaType string) (int32, error) {
	var nextSort int32
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(am.sort_order), -1) + 1
		FROM anime_media am
		JOIN media_assets ma ON ma.id = am.media_id
		JOIN media_types mt ON mt.id = ma.media_type_id
		WHERE am.anime_id = $1
		  AND mt.name = $2
	`, animeID, mediaType).Scan(&nextSort); err != nil {
		return 0, fmt.Errorf("load next anime %s sort for %d: %w", mediaType, animeID, err)
	}
	return nextSort, nil
}
