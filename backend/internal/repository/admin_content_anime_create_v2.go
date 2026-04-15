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
	schema, err := loadAnimeV2SchemaInfo(ctx, tx)
	if err != nil {
		return nil, err
	}

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
	query, args := buildCreateAnimeV2InsertQuery(schema, animeTypeID, input, slug, modifiedBy)
	if err := tx.QueryRow(
		ctx,
		query,
		args...,
	).Scan(&animeID); err != nil {
		return nil, fmt.Errorf("create anime v2: %w", err)
	}

	if err := syncAuthoritativeAnimeMetadata(ctx, tx, animeID, buildAuthoritativeAnimeMetadataCreate(input)); err != nil {
		return nil, err
	}

	if err := attachAnimeCoverMediaV2(ctx, tx, animeID, input, modifiedBy); err != nil {
		return nil, err
	}
	if err := attachAnimeBannerMediaV2(ctx, tx, animeID, input, modifiedBy); err != nil {
		return nil, err
	}
	if err := attachAnimeLogoMediaV2(ctx, tx, animeID, input, modifiedBy); err != nil {
		return nil, err
	}
	if err := attachAnimeBackgroundVideoMediaV2(ctx, tx, animeID, input, modifiedBy); err != nil {
		return nil, err
	}
	if err := attachAnimeBackgroundImageURLsMediaV2(ctx, tx, animeID, input, modifiedBy); err != nil {
		return nil, err
	}

	return loadAdminAnimeItemV2(ctx, tx, animeID, schema)
}

func buildCreateAnimeV2InsertQuery(
	schema animeV2SchemaInfo,
	animeTypeID int64,
	input models.AdminAnimeCreateInput,
	slug string,
	modifiedBy *int64,
) (string, []any) {
	columns := []string{
		"anime_type_id",
	}
	args := []any{
		animeTypeID,
	}

	if schema.HasContentType {
		columns = append(columns, "content_type")
		args = append(args, input.ContentType)
	}
	if schema.HasStatus {
		columns = append(columns, "status")
		args = append(args, input.Status)
	}

	columns = append(columns, "year")
	args = append(args, input.Year)

	if schema.HasMaxEpisodes {
		columns = append(columns, "max_episodes")
		args = append(args, input.MaxEpisodes)
	}

	columns = append(columns, "description")
	args = append(args, input.Description)

	if schema.HasSource {
		columns = append(columns, "source")
		args = append(args, input.Source)
	}

	columns = append(columns, "folder_name", "slug", "modified_by")
	args = append(args, input.FolderName, slug, modifiedBy)

	placeholders := make([]string, 0, len(columns))
	for idx := range columns {
		placeholders = append(placeholders, fmt.Sprintf("$%d", idx+1))
	}

	query := fmt.Sprintf(`
		INSERT INTO anime (
			%s
		)
		VALUES (%s)
		RETURNING id
	`, strings.Join(columns, ",\n\t\t\t"), strings.Join(placeholders, ", "))

	return query, args
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
	return attachUrlMediaAssetV2(ctx, tx, animeID, input.CoverImage, "poster", input.Title, actorUserID)
}

func attachAnimeBannerMediaV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	input models.AdminAnimeCreateInput,
	actorUserID *int64,
) error {
	return attachUrlMediaAssetV2(ctx, tx, animeID, input.BannerImage, "banner", input.Title, actorUserID)
}

func attachAnimeLogoMediaV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	input models.AdminAnimeCreateInput,
	actorUserID *int64,
) error {
	return attachUrlMediaAssetV2(ctx, tx, animeID, input.LogoImage, "logo", input.Title, actorUserID)
}

func attachAnimeBackgroundVideoMediaV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	input models.AdminAnimeCreateInput,
	actorUserID *int64,
) error {
	return attachUrlMediaAssetV2(ctx, tx, animeID, input.BackgroundVideoURL, "video", input.Title, actorUserID)
}

func attachAnimeBackgroundImageURLsMediaV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	input models.AdminAnimeCreateInput,
	actorUserID *int64,
) error {
	for _, rawURL := range input.BackgroundImageURLs {
		u := rawURL
		if err := attachUrlMediaAssetV2(ctx, tx, animeID, &u, "background", input.Title, actorUserID); err != nil {
			return err
		}
	}
	return nil
}

// attachUrlMediaAssetV2 legt einen media_assets-Eintrag fuer eine URL an,
// verknuepft ihn via anime_media und speichert bei Jellyfin-URLs einen
// media_external-Eintrag. mediaTypeName muss ein gueltiger Wert aus media_types sein.
func attachUrlMediaAssetV2(
	ctx context.Context,
	tx pgx.Tx,
	animeID int64,
	rawURL *string,
	mediaTypeName string,
	caption string,
	actorUserID *int64,
) error {
	imageURL := trimOptionalStringPtr(rawURL)
	if imageURL == nil {
		return nil
	}

	var mediaTypeID int64
	if err := tx.QueryRow(ctx, `SELECT id FROM media_types WHERE name = $1`, mediaTypeName).Scan(&mediaTypeID); err != nil {
		return fmt.Errorf("resolve %s media type: %w", mediaTypeName, err)
	}

	mimeType, format := inferImageMetadata(*imageURL)

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
		*imageURL,
		caption,
		mimeType,
		format,
		actorUserID,
		actorUserID,
	).Scan(&mediaID); err != nil {
		return fmt.Errorf("create %s media asset anime=%d: %w", mediaTypeName, animeID, err)
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
		return fmt.Errorf("link %s media anime=%d media=%d: %w", mediaTypeName, animeID, mediaID, err)
	}

	if external := buildJellyfinMediaExternal(*imageURL); external != nil {
		metadata, err := buildCoverMediaExternalMetadata(*imageURL)
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
			return fmt.Errorf("link jellyfin %s media anime=%d media=%d: %w", mediaTypeName, animeID, mediaID, err)
		}
	}

	return nil
}

func buildCoverMediaExternalMetadata(sourceURL string) ([]byte, error) {
	metadata, err := json.Marshal(map[string]any{
		"source_url": sourceURL,
	})
	if err != nil {
		return nil, fmt.Errorf("marshal cover media external metadata: %w", err)
	}

	return metadata, nil
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
		if strings.HasSuffix(parsed.Path, "/video") {
			externalType = "theme_video"
		} else {
			externalType = "poster"
		}
	}

	// Backdrops mit Index: external_id eindeutig machen (item_id + "-" + index),
	// damit mehrere Backdrops desselben Jellyfin-Items nicht kollidieren.
	externalID := itemID
	if externalType == "backdrop" {
		if idx := strings.TrimSpace(query.Get("index")); idx != "" {
			externalID = itemID + "-" + idx
		}
	}

	return &mediaExternalRef{
		Provider:     "jellyfin",
		ExternalID:   externalID,
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
