package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnimeAssetRepository struct {
	db *pgxpool.Pool
}

func NewAnimeAssetRepository(db *pgxpool.Pool) *AnimeAssetRepository {
	return &AnimeAssetRepository{db: db}
}

func (r *AnimeAssetRepository) GetResolvedAssets(ctx context.Context, animeID int64) (*models.AnimeResolvedAssets, error) {
	row := r.db.QueryRow(ctx, `
		SELECT
			a.cover_asset_id,
			a.cover_source,
			a.cover_resolved_url,
			a.cover_provider_key,
			cover_mf.path,
			a.banner_asset_id,
			a.banner_source,
			a.banner_resolved_url,
			a.banner_provider_key,
			banner_mf.path
		FROM anime a
		LEFT JOIN media_files cover_mf
			ON cover_mf.media_id = a.cover_asset_id
			AND (cover_mf.variant = 'original' OR cover_mf.variant IS NULL)
		LEFT JOIN media_files banner_mf
			ON banner_mf.media_id = a.banner_asset_id
			AND (banner_mf.variant = 'original' OR banner_mf.variant IS NULL)
		WHERE a.id = $1
		ORDER BY cover_mf.id ASC NULLS LAST, banner_mf.id ASC NULLS LAST
		LIMIT 1
	`, animeID)

	var coverMediaID *string
	var coverSource *string
	var coverResolvedURL *string
	var coverProviderKey *string
	var coverMediaPath *string
	var bannerMediaID *string
	var bannerSource *string
	var bannerResolvedURL *string
	var bannerProviderKey *string
	var bannerMediaPath *string
	if err := row.Scan(
		&coverMediaID,
		&coverSource,
		&coverResolvedURL,
		&coverProviderKey,
		&coverMediaPath,
		&bannerMediaID,
		&bannerSource,
		&bannerResolvedURL,
		&bannerProviderKey,
		&bannerMediaPath,
	); errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, fmt.Errorf("load anime assets %d: %w", animeID, err)
	}

	result := &models.AnimeResolvedAssets{
		Backgrounds: make([]models.AnimeBackgroundAsset, 0),
	}
	if cover := resolveAnimeResolvedAsset(coverMediaID, coverSource, coverResolvedURL, coverProviderKey, coverMediaPath); cover != nil {
		result.Cover = cover
	}
	if banner := resolveAnimeBannerAsset(bannerMediaID, bannerSource, bannerResolvedURL, bannerProviderKey, bannerMediaPath); banner != nil {
		result.Banner = banner
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			aba.id,
			aba.media_asset_id,
			aba.source,
			aba.resolved_url,
			aba.provider_key,
			aba.sort_order,
			aba.created_at,
			aba.updated_at,
			mf.path
		FROM anime_background_assets aba
		LEFT JOIN media_files mf
			ON mf.media_id = aba.media_asset_id
			AND (mf.variant = 'original' OR mf.variant IS NULL)
		WHERE aba.anime_id = $1
		ORDER BY aba.sort_order ASC, aba.id ASC, mf.id ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime background assets %d: %w", animeID, err)
	}
	defer rows.Close()

	seen := make(map[int64]struct{})
	for rows.Next() {
		var item models.AnimeBackgroundAsset
		var source string
		var resolvedURL *string
		var mediaPath *string
		if err := rows.Scan(
			&item.ID,
			&item.MediaID,
			&source,
			&resolvedURL,
			&item.ProviderKey,
			&item.SortOrder,
			&item.CreatedAt,
			&item.UpdatedAt,
			&mediaPath,
		); err != nil {
			return nil, fmt.Errorf("scan anime background asset %d: %w", animeID, err)
		}
		if _, ok := seen[item.ID]; ok {
			continue
		}
		seen[item.ID] = struct{}{}

		urlValue := resolveAnimeAssetURL(item.MediaID, resolvedURL, mediaPath)
		if urlValue == "" {
			continue
		}
		item.URL = urlValue
		item.Ownership = models.AnimeAssetOwnership(strings.TrimSpace(source))
		result.Backgrounds = append(result.Backgrounds, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime background assets %d: %w", animeID, err)
	}

	return result, nil
}

func (r *AnimeAssetRepository) AssignManualCover(ctx context.Context, animeID int64, mediaID string) error {
	trimmedMediaID := strings.TrimSpace(mediaID)
	if trimmedMediaID == "" {
		return ErrNotFound
	}
	if err := r.ensureAnimeMediaAsset(ctx, animeID, trimmedMediaID); err != nil {
		return err
	}

	var coverPath *string
	if err := r.db.QueryRow(ctx, `
		SELECT path
		FROM media_files
		WHERE media_id = $1 AND (variant = 'original' OR variant IS NULL)
		ORDER BY id ASC
		LIMIT 1
	`, trimmedMediaID).Scan(&coverPath); err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("load manual anime cover path %q: %w", trimmedMediaID, err)
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE anime
		SET
			cover_asset_id = $2,
			cover_source = 'manual',
			cover_resolved_url = NULL,
			cover_provider_key = NULL,
			cover_image = $3,
			updated_at = NOW()
		WHERE id = $1
	`, animeID, trimmedMediaID, normalizeNullableTrimmedString(coverPath))
	if err != nil {
		return fmt.Errorf("assign manual anime cover %d: %w", animeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AnimeAssetRepository) ClearCover(ctx context.Context, animeID int64) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE anime
		SET
			cover_asset_id = NULL,
			cover_source = NULL,
			cover_resolved_url = NULL,
			cover_provider_key = NULL,
			cover_image = NULL,
			updated_at = NOW()
		WHERE id = $1
	`, animeID)
	if err != nil {
		return fmt.Errorf("clear anime cover %d: %w", animeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AnimeAssetRepository) AssignManualBanner(ctx context.Context, animeID int64, mediaID string) error {
	trimmedMediaID := strings.TrimSpace(mediaID)
	if trimmedMediaID == "" {
		return ErrNotFound
	}
	if err := r.ensureAnimeMediaAsset(ctx, animeID, trimmedMediaID); err != nil {
		return err
	}

	tag, err := r.db.Exec(ctx, `
		UPDATE anime
		SET
			banner_asset_id = $2,
			banner_source = 'manual',
			banner_resolved_url = NULL,
			banner_provider_key = NULL,
			updated_at = NOW()
		WHERE id = $1
	`, animeID, trimmedMediaID)
	if err != nil {
		return fmt.Errorf("assign manual anime banner %d: %w", animeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AnimeAssetRepository) ClearBanner(ctx context.Context, animeID int64) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE anime
		SET
			banner_asset_id = NULL,
			banner_source = NULL,
			banner_resolved_url = NULL,
			banner_provider_key = NULL,
			updated_at = NOW()
		WHERE id = $1
	`, animeID)
	if err != nil {
		return fmt.Errorf("clear anime banner %d: %w", animeID, err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *AnimeAssetRepository) AddManualBackground(ctx context.Context, animeID int64, mediaID string) (*models.AnimeBackgroundAsset, error) {
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

	var item models.AnimeBackgroundAsset
	var source string
	if err := tx.QueryRow(ctx, `
		INSERT INTO anime_background_assets (
			anime_id,
			media_asset_id,
			source,
			resolved_url,
			provider_key,
			sort_order
		)
		VALUES ($1, $2, 'manual', NULL, NULL, $3)
		RETURNING id, media_asset_id, source, sort_order, created_at, updated_at
	`, animeID, trimmedMediaID, nextSort).Scan(
		&item.ID,
		&item.MediaID,
		&source,
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
	item.Ownership = models.AnimeAssetOwnership(source)
	return &item, nil
}

func (r *AnimeAssetRepository) RemoveBackground(ctx context.Context, animeID int64, backgroundID int64) error {
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

func (r *AnimeAssetRepository) ApplyProviderBanner(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime banner provider tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var currentSource *string
	if err := tx.QueryRow(ctx, `
		SELECT banner_source
		FROM anime
		WHERE id = $1
		FOR UPDATE
	`, animeID).Scan(&currentSource); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("lock anime banner row %d: %w", animeID, err)
	}

	if strings.TrimSpace(derefString(currentSource)) == string(models.AnimeAssetOwnershipManual) {
		return tx.Commit(ctx)
	}

	if input == nil || strings.TrimSpace(input.URL) == "" {
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET
				banner_asset_id = NULL,
				banner_source = NULL,
				banner_resolved_url = NULL,
				banner_provider_key = NULL,
				updated_at = NOW()
			WHERE id = $1
		`, animeID); err != nil {
			return fmt.Errorf("clear provider anime banner %d: %w", animeID, err)
		}
	} else {
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET
				banner_asset_id = NULL,
				banner_source = 'provider',
				banner_resolved_url = $2,
				banner_provider_key = $3,
				updated_at = NOW()
			WHERE id = $1
		`, animeID, strings.TrimSpace(input.URL), strings.TrimSpace(input.ProviderKey)); err != nil {
			return fmt.Errorf("apply provider anime banner %d: %w", animeID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime banner provider tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) ApplyProviderCover(ctx context.Context, animeID int64, input *models.AnimeProviderAssetInput) error {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin apply anime cover provider tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var currentSource *string
	if err := tx.QueryRow(ctx, `
		SELECT cover_source
		FROM anime
		WHERE id = $1
		FOR UPDATE
	`, animeID).Scan(&currentSource); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("lock anime cover row %d: %w", animeID, err)
	}

	if strings.TrimSpace(derefString(currentSource)) == string(models.AnimeAssetOwnershipManual) {
		return tx.Commit(ctx)
	}

	if input == nil || strings.TrimSpace(input.URL) == "" {
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET
				cover_asset_id = NULL,
				cover_source = NULL,
				cover_resolved_url = NULL,
				cover_provider_key = NULL,
				cover_image = NULL,
				updated_at = NOW()
			WHERE id = $1
		`, animeID); err != nil {
			return fmt.Errorf("clear provider anime cover %d: %w", animeID, err)
		}
	} else {
		trimmedURL := strings.TrimSpace(input.URL)
		if _, err := tx.Exec(ctx, `
			UPDATE anime
			SET
				cover_asset_id = NULL,
				cover_source = 'provider',
				cover_resolved_url = $2,
				cover_provider_key = $3,
				cover_image = $2,
				updated_at = NOW()
			WHERE id = $1
		`, animeID, trimmedURL, strings.TrimSpace(input.ProviderKey)); err != nil {
			return fmt.Errorf("apply provider anime cover %d: %w", animeID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit anime cover provider tx: %w", err)
	}
	return nil
}

func (r *AnimeAssetRepository) ApplyProviderBackgrounds(
	ctx context.Context,
	animeID int64,
	incoming []models.AnimeProviderAssetInput,
) error {
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

func (r *AnimeAssetRepository) ensureAnimeMediaAsset(ctx context.Context, animeID int64, mediaID string) error {
	var id string
	err := r.db.QueryRow(ctx, `
		SELECT id
		FROM media_assets
		WHERE id = $1
		  AND entity_type = 'anime'
		  AND entity_id = $2
		  AND format = 'image'
	`, mediaID, animeID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("load anime media asset %q: %w", mediaID, err)
	}
	return nil
}

func lockAnimeRow(ctx context.Context, tx pgx.Tx, animeID int64) error {
	var lockedID int64
	if err := tx.QueryRow(ctx, `
		SELECT id
		FROM anime
		WHERE id = $1
		FOR UPDATE
	`, animeID).Scan(&lockedID); errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	} else if err != nil {
		return fmt.Errorf("lock anime row %d: %w", animeID, err)
	}
	return nil
}

func resolveAnimeBannerAsset(
	mediaID *string,
	source *string,
	resolvedURL *string,
	providerKey *string,
	mediaPath *string,
) *models.AnimeResolvedAsset {
	return resolveAnimeResolvedAsset(mediaID, source, resolvedURL, providerKey, mediaPath)
}

func resolveAnimeResolvedAsset(
	mediaID *string,
	source *string,
	resolvedURL *string,
	providerKey *string,
	mediaPath *string,
) *models.AnimeResolvedAsset {
	ownership := strings.TrimSpace(derefString(source))
	if ownership == "" {
		return nil
	}
	urlValue := resolveAnimeAssetURL(mediaID, resolvedURL, mediaPath)
	if urlValue == "" {
		return nil
	}

	return &models.AnimeResolvedAsset{
		MediaID:     mediaID,
		URL:         urlValue,
		Ownership:   models.AnimeAssetOwnership(ownership),
		ProviderKey: normalizeNullableTrimmedString(providerKey),
	}
}

func resolveAnimeAssetURL(mediaID *string, resolvedURL *string, mediaPath *string) string {
	if mediaID != nil && strings.TrimSpace(derefString(mediaPath)) != "" {
		return strings.TrimSpace(derefString(mediaPath))
	}
	return strings.TrimSpace(derefString(resolvedURL))
}

func normalizeNullableTrimmedString(value *string) *string {
	trimmed := strings.TrimSpace(derefString(value))
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

type storedAnimeBackgroundAsset struct {
	ID          int64
	Source      string
	ProviderKey *string
	SortOrder   int32
}

type animeProviderBackgroundUpdate struct {
	ID  int64
	URL string
}

type animeProviderBackgroundInsert struct {
	URL         string
	ProviderKey string
	SortOrder   int32
}

type animeProviderBackgroundPlan struct {
	Updates   []animeProviderBackgroundUpdate
	Inserts   []animeProviderBackgroundInsert
	DeleteIDs []int64
}

func reconcileAnimeProviderBackgrounds(
	existing []storedAnimeBackgroundAsset,
	incoming []models.AnimeProviderAssetInput,
) animeProviderBackgroundPlan {
	plan := animeProviderBackgroundPlan{
		Updates:   make([]animeProviderBackgroundUpdate, 0),
		Inserts:   make([]animeProviderBackgroundInsert, 0),
		DeleteIDs: make([]int64, 0),
	}

	existingByKey := make(map[string]storedAnimeBackgroundAsset)
	maxSort := int32(-1)
	for _, item := range existing {
		if item.SortOrder > maxSort {
			maxSort = item.SortOrder
		}
		if strings.TrimSpace(item.Source) != string(models.AnimeAssetOwnershipProvider) {
			continue
		}
		key := strings.TrimSpace(derefString(item.ProviderKey))
		if key == "" {
			plan.DeleteIDs = append(plan.DeleteIDs, item.ID)
			continue
		}
		existingByKey[key] = item
	}

	seen := make(map[string]struct{})
	for _, candidate := range incoming {
		key := strings.TrimSpace(candidate.ProviderKey)
		urlValue := strings.TrimSpace(candidate.URL)
		if key == "" || urlValue == "" {
			continue
		}
		seen[key] = struct{}{}

		if existingItem, ok := existingByKey[key]; ok {
			plan.Updates = append(plan.Updates, animeProviderBackgroundUpdate{
				ID:  existingItem.ID,
				URL: urlValue,
			})
			continue
		}

		maxSort++
		plan.Inserts = append(plan.Inserts, animeProviderBackgroundInsert{
			URL:         urlValue,
			ProviderKey: key,
			SortOrder:   maxSort,
		})
	}

	for key, item := range existingByKey {
		if _, ok := seen[key]; ok {
			continue
		}
		plan.DeleteIDs = append(plan.DeleteIDs, item.ID)
	}

	return plan
}
