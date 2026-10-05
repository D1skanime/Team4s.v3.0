package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"team4s.v3/backend/internal/models"

	"github.com/jackc/pgx/v5"
)

// fansubStoryPreviewRuneLimit ist die maximale Anzahl Runes (nicht Bytes),
// die story_preview in ListAnimeFansubs tragen darf. Rune-basiert statt
// byte-basiert, damit mehrbyte-kodierte Zeichen (Umlaute ä/ö/ü/ß, „…") nicht
// mitten im Byte zerschnitten werden.
const fansubStoryPreviewRuneLimit = 500

// truncateStoryPreviewRunes kürzt raw rune-sicher auf höchstens limit Runes.
// Gibt nil zurück, wenn raw nil ist oder nach dem Trimmen leer bleibt (nur
// Whitespace zählt als leer).
func truncateStoryPreviewRunes(raw *string, limit int) *string {
	if raw == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil
	}
	runes := []rune(trimmed)
	if len(runes) <= limit {
		return &trimmed
	}
	truncated := string(runes[:limit])
	return &truncated
}

func (r *FansubRepository) ListAnimeFansubs(
	ctx context.Context,
	animeID int64,
) ([]models.AnimeFansubRelation, error) {
	exists, err := r.animeExists(ctx, animeID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, ErrNotFound
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			afg.anime_id, afg.fansub_group_id, afg.is_primary, afg.notes, afg.created_at,
			fg.id, fg.slug, fg.name, fg.logo_url, fg.founded_year, fg.dissolved_year, fg.country, fg.status,
			story.body_text
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		LEFT JOIN LATERAL (
			SELECT n.body_text
			FROM fansub_group_notes n
			WHERE n.fansub_group_id = fg.id
			  AND n.visibility = 'public'
			  AND n.status = 'published'
			  AND n.deleted_at IS NULL
			ORDER BY n.sort_order ASC, n.id ASC
			LIMIT 1
		) story ON true
		WHERE afg.anime_id = $1
		ORDER BY afg.is_primary DESC, fg.name ASC
	`, animeID)
	if err != nil {
		return nil, fmt.Errorf("query anime fansubs for anime %d: %w", animeID, err)
	}
	defer rows.Close()

	items := make([]models.AnimeFansubRelation, 0, 8)
	for rows.Next() {
		var item models.AnimeFansubRelation
		var group models.FansubGroupSummary
		var storyBodyText *string
		if err := rows.Scan(
			&item.AnimeID,
			&item.FansubGroupID,
			&item.IsPrimary,
			&item.Notes,
			&item.CreatedAt,
			&group.ID,
			&group.Slug,
			&group.Name,
			&group.LogoURL,
			&group.FoundedYear,
			&group.DissolvedYear,
			&group.Country,
			&group.Status,
			&storyBodyText,
		); err != nil {
			return nil, fmt.Errorf("scan anime fansub row: %w", err)
		}
		group.StoryPreview = truncateStoryPreviewRunes(storyBodyText, fansubStoryPreviewRuneLimit)
		item.FansubGroup = &group
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate anime fansub rows: %w", err)
	}

	return items, nil
}

func (r *FansubRepository) AttachAnimeFansub(
	ctx context.Context,
	animeID int64,
	fansubID int64,
	input models.AnimeFansubAttachInput,
) (*models.AnimeFansubRelation, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("begin attach anime fansub tx: %w", err)
	}
	defer tx.Rollback(ctx)

	if input.IsPrimary {
		if _, err := tx.Exec(ctx, `
			UPDATE anime_fansub_groups
			SET is_primary = false
			WHERE anime_id = $1
		`, animeID); err != nil {
			return nil, fmt.Errorf("reset anime primary fansub %d: %w", animeID, err)
		}
	}

	if _, err := tx.Exec(
		ctx,
		`INSERT INTO anime_fansub_groups (anime_id, fansub_group_id, is_primary, notes) VALUES ($1, $2, $3, $4)`,
		animeID,
		fansubID,
		input.IsPrimary,
		input.Notes,
	); err != nil {
		if isUniqueViolation(err) {
			return nil, ErrConflict
		}
		if isForeignKeyViolation(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("insert anime fansub relation (%d,%d): %w", animeID, fansubID, err)
	}

	var item models.AnimeFansubRelation
	var group models.FansubGroupSummary
	if err := tx.QueryRow(ctx, `
		SELECT
			afg.anime_id, afg.fansub_group_id, afg.is_primary, afg.notes, afg.created_at,
			fg.id, fg.slug, fg.name, fg.logo_url
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		WHERE afg.anime_id = $1 AND afg.fansub_group_id = $2
	`, animeID, fansubID).Scan(
		&item.AnimeID,
		&item.FansubGroupID,
		&item.IsPrimary,
		&item.Notes,
		&item.CreatedAt,
		&group.ID,
		&group.Slug,
		&group.Name,
		&group.LogoURL,
	); err != nil {
		return nil, fmt.Errorf("load anime fansub relation (%d,%d): %w", animeID, fansubID, err)
	}
	item.FansubGroup = &group

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit attach anime fansub tx: %w", err)
	}

	return &item, nil
}

func (r *FansubRepository) DetachAnimeFansub(ctx context.Context, animeID, fansubID int64) error {
	commandTag, err := r.db.Exec(
		ctx,
		`DELETE FROM anime_fansub_groups WHERE anime_id = $1 AND fansub_group_id = $2`,
		animeID,
		fansubID,
	)
	if err != nil {
		return fmt.Errorf("detach anime fansub relation (%d,%d): %w", animeID, fansubID, err)
	}
	if commandTag.RowsAffected() == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *FansubRepository) fansubGroupExists(ctx context.Context, fansubID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM fansub_groups WHERE id = $1)`,
		fansubID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check fansub group existence %d: %w", fansubID, err)
	}

	return exists, nil
}

func (r *FansubRepository) animeExists(ctx context.Context, animeID int64) (bool, error) {
	var exists bool
	if err := r.db.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM anime WHERE id = $1)`,
		animeID,
	).Scan(&exists); err != nil {
		return false, fmt.Errorf("check anime existence %d: %w", animeID, err)
	}

	return exists, nil
}

// ResolveFansubGroupIDForAnime resolves a fansub group slug to its group id,
// scoped to the groups actually linked to this specific anime via
// anime_fansub_groups. This anime-scoped lookup (never a bare global
// fansub_groups slug lookup) is the IDOR mitigation for the public episodes
// group filter (D-05/T-163-03): a slug belonging to a different anime's group
// never resolves here. Returns ErrNotFound when the slug is unknown or
// foreign to this anime; callers must fail closed (400), never fall back to
// unfiltered data.
func (r *FansubRepository) ResolveFansubGroupIDForAnime(ctx context.Context, animeID int64, slug string) (int64, error) {
	var groupID int64
	err := r.db.QueryRow(ctx, `
		SELECT fg.id
		FROM anime_fansub_groups afg
		JOIN fansub_groups fg ON fg.id = afg.fansub_group_id
		WHERE afg.anime_id = $1 AND fg.slug = $2
	`, animeID, slug).Scan(&groupID)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrNotFound
	}
	if err != nil {
		return 0, fmt.Errorf("resolve fansub group slug %q for anime %d: %w", slug, animeID, err)
	}
	return groupID, nil
}
