package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"path"
	"strings"
	"unicode"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

var animeTypeV2Names = map[string]string{
	"tv":      "TV",
	"film":    "Movie",
	"ova":     "OVA",
	"ona":     "ONA",
	"special": "Special",
	"bonus":   "Bonus",
	"web":     "Web",
}

func (r *AdminContentRepository) createAnimeLegacy(
	ctx context.Context,
	tx pgx.Tx,
	input models.AdminAnimeCreateInput,
) (*models.AdminAnimeItem, error) {
	query := `
		INSERT INTO anime (
			title, title_de, title_en, type, content_type, status,
			year, max_episodes, genre, description, cover_image, source, folder_name
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING
			id, title, title_de, title_en, type, content_type, status,
			year, max_episodes, genre, description, cover_image
	`

	var item models.AdminAnimeItem
	if err := tx.QueryRow(
		ctx,
		query,
		input.Title,
		input.TitleDE,
		input.TitleEN,
		input.Type,
		input.ContentType,
		input.Status,
		input.Year,
		input.MaxEpisodes,
		input.Genre,
		input.Description,
		input.CoverImage,
		input.Source,
		input.FolderName,
	).Scan(
		&item.ID,
		&item.Title,
		&item.TitleDE,
		&item.TitleEN,
		&item.Type,
		&item.ContentType,
		&item.Status,
		&item.Year,
		&item.MaxEpisodes,
		&item.Genre,
		&item.Description,
		&item.CoverImage,
	); err != nil {
		return nil, fmt.Errorf("create anime legacy: %w", err)
	}

	return &item, nil
}

func (r *AdminContentRepository) createAnimeV2(
	ctx context.Context,
	tx pgx.Tx,
	input models.AdminAnimeCreateInput,
	actorUserID int64,
) (*models.AdminAnimeItem, error) {
	animeTypeID, err := resolveAnimeTypeID(ctx, tx, input.Type)
	if err != nil {
		return nil, err
	}

	slug, err := buildUniqueAnimeSlug(ctx, tx, input.Title)
	if err != nil {
		return nil, err
	}

	modifiedBy, err := resolveExistingUserID(ctx, tx, actorUserID)
	if err != nil {
		return nil, err
	}

	var animeID int64
	if err := tx.QueryRow(
		ctx,
		`
		INSERT INTO anime (
			anime_type_id,
			year,
			description,
			folder_name,
			slug,
			modified_by
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
		`,
		animeTypeID,
		input.Year,
		input.Description,
		input.FolderName,
		slug,
		modifiedBy,
	).Scan(&animeID); err != nil {
		return nil, fmt.Errorf("create anime v2: %w", err)
	}

	if err := syncAuthoritativeAnimeMetadata(ctx, tx, animeID, buildAuthoritativeAnimeMetadataCreate(input)); err != nil {
		return nil, err
	}

	if err := attachAnimeCoverMediaV2(ctx, tx, animeID, input, modifiedBy); err != nil {
		return nil, err
	}

	return &models.AdminAnimeItem{
		ID:          animeID,
		Title:       input.Title,
		TitleDE:     trimOptionalStringPtr(input.TitleDE),
		TitleEN:     trimOptionalStringPtr(input.TitleEN),
		Type:        input.Type,
		ContentType: input.ContentType,
		Status:      input.Status,
		Year:        input.Year,
		MaxEpisodes: input.MaxEpisodes,
		Genre:       trimOptionalStringPtr(input.Genre),
		Description: trimOptionalStringPtr(input.Description),
		CoverImage:  trimOptionalStringPtr(input.CoverImage),
	}, nil
}

func resolveAnimeTypeID(ctx context.Context, tx pgx.Tx, rawType string) (int64, error) {
	mappedName, ok := animeTypeV2Names[strings.TrimSpace(strings.ToLower(rawType))]
	if !ok {
		return 0, fmt.Errorf("resolve v2 anime type %q: unsupported value", rawType)
	}

	var id int64
	if err := tx.QueryRow(ctx, `SELECT id FROM anime_types WHERE name = $1`, mappedName).Scan(&id); err != nil {
		return 0, fmt.Errorf("resolve v2 anime type %q: %w", mappedName, err)
	}

	return id, nil
}

func resolveExistingUserID(ctx context.Context, tx pgx.Tx, userID int64) (*int64, error) {
	if userID <= 0 {
		return nil, nil
	}

	var id int64
	if err := tx.QueryRow(ctx, `SELECT id FROM users WHERE id = $1`, userID).Scan(&id); err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("resolve actor user %d: %w", userID, err)
	}

	return &id, nil
}

func buildUniqueAnimeSlug(ctx context.Context, tx pgx.Tx, title string) (string, error) {
	base := slugifyAnimeTitle(title)
	if base == "" {
		base = "anime"
	}

	slug := base
	suffix := 2
	for {
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM anime WHERE slug = $1)`, slug).Scan(&exists); err != nil {
			return "", fmt.Errorf("check anime slug %q: %w", slug, err)
		}
		if !exists {
			return slug, nil
		}

		slug = fmt.Sprintf("%s-%d", base, suffix)
		suffix++
	}
}

func slugifyAnimeTitle(title string) string {
	trimmed := strings.TrimSpace(strings.ToLower(title))
	if trimmed == "" {
		return ""
	}

	var builder strings.Builder
	lastDash := false
	for _, r := range trimmed {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			builder.WriteRune(r)
			lastDash = false
		case unicode.IsSpace(r) || r == '-' || r == '_' || r == '/' || r == '.':
			if builder.Len() > 0 && !lastDash {
				builder.WriteByte('-')
				lastDash = true
			}
		}
	}

	return strings.Trim(builder.String(), "-")
}

func attachAnimeCoverMediaV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	input models.AdminAnimeCreateInput,
	actorUserID *int64,
) error {
	coverImage := trimOptionalStringPtr(input.CoverImage)
	if coverImage == nil {
		return nil
	}

	var mediaTypeID int64
	if err := tx.QueryRow(ctx, `SELECT id FROM media_types WHERE name = 'poster'`).Scan(&mediaTypeID); err != nil {
		return fmt.Errorf("resolve poster media type: %w", err)
	}

	mimeType, format := inferImageMetadata(*coverImage)

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
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
		`,
		mediaTypeID,
		*coverImage,
		input.Title,
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
		ON CONFLICT (anime_id, media_id) DO NOTHING
		`,
		animeID,
		mediaID,
	); err != nil {
		return fmt.Errorf("link cover media anime=%d media=%d: %w", animeID, mediaID, err)
	}

	if external := buildJellyfinMediaExternal(*coverImage); external != nil {
		metadata, err := json.Marshal(map[string]any{
			"source_url": *coverImage,
		})
		if err != nil {
			return fmt.Errorf("marshal cover media external metadata anime=%d: %w", animeID, err)
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

type mediaExternalRef struct {
	Provider     string
	ExternalID   string
	ExternalType string
}

func buildJellyfinMediaExternal(raw string) *mediaExternalRef {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return nil
	}

	query := parsed.Query()
	if strings.TrimSpace(strings.ToLower(query.Get("provider"))) != "jellyfin" {
		return nil
	}

	itemID := strings.TrimSpace(query.Get("item_id"))
	if itemID == "" {
		return nil
	}

	externalType := strings.TrimSpace(strings.ToLower(query.Get("kind")))
	if externalType == "" {
		externalType = "poster"
	}

	return &mediaExternalRef{
		Provider:     "jellyfin",
		ExternalID:   itemID,
		ExternalType: externalType,
	}
}

func inferImageMetadata(raw string) (mimeType string, format string) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "image/unknown", "unknown"
	}

	if parsed, err := url.Parse(trimmed); err == nil {
		trimmed = parsed.Path
	}

	ext := strings.TrimPrefix(strings.ToLower(path.Ext(trimmed)), ".")
	switch ext {
	case "jpg", "jpeg":
		return "image/jpeg", "jpeg"
	case "png":
		return "image/png", "png"
	case "webp":
		return "image/webp", "webp"
	case "gif":
		return "image/gif", "gif"
	case "avif":
		return "image/avif", "avif"
	default:
		return "image/unknown", "unknown"
	}
}

func hasV2AnimeCreateSchema(ctx context.Context, tx pgx.Tx) (bool, error) {
	var hasSlug bool
	if err := tx.QueryRow(
		ctx,
		`
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = current_schema()
			  AND table_name = 'anime'
			  AND column_name = 'slug'
		)
		`,
	).Scan(&hasSlug); err != nil {
		return false, fmt.Errorf("detect v2 anime schema: %w", err)
	}

	return hasSlug, nil
}
